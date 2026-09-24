<p><img src="../../assets/agents/engineering-lead.svg" alt="engineering-lead, Proves it works end to end" width="100%"></p>

# engineering-lead

The engineering lead holds the last engineering gate, and its question is whether the change
works as one product. Before anything reaches qc-engineer, it builds the change from a clean
tree, migrates it, runs it, and drives the feature through the real seam between front end
and back end. Four reviewers can each pass their part in isolation while the whole still
fails: a field renamed on one side, a suite that is green without touching the new code, an
invariant refused only in the interface. The engineering lead checks that the others ran and
that their parts work together. It never fixes the code itself.

## When it runs

Stage 8. The orchestrator dispatches it once five gates read pass: `review-judgement`,
`review-defects`, `review-readability`, `security` and `regression-guard`. That means all
four independent reviews and bug-historian's guard have handed off. A fix it sends back
returns through the reviews and the guard, then through its gate again.

## What it reads

Run paths sit under `.devteam/runs/<run-id>/`.

| Path | Why |
|---|---|
| `peer-reviewer/verdict.json`, `comments.md` | The senior review, and what it left open |
| `code-analyst/findings.md` | Open defects, and every threshold breach carried rather than fixed |
| `code-steward/findings.md`, `security-analyst/findings.md`, `evidence/security/` | The other two reviews |
| `bug-historian/guard.md`, `evidence/regression/` | Proof that no known defect was repeated |
| `tech-architect/holds.md`, the ADR and the briefs | What was decided, and whether the boundaries still hold |
| `backend-engineer/files.md`, `frontend-engineer/files.md` | The files in scope, and the dated reason for each carried breach |
| `PROJECT.md` sections Stack, Commands, Toolchain, Stack pack, Product invariants, Locales, Quality bar, Release, House rules | The commands it runs and the rules the change must keep |
| `.claude/skills/<pack>/SKILL.md` and the brand spec | How this stack migrates and proves its data layer, and the code rules the brand spec sets |

## What it writes

| Path | What |
|---|---|
| `engineering-lead/verdict.md` | The verdict, the sub-check table, ADR conformance, carried breaches decided, regression scope and the residual risk list |
| `evidence/build.log` | Every command or MCP call, in order, with its exit code and full output |
| `evidence/engineering-lead/coverage-map.md` | Each changed file mapped to the tests that execute it |
| `evidence/engineering-lead/e2e.md` and screenshots | The feature driven by hand, step by step |
| `engineering-lead/plan.md`, `review.md`, `handoff.json` | Its loop on disk. A re-verification after a fix writes `handoff-stage8-round<R>.json` |

## Its gate

It owns `engineering`, which passes when the change builds, migrates and runs end to end,
with the log to prove it. `verdict.md` carries thirteen sub-checks, and every one must pass:
the reviews ran, the guard ran, a clean build, a safe data layer, tests that cover the
change, a seam that holds, the feature driven end to end, invariants refused at their layer,
regression scoped, ADR conformance, carried breaches decided, operational readiness, and the
brand's code rules. The sub-checks never go in `gates[]`.

It says no with a reproduction. A rejection hands off `rejected`, with `next` set to the
orchestrator and the single agent who owns the fix in `blockers[].needs`, naming the file,
the line and the expected behaviour. It escalates to the Product Lead when it and qc-lead
disagree on readiness, and whenever the only way to hit a date would be to relax a gate.

## How it works

It plans the exact commands from `PROJECT.md § Commands` and the stack pack, the end-to-end
path it will drive, three to five behaviours most likely to regress, and every carried
breach waiting for a decision. Its audit checks the diff rather than the brief for surfaces
nobody mentioned, and replaces any "reason about it" step with "run it". It executes from a
clean tree in a fixed order (install, typecheck, lint, static checks, data layer forward and
reverse, tests, coverage, build, run), stopping on the first hard failure, then drives the
feature, attacks each invariant at its layer and through the API, and compares the build to
the ADR. It accepts a carried breach only when the reason is written and dated, the breach is
contained, and nothing guarding an invariant or permission sits inside it. It refuses the
rest as rejections. Its review confirms that every verdict follows from captured evidence,
never from the run being late.

## Skills and tools

- [team-protocol](../../.claude/skills/team-protocol/SKILL.md), the run folder, the handoff
  schema and the rejection format.
- [team-code-review](../../.claude/skills/team-code-review/SKILL.md), the standard it applies
  to the seam, and how to phrase a rejection that needs no follow-up question.
- [team-architecture](../../.claude/skills/team-architecture/SKILL.md), for conformance to
  the ADR.
- [team-brand-guard](../../.claude/skills/team-brand-guard/SKILL.md), for the brand rules
  that are code rules.

Tools: every tool and MCP server the project connects, except `Agent`, because only the
orchestrator dispatches.

## Works with

| Role | How |
|---|---|
| [orchestrator](./orchestrator.md) | Dispatches it, and routes its rejections to the fix owner |
| [peer-reviewer](./peer-reviewer.md), [code-analyst](./code-analyst.md), [code-steward](./code-steward.md), [security-analyst](./security-analyst.md) | Their four gates open its stage, and it decides the breaches code-analyst records as carried |
| [bug-historian](./bug-historian.md) | Its regression guard is the fifth gate that opens this stage |
| [tech-architect](./tech-architect.md) | Writes the ADR and the `holds.md` it checks conformance against |
| [backend-engineer](./backend-engineer.md), [frontend-engineer](./frontend-engineer.md) | Own the fixes it sends back |
| [qc-engineer](./qc-engineer.md) | Reads `verdict.md` and tests the residual risks first |
| [qc-lead](./qc-lead.md) | A disagreement on readiness goes to the Product Lead |

[Read the definition](../../.claude/agents/engineering-lead.md)

---

[Previous: security-analyst](./security-analyst.md) · [Back to the team](../../README.md#the-team) · [Next: qc-engineer](./qc-engineer.md)
