#!/usr/bin/env node
/**
 * Structural and house-style checks for this repository. CI runs it on every push and pull
 * request, and it runs anywhere node does, with nothing to install:
 *
 *   node scripts/check.mjs
 *
 * Nine groups. Each runs on its own, so one broken file never hides the findings in the rest.
 *
 *   1. Agents        frontmatter, preloaded skills and the tools policy
 *   2. Skills        name, description and the description's length limit
 *   3. Run plan      the template in the orchestrator and in team-orchestration
 *   4. Links         every relative link and image in every Markdown file
 *   5. House style   em and en dashes, emoji, hype words and stock phrases
 *   6. Residue       nothing carried over from the private source this team came from
 *   7. Art           every SVG under assets/ is safe to render through <img>
 *   8. Syntax        node --check on every script
 *   9. Inventory     every file the repository layout promises, and the shipped Playwright
 *                    MCP server's pin, launch arguments, permission rules and ignore line
 *
 * It reads and never writes: a checker that repairs what it checks always reports clean, so
 * its report proves nothing. Exit code 0 when every group is clean, 1 on any failure.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname, resolve, relative, sep, basename } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// ---------------------------------------------------------------------------------------
// What the repository promises. The roster and the gates come from scripts/assets/team.mjs,
// their single source; the lists below are the parts of the layout that file does not hold.

const EXPECTED_AGENTS = 16

const HOUSE_SKILLS = [
  'team-protocol',
  'team-orchestration',
  'team-brand-guard',
  'team-bug-register',
  'team-clean-code',
  'team-design-system',
  'team-ux-audit',
  'team-copy',
  'team-architecture',
  'team-code-review',
  'team-code-analysis',
  'team-test-protocol',
  'team-security',
  'team-release',
]

const STACK_PACKS = ['stack-nextjs-supabase']

/** Each diagram ships as a light and a dark variant. */
const DIAGRAMS = ['flow', 'loop', 'gates', 'roster', 'security']

/** The four reviewers write findings under the run folder and never edit the code they read. */
const REVIEWERS = new Set(['peer-reviewer', 'code-analyst', 'code-steward', 'security-analyst'])

/** The only dispatched roles that hold the shipped Playwright MCP server. Every other one disallows it. */
const BROWSER_TESTERS = new Set(['qc-engineer', 'qc-lead'])

/** The permission rules the shipped Playwright MCP server depends on, each with its reason. */
const PLAYWRIGHT_RULES = [
  ['deny', 'mcp__playwright__browser_run_code_unsafe', 'it runs arbitrary code in the server\'s own process'],
  ['deny', 'Read(~/.claude/.credentials.json)', 'it holds the Claude Code sign-in and MCP OAuth tokens, and a page the browser reads can ask for them'],
  ['ask', 'mcp__playwright__browser_file_upload', 'it can hand any file in the project to a page'],
  ['ask', 'mcp__playwright__browser_drop', 'it can hand any file in the project to a page'],
  ['ask', 'Edit(.devteam/bin/**)', 'the scripts there run without a prompt'],
]

/** The two files that carry the run plan template, which must stay byte-identical. */
const RUN_PLAN_FILES = ['.claude/agents/orchestrator.md', '.claude/skills/team-orchestration/SKILL.md']

/** Every other file the layout names. */
const LAYOUT = [
  '.claude/settings.json',
  '.claude/skills/stack-nextjs-supabase/scripts/db-test.mjs',
  '.claude/skills/stack-nextjs-supabase/scripts/db-test-shim.sql',
  '.claude/skills/stack-nextjs-supabase/templates/mcp.json',
  '.devteam/README.md',
  '.devteam/bin/sync-gates.mjs',
  '.devteam/bin/utilisation-check.mjs',
  '.devteam/TEMPLATE/handoff.json',
  '.devteam/TEMPLATE/plan.md',
  '.devteam/TEMPLATE/review.md',
  '.github/workflows/check.yml',
  'docs/WORKFLOW.md',
  'docs/SKILLS.md',
  'docs/SECURITY-CHECKLIST.md',
  'docs/GETTING-STARTED.md',
  'docs/CUSTOMISING.md',
  'templates/BRAND.md',
  'scripts/install.mjs',
  'scripts/check.mjs',
  'scripts/assets/tokens.mjs',
  'scripts/assets/team.mjs',
  'scripts/assets/covers.mjs',
  'scripts/assets/diagrams.mjs',
  'scripts/assets/build.mjs',
  'CLAUDE.md',
  'PROJECT.md',
  'BUGS.md',
  'README.md',
  'SECURITY.md',
  'LICENSE',
  '.gitignore',
  '.mcp.json',
]

/** Hype and filler, banned as whole words in any case. */
const BANNED_WORDS = [
  'seamless', 'seamlessly', 'supercharge', 'supercharged', 'unleash', 'empower', 'empowers',
  'elevate', 'robust', 'robustness', 'cutting-edge', 'game-changer', 'revolutionise',
  'revolutionize', 'next-level', 'effortless', 'effortlessly', 'delve', 'tapestry', 'synergy',
  'world-class', 'blazing', 'magical', 'turbocharge',
]

/** Stock phrases, banned in any case. Words may be split across a line break. */
const BANNED_PHRASES = [
  String.raw`dive\s+into`,
  String.raw`let['\u2019]s\s+dive`,
  String.raw`in\s+today['\u2019]s`,
  String.raw`not\s+just`,
  String.raw`happy\s+building`,
]

/**
 * Words from the private source this team was generalised from. They are held as SHA-256
 * digests of the lower-case word, so this file does not carry what it looks for. Each word
 * in a file is hashed and compared; a match is reported with the text found.
 */
const RESIDUE = new Map([
  ['2ab819d8b9a45ec5e5e5e64cc11548d1c13c47b52fcb52dee13aedef74e2fc2e', 'a product name from the private source'],
  ['d7efeed36118847c1113c0ae1eef56a88f1af6830851e47a0375d7103a392df0', 'a company name from the private source'],
  ['313ce7d71787960e3bb5f8258c173ae466b4e08e1e7d24b9c7a5ba81c9a02d96', 'a brand colour name from the private source'],
  ['f73ded5caf35e78c81c499d3a59d0225b88f2116c4ab983da81943e6d560bd34', 'a brand colour value from the private source'],
])
const RESIDUE_LENGTHS = new Set([4, 5, 6])

/** Content GitHub will not render through <img>, or that the art direction bans. */
const SVG_BANNED = [
  ['a <script> element', /<script\b/i],
  ['a foreignObject', /foreignObject/i],
  ['a linearGradient', /linearGradient/i],
  ['a radialGradient', /radialGradient/i],
  ['a <filter> element', /<filter\b/i],
  ['an feGaussianBlur', /feGaussianBlur/i],
]

// ---------------------------------------------------------------------------------------
// Files

const toPosix = (p) => p.split(sep).join('/')
const rel = (absPath) => toPosix(relative(ROOT, absPath))
const abs = (p) => join(ROOT, ...p.split('/'))
const exists = (p) => existsSync(abs(p))
const read = (p) => readFileSync(abs(p), 'utf8').replace(/^\uFEFF/, '')

const SELF = rel(fileURLToPath(import.meta.url))
const SKIP_DIRS = new Set(['.git', 'node_modules'])

/** Every regular file in the repository, outside .git and node_modules, in a stable order. */
function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(full, out)
    } else if (entry.isFile()) {
      out.push(rel(full))
    }
  }
  return out
}

/**
 * A skill folder that is neither team-* nor stack-* is a companion: a third-party skill a
 * project installs beside the team's own. It is allowed, and it is not this repository's
 * work, so no group checks its files.
 */
const isTeamSkill = (folder) => folder.startsWith('team-') || folder.startsWith('stack-')
const inCompanion = (p) => {
  const m = p.match(/^\.claude\/skills\/([^/]+)\//)
  return Boolean(m) && !isTeamSkill(m[1])
}

const FILES = walk(ROOT).sort().filter((p) => !inCompanion(p))

/** Run records are gitignored working files, not part of the repository. */
const inRuns = (p) => p.startsWith('.devteam/runs/')

/** The names directly inside a folder, filtered by kind. */
function entries(dir, kind) {
  if (!exists(dir)) return []
  return readdirSync(abs(dir), { withFileTypes: true })
    .filter((e) => (kind === 'dir' ? e.isDirectory() : e.isFile()))
    .map((e) => e.name)
    .sort()
}

// ---------------------------------------------------------------------------------------
// Text

/** The 1-based line of a character offset. */
function lineOf(text, index) {
  let line = 1
  for (let i = text.indexOf('\n'); i !== -1 && i < index; i = text.indexOf('\n', i + 1)) line += 1
  return line
}

/** Replaces everything but newlines, so offsets after the blanked text keep their line. */
const keepNewlines = (s) => s.replace(/[^\n]/g, '')

/**
 * Blanks fenced code blocks and inline code in Markdown. A fence opens with three or more
 * backticks or tildes, at any indent so fences inside list items count, and closes with a
 * line of the same character at least as long. An inline span closes at the next run of
 * exactly as many backticks, within the same paragraph.
 */
function maskCode(text) {
  const lines = text.split('\n')
  let fence = null
  for (let i = 0; i < lines.length; i += 1) {
    const open = lines[i].match(/^\s*(`{3,}|~{3,})/)
    if (fence) {
      const closes = open && open[1][0] === fence[0] && open[1].length >= fence.length && /^\s*[`~]+\s*$/.test(lines[i])
      lines[i] = ''
      if (closes) fence = null
    } else if (open) {
      fence = open[1]
      lines[i] = ''
    }
  }
  return lines.join('\n').replace(/(?<!`)(`+)(?!`)((?:(?!\n[ \t\r]*\n)[\s\S])*?)(?<!`)\1(?!`)/g, keepNewlines)
}

/** Blanks HTML comments, which GitHub does not render. */
const maskComments = (text) => text.replace(/<!--[\s\S]*?-->/g, keepNewlines)

/**
 * The fenced code blocks of a Markdown file, with their info string, their body (line
 * endings normalised) and the line of the opening fence.
 */
function fencedBlocks(text) {
  const lines = text.split(/\r?\n/)
  const blocks = []
  let open = null
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(/^\s*(`{3,}|~{3,})\s*([^`\s]*)/)
    if (open) {
      if (m && m[1][0] === open.fence[0] && m[1].length >= open.fence.length && /^\s*[`~]+\s*$/.test(lines[i])) {
        blocks.push({ lang: open.lang, body: open.body.join('\n'), line: open.line })
        open = null
      } else {
        open.body.push(lines[i])
      }
    } else if (m) {
      open = { fence: m[1], lang: m[2].toLowerCase(), body: [], line: i + 1 }
    }
  }
  return blocks
}

// ---------------------------------------------------------------------------------------
// Frontmatter

const unquote = (s) => {
  const t = s.trim()
  if (t.length >= 2 && t[0] === '"' && t.endsWith('"')) return t.slice(1, -1).replace(/\\(["\\])/g, '$1')
  if (t.length >= 2 && t[0] === "'" && t.endsWith("'")) return t.slice(1, -1).replace(/''/g, "'")
  return t
}

/**
 * The YAML frontmatter the agents and skills use: plain and quoted scalars, plain scalars
 * continued on indented lines, block lists, inline lists, and folded or literal block
 * scalars. Returns null when the file has no frontmatter.
 */
function frontmatter(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/)
  if (lines[0].trim() !== '---') return null
  let end = -1
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === '---') {
      end = i
      break
    }
  }
  if (end === -1) return null

  const fm = {}
  let key = null
  let block = null
  const closeBlock = () => {
    if (!block) return
    fm[key] = block.style === '|' ? block.lines.join('\n').trim() : block.lines.join(' ').replace(/\s+/g, ' ').trim()
    block = null
  }

  for (const line of lines.slice(1, end)) {
    if (block) {
      if (line.trim() === '' || /^\s/.test(line)) {
        block.lines.push(line.trim())
        continue
      }
      closeBlock()
    }
    if (line.trim() === '' || /^\s*#/.test(line)) continue

    const item = line.match(/^\s*-\s+(.*)$/)
    if (item && key && (fm[key] === '' || Array.isArray(fm[key]))) {
      if (!Array.isArray(fm[key])) fm[key] = []
      fm[key].push(unquote(item[1]))
      continue
    }

    const pair = line.match(/^([A-Za-z][\w-]*):(?:\s+(.*?))?\s*$/)
    if (pair) {
      key = pair[1]
      const value = pair[2] ?? ''
      if (/^[>|][+-]?$/.test(value)) {
        block = { style: value[0], lines: [] }
      } else if (value.startsWith('[') && value.endsWith(']')) {
        fm[key] = value.slice(1, -1).split(',').map(unquote).filter(Boolean)
      } else {
        fm[key] = unquote(value)
      }
      continue
    }

    if (key && /^\s/.test(line) && typeof fm[key] === 'string' && fm[key] !== '') {
      fm[key] = `${fm[key]} ${line.trim()}`
    }
  }
  closeBlock()
  return fm
}

/** A frontmatter field read as a list: a YAML list, or a comma-separated string. */
const toList = (v) => (Array.isArray(v) ? v : typeof v === 'string' && v.trim() ? v.split(',').map((s) => s.trim()).filter(Boolean) : [])
const str = (v) => (typeof v === 'string' ? v.trim() : '')

// ---------------------------------------------------------------------------------------
// The roster, from its single source

let TEAM = null
let GATES = null
let teamError = null
try {
  const mod = await import(pathToFileURL(abs('scripts/assets/team.mjs')).href)
  if (!Array.isArray(mod.TEAM) || !Array.isArray(mod.GATES)) throw new Error('it does not export TEAM and GATES as arrays')
  TEAM = mod.TEAM
  GATES = mod.GATES
} catch (err) {
  teamError = err.message.split('\n')[0]
}
const AGENT_NAMES = TEAM ? TEAM.map((t) => t.name) : null

// ---------------------------------------------------------------------------------------
// Groups

const GROUPS = []

/** Runs one group. A group that throws is reported as a failure, and the others still run. */
function group(title, run) {
  const failures = []
  const fail = (where, message) => failures.push(where ? `${where}: ${message}` : message)
  try {
    run(fail)
  } catch (err) {
    fail('', `the check stopped before it finished: ${err.message}`)
  }
  GROUPS.push({ title, failures })
}

// 1. Agents ------------------------------------------------------------------------------

group('Agents', (fail) => {
  const dir = '.claude/agents'
  const files = entries(dir, 'file').filter((n) => n.endsWith('.md'))
  if (!files.length) fail(dir, 'no agent files')

  for (const name of files) {
    const file = `${dir}/${name}`
    const stem = basename(name, '.md')
    const fm = frontmatter(read(file))
    if (!fm) {
      fail(file, 'no frontmatter between --- lines at the top of the file')
      continue
    }

    if (fm.name !== stem) fail(file, `name is "${fm.name ?? ''}", and it must equal the file name "${stem}"`)
    if (!str(fm.description)) fail(file, 'description is missing')
    if (!str(fm.model)) fail(file, 'model is missing')

    if (fm.skills === undefined || fm.skills === '') {
      fail(file, 'skills is missing')
    } else if (!Array.isArray(fm.skills)) {
      fail(file, 'skills must be a YAML list, one skill per line')
    } else {
      if (!fm.skills.includes('team-protocol')) fail(file, 'skills does not include team-protocol, which every agent loads')
      for (const skill of fm.skills) {
        if (skill.startsWith('stack-')) {
          fail(file, `skills lists the stack pack ${skill}. A stack pack is read by path at step 1, never preloaded.`)
          continue
        }
        const path = `.claude/skills/${skill}/SKILL.md`
        if (!exists(path)) {
          fail(file, `skill ${skill} does not resolve: there is no ${path}`)
          continue
        }
        const sfm = frontmatter(read(path))
        if (!sfm || sfm.name !== skill) fail(file, `skill ${skill} resolves to ${path}, whose name is "${sfm?.name ?? ''}"`)
      }
    }

    const disallowed = toList(fm.disallowedTools)
    if (stem === 'orchestrator') {
      if ('tools' in fm) fail(file, 'the orchestrator must have no tools field, so it inherits the Agent tool and every MCP server')
      if (disallowed.includes('Agent')) fail(file, 'the orchestrator must not disallow Agent, because it is the only dispatcher')
    } else {
      if ('tools' in fm) fail(file, 'has a tools field. Only disallowedTools is used, so the project\'s MCP servers reach this role.')
      if (!disallowed.includes('Agent')) fail(file, 'disallowedTools must include Agent, because only the orchestrator dispatches')
      if (REVIEWERS.has(stem)) {
        for (const tool of ['Edit', 'NotebookEdit']) {
          if (!disallowed.includes(tool)) fail(file, `disallowedTools must include ${tool}, because a reviewer never edits the code it reviews`)
        }
      }
      if (BROWSER_TESTERS.has(stem)) {
        if (disallowed.includes('mcp__playwright')) fail(file, 'disallowedTools must not include mcp__playwright, because this role tests in a browser through the Playwright MCP server')
      } else if (!disallowed.includes('mcp__playwright')) {
        fail(file, 'disallowedTools must include mcp__playwright, because qc-engineer and qc-lead are the only dispatched roles that hold the Playwright MCP server')
      }
    }
  }
})

// 2. Skills ------------------------------------------------------------------------------

group('Skills', (fail) => {
  const dir = '.claude/skills'
  const folders = entries(dir, 'dir').filter(isTeamSkill)
  if (!folders.length) fail(dir, 'no skill folders')

  for (const folder of folders) {
    const path = `${dir}/${folder}/SKILL.md`
    if (!exists(path)) {
      fail(`${dir}/${folder}`, 'has no SKILL.md')
      continue
    }
    const fm = frontmatter(read(path))
    if (!fm) {
      fail(path, 'no frontmatter between --- lines at the top of the file')
      continue
    }
    if (fm.name !== folder) fail(path, `name is "${fm.name ?? ''}", and it must equal the folder name "${folder}"`)
    const description = str(fm.description)
    const length = [...description].length
    if (!description) fail(path, 'description is missing')
    else if (length >= 1024) fail(path, `description is ${length} characters. It must be under 1024, or the skill will not install.`)
  }
})

// 3. Run plan ----------------------------------------------------------------------------

group('Run plan', (fail) => {
  const found = []
  for (const file of RUN_PLAN_FILES) {
    if (!exists(file)) {
      fail(file, 'does not exist, so the run plan template cannot be compared')
      continue
    }
    const blocks = fencedBlocks(read(file)).filter((b) => b.lang === 'json')
    const errors = []
    let chosen = null
    for (const block of blocks) {
      try {
        const run = JSON.parse(block.body)
        if (run && Array.isArray(run.plan) && Array.isArray(run.gates)) {
          chosen = { file, ...block, run }
          break
        }
      } catch (err) {
        if (/"plan"\s*:/.test(block.body)) errors.push(`the block at line ${block.line} does not parse: ${err.message}`)
      }
    }
    if (chosen) found.push(chosen)
    else if (errors.length) errors.forEach((e) => fail(file, e))
    else fail(file, 'has no ```json block with a plan and a gates list')
  }

  if (found.length === 2 && found[0].body !== found[1].body) {
    const [a, b] = found.map((f) => f.body.split('\n'))
    let i = 0
    while (i < a.length && i < b.length && a[i] === b[i]) i += 1
    fail('', `the run plan differs between ${found[0].file}:${found[0].line + 1 + i} and ${found[1].file}:${found[1].line + 1 + i}. The two blocks must be byte-identical.`)
  }

  const distinct = found.filter((f, i) => found.findIndex((g) => g.body === f.body) === i)
  for (const { file, line, run } of distinct) checkPlan(run, (message) => fail(`${file}:${line}`, message))
})

/** The plan's internal agreements: gates exist, owners and blocked roles are planned. */
function checkPlan(run, fail) {
  const plan = run.plan.filter((e) => e && typeof e === 'object')
  const gates = run.gates.filter((g) => g && typeof g === 'object')
  const gateByName = new Map(gates.map((g) => [g.name, g]))
  // The orchestrator runs every stage and owns run-closure, so it is planned without an entry.
  const planned = new Set(['orchestrator', ...plan.map((e) => e.agent)])
  const list = (v) => (Array.isArray(v) ? v : [])

  for (const e of plan) {
    const who = `stage ${e.stage} ${e.agent}`
    if (AGENT_NAMES && !AGENT_NAMES.includes(e.agent)) fail(`${who}: ${e.agent} is not on the roster in scripts/assets/team.mjs`)
    if (!Array.isArray(e.blocked_by)) {
      fail(`${who}: blocked_by must be a list, empty when nothing blocks it`)
      continue
    }
    for (const name of e.blocked_by) {
      const gate = gateByName.get(name)
      if (!gate) fail(`${who}: blocked_by names ${name}, which is not a gate in the plan`)
      else if (!list(gate.blocks).includes(e.agent)) fail(`${who}: blocked_by names ${name}, but that gate's blocks list does not include ${e.agent}`)
    }
  }

  for (const g of gates) {
    if (!planned.has(g.owner)) fail(`gate ${g.name}: its owner ${g.owner} is not a planned agent`)
    for (const agent of list(g.blocks)) {
      if (!planned.has(agent)) fail(`gate ${g.name}: blocks ${agent}, which is not a planned agent`)
      else if (!plan.some((e) => e.agent === agent && list(e.blocked_by).includes(g.name))) {
        fail(`gate ${g.name}: blocks ${agent}, but no ${agent} entry lists ${g.name} in blocked_by`)
      }
    }
  }

  if (GATES) {
    const want = GATES.map((g) => `${g.name} (${g.owner})`)
    const have = gates.map((g) => `${g.name} (${g.owner})`)
    const i = want.findIndex((w, n) => have[n] !== w)
    if (i !== -1 || have.length !== want.length) {
      const at = i === -1 ? want.length : i
      fail(`gate ${at + 1} is ${have[at] ?? 'missing'}, and GATES in scripts/assets/team.mjs, their single source, has ${want[at] ?? 'nothing there'}`)
    }
  }
}

// 4. Links -------------------------------------------------------------------------------

/** Every link target in masked Markdown, with its offset. */
function linkTargets(md) {
  const found = []
  const patterns = [
    // [text](target "title") and ![alt](target)
    /!?\[(?:[^[\]]|\[[^[\]]*\])*\]\(\s*(<[^<>\n]*>|(?:[^\s()]|\([^\s()]*\))*)(?:\s+(?:"[^"\n]*"|'[^'\n]*'|\([^()\n]*\)))?\s*\)/g,
    // [label]: target
    /^ {0,3}\[[^\]\n]+\]:[ \t]*(<[^<>\n]*>|\S+)/gm,
    // <img src>, <a href>
    /<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/gi,
    /<a\b[^>]*?\bhref\s*=\s*["']([^"']+)["']/gi,
  ]
  for (const re of patterns) {
    for (const m of md.matchAll(re)) found.push({ target: m[1], index: m.index })
  }
  // <source srcset="a.svg, b.svg 2x">
  for (const m of md.matchAll(/<source\b[^>]*?\bsrcset\s*=\s*["']([^"']+)["']/gi)) {
    for (const candidate of m[1].split(',')) found.push({ target: candidate.trim().split(/\s+/)[0], index: m.index })
  }
  return found.sort((a, b) => a.index - b.index)
}

/** The local path a link points at, or null for a link this check does not follow. */
function localPath(target) {
  let t = String(target || '').trim()
  if (t.startsWith('<') && t.endsWith('>')) t = t.slice(1, -1).trim()
  if (!t || t.startsWith('#')) return null
  if (/^(https?:|mailto:)/i.test(t) || /^[a-z][a-z0-9+.-]+:/i.test(t)) return null
  t = t.replace(/[?#].*$/, '')
  if (!t) return null
  try {
    return decodeURI(t)
  } catch {
    return t
  }
}

group('Links', (fail) => {
  for (const file of FILES.filter((f) => f.endsWith('.md') && !inRuns(f))) {
    const md = maskComments(maskCode(read(file)))
    for (const { target, index } of linkTargets(md)) {
      const path = localPath(target)
      if (path === null) continue
      const resolved = path.startsWith('/') ? join(ROOT, path) : join(ROOT, dirname(file), path)
      const where = `${file}:${lineOf(md, index)}`
      if (relative(ROOT, resolved).startsWith('..')) fail(where, `${target} points outside the repository`)
      else if (!existsSync(resolved)) fail(where, `${target} does not resolve`)
    }
  }
})

// 5. House style -------------------------------------------------------------------------

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const HOUSE_STYLE = [
  { re: /\u2014/g, says: () => 'an em dash. Use a comma, colon, full stop or brackets.' },
  { re: /\u2013/g, says: () => 'an en dash. Use a comma, colon, full stop or brackets, and "to" for a range.' },
  { re: /[\p{Extended_Pictographic}\u{FE0F}]/gu, says: (m) => `an emoji (U+${m.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')})` },
  {
    re: new RegExp(`(?<![\\p{L}\\p{N}])(?:${BANNED_WORDS.map(escapeRegExp).join('|')})(?![\\p{L}\\p{N}])`, 'giu'),
    says: (m) => `the banned word "${m.toLowerCase()}"`,
  },
  {
    re: new RegExp(`(?<![\\p{L}\\p{N}])(?:${BANNED_PHRASES.join('|')})(?![\\p{L}\\p{N}])`, 'giu'),
    says: (m) => `the banned phrase "${m.toLowerCase().replace(/\s+/g, ' ')}"`,
  },
]

group('House style', (fail) => {
  const files = FILES.filter((f) => (f.endsWith('.md') || f.endsWith('.svg')) && !inRuns(f) && f !== SELF)
  for (const file of files) {
    const raw = read(file)
    const body = file.endsWith('.md') ? maskCode(raw) : raw
    const hits = HOUSE_STYLE.flatMap(({ re, says }) => [...body.matchAll(re)].map((m) => ({ index: m.index, message: says(m[0]) })))
    for (const { index, message } of hits.sort((a, b) => a.index - b.index)) fail(`${file}:${lineOf(body, index)}`, message)
  }
})

// 6. Residue -----------------------------------------------------------------------------

const digests = new Map()
const digest = (word) => {
  if (!digests.has(word)) digests.set(word, createHash('sha256').update(word).digest('hex'))
  return digests.get(word)
}

/** Each residue word in a string, as [found text, what it is, offset], one per offset. */
function residueIn(s) {
  const hits = new Map()
  for (const m of s.matchAll(/[\p{L}\p{N}]+/gu)) {
    if (!RESIDUE_LENGTHS.has(m[0].length)) continue
    const what = RESIDUE.get(digest(m[0].toLowerCase()))
    if (what) hits.set(m.index, [m[0], what, m.index])
  }
  // A colour value can sit inside a longer word, such as 0x-prefixed or 8-digit colours, so
  // every run of hex digits is also read six digits at a time.
  for (const m of s.matchAll(/[0-9a-f]{6,}/gi)) {
    for (let i = 0; i + 6 <= m[0].length; i += 1) {
      const what = RESIDUE.get(digest(m[0].slice(i, i + 6).toLowerCase()))
      if (what && !hits.has(m.index + i)) hits.set(m.index + i, [m[0].slice(i, i + 6), what, m.index + i])
    }
  }
  return [...hits.values()].sort((a, b) => a[2] - b[2])
}

group('Residue', (fail) => {
  for (const file of FILES.filter((f) => f !== SELF)) {
    for (const [found, what] of residueIn(file)) fail(file, `the file's path carries "${found}", ${what}`)
    const bytes = readFileSync(abs(file))
    const binary = bytes.subarray(0, 8000).includes(0)
    const body = bytes.toString(binary ? 'latin1' : 'utf8')
    for (const [found, what, index] of residueIn(body)) fail(`${file}:${lineOf(body, index)}`, `"${found}", ${what}`)
  }
})

// 7. Art ---------------------------------------------------------------------------------

group('Art', (fail) => {
  const svgs = FILES.filter((f) => f.startsWith('assets/') && f.endsWith('.svg'))
  for (const file of svgs) {
    const svg = read(file)
    if (!svg.trimStart().startsWith('<svg')) fail(file, 'does not start with <svg')
    if (!/<title[\s>]/.test(svg)) fail(file, 'has no <title>')
    if (!/<svg\b[^>]*\brole\s*=\s*["']img["']/.test(svg)) fail(file, 'its <svg> element has no role="img"')
    for (const [what, re] of SVG_BANNED) {
      const m = svg.match(re)
      if (m) fail(`${file}:${lineOf(svg, m.index)}`, `contains ${what}`)
    }
  }
})

// 8. Syntax ------------------------------------------------------------------------------

group('Syntax', (fail) => {
  for (const file of FILES.filter((f) => /\.(mjs|js)$/.test(f))) {
    const result = spawnSync(process.execPath, ['--check', abs(file)], { encoding: 'utf8' })
    if (result.error) {
      fail(file, `node --check could not run: ${result.error.message}`)
    } else if (result.status !== 0) {
      const detail = (result.stderr || '').split('\n').map((l) => l.trim()).filter(Boolean)
      const reason = detail.find((l) => /Error/.test(l)) || detail[0] || `exit code ${result.status}`
      fail(file, `node --check fails: ${reason}`)
    }
  }
})

// 9. Inventory ---------------------------------------------------------------------------

group('Inventory', (fail) => {
  if (teamError) fail('scripts/assets/team.mjs', `does not load (${teamError}), so the roster below falls back to the agent files on disk`)
  else if (AGENT_NAMES.length !== EXPECTED_AGENTS) fail('scripts/assets/team.mjs', `TEAM has ${AGENT_NAMES.length} agents, and the team is ${EXPECTED_AGENTS}`)

  const agentFiles = entries('.claude/agents', 'file').filter((n) => n.endsWith('.md'))
  const roster = AGENT_NAMES || agentFiles.map((n) => basename(n, '.md'))

  const expectOne = (folder, ext, what) => {
    const have = entries(folder, 'file').filter((n) => n.endsWith(ext))
    if (have.length !== EXPECTED_AGENTS) fail(folder, `holds ${have.length} ${what}, and the team needs ${EXPECTED_AGENTS}`)
    for (const name of roster) if (!have.includes(`${name}${ext}`)) fail(`${folder}/${name}${ext}`, 'is missing')
    for (const n of have) if (!roster.includes(basename(n, ext))) fail(`${folder}/${n}`, 'is not on the roster')
  }
  expectOne('.claude/agents', '.md', 'agent files')
  expectOne('docs/agents', '.md', 'agent pages')
  expectOne('assets/agents', '.svg', 'covers')

  const skills = [...HOUSE_SKILLS, ...STACK_PACKS]
  for (const skill of skills) if (!exists(`.claude/skills/${skill}/SKILL.md`)) fail(`.claude/skills/${skill}/SKILL.md`, 'is missing')
  // Companion skills are allowed beside the team's own; an unknown team-* or stack-* folder is not.
  for (const folder of entries('.claude/skills', 'dir').filter(isTeamSkill)) {
    if (!skills.includes(folder)) fail(`.claude/skills/${folder}`, 'is not in the layout')
  }

  if (!exists('assets/hero.svg')) fail('assets/hero.svg', 'is missing')
  for (const name of DIAGRAMS) {
    for (const variant of ['light', 'dark']) {
      const path = `assets/${name}-${variant}.svg`
      if (!exists(path)) fail(path, 'is missing')
    }
  }

  for (const path of LAYOUT) if (!exists(path)) fail(path, 'is missing')
  if (exists('package.json')) fail('package.json', 'there is no root package.json. The team needs only git and node.')
  if (exists('.gitignore') && !/^\/?\.devteam\/(?:runs\/?)?\r?$/m.test(read('.gitignore'))) fail('.gitignore', 'does not ignore .devteam/runs/')

  // The shipped Playwright MCP server: pinned, WebMCP off, approved, and its rules in place.
  // A product that declines it at kickoff removes its .mcp.json entry and its approval,
  // and nothing else, so the checks on the server itself apply while it is declared. The
  // entry and the approval go together, and the permission rules and the ignore line hold
  // in every state.
  if (exists('.gitignore') && !/^\/?\.playwright-mcp\/?\r?$/m.test(read('.gitignore'))) fail('.gitignore', 'does not ignore .playwright-mcp/, where the Playwright MCP server writes unnamed captures')
  const parsed = (path) => {
    if (!exists(path)) return null
    try {
      return JSON.parse(read(path))
    } catch (err) {
      fail(path, `is not valid JSON: ${err.message}`)
      return null
    }
  }
  const mcp = parsed('.mcp.json')
  const server = mcp && mcp.mcpServers && mcp.mcpServers.playwright
  if (server) {
    const args = Array.isArray(server.args) ? server.args : []
    const pkg = args.find((a) => typeof a === 'string' && a.startsWith('@playwright/mcp'))
    if (!pkg || !/^@playwright\/mcp@\d+\.\d+\.\d+$/.test(pkg)) fail('.mcp.json', `the playwright server must be pinned to an exact version, @playwright/mcp@<major>.<minor>.<patch>, and it starts ${pkg ?? 'no @playwright/mcp package'}`)
    if (!args.includes('--no-webmcp')) fail('.mcp.json', 'the playwright server must be launched with --no-webmcp, so a page cannot add tools to the session')
  }
  const settings = parsed('.claude/settings.json')
  if (settings) {
    const perms = settings.permissions || {}
    for (const [kind, rule, why] of PLAYWRIGHT_RULES) {
      if (!(Array.isArray(perms[kind]) && perms[kind].includes(rule))) fail('.claude/settings.json', `permissions.${kind} must include ${rule}, because ${why}`)
    }
    const approved = Array.isArray(settings.enabledMcpjsonServers) && settings.enabledMcpjsonServers.includes('playwright')
    if (server && !approved) {
      fail('.claude/settings.json', 'enabledMcpjsonServers must include playwright, which approves the shipped server once the folder is trusted')
    }
    if (mcp && !server && approved) {
      fail('.mcp.json', 'does not declare the playwright server under mcpServers, and .claude/settings.json still approves it in enabledMcpjsonServers. Declining the server at kickoff removes both, and keeping it keeps both')
    }
  }
})

// ---------------------------------------------------------------------------------------
// Report

const failed = GROUPS.filter((g) => g.failures.length)
if (!failed.length) {
  console.log(`check: clean. ${GROUPS.length} groups passed over ${FILES.length} files.`)
  process.exit(0)
}

const count = failed.reduce((n, g) => n + g.failures.length, 0)
console.log(`check: ${count} failure${count === 1 ? '' : 's'} in ${failed.length} of ${GROUPS.length} groups.`)
GROUPS.forEach((g, i) => {
  console.log('')
  console.log(`${i + 1}. ${g.title}: ${g.failures.length ? `${g.failures.length} failure${g.failures.length === 1 ? '' : 's'}` : 'clean'}`)
  for (const f of g.failures) console.log(`   ${f}`)
})
process.exit(1)
