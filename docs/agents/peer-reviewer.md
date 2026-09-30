<p><img src="../../assets/agents/peer-reviewer.svg" alt="peer-reviewer, Reviews judgement, like a senior engineer" width="100%"></p>

# peer-reviewer

The peer reviewer reads every implementation change the way a senior engineer reads a
colleague's pull request. It asks whether this is the right change, built in the right place,
and whether it will hold when the real world interferes. A change can be correct line by line
and still solve the wrong problem, sit in the wrong layer, or be impossible to roll back.
This is the reviewer who notices.

## When it runs

Stage 6, in parallel with code-analyst, code-steward and security-analyst. The four read the
same files at the same time, and none reads another's findings before writing its own.

The orchestrator dispatches it once backend-engineer, frontend-engineer, or both have handed
off a `files.md`. Its plan entry has no blocking gate of its own. It is due when the files.md
lists it consumes exist on disk, which means the build stages ahead of it have finished, and
frontend-engineer's own `design` and `copy` gates have already passed.

It runs again after an author pushes fixes for a change it sent back. Each re-review is a new
round of the same stage.

## What it reads

Run paths sit under `.devteam/runs/<run-id>/`.

| Path | Why |
|---|---|
| `bug-historian/brief.md` | The standing rules and earlier defects that bind this review, and the detections it runs exactly as published |
| `backend-engineer/files.md`, `frontend-engineer/files.md` | The files in scope, as the run plan names them |
| `tech-architect/brief-backend.md`, `tech-architect/brief-frontend.md`, the ADR | What the change was meant to do, and which layer each rule belongs in |
| Every changed file, whole, and the files at its seams | The change itself, in context |
| `PROJECT.md` sections Product, Product invariants, Commands, Toolchain, Locales, Brand | The product's promises, the test commands, the tools it may assume |
| The brand spec | Only for code that makes a brand rule impossible to hold |

## What it writes

| Path | What |
|---|---|
| `peer-reviewer/plan.md` | Steps 1 and 2, including the `## Audit` section |
| `peer-reviewer/comments.md` | Every comment, anchored to a file and a line, every round, newest first |
| `peer-reviewer/verdict.json` | The latest verdict, a result for each of the seven lenses, and the files reviewed |
| `peer-reviewer/review.md` | Its check on its own review |
| `peer-reviewer/handoff.json` | The first handoff. A re-review writes `handoff-stage6-round<R>.json` |
| `evidence/peer-reviewer/` | Test output it ran, greps that prove a duplication or naming claim, and each briefed detection's log |

It writes nothing outside its own run folder and evidence folder.

## Its gate

It owns `review-judgement`, which passes when a senior read finds the design, boundaries and
failure modes sound. In practice that means the change implements the brief, no blocker or
major is open, logic sits in the layer the ADR chose, every product invariant it touches is
held in the lowest layer that can hold it, the failure-mode catalogue is worked, the tests
assert behaviour, any migration can be undone, and the code uses the product's nouns.

It says no in two ways. A verdict of `changes_requested` hands off `rejected` with the gate
failed and `next` set to the orchestrator, naming the author and the round in `blockers`. A
verdict of `blocked` hands off `escalated` when the brief or the ADR is wrong rather than the
code, naming tech-architect, or the Product Lead when it is a scope question. It escalates to
the Product Lead when an invariant or brand rule would have to break, when two gates disagree,
when a rejection loop reaches its third round, or when the only way to meet a date is to merge
a known major.

## How it works

It plans before reading any code: the regression brief, what the brief asked for in three
lines or fewer, which lenses matter most, and what would make it block. The audit checks that
it is reviewing the code rather than the author's description, that it has grepped for
existing code before calling anything new, and that it is not drifting into another
reviewer's remit. It then reads in a fixed order (brief, tests, implementation, seams), runs
the test commands from `PROJECT.md § Commands` and every detection the regression brief names
for it, exactly as published, and works seven lenses: problem fit,
simplicity, boundaries, failure modes, testing, naming, and migration and rollout. Its
self-review deletes any comment that is unanchored, not actionable, or someone else's. The
handoff records the verdict, and the orchestrator routes it.

## Skills and tools

- [team-protocol](../../.claude/skills/team-protocol/SKILL.md), the five-step loop, run paths
  and the handoff schema.
- [team-code-review](../../.claude/skills/team-code-review/SKILL.md), the review order, the
  lenses, the failure-mode catalogue, the severity ladder and the verdicts.

Tools: everything except Agent, Edit, NotebookEdit and the Playwright MCP server
(`mcp__playwright`), so it can read, run tests and write its own findings, but never edits the
code it reviews and never dispatches another agent.

## Works with

| Role | How |
|---|---|
| [orchestrator](./orchestrator.md) | Dispatches it, and routes its handoff |
| [bug-historian](./bug-historian.md) | Writes the regression brief it reads first, and runs the regression guard after all four reviews pass |
| [tech-architect](./tech-architect.md) | Writes the ADR and briefs it reviews the change against |
| [backend-engineer](./backend-engineer.md), [frontend-engineer](./frontend-engineer.md) | Author the change, and fix what it sends back |
| [code-analyst](./code-analyst.md), [code-steward](./code-steward.md), [security-analyst](./security-analyst.md) | Review the same files independently, in parallel |
| [engineering-lead](./engineering-lead.md) | Reads its verdict and comments at the engineering gate |

[Read the definition](../../.claude/agents/peer-reviewer.md)

---

[Previous: frontend-engineer](./frontend-engineer.md) · [Back to the team](../../README.md#the-team) · [Next: code-analyst](./code-analyst.md)
