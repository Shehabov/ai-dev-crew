#!/usr/bin/env node
/**
 * The utilisation check.
 *
 * The orchestrator's reason for existing: did every agent that should have run actually
 * run, and was every agent that ran actually used?
 *
 * This file is the executable form of the algorithm in
 * `.claude/skills/team-orchestration/SKILL.md`. The skill is the specification and this file
 * is the implementation: one source, one reference, never two copies. The check was first
 * published as shell one-liners that needed a JSON tool the machine did not have, so the
 * most important routine on the team could not be run as documented. It is plain node now,
 * with no dependencies, so it runs wherever the team does.
 *
 * Invariants this file upholds:
 *   - It never writes. A checker that repairs what it checks cannot be trusted.
 *   - It never reads the ledger. The ledger is narrative; handoffs are the record.
 *   - A stage that is not yet due is reported as PENDING, not NEVER_RAN, so the check is
 *     meaningful mid-run and not only at closure. So is a stage that is due and waiting for
 *     its dispatch: it never ran only once the run has moved past it or is closing.
 *   - A placeholder left in the plan is a finding. A stage that consumes a path that can
 *     never exist is never due, and the run stalls without saying why.
 *   - Exit code is 1 when any finding is raised, so a gate can depend on it.
 *
 * Usage:  node .devteam/bin/utilisation-check.mjs <run-dir | run-id> [--json]
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, isAbsolute } from 'node:path'

const USAGE = `Usage: node .devteam/bin/utilisation-check.mjs <run-dir | run-id> [--json]

Checks a run against its plan: every planned agent ran, every output exists and was
consumed, every gate was resolved by its owner, and the five-step loop left a trace.
A bare run id resolves under DEVTEAM_RUNS_DIR (default .devteam/runs).
Run node .devteam/bin/sync-gates.mjs <run-dir> first, so run.json carries the owners'
gate results. --json prints one object instead of the report.

Exit codes: 0 no findings, 1 one or more findings, 2 no run.json or it does not parse.`

const VALID_STATUS = new Set(['passed', 'blocked', 'rejected', 'escalated'])
const VALID_GATE_RESULT = new Set(['pass', 'fail'])

/**
 * A placeholder from the run plan template, left unexpanded: anything in angle brackets
 * (`<locale>`, `<slug>`, `<test artefacts>`), or the ADR number `NNNN`.
 */
const PLACEHOLDER = /<[^<>]*>|\bNNNN\b/

/** The orchestrator runs every stage and is never a plan entry, so its gate has no pass to wait for. */
const ORCHESTRATOR = 'orchestrator'

/** Findings, in the vocabulary the skill defines. One name per condition, no synonyms. */
const F = {
  PLACEHOLDER_IN_PLAN: 'PLACEHOLDER_IN_PLAN',
  NEVER_RAN: 'NEVER_RAN',
  MALFORMED_HANDOFF: 'MALFORMED_HANDOFF',
  PHANTOM_OUTPUT: 'PHANTOM_OUTPUT',
  UNUSED_OUTPUT: 'UNUSED_OUTPUT',
  FALSE_CONSUMPTION: 'FALSE_CONSUMPTION',
  GATE_UNRESOLVED: 'GATE_UNRESOLVED',
  GATE_SELF_CERTIFIED: 'GATE_SELF_CERTIFIED',
  GATE_SKIPPED: 'GATE_SKIPPED',
  UNKNOWN_GATE: 'UNKNOWN_GATE',
  LOOP_SKIPPED: 'LOOP_SKIPPED',
  NO_TIMING: 'NO_TIMING',
}

/** Not a finding: work that is not due yet, or output whose reader has not run yet. */
const PENDING = 'PENDING'

const args = process.argv.slice(2)
if (args.includes('--help') || args.includes('-h')) {
  console.log(USAGE)
  process.exit(0)
}
const positional = args.filter((a) => !a.startsWith('-'))
const asJson = args.includes('--json')

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
const findings = []
const raise = (code, subject, detail) => findings.push({ code, subject, detail })
const pending = (subject, detail) => findings.push({ code: PENDING, subject, detail })

/* ------------------------------------------------------------------ inputs */

const runJsonPath = join(runDir, 'run.json')
if (!existsSync(runJsonPath)) {
  console.error(`No run.json at ${runJsonPath}. Nothing to check.`)
  process.exit(2)
}

let run
try {
  run = JSON.parse(readFileSync(runJsonPath, 'utf8'))
} catch (err) {
  console.error(`run.json does not parse: ${err.message}`)
  process.exit(2)
}

const plan = Array.isArray(run.plan) ? run.plan : []
const gates = Array.isArray(run.gates) ? run.gates : []
const gateByName = new Map(gates.map((g) => [g.name, g]))

/** A plan or handoff field that should be a list of paths or names. Anything else reads as empty. */
const list = (v) => (Array.isArray(v) ? v.map(String) : [])
const gatesOf = (h) => (h && Array.isArray(h.gates) ? h.gates.filter((g) => g && typeof g === 'object') : [])

/* ------------------------------------------------------------------ paths */

/** Paths are compared with forward slashes and no leading `./`, whatever the platform. */
const norm = (p) => String(p).replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '')

/**
 * Two paths name the same artefact when they are equal, or when one ends with the other at a
 * folder boundary. A handoff may cite `.devteam/runs/<id>/ux-designer/spec.md` where the plan
 * says `ux-designer/spec.md`, and both are the same file. The boundary matters: without it,
 * a file called `abrief.md` would count as a reading of `brief.md`.
 */
const samePath = (a, b) => {
  const x = norm(a)
  const y = norm(b)
  return x === y || x.endsWith('/' + y) || y.endsWith('/' + x)
}

/**
 * A path in a handoff may be run-relative, relative to where the check was started (the
 * repository root, in normal use), relative to the repository that holds the default runs
 * folder, or absolute. Try each.
 */
const repoGuess = resolve(runDir, '..', '..', '..')
function locate(p) {
  if (!p) return null
  const s = String(p)
  const candidates = isAbsolute(s) ? [s] : [join(runDir, s), resolve(s), join(repoGuess, s)]
  return candidates.find((c) => existsSync(c)) || null
}

const nonEmpty = (abs) => {
  try {
    const s = statSync(abs)
    return s.isDirectory() ? readdirSync(abs).length > 0 : s.size > 0
  } catch {
    return false
  }
}

const isDir = (p) => {
  try {
    return statSync(p).isDirectory()
  } catch {
    return false
  }
}

/**
 * The agent's own loop artefacts and its handoff are records of its work, not deliverables a
 * successor consumes. Expecting them to be consumed produces noise that buries the real
 * UNUSED_OUTPUT findings. Evidence is consumed by qc-lead and by the Product Lead, per the
 * skill. The patterns match run-relative paths (`evidence/build.log`) as well as longer ones.
 */
const isInternalArtefact = (p) => {
  const n = norm(p)
  return (
    /(^|\/)evidence\//.test(n) ||
    /(^|\/)handoff(-.+)?\.json$/.test(n) ||
    /(^|\/)(plan|review)\.md$/.test(n)
  )
}

/* ------------------------------------------------------------------ handoffs */

/**
 * Handoffs, keyed by agent folder.
 *
 * An agent may run more than once in a plan: bug-historian publishes the brief at stage 1,
 * runs the regression guard at stage 7 and records at stage 12. When every pass wrote the
 * same `handoff.json`, each pass destroyed the one before, and every downstream `consumed[]`
 * pointing at the brief read as FALSE_CONSUMPTION at closure. A later plan entry writes
 * `handoff-stage<N>.json`, a repeat pass at the same stage writes
 * `handoff-stage<N>-round<R>.json`, and this reader accepts every form.
 */
function loadHandoffs() {
  const out = []
  for (const entry of readdirSync(runDir)) {
    const dir = join(runDir, entry)
    if (entry === 'evidence' || !isDir(dir)) continue
    for (const file of readdirSync(dir)) {
      if (!/^handoff(-.+)?\.json$/.test(file)) continue
      const path = join(dir, file)
      let parsed = null
      let error = null
      try {
        parsed = JSON.parse(readFileSync(path, 'utf8'))
      } catch (err) {
        error = err.message
      }
      out.push({ agent: entry, file, path, handoff: parsed, error })
    }
  }
  return out
}

const handoffs = loadHandoffs()
const handoffsByAgent = new Map()
for (const h of handoffs) {
  if (!handoffsByAgent.has(h.agent)) handoffsByAgent.set(h.agent, [])
  handoffsByAgent.get(h.agent).push(h)
}

/** Every path any handoff says it read, the orchestrator's included. */
const consumedPaths = []
for (const { handoff } of handoffs) {
  if (handoff && typeof handoff === 'object') consumedPaths.push(...list(handoff.consumed))
}

/** The stage a file name declares: 7 for `handoff-stage7.json` and `handoff-stage7-round2.json`. */
const fileStage = (file) => {
  const m = file.match(/stage(\d+)/)
  return m ? m[1] : null
}

/**
 * Every gate record an owner made, oldest first, stamped with the time its handoff finished.
 * Records by a role that does not own the gate are left out: they are findings, never history.
 * This is how the check knows what a gate read at the moment a later stage started.
 */
const gateHistory = new Map()
for (const r of handoffs) {
  const at = Date.parse((r.handoff && r.handoff.finished) || '')
  if (Number.isNaN(at)) continue
  for (const g of gatesOf(r.handoff)) {
    const gate = gateByName.get(g.name)
    if (!gate || gate.owner !== r.agent || !VALID_GATE_RESULT.has(g.result)) continue
    if (!gateHistory.has(g.name)) gateHistory.set(g.name, [])
    gateHistory.get(g.name).push({ at, result: g.result })
  }
}
for (const h of gateHistory.values()) h.sort((a, b) => a.at - b.at)

/** What a gate read at time t, by its owner's records: 'pass', 'fail', or null for nothing yet. */
const gateResultAt = (name, t) => {
  let result = null
  for (const rec of gateHistory.get(name) || []) {
    if (rec.at > t) break
    result = rec.result
  }
  return result
}

/* -------------------------------------------------- is a stage due to have run yet? */

/**
 * A plan entry is due once every gate in its `blocked_by` reads `pass`. Run at run open, a
 * check without this raised NEVER_RAN against every planned agent, which made it useless
 * anywhere but closure. PENDING separates "has not run yet and should not have" from
 * "should have run and did not".
 */
const gatePassed = (name) => gateByName.get(name)?.result === 'pass'
const hasPlaceholder = (p) => PLACEHOLDER.test(p)

/**
 * `blocked_by` names gates only, never agents, so it cannot express "wait for the spec".
 * ux-auditor has no blocking gate but cannot audit a spec that does not exist yet. An entry
 * is due when its gates pass AND every input it is planned to consume is on disk. An input
 * that is still a placeholder can never be on disk, so an entry that consumes one is never
 * due; PLACEHOLDER_IN_PLAN names the cause.
 */
const isDue = (entry) =>
  list(entry.blocked_by).every(gatePassed) &&
  list(entry.consumes).every((p) => !hasPlaceholder(p) && locate(p))

const waitingOn = (entry) => [
  ...list(entry.blocked_by).filter((g) => !gatePassed(g)),
  ...list(entry.consumes).filter((p) => hasPlaceholder(p) || !locate(p)),
]

/**
 * An agent may appear in the plan more than once. Pair each handoff file with the plan entry
 * it belongs to by the `stage` the handoff declares, falling back to plan order, so a stage-1
 * brief is never judged against a stage-7 entry's blocked_by. Without this the check
 * cross-products the two and invents GATE_SKIPPED findings against a pass that ran long
 * before those gates existed. Round files of the same stage pair with the same entry.
 */
function pairWithPlan(entries, records) {
  if (entries.length === 0) return []
  if (entries.length === 1) return records.map((r) => ({ rec: r, entry: entries[0] }))
  const byStage = new Map(entries.map((e) => [String(e.stage), e]))
  const unmatched = [...entries].sort((a, b) => a.stage - b.stage)
  // handoff.json is always the first pass. A plain localeCompare sorts `handoff-stage7.json`
  // ahead of it, which paired the stage-7 guard with the stage-1 entry when no stage was declared.
  const order = (f) => (f === 'handoff.json' ? -1 : Number((f.match(/\d+/) || [Infinity])[0]))
  // A stage is declared by the handoff's `stage` field, or else by the number in its file
  // name, so `handoff-stage1-brief.json` pairs with stage 1 and never with the stage-7 guard.
  const declaredStage = (r) => {
    if (r.handoff && r.handoff.stage != null) return String(r.handoff.stage)
    return r.file !== 'handoff.json' ? fileStage(r.file) : null
  }
  return records
    .slice()
    .sort((a, b) => order(a.file) - order(b.file))
    .map((r) => {
      const declared = byStage.get(declaredStage(r)) || null
      const entry = declared || unmatched[0] || entries[entries.length - 1]
      const i = unmatched.indexOf(entry)
      if (i !== -1) unmatched.splice(i, 1)
      return { rec: r, entry }
    })
}

const planByAgent = new Map()
for (const entry of plan) {
  if (!planByAgent.has(entry.agent)) planByAgent.set(entry.agent, [])
  planByAgent.get(entry.agent).push(entry)
}

/** Which plan entries have a handoff, judged by pairing, so each pass is counted on its own. */
const pairsByAgent = new Map()
const covered = new Set()
for (const [agent, entries] of planByAgent) {
  const pairs = pairWithPlan(entries, handoffsByAgent.get(agent) || [])
  pairsByAgent.set(agent, pairs)
  for (const { entry } of pairs) covered.add(entry)
}

/**
 * The run is closing once the orchestrator has recorded its own gate in a handoff. From then
 * on nothing is still to come, so a planned pass with no handoff never ran, due or not.
 */
const closingGates = new Set(gates.filter((g) => g.owner === ORCHESTRATOR).map((g) => g.name))
const closing = (handoffsByAgent.get(ORCHESTRATOR) || []).some((r) => gatesOf(r.handoff).some((g) => closingGates.has(g.name)))

/**
 * The script cannot see a dispatch, because it never reads the ledger. An entry that is due and
 * has no handoff is therefore waiting for its dispatch, or still running: finishing stage N
 * always makes stage N+1 due, so raising it at once left the check unclean at every stage
 * boundary of a healthy run. It never ran once the run has moved past it: a planned entry
 * that reads what it is planned to produce has handed off without it, or the run is closing.
 */
const ranWithout = (entry) =>
  plan.filter((e) => e !== entry && covered.has(e) && list(e.consumes).some((c) => list(entry.produces).some((p) => samePath(c, p))))

/**
 * The last stage has no successor, so its output is exempt from UNUSED_OUTPUT. The exemption
 * belongs to the entry, not to the agent: bug-historian closes the run at stage 12, and
 * exempting the agent would also have exempted the stage-1 brief, which is exactly the
 * output the check most needs to see consumed.
 */
const maxStage = plan.reduce((m, e) => Math.max(m, Number(e.stage) || 0), 0)

/* ------------------------------------------------------------------ the plan itself */

for (const entry of plan) {
  for (const field of ['consumes', 'produces']) {
    for (const p of list(entry[field])) {
      if (hasPlaceholder(p)) {
        raise(F.PLACEHOLDER_IN_PLAN, entry.agent, `stage ${entry.stage} ${field} "${p}", which still carries a template placeholder. Expand it before the first dispatch.`)
      }
    }
  }
  for (const g of list(entry.blocked_by)) {
    if (!gateByName.has(g)) raise(F.UNKNOWN_GATE, entry.agent, `stage ${entry.stage} is blocked_by "${g}", which is not in run.json gates[]`)
  }
}

/* ------------------------------------------------------------------ every handoff */

/**
 * Checks that hold for any handoff, planned or not: it parses, its keys are sound, what it
 * produced exists, what it consumed exists, its gates are real and its own, and its times
 * are from the shell. Returns the parsed handoff, or null when there is nothing to check.
 */
function checkRecord(agent, rec, label) {
  // 2. HANDOFF PARSES
  if (rec.error) {
    raise(F.MALFORMED_HANDOFF, label, `does not parse: ${rec.error}`)
    return null
  }
  const h = rec.handoff
  if (!h || typeof h !== 'object' || Array.isArray(h)) {
    raise(F.MALFORMED_HANDOFF, label, 'is not a JSON object')
    return null
  }
  if (!VALID_STATUS.has(h.status)) {
    raise(F.MALFORMED_HANDOFF, label, `status "${h.status}" is not one of ${[...VALID_STATUS].join(', ')}`)
  }
  if (h.agent !== agent) {
    raise(F.MALFORMED_HANDOFF, label, h.agent == null ? 'has no agent key' : `agent "${h.agent}" does not match its folder "${agent}"`)
  }
  if (h.stage == null) {
    raise(F.MALFORMED_HANDOFF, label, 'has no stage key, so it cannot be paired with its plan entry')
  } else if (fileStage(rec.file) && fileStage(rec.file) !== String(h.stage)) {
    raise(F.MALFORMED_HANDOFF, label, `its file name says stage ${fileStage(rec.file)} and its stage key says ${h.stage}`)
  }
  for (const g of gatesOf(h)) {
    if (!VALID_GATE_RESULT.has(g.result)) {
      raise(F.MALFORMED_HANDOFF, label, `gate "${g.name}" has result "${g.result}", which is neither pass nor fail`)
    }
  }

  // 3. OUTPUT EXISTS
  for (const p of list(h.produced)) {
    const abs = locate(p)
    if (!abs || !nonEmpty(abs)) raise(F.PHANTOM_OUTPUT, label, `produced ${p}, which is missing or empty`)
  }

  // 5. INPUTS WERE REAL
  for (const p of list(h.consumed)) {
    if (!locate(p)) raise(F.FALSE_CONSUMPTION, label, `consumed ${p}, which does not exist`)
  }

  // 6 and 7. GATES RESOLVED, AND OWNED BY THE AGENT THAT CERTIFIED THEM
  for (const g of gatesOf(h)) {
    if (!gateByName.has(g.name)) {
      raise(F.UNKNOWN_GATE, label, `certified "${g.name}", which is not in run.json gates[]`)
      continue
    }
    if (gateByName.get(g.name).owner !== agent) {
      raise(F.GATE_SELF_CERTIFIED, label, `certified "${g.name}", owned by ${gateByName.get(g.name).owner}`)
    }
    if (g.result === 'pass' && !g.evidence) {
      raise(F.GATE_UNRESOLVED, label, `gate "${g.name}" passed with no evidence path`)
    } else if (g.result === 'pass' && !locate(g.evidence)) {
      raise(F.GATE_UNRESOLVED, label, `gate "${g.name}" passed on evidence ${g.evidence}, which does not exist`)
    }
  }

  // 10. TIMING IS COHERENT
  const started = Date.parse(h.started || '')
  const finished = Date.parse(h.finished || '')
  if (Number.isNaN(started) || Number.isNaN(finished)) {
    raise(F.NO_TIMING, label, `started "${h.started}" and finished "${h.finished}" must both be ISO 8601 times from the shell`)
  } else if (started > finished) {
    raise(F.NO_TIMING, label, `started ${h.started} is after finished ${h.finished}`)
  }

  return h
}

/* ------------------------------------------------------------------ the planned passes */

for (const [agent, entries] of planByAgent) {
  const records = handoffsByAgent.get(agent) || []
  const stagesForAgent = entries.map((e) => String(e.stage))

  // 1. HANDOFF EXISTS, once per planned pass
  for (const entry of entries) {
    if (covered.has(entry)) continue
    const readers = [...new Set(ranWithout(entry).map((e) => e.agent))]
    if (closing) {
      raise(F.NEVER_RAN, agent, `stage ${entry.stage} has no handoff, and the run is closing: ${entry.task || ''}`)
    } else if (readers.length) {
      raise(F.NEVER_RAN, agent, `stage ${entry.stage} has no handoff, and ${readers.join(', ')} already handed off on its output: ${entry.task || ''}`)
    } else if (isDue(entry)) {
      pending(agent, `stage ${entry.stage} is due now (its gates pass and its inputs are on disk): dispatch it`)
    } else {
      pending(agent, `stage ${entry.stage}, waiting on ${waitingOn(entry).join(', ') || 'nothing'}`)
    }
  }

  for (const { rec, entry } of pairsByAgent.get(agent)) {
    const label = records.length > 1 ? `${agent} (${rec.file})` : agent

    // 2, 3, 5, 6, 7 and 10, shared with handoffs outside the plan.
    const h = checkRecord(agent, rec, label)
    if (!h) continue
    if (h.stage != null && !stagesForAgent.includes(String(h.stage))) {
      raise(F.MALFORMED_HANDOFF, label, `stage ${h.stage} is not a stage the plan gives ${agent} (${stagesForAgent.join(', ')})`)
    }

    // 4. OUTPUT WAS CONSUMED
    //    Evidence is consumed by qc-lead and by the Product Lead rather than by a successor,
    //    and the last stage has no successor. Both are stated exceptions in the skill.
    const lastStage = Number(entry.stage) === maxStage
    for (const p of list(h.produced)) {
      if (isInternalArtefact(p) || lastStage) continue
      if (consumedPaths.some((c) => samePath(c, p))) continue
      // Nobody has consumed it. That is only a defect once its reader has run: mid-run, an
      // artefact waiting for an agent that has not handed off yet is correct. The reader is
      // the planned consumer; where the plan names none, any later stage may still read it,
      // so the output is judged once every later stage has handed off.
      const planned = plan.filter((e) => list(e.consumes).some((c) => samePath(c, p)))
      const readers = planned.length ? planned : plan.filter((e) => Number(e.stage) > Number(entry.stage))
      const awaiting = [...new Set(readers.filter((e) => !covered.has(e)).map((e) => e.agent))]
      if (awaiting.length) {
        pending(label, `produced ${p}, awaiting ${awaiting.join(', ')}${planned.length ? '' : ' (no planned consumer, so any later stage may read it)'}`)
      } else {
        raise(F.UNUSED_OUTPUT, label, `produced ${p}, which no later agent consumed`)
      }
    }

    // 8. NO SKIPPED DEPENDENCY
    //    A gate that reads anything but pass now was skipped. A gate that reads pass now was
    //    still skipped if its owner had not recorded the pass when this pass started, which is
    //    the case a closing check would otherwise never see. Unknown names in blocked_by are
    //    raised once, against the plan, above.
    const startedAt = Date.parse(h.started || '')
    for (const gname of list(entry.blocked_by)) {
      const g = gateByName.get(gname)
      if (!g) continue
      if (g.result !== 'pass') {
        raise(F.GATE_SKIPPED, label, `ran while gate "${gname}" reads "${g.result}"`)
        continue
      }
      if (Number.isNaN(startedAt)) continue
      const history = gateHistory.get(gname) || []
      const then = gateResultAt(gname, startedAt)
      if (then !== 'pass' && history.some((x) => x.result === 'pass')) {
        const passedAt = history.find((x) => x.result === 'pass' && x.at > startedAt)
        raise(F.GATE_SKIPPED, label, `started ${h.started}, when gate "${gname}" read ${then || 'pending'}${passedAt ? `; ${g.owner} recorded pass at ${new Date(passedAt.at).toISOString()}` : ''}`)
      }
    }

    // 9. THE FIVE-STEP LOOP WAS ACTUALLY WORKED
    //    plan.md carries the step-1 plan and its audit; review.md carries the step-4 review.
    //    The audit heading may be numbered, as the template numbers it: "## 2. Audit of the plan".
    const agentDir = join(runDir, agent)
    const planMd = join(agentDir, 'plan.md')
    const reviewMd = join(agentDir, 'review.md')
    if (!existsSync(planMd) || !nonEmpty(planMd)) {
      raise(F.LOOP_SKIPPED, label, 'no plan.md: steps 1 and 2 of the loop left no trace')
    } else if (!/^#{2,6}[ \t]*(\d+[.)]?[ \t]*)?audit\b/im.test(readFileSync(planMd, 'utf8'))) {
      raise(F.LOOP_SKIPPED, label, 'plan.md has no Audit section, so step 2 was skipped')
    }
    if (!existsSync(reviewMd) || !nonEmpty(reviewMd)) {
      raise(F.LOOP_SKIPPED, label, 'no review.md: step 4 left no trace')
    }
  }
}

/* ------------------------------------------------------------------ handoffs outside the plan */

/**
 * The orchestrator is never a plan entry, but its handoffs carry run-closure and cite the
 * evidence the run is closed on, so they get every check that does not depend on a plan
 * entry. A handoff in any other folder the plan does not name is malformed: a role in
 * omitted[] does not hand off, and a misnamed folder hides real work from every check.
 */
for (const [agent, records] of handoffsByAgent) {
  if (planByAgent.has(agent)) continue
  for (const rec of records) {
    const label = `${agent} (${rec.file})`
    if (agent !== ORCHESTRATOR) {
      raise(F.MALFORMED_HANDOFF, label, `sits in folder "${agent}", which is not an agent in the plan`)
    }
    checkRecord(agent, rec, label)
  }
}

/* ------------------------------------------------------------------ gates */

/*
 * Gates nobody resolved. Only counted once every agent that could resolve one has run. An
 * owner that runs more than once (bug-historian's brief, then its guard) sets its gate on a
 * later pass, so a pending gate is only unresolved once the owner has handed off for every
 * pass it has in the plan, or has named the gate in a handoff. A gate whose owner is not in
 * the plan can never resolve at all, which is what a right-sizing edit that removed a role
 * but kept its gate looks like. A gate that reads a result no owner handoff records was
 * written by hand, and only sync-gates.mjs writes a result, copied from its owner.
 */
for (const g of gates) {
  const owned = handoffsByAgent.get(g.owner) || []
  const named = owned.some((r) => gatesOf(r.handoff).some((x) => x.name === g.name))
  const passes = plan.filter((e) => e.agent === g.owner)
  if (passes.length === 0 && g.owner !== ORCHESTRATOR) {
    raise(F.GATE_UNRESOLVED, g.owner, `gate "${g.name}" is owned by ${g.owner}, which is not in the plan, so it can never resolve. Plan the owner, or remove the gate with it and record the reason in omitted[].`)
    continue
  }
  if (g.result !== 'pending' && !named) {
    raise(F.GATE_UNRESOLVED, g.owner, `gate "${g.name}" reads "${g.result}" in run.json, but no handoff by ${g.owner} records it`)
    continue
  }
  const allPassesRan = passes.length > 0 && passes.every((e) => covered.has(e))
  if (g.result === 'pending' && (named || allPassesRan)) {
    raise(F.GATE_UNRESOLVED, g.owner, `gate "${g.name}" still reads pending although its owner has handed off (run sync-gates.mjs first if the owner recorded a result)`)
  }
}

/* ------------------------------------------------------------------ report */

const real = findings.filter((f) => f.code !== PENDING)
const waiting = findings.filter((f) => f.code === PENDING)

if (asJson) {
  console.log(JSON.stringify({ run: run.run, findings: real, pending: waiting, clean: real.length === 0 }, null, 2))
} else {
  console.log(`Utilisation check: ${run.run}`)
  console.log(`  plan ${plan.length} entries for ${planByAgent.size} agents, ${handoffs.length} handoffs on disk, ${gates.length} gates\n`)
  if (real.length === 0) console.log('  No findings.')
  for (const f of real) console.log(`  ${f.code}: ${f.subject}: ${f.detail}`)
  if (waiting.length) {
    console.log(`\n  Pending, not findings (${waiting.length}):`)
    for (const f of waiting) console.log(`    ${f.subject}: ${f.detail}`)
  }
}

process.exit(real.length === 0 ? 0 : 1)
