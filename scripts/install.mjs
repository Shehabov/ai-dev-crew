#!/usr/bin/env node
/**
 * Copies the team into an existing project. It never overwrites a file without --force,
 * and some files it never overwrites at all.
 *
 * How each kind of file is treated:
 *   - Team files (the agents, the team-* and stack-* skills, the .devteam machinery and
 *     templates, the brand spec template, and docs/SKILLS.md, which the agents cite): copied
 *     when absent, left alone when identical, replaced only with --force.
 *   - Project files (PROJECT.md, BUGS.md): copied when absent and never replaced, even with
 *     --force, because once kickoff has run they hold the project's own answers and its
 *     defect history.
 *   - CLAUDE.md: when the target already has its own, the operating manual is written as
 *     CLAUDE.devteam.md instead, and the one import line to add is printed. A CLAUDE.md that
 *     is an earlier copy of this manual is treated as a team file.
 *   - .claude/settings.json: when the target already has its own, the team's settings are
 *     written as .claude/settings.devteam.json, and what to merge is printed. The target's
 *     own settings file is never modified, because it holds its permission rules.
 *   - LICENSE: copied as LICENSE-devteam when absent and never replaced, even with --force.
 *     The MIT licence asks that its notice travel with the files it covers. The project's
 *     own LICENSE is never read or touched.
 *   - .gitignore: `.devteam/runs/` is appended when no line already covers it.
 *
 * A source file or folder missing from this checkout is reported and skipped, so a partial
 * checkout still installs what it has.
 *
 * Usage:  node scripts/install.mjs <target-dir> [--dry-run] [--force]
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, lstatSync, statSync } from 'node:fs'
import { dirname, join, resolve, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const SOURCE = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const USAGE = `Usage: node scripts/install.mjs <target-dir> [--dry-run] [--force]

  <target-dir>  an existing project folder to install the team into
  --dry-run     report what would happen and write nothing
  --force       replace team files that differ from this checkout's copy
                (never PROJECT.md, BUGS.md, LICENSE-devteam or the target's own
                settings.json)`

/** Team files: copied when absent, replaced only with --force. */
const TEAM_ITEMS = [
  { label: 'agents', path: '.claude/agents' },
  { label: 'house skills', path: '.claude/skills', prefix: 'team-' },
  { label: 'stack packs', path: '.claude/skills', prefix: 'stack-' },
  { label: 'run machinery', path: '.devteam/bin' },
  { label: 'run templates', path: '.devteam/TEMPLATE' },
  { label: 'run guide', path: '.devteam/README.md' },
  { label: 'brand spec template', path: 'templates/BRAND.md' },
  // Agents cite it for the companion skills they may load, so it travels with them.
  { label: 'skills guide', path: 'docs/SKILLS.md' },
]

/** Files copied when absent and never replaced. */
const PROJECT_ITEMS = [
  { label: 'project profile', path: 'PROJECT.md' },
  { label: 'defect register', path: 'BUGS.md' },
  // The licence notice travels with the files it covers, under a name that cannot collide
  // with the project's own LICENSE.
  { label: 'licence notice', path: 'LICENSE', dest: 'LICENSE-devteam' },
]

const RUNS_LINE = '.devteam/runs/'
const RUNS_COVERED = new Set(['.devteam/runs/', '.devteam/runs', '/.devteam/runs/', '/.devteam/runs', '.devteam/', '.devteam', '/.devteam/', '/.devteam'])

// ---------------------------------------------------------------------------------------
// Arguments

const args = process.argv.slice(2)
if (args.includes('--help') || args.includes('-h')) {
  console.log(USAGE)
  process.exit(0)
}
const flags = args.filter((a) => a.startsWith('--'))
const positional = args.filter((a) => !a.startsWith('--'))
const unknown = flags.filter((f) => f !== '--dry-run' && f !== '--force')
if (unknown.length || positional.length !== 1) {
  if (unknown.length) console.error(`Unknown option: ${unknown.join(', ')}`)
  console.error(USAGE)
  process.exit(1)
}
const DRY = flags.includes('--dry-run')
const FORCE = flags.includes('--force')
const TARGET = resolve(positional[0])

if (!existsSync(TARGET) || !statSync(TARGET).isDirectory()) {
  console.error(`The target ${TARGET} does not exist or is not a folder. Create the project first, or pass the path of an existing one.`)
  process.exit(1)
}
// Windows paths compare without regard to case.
const samePath = (a, b) => (process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b)
if (samePath(TARGET, SOURCE)) {
  console.error('The target is this repository. Pass the path of the project to install the team into.')
  process.exit(1)
}

// ---------------------------------------------------------------------------------------
// Helpers

const show = (p) => p.split(sep).join('/')
const rel = (base, p) => show(relative(base, p))

/** Every regular file under a folder, in a stable order. Links and node_modules are skipped. */
function walk(dir) {
  const out = []
  for (const name of readdirSync(dir).sort()) {
    if (name === 'node_modules' || name === '.DS_Store' || name === 'Thumbs.db') continue
    const abs = join(dir, name)
    const st = lstatSync(abs)
    if (st.isSymbolicLink()) continue
    if (st.isDirectory()) out.push(...walk(abs))
    else if (st.isFile()) out.push(abs)
  }
  return out
}

/** The source files one item covers, or null when the item is not in this checkout. */
function sourceFiles(item) {
  const abs = join(SOURCE, item.path)
  if (!existsSync(abs)) return null
  if (item.prefix) {
    const dirs = readdirSync(abs).filter((n) => n.startsWith(item.prefix) && statSync(join(abs, n)).isDirectory()).sort()
    if (!dirs.length) return null
    return dirs.flatMap((d) => walk(join(abs, d)))
  }
  return statSync(abs).isDirectory() ? walk(abs) : [abs]
}

const sameBytes = (a, b) => existsSync(a) && existsSync(b) && readFileSync(a).equals(readFileSync(b))

/** An earlier copy of this operating manual, told apart from a project's own CLAUDE.md. */
function isTeamManual(text) {
  return /^@PROJECT\.md\s*$/m.test(text) && /^## The five-step loop\s*$/m.test(text)
}

const writes = []
function write(dest, content) {
  writes.push(dest)
  if (DRY) return
  mkdirSync(dirname(dest), { recursive: true })
  writeFileSync(dest, content)
}

/**
 * Decides and performs one copy. Returns one of:
 * new, replaced, unchanged, differs (kept, --force replaces it), kept (never replaced).
 */
function place(src, dest, { project = false } = {}) {
  if (!existsSync(dest)) {
    write(dest, readFileSync(src))
    return 'new'
  }
  if (sameBytes(src, dest)) return 'unchanged'
  if (project) return 'kept'
  if (FORCE) {
    write(dest, readFileSync(src))
    return 'replaced'
  }
  return 'differs'
}

// ---------------------------------------------------------------------------------------
// Install

const rows = []
const differing = []
const missing = []
const tally = { new: 0, replaced: 0, unchanged: 0, differs: 0, kept: 0 }
const notes = []

function record(label, results, detail = '') {
  const counts = {}
  for (const r of results) {
    counts[r] = (counts[r] || 0) + 1
    tally[r] += 1
  }
  rows.push({ label, counts, total: results.length, detail })
}

for (const item of TEAM_ITEMS) {
  const files = sourceFiles(item)
  if (!files) {
    missing.push(item.prefix ? `${item.path}/${item.prefix}*` : item.path)
    rows.push({ label: item.label, missing: true })
    continue
  }
  const results = files.map((src) => {
    const dest = join(TARGET, relative(SOURCE, src))
    const r = place(src, dest)
    if (r === 'differs') differing.push(rel(TARGET, dest))
    return r
  })
  record(item.label, results)
}

for (const item of PROJECT_ITEMS) {
  const src = join(SOURCE, item.path)
  if (!existsSync(src)) {
    missing.push(item.path)
    rows.push({ label: item.label, missing: true })
    continue
  }
  const dest = item.dest || item.path
  const r = place(src, join(TARGET, dest), { project: true })
  record(item.label, [r], dest)
}

// The operating manual.
const manualSrc = join(SOURCE, 'CLAUDE.md')
if (!existsSync(manualSrc)) {
  missing.push('CLAUDE.md')
  rows.push({ label: 'operating manual', missing: true })
} else {
  const own = join(TARGET, 'CLAUDE.md')
  const ownText = existsSync(own) ? readFileSync(own, 'utf8') : null
  if (ownText === null || isTeamManual(ownText)) {
    const r = place(manualSrc, own)
    if (r === 'differs') differing.push('CLAUDE.md')
    record('operating manual', [r], 'CLAUDE.md')
  } else {
    const alt = join(TARGET, 'CLAUDE.devteam.md')
    const r = place(manualSrc, alt)
    if (r === 'differs') differing.push('CLAUDE.devteam.md')
    record('operating manual', [r], 'CLAUDE.devteam.md, beside the project\'s own CLAUDE.md')
    if (!/^@CLAUDE\.devteam\.md\s*$/m.test(ownText)) {
      notes.push([
        'The project already has a CLAUDE.md, so the team\'s manual went to CLAUDE.devteam.md.',
        'Add this line on its own near the top of CLAUDE.md, so every session loads it:',
        '',
        '    @CLAUDE.devteam.md',
      ])
    }
  }
}

// The settings.
const settingsSrc = join(SOURCE, '.claude', 'settings.json')
let agentMerged = true
if (!existsSync(settingsSrc)) {
  missing.push('.claude/settings.json')
  rows.push({ label: 'settings', missing: true })
} else {
  const own = join(TARGET, '.claude', 'settings.json')
  if (!existsSync(own) || sameBytes(settingsSrc, own)) {
    record('settings', [place(settingsSrc, own)], '.claude/settings.json')
  } else {
    const alt = join(TARGET, '.claude', 'settings.devteam.json')
    const r = place(settingsSrc, alt)
    if (r === 'differs') differing.push('.claude/settings.devteam.json')
    record('settings', [r], '.claude/settings.devteam.json, beside the project\'s own settings.json')
    const advice = mergeAdvice(settingsSrc, own)
    agentMerged = advice.agentMerged
    if (advice.lines.length) {
      notes.push([
        'The project already has .claude/settings.json, which is left as it is. The team\'s',
        'settings are in .claude/settings.devteam.json. To merge them into settings.json:',
        '',
        ...advice.lines.map((l) => `  - ${l}`),
      ])
    }
  }
}

/** What the team's settings add to a project's own settings file. */
function mergeAdvice(oursPath, theirsPath) {
  const ours = JSON.parse(readFileSync(oursPath, 'utf8'))
  let theirs
  try {
    theirs = JSON.parse(readFileSync(theirsPath, 'utf8'))
  } catch {
    return { agentMerged: false, lines: ['.claude/settings.json is not valid JSON, so compare the two files by hand.'] }
  }
  const lines = []
  const agentMerged = theirs.agent === ours.agent
  if (!agentMerged) {
    const now = theirs.agent ? ` (it is "${theirs.agent}" now)` : ''
    lines.push(`set "agent": "${ours.agent}"${now}, so the orchestrator is the main thread`)
  }
  for (const [key, value] of Object.entries(ours.env || {})) {
    if ((theirs.env || {})[key] !== value) lines.push(`add "${key}": "${value}" under "env"`)
  }
  const theirsPerm = theirs.permissions || {}
  for (const kind of ['allow', 'ask', 'deny']) {
    const have = new Set(theirsPerm[kind] || [])
    const add = ((ours.permissions || {})[kind] || []).filter((rule) => !have.has(rule))
    if (!add.length) continue
    if (kind === 'allow') {
      lines.push(`add ${add.length} rule${add.length === 1 ? '' : 's'} under "permissions.allow" (the list is in settings.devteam.json)`)
    } else {
      lines.push(`add under "permissions.${kind}": ${add.join(', ')}`)
    }
  }
  const risky = new Set([...((ours.permissions || {}).ask || []), ...((ours.permissions || {}).deny || [])])
  const loosened = (theirsPerm.allow || []).filter((rule) => risky.has(rule))
  if (loosened.length) {
    lines.push(`review "permissions.allow": it allows ${loosened.join(', ')}, which the team asks about or denies`)
  }
  return { agentMerged, lines }
}

// The .gitignore line.
const gitignore = join(TARGET, '.gitignore')
if (existsSync(gitignore)) {
  const text = readFileSync(gitignore, 'utf8')
  const covered = text.split(/\r?\n/).some((l) => RUNS_COVERED.has(l.trim()))
  if (covered) {
    rows.push({ label: '.gitignore', detail: `${RUNS_LINE} already ignored`, plain: true })
  } else {
    const eol = text.includes('\r\n') ? '\r\n' : '\n'
    const lead = text.length && !text.endsWith('\n') ? eol : ''
    write(gitignore, `${text}${lead}${eol}# Run records from the dev team${eol}${RUNS_LINE}${eol}`)
    rows.push({ label: '.gitignore', detail: `${RUNS_LINE} ${DRY ? 'would be appended' : 'appended'}`, plain: true })
  }
} else {
  write(gitignore, `# Run records from the dev team\n${RUNS_LINE}\n`)
  rows.push({ label: '.gitignore', detail: `${DRY ? 'would be created' : 'created'} with ${RUNS_LINE}`, plain: true })
}

// ---------------------------------------------------------------------------------------
// Report

const verb = DRY
  ? { new: 'would copy', replaced: 'would replace', unchanged: 'unchanged', differs: 'differs, kept', kept: 'kept, never replaced' }
  : { new: 'copied', replaced: 'replaced', unchanged: 'unchanged', differs: 'differs, kept', kept: 'kept, never replaced' }

console.log(`Installing the team into ${TARGET}`)
if (DRY) console.log('Dry run: nothing is written.')
if (FORCE) console.log('--force: team files that differ are replaced. PROJECT.md, BUGS.md, LICENSE-devteam and settings.json are not.')
console.log('')

const width = Math.max(...rows.map((r) => r.label.length)) + 2
for (const r of rows) {
  const label = r.label.padEnd(width)
  if (r.missing) {
    console.log(`  ${label}not in this checkout, skipped`)
  } else if (r.plain) {
    console.log(`  ${label}${r.detail}`)
  } else {
    const parts = Object.entries(r.counts).map(([k, n]) => (r.total === 1 ? verb[k] : `${n} ${verb[k]}`))
    const size = r.total === 1 ? '' : `${r.total} files: `
    const detail = r.detail ? `  (${r.detail})` : ''
    console.log(`  ${label}${size}${parts.join(', ')}${detail}`)
  }
}

console.log('')
const summary = [
  `${tally.new} ${verb.new}`,
  tally.replaced ? `${tally.replaced} ${verb.replaced}` : null,
  `${tally.unchanged} unchanged`,
  tally.differs ? `${tally.differs} differ and were kept` : null,
  tally.kept ? `${tally.kept} kept and never replaced` : null,
].filter(Boolean)
console.log(`Files: ${summary.join(', ')}.`)

if (differing.length) {
  console.log('')
  console.log('These differ from this checkout\'s copy and were left as they are. Run again with --force to replace them:')
  for (const d of differing) console.log(`  ${d}`)
}

if (missing.length) {
  console.log('')
  console.log(`Not in this checkout, so not installed: ${missing.join(', ')}`)
}

for (const block of notes) {
  console.log('')
  for (const line of block) console.log(line)
}

// The next step. Kickoff runs while PROJECT.md in the target still has a to-do marker.
const profile = join(TARGET, 'PROJECT.md')
const profileText = existsSync(profile)
  ? readFileSync(profile, 'utf8')
  : existsSync(join(SOURCE, 'PROJECT.md')) ? readFileSync(join(SOURCE, 'PROJECT.md'), 'utf8') : ''
const needsKickoff = profileText.includes('TODO:')

console.log('')
console.log('Next:')
const start = agentMerged ? 'claude' : 'claude --agent orchestrator'
console.log(`  Open Claude Code in the project: cd "${TARGET}" and run ${start}`)
if (!agentMerged) console.log('  (use --agent orchestrator until "agent" is merged into .claude/settings.json)')
if (needsKickoff) {
  console.log('  The orchestrator runs kickoff first: PROJECT.md still has unanswered sections, and it')
  console.log('  asks the Product Lead about one section at a time before it opens a run.')
} else {
  console.log('  PROJECT.md is filled in, so the orchestrator can open a run from your first brief.')
}
if (DRY) {
  console.log('')
  const withIgnore = writes.includes(gitignore) ? ', counting .gitignore' : ''
  console.log(`Dry run complete: ${writes.length} file${writes.length === 1 ? '' : 's'} would be written${withIgnore}. Run without --dry-run to install.`)
}
