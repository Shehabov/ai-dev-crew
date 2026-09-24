# .devteam

The team's shared memory. Every run leaves its working record here, so anyone can inspect a
run afterwards without reading a transcript: who ran, what each role read, what it wrote,
which gates passed and on what evidence.

```
.devteam/
├── README.md                 this file
├── bin/                      the two scripts in the table below, node only
├── TEMPLATE/                 the artefacts every agent writes, as blank templates
│   ├── handoff.json
│   ├── plan.md
│   └── review.md
└── runs/                     gitignored, one folder per run
    └── <run-id>/
```

The rules these files follow are in two skills. The five-step loop, the handoff schema and
the file names are in [`team-protocol`](../.claude/skills/team-protocol/SKILL.md). The run
plan, the gates, routing, the ledger and the utilisation check are in
[`team-orchestration`](../.claude/skills/team-orchestration/SKILL.md), which is the
specification the two scripts implement.

## Where runs live

`.claude/settings.json` sets `DEVTEAM_RUNS_DIR` to `.devteam/runs`. Where the variable points
elsewhere, every run folder sits under it instead, and both scripts resolve a bare run id
there. The run id is `<yyyy-mm-dd>-<short-slug>`, for example `2026-10-01-invoice-export`,
and every agent in the run uses the same one.

Git ignores `runs/`, so evidence files stay out of history. Runs stay on the machine that ran
them and are never deleted. `BUGS.md`, the ADRs in `docs/decisions/` and the release note
carry what matters beyond the run.

## What a run folder holds

```
.devteam/runs/<run-id>/
├── run.json                               the plan, the gates, the utilisation summaries
├── ledger.md                              append-only event log
├── orchestrator/
│   ├── plan.md                            the run plan's reasoning and its Audit
│   ├── review.md                          the utilisation table, one row per plan entry
│   ├── handoff.json                       run open, stage 0
│   ├── handoff-stage<N>.json              after stage N completes
│   └── report.md                          the closing report for the Product Lead
├── <agent>/
│   ├── plan.md                            steps 1 and 2 of the loop
│   ├── review.md                          step 4
│   ├── handoff.json                       step 5, and the name for each later pass below
│   └── <role artefacts>                   ADRs, briefs, specs, findings, verdicts, logs
└── evidence/
    ├── toolchain-preflight.log            the orchestrator's checks at run open
    ├── utilisation/after-stage-<N>.json   each utilisation check, as --json
    └── ...                                build logs, test output, screenshots, traces
```

| Path | Written by | What it is |
|---|---|---|
| `run.json` | orchestrator | The plan every handoff is checked against: `plan`, `omitted`, `gates`, `done_means`, `utilisation`. Written once at open. After that only `gates[].result` and `gates[].evidence` change, written by `sync-gates.mjs`, and `utilisation`, appended by the orchestrator. |
| `ledger.md` | orchestrator | One line per event, never edited. A mistake is put right with a `correction` line. Every Product Lead answer and acceptance has its own `decision` line. |
| `<agent>/plan.md` | each agent | The plan and, under a heading that starts with Audit, the audit of it. Copied from `TEMPLATE/plan.md`. A later pass appends its own section. |
| `<agent>/review.md` | each agent | The self-review, with self-checks and sub-gates in its own table. Copied from `TEMPLATE/review.md`. |
| `<agent>/handoff*.json` | each agent | The record the orchestrator routes on and the check reads. Copied from `TEMPLATE/handoff.json`. |
| `<agent>/<artefacts>` | each agent | The work itself, at the paths the plan names in `produces`. |
| `evidence/` | any agent | Command output with the command at the top, captured responses, screenshots, measured values. A claim without a file here is a blocker, not a pass. |

## Handoff file names

A handoff is never overwritten. Each pass writes its own file, so every earlier record, and
every `consumed` entry that points at it, stays true. The check reads the stage in a file name
and compares it with the file's `stage` key.

| The pass | File | `stage` key |
|---|---|---|
| An agent's first handoff in the run | `handoff.json` | The stage of the plan entry it answers |
| Its first handoff for a later plan entry | `handoff-stage<N>.json` | N |
| A repeat pass at the same stage: a fix round, a re-review, a re-audit | `handoff-stage<N>-round<R>.json` | N |
| The orchestrator at run open | `orchestrator/handoff.json` | 0, because the run opens before stage 1 |
| The orchestrator after stage N completes | `orchestrator/handoff-stage<N>.json` | N |
| The orchestrator when a fix round completes stage N again | `orchestrator/handoff-stage<N>-round<R>.json` | N |

N is always the stage of the plan entry the pass answers, never the stage of the role that
sent the work back: backend-engineer's fix after a stage 6 review is
`backend-engineer/handoff-stage2-round2.json`. The first pass at a stage is round 1 and carries
no suffix, so the first repeat is `round2`. The orchestrator's closing handoff is
`handoff-stage<N>.json` for the last stage in the plan, and it carries `run-closure`.

| Agent | Passes in a full run | Files |
|---|---|---|
| bug-historian | brief at 1, guard at 7, record at 12 | `handoff.json`, `handoff-stage7.json`, `handoff-stage12.json` |
| tech-architect | ADR at 1, architecture holds at 6 | `handoff.json`, `handoff-stage6.json` |
| ux-designer | spec at 2, a fix after the audit | `handoff.json`, `handoff-stage2-round2.json` |
| peer-reviewer | review at 6, a re-review after fixes | `handoff.json`, `handoff-stage6-round2.json` |
| orchestrator | run open, then every completed stage | `handoff.json` (stage 0), `handoff-stage1.json` onward |

## Scripts

Both are plain node with no dependencies, run from the project root. Each takes a run folder
or a bare run id, and `--help` prints its usage and exit codes. The orchestrator runs them
as a pair, the sync first, after every stage and at close:

```bash
node .devteam/bin/sync-gates.mjs .devteam/runs/<run-id>
node .devteam/bin/utilisation-check.mjs .devteam/runs/<run-id> --json
```

| Script | Usage | What it proves | Exit codes | What it reports |
|---|---|---|---|---|
| `bin/sync-gates.mjs` | `node .devteam/bin/sync-gates.mjs <run-dir \| run-id> [--dry-run]` | That `run.json` reads the result each gate's owner recorded, and nothing else. It copies the owner's latest record (by `finished`, then by pass) into `gates[].result` and `gates[].evidence`, and changes no other value. It never decides a gate. `--dry-run` prints what would change and writes nothing. | 0 synced, or nothing to apply. 1 one or more records refused. 2 no `run.json`, or it does not parse. | What it applied, as `gate: was -> now (agent, file)`, and every refusal: a gate name not in `run.json` (`UNKNOWN_GATE`), a record by an agent that does not own the gate (`GATE_SELF_CERTIFIED`), a result that is neither `pass` nor `fail`. Then every gate's current value. |
| `bin/utilisation-check.mjs` | `node .devteam/bin/utilisation-check.mjs <run-dir \| run-id> [--json]` | That every planned pass ran and left the loop's trace, that every output exists and was read by the role after it, that every input was real, and that every gate was resolved by its owner before the work it blocks began. It reads the plan and the handoffs, never the ledger, and never writes. | 0 no findings. 1 one or more findings. 2 no `run.json`, or it does not parse. | Findings, one per line as `CODE: subject: detail`, and a separate pending list (work not yet due, entries due now and waiting for their dispatch, outputs whose reader has not run), which holds no findings. `--json` prints `{ run, findings, pending, clean }`, each finding as `{ code, subject, detail }`. |

The findings the utilisation check raises, and the whole of its vocabulary:

| Finding | Raised when |
|---|---|
| `PLACEHOLDER_IN_PLAN` | A plan entry's `consumes` or `produces` still holds a template placeholder, text in angle brackets or `NNNN` |
| `NEVER_RAN` | A planned pass has no handoff, and a planned entry that reads its output has handed off, or the orchestrator has recorded `run-closure` |
| `MALFORMED_HANDOFF` | A handoff does not parse, has a bad status, agent or stage key, a stage that disagrees with its file name or the plan, a gate result other than pass or fail, or sits in a folder the plan does not name |
| `PHANTOM_OUTPUT` | A path in `produced` is missing or empty |
| `UNUSED_OUTPUT` | Every planned reader of an output has handed off and none consumed it |
| `FALSE_CONSUMPTION` | A path in `consumed` does not exist |
| `GATE_UNRESOLVED` | A pass has no evidence or its evidence is missing, a gate's owner is not planned, `run.json` shows a result no owner recorded, or a gate reads `pending` after its owner handed off |
| `GATE_SELF_CERTIFIED` | A handoff records a gate another agent owns |
| `GATE_SKIPPED` | A pass ran before a gate in its `blocked_by` read pass |
| `UNKNOWN_GATE` | A `blocked_by` or a handoff names a gate that is not in `run.json` |
| `LOOP_SKIPPED` | No `plan.md` with an Audit heading, or no `review.md` |
| `NO_TIMING` | `started` or `finished` is missing or unparseable, or `started` is after `finished` |

Pending is the check's word for work that has not failed: an entry waiting on a gate or an
input, an entry that is due now and waiting for its dispatch, and an output whose reader has
not run yet. A healthy run mid-way exits 0 with a pending list. What each finding asks of the
orchestrator, and the four conditions it judges from the ledger (`STALLED`,
`REJECTION_LOOP`, `IDLE_AGENT`, `ORPHAN_EVIDENCE`), are in
[`team-orchestration`](../.claude/skills/team-orchestration/SKILL.md#the-utilisation-check).

The skill is the specification and the scripts are the implementation. Change one and change
the other in the same commit.

The stack pack's offline database proof lives with the pack, at
[`../.claude/skills/stack-nextjs-supabase/scripts/db-test.mjs`](../.claude/skills/stack-nextjs-supabase/scripts/db-test.mjs),
because only a project on that stack needs it.

## Rules

- An agent that left no handoff did not run, whatever its transcript says.
- Every path in a handoff's `produced` exists on disk and is non-empty. A missing path is
  always a finding.
- Evidence is a file. A sentence saying something passed is not evidence.
- `run.json` and `ledger.md` are the orchestrator's alone. Other roles ask for a ledger line in
  their handoff.
- `ledger.md` is append-only. Correct a line by appending a correction, never by editing
  history.
- Timestamps come from the shell, `date -u +%Y-%m-%dT%H:%M:%SZ`, never from memory.
- A finding is never cleared by editing the thing it points at. The fix goes to the role that
  caused it, and the pair runs again.
