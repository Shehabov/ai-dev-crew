# Customising the team

The team is a set of plain files: agent definitions, skills, a profile, a manual and a few
node scripts. Everything on this page is an edit to one of them. Start with
[GETTING-STARTED.md](GETTING-STARTED.md) if the team is not installed yet.

One rule runs through all of it. Agents find a fact by its `PROJECT.md` heading, a gate by
its literal name, and a stack pack section by its title. Change what sits under a name
freely, and rename nothing that another file points at.

## The project profile

[PROJECT.md](../PROJECT.md) holds every fact about your product that is not true of every
product. Edit it whenever something changes. Agents read it at step 1 of every task, so a
change takes effect at the next dispatch, and because agents cite a section rather than copy
its value, one edit reaches every role.

- Keep the twelve headings, their names and their order. A renamed heading is a fact no
  agent can find.
- `none` is a valid value in Commands and Stack pack. A role that meets it skips the step
  and says so in its evidence.
- Add a new invariant at the end of Product invariants rather than renumbering, because
  ADRs, findings and `BUGS.md` cite invariants by number.
- To be asked about a section again, put a `TODO:` marker back in it. The orchestrator runs
  kickoff for every section that carries one before it opens the next run.

A role that needs a fact the profile does not hold hands off `blocked`, with the section
named in `missing_inputs`. The fix is always the same: add the fact to the section.

## The brand spec

The design roles take every colour, spacing value, radius, duration and type size from the
brand spec at the path in `PROJECT.md § Brand`, `BRAND.md` by default. No role invents one.

### Writing it yourself

1. Copy [templates/BRAND.md](../templates/BRAND.md) to the path in `PROJECT.md § Brand`.
2. Replace every `TODO:` with a decision. Keep every section, and write `none` with a reason
   in one that does not apply. Inside a block, delete a token the product will not use
   rather than leave it as `TODO:`. Keep every JSON block valid, because scripts read them.
3. Fill the header at the top: `status: approved`, the version, the date and the approver.

The template's thirteen numbered sections run from identity and design tokens through
contrast, type, motion, the mark, icons, components, charts and voice to bans, right to left
and a changelog. When a value changes later, change it in the spec, never in a component,
and add a row to the changelog with who approved it.

### When there is none

If there is no brand spec, or only the untouched template, [ux-designer](agents/ux-designer.md)
drafts one at the start of the first run that changes a surface. It fills the template from
the design references folder named in `PROJECT.md § Brand`, records beside each value the
reference it came from, and measures the contrast of every proposed pair with a node
script. It marks the draft `status: proposed` and hands off `escalated`, asking you to
approve it and naming the values that most need your decision (the accent, the type stack,
the status colours), each with a recommendation.

A proposed spec binds nothing. Design work may carry on against it so it is ready when you
approve, but [ux-auditor](agents/ux-auditor.md) fails the design gate until you do, and
everything that gate blocks waits. To approve, say so in the session. The orchestrator
records your word in the ledger, and only then does the status line become
`status: approved`. No agent changes it on its own authority.

If the references folder is empty or missing as well, there is nothing to draft from.
ux-designer hands off `blocked`, naming `PROJECT.md § Brand` in `missing_inputs`, and never
invents a palette to fill the gap.

The references set structure and feel: anatomy, density, hierarchy and interaction. Once the
spec is approved, a design that cites a reference image as the reason for a value is a
defect.

## Choosing a stack pack

A stack pack is a skill that tells the stack-dependent roles how to build and prove work on
one particular stack: where the code lives, how the data layer is changed and proved, which
probes the security gate runs, and how a release goes out. `PROJECT.md § Stack pack` names
one pack, or `none`.

| Choice | What happens |
|---|---|
| `stack-nextjs-supabase` | The default pack. A Next.js App Router app in `web/`, a Supabase back end changed only through hand-authored migrations, applied and proved through the Supabase MCP, with an offline proof on PGlite. See [its SKILL.md](../.claude/skills/stack-nextjs-supabase/SKILL.md). |
| A pack you wrote | Anything under `.claude/skills/stack-*/` that follows the contract below |
| `none` | The stack-dependent roles work from `§ Stack`, `§ Commands` and `§ Toolchain` |

The stack-dependent roles are tech-architect, backend-engineer, frontend-engineer,
code-analyst, security-analyst, engineering-lead, qc-engineer, qc-lead and release-engineer.
Each reads the named pack by path, at `.claude/skills/<pack>/SKILL.md`, at step 1. No agent
preloads a pack, so a project on another stack never carries the wrong one.

With `none`, the gates do not relax: every role still needs evidence, and it takes that
evidence from the commands you gave. The pre-flight checks git, node, every tool
`§ Toolchain` lists as present, and the Playwright MCP server when that section lists it.
There is no offline database proof unless `§ Commands` names a `db test` command, and
security-analyst runs its access probes against a build started with the `dev` command. The
more precise your Commands and Toolchain sections, the more the team can prove.

To switch packs on a project that is already running, put a `TODO:` back in
`§ Stack pack`. At the next kickoff the orchestrator asks which pack applies and runs its
setup, and you review `§ Stack`, `§ Commands` and `§ Toolchain` against it.

## Writing a stack pack

A pack is a folder, `.claude/skills/stack-<name>/`, with a `SKILL.md` and whatever scripts
and templates it needs beside it. The frontmatter has two fields: `name`, equal to the folder
name, and `description`, which says when to use the pack and must stay under 1024
characters, or the skill will not install. The shipped settings already allow
`node .claude/skills/*/scripts/*`, so a script in the pack's `scripts/` folder runs without a
prompt.

The default pack is the model. Every part of the contract below has a home in it, named in
the last column:

| Part | What it says | Who relies on it | In the default pack |
|---|---|---|---|
| When to use | Which role reads which sections, and at which step | Every stack-dependent role | When to use this pack |
| Setup | What kickoff does once: config files from the pack's templates, dependencies to install (always asked first), ignore rules, and the values to offer for `§ Stack`, `§ Toolchain`, `§ Commands` and `§ Release` | The orchestrator, at kickoff | Kickoff setup |
| Pre-flight | Each check, its command or call, when it passes and what to do when it fails, plus which plan entries need each server | The orchestrator, at run open | Pre-flight at run open |
| Toolchain | What is present, the route for each job, the evidence file names, what to do when a tool does not answer (with the exact `blocked` reason), and what the team leaves to the Product Lead | Every role that runs a tool | Toolchain |
| Layout | Where the app, the data layer's source of record, the tests, the seed, server functions and the string catalogue live | tech-architect and the builders | Repository layout, The app in web/ |
| Commands | The command set to offer for `§ Commands` | The orchestrator, and every role through `§ Commands` | Kickoff setup, step 4 |
| The data layer | The source of record, and how a change is written, proved offline, proved on the target, applied once, verified by listing and reversed | backend-engineer, engineering-lead, qc-engineer, qc-lead, release-engineer | Migrations, The offline proof, pgTAP |
| Access control | How each product invariant is held in the lowest layer, and the traps that make that unsafe | tech-architect, backend-engineer, the reviewers | RLS first, RLS traps |
| Security probes | The privileged key names for the history scan, the queries that show what a client can reach, probes as each role inside a transaction that rolls back, and the same probes from outside | security-analyst, qc-engineer, qc-lead | Security probes |
| Release | The release sequence on this stack, and its rollback | release-engineer | Release on this stack |
| Checklist | backend-engineer's step 4 list, one evidence path a line | backend-engineer | Before handing off |
| Never | The tools the team never uses on this stack | Every role | Toolchain |

A few things make a pack work in practice.

- Keep the default pack's section titles where the concept is the same. The orchestrator
  looks for a setup section and a pre-flight section, and every plan cites sections by
  title, so once a pack is in use its titles do not change.
- Write evidence file names and the `blocked` reason exactly, because agents copy them
  literally. The default pack's reason is `supabase MCP not authorised`.
- Say what the offline proof cannot prove, so nobody reads an offline pass as a pass on the
  target.
- Run every command in the pack at least once before you publish it. That is standing rule
  SR-09 in [BUGS.md](../BUGS.md).
- If the pack talks to an MCP server, ship a config template with a placeholder for the
  project id and no secret in it, as the default pack does with
  [templates/mcp.json](../.claude/skills/stack-nextjs-supabase/templates/mcp.json). Kickoff
  adds its entry to the root `.mcp.json` by server name, beside the team's `playwright`
  entry, and never replaces the file.
- Add the pack's tools to `§ Toolchain` as present, and their permission rules to
  `.claude/settings.json`.

The installer copies every `stack-*` folder, so a pack you write travels with the team. If
you kept this repository's `scripts/check.mjs`, add the folder name to its `STACK_PACKS`
list, or the check reports the folder as not in the layout.

## MCP servers

No agent carries a `tools` list, and that is deliberate.

| Agent | Tool policy | What reaches it |
|---|---|---|
| [orchestrator](agents/orchestrator.md) | No `tools` field and no `disallowedTools` | Every tool the session has, including the Agent tool and every MCP server |
| The two QA roles: [qc-engineer](agents/qc-engineer.md), [qc-lead](agents/qc-lead.md) | `disallowedTools: Agent` | Every tool except dispatching, including every MCP server and the shipped Playwright server |
| The four reviewers: [peer-reviewer](agents/peer-reviewer.md), [code-analyst](agents/code-analyst.md), [code-steward](agents/code-steward.md), [security-analyst](agents/security-analyst.md) | `disallowedTools: Agent, Edit, NotebookEdit, mcp__playwright` | Every tool except dispatching, editing and the Playwright server. They write their findings under the run folder and never edit the code they review. |
| Every other agent | `disallowedTools: Agent, mcp__playwright` | Every tool except dispatching and the Playwright server, including every other MCP server |

So a server you connect, in the project's `.mcp.json` or in your own Claude Code
configuration, reaches every role that could use it without an agent file changing. A
database server reaches the builders and the probes, and a design server reaches the design
roles.

The Playwright server in the shipped `.mcp.json` is the one exception. It reads pages, and
page text is untrusted input, so qc-engineer and qc-lead are the only dispatched roles that
hold it, and every agent but those two and the orchestrator disallows it by name.
`disallowedTools` narrows dispatched roles only: the main thread and any built-in agent still
inherit it, so the permission rules below are the control, as
[team-test-protocol](../.claude/skills/team-test-protocol/SKILL.md) (The MCP session) sets
out.

What a role does with a server is set by its charter and the stack pack rather than by its
tool list. The orchestrator's only MCP call is one read at pre-flight. The reviewers read and
probe and never change anything. Only release-engineer releases.

To keep a role away from a server, add that server's tool names to the role's
`disallowedTools`. For example, peer-reviewer does not need the database at all:

```yaml
disallowedTools: Agent, Edit, NotebookEdit, mcp__supabase__apply_migration, mcp__supabase__execute_sql
```

Before you narrow a role, check the stack pack's pre-flight section, which lists the plan
entries that need its server.

When you add a server, list it as present in `PROJECT.md § Toolchain`, so the pre-flight
checks it and roles may rely on it, and give its tools permission rules as below.

## Permissions

[.claude/settings.json](../.claude/settings.json) holds three lists.

| List | What the shipped file puts there, in short |
|---|---|
| `allow` | Reading and searching, writing under `.devteam/`, the common git reads, `git add` and `git stash`, npm installs and scripts, `npx` for TypeScript, Next.js, Vitest, Playwright and the app scaffold, the team's scripts, `claude mcp list` for the pre-flight, the Supabase MCP tools that read, prove and apply, and the Playwright MCP server's tools |
| `ask` | `git commit`, `git push`, `git tag`, `gh pr`, `gh release`, `npm publish`, the Supabase MCP tools that cost money or change the project's setup, the two Playwright tools that hand a file to a page (`browser_file_upload`, `browser_drop`), and any edit under `.devteam/bin/`, whose scripts run without a prompt |
| `deny` | Force pushes, `git reset --hard`, `git clean -fd`, `rm -rf`, reading `.env`, `.env.local`, `.env.*.local` and `secrets/` folders anywhere in the tree, the Playwright tool that runs code in the server's own process (`browser_run_code_unsafe`), and reading Claude Code's credential store (`Read(~/.claude/.credentials.json)`): it holds the sign-in and the MCP servers' OAuth tokens, and a page the browser reads can ask an agent for them. `.env.example` stays readable, because release-engineer and security-analyst check it. |

Change them to match your stack. A project whose Toolchain lists pnpm adds rules such as
`Bash(pnpm run:*)`. A new MCP server's read tools usually belong in `allow`, and anything
that deploys, deletes or costs money in `ask`. Keep commits, tags and pushes in `ask` and
the deny list as it is, because they are the last point at which you see what leaves the
machine. Rules for your machine alone go in `.claude/settings.local.json`, which is personal
to you and is not committed.

The same file sets `DEVTEAM_RUNS_DIR`, the folder runs are written to,
`"agent": "orchestrator"`, which makes the orchestrator the main thread, and
`enabledMcpjsonServers`, which approves the shipped `playwright` server once the folder is
trusted.

## Models

Every agent ships with `model: inherit`, so the whole team runs on the session's model, and
`/model` changes it for every role at once. To pin one role, change that line in its file to
an alias Claude Code accepts, such as `opus`, `sonnet` or `haiku`.

The gates depend on careful reading. If you move a role to a smaller model,
choose one whose work an independent gate checks next: ux-designer, backend-engineer,
frontend-engineer and qc-engineer each have one after them. Keep the gate owners on the
model whose judgement you trust most.

## Adding or removing a role

Most of the time you want neither. The orchestrator already right-sizes every run: it plans
only the roles a change needs and records a reason in `omitted` for each one it leaves out.
Change the roster only for a role your product always needs, or never will.

### Adding a role

1. Write `.claude/agents/<name>.md`. The frontmatter has `name` equal to the file name, a
   `description` that says when to invoke it, `model: inherit`, no `tools` field,
   `disallowedTools: Agent, mcp__playwright` (plus `Edit, NotebookEdit` if it reviews code
   it must not change, and without `mcp__playwright` only if it tests in a browser the way
   the QA roles do), and `skills:` as a YAML list that starts with `team-protocol` and
   names only skills that exist under `.claude/skills/`, never a stack pack. Give the body
   the shape the other agents have: its authority, what it owns and its definition of done,
   its inputs and outputs, the five-step loop for its role, its gate if it has one, when it
   escalates, and its hard rules. Its run artefacts go under `.devteam/runs/<run-id>/<name>/`.
2. Add its entry to the run plan template: stage, agent, task, consumes, produces and
   `blocked_by`. The template is a JSON block that appears in both
   [orchestrator.md](../.claude/agents/orchestrator.md) and
   [team-orchestration](../.claude/skills/team-orchestration/SKILL.md), and the two must
   stay byte for byte identical. Give it `bug-historian/brief.md` to consume, and make at
   least one later entry consume what it produces, or the utilisation check raises
   `UNUSED_OUTPUT` against it.
3. Add a row to the right-sizing table in both files, saying when the role is planned.
4. If it owns a gate, add the gate to the template's `gates` with its owner and the entries
   it blocks, and add the gate's name to each of those entries' `blocked_by`. Add a row to
   the gate table in `team-orchestration` with the pass condition, state the gate under its
   own heading in the agent's file, and add it to the list of gate owners in the
   orchestrator's "What you never do". The scripts need no change, because
   `sync-gates.mjs` and `utilisation-check.mjs` read the gates from each run's `run.json`.
   A name missing from `gates[]` raises `UNKNOWN_GATE`, and a result recorded by anyone
   other than the owner raises `GATE_SELF_CERTIFIED`.
5. Update [CLAUDE.md](../CLAUDE.md): the org chart, the team table, the delivery flow and
   the gate count.
6. Update its neighbours. Every role that consumes its output names it in its inputs table.

### Removing a role

1. Remove its entries from the run plan template in both files, and its right-sizing row.
2. Remove its artefacts from every other entry's `consumes`.
3. If it owns a gate, remove the gate and every `blocked_by` and `blocks` that names it.
   A removed gate is a check nobody makes any more, so decide who holds that guarantee now,
   and record the decision, for example in `PROJECT.md § House rules`, so the team knows
   the check is gone on purpose.
4. Find every other mention with `git grep -n "<name>"` and update `CLAUDE.md` and the
   agents that name it.
5. Delete the agent file.

Keep the orchestrator. It is the only role that dispatches, writes the ledger and runs the
utilisation check, and a run without it has nothing to prove that the gates held.

If you kept this repository's own files, update them too: `TEAM`, and `GATES` for a gate,
in `scripts/assets/team.mjs`; `EXPECTED_AGENTS` in `scripts/check.mjs`; the role's page in
`docs/agents/`; and its cover in `assets/agents/`, rebuilt with
`node scripts/assets/build.mjs`. Then run `node scripts/check.mjs`, which compares the two
copies of the plan template and checks every gate's owner and blocked roles against the
plan.

## Companion skills

Companion skills are third-party skills that add craft to particular roles: interface and
design guidance, writing guidelines, and Supabase and Postgres practice. They are optional
and not vendored. [SKILLS.md](SKILLS.md) lists each one, where it comes from and which roles
can use it. Install them the way you install any Claude Code skill.

A companion may sit in the project's own `.claude/skills/`, beside the team's skills. That is
allowed. `scripts/check.mjs` treats any skill folder that does not start with `team-` or
`stack-` as a companion and leaves it unchecked, because it is someone else's work. The
`team-` and `stack-` prefixes stay reserved for the team, so do not give a companion either.

An agent names a companion in its body, "if installed", at the step it serves, and never in
`skills:`, because every skill in `skills:` must exist in the repository. A companion that is
not installed changes nothing about the step: the team's own skills carry the rule, and the
agent notes the absence in its `review.md`. Where a companion disagrees with the brand spec,
the brand spec wins. Where it disagrees with
[team-design-system](../.claude/skills/team-design-system/SKILL.md) on anatomy, density or
states, the design system wins. Every departure is recorded as an override in the agent's
`review.md`, as [team-brand-guard](../.claude/skills/team-brand-guard/SKILL.md) sets out.

To give a role a new companion, add a line to its body naming the skill, the step it serves
and the words "if installed", and add the skill to `docs/SKILLS.md`.

## House rules

`PROJECT.md § House rules` holds the rules every agent follows that are particular to your
project. It ships with three rows.

| Row | Default | Change it when |
|---|---|---|
| Attribution | None. No co-author line, no generated-by line and no mention of any tool or model, on any commit, tag, pull request, release note, code comment or document. | Your organisation wants a different policy. Write the policy you want in plain words; hard rule 1 in `CLAUDE.md` follows whatever this row says. |
| Commit style | `TODO:` until kickoff | You want a particular subject length, tense or body |
| Anything else | `TODO:` until kickoff | Any rule that should bind every role, such as a spelling convention for comments and documents |

A house rule applies from the next dispatch. The attribution row instructs the agents.
Claude Code also has attribution settings of its own, so if you want its default commit
trailer off at the source as well, set that in `.claude/settings.json` as the Claude Code
settings documentation describes.

---

[Back to the README](../README.md) · [Getting started](GETTING-STARTED.md) · [Skills](SKILLS.md)
