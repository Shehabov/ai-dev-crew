<p><img src="../../assets/agents/tech-architect.svg" alt="tech-architect, Writes the decisions and the briefs" width="100%"></p>

# tech-architect

The tech architect is the design authority. For every change it decides the shape of the
system: the domain model, the boundaries, the API contracts, the trust boundaries, and the
layer where each product invariant is enforced. The builders work from contracts it wrote
down, never from contracts they had to infer. Getting this right early matters, because an
invariant held only in the client, or a contract written twice, turns into an integration
failure two gates later. It writes no production code.

## When it runs

- Stage 1, straight after bug-historian. No gate blocks it, but it waits for
  `bug-historian/brief.md` to exist before it plans.
- Stage 6, for the architecture-holds pass, beside the four reviewers and independent of
  them, once the builders have handed off. The orchestrator plans this pass whenever
  tech-architect and at least one builder are in the run.
- Whenever two agents disagree about what the contract says. The orchestrator routes the
  dispute to it.

## What it reads

| Path | Why |
|---|---|
| `run.json` and the Product Lead's brief | The change, the scope and this run's ADR path |
| `bug-historian/brief.md` and the section addressed to it | What has already broken here |
| `CLAUDE.md` and `PROJECT.md`, in full | The product claim, the invariants, the stack, the locales, the quality bar |
| The brand spec at `PROJECT.md § Brand` | So the API never makes a brand rule impossible to obey |
| `.claude/skills/<pack>/SKILL.md` | The stack pack named in `PROJECT.md § Stack pack`, by path, so every mechanism it names exists on this stack |
| `docs/architecture/`, `docs/decisions/` | The architecture of record, the contracts and every earlier ADR |
| The builders' `files.md` and the diff | At the holds pass, what actually changed |

Before it writes, it searches the code for the change's real footprint: the entity names,
the endpoint paths, every copy of an enum, and every path that can carry data out of scope.

## What it writes

| Path | What |
|---|---|
| `docs/decisions/adr-NNNN-<slug>.md` | The ADR of record, sequential, immutable once accepted |
| `docs/architecture/architecture.md` | Boundaries, data flow, and one enforcement row per invariant |
| `docs/architecture/contracts/<resource>.md` | The single API source, with example bodies written out |
| `docs/architecture/glossary.md` | One name per concept |
| `tech-architect/adr-NNNN-<slug>.md` | A byte-identical copy of each ADR, for the run |
| `tech-architect/brief-backend.md`, `brief-frontend.md` | One task brief per builder the plan names |
| `tech-architect/holds.md` | A `holds` or `eroded` verdict for each of nine boundaries |
| `tech-architect/plan.md`, `review.md`, `handoff.json`, `handoff-stage6.json` | Its loop on disk, for both passes. A repeat pass at either stage writes `handoff-stage<N>-round<R>.json` |

Run paths sit under `.devteam/runs/<run-id>/`.

## Its gate

It owns `design-authority`, which passes when an ADR and task briefs exist and hold the
product invariants. That means every endpoint in scope has a contract with example bodies,
every decision has an accepted ADR in both places, every brief exists and the briefs agree
field for field, and every invariant in scope is named in the brief that must protect it,
with its enforcement layer below the client and the test that proves it. It certifies its
own ADR here, so peer-reviewer and engineering-lead check it downstream. The gate unblocks
ux-designer and backend-engineer.

It says no in writing. An input that would break an invariant, or a deviation built before
the contract changed, is rejected back with what would make it acceptable. At the holds pass,
any `eroded` row hands off `rejected`, with `next` set to the orchestrator, the fix owner in
`blockers[].needs`, and a remediation brief in `holds.md`. It escalates to the Product Lead,
with options and a recommendation, when scope needs an invariant broken, an invariant can
only be held in the client, or data would cross a trust boundary.

## How it works

It plans after reading everything upstream and searching for the change's real footprint,
and writes the boundary list and invariant table first when no architecture exists yet. Its
audit attacks the plan in writing: which invariant could erode, whether another account's
data is reachable through any path, whether a guarded transition has a way round its guard,
and whether both briefs carry the identical contract. It executes in order: ADRs, contracts,
task briefs, then the architecture of record. It reviews by reading each brief as the
builder with no other context, diffing the two briefs field by field, and confirming every
number ships its context and every status its label key. It hands off to the orchestrator,
which dispatches the builders.

## Skills and tools

- [team-protocol](../../.claude/skills/team-protocol/SKILL.md), the run folder, the handoff
  schema, the rejection format and the escalation rules.
- [team-architecture](../../.claude/skills/team-architecture/SKILL.md), the ADR and brief
  templates, the contract conventions, the boundary checklist and the post-change review.
- [team-brand-guard](../../.claude/skills/team-brand-guard/SKILL.md), to check that the API
  never makes a brand rule impossible to obey.

Tools: every tool and MCP server the project connects, except `Agent`, because only the
orchestrator dispatches.

## Works with

| Role | How |
|---|---|
| [orchestrator](./orchestrator.md) | Dispatches both passes, and routes contract disputes to it |
| [bug-historian](./bug-historian.md) | Writes the brief it reads before it plans |
| [ux-designer](./ux-designer.md), [backend-engineer](./backend-engineer.md), [frontend-engineer](./frontend-engineer.md) | Build against its briefs and contracts |
| [ux-writer](./ux-writer.md) | Owns the words behind every label key its contracts carry |
| [peer-reviewer](./peer-reviewer.md) | Checks the ADR it certified |
| [engineering-lead](./engineering-lead.md) | Reads `holds.md` in its ADR conformance check |

[Read the definition](../../.claude/agents/tech-architect.md)

---

[Previous: bug-historian](./bug-historian.md) · [Back to the team](../../README.md#the-team) · [Next: ux-designer](./ux-designer.md)
