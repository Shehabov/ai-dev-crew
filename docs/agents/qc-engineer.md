<p><img src="../../assets/agents/qc-engineer.svg" alt="qc-engineer, Tests the product and keeps the evidence" width="100%"></p>

# qc-engineer

The qc-engineer is the first role to meet the product the way its users do, rather than as a
diff: on the devices `PROJECT.md § Quality bar` names, at the narrowest width, in every locale
and on a slow connection. It tests the API contract, every product invariant, the guarded
state transitions and the real flows, and it keeps a file behind every result. A change can
pass four reviews and an integration gate and still fail the person holding the phone, and
this is where the team finds out. It decides whether a change is evidenced as working. It
never fixes code and never certifies the release.

## When it runs

- Stage 9, after every change without exception, cosmetic ones included.
- It starts only when the `engineering` gate reads pass. Work that arrives without it goes back
  unread.
- It runs again after every fix for a defect it filed, re-testing those defects and the
  regression around them. Each re-test round writes `handoff-stage9-round<R>.json`.
- It is also dispatched when a defect report needs reproducing and triaging.

## What it reads

| Input | Why |
|---|---|
| `.devteam/runs/<run-id>/engineering-lead/verdict.md` | The gate result, the touched-surface list and the build to test |
| `.devteam/runs/<run-id>/bug-historian/brief.md` and the `BUGS.md` entries it names | The regression list for these surfaces |
| The ADR, `tech-architect/brief-backend.md` and `brief-frontend.md` | The API contract and the guarded transitions it tests against |
| `backend-engineer/files.md` and `frontend-engineer/files.md` | What changed, and how to run it |
| `ux-writer/strings-<locale>.json` and `ux-auditor/findings.md` | Every locale it must render, and the design findings already closed |
| `PROJECT.md` sections Product, Product invariants, Quality bar, Locales, Brand, Stack pack, Stack, Commands, Toolchain | The promises it tests, the widths and devices, the locales, the commands and the tools it may assume |
| The stack pack and the brand spec | How each suite reaches the product on this stack, and the measurable design facts it checks |

## What it writes

| Output | What it holds |
|---|---|
| `qc-engineer/test-log.md` | Every case run: id, surface, expected, actual, evidence path and where it ran |
| `qc-engineer/defects.md` | Every defect with numbered steps, expected, actual, evidence, locale, width, device, severity, owner and whether it is a regression. Written even when empty, with the count of cases run |
| `qc-engineer/plan.md`, `review.md`, `handoff.json` | Its five-step loop, on disk |
| `evidence/qc/` | Every capture, request and response, at the area paths the orchestrator fixed in `run.json`, named to say what it proves, timestamped from the shell. qc-lead writes its own probes under `evidence/qc-lead/` |

Run paths sit under `.devteam/runs/<run-id>/`.

## Its gate

It owns no gate. Its exit condition is the entry condition to the qc-lead's `quality` gate, and
it records that self-check in `review.md`, never in `gates[]`. The condition holds when every
endpoint is exercised with its negative cases, every invariant in scope passes at the lowest
layer that holds it and on the real target with no skips, every illegal transition is refused,
every flow completes at the narrowest width on a mobile profile, every locale and theme renders,
the accessibility and resilience passes ran, contrast is computed rather than estimated, the
regression list is retested, and no defect at critical or high is open.

It says no by filing defects. Any open critical or high defect makes the handoff `rejected`,
with `next` set to `orchestrator` and one `blockers` entry per defect naming its owner in
`needs`. Medium and low defects go to the qc-lead to weigh. Severity is never negotiated down to
unblock a release. It escalates to the Product Lead when an invariant's fix would change what
the product promises, when it and the engineering-lead still disagree about a defect after one
exchange, when the same defect returns a third time, or when a whole surface cannot be tested.

## How it works

1. Plan. It writes the change in one sentence, every endpoint with its negative cases, the
   invariants in scope by number, the transitions, the flows with a device and locale for
   each, the cross-cutting matrix, and a regression list taken from the engineering-lead and
   bug-historian, never invented.
2. Audit the plan. It looks for an endpoint with only its happy path, an invariant assumed
   untouched, a transition tested one way, a resized desktop window standing in for a phone,
   and a right-to-left locale planned as a checkbox rather than a pass.
3. Execute. It runs the suites in a fixed order, because a failure in one makes the next
   untrustworthy: API contract, product invariants, state transitions, product flows,
   cross-cutting, regression. It captures as it goes, never afterwards.
4. Review. It walks the plan line by line, opens three evidence files at random to confirm
   they show what the log claims, and states plainly what it could not test.
5. Hand off. It sets `next` to `qc-lead` on a pass, or routes open defects to their owners
   through the orchestrator.

## Skills and tools

- [team-protocol](../../.claude/skills/team-protocol/SKILL.md)
- [team-test-protocol](../../.claude/skills/team-test-protocol/SKILL.md)
- [team-brand-guard](../../.claude/skills/team-brand-guard/SKILL.md)
- [team-design-system](../../.claude/skills/team-design-system/SKILL.md)

The stack pack is read by path at step 1, never preloaded. Tools: every tool and MCP server
the project connects, except `Agent`, because only the orchestrator dispatches.

## Works with

- Upstream: [orchestrator](./orchestrator.md), [engineering-lead](./engineering-lead.md),
  whose gate it waits on, [tech-architect](./tech-architect.md),
  [bug-historian](./bug-historian.md), [backend-engineer](./backend-engineer.md),
  [frontend-engineer](./frontend-engineer.md), [ux-writer](./ux-writer.md) and
  [ux-auditor](./ux-auditor.md).
- Downstream: [qc-lead](./qc-lead.md), which audits its evidence, the engineers who own the
  defects it files, and [bug-historian](./bug-historian.md), whose record pass reads
  `defects.md`.

[Read the definition](../../.claude/agents/qc-engineer.md)

---

[Previous: engineering-lead](./engineering-lead.md) · [Back to the team](../../README.md#the-team) · [Next: qc-lead](./qc-lead.md)
