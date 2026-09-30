# The workflow

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="../assets/flow-dark.svg">
  <img src="../assets/flow-light.svg" alt="The delivery flow: the Product Lead's brief, the regression brief, architecture, the design track beside the back end, the interface, four independent reviews, the regression guard, integration, testing, the quality gate, release, the record and the Product Lead's acceptance" width="100%">
</picture>

A brief from the Product Lead goes in at the top and an accepted release comes out at the
bottom. In between, fifteen roles each do one part of the work, and every handoff is a file
on disk that the next role reads. Twelve gates stand between the stages, each owned by one
role.
The [orchestrator](agents/orchestrator.md) dispatches every role, opens a stage only when the
gates before it read pass, and checks after every stage that each planned role ran and that
its output was used.

This page explains how a run moves. The rules themselves live in two skills:
[team-protocol](../.claude/skills/team-protocol/SKILL.md) for what every agent does on every
task, and [team-orchestration](../.claude/skills/team-orchestration/SKILL.md) for how the
orchestrator plans, routes and checks. Where this page and a skill differ, the skill is
right. [GETTING-STARTED.md](GETTING-STARTED.md) covers kickoff and a first run from your side
of the session, and [.devteam/README.md](../.devteam/README.md) explains the run folder and
the two scripts.

## The stages

Every run is planned from one template, held in identical form in the orchestrator's
definition and in `team-orchestration`. Each row is a plan entry: one pass by one agent.
Paths are relative to the run folder, `.devteam/runs/<run-id>/`.

| Stage | Agent | Consumes | Produces | Blocked by |
|---|---|---|---|---|
| 1 | [bug-historian](agents/bug-historian.md) | `run.json` | `bug-historian/brief.md` | none |
| 1 | [tech-architect](agents/tech-architect.md) | `run.json`, `bug-historian/brief.md` | `tech-architect/adr-NNNN-<slug>.md`, `tech-architect/brief-frontend.md`, `tech-architect/brief-backend.md` | none |
| 2 | [ux-designer](agents/ux-designer.md) | `tech-architect/brief-frontend.md`, `bug-historian/brief.md` | `ux-designer/spec.md`, `ux-designer/string-slots.json` | `design-authority` |
| 2 | [backend-engineer](agents/backend-engineer.md) | `tech-architect/brief-backend.md`, `bug-historian/brief.md` | `backend-engineer/files.md` | `design-authority` |
| 3 | [ux-auditor](agents/ux-auditor.md) | `ux-designer/spec.md`, `bug-historian/brief.md` | `ux-auditor/findings.md` | none |
| 4 | [ux-writer](agents/ux-writer.md) | `ux-designer/spec.md`, `ux-designer/string-slots.json`, `ux-auditor/findings.md`, `bug-historian/brief.md` | `ux-writer/strings.md`, `ux-writer/strings-<locale>.json` | `design` |
| 5 | [frontend-engineer](agents/frontend-engineer.md) | `tech-architect/brief-frontend.md`, `ux-designer/spec.md`, `ux-writer/strings-<locale>.json`, `bug-historian/brief.md` | `frontend-engineer/files.md` | `design`, `copy` |
| 6 | [peer-reviewer](agents/peer-reviewer.md) | `backend-engineer/files.md`, `frontend-engineer/files.md`, `bug-historian/brief.md` | `peer-reviewer/verdict.json`, `peer-reviewer/comments.md` | none |
| 6 | [code-analyst](agents/code-analyst.md) | `backend-engineer/files.md`, `frontend-engineer/files.md`, `bug-historian/brief.md` | `code-analyst/findings.md` | none |
| 6 | [code-steward](agents/code-steward.md) | `backend-engineer/files.md`, `frontend-engineer/files.md`, `bug-historian/brief.md` | `code-steward/findings.md` | none |
| 6 | [security-analyst](agents/security-analyst.md) | `backend-engineer/files.md`, `frontend-engineer/files.md`, `bug-historian/brief.md` | `security-analyst/findings.md`, `evidence/security/` | none |
| 7 | [bug-historian](agents/bug-historian.md) | `bug-historian/brief.md`, `backend-engineer/files.md`, `frontend-engineer/files.md` | `bug-historian/guard.md`, `evidence/regression/` | `review-judgement`, `review-defects`, `review-readability`, `security` |
| 8 | [engineering-lead](agents/engineering-lead.md) | `peer-reviewer/verdict.json`, `peer-reviewer/comments.md`, `code-analyst/findings.md`, `code-steward/findings.md`, `security-analyst/findings.md`, `bug-historian/guard.md` | `engineering-lead/verdict.md`, `evidence/build.log` | `review-judgement`, `review-defects`, `review-readability`, `security`, `regression-guard` |
| 9 | [qc-engineer](agents/qc-engineer.md) | `engineering-lead/verdict.md`, `bug-historian/brief.md` | `qc-engineer/test-log.md`, `qc-engineer/defects.md`, `evidence/<test artefacts>` | `engineering` |
| 10 | [qc-lead](agents/qc-lead.md) | `qc-engineer/test-log.md`, `qc-engineer/defects.md`, `evidence/<test artefacts>` | `qc-lead/readiness.md` | none |
| 11 | [release-engineer](agents/release-engineer.md) | `qc-lead/readiness.md` | `release-engineer/preflight.md`, `release-engineer/release-log.md`, `release-engineer/release-note.md`, `release-engineer/rollback.md`, `evidence/release/` | `quality` |
| 12 | [bug-historian](agents/bug-historian.md) | `qc-engineer/defects.md`, `qc-lead/readiness.md`, `bug-historian/guard.md` | `bug-historian/record.md` | `release` |

An entry is due when every gate in its `blocked_by` reads pass and every path in its
`consumes` is on disk. That is why tech-architect shares stage 1 with bug-historian and still
waits for the regression brief, and why ux-auditor, which no gate blocks, waits for the spec.
The orchestrator dispatches each entry when it is due, and entries that fall due together go
out in parallel.

Stage numbers order the work inside a track, and the gates are the barriers between tracks.
The design track (ux-designer, then ux-auditor, looping until `design` passes, then
ux-writer) runs beside backend-engineer. frontend-engineer waits for `design` and `copy`,
because it cannot finish without the spec and the strings. The four reviewers at stage 6 run
in parallel and independently: none reads another's verdict before filing its own.

bug-historian runs three times. At stage 1 it briefs every role on what has already broken
on these surfaces. At stage 7 it guards that nothing already in `BUGS.md` was repeated. At
stage 12 it records every defect and agent mistake raised in the run.

### The architecture-holds pass

Whenever tech-architect and at least one builder are planned, the orchestrator appends one
more entry after the four reviewers: tech-architect at stage 6, re-reading the diff against
the ADR, the contracts and the product invariants. It consumes the ADR and the builders'
`files.md`, produces `tech-architect/holds.md`, and owns no gate. engineering-lead reads it
for its conformance check, so the path is added to engineering-lead's `consumes`. With it, a
full run has eighteen plan entries.

### Placeholders

The template keeps three placeholders so it reads for any product, and a real `run.json`
expands all of them before the first dispatch. `ux-writer/strings-<locale>.json` becomes one
path per locale in `PROJECT.md § Locales`. `tech-architect/adr-NNNN-<slug>.md` becomes the
real ADR name, such as `tech-architect/adr-0007-invoice-export.md`. `evidence/<test artefacts>`
becomes the evidence paths qc-engineer will write, one per test area. A placeholder can never
exist on disk, so an entry that consumes one is never due, and the utilisation check raises
`PLACEHOLDER_IN_PLAN` for any that is left.

## Right-sizing

The orchestrator plans only the roles a change needs. The utilisation check reads only the
plan, so a right-sized plan checks clean.

| Role | When it is planned |
|---|---|
| bug-historian (all three passes), tech-architect, peer-reviewer, code-analyst, code-steward, security-analyst, engineering-lead, qc-engineer, qc-lead | Always, for a code change |
| ux-designer and ux-auditor | A surface a person sees changes |
| ux-writer | A user-visible string changes, in any locale |
| backend-engineer | The data layer, the API or a server path changes |
| frontend-engineer | The interface changes |
| release-engineer | The change ships |

Every plan entry left out gets one object in `run.json` `omitted`, with a reason that names
what the change does not touch:

```json
{ "agent": "ux-writer", "stage": 4, "reason": "No user-visible string changes: the API returns the existing rate limit error code." }
```

"Not needed" is not a reason, and neither is a deadline. Leaving a role out for any reason
other than "this change does not touch it" is a scope decision, and it goes to the Product
Lead.

The rest of the plan is then made to agree with what is left, because a plan that points at a
role that will not run can never check clean. Every gate whose owner is omitted is removed,
along with its name in every `blocked_by` and `blocks`. Every omitted role's artefacts come
out of the remaining entries' `consumes`, and an artefact no planned role will read comes out
of its producer's `produces`. When release-engineer is omitted, `ships` becomes false, the
`release` gate goes, and bug-historian's stage 12 entry waits on `quality` instead.

A change that is not code at all, such as a design exploration or a copy pass, is planned by
the same table, and every other role goes into `omitted` with its reason.

## The gates

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="../assets/gates-dark.svg">
  <img src="../assets/gates-light.svg" alt="The twelve gates as points on one line, in the order a run meets them, each with the role that owns it" width="100%">
</picture>

Twelve gates, in the order a run meets them. These literal names go into `run.json` and come
back in each owner's handoff, so they are never renamed for a run.

| Gate | Owner | Blocks | Passes when |
|---|---|---|---|
| `design-authority` | [tech-architect](agents/tech-architect.md) | ux-designer, backend-engineer | An ADR and task briefs exist and hold the product invariants |
| `design` | [ux-auditor](agents/ux-auditor.md) | ux-writer, frontend-engineer | The spec survives an independent audit against the brand and WCAG 2.2 AA |
| `copy` | [ux-writer](agents/ux-writer.md) | frontend-engineer | Every string exists in every locale, within its length budget |
| `review-judgement` | [peer-reviewer](agents/peer-reviewer.md) | bug-historian (guard), engineering-lead | A senior read finds the design, boundaries and failure modes sound |
| `review-defects` | [code-analyst](agents/code-analyst.md) | bug-historian (guard), engineering-lead | A line-by-line read finds no open blocker or major |
| `review-readability` | [code-steward](agents/code-steward.md) | bug-historian (guard), engineering-lead | Names, shape and comments meet the clean code standard |
| `security` | [security-analyst](agents/security-analyst.md) | bug-historian (guard), engineering-lead | Every pass of the security sweep ran, and nothing critical or high is open |
| `regression-guard` | [bug-historian](agents/bug-historian.md) | engineering-lead | No defect already in BUGS.md has been repeated |
| `engineering` | [engineering-lead](agents/engineering-lead.md) | qc-engineer | It builds, migrates and runs end to end, with the log to prove it |
| `quality` | [qc-lead](agents/qc-lead.md) | release-engineer | The evidence holds up to audit, and the call is go |
| `release` | [release-engineer](agents/release-engineer.md) | bug-historian (record) | Shipped, tagged, verified, with a written rollback |
| `run-closure` | [orchestrator](agents/orchestrator.md) | nothing | Every planned role ran, and every output was used |

The accessibility standard in `design` is the one `PROJECT.md § Quality bar` names, WCAG 2.2
AA unless the profile says otherwise. ux-designer, backend-engineer, frontend-engineer and
qc-engineer own no gate: their work is judged by the gate that follows it.

The three review gates and the security gate are four names rather than one gate with four
owners, so a check can say which reviewer is outstanding instead of reporting one ambiguous
failure.

### Who records a gate

A gate result is recorded only by its owner, in the `gates[]` of its own handoff, under the
exact name `run.json` carries, with `result` set to `pass` or `fail` and an `evidence` path
that exists. Self-checks, sub-gates and rubric lenses go in the agent's `review.md` or its
verdict file, never in `gates[]`, where an unlisted name raises `UNKNOWN_GATE`. A record for a
gate another role owns raises `GATE_SELF_CERTIFIED`.

`node .devteam/bin/sync-gates.mjs` copies each owner's latest record into `run.json`. It is a
copy and never a decision, which is why the orchestrator can run it without certifying
anyone's gate. Without it every gate reads `pending` and no blocked entry ever becomes due.
The orchestrator records one gate itself, `run-closure`, and never writes a result into a
gate another role owns, even when that role is blocked and the outcome looks certain.

Three gates are certified by the role that produced the work: `design-authority` by
tech-architect over its own ADR, `copy` by ux-writer over its own strings, and `release` by
release-engineer over its own release. Each is checked downstream instead. peer-reviewer and
engineering-lead check the ADR, ux-auditor and qc-engineer check the strings, and the
post-release smoke check tests the release. Every run report names this, so the Product Lead
sees it each time.

## The five-step loop

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="../assets/loop-dark.svg">
  <img src="../assets/loop-light.svg" alt="The five-step loop: plan, audit the plan, execute, review and hand off, with review returning to execute for a fix and hand off passing to the next role" width="100%">
</picture>

Every agent runs the same loop on every task, the orchestrator included. The loop is what lets
anyone inspect a run afterwards without reading a transcript.

| # | Step | What it leaves |
|---|---|---|
| 1 | Plan | `<agent>/plan.md`: the task in one sentence, every input, the `PROJECT.md` facts it needs by section, the tools and whether each answered, the assumptions, acceptance criteria someone else could verify, what is out of scope, and the rules that constrain the work |
| 2 | Audit the plan | Appended to `plan.md` under a heading that starts with Audit: written answers to five questions, and a table of what changed |
| 3 | Execute | The work, wherever it lives. A departure from the plan is written into the plan. |
| 4 | Review | `<agent>/review.md`: the output checked against the plan's criteria, the brand spec where a person will see it, and the role's definition of done. Self-checks and sub-gates go here. |
| 5 | Hand off | The handoff record the orchestrator routes on |

The audit happens before any work, and asks five questions. What is missing from the plan?
What did I assume without checking? Which rule could this break? What would the downstream
agent reject? What is the failure mode nobody has named yet? A plan that comes through its
audit with no revisions is suspicious, so the agent says whether the task was trivial or the
audit was for show.

The utilisation check looks for a non-empty `plan.md` with an Audit heading and a non-empty
`review.md` in every agent's folder, and raises `LOOP_SKIPPED` without them. An agent that
runs more than once in a run keeps one `plan.md` and one `review.md`, and each later pass
appends its own section with its own audit. The blank forms are in
[.devteam/TEMPLATE/](../.devteam/TEMPLATE/).

## Handoffs

Step 5 writes a JSON record. The orchestrator routes on it and the utilisation check reads it,
so the key names are fixed. The blank form, with a note on every field, is
[.devteam/TEMPLATE/handoff.json](../.devteam/TEMPLATE/handoff.json).

| Key | Holds |
|---|---|
| `run` | The run id, the same for every agent in the run |
| `agent` | The agent's name, matching its file and its folder in the run |
| `stage` | The stage of the plan entry this handoff answers, as a number |
| `status` | `passed`, `blocked`, `rejected` or `escalated`, and nothing else |
| `started`, `finished` | ISO 8601 UTC times from the shell, with `started` at or before `finished` |
| `consumed` | Every path the agent actually read. This is how the orchestrator proves an upstream role was used. |
| `produced` | Every path it wrote, each on disk and non-empty |
| `gates` | Only a gate it owns, with `result` and `evidence`. Empty when it owns none. |
| `blockers` | `{ "what", "why", "needs" }`: the defect or gap (with the round number on a rejection), why it blocks, and the agent that must act, or `product-lead` |
| `missing_inputs` | An input that never arrived, or a fact `PROJECT.md` did not hold, written as `PROJECT.md § <section>: <the missing fact>` |
| `machinery_findings` | A defect in the team's own files: an agent, a skill, a template or a script, named |
| `decisions_for_product_lead` | `{ "question", "options", "recommendation" }`, never a bare question |
| `next` | On a pass, the agent that runs next. On anything else, `orchestrator`. `product-lead` where the next move is theirs. `null` only in the orchestrator's closing handoff. |

A blocked or rejected handoff is still written. Silence is the one status the orchestrator
cannot act on. A missing tool or an MCP server that does not answer is `blocked`, with the tool
and the exact error named, and never faked.

### Handoff file names

A handoff is never overwritten. Each pass writes its own file, so every earlier record, and
every `consumed` entry that points at it, stays true.

| The pass | File | `stage` key |
|---|---|---|
| An agent's first handoff in the run | `handoff.json` | The stage of the plan entry it answers |
| Its first handoff for a later plan entry | `handoff-stage<N>.json` | N |
| A repeat pass at the same stage: a fix round, a re-review, a re-audit | `handoff-stage<N>-round<R>.json` | N |
| The orchestrator at run open | `orchestrator/handoff.json` | 0 |
| The orchestrator after stage N completes | `orchestrator/handoff-stage<N>.json` | N |
| The orchestrator when a fix round completes stage N again | `orchestrator/handoff-stage<N>-round<R>.json` | N |

N is always the stage of the plan entry the pass answers, never the stage of the role that
sent the work back, so backend-engineer's fix after a stage 6 review is
`backend-engineer/handoff-stage2-round2.json`. The first pass at a stage is round 1 and carries
no suffix, so the first repeat is `round2`. In a full run, bug-historian writes `handoff.json`,
`handoff-stage7.json` and `handoff-stage12.json`. The check compares the stage in a file name
with the file's `stage` key and raises `MALFORMED_HANDOFF` when they differ.

The orchestrator opens the run before stage 1, so its first handoff carries stage 0, cites the
toolchain pre-flight and names `bug-historian` in `next`. It writes one more at every stage
boundary, and its last, for the final stage in the plan, carries `run-closure`.

## Routing

Only the orchestrator dispatches. Every other agent runs with the Agent tool disallowed, so
none of them dispatches, re-runs or rejects directly to another. A dispatch has to land in the
ledger and in the utilisation check, and one made by any other role would land in neither and
read afterwards as a skipped gate.

An agent sends work forward with `next`. It sends work back, or asks for someone's help, with a
`blockers` entry whose `needs` names the agent. Every handoff returns to the orchestrator, which
reads `status`, `next` and `blockers[].needs` every time and acts on the first row that matches.

| The handoff says | The orchestrator |
|---|---|
| `next` or any `blockers[].needs` is `product-lead` | Puts the decision to the Product Lead, logs an `escalation` line, and holds only the work that depends on the answer |
| `status: rejected`, `next: orchestrator`, and `needs` names an agent | Treats it as a reject. Re-dispatches each agent named in `needs` with the blocker quoted and the round number, logs a `reject` line, and re-dispatches the rejecting role for its next round once the fix hands off. |
| `status: blocked`, and `needs` names an agent | Dispatches that agent for exactly what the blocker says, then re-dispatches the blocked role with the answer |
| `status: blocked`, with `missing_inputs` naming a `PROJECT.md` section | Asks the Product Lead for the fact, writes it into the section, logs it and re-dispatches |
| `status: escalated`, with `decisions_for_product_lead` | Puts each decision to the Product Lead as written, options and recommendation included, and never answers one itself |
| `status: passed`, and `next` names an agent | Syncs the gates and dispatches that agent when its plan entry is due, not before |

So a reject always has the same shape: `status` rejected, `next` set to `orchestrator`, and the
role that owns the fix in `blockers[].needs`. The rejecting role never dispatches the fix
itself. `product-lead` is a valid value in `next` and in `needs`, and either way the question
reaches the Product Lead through the orchestrator, which logs the answer. On a pass, `next`
says where the work goes, and the plan and the gates say when.

Whatever the status, the orchestrator logs every entry in `machinery_findings`. bug-historian
carries them into the register at stage 12, and one that breaks the current plan becomes an
amendment straight away.

## Rejection loops and escalation

A downstream role that receives bad input sends it back rather than working around it. A
rejection states four things: what is wrong or missing, with the file and line where there is
one; why it blocks, specifically; what is needed to proceed; and the round number. "The brief
does not say what the export returns for a month with no invoices" is a rejection. "The brief
is unclear" is too vague to act on.

Rounds are counted between the same two roles on the same finding. The round number sits in
`blockers[].what` and in the file name of every repeat pass, so the ledger and the file tree
agree on where the run is.

| Signal | Threshold | What happens |
|---|---|---|
| A rejection | Each one, from round 1 | Routed as above, to the role in `needs` |
| `REJECTION_LOOP` | The third rejection between the same two roles on the same finding | The orchestrator stops, dispatches no fourth round, and escalates with both positions and its recommendation |
| Ping-pong | Two roles each rejecting to the other, on any finding | Usually the contract between them is wrong. It goes to tech-architect, or to the Product Lead when it is a scope question. |
| `STALLED` | A dispatched agent with no handoff and no blocker for two stages | The orchestrator asks for its status. With no `plan.md` either, it never started, and is dispatched again. |
| Silent scope narrowing | A handoff whose `produced` covers less than its brief asked for, with no blocker to explain it | Rejected back, naming the missing part |

Any role escalates to the Product Lead, named in `PROJECT.md § Product Lead`, when:

- the work would change scope
- a brand spec rule would have to break
- two gates disagree
- the same rejection has run three rounds
- the work would break a rule in `PROJECT.md § Product invariants`, or the claim in
  `PROJECT.md § Product`
- an action is irreversible or outward-facing and not yet authorised for the run
- a tool is missing or an MCP server is not authorised
- a fact is missing from `PROJECT.md`

The orchestrator adds two of its own: a deadline at risk where the only remedy offered is
cutting a gate, and a defect pattern that bug-historian reports at its third occurrence.

Every escalation carries a question, the options and a recommendation, in
`decisions_for_product_lead`:

```json
{
  "question": "Should the invoice export include draft invoices, or only sent ones?",
  "options": [
    "Sent only. Matches what the account owner has billed, but a month with only drafts exports an empty file.",
    "Sent and drafts, with a status column. Complete, but a draft total can change after the file is taken."
  ],
  "recommendation": "Sent only. The export is a record of what was billed, and a file whose totals can change later is worse than one that is empty."
}
```

While a decision is pending, the run stays open and any work that does not depend on the answer
carries on. Silence is never read as approval. When the Product Lead answers, the orchestrator
appends a `decision` line that quotes their words. An acceptance, such as a waived finding, an
accepted risk or a carried defect, is logged the same way, and every role that relies on it
cites that line. An acceptance that exists only in conversation did not happen.

## The ledger

`ledger.md` in the run folder is the run's event log. It is append-only, and the orchestrator is
its only writer: other roles ask for a line in their handoff. A line is never edited, reordered
or deleted, and a mistake is put right by appending a `correction` line. Every timestamp comes
from the shell, with `date -u +%Y-%m-%dT%H:%M:%SZ`.

```markdown
# Ledger · 2026-10-01-invoice-export

Append-only. Correct an entry by appending a correction, never by editing history.
Every timestamp is taken from the shell with `date -u +%Y-%m-%dT%H:%M:%SZ`.

| Time (UTC) | Event | Agent | Detail |
|---|---|---|---|
| 2026-10-01T08:02:11Z | run opened | orchestrator | invoice export as CSV · 18 plan entries across 15 agents · 12 gates · ships true |
| 2026-10-01T08:04:05Z | dispatch | bug-historian | stage 1 · regression brief · writes handoff.json |
| 2026-10-01T08:52:41Z | gate | tech-architect | design-authority pass · tech-architect/adr-0007-invoice-export.md |
| 2026-10-01T11:20:04Z | reject | code-analyst | needs backend-engineer · round 1 · "unbounded query on the export endpoint" |
| 2026-10-01T11:20:30Z | dispatch | backend-engineer | stage 2 · fix round 2 · writes handoff-stage2-round2.json |
```

The event names are fixed, so a search for one finds every instance.

| Event | Detail carries |
|---|---|
| `run opened` | The brief in a few words, the number of plan entries and gates, and `ships` |
| `kickoff` | The `PROJECT.md` sections filled in this session, and any stack pack setup |
| `toolchain pre-flight` | What answered, what did not, and the evidence path |
| `dispatch` | Stage, task, the handoff file the agent will write, and the round after the first |
| `handoff` | Status, any gate and its result, `next`, the stage and the handoff file |
| `sync` | What `sync-gates.mjs` applied and what it refused |
| `gate` | The gate, its result and its evidence path, as the sync copied them |
| `utilisation check` | The stage it followed, the finding codes and their count, the entries due now, and the evidence path |
| `reject` | Who must fix it, the round, and the blocker or finding code, quoted |
| `escalation` | What went to the Product Lead, and from which handoff |
| `decision` | An answer or an acceptance, the question it settles, the option chosen, and the Product Lead's words verbatim |
| `amendment` | The plan entry appended or expanded, and why |
| `correction` | The line corrected, by its timestamp, and what was wrong with it |
| `run closed` | The final check result, `run-closure` and its evidence, and the report path |

`run.json` changes little once the run is open. The plan grows only by appending an entry with
an `amendment` line. `gates[].result` and `gates[].evidence` are written by `sync-gates.mjs`
alone, and the orchestrator appends to `utilisation`.

## The utilisation check

The check answers the question the orchestrator exists to ask: did every agent that should have
run actually run, and was every agent that ran actually used?

After every handoff it reads, the orchestrator syncs the gates, so a gate that has just passed
can open the next entry. After every stage completes, and at close, it runs the pair in this
order:

```bash
node .devteam/bin/sync-gates.mjs .devteam/runs/<run-id>
node .devteam/bin/utilisation-check.mjs .devteam/runs/<run-id> --json
```

The check reads the plan and the handoffs, never the ledger, and never writes. It exits 0 with
no findings, 1 with one or more, and 2 when `run.json` is missing or does not parse, and
`run-closure` depends on the 0. Each `--json` result is saved to
`evidence/utilisation/after-stage-<N>.json`, or `after-stage-<N>-round<R>.json` for a second
run after the same stage, and a summary is appended to `run.json` `utilisation`. You can run it
yourself at any time, since it changes nothing.

These twelve codes are its whole vocabulary.

| Finding | Raised when |
|---|---|
| `PLACEHOLDER_IN_PLAN` | A path in a plan entry's `consumes` or `produces` still holds text in angle brackets, or `NNNN` |
| `NEVER_RAN` | A planned pass has no handoff, and a planned entry that consumes its output has handed off, or the run is closing |
| `MALFORMED_HANDOFF` | A handoff does not parse, has a status outside the four, an agent or stage key that is missing or wrong, a stage that differs from its file name or the plan, or a gate result other than pass or fail; or it sits in a folder the plan does not name |
| `PHANTOM_OUTPUT` | A path in `produced` is missing, or is an empty file or folder |
| `UNUSED_OUTPUT` | Every planned reader of an output has handed off and none lists it in `consumed` |
| `FALSE_CONSUMPTION` | A path in `consumed` does not exist |
| `GATE_UNRESOLVED` | A pass has no evidence path or one that does not exist, a gate's owner is not planned, `run.json` shows a result no owner recorded, or a gate still reads `pending` after its owner handed off |
| `GATE_SELF_CERTIFIED` | A handoff records a gate another agent owns |
| `GATE_SKIPPED` | A pass ran while a gate in its `blocked_by` read anything but pass |
| `UNKNOWN_GATE` | A `blocked_by` or a handoff's `gates[]` names a gate that is not in `run.json` |
| `LOOP_SKIPPED` | The agent's folder has no non-empty `plan.md` with an Audit heading, or no non-empty `review.md` |
| `NO_TIMING` | `started` or `finished` is missing or not an ISO 8601 time, or `started` is after `finished` |

`evidence/`, handoff files, `plan.md`, `review.md` and the outputs of the last stage in the plan
are exempt from `UNUSED_OUTPUT`.

### What pending means

The check keeps work that has not run yet apart from work that failed. Beside its findings it
prints a pending list, headed "Pending, not findings" in the report and returned as `pending` in
the `--json` output. An item lands there for one of three reasons:

- Its entry is waiting on a gate that has not passed or an input that is not yet on disk, and
  the line names what it waits on.
- Its entry is due now: the gates pass, the inputs are on disk, and there is no handoff yet. The
  script cannot see a dispatch, because it never reads the ledger, so it lists the entry for the
  orchestrator to dispatch. Finishing one stage always makes part of the next one due, so a
  healthy run shows this at every stage boundary.
- It is an output whose planned reader has not handed off yet.

The script labels these `PENDING` internally, and the label is not one of the twelve codes. A
pending item never makes the result unclean, and a healthy run half-way through exits 0 with a
pending list. A due entry turns into `NEVER_RAN` only once the run has moved past it: a planned
entry that consumes its output hands off without it, or the orchestrator records `run-closure`.

### Conditions the orchestrator judges

Four conditions live in the ledger and the file tree, which the script does not read. The
orchestrator judges them at the same moments it runs the script.

| Code | Means |
|---|---|
| `STALLED` | A dispatched agent with no handoff and no blocker for two stages, or work waiting on an agent that was never dispatched |
| `REJECTION_LOOP` | The same agent rejected by the same source three times on the same finding |
| `IDLE_AGENT` | An entry the check listed as due now, with no `dispatch` line since |
| `ORPHAN_EVIDENCE` | A file in `evidence/` that no handoff cites, which usually means a test ran and nobody read its result |

Any finding blocks the run. The fix goes to the agent that caused it, with a `reject` line naming
the finding code, and the pair runs again once the fix hands off. A finding is never cleared by
editing the thing it points at. The orchestrator writes each result to `orchestrator/review.md`
as a table with one row per planned entry, not only the failures, so a missing row is itself
visible.

## Kickoff and the toolchain pre-flight

A run opens in six steps, and nothing is dispatched until the last one.

| # | Step | Ledger line |
|---|---|---|
| 1 | Kickoff, only while `PROJECT.md` carries a `TODO:` outside its worked example. No run folder exists yet. | Written at step 2 |
| 2 | Create the run folder and `ledger.md` | `run opened`, then `kickoff` naming the sections filled in this session, when there were any |
| 3 | Run the toolchain pre-flight and write it to `evidence/toolchain-preflight.log` | `toolchain pre-flight` |
| 4 | Write `run.json` from the template, right-sized and with every placeholder expanded, and `orchestrator/plan.md` with its `## Audit` | Cited in the step 5 line |
| 5 | Write `orchestrator/handoff.json` with `stage` 0 and `next` set to `bug-historian` | `handoff` |
| 6 | Dispatch bug-historian, before any other agent plans | `dispatch` |

At kickoff the orchestrator interviews the Product Lead about the twelve `PROJECT.md` sections,
one at a time and in their shipped order. It offers the default where a section has one, writes
each answer in place of its marker, reads it back, and never renames a heading, because every
agent finds its facts by heading. When a stack pack is named, it runs that pack's setup
section. A session that cannot put questions to the Product Lead stops before opening the run
and lists the sections still marked `TODO:`. [GETTING-STARTED.md](GETTING-STARTED.md#kickoff)
walks through each section from your side.

The pre-flight proves the tools are there before any role relies on them.

| Check | Command or call | Source |
|---|---|---|
| git | `git --version` | The core, always checked |
| node | `node --version` | The core, always checked |
| Each tool `PROJECT.md § Toolchain` lists as present | Its version command | The project profile |
| The Playwright MCP server, when `PROJECT.md § Toolchain` lists it | `claude mcp list`, whose `playwright:` line ends `Connected` when it answers | The team's `.mcp.json` |
| Whatever the stack pack's pre-flight asks for | As its `SKILL.md` states | The pack in `PROJECT.md § Stack pack`, read by path |

For [stack-nextjs-supabase](../.claude/skills/stack-nextjs-supabase/SKILL.md) that last row is
`npm --version`, `npx --version`, `npm ls @electric-sql/pglite` at the project root, and one
`list_tables` call through the Supabase MCP. That one read is the only call the orchestrator
ever makes through a project's MCP server. `claude mcp list` makes none, and no entry waits on
the Playwright server, because gate evidence comes from the suite.

| Result | What happens |
|---|---|
| Everything answers | Dispatch as planned |
| git or node is missing | The run stops and escalates. No stage can run. |
| A tool the Toolchain section lists is missing | Escalate, and plan no stage that needs it until a re-run of the check answers |
| A check the stack pack lists fails | Do what the pack's table says for that row, and escalate where it says so |
| An MCP server does not answer | `<server> MCP not authorised` goes into the ledger and into the stage 0 handoff's `blockers`, with `needs` set to `product-lead`, who authorises it with `/mcp`. Entries that need the server wait; every other entry is dispatched. |

The orchestrator decides at planning time which plan entries need which server, and writes that
list in `orchestrator/plan.md`. Opening a run is work with a standard, but it is not a gate, so it
never appears in `gates[]`.

## Closing and the run report

A run closes only when every line below is true.

- Every entry in the plan has a handoff on disk for its pass.
- Every path in every `produced` exists and is non-empty, and every output meant for another
  role appears in a later agent's `consumed`.
- Every gate in `run.json` reads pass, recorded by its owner, with evidence that exists.
- No blocker is open, no decision for the Product Lead is unanswered, and every answer and
  acceptance they gave has its own `decision` line.
- release-engineer has handed off against `PROJECT.md § Release`, a target or
  `deferred: no target chosen`, or `ships` is false and release-engineer is in `omitted` with its
  reason.
- The pair has run after the final handoff, and the check exits 0.
- `orchestrator/report.md` is written and addressed to the Product Lead.

Then, in order, the orchestrator writes the report, writes its closing handoff with
`run-closure` in `gates[]`, the report as its evidence and `next` set to `null`, runs the pair
once more so `run.json` reads `run-closure: pass`, and appends the `run closed` line. From that
point every planned pass without a handoff is `NEVER_RAN`, whether or not it was ever due.

The report is plain and specific, with no summary language. In order, it holds: what changed, in
one paragraph; each agent, what it produced, and its gate result with the evidence path; the
roles in `omitted` and why; the final utilisation table; the three gates certified by their
producer and where each was checked downstream; every acceptance the Product Lead gave in the
run, with its ledger line; every carried threshold breach engineering-lead accepted; what was
left undone and why; what is knowingly untested and the risk it carries; and every decision that
needs the Product Lead, with options and a recommendation. [GETTING-STARTED.md](GETTING-STARTED.md#reading-the-run-report)
says how to read it.

Accepting the run is the Product Lead's decision alone, and it is recorded like every other: a
`decision` line in the ledger that quotes their words.

---

[Back to the README](../README.md) · [Getting started](GETTING-STARTED.md) · [Skills](SKILLS.md)
