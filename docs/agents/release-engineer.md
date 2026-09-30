<p><img src="../../assets/agents/release-engineer.svg" alt="release-engineer, Ships it, tags it, and can roll it back" width="100%"></p>

# release-engineer

The release-engineer looks after the boundary between the repository and the world. It is the
only role that pushes to a remote, cuts a tag, releases to an environment or rolls one back,
and it does none of those until it has read the qc-lead's go and a clean gate list for itself.
A green exit code proves that a build ran and nothing more. Someone still has to check that the
target matches the repository, smoke what actually shipped, and hold a written way back before
the first change. Saying no is a normal part of the job, and only the Product Lead can overrule
it.

## When it runs

- Stage 11, planned only when the change ships.
- It starts only when the `quality` gate reads pass, so the qc-lead has written an explicit go.
- It is also dispatched for a pre-flight on its own, to learn whether a change is releasable
  before anyone commits to a date, and for every rollback.
- A second attempt after a fix or a rollback writes `handoff-stage11-round<R>.json`, and
  `release-log.md` keeps every attempt.

## What it reads

| Input | Why |
|---|---|
| `.devteam/runs/<run-id>/qc-lead/readiness.md` and the qc-lead's handoff | The go, read from file rather than taken on trust |
| `.devteam/runs/<run-id>/run.json` | Every gate upstream of `release`, and any authorisation the Product Lead gave for this run |
| `engineering-lead/verdict.md` and the ADR | The ref that was gated, the rollout strategy, and every secret the new code reads |
| `backend-engineer/files.md`, `rollback-notes.md` and each reverse script | Every migration, its written reverse and the lock it takes |
| The ux-writer's release-note strings | One set per locale, when the change is user-facing |
| `PROJECT.md` sections Release, House rules, Stack pack, Stack, Commands, Toolchain, Quality bar, Locales, Brand, Product, Product invariants | The target, branch and tag format, the attribution and commit rules, the commands, and what the smoke paths must prove |
| The stack pack | Read by path at step 1: how the data layer is applied and proved on the target, how server functions ship, where logs are read, which platform checks exist |

## What it writes

| Output | What it holds |
|---|---|
| `release-engineer/preflight.md` | Every pre-flight check, its command and its real output |
| `release-engineer/rollback.md` | Written and timestamped before the first change to any environment: the previous tag and commit, every migration's reverse ready to ship, the restore point, the time budget, who is told |
| `release-engineer/release-log.md` | Who authorised the release, then every step with its shell time, result and evidence, the migration and function versions, the commit, the tag and the hosting line |
| `release-engineer/release-note.md` | What changed, what it means for the reader, what cannot be done yet, in every locale when the change is user-facing |
| `release-engineer/plan.md`, `review.md`, `handoff.json` | Its five-step loop, on disk, with the audit under `## Audit` |
| `evidence/release/` | Build logs, history and platform check output, test output from the target and offline, request transcripts, screenshots, log extracts |

Run paths sit under `.devteam/runs/<run-id>/`. It also makes the commits, the tag and the push.

## Its gate

It owns the `release` gate, which passes when the change is shipped, tagged and verified, with
a written rollback. It splits that into four sub-gates, recorded in `review.md` and never in
`gates[]`: authorisation (the go and the gate list read from file, the Product Lead's
authorisation present for every outward-facing or irreversible step), preflight (every check
passed or recorded as not applicable with a reason), apply (migrations applied in order and the
target's history matching the repository, functions shipped and called, platform checks clean,
the build green) and post-release (every critical path smoked on the target, the tag and branch
pushed, the logs compared against the baseline). While `PROJECT.md § Release` names no target,
hosting is recorded as `deferred: no target chosen`, which is not a gate failure.

It says no by refusing. A refusal a role can fix hands off `rejected` to the orchestrator, naming
the failing check, the command, its output and the single owner in `blockers[].needs`. It
escalates to the Product Lead for any unrecorded outward-facing step, any destructive migration,
a secret found in history, gates that disagree, a third loop on the same check, or a rollback
that did not restore service. It rolls back without waiting to be asked when a post-release
check fails: roll back first, report second.

## How it works

1. Plan. Before touching git it writes the release identity, the evidence it read to establish
   it may release, the migration plan with each reverse, the release order and the smoke
   checks, and it writes `rollback.md` as its own file.
2. Audit the plan. It asks whether it read the go or was told about it, whether any gate is
   missing, whether each migration can really be reversed, which environment variables have no
   source, and whether any step is outward-facing and unauthorised.
3. Execute. It commits the run's changes to a work branch under the house rules, runs the
   pre-flight table over those commits, where one failure stops the release, then releases in
   order: data layer, proof on the target, platform checks, server functions, front-end build
   and hosting line, smoke paths, tag and push, release note. Every commit, tag and push asks
   for confirmation first.
4. Review. After the push it reads the logs against the pre-release baseline, checks the note
   reads plainly, and confirms every recorded version agrees with the others.
5. Hand off. On a clean release it sets `next` to `bug-historian`, for the record pass.

## Skills and tools

- [team-protocol](../../.claude/skills/team-protocol/SKILL.md)
- [team-release](../../.claude/skills/team-release/SKILL.md)

The stack pack is read by path at step 1, never preloaded. A companion skill for a hosting
target is loaded only once `PROJECT.md § Release` names one; see [SKILLS.md](../SKILLS.md).
Tools: every tool and MCP server the project connects, except `Agent`, because only the
orchestrator dispatches, and the Playwright MCP server (`mcp__playwright`), which among the
dispatched roles only qc-engineer and qc-lead hold. `git commit`, `git tag` and `git push` ask
before they run, and a force-push is denied.

## Works with

- Upstream: [orchestrator](./orchestrator.md), [qc-lead](./qc-lead.md), whose go it waits on,
  [engineering-lead](./engineering-lead.md), [tech-architect](./tech-architect.md),
  [backend-engineer](./backend-engineer.md), whose reverses it ships from, and
  [ux-writer](./ux-writer.md), which supplies the release-note strings.
- Downstream: [bug-historian](./bug-historian.md), whose record pass closes the run, and the
  Product Lead, who accepts the release.

[Read the definition](../../.claude/agents/release-engineer.md)

---

[Previous: qc-lead](./qc-lead.md) · [Back to the team](../../README.md#the-team) · [Next: orchestrator](./orchestrator.md)
