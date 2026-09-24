<p><img src="../../assets/agents/security-analyst.svg" alt="security-analyst, Blocks anything that leaks or can be broken into" width="100%"></p>

# security-analyst

The security analyst asks two things of every change: can it be broken into, and will it fall
over the first time reality is unkind. Its threat model comes from the product's own
invariants, the promises the product makes about who can see and change what. A leak on one of
those promises costs more than a password reset. That is why this is the one review whose
findings are never traded against a schedule.

## When it runs

Stage 6, on every change, in parallel with peer-reviewer, code-analyst and code-steward. The
four read the same files at the same time, and none reads another's findings before writing
its own.

The orchestrator dispatches it once backend-engineer, frontend-engineer, or both have handed
off a `files.md`. Its plan entry has no blocking gate of its own. It is due when the files.md
lists it consumes exist on disk, so the build stages ahead of it have finished.

It runs the full sweep again on every resubmission after a rejection, as a new round of the
same stage.

## What it reads

Run paths sit under `.devteam/runs/<run-id>/`.

| Path | Why |
|---|---|
| `PROJECT.md` sections Product and Product invariants | The threat model: what must never leak or be changed by the wrong person |
| `bug-historian/brief.md` | Earlier defects, whose repeats it treats as more severe, and the detections it runs exactly as published |
| `backend-engineer/files.md`, `frontend-engineer/files.md` | The files in scope, as the run plan names them |
| The ADR and the task brief | Which invariant each path must hold, where, and the roles to probe |
| `PROJECT.md` section Stack pack, then `.claude/skills/<pack>/SKILL.md` by path | The access-control patterns, known traps and probe tools for this stack |
| `PROJECT.md` sections Stack, Commands, Toolchain, Quality bar | The package manager to audit, the tools it may assume, the failure paths to run |
| The working tree and the whole git history | A key committed once and removed later has still leaked |

## What it writes

| Path | What |
|---|---|
| `security-analyst/plan.md` | Steps 1 and 2, including the `## Audit` section and the role matrix to probe |
| `security-analyst/findings.md` | The verdict, then findings by severity, each with where, what, why, proof, fix and rotation |
| `security-analyst/review.md` | The passes run, the ones that came back clean, anything noted for another role |
| `security-analyst/handoff.json` | The first handoff. A re-review writes `handoff-stage6-round<R>.json` |
| `evidence/security/` | Every command, query and probe, with its output, including clean passes |

It writes nothing outside its own run folder and `evidence/security/`.

## Its gate

It owns `security`, which passes when every pass of the security sweep ran and nothing
critical or high is open. In full: every applicable pass in `team-security` ran with its output
saved, no critical or high is open unless the Product Lead accepted it in writing, every
medium has an owner and a date, the dependency audit is clean of critical and high or each
remaining one is accepted in writing, no secret is in the working tree or in history, every
client-reachable data store enforces access control in its lowest layer (proved by probes as
each role, not by reading the migration), the platform's own security checks are clean or
every finding is accepted in writing, and no privileged key is reachable from a client. Three
mediums in the same area block together.

It blocks on its own authority. A fixable finding hands off `rejected` to the orchestrator,
naming the author and the round. A critical or high that cannot be fixed without a decision
hands off `escalated`, with a `decisions_for_product_lead` entry. Only the Product Lead can
accept a risk, and the acceptance is recorded in the ledger and later in `BUGS.md`. It also
escalates a leaked secret that reached a real environment, a vulnerable dependency with no
fixed version, and a release its gate blocks when the date matters.

## How it works

It plans from the change surface, split into data layer, server code, client code,
dependencies, configuration and storage, writes a threat model from the product invariants,
and names every pass it will skip with the reason. The audit asks what it dropped because the
change looked safe, whether it is reading only the working tree, and whether it is about to
trust an exit code. It then runs the seven passes in order: secrets and keys, exposure and
configuration, authentication and access control, injection and dangerous functions,
dependencies and supply chain, data handling, and failure handling. A critical in either of
the first two stops the sweep at once. It scans the tree and every commit for secrets, passing
every scan through a node `redact` helper so no value reaches the evidence, runs the dependency
audit of the stack's package manager (`npm audit` for npm), probes access control as each role
with the tools the stack pack provides, follows one request end to end, and runs the failure
paths. Every detection the regression brief names for it runs exactly as published, in the
pass it belongs to, and its log opens with the command as run. Every finding carries a status
and proof another person can reproduce.

## Skills and tools

- [team-protocol](../../.claude/skills/team-protocol/SKILL.md), the five-step loop, run paths
  and the handoff schema.
- [team-security](../../.claude/skills/team-security/SKILL.md), the full catalogue, the sweep
  order and the severity ladder that is its gate.
- [team-architecture](../../.claude/skills/team-architecture/SKILL.md), to know which
  invariant a surface upholds and where, before testing whether it does.

The same catalogue, written for people, is the [security checklist](../SECURITY-CHECKLIST.md).
With the default stack pack, `supabase-postgres-best-practices` is an optional companion, if
installed (see [SKILLS.md](../SKILLS.md)).

Tools: everything except Agent, Edit and NotebookEdit, including any MCP server the project
connects, used only to read and to probe, never to change.

## Works with

| Role | How |
|---|---|
| [orchestrator](./orchestrator.md) | Dispatches it, routes its handoff, and records the Product Lead's decisions in the ledger |
| [bug-historian](./bug-historian.md) | Writes the regression brief it reads first, runs the regression guard after all four reviews pass, and records accepted risks |
| [tech-architect](./tech-architect.md) | Writes the ADR that says which invariant each path must hold |
| [backend-engineer](./backend-engineer.md), [frontend-engineer](./frontend-engineer.md) | Author the change, and fix what it proves |
| [peer-reviewer](./peer-reviewer.md), [code-analyst](./code-analyst.md), [code-steward](./code-steward.md) | Review the same files independently, in parallel |
| [engineering-lead](./engineering-lead.md) | Reads its findings at the engineering gate |

[Read the definition](../../.claude/agents/security-analyst.md)

---

[Previous: code-steward](./code-steward.md) · [Back to the team](../../README.md#the-team) · [Next: engineering-lead](./engineering-lead.md)
