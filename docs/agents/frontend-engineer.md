<p><img src="../../assets/agents/frontend-engineer.svg" alt="frontend-engineer, Builds the interface from the approved spec" width="100%"></p>

# frontend-engineer

The frontend-engineer builds the interface, working from the audited design spec and the
tech-architect's frontend brief on whatever stack `PROJECT.md § Stack` names. It is the only
role that writes the app's source tree, and it builds what the spec says without
reinterpreting it. However sound the data layer is, an interface that breaks in a
right-to-left locale, or stalls on the least capable device in the quality bar, has failed its
readers. It never chooses a colour, a spacing value, a string or a hierarchy. When the spec is
wrong, it sends the defect back to its owner instead of fixing it quietly in code, where no
auditor would see it.

## When it runs

- Stage 5, whenever a change alters something a person sees.
- It starts only when both the `design` and `copy` gates read pass, so the ux-auditor has
  passed the spec and every string exists in every locale.
- It runs again whenever a reviewer, bug-historian, engineering-lead, qc-engineer or qc-lead
  rejects front-end code to it. Each fix round writes `handoff-stage5-round<R>.json`.

## What it reads

| Input | Why |
|---|---|
| `PROJECT.md` sections Product, Quality bar, Locales, Brand, Product invariants, Stack pack, Stack, Commands, Toolchain | The readers and their devices, the widths and accessibility standard, the locales and which are right to left, the brand spec path, the rules a screen must show, and the commands it may run |
| The stack pack, at `.claude/skills/<pack>/SKILL.md` | Read by path at step 1: where the app lives, how to create it, the scripts it owns, where generated types and client configuration come from |
| The brand spec and its generated tokens | Every value it may use, consumed by name and never copied |
| `.devteam/runs/<run-id>/bug-historian/brief.md` | What has already broken on these surfaces |
| `.devteam/runs/<run-id>/tech-architect/brief-frontend.md` and the ADR | Routes, data contracts, error shapes, pagination, the performance budget, acceptance criteria |
| `.devteam/runs/<run-id>/ux-designer/spec.md` | Every state, token names, target sizes, focus order, right-to-left notes |
| `.devteam/runs/<run-id>/ux-writer/strings-<locale>.json` | One keyed strings file per locale |
| `.devteam/runs/<run-id>/backend-engineer/files.md` | The endpoints built in this run, when the change calls them |

## What it writes

| Output | What it holds |
|---|---|
| `frontend-engineer/files.md` | The manifest: every changed file, every carried threshold breach with its dated reason, and how to run the change |
| `frontend-engineer/plan.md`, `review.md`, `handoff.json` | Its five-step loop, on disk |
| `evidence/frontend/build.txt`, `tests.txt`, `bundle.txt` | Build, lint and typecheck output, the test run, and per-route client size against the budget |
| `evidence/frontend/rtl.md`, `keyboard.md` | What it observed under `dir="rtl"`, and the keyboard trace for each component |
| `evidence/frontend/screens/` | Captures at every width, theme and locale |
| The app source | Components, routes, tests, locale wiring, package scripts and generated types, in the tree the stack pack names |

Run paths sit under `.devteam/runs/<run-id>/`. The local env file is written and never
committed. It never edits the brand spec, the token source or the string catalogue.

## Its gate

It owns no gate. The gates on its work belong to the four reviewers, then bug-historian's
regression guard, then engineering-lead. Its exit condition is a self-check in `review.md`,
never in `gates[]`. It holds when the build, lint, typecheck and tests are clean, with a test
for each of the eight states; there is no hardcoded token value and no physical-side layout
property; every client component has a named interaction; every number carries its context;
right to left is observed and written up per screen; every width in the quality bar is
captured; the bundle delta is inside budget; and `files.md` is complete.

It says no by rejecting upstream with the rule broken: to ux-designer for a missing state, a raw
value or an untokened value; to ux-writer for a missing key or a count baked into a string; to
backend-engineer for a response that differs from the contract; to tech-architect for a brief
with no error shape or budget. Each rejection goes to the orchestrator, with
`blockers[].needs` naming the source. It escalates to the Product Lead when the budget and the
spec cannot both hold, when the brief and the spec disagree on behaviour, when the change needs
scope the brief lacks, or when the same item has gone back and forth three times.

## How it works

1. Plan. It writes a file-level change list, the server and client boundary per route, the data
   plan with its loading boundaries, a component inventory with all eight states, and the token
   names it will consume.
2. Audit the plan. It looks for a missing state, a client component that could render on the
   server, a fetch waterfall, state derived in an effect, an index key on a list that moves, a
   physical side that breaks right to left, and a value with no token.
3. Execute. It renders on the server by default, fetches in parallel, uses tokens and logical
   properties only, puts semantic elements before ARIA, keeps motion to transform and opacity
   with a reduced-motion path, takes every string from the catalogue, and writes the tests with
   the component.
4. Review. It greps its diff for literals, physical properties and animated layout, runs the
   build, lint, typecheck and tests, reads the bundle figures, captures every width, theme and
   locale, traces the keyboard, and measures its code against the clean code thresholds.
5. Hand off. It writes `files.md` and sets `next` to `orchestrator`, which dispatches the four
   reviewers in parallel.

## Skills and tools

- [team-protocol](../../.claude/skills/team-protocol/SKILL.md)
- [team-brand-guard](../../.claude/skills/team-brand-guard/SKILL.md)
- [team-design-system](../../.claude/skills/team-design-system/SKILL.md)
- [team-clean-code](../../.claude/skills/team-clean-code/SKILL.md)

The stack pack is read by path at step 1, never preloaded. Companion skills, if installed, are
listed in [SKILLS.md](../SKILLS.md). Tools: every tool and MCP server the project connects,
except `Agent`, because only the orchestrator dispatches, and the Playwright MCP server
(`mcp__playwright`), which among the dispatched roles only qc-engineer and qc-lead hold.

## Works with

- Upstream: [orchestrator](./orchestrator.md), [bug-historian](./bug-historian.md),
  [tech-architect](./tech-architect.md), [ux-designer](./ux-designer.md),
  [ux-auditor](./ux-auditor.md), which holds the design gate it waits on,
  [ux-writer](./ux-writer.md), which holds the copy gate, and
  [backend-engineer](./backend-engineer.md), whose endpoints it calls.
- Downstream: [peer-reviewer](./peer-reviewer.md), [code-analyst](./code-analyst.md),
  [code-steward](./code-steward.md) and [security-analyst](./security-analyst.md), which review
  its `files.md`, then [engineering-lead](./engineering-lead.md) and
  [qc-engineer](./qc-engineer.md), which run and test what it built.

[Read the definition](../../.claude/agents/frontend-engineer.md)

---

[Previous: backend-engineer](./backend-engineer.md) · [Back to the team](../../README.md#the-team) · [Next: peer-reviewer](./peer-reviewer.md)
