# Skills

A skill is a folder under `.claude/skills/` that holds a `SKILL.md`: a name, a description
that says when to use it, and a body of instructions. The team ships fifteen. Fourteen are
house skills, prefixed `team-`, and hold the craft every role works to. The fifteenth is a
stack pack, which tells the roles that depend on the stack how to build and prove work on
one particular stack. Third-party companion skills can add craft to some roles. They are
optional, and none of them is vendored here.

## How skills load

The team relies on two routes only.

| Route | What happens | Used for |
|---|---|---|
| An agent's `skills:` list | Claude Code injects each listed skill in full when the agent starts, so it is in context before step 1 of the loop | The fourteen house skills |
| A read by path | The agent opens `.claude/skills/<name>/SKILL.md` itself, at the step that needs it | The stack pack named in `PROJECT.md § Stack pack` |

A skill named only in an agent's body is not preloaded. That is deliberate for the stack
pack, so a project on another stack never carries the wrong one, and for companions, which
may not be installed at all. `scripts/check.mjs` enforces it: every name in a `skills:`
list must resolve to a folder in this repository, every list must include `team-protocol`,
and a stack pack in a `skills:` list is a failure.

In a project, Claude Code loads a skill under its folder name. Every skill here has a `name`
equal to its folder, and a description under 1024 characters, the limit beyond which a skill
will not install.

## House skills

Each is preloaded, in full, when an agent that lists it starts. The agent's own file says
at which step of the loop it uses each one.

| Skill | What it covers | Used when | Preloaded by |
|---|---|---|---|
| [team-protocol](../.claude/skills/team-protocol/SKILL.md) | The five-step loop, the run folder, the handoff schema and its file names, what counts as evidence, rejection and escalation, and the rules for `PROJECT.md` facts, tools and gate results | At the start of every task, and again before every handoff | Every agent |
| [team-orchestration](../.claude/skills/team-orchestration/SKILL.md) | Kickoff, the toolchain pre-flight, the run plan template, right-sizing, the gates, dispatch briefs, routing, the ledger, the utilisation check, closing and the run report | Opening, running and closing a run | [orchestrator](agents/orchestrator.md) |
| [team-brand-guard](../.claude/skills/team-brand-guard/SKILL.md) | The brand pre-flight, what to do while the brand spec is missing or unapproved, the contrast script, the most frequent brand failures and their fixes, the companion skill policy and how to record an override | Before designing, writing or building anything a person will see, and when a gate needs a brand check | orchestrator, tech-architect, ux-designer, ux-auditor, ux-writer, frontend-engineer, engineering-lead, qc-engineer |
| [team-bug-register](../.claude/skills/team-bug-register/SKILL.md) | The entry format for `BUGS.md`, why a defect got through each gate, standing rules and when a defect becomes one, repeats and the third-occurrence escalation, and detection commands that need only git, grep and node | The regression brief at stage 1, the guard at stage 7, the record at stage 12, and whenever a defect is raised | [bug-historian](agents/bug-historian.md) |
| [team-clean-code](../.claude/skills/team-clean-code/SKILL.md) | Naming in the domain's language, function and file thresholds, guard clauses, module headers, comments that say why, errors, duplication, tests as specifications, and the review checklist | Writing, reviewing or refactoring code, and at the `review-readability` gate | backend-engineer, frontend-engineer, code-steward |
| [team-design-system](../.claude/skills/team-design-system/SKILL.md) | Adopting, adapting or rejecting a reference pattern, shell anatomy, the featured-surface rule, density and rhythm, the five smoothness checks, the card and metric tile rules, the eight states, responsive rules at the quality-bar widths, right to left, themes, motion and the seven component headings | Designing, building or auditing any screen, component or flow | ux-designer, ux-auditor, frontend-engineer, qc-engineer |
| [team-ux-audit](../.claude/skills/team-ux-audit/SKILL.md) | Usability heuristics, the accessibility standard in `PROJECT.md § Quality bar`, localisation, the brand bans, the finding format and severities, and the state coverage matrix | Auditing a spec before the `design` gate, or a built or shipped surface | [ux-auditor](agents/ux-auditor.md) |
| [team-copy](../.claude/skills/team-copy/SKILL.md) | The writing method, the order locales are written in and the native review rule, the string catalogue, length budgets, plurals, numbers and dates with their context, status labels, and right to left | Any string a person reads, in any locale in `PROJECT.md § Locales` | [ux-writer](agents/ux-writer.md) |
| [team-architecture](../.claude/skills/team-architecture/SKILL.md) | The domain model, the product invariants and the layer that must hold each one, API contracts, ADRs and the task briefs the builders work from | A technical decision, an ADR, a task brief, or a re-read of a diff to confirm the architecture holds | bug-historian, tech-architect, backend-engineer, code-steward, security-analyst, engineering-lead |
| [team-code-review](../.claude/skills/team-code-review/SKILL.md) | The reading order, the seven lenses, the failure-mode catalogue, the comment format, the severity ladder and the verdicts | The `review-judgement` gate, a re-review after fixes, and engineering-lead's check of the seam | peer-reviewer, engineering-lead |
| [team-code-analysis](../.claude/skills/team-code-analysis/SKILL.md) | Correctness, line-level security, the data layer and its access rules, concurrency, error handling, structural rot against fixed thresholds, and the S1 to S3 finding format | The `review-defects` gate | [code-analyst](agents/code-analyst.md) |
| [team-test-protocol](../.claude/skills/team-test-protocol/SKILL.md) | The test plan and test areas, evidence names, the test log, the defect record and its severity ladder, re-test rounds, and the readiness report with its go or no-go rule | Planning and running tests, auditing the evidence, and deciding whether a change can ship | qc-engineer, qc-lead |
| [team-security](../.claude/skills/team-security/SKILL.md) | Seven passes in a fixed order, stopping on a critical in the first two: 01 Secrets and keys, 02 Exposure and configuration, 03 Authentication and access control, 04 Injection and dangerous functions, 05 Dependencies and supply chain, 06 Data handling, 07 Failure handling. Also the threat model, the commands and evidence for each pass, severities, and written acceptance of critical and high findings. [SECURITY-CHECKLIST.md](SECURITY-CHECKLIST.md) sets out the same catalogue for people. | The `security` gate, on every change and before any release | [security-analyst](agents/security-analyst.md) |
| [team-release](../.claude/skills/team-release/SKILL.md) | Who may push, tag or change an environment, the attribution check, pre-flight, the release sequence and migration ordering, hosting recorded as deferred while no target is chosen, verification after release, and the rollback plan written before the first change | Committing, releasing, verifying and rolling back | [release-engineer](agents/release-engineer.md) |

### By agent

The same lists, read the other way. The first column's `skills:` field is the source.

| Agent | Preloads | Reads by path |
|---|---|---|
| [orchestrator](agents/orchestrator.md) | team-protocol, team-orchestration, team-brand-guard | The stack pack's setup section at kickoff, and its pre-flight section at every run open |
| [bug-historian](agents/bug-historian.md) | team-protocol, team-bug-register, team-architecture | The sections the stack pack's own table names for it |
| [tech-architect](agents/tech-architect.md) | team-protocol, team-architecture, team-brand-guard | The stack pack, at step 1 |
| [ux-designer](agents/ux-designer.md) | team-protocol, team-brand-guard, team-design-system | none |
| [ux-auditor](agents/ux-auditor.md) | team-protocol, team-brand-guard, team-design-system, team-ux-audit | none |
| [ux-writer](agents/ux-writer.md) | team-protocol, team-copy, team-brand-guard | none |
| [backend-engineer](agents/backend-engineer.md) | team-protocol, team-architecture, team-clean-code | The stack pack, at step 1 |
| [frontend-engineer](agents/frontend-engineer.md) | team-protocol, team-brand-guard, team-design-system, team-clean-code | The stack pack, at step 1 |
| [peer-reviewer](agents/peer-reviewer.md) | team-protocol, team-code-review | The sections the stack pack's own table names for it |
| [code-analyst](agents/code-analyst.md) | team-protocol, team-code-analysis | The stack pack, at step 1 |
| [code-steward](agents/code-steward.md) | team-protocol, team-clean-code, team-architecture | The sections the stack pack's own table names for it |
| [security-analyst](agents/security-analyst.md) | team-protocol, team-security, team-architecture | The stack pack, at step 1 |
| [engineering-lead](agents/engineering-lead.md) | team-protocol, team-code-review, team-architecture, team-brand-guard | The stack pack, at step 1 |
| [qc-engineer](agents/qc-engineer.md) | team-protocol, team-test-protocol, team-brand-guard, team-design-system | The stack pack, at step 1 |
| [qc-lead](agents/qc-lead.md) | team-protocol, team-test-protocol | The stack pack, at step 1 |
| [release-engineer](agents/release-engineer.md) | team-protocol, team-release | The stack pack, at step 1 |

## The stack pack

[stack-nextjs-supabase](../.claude/skills/stack-nextjs-supabase/SKILL.md) is the default
pack: a Next.js App Router app in `web/`, and a Supabase back end changed only through
hand-authored migrations, applied and proved through the Supabase MCP, with an offline
Postgres proof on PGlite and no Docker or Supabase CLI. It covers the toolchain, the evidence
file names, the access-rule patterns and their traps, the security probes, the release
sequence on this stack, and what the offline proof cannot prove.

It is never preloaded. When `PROJECT.md § Stack pack` names it, the nine roles that depend
on the stack read it by path at step 1: tech-architect, backend-engineer, frontend-engineer,
code-analyst, security-analyst, engineering-lead, qc-engineer, qc-lead and release-engineer.
The orchestrator reads its setup section at kickoff and its pre-flight section at every run
open. The pack's own table, under "When to use this pack", names the sections each role
reads, and also sends peer-reviewer and code-steward to its migration and access-rule
sections when a change touches the data layer, and bug-historian to its traps and probes for
detection commands.

| File | What it is |
|---|---|
| [SKILL.md](../.claude/skills/stack-nextjs-supabase/SKILL.md) | The pack itself, with a section for each job and each role |
| [scripts/db-test.mjs](../.claude/skills/stack-nextjs-supabase/scripts/db-test.mjs) | The offline proof. It builds the database from the migrations in a throwaway Postgres, loads the seed and runs the pgTAP files. Run it from the project root after `npm i -D @electric-sql/pglite` once. |
| [scripts/db-test-shim.sql](../.claude/skills/stack-nextjs-supabase/scripts/db-test-shim.sql) | The part of pgTAP's interface the offline proof supports |
| [templates/mcp.json](../.claude/skills/stack-nextjs-supabase/templates/mcp.json) | The Supabase MCP configuration, with a `<project-ref>` placeholder and no secret. Kickoff copies it to `.mcp.json`. |

With `none` in `PROJECT.md § Stack pack`, the same roles work from `§ Stack`, `§ Commands` and
`§ Toolchain`, and the gates do not relax. [CUSTOMISING.md](CUSTOMISING.md#choosing-a-stack-pack)
covers choosing a pack, and [writing one](CUSTOMISING.md#writing-a-stack-pack) for another
stack.

## Companion skills

Companion skills are third-party skills that pair well with particular roles. None is
vendored, and the team works without any of them. An agent names a companion in its body, as
"if installed", at the step it serves, and never in its `skills:` list, because every skill in
that list must exist in this repository.

The rules for using one are the same everywhere, and
[team-brand-guard](../.claude/skills/team-brand-guard/SKILL.md) sets them out in full:

- A companion that is not installed changes nothing about the step. The team's own skills
  carry the rule, and the agent notes the absence in its `review.md`.
- Where a companion disagrees with the brand spec, the brand spec wins. Many design skills
  optimise for decoration such as gradients, glow and heavy shadows, and the team takes none
  of it unless the brand spec allows it by name.
- Where a companion disagrees with
  [team-design-system](../.claude/skills/team-design-system/SKILL.md) on anatomy, density or
  states, the design system wins. Where it teaches a workflow the stack pack replaces, the
  stack pack wins.
- Every departure from a companion's advice is recorded as an override in the agent's
  `review.md`.

In each table below, the first column is the skill's folder in its repository, which is the
name the agents use. The second is the name its own frontmatter declares, where that differs.

### vercel-labs/agent-skills

[github.com/vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills). React and
Next.js practice, interface guidelines and writing guidelines.

| Skill | Declares | Used by | What it adds |
|---|---|---|---|
| `react-best-practices` | `vercel-react-best-practices` | [frontend-engineer](agents/frontend-engineer.md) | React and Next.js performance: server and client boundaries, data-fetching waterfalls, bundle size and re-renders |
| `composition-patterns` | `vercel-composition-patterns` | frontend-engineer, [ux-designer](agents/ux-designer.md) | Component APIs built by composition rather than a growing set of boolean props |
| `react-view-transitions` | `vercel-react-view-transitions` | frontend-engineer | React's View Transition API, used only where the spec asks for continuity between two views |
| `web-design-guidelines` | same | ux-designer, [ux-auditor](agents/ux-auditor.md), frontend-engineer | Fetches the current Web Interface Guidelines and reports each finding as `file:line` |
| `writing-guidelines` | same | [ux-writer](agents/ux-writer.md) | Fetches the current writing rules and reviews prose longer than one sentence, as `file:line` |

The same repository holds skills for one hosting platform: `deploy-to-vercel`,
`vercel-cli-with-tokens` and `vercel-optimize`. [release-engineer](agents/release-engineer.md)
may load one for the host's mechanics only, once `PROJECT.md § Release` names that platform as
the target and `PROJECT.md § Toolchain` lists what the skill needs. It never replaces
pre-flight, the rollback plan or verification, and while the target reads
`deferred: no target chosen`, none is loaded.

### Leonxlnx/taste-skill

[github.com/Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill). Composition,
hierarchy and anti-generic layout. The team uses it for structure only, and the brand spec
wins on colour and decoration every time.

| Skill | Declares | Used by | What it adds |
|---|---|---|---|
| `taste-skill` | `design-taste-frontend` | ux-designer, ux-auditor | Reading the brief before choosing a direction, and refusing a templated layout. Its dials are set from the brand spec's motion and density rules. |
| `minimalist-skill` | `minimalist-ui` | ux-designer | Flat components, typographic contrast and plain language. Its palette and fonts are discarded. |
| `redesign-skill` | `redesign-existing-projects` | ux-auditor | An audit-first sequence for finding drift in a shipped surface. The auditor never applies its fixes. |
| `output-skill` | `full-output-enforcement` | ux-designer | Every state written out in full, with no placeholder sections |

### supabase/agent-skills

[github.com/supabase/agent-skills](https://github.com/supabase/agent-skills). The Supabase
platform and Postgres practice. Both skills also teach the Supabase CLI and a declarative
schema workflow, which the stack pack does not use. Where either disagrees with
[stack-nextjs-supabase](../.claude/skills/stack-nextjs-supabase/SKILL.md), the pack wins.

| Skill | Declares | Used by | What it adds |
|---|---|---|---|
| `supabase` | same | [backend-engineer](agents/backend-engineer.md) | The platform's products and client libraries |
| `supabase-postgres-best-practices` | same | backend-engineer, [security-analyst](agents/security-analyst.md) | Schema design, indexes, lock behaviour and query plans, and the performance of access rules, roles and grants |

## Adding a companion skill

Drop the skill's folder into `.claude/skills/` in your project, or into `~/.claude/skills/` to
have it in every project on your machine. Keep the folder name from the first column above, so
it loads under the name the agents use.

Or install it the way its repository documents. At the time of writing, each of the three
uses the `skills` installer:

```bash
npx skills add vercel-labs/agent-skills
npx skills add https://github.com/Leonxlnx/taste-skill --skill design-taste-frontend
npx skills add supabase/agent-skills --skill supabase-postgres-best-practices
```

An installer may name the folder after the declared name rather than the repository folder,
so `taste-skill` arrives as `design-taste-frontend`. Rename the folder to match the first
column, or read the second column as the same skill wherever an agent names the first.
supabase/agent-skills also ships as a Claude Code plugin, and a plugin's skills load under the
plugin's prefix.

Two practical notes. The installer in this repository, `scripts/install.mjs`, copies only the
`team-*` and `stack-*` skills, so companions stay wherever you installed them. And if you kept
this repository's `scripts/check.mjs`, it allows companions under `.claude/skills/` and leaves
them unchecked: any folder that does not start with `team-` or `stack-` counts as one. Those
two prefixes are the team's, so a companion never takes either.

To give a role a new companion, add a line to its agent file naming the skill, the step it
serves and the words "if installed", and add a row to this page. Never add a companion to a
`skills:` list.

---

[Back to the README](../README.md) · [The workflow](WORKFLOW.md) · [Customising the team](CUSTOMISING.md)
