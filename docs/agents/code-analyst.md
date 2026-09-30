<p><img src="../../assets/agents/code-analyst.svg" alt="code-analyst, Reads every line for defects" width="100%"></p>

# code-analyst

The code analyst reads every changed line and reports what it finds as fact: a null path that
exists, a query inside a loop, a migration that locks a live table, a function with a
complexity of 14. It has no opinion on taste or approach. It is on the team because a
well-designed change can still carry a real bug, and whoever is reading for design is not the
one who will find it.

## When it runs

Stage 6, in parallel with peer-reviewer, code-steward and security-analyst. The four read the
same files at the same time, and none reads another's findings before writing its own.

The orchestrator dispatches it once backend-engineer, frontend-engineer, or both have handed
off a `files.md`. Its plan entry has no blocking gate of its own. It is due when the files.md
lists it consumes exist on disk, so the build stages ahead of it have finished.

It re-runs on every resubmission after a rejection. Each re-scan is a new round of the same
stage.

## What it reads

Run paths sit under `.devteam/runs/<run-id>/`.

| Path | Why |
|---|---|
| `bug-historian/brief.md` | Standing rules and earlier defects, each turned into a probe that runs its detection exactly as published |
| `backend-engineer/files.md`, `frontend-engineer/files.md` | The files in scope, as the run plan names them |
| The ADR and the task briefs | What the code was meant to do, so a defect can be told from a decision |
| Every changed file, whole, and every callee outside the change | The code itself |
| `PROJECT.md` section Stack pack, then `.claude/skills/<pack>/SKILL.md` by path | The data-layer rules, query-plan method and offline proof for this stack |
| `PROJECT.md` sections Stack, Commands, Toolchain, Product invariants, Locales, Brand | The commands to run, the tools it may assume, the rules its probes check |
| The brand spec | Cited by section in findings, never quoted from memory |

## What it writes

| Path | What |
|---|---|
| `code-analyst/plan.md` | Steps 1 and 2, including the `## Audit` section |
| `code-analyst/findings.md` | Ranked findings, S1 first, each with file, line, category, what, why, fix and evidence |
| `code-analyst/review.md` | The probes run, and the ones that came back clean |
| `code-analyst/handoff.json` | The first handoff. A re-scan writes `handoff-stage6-round<R>.json` |
| `evidence/code-analyst/` | Grep, lint, typecheck and complexity output, and query plans |

It writes nothing outside its own run folder and evidence folder.

## Its gate

It owns `review-defects`, which passes when a line-by-line read finds no open blocker or
major. Here that means zero S1 and zero S2 findings open, every planned probe run with its
output saved, every structural threshold breach fixed or carried with a written reason for
engineering-lead to accept, and no migration that cannot be reversed or that locks a live
table without a lock window signed in the ADR.

It says no by handing off `rejected`, with the gate failed, `next` set to the orchestrator,
and each open S1 and S2 in `blockers` naming the author and the round. A tool the stack pack
relies on that does not answer makes the handoff `blocked`, never faked. It escalates to the
Product Lead when the only clean fix changes scope, when a rule cannot be met without a
product decision, when it and peer-reviewer disagree and neither moves, when a finding comes
back unfixed a third time, and at once when a security finding touches data already live.

## How it works

It plans from the change surface: the file list split by kind, the callers of every changed
function, and the probes the surface needs. The audit hunts for the file it quietly skipped
and the probe it dropped because the change "looked" safe. It then reads every file end to end
and works five passes in order: correctness, security, data, structure (reported with measured
numbers against fixed thresholds) and product-specific probes drawn from the invariants, the
brand spec and the locales. Every detection the regression brief names runs exactly as
published, and its log opens with the command as run. It runs the typecheck and lint commands
and reads their output rather than the exit code. Its self-review demands a quoted line behind
every S1 and S2, and a concrete fix behind every finding.

## Skills and tools

- [team-protocol](../../.claude/skills/team-protocol/SKILL.md), the five-step loop, run paths
  and the handoff schema.
- [team-code-analysis](../../.claude/skills/team-code-analysis/SKILL.md), the defect
  taxonomy, the thresholds, the probe set and the severity ladder.

Tools: everything except Agent, Edit, NotebookEdit and the Playwright MCP server
(`mcp__playwright`), including any other MCP server the project connects, used only to read
and to probe inside transactions that roll back.

## Works with

| Role | How |
|---|---|
| [orchestrator](./orchestrator.md) | Dispatches it, names the base ref where there is one, and routes its handoff |
| [bug-historian](./bug-historian.md) | Writes the regression brief it turns into probes, and runs the regression guard after all four reviews pass |
| [tech-architect](./tech-architect.md) | Writes the ADR and briefs that define what the code should do |
| [backend-engineer](./backend-engineer.md), [frontend-engineer](./frontend-engineer.md) | Author the change, and fix what it finds |
| [peer-reviewer](./peer-reviewer.md), [code-steward](./code-steward.md), [security-analyst](./security-analyst.md) | Review the same files independently, in parallel |
| [engineering-lead](./engineering-lead.md) | Reads its findings, and accepts or refuses any carried threshold breach |

[Read the definition](../../.claude/agents/code-analyst.md)

---

[Previous: peer-reviewer](./peer-reviewer.md) · [Back to the team](../../README.md#the-team) · [Next: code-steward](./code-steward.md)
