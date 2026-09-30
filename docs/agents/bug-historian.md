<p><img src="../../assets/agents/bug-historian.svg" alt="bug-historian, Remembers every mistake so it is not repeated" width="100%"></p>

# bug-historian

The bug historian is the team's memory. It keeps the record of everything that has gone
wrong on the product, and makes sure none of it goes wrong again. It owns `BUGS.md` and is
the only agent that writes to it. Its outlook rests on one idea: a repeated defect is worse
than a new one, because a new defect means something was hard, and a repeat means the
register was written and nobody read it. It never fixes a defect, and it leaves the hunt for
new ones to code-analyst.

## When it runs

Three times in every run that changes code, each pass dispatched by the orchestrator.

| Pass | Stage | What must be true first |
|---|---|---|
| Brief | 1, first of all, ahead of tech-architect | `run.json` exists. No gate blocks it. |
| Guard | 7, after the four reviews | `review-judgement`, `review-defects`, `review-readability` and `security` read pass |
| Record | 12, the last stage | `release` reads pass, or `quality` when the run does not ship |

It also runs, in a run of its own, when the Product Lead or a quality role raises a defect
outside a run.

## What it reads

Run paths sit under `.devteam/runs/<run-id>/`.

| Path | Why |
|---|---|
| `BUGS.md`, in full, never by search alone | Patterns live across entries rather than inside one |
| `run.json` and the brief | The surfaces this change touches and the agents that are planned |
| `PROJECT.md` sections Stack, Commands, Toolchain, Stack pack | So every detection command runs on this project |
| `PROJECT.md § Product invariants` and the architecture of record | To classify a defect by its real class |
| `bug-historian/brief.md`, the builders' `files.md`, the diff | At the guard, what to check and what changed |
| `qc-engineer/defects.md`, `qc-lead/readiness.md`, its own `guard.md` | At the record, the defects this run raised |
| Every handoff's `blockers`, `machinery_findings` and rejections, and `orchestrator/review.md` | At the record, the agent mistakes this run made |

## What it writes

| Path | What |
|---|---|
| `BUGS.md` | Entries, standing rules from `SR-13` on, the Open index, findings waiting under Raised and not yet registered, and the repeat offenders table |
| `bug-historian/brief.md` | Standing rules first, then prior defects with detection commands, live patterns, and a named section per agent |
| `bug-historian/guard.md` | One row per briefed entry and one per binding rule, including the ones that held |
| `evidence/regression/<bug-id>.log`, `<rule-id>.log` | Each detection command and its full output |
| `bug-historian/record.md` | Each entry added, updated, promoted or closed, each rule added, and the Open count check |
| `bug-historian/plan.md`, `review.md` | Shared by the three passes, each appending its own section with its own audit |
| `handoff.json`, `handoff-stage7.json`, `handoff-stage12.json` | One per pass, so no pass overwrites another. A guard run again after a fix round writes `handoff-stage7-round<R>.json`, recording `regression-guard` again |

## Its gate

It owns `regression-guard`, which passes when no defect already in `BUGS.md` has been
repeated. That means every known defect on these surfaces was checked by running its
detection command, with the output saved, and none fired; and every standing rule binding
this run was checked, with the check and its result recorded. An unchecked rule is a fail,
exactly as a broken one is. The brief and the record are not gates.

When a detection fires, it records a repeat, fails the gate, and hands off `rejected` with
`next` set to the orchestrator and the agent at fault in `blockers[].needs`, the original
entry quoted. A pattern at its third occurrence goes to the Product Lead as an escalation,
with `next` set to `product-lead`, because at that point the reading of the register has
failed.

## How it works

It plans by reading the register in full and matching entries to this run by surface,
component and class, and by naming the standing rules each planned agent is bound by. Its
audit asks whether the brief is too long to be read or too narrow to catch a defect of the
same class on another path, and whether every detection command runs as written with the
tools `PROJECT.md § Toolchain` lists. At the brief it publishes only what binds this run,
addressed to agents by name. At the guard it runs every detection against the diff and saves
the output. At the record it writes each new entry with the gate that should have caught it,
adds a standing rule where the lesson generalises, closes what was fixed once its detection
has been seen to fire, and rebuilds the Open index from the entries. Its review checks that
nothing was deleted, because entries close and never disappear.

## Skills and tools

- [team-protocol](../../.claude/skills/team-protocol/SKILL.md), the run folder, the handoff
  schema and the file name each later pass writes.
- [team-bug-register](../../.claude/skills/team-bug-register/SKILL.md), the entry format,
  the class taxonomy, the brief format, the guard procedure and the escalation rule.
- [team-architecture](../../.claude/skills/team-architecture/SKILL.md), to classify a defect
  against the invariants and the boundaries.

Tools: every tool and MCP server the project connects, except `Agent`, because only the
orchestrator dispatches, and the Playwright MCP server (`mcp__playwright`), which among the
dispatched roles only qc-engineer and qc-lead hold.

## Works with

| Role | How |
|---|---|
| [orchestrator](./orchestrator.md) | Dispatches all three passes, and routes a failed guard to the agent at fault |
| [tech-architect](./tech-architect.md) | Plans from its brief, first of every role |
| Every planned agent | Lists `brief.md` in its `consumed`, or the utilisation check reports `UNUSED_OUTPUT` |
| [peer-reviewer](./peer-reviewer.md), [code-analyst](./code-analyst.md), [code-steward](./code-steward.md), [security-analyst](./security-analyst.md) | Their four gates open the guard |
| [engineering-lead](./engineering-lead.md) | Reads `guard.md` at the engineering gate |
| [qc-engineer](./qc-engineer.md), [qc-lead](./qc-lead.md) | Report the defects it records at stage 12 |
| [release-engineer](./release-engineer.md) | Its `release` gate opens the record pass |

[Read the definition](../../.claude/agents/bug-historian.md)

---

[Previous: orchestrator](./orchestrator.md) · [Back to the team](../../README.md#the-team) · [Next: tech-architect](./tech-architect.md)
