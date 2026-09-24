#!/usr/bin/env node
/**
 * Sync gate results from agent handoffs into run.json.
 *
 * A gate's result lives in `run.json`. Its owner records the result in its own handoff.
 * Nothing used to copy one into the other until the run closed, so mid-run every gate read
 * `pending`, every dispatched agent looked as if it had started before its blocking gate
 * passed, and the rule that a stage waits for its gates could not be enforced by reading the
 * file the rule points at.
 *
 * This is that copy, made explicit and runnable. The orchestrator runs it after reading each
 * handoff, and always before the utilisation check and before dispatching the next stage.
 *
 * Invariants this file upholds:
 *   - It only ever copies a result an owner recorded. It never decides a gate.
 *   - It refuses a result from an agent the plan does not name as that gate's owner, which
 *     is GATE_SELF_CERTIFIED and belongs to the checker, not to a sync step. It also refuses
 *     a gate name that run.json does not carry (UNKNOWN_GATE) and a result that is neither
 *     `pass` nor `fail`, because a gate recorded as `go` or `ok` would never read `pass` and
 *     the stage it blocks would wait forever without saying why.
 *   - When an owner records the same gate more than once (a fail, a fix, then a re-review
 *     that passes), the owner's latest record wins, judged by the handoff's `finished` time
 *     and then by pass number. Refusing every change after the first result used to pin a
 *     gate at `fail` for good, so the stage it blocked could never become due and the run
 *     stalled. Re-running is still safe: the same handoffs always give the same answer.
 *   - It changes only `gates[].result` and `gates[].evidence`. No other value in run.json
 *     changes, though the file is written back with two-space indentation.
 *
 * Usage:  node .devteam/bin/sync-gates.mjs <run-dir | run-id> [--dry-run]
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const USAGE = `Usage: node .devteam/bin/sync-gates.mjs <run-dir | run-id> [--dry-run]

Copies each gate result from its owner's handoff into run.json. It never decides a gate.
A bare run id resolves under DEVTEAM_RUNS_DIR (default .devteam/runs).
--dry-run prints what would change and writes nothing.

Exit codes: 0 synced or nothing to apply, 1 one or more records refused,
2 no run.json or it does not parse.`

const VALID_GATE_RESULT = new Set(['pass', 'fail'])

const args = process.argv.slice(2)
if (args.includes('--help') || args.includes('-h')) {
  console.log(USAGE)
  process.exit(0)
}
const positional = args.filter((a) => !a.startsWith('-'))
const dryRun = args.includes('--dry-run')

/**
 * The argument is a run folder, or a bare run id. A bare id resolves under the runs folder,
 * which is `.devteam/runs` unless DEVTEAM_RUNS_DIR moves it.
 */
function resolveRunDir(arg) {
  const direct = resolve(arg || '.')
  if (existsSync(join(direct, 'run.json'))) return direct
  if (arg && !/[\\/]/.test(arg)) {
    const byId = resolve(process.env.DEVTEAM_RUNS_DIR || join('.devteam', 'runs'), arg)
    if (existsSync(join(byId, 'run.json'))) return byId
  }
  return direct
}

const runDir = resolveRunDir(positional[0])
const runJsonPath = join(runDir, 'run.json')

if (!existsSync(runJsonPath)) {
  console.error(`No run.json at ${runJsonPath}.`)
  process.exit(2)
}

let run
try {
  run = JSON.parse(readFileSync(runJsonPath, 'utf8'))
} catch (err) {
  console.error(`run.json does not parse: ${err.message}`)
  process.exit(2)
}

const gates = Array.isArray(run.gates) ? run.gates : []
const gateByName = new Map(gates.map((g) => [g.name, g]))

const isDir = (p) => {
  try {
    return statSync(p).isDirectory()
  } catch {
    return false
  }
}

/**
 * The order of a handoff file among an agent's passes, used only to break a tie between two
 * records that finished in the same second. `handoff.json` is 0; `handoff-stage<N>.json` is
 * round 1 of stage N; `handoff-stage<N>-round<R>.json` is round R of stage N.
 */
const ROUNDS_PER_STAGE = 1000
function passOf(file) {
  if (file === 'handoff.json') return 0
  const stage = Number((file.match(/stage(\d+)/) || file.match(/(\d+)/) || [0, 0])[1])
  const round = Number((file.match(/round(\d+)/) || [0, 1])[1])
  return stage * ROUNDS_PER_STAGE + round
}

/** Collect every gate result any agent recorded, with the agent that recorded it. */
const claims = []
for (const entry of readdirSync(runDir)) {
  const dir = join(runDir, entry)
  if (entry === 'evidence' || !isDir(dir)) continue
  for (const file of readdirSync(dir)) {
    if (!/^handoff(-.+)?\.json$/.test(file)) continue
    let h
    try {
      h = JSON.parse(readFileSync(join(dir, file), 'utf8'))
    } catch {
      // A handoff that does not parse carries no gate record. The utilisation check raises
      // it as MALFORMED_HANDOFF; this step only copies what it can read.
      continue
    }
    // handoff.json is the first pass. A later pass is numbered by the stage in its file name,
    // then by its round, so handoff-stage6-round3.json outranks handoff-stage6-round2.json.
    const pass = passOf(file)
    const at = Date.parse((h && h.finished) || '') || 0
    for (const g of (h && Array.isArray(h.gates) ? h.gates : [])) {
      if (g && typeof g === 'object') claims.push({ agent: entry, file, pass, at, ...g })
    }
  }
}

const applied = []
const refused = []

// Oldest first, so the owner's latest record is the one left standing.
claims.sort((a, b) => a.at - b.at || a.pass - b.pass)
const latest = new Map()

for (const c of claims) {
  const gate = gateByName.get(c.name)
  if (!gate) {
    refused.push(`${c.agent} certified "${c.name}", which is not a gate in this run (UNKNOWN_GATE)`)
    continue
  }
  if (gate.owner !== c.agent) {
    refused.push(`${c.agent} certified "${c.name}", owned by ${gate.owner} (GATE_SELF_CERTIFIED)`)
    continue
  }
  if (!VALID_GATE_RESULT.has(c.result)) {
    refused.push(`${c.agent} recorded "${c.name}" as "${c.result}", which is neither pass nor fail (${c.file})`)
    continue
  }
  latest.set(c.name, c)
}

for (const [name, c] of latest) {
  const gate = gateByName.get(name)
  if (gate.result === c.result && (!c.evidence || gate.evidence === c.evidence)) continue
  const was = gate.result
  gate.result = c.result
  if (c.evidence) gate.evidence = c.evidence
  applied.push(`${name}: ${was} -> ${c.result}  (${c.agent}, ${c.file})`)
}

if (applied.length && !dryRun) {
  writeFileSync(runJsonPath, JSON.stringify(run, null, 2) + '\n', 'utf8')
}

console.log(`Gate sync: ${run.run}`)
if (applied.length) {
  console.log(dryRun ? '\n  would apply:' : '\n  applied:')
  for (const a of applied) console.log(`    ${a}`)
} else {
  console.log('\n  nothing to apply')
}
if (refused.length) {
  console.log('\n  refused:')
  for (const r of refused) console.log(`    ${r}`)
}
console.log(`\n  now: ${gates.map((g) => `${g.name}=${g.result}`).join('  ')}`)

process.exit(refused.length ? 1 : 0)
