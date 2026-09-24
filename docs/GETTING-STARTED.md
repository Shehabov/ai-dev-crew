# Getting started

This page takes you from an empty folder, or a codebase you already have, to the end of a
first run. It assumes you have used Claude Code before. The team's operating manual is
[CLAUDE.md](../CLAUDE.md), and the stages and gates are set out in [WORKFLOW.md](WORKFLOW.md).

## What you need

| | |
|---|---|
| Claude Code | The `claude` command, signed in |
| git | Any recent version |
| node | 20 or later. The run machinery and the installer use only node's standard library. |

That is the whole core. The team never relies on a tool it has not been told about, and
`PROJECT.md § Toolchain` is where you tell it.

The default stack pack, [stack-nextjs-supabase](../.claude/skills/stack-nextjs-supabase/SKILL.md),
adds two things if you choose it at kickoff. The first is `@electric-sql/pglite`, a
development dependency that runs the offline database proof. The second is the Supabase MCP
server, through which the team changes and proves the database. It also expects npm and npx,
which come with node. Kickoff sets the pack up and asks before it installs anything.

## Start a new product

Both routes below end in the same place: a fresh repository that holds the team and none of
this repository's history.

On GitHub, open [Shehabov/dev-team](https://github.com/Shehabov/dev-team) and choose "Use
this template". GitHub creates a new repository from the current files, with no history.
Clone it and open the folder.

From the command line:

```bash
git clone --depth 1 https://github.com/Shehabov/dev-team my-product
cd my-product
rm -rf .git
git init
```

In PowerShell, `Remove-Item -Recurse -Force .git` takes the place of `rm -rf .git`.
Removing `.git` drops the team's history, so the first commit in the repository is yours.

The template carries the team, and also the files that describe the team to visitors of
this repository. The team needs these:

| Path | What it is |
|---|---|
| `.claude/` | The sixteen agents, the house skills, the stack pack and the settings |
| `.devteam/` | The run machinery: templates, the gate sync and the utilisation check |
| `CLAUDE.md`, `PROJECT.md`, `BUGS.md` | The operating manual, the project profile and the defect register |
| `templates/BRAND.md` | The brand spec template the design roles draft from |
| `docs/SKILLS.md` | The agents cite it for the companion skills they may use |

These are yours to keep or remove:

| Path | Note |
|---|---|
| `README.md`, `assets/`, and `docs/` apart from `docs/SKILLS.md` | They describe the team. Replace the README with your product's own. |
| `scripts/install.mjs` | Only needed to install the team into another project |
| `scripts/check.mjs`, `scripts/assets/`, `.github/workflows/check.yml` | This repository's own checks and art. The check tests this repository's layout, so if you remove the files it checks, remove the workflow too. |
| `LICENSE`, `SECURITY.md` | The team's MIT licence and its vulnerability policy. If your product takes another licence, keep the team's notice with the team's files, as the MIT licence asks. |

Make your first commit, then go to [The first session](#the-first-session).

## Add the team to an existing product

The installer copies the team into a project you already have. It never replaces a file of
yours without being asked, and some files it never replaces at all.

Clone this repository to a temporary folder, then run the installer against your project
with `--dry-run` first:

```bash
git clone --depth 1 https://github.com/Shehabov/dev-team /tmp/dev-team
node /tmp/dev-team/scripts/install.mjs ~/code/my-product --dry-run
```

Any temporary folder will do. Read what the dry run reports, then run the same command
without `--dry-run`. The target must be an existing folder, and it cannot be the checkout
itself.

```text
Usage: node scripts/install.mjs <target-dir> [--dry-run] [--force]

  <target-dir>  an existing project folder to install the team into
  --dry-run     report what would happen and write nothing
  --force       replace team files that differ from this checkout's copy
                (never PROJECT.md, BUGS.md, LICENSE-devteam or the target's own
                settings.json)
```

What it does with each kind of file:

| Files | When your project does not have them | When it does |
|---|---|---|
| Team files: `.claude/agents/`, every `team-*` and `stack-*` skill, `.devteam/bin/`, `.devteam/TEMPLATE/`, `.devteam/README.md`, `templates/BRAND.md`, `docs/SKILLS.md` | Copied | Left alone when identical. A file that differs is kept and listed, and `--force` replaces it. |
| `PROJECT.md`, `BUGS.md` | Copied | Never replaced, even with `--force`. Once kickoff has run they hold your answers and your defect history. |
| `CLAUDE.md` | Copied | Your own is left alone, and the team's manual is written beside it as `CLAUDE.devteam.md`. A `CLAUDE.md` that is an earlier copy of the team's manual is treated as a team file. |
| `.claude/settings.json` | Copied | Never modified, because it holds your permission rules. The team's settings are written beside it as `.claude/settings.devteam.json`. |
| `LICENSE` | Copied as `LICENSE-devteam` | Never replaced, even with `--force`. Your own `LICENSE` is never touched. |
| `.gitignore` | Created with `.devteam/runs/` | `.devteam/runs/` is appended, unless a line already covers it |

The team is MIT licensed, and the licence asks that its notice stays with copies of the
files, which is why `LICENSE-devteam` travels with them. The installer copies nothing else:
not this repository's README, docs, art or checks.

The report has one line per kind of file saying what happened to it, a count of files, the
list of files that differ and were kept, and a closing "Next" block. That block names the
command to start with, and says whether kickoff will run first.

### When your project has its own CLAUDE.md

The installer prints one line to add. Put it on its own, near the top of your `CLAUDE.md`,
so every session loads the team's manual:

```text
@CLAUDE.devteam.md
```

The manual imports `PROJECT.md` in its turn, so the one line brings in both.

### When your project has its own settings

The installer prints what to merge from `.claude/settings.devteam.json` into your
`.claude/settings.json`, and only what yours lacks. Typically that is:

- `"agent": "orchestrator"`, so the orchestrator is the main thread
- `"DEVTEAM_RUNS_DIR": ".devteam/runs"` under `"env"`
- the team's rules under `permissions.allow`, `permissions.ask` and `permissions.deny`

It also names any rule your own `allow` list grants that the team asks about or denies, so
you can decide whether to keep it. Until the `agent` line is merged, start sessions with
`claude --agent orchestrator`.

## The first session

Open Claude Code in the project folder:

```bash
cd my-product
claude
```

`.claude/settings.json` sets `"agent": "orchestrator"`, so the session you open is the
[orchestrator](agents/orchestrator.md). `claude --agent orchestrator` does the same
explicitly, and is the command to use when your settings do not carry the `agent` line yet.

The orchestrator is the main thread and the only role that dispatches. You talk to it. It
runs the other fifteen roles as subagents, and it brings back into the session every
decision that belongs to you. In the team's files you are the **Product Lead**: the one
person who can change scope, accept a release or overrule a gate.

The shipped settings allow reading, writing under `.devteam/`, the common git reads, npm
scripts and the team's own scripts. Commits, tags and pushes ask you first, and so does any
Supabase MCP tool that costs money or changes the project's setup. Force pushes, hard
resets, `rm -rf` and reading `.env`, `.env.local` and `.env.*.local` files are denied;
`.env.example` stays readable. [CUSTOMISING.md](CUSTOMISING.md#permissions)
covers changing them.

## Kickoff

While [PROJECT.md](../PROJECT.md) still carries a `TODO:` marker outside the worked example
in its closing comment, the orchestrator opens no run. It interviews you first. You can open
the session with your first brief; kickoff still comes before the plan.

It takes the twelve sections in the order they appear and asks about one at a time. For
each, it says in one line what the section is for and which roles read it, offers the
default where the section ships one, writes your answer in place of the marker, and reads
it back. It never renames, reorders or merges a heading, because every agent finds its facts
by heading. It never fills a section with a guess.

| Section | What you give it | Default |
|---|---|---|
| Product | What the product is, who uses it, and the one claim it must keep, in two to four sentences | none |
| Product Lead | Your name, or the name of whoever holds the role, and how an escalation reaches them | none |
| Stack | Front end, back end, database and hosting, with versions where they matter | From the stack pack, if you choose one |
| Commands | The command for install, dev, build, lint, typecheck, test, e2e and db test. `none` is a valid answer, and the role then skips that step and says so. | From the stack pack, if you choose one |
| Toolchain | What is installed, including any MCP servers, and what must never be assumed | From the stack pack, if you choose one |
| Stack pack | A `stack-*` skill from `.claude/skills/`, or `none`. The orchestrator suggests the one that matches your stack. | none |
| Locales | Every locale, the one authored first, and the ones written right to left | none |
| Brand | The path to the brand spec, and the folder of design references | `BRAND.md` |
| Product invariants | The rules that must never break, numbered I1, I2 and on | none |
| Quality bar | The widths to verify, the accessibility standard, the devices and browsers | 320, 360, 768, 1024 and 1440 wide; WCAG 2.2 AA |
| Release | The target, the branch and the tag format | `deferred: no target chosen` |
| House rules | Attribution, commit style, and anything else every agent must follow | No attribution anywhere |

Stack, Commands and Toolchain come before Stack pack in the file. When you choose a pack, its
setup offers its own values for them, for you to confirm or change.

Product invariants take the most thought. The orchestrator helps you state each one as a
rule that the data layer or the server can refuse to break, and names the layer that holds
it. "A user reads and writes only rows that belong to an account they are a member of, held
by row level security on every table" is an invariant. A rule only the client can hold is
still written down, with that limitation named.

The worked example at the end of `PROJECT.md`, visible in the source and hidden when the
file is rendered, shows the level of detail each section wants.

### Stack pack setup

When you name `stack-nextjs-supabase`, kickoff runs the pack's setup, as its
[Kickoff setup section](../.claude/skills/stack-nextjs-supabase/SKILL.md#kickoff-setup)
describes:

1. The MCP server. The orchestrator copies the pack's
   [mcp.json template](../.claude/skills/stack-nextjs-supabase/templates/mcp.json) to
   `.mcp.json` at the project root, or adds its `supabase` entry to an existing `.mcp.json`
   without removing any other server. It asks you for the project ref, the short id in your
   Supabase project's dashboard URL, and writes it in place of `<project-ref>`. The file
   holds no key and no token.
2. The offline proof. With your approval, it installs PGlite at the project root, creating
   a private `package.json` first if there is none:

   ```bash
   npm init -y
   npm pkg set private=true --json
   npm i -D @electric-sql/pglite
   ```

3. Ignore rules. It makes sure the root `.gitignore` covers `node_modules/`, `.env` and
   `.env.*`, with `!.env.example` so the example file is still committed.
4. Defaults. It offers the pack's values for Stack, Toolchain, Commands and Release, for you
   to confirm or change.

### Authorising the Supabase MCP

Claude Code reads `.mcp.json` when a session starts, so the server arrives in the next one.

1. Quit the session, and run `claude` again in the project folder.
2. Approve the project's `supabase` server when Claude Code asks.
3. Run `/mcp`, choose `supabase`, and sign in to Supabase in the browser window it opens.

The server authenticates through the browser, and the project ref scopes every call to one
project. `/mcp` shows its state at any time. If you skip this step, runs still open: the
toolchain pre-flight records `supabase MCP not authorised`, and the orchestrator holds every
stage that needs the server while it dispatches the rest.

Kickoff is done when no `TODO:` remains outside the worked example. The first run's ledger
then opens with a `run opened` line and a `kickoff` line naming the sections filled in.

## Your first brief

The brief is what you ask for, in a few sentences. The orchestrator copies it into
`run.json` word for word and builds the run's `done_means` from it, so the words are worth
choosing.

A good brief names:

- the change, in the product's own terms
- the surface it touches: a page, an endpoint, a table
- the outcome that makes it done, checkable against a file, a log or a screenshot
- any constraint that matters, such as an invariant, a locale or a date
- what is out of scope, so no role mistakes a gap for an oversight

The outcome is the part that cannot be missing. The orchestrator sends back a brief with no
checkable outcome and asks you for one, rather than invent it.

```text
Add a settings page where an account owner can change the account's display name and
its default currency. Members can see both values and cannot change them.

Done when an owner can save both fields in every locale, a member's attempt to change
either is refused by the database rather than only hidden in the interface, and the page
works at every width in the quality bar.

Out of scope: converting existing invoices to the new currency.
```

From there the orchestrator reads `PROJECT.md` and [BUGS.md](../BUGS.md), runs the toolchain
pre-flight and writes the plan. It plans only the roles the change needs and writes down why
each other role is left out. This brief changes a surface, its strings and the data layer, so
it plans the design track, both builders and every gate. A fix confined to the back end
would leave the three design roles and frontend-engineer out, each with a reason. It dispatches
[bug-historian](agents/bug-historian.md) first, so every role plans with the list of what
has already gone wrong on these surfaces, and then works through the stages. You hear from
it when a decision is yours.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="../assets/flow-dark.svg">
  <img src="../assets/flow-light.svg" alt="The delivery flow: the brief, the regression brief, architecture, the design and build tracks, four independent reviews, the regression guard, integration, testing, the quality gate, release and the record" width="100%">
</picture>

## What a run leaves on disk

Every run has its own folder, named `<yyyy-mm-dd>-<short-slug>`. A full run of the brief
above leaves roughly this:

```text
.devteam/runs/2026-10-01-account-settings/
├── run.json              the plan, the roles left out and why, the gates, the utilisation history
├── ledger.md             one line per event, from "run opened" to "run closed"
├── orchestrator/         plan.md with its audit, review.md, report.md
├── bug-historian/        brief.md, guard.md, record.md
├── tech-architect/       the ADR, brief-frontend.md, brief-backend.md, holds.md
├── ux-designer/          spec.md, string-slots.json
├── ux-auditor/           findings.md
├── ux-writer/            strings.md, one strings-<locale>.json per locale
├── backend-engineer/     files.md
├── frontend-engineer/    files.md
├── peer-reviewer/        verdict.json, comments.md
├── code-analyst/         findings.md
├── code-steward/         findings.md
├── security-analyst/     findings.md
├── engineering-lead/     verdict.md
├── qc-engineer/          test-log.md, defects.md
├── qc-lead/              readiness.md
├── release-engineer/     preflight.md, release-log.md, release-note.md, rollback.md
└── evidence/             toolchain-preflight.log, utilisation/, security/, regression/,
                          build.log, the test artefacts, release/
```

Every agent folder also holds its `plan.md` (steps 1 and 2 of the loop), its `review.md`
(step 4) and its handoffs. The first handoff is `handoff.json`, a later pass writes
`handoff-stage<N>.json`, and a fix round writes `handoff-stage<N>-round<R>.json`, so no pass
overwrites another.

The runs folder is gitignored and stays on the machine that ran it. What has to outlast a run
is carried into tracked files: defects and standing rules into `BUGS.md` by bug-historian,
decisions into the ADRs under `docs/decisions/` by tech-architect. `DEVTEAM_RUNS_DIR` in
`.claude/settings.json` moves the folder. [.devteam/README.md](../.devteam/README.md) explains
the machinery.

## Reading the run report

At close the orchestrator writes `orchestrator/report.md`, addressed to you. It carries:

- what changed, in one paragraph
- each agent, what it produced, and its gate result with the evidence path
- the roles left out of the plan, and why
- the final utilisation table, one row per planned entry
- the three gates certified by the role that produced the work, and where each was checked
  downstream
- every acceptance you gave in the run, with its ledger line
- every carried threshold breach engineering-lead accepted
- what was left undone, and why
- what is knowingly untested, and the risk it carries
- every decision that needs you, with options and a recommendation

Read the last three first. They are where the run tells you what it did not do, and what it
cannot decide without you.

The report is backed by files you can check. `ledger.md` is the event log. The utilisation
check reads only the plan and the handoffs, and never writes, so you can run it yourself:

```bash
node .devteam/bin/utilisation-check.mjs .devteam/runs/2026-10-01-account-settings
```

It exits 0 when every planned role ran, every output was consumed and every gate was
resolved by its owner. Any finding is printed with its code, such as `NEVER_RAN` or
`UNUSED_OUTPUT`.

## Accepting a release

When a run ships, the release happens at stage 11, before the report is written.
release-engineer runs its pre-flight, applies the data layer the way the stack pack says,
builds, tags and pushes.
Each commit, tag and push asks you first through Claude Code's permission prompt, so nothing
leaves the machine without your say. While `PROJECT.md § Release` reads
`deferred: no target chosen`, nothing is deployed to hosting, and that is recorded rather
than failed.

Acceptance is yours alone. When you have read the report, reply in the session: accept it,
or say what you do not accept and why. The orchestrator appends a `decision` line to
`ledger.md` that quotes your words. An acceptance that exists only in the conversation does
not count, so if the ledger has no line for it, ask for one.

If a release has to come back, ask for a rollback. The orchestrator dispatches
[release-engineer](agents/release-engineer.md), the only role that rolls back, against the
plan it wrote in `release-engineer/rollback.md`.

## When a stage blocks

A blocked stage is the team working as intended. A role that cannot do its work properly
stops and says why rather than guess, and the orchestrator brings the reason to you when the
decision is yours. These are the four you will meet most.

### A fact is missing from PROJECT.md

The agent hands off `blocked` and names the section and the fact in `missing_inputs`, for
example `PROJECT.md § Locales: which locale is authored first`. The orchestrator asks you,
writes your answer into that section, logs it and dispatches the agent again. Answer in the
session. If you do not know yet, say so: the orchestrator holds only the work that depends
on the answer.

### The MCP server is not authorised

It shows at run open, as a pre-flight line such as
`list_tables (supabase MCP)  auth error  supabase MCP not authorised`, or mid-run, as an
agent's `blocked` handoff with the same reason. The agent runs whatever offline proof its
stack pack defines and never fakes the rest.

Run `/mcp` and sign in. If `supabase` is not listed at all, check that `.mcp.json` is at the
project root, then quit and start the session again. Then ask the orchestrator to re-run the
pre-flight. It dispatches the held stages once the check answers.

### A rejection loop reaches three

A reviewer that rejects work numbers the round. Three rounds between the same two roles on
the same finding is the limit. The orchestrator dispatches no fourth round. It brings you
both positions and its recommendation, and you choose. When two roles keep rejecting each
other, the contract between them is often wrong, so the orchestrator may put the question to
[tech-architect](agents/tech-architect.md) before it reaches you.

### You want to overrule a gate

Only you can. The usual cases are waiving a major design finding, accepting a known risk and
shipping with a defect carried. Say it in the session, in writing, with your reason. The
orchestrator records your words as a `decision` line, the roles that rely on the decision
cite that line, bug-historian records an accepted risk or a carried defect in `BUGS.md`, and
the run report lists every acceptance. The orchestrator never writes a result into a gate
another role owns, even on your word. A brand rule that has to break is the same kind of
decision, and nobody else can make it.

---

[Back to the README](../README.md) · [Customising the team](CUSTOMISING.md) · [The workflow](WORKFLOW.md)
