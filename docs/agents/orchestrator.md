<p><img src="../../assets/agents/orchestrator.svg" alt="orchestrator, Plans the run and holds every gate" width="100%"></p>

# orchestrator

The orchestrator runs the team, much as a chief of staff would. It turns the Product Lead's
brief into a run plan, dispatches every other agent, holds the gates between stages, and at
the end proves that every planned role ran and that its output was used. It never designs,
codes, reviews or tests. Twelve independent gates are only worth something if one role checks
that each of them held, and writes down who ran, in what order and on what evidence. That
role is the orchestrator.

## When it runs

The orchestrator is the main thread of the session for the whole run, not a stage in the
plan. `.claude/settings.json` makes a plain `claude` session start as the orchestrator, and
`claude --agent orchestrator` starts one explicitly.

- Kickoff, before any run opens, whenever `PROJECT.md` still carries a `TODO:` outside its
  worked example. It interviews the Product Lead one section at a time and writes the
  answers. Where the chosen stack pack needs setup, it does that too.
- Run open, once the profile is complete and there is a brief with a checkable outcome: the
  toolchain pre-flight, then `run.json`, then its own audit of the plan.
- After every handoff, to sync the gates and route the work. After every stage, and at close,
  to run the gate sync and then the utilisation check.

It dispatches bug-historian first, before any other agent plans. An entry is due when every
gate in its `blocked_by` reads pass and every path it consumes is on disk.

## What it reads

| Path | Why |
|---|---|
| The Product Lead's brief | Its words go into `run.json` verbatim, and `done_means` is built from it |
| `PROJECT.md`, in full | Every fact a role needs, cited by section in each dispatch brief |
| `BUGS.md` | The standing rules that bind it, and the entries on the surfaces the brief names |
| `team-orchestration` | The gate table, the ledger format, the finding vocabulary and the report shape |
| `.devteam/runs/*/run.json` and `orchestrator/report.md` | Earlier runs on the same surface |
| `.claude/skills/<pack>/SKILL.md` | The pre-flight and setup sections of the stack pack in `PROJECT.md § Stack pack` |
| Every handoff in the run | `status`, `next` and `blockers[].needs`, which are the whole routing signal |
| The brand spec at `PROJECT.md § Brand` | Section headings to cite in briefs, never values |

## What it writes

Run paths sit under `.devteam/runs/<run-id>/`, or under `DEVTEAM_RUNS_DIR` where that is set.

| Path | What |
|---|---|
| `run.json` | The plan, `omitted` with a reason per role, the gates, and the utilisation history |
| `ledger.md` | Append-only, one line per event, from `run opened` to `run closed`. It is the only writer. |
| `orchestrator/plan.md` | Steps 1 and 2, including which plan entries need which MCP server, and the `## Audit` |
| `orchestrator/review.md` | The utilisation table, one row per planned entry |
| `orchestrator/handoff.json`, `handoff-stage<N>.json` | One at run open, with `stage` 0, then one at every stage boundary, and `handoff-stage<N>-round<R>.json` when a fix round completes a stage again |
| `orchestrator/report.md` | The run report for the Product Lead |
| `evidence/toolchain-preflight.log` | Every pre-flight check, its command and its answer |
| `evidence/utilisation/after-stage-<N>.json` | Each utilisation check result |
| `PROJECT.md`, and `.mcp.json` when a stack pack needs it | Kickoff answers only, headings never renamed |
| `.mcp.json` and `.claude/settings.json`, when the Product Lead declines the Playwright server | Its `playwright` entry and its `enabledMcpjsonServers` item removed together, after asking, and nothing else, which `scripts/check.mjs` passes as a decline |

## Its gate

It owns `run-closure`, which passes when every planned role ran and every output was used.
In practice that means every box in its definition of done is ticked, the final utilisation
check exits 0, and `orchestrator/report.md` is written. It never records a result for a gate
another role owns.

It says no by blocking the run. Any utilisation finding, such as `NEVER_RAN`,
`UNUSED_OUTPUT` or `GATE_SKIPPED`, is logged as a `reject` line and routed to the agent that
caused it, and the pair of scripts runs again after the fix. It rejects a handoff back to
its author naming the finding code or the missing part, and never repairs the artefact
itself. It stops and escalates to the Product Lead when scope would change, a brand rule
would break, two gate owners disagree, a rejection loop reaches its third round, or a tool
or MCP server is missing.

## How it works

It plans from the brief, `PROJECT.md`, `BUGS.md` and earlier runs, runs the toolchain
pre-flight, and writes `run.json` from the template it shares byte for byte with
`team-orchestration`. It right-sizes the plan, keeping only the roles the change needs and
giving each omission a reason, then expands every placeholder: one strings file per locale,
the real ADR number, the named evidence paths. Its audit searches the plan for dangling
gates, unexpanded placeholders and scope decisions it should not make. It executes by
dispatching each entry when it is due, with a twelve-part brief, and routes every handoff by
its `status`, `next` and `blockers[].needs`. A reject arrives as `next: orchestrator` with
the fix owner in `needs`, and `product-lead` in either field goes to the Product Lead. It
reviews with `sync-gates.mjs` then `utilisation-check.mjs`, plus four conditions it judges
from the ledger. It closes with the report and a final clean check.

## Skills and tools

- [team-protocol](../../.claude/skills/team-protocol/SKILL.md), the handoff schema and the
  file names it validates every handoff against.
- [team-orchestration](../../.claude/skills/team-orchestration/SKILL.md), decomposition,
  right-sizing, the ledger and the utilisation check's specification.
- [team-brand-guard](../../.claude/skills/team-brand-guard/SKILL.md), to confirm every
  visible change routes through the roles that enforce the brand spec.

Tools: no `tools` line, so it inherits every tool and MCP server the session has, including
the Agent tool. It is the only role that dispatches.

## Works with

| Role | How |
|---|---|
| The Product Lead | Gives the brief, answers kickoff and every escalation, and receives the report |
| [bug-historian](./bug-historian.md) | Dispatched first at stage 1, again at stage 7 and stage 12 |
| [tech-architect](./tech-architect.md) | Receives the plan, and any contract dispute between two roles |
| Every other role | Dispatched by it, hands back to it, and never dispatches anyone else |

[Read the definition](../../.claude/agents/orchestrator.md)

---

[Previous: release-engineer](./release-engineer.md) · [Back to the team](../../README.md#the-team) · [Next: bug-historian](./bug-historian.md)
