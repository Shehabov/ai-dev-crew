<p><img src="../../assets/agents/backend-engineer.svg" alt="backend-engineer, Builds the data layer and the API" width="100%"></p>

# backend-engineer

The backend-engineer builds the data layer and the API, working from the tech-architect's
brief on whatever stack `PROJECT.md § Stack` names. It puts each rule from
`PROJECT.md § Product invariants` in the lowest layer that can hold it, usually the database,
and writes the suite that proves each one. That matters because a rule kept only in a server
handler or in the client stops nobody who goes around it, whether through a leaked key, a
direct connection or a call the interface was never meant to make. It builds what was agreed,
and it never changes the contract or the architecture on its own.

## When it runs

- Stage 2, in parallel with the ux-designer, whenever a change touches the data layer or the
  API.
- It starts only when the `design-authority` gate reads pass, so the ADR, the API contract and
  `brief-backend.md` exist first.
- It runs again whenever a reviewer, bug-historian, engineering-lead, qc-engineer or qc-lead
  rejects a back-end change to it. Each fix round writes `handoff-stage2-round<R>.json`, so the
  first record survives.

## What it reads

| Input | Why |
|---|---|
| `PROJECT.md` sections Product invariants, Stack pack, Stack, Commands, Toolchain, Product | The rules it must hold, the stack, the commands it may run, the tools it may assume, and the roles its permission matrix covers |
| The stack pack, at `.claude/skills/<pack>/SKILL.md` | Read by path at step 1: where migrations live, how they are applied and proved, which tools it calls, what the evidence files are called |
| `.devteam/runs/<run-id>/run.json` | The run id, its assignment and the gate list |
| `.devteam/runs/<run-id>/bug-historian/brief.md` and the `BUGS.md` entries it names | What has already broken on these surfaces |
| `.devteam/runs/<run-id>/tech-architect/brief-backend.md`, the ADR and the API contract | What to build, the permission rules, the error shape and the pagination contract |
| The brand spec's rules on numbers, dates, status and names | The API is the source of everything the interface renders, so those rules hold in its payloads |

## What it writes

| Output | What it holds |
|---|---|
| `backend-engineer/files.md` | The manifest: every changed file, every migration with its written reverse, every carried threshold breach with its dated reason, the fixtures for qc-engineer, and the keys the interface resolves |
| `backend-engineer/rollback-notes.md` | The lock each migration statement takes, and the proof of each reverse |
| `backend-engineer/reverse-<slug>.sql` | One runnable reverse per migration, unless the stack pack names another form |
| `backend-engineer/plan.md`, `review.md`, `handoff.json` | Its five-step loop, on disk |
| `evidence/backend/` | Test runs labelled with where they ran, query plans, apply and advisor output, server function calls |
| The back-end source | Migrations, tests, seed, server functions and generated types, at the paths the stack pack names |

Run paths sit under `.devteam/runs/<run-id>/`.

## Its gate

It owns no gate. The gates on its work belong to the four reviewers, then bug-historian's
regression guard, then engineering-lead. Its exit condition is a self-check recorded in
`review.md`, never in `gates[]`. It holds when the suite is green everywhere the stack pack
says, every touched invariant is mapped to its enforcement point and proved offline and on the
real environment, every illegal transition is refused in the data layer, every read is bounded
and indexed, every migration has a proved reverse and a recorded lock, the payloads match the
contract field by field, a duplicate request writes one row, and `files.md` is complete. Any
check that fails makes its status `blocked`, never `passed`.

It says no by rejecting a bad brief to tech-architect, naming the clause: an endpoint with no
permission rule, a field with no type, an invariant with no enforcement point, a contract that
implies a query no index can serve. The rejection goes to the orchestrator, with
`blockers[].needs` naming the source. It escalates to the Product Lead when an invariant would
be weakened, when personal data would be kept or deleted, when a change breaks the API or
cannot be reversed, when a paid service needs a spend ceiling, when a shared environment would
be reset, or when a rejection loop reaches its third round.

## How it works

1. Plan. It reads the regression brief, the backend brief, the ADR, the contract and the stack
   pack, then writes the endpoints in and out of scope, the migration plan with locks and
   reverses, a permission matrix of role by operation by object, and each touched invariant
   with its enforcement point and its test.
2. Audit the plan. For each invariant it names three paths around the enforcement point, then
   looks for concurrent writes that break a rule about a set, transitions reachable twice, table
   rewrites on live data, side effects that can repeat, and payloads that leak.
3. Execute. It puts rules into policies, constraints, triggers and definer functions, builds
   guarded transitions as explicit state machines, gives every outbound side effect an
   idempotency key the database enforces, returns keys rather than sentences, and writes the
   invariant, transition, access and idempotency suites.
4. Review. It runs the suite everywhere the stack pack says, greps its own diff for what should
   not exist, proves every migration and its reverse at realistic row counts, and measures its
   code against the clean code thresholds.
5. Hand off. It writes `files.md` and sets `next` to `orchestrator`, which dispatches the four
   reviewers in parallel.

## Skills and tools

- [team-protocol](../../.claude/skills/team-protocol/SKILL.md)
- [team-architecture](../../.claude/skills/team-architecture/SKILL.md)
- [team-clean-code](../../.claude/skills/team-clean-code/SKILL.md)

The stack pack is read by path at step 1, never preloaded. Companion skills, if installed, are
listed in [SKILLS.md](../SKILLS.md). Tools: every tool and MCP server the project connects,
except `Agent`, because only the orchestrator dispatches, and the Playwright MCP server
(`mcp__playwright`), which among the dispatched roles only qc-engineer and qc-lead hold.

## Works with

- Upstream: [orchestrator](./orchestrator.md), [bug-historian](./bug-historian.md) and
  [tech-architect](./tech-architect.md), whose brief and contract it builds against.
- Alongside: [ux-designer](./ux-designer.md), whose screens reach it through the contract.
- Downstream: [frontend-engineer](./frontend-engineer.md), which calls its endpoints;
  [peer-reviewer](./peer-reviewer.md), [code-analyst](./code-analyst.md),
  [code-steward](./code-steward.md) and [security-analyst](./security-analyst.md), which review
  its `files.md`; [engineering-lead](./engineering-lead.md), [qc-engineer](./qc-engineer.md) and
  [release-engineer](./release-engineer.md), which run, test and ship what it built.

[Read the definition](../../.claude/agents/backend-engineer.md)

---

[Previous: ux-writer](./ux-writer.md) · [Back to the team](../../README.md#the-team) · [Next: frontend-engineer](./frontend-engineer.md)
