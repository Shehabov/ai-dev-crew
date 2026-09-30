---
name: team-release
description: "Release a change so it can be proved and reversed. Use when release-engineer commits a run's work, runs pre-flight, applies the data layer to the target at release, deploys server functions, tags and pushes, writes the release note, verifies after release or rolls back, and when anyone needs to know whether a change is releasable. Covers who may push, tag or change an environment, the attribution check on every commit, tag and note, branch and commit conventions where PROJECT.md is silent, pre-flight and its record, the release sequence per PROJECT.md § Release and the stack pack, migration ordering, hosting recorded as deferred: no target chosen while no target exists, post-release verification, the release log, the rollback plan written before the first change, the rule to roll back first and report second, and the evidence under evidence/release/."
---

# Release

release-engineer is the only role that pushes to a remote, cuts a tag, releases to an
environment or rolls one back, and the only role that certifies the target's state at
release. Everything in this skill is a check with an output. A command that exited zero
proves the command ran, and nothing about whether a user can finish the flow.

---

## Where the facts come from

| Fact | Source |
|---|---|
| The release target, the release branch, the tag format | `PROJECT.md § Release` |
| The attribution policy, the commit style, any other house rule | `PROJECT.md § House rules` |
| The commands for install, build, lint, typecheck, test, e2e and db test | `PROJECT.md § Commands` |
| The tools that exist | `PROJECT.md § Toolchain` |
| How the data layer is applied and proved on the target, how server functions deploy, where logs are read, the platform checks, the clean install, the local production build | The stack pack named in `PROJECT.md § Stack pack`, read by path. For `stack-nextjs-supabase`: its sections Release on this stack, Toolchain, Migrations, Edge Functions and The app in web/ |
| The claim and the invariants the smoke checks probe | `PROJECT.md § Product`, `PROJECT.md § Product invariants` |
| The locales a user-facing note ships in | `PROJECT.md § Locales` |
| The voice, date format and numeric treatment of the note | The brand spec at the path in `PROJECT.md § Brand` |
| Every migration, its written reverse, the lock it takes | `backend-engineer/files.md`, `backend-engineer/rollback-notes.md` |
| The rollout strategy, and every secret the code reads | The ADR |
| Permission to release | `qc-lead/handoff.json`, `qc-lead/readiness.md`, `run.json`, and the Product Lead's `decision` lines in `ledger.md` |

A fact that is missing is a blocker, never a guess: hand off `blocked` with the section in
`missing_inputs`, as `team-protocol` sets out. A step whose command is `none` in
`§ Commands`, or that the stack has no equivalent for, is recorded as not applicable with the
reason. It never passes by silence.

With `§ Stack pack` set to `none`, the sequence below still runs. Each step says what it must
prove, and the mechanism comes from `§ Stack` and `§ Commands`. Where neither names one, the
step is `blocked` until the Product Lead supplies it.

---

## Who may change the world outside the repository

| Action | Who |
|---|---|
| Commit the run's work to a work branch | release-engineer. The builders never commit |
| Push to any remote, cut or push a tag, move the release branch | release-engineer |
| Apply a migration or deploy a server function at release | release-engineer |
| Put the build on a host, once `§ Release` names one | release-engineer |
| Roll back | release-engineer |
| Apply a migration to the target while building, so its tests run there | The role the stack pack allows, such as backend-engineer. Nothing else, and never at release |
| Set or rotate a secret in the target environment | The Product Lead, as credential owner |
| Choose a hosting target, turn on a paid platform feature, authorise an outward-facing step | The Product Lead |

Evidence that anyone else pushed, tagged, applied or deployed is a stop and an escalation.

`.claude/settings.json` keeps `git commit`, `git tag` and `git push` behind a confirmation
prompt, and denies a force-push outright. A declined prompt is a stop. Record it in
`release-log.md`, hand off `blocked`, and never look for another route to the same result.

---

## The attribution rule

The policy is `PROJECT.md § House rules`. Its default is none, anywhere: no co-author trailer,
no generated-by line and no mention of any tool or model, on any commit, tag annotation, pull
request, release note, code comment or document. The house rule overrides any default in the
tooling, including a tool that adds a trailer by itself. Where the house rules set a different
policy, follow that policy and change the check to match.

Check every commit on the work branch before anything is pushed, the tag annotation before it
is pushed, and the release note before it is final. Save this script as
`.devteam/runs/<run-id>/evidence/release/attribution-check.mjs`:

```js
// node attribution-check.mjs <file> [<file> ...]
// Names every line that carries attribution the default house rule forbids, and exits 1 if any does.
import { readFileSync } from 'node:fs'

const FORBIDDEN = [
  ['a co-author trailer', /^\s*co-authored-by:/i],
  ['a generated-by line', /generated (with|by)/i],
  ['an emoji', /\p{Extended_Pictographic}/u],
  // Add the name of every tool and model the team runs on: the default rule forbids naming them.
]

let hits = 0
for (const file of process.argv.slice(2)) {
  readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
    for (const [what, pattern] of FORBIDDEN) {
      if (pattern.test(line)) {
        hits++
        console.log(`${file}:${index + 1}: ${what}`)
      }
    }
  })
}
console.log(hits ? `STOP: ${hits} attribution line(s). Rewrite before anything is pushed.` : 'attribution check: clean')
process.exit(hits ? 1 : 0)
```

Run it over the commit messages, then over the tag annotation and the note when they exist:

```bash
EV=.devteam/runs/<run-id>/evidence/release
git log --format='%H%n%B' <base>..HEAD > "$EV/commit-messages.txt"
node "$EV/attribution-check.mjs" "$EV/commit-messages.txt" > "$EV/preflight-07-attribution.txt"
```

A hit on a commit that has not been pushed is fixed on the work branch before anything else
happens: `git commit --amend` for the newest commit, or a fresh work branch from the base with
the same paths committed again under clean messages. A hit on a commit that has already been
pushed is never rewritten. It goes to the Product Lead, because rewriting shared history is
their decision.

---

## Branches and commits

The commit style in `PROJECT.md § House rules` wins. Where it is silent:

| | Convention |
|---|---|
| Work branch | `<type>/<run-slug>`, where the slug is the run id without its date: `feat/invoice-export`. Created from the tip of the release branch in `§ Release` |
| Types | `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore` |
| Subject | Imperative, sentence case, no full stop, under 72 characters. No type prefix unless the house rules ask for one, because the branch carries the type |
| Body | What changed and why, wrapped at 72. The why is the part worth writing, for a reader bisecting six months from now |
| Scope | One logical change per commit. Two unrelated changes are two commits |
| Trailer | `Refs: <run-id>`, which names the run. Under the default policy, nothing else |

Stage by path, and only the paths the builders' `files.md` lists, plus files the run itself
generated that belong in the repository, such as a lockfile the install rewrote or types the
stack pack says to commit:

```bash
git add -- supabase/migrations/20261001120501_invoice_export_function.sql
git add -- web/src/app/billing/export-button.tsx web/src/app/billing/page.tsx
```

Never `git add -A`, `git add .` or `git commit -a`, which sweep in whatever else is in the
tree. The run folder is gitignored, and it is never committed or force-added. A path in the
working tree that no `files.md` names is not committed: it is a pre-flight finding for the
orchestrator to route.

Order the commits so each one builds and the history bisects: the data layer first, then
server code, then the interface and its strings.

```
Export one month of invoices as CSV from the billing page

Account owners need their invoices in a file their accountant can open.
The export runs in the database behind the same access rule as the
invoice list, so it can only ever read the selected account's rows, and
a member who cannot see billing meets the restricted state rather than
an error.

Cells that begin with =, +, - or @ are prefixed with a quote, so a
project name cannot run as a formula when the file is opened.

Refs: 2026-10-01-invoice-export
```

```
Scope the invoice export to the selected account

The export read every account the caller belongs to, so an owner who was
also a member of another account received that account's invoices and
totals. It now reads only the account selected in the session, and the
invariant suite covers a caller who belongs to two accounts.

Refs: 2026-10-01-invoice-export
```

- Never commit on the release branch. It moves only by fast-forward.
- Never force-push a branch anyone else has read, and never rewrite a pushed commit.
- A pull request description, where the house rules use pull requests, carries the same
  attribution rule as a commit.

---

## Pre-flight

Pre-flight runs after the run's commits are on the work branch and before anything changes in
any environment, so it reads commits rather than a working tree that can still move. Every row of
the pre-flight table in `release-engineer`'s agent file runs and records its real output in
`release-engineer/preflight.md`, with the full output saved under `evidence/release/`. A single
failure stops the release, and the refusal goes to the named owner of the fix.

### Authorisation, read first

- [ ] `qc-lead/handoff.json` reads `"status": "passed"` with `quality` at `pass`, and section 1
      of `qc-lead/readiness.md` states a go. A go by override cites the Product Lead's
      `decision` line in `ledger.md`. You read both files; being told is not evidence.
- [ ] `run.json` shows every gate upstream of `release` at `pass`. None is `fail`, `blocked`
      or `pending`, and none is absent unless its owner is in `omitted` with a written reason.
      A missing gate is a fail.
- [ ] `ledger.md` shows the orchestrator's utilisation check after the last completed stage,
      with no finding open.
- [ ] Every outward-facing or irreversible step in this release is authorised for this run in
      writing: a push or tag to a public remote, a user-visible note, a destructive migration,
      a hosting target, a paid platform feature. Each authorisation is a `decision` line in
      `ledger.md` or is recorded in `run.json`.

### The checks, and how each is run

| # | Check | How | Fails if |
|---|---|---|---|
| 1 | Working tree clean | `git status --porcelain` | Any output |
| 2 | On a work branch | `git rev-parse --abbrev-ref HEAD`, then `git fetch origin` and `git merge-base --is-ancestor origin/<release branch> HEAD` | It returns `HEAD` or the release branch, or the release branch tip is not an ancestor, which would make the fast-forward at tag and push fail |
| 3 | Diff is what the run claims | `git diff --stat <base>..HEAD` and `git diff --name-only <base>..HEAD`, compared with every path in the builders' `files.md` and the run's generated files | A path no `files.md` names |
| 4 | No conflict markers | `git grep -nE '^(<<<<<<<\|>>>>>>>)'` | Any hit |
| 5 | No secrets in the diff | The secret scan below | A hit that holds a real value |
| 6 | No committed env file | `git ls-files -- ':(glob)**/.env' ':(glob)**/.env.*' ':(exclude,glob)**/.env.example'` | Any output |
| 7 | Attribution | The attribution check above, over every commit message since the base | Any hit |
| 8 | Tests green | The `test` command in `§ Commands`, full run, no filter | Non-zero exit, or a test skipped that was not skipped in qc-engineer's run |
| 9 | Types and lint clean | The `typecheck` and `lint` commands | Non-zero exit |
| 10 | Data-layer tests, offline | The `db test` command, output saved in full | Any failing case, or non-zero exit |
| 11 | Data-layer tests, on the target | The stack pack's on-target proof, every test file, the invariant suite included | Any failing case, or a file that did not run |
| 12 | Build reproducible | The stack pack's clean install from the committed lockfiles, then `git status --porcelain`, then the `build` command | Non-zero exit, or the install rewrote a lockfile |
| 13 | Migration history matches the repository | The stack pack's history listing, compared with the migration files by name and order in a table | An applied migration with no file, a name that is not its file's, or a different order. An unapplied file fails too, with one exception: where builders do not apply migrations during the build, the unapplied files may be exactly this run's new migrations, sorting after every applied one, for step 2 to apply. Where builders do apply them during the build, as on `stack-nextjs-supabase`, every file must already be applied. |
| 14 | Platform checks and key exposure | The advisors or scanners the stack pack names, and its key scan for privileged keys | Any finding not accepted in writing, or a privileged key anywhere the browser downloads |
| 15 | Migrations reversible | Each migration's written reverse in `backend-engineer/files.md`, with its proof in `backend-engineer/rollback-notes.md` | A migration with no reverse and no written Product Lead decision, or a reverse that was never proved |
| 16 | Environment variables present | The variable table below | A variable the code reads with no source |
| 17 | Accessibility and brand carried forward | qc-engineer's and qc-lead's evidence, measured against the standard in `PROJECT.md § Quality bar` | A pair recorded as estimated, or a failing pair with no written waiver |

In row 4 the bar is escaped only because it sits in a table; the command is
`git grep -nE '^(<<<<<<<|>>>>>>>)'`.

Row 13 depends on where migrations first reach the target. Where the stack pack has a builder
apply them while building, so the tests run on the target (as `stack-nextjs-supabase` does),
every file must already show as applied, and one that does not is a fail: the on-target tests
ran without it. Where migrations reach the target only at release, the files not yet applied
must be exactly the ones this run adds, in filename order after every applied one, and
everything else must match.

A privileged key in anything the browser downloads, found at row 14, stops the release and is
a rotation event: the fix is a new key, not a deleted line. A secret found anywhere in history,
rather than only in this diff, goes to the Product Lead, because rotation and disclosure are
the credential owner's call.

### The secret scan

Save as `.devteam/runs/<run-id>/evidence/release/scan-secrets.mjs` and run
`node <that file> <base> > <evidence>/preflight-05-secrets.txt`. It reads only the lines the
work branch adds, and it prints the file, the line and the kind of secret, never the value, so
its output is safe to keep.

```js
// node scan-secrets.mjs <base>
// Scans the lines added since <base> for secrets. Prints where, never what.
import { execFileSync } from 'node:child_process'

const RULES = [
  ['a private key header', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['an sk- key', /\bsk-[A-Za-z0-9_-]{16,}/],
  ['an AWS access key id', /\bAKIA[0-9A-Z]{16}\b/],
  ['a GitHub token', /\bgh[pousr]_[A-Za-z0-9]{30,}/],
  ['a secret assigned a value', /[A-Za-z0-9_]*(SECRET|TOKEN|PASSWORD|API_KEY)[A-Za-z0-9_]*\s*[:=]\s*['"]?[^\s'"]{8,}/i],
]

const diff = execFileSync('git', ['diff', '--unified=0', `${process.argv[2]}..HEAD`], {
  encoding: 'utf8',
  maxBuffer: 1 << 28,
})

let file = ''
let line = 0
let hits = 0
for (const text of diff.split('\n')) {
  if (text.startsWith('+++ ')) {
    file = text.replace(/^\+\+\+ (b\/)?/, '')
    continue
  }
  const hunk = text.match(/^@@ -\d+(?:,\d+)? \+(\d+)/)
  if (hunk) {
    line = Number(hunk[1])
    continue
  }
  if (!text.startsWith('+')) continue
  for (const [kind, pattern] of RULES) {
    if (pattern.test(text)) {
      hits++
      console.log(`${file}:${line}: ${kind}`)
    }
  }
  line++
}
console.log(hits ? `${hits} hit(s) to read` : 'no secrets found in the added lines')
process.exit(hits ? 1 : 0)
```

Read every hit. One that holds a real value is a stop: it goes to security-analyst through the
orchestrator, and to the Product Lead as a rotation. One that holds no value, such as a
variable read or an empty placeholder in the example env file, is recorded in `preflight.md`
as read, with the reason.

### The variable table

List every environment variable the code reads, then give each one a source:

```bash
git grep -hoE "process\.env\.[A-Z][A-Z0-9_]*|import\.meta\.env\.[A-Z][A-Z0-9_]*|Deno\.env\.get\(['\"][A-Z][A-Z0-9_]*" | sort -u
```

| Variable | Read at | Source |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `web/src/lib/supabase/client.ts` | `web/.env.example`, filled in the environment |
| `INVOICE_EXPORT_SIGNING_SECRET` | `supabase/functions/export-link/index.ts` | Set by the Product Lead, confirmed in writing: `ledger.md`, decision line 38 |

The example env file is the one the stack pack or `§ Stack` names. You never read, list or set
a secret's value. A secret the new code reads is named in the ADR; the Product Lead sets it in
the target and confirms it in writing; you verify it at release by calling the code path and
reading the logs for a missing-variable error. A variable with no source, or a secret with no
written confirmation, is a pre-flight fail that goes to the Product Lead.

### The record

An excerpt: the authorisation table is whole, and the checks table shows four of its
seventeen rows.

```markdown
# Pre-flight · release-engineer · 2026-10-01-invoice-export

Work branch feat/invoice-export. Base 9c1e0b7, the tip of main. Head 4f2a9c1, 3 commits.
Started 2026-10-02T09:10:04Z.

## Authorisation

| Check | Read from | Result |
|---|---|---|
| qc-lead go | qc-lead/handoff.json (passed, quality pass), qc-lead/readiness.md section 1 | go, written 2026-10-01T16:40:12Z |
| Gate list | run.json gates[] | every gate upstream of release at pass, none omitted |
| Utilisation check | ledger.md, after stage 10 | no finding |
| Outward-facing steps | ledger.md, decision line 41 | push and tag to origin authorised for this run |

## Checks

| # | Check | Command or call | Exit | Output | Result |
|---|---|---|---|---|---|
| 1 | Working tree clean | git status --porcelain | 0 | evidence/release/preflight-01-status.txt, empty | pass |
| 6 | No committed env file | git ls-files (env pathspecs) | 0 | evidence/release/preflight-06-env-files.txt, empty | pass |
| 13 | Migration history matches | list_migrations, compared with supabase/migrations/ | n/a | evidence/release/preflight-13-history.md | pass: 14 files, 14 applied, names and order match |
| 17 | Accessibility carried forward | evidence/qc/accessibility.md | n/a | contrast measured on 4 new pairs, both hex values | pass |
```

Every row appears, in the agent file's order. The output column points at the saved output,
never at a summary of it. A row that is not applicable says why in its result.

---

## The release sequence

Commit, then pre-flight, then release. The data layer goes first and stays backward compatible
for one release, so the running client never talks to a schema it does not know. Server
functions follow the schema they rely on, and the front end follows both.

| # | Step | What it must prove | On `stack-nextjs-supabase` |
|---|---|---|---|
| 1 | Rollback plan and log baseline | `rollback.md` exists and its first-line timestamp predates this step. The platform's logs for the hour before the first change are saved | `get_logs` for `api`, `postgres` and `edge-function` |
| 2 | Data layer | Each migration the target does not show, applied once, in the order the stack pack sets (filename order for timestamped files), exactly as the file reads. Never a change that is not in a migration file in the repository. The history and table listings saved | `apply_migration` with the slug as `name` and the file's contents as `query`, then `list_migrations` and `list_tables` |
| 3 | Prove on the target | Every on-target test file, under the roles and claims it needs, saved beside the offline run, each labelled with where it ran | Each `supabase/tests/*.test.sql` through `execute_sql` |
| 4 | Platform checks | Clean, or every finding accepted in writing | `get_advisors` for `security` and `performance`, and the key scan in Security probes |
| 5 | Server functions | Each one in the diff, deployed after the schema it relies on, called at its real URL, with its logs read. The API serves the new shape and still serves the old one to a client that has not updated | `deploy_edge_function`, a call to the function's URL, `get_logs` for `edge-function` |
| 6 | Front end | A clean install and the `build` command, green, with the log saved. The build released to the target in `§ Release`, or the deferred line recorded | `npm ci` at the root and in `web/`, then the build command |
| 7 | Hold destructive migrations | Nothing destructive ships in the release that makes it possible | No pack-specific tool |
| 8 | Verify | Every critical path smoked against the target, with evidence | A local production build of `web/` (`npm run build`, then `npm run start`) pointed at the project, driven by Playwright through `npx playwright` |
| 9 | Tag and push | An annotated tag, the release branch fast-forwarded to the work branch, both pushed | No pack-specific tool |
| 10 | Release note | Written in the product's voice, checked for attribution, in every locale when user-facing | No pack-specific tool |

A failure at any step stops the sequence there. From step 2 onward, the triggers under
[Rollback](#rollback) decide whether it rolls back, and a failed check at step 8 always does.

### Migration ordering

| Situation | Sequence |
|---|---|
| Additive and backward compatible | Apply the migration, then release the code that uses it |
| A new required column | Three releases: add it nullable, backfill in batches, then make it required. Never one |
| Removing a column or a field | Two releases: stop reading it and release that, then drop it once the code that stopped reading it has been live and verified |
| Renaming | Never a rename. Add the new one, write to both, backfill, stop reading the old one, drop it |
| An index on a table that already holds rows | The stack pack's rule. For `stack-nextjs-supabase`, a concurrent build in a migration of its own, with the Product Lead decision its Migrations section describes |
| A new table | Its access rules ship in the same migration. A table whose rules come later ships open |
| A correction to an applied migration | A new migration. An applied file is never edited |

A migration that is not backward compatible with the client that is currently live is not
applied. It is split, or it goes back to backend-engineer. A destructive migration arrives only
with the expand-and-contract sequence written in the ADR, and it runs in a later release than
the code change that makes it possible, after the Product Lead has authorised it in writing.

### Hosting

While `§ Release` reads `deferred: no target chosen`, the front-end release is the clean install
and the build, green, with the build log saved, and this line in `release-log.md` and in
`review.md`:

```
Front-end hosting: deferred: no target chosen
```

That line is not a release-gate failure. Nothing goes to any host, and no hosting tool is
installed or called to prove the point.

Choosing a target is the Product Lead's decision, and it is written into `§ Release`. Once a
target is named, the build is released there by the route `§ Release` and the stack pack give,
and verified at its URL. A companion skill for that host may be loaded for the host's mechanics
only, if installed (`docs/SKILLS.md` lists the known ones). It never replaces pre-flight, the
rollback plan or verification. A paid platform feature, such as a preview environment, is
optional and asked for first, and no gate requires one.

---

## Tag and push

The tag follows the format in `§ Release`. Where that format is semantic versioning, a fix is
a patch, an additive change is a minor version, and a breaking change to a public contract is a
major version. `git describe --tags --abbrev=0` gives the previous tag.

```bash
EV=.devteam/runs/<run-id>/evidence/release
git fetch origin
git tag -a <tag> -m "<the change, in one line>"
git tag -l --format='%(contents)' <tag> > "$EV/tag-annotation.txt"
node "$EV/attribution-check.mjs" "$EV/tag-annotation.txt"
git switch <release branch>
git merge --ff-only origin/<release branch>
git merge --ff-only <work branch>
git push origin <release branch>
git push origin <tag>
```

The first merge proves the local release branch equals the remote. The second moves it by
fast-forward only, to a work branch that passed pre-flight. Save the output of every push to
`push.txt`.

A rejected push means the remote moved, and the release stops there. Never force a push, and
never rebase a branch someone else may have read. Record it in `release-log.md` and hand off `rejected` with `next` set to
`orchestrator`: the work branch is brought up to date and goes through pre-flight again.

---

## Post-release verification

Smoke every critical path in `release-engineer`'s agent file against the target, and capture
each one. Until a hosting target exists, front-end paths run against a local production build
pointed at the target, as the stack pack names it. Once a target exists, its URL replaces the
local build.

| Critical path | How | Evidence |
|---|---|---|
| The changed surface completes its primary action | At the narrowest width in `§ Quality bar`, on a mobile device profile and a throttled connection, with the console captured | `smoke-<surface>-<locale>-<width>.png`, `smoke-<surface>-console.txt` |
| The product's claim holds | The probe qc-lead used for the claim in `§ Product`, repeated on the target | `smoke-claim-<promise>.txt` |
| Touched invariants hold | Each touched invariant, through the API as a real role and at the data layer under that role | `smoke-inv-<n>-api.txt`, `smoke-inv-<n>-target.log` |
| Access control holds | An unauthenticated request to a protected resource, then an authenticated one with no grant | `smoke-access-anonymous.txt`, `smoke-access-no-grant.txt` |
| Every locale renders | The changed surface in every locale in `§ Locales`, each right-to-left locale mirrored | `smoke-<surface>-<locale>-<width>.png` |
| Numbers and statuses read | Every figure in the brand spec's numeric treatment with its context, every status with a written label, read from the captures | Noted against each capture in `review.md` |
| Errors are in the product's voice | A forced failure, such as an invalid input or a refused request | `smoke-error-<case>.png` |
| Logs are quiet | The logs after the smoke, against the baseline from step 1: no new error class, no rise in errors | `logs-after.txt` beside `logs-baseline.txt` |

A path you could not verify is written in `review.md` as unverified, with the reason. It is
never rounded up to a pass.

---

## The release note

`release-engineer/release-note.md`, in the product's voice as the brand spec sets it. Read it
aloud before it is final; if it sounds like marketing, rewrite it.

| Part | Says |
|---|---|
| Heading | The tag and the date, in the brand spec's date format |
| What changed | The change, in the reader's terms, one short paragraph per change |
| What it means for the reader | What they can now do, or what now behaves differently |
| What it does not do yet | The limits a reader will meet, stated plainly |
| Fixed | Each fix to behaviour that had shipped, one line each |

No exclamation marks, no emoji, no word the brand spec's voice rules forbid. Every number
carries its context, and every status its written label. Attribution follows
`§ House rules`: run the attribution check over the note.

When the change is user-facing, the note holds one section per locale in `§ Locales`, the
first-authored locale first, built word for word from the release-note strings ux-writer
supplied. A locale missing from those strings is a rejection back to ux-writer, never a
translation you write. The note stays in the repository and the run folder: sending or
publishing it anywhere else is an outward-facing step for the Product Lead.

```markdown
# v1.4.0 · 2 October 2026

## en

### Invoice export

Account owners can export a month of invoices as a CSV file from the billing page. Each file
holds one account and one calendar month, in the account's time zone, and its name says which.

The file your accountant asks for now comes straight from the product, with the same totals
you see on screen.

What it does not do yet: exports cover one month at a time, and they are not sent by email.
```

The example shows the first-authored section. In a product that also ships French and Arabic,
`## fr` and `## ar` sections follow in the same shape, each built from ux-writer's strings for
that locale.

---

## The release log

`release-engineer/release-log.md` is the timed record of the release, and the evidence for the
`release` gate. It opens with who authorised the release, the work branch with its commit count
and the attribution result, and the hosting line. Then every step, with its shell time, the
command or call, the result and the evidence path. Then the versions the target returned. Every
attempt stays in the file, newest last, and a declined prompt, a refusal or a rollback is
recorded where it happened.

```markdown
# Release log · 2026-10-01-invoice-export

## Attempt 1

Authorised by: the qc-lead go written 2026-10-01T16:40:12Z (qc-lead/readiness.md); the
run.json gate list clean at 2026-10-02T09:05:51Z; push and tag to origin authorised in
ledger.md, decision line 41.
Work branch: feat/invoice-export, 3 commits, attribution check clean
(evidence/release/preflight-07-attribution.txt).
Front-end hosting: deferred: no target chosen

| Time (UTC) | Step | Command or call | Result | Evidence |
|---|---|---|---|---|
| 09:31:40 | 1 Rollback plan | rollback.md written | predates every change | release-engineer/rollback.md |
| 09:33:02 | 1 Log baseline | get_logs: api, postgres, edge-function | no errors in the hour | evidence/release/logs-baseline.txt |
| 09:35:18 | 2 Data layer | list_migrations | every file applied at build, none to apply | evidence/release/list-migrations.json |
| 09:36:40 | 3 Prove on the target | execute_sql, 3 test files | 41 of 41 ok | evidence/release/pgtap-project-invariants.tap |
| 09:39:12 | 4 Platform checks | get_advisors: security, performance | no findings | evidence/release/advisors-security.json |
| 09:41:05 | 5 Server functions | deploy_edge_function export-link, then a call | 200, logs clean | evidence/release/edge-export-link-200.txt |
| 09:47:30 | 6 Front end | npm ci at the root and in web/, then the build | green | evidence/release/build.txt |
| 09:55:48 | 8 Verify | Playwright on the local production build | 8 of 8 paths pass | evidence/release/smoke-billing-export-ar-320.png |
| 10:01:02 | 8 Logs | get_logs against the baseline | no new error class | evidence/release/logs-after.txt |
| 10:02:44 | 9 Tag and push | git tag -a v1.4.0, git merge --ff-only, git push | main at 4f2a9c1, v1.4.0 pushed | evidence/release/push.txt |
| 10:05:10 | 10 Release note | written, attribution check clean | en, fr, ar | release-engineer/release-note.md |

## Recorded versions

| | |
|---|---|
| Commit | 4f2a9c1 |
| Tag | v1.4.0 |
| Migrations on the target | 14 files, the newest 20261001120501_invoice_export_function |
| Server functions | export-link, version 1 |
| Front-end hosting | deferred: no target chosen |
```

The versions in this table, the tag, the commit and the target's own listings must agree with
each other. A disagreement is a finding before the handoff, never after it.

---

## Rollback

### The plan, written first

`release-engineer/rollback.md` is written before the first change to any environment, with the
shell timestamp on its first line to prove it. It states the previous release tag and commit,
the server function versions before this release, the written reverse for every migration in
the release ready to ship as a new migration file, the data restore point and its age, the time
budget for the rollback, and who is told when it fires.

```markdown
# Rollback plan · 2026-10-01-invoice-export

Written 2026-10-02T09:31:40Z, before the first change to any environment.

| | |
|---|---|
| Previous release | v1.3.2, commit 9c1e0b7 |
| Server functions before this release | invoice-webhook version 12. export-link is new in this release |
| Data restore point | The platform's daily backup from 2026-10-02T03:00:00Z, 6 hours old when this was written |
| Time budget | 20 minutes from the trigger to the previous version verified |
| Who is told | The Product Lead, through the orchestrator, at once |

## Migrations in this release

| Order | Migration | Kind | Compatible with the previous client | Reverse, and the file it ships as | Loses data |
|---|---|---|---|---|---|
| 1 | 20261001120501_invoice_export_function | additive | yes | Stays in place. If it must go: reverse-invoice_export_function.sql, shipped as <shell timestamp>_revert_invoice_export_function.sql | no |

## Order of reversal

1. Revert the three release commits and push the revert.
2. export-link has no previous version. The reverted client stops calling it, and it stays
   deployed and unused until the next release removes it.
3. The migration is backward compatible and stays.
4. Verify v1.3.2: list_migrations, the pgTAP suite through execute_sql, get_advisors and the
   smoke paths.
```

### When to roll back

Roll back without waiting to be asked when any of these is true:

- An invariant fails on the target. That is immediate and needs no discussion.
- The error rate on a changed path rises above the pre-release baseline.
- A flow the change touched is broken.
- A migration did not complete cleanly.
- Data is being written that cannot be corrected later.

### The procedure

1. Revert the release commits on the release branch and push the revert, through a rollback
   branch so the release branch still moves only by fast-forward. Never force-push.

   ```bash
   EV=.devteam/runs/<run-id>/evidence/release
   git fetch origin
   git switch -c rollback/<run-slug> origin/<release branch>
   git revert --no-edit <base>..<head>
   git log --format='%H%n%B' origin/<release branch>..HEAD > "$EV/rollback-commit-messages.txt"
   node "$EV/attribution-check.mjs" "$EV/rollback-commit-messages.txt"
   git switch <release branch>
   git merge --ff-only rollback/<run-slug>
   git push origin <release branch>
   ```

   The pushed release tag stays, because a tag others may have fetched is never moved or
   deleted. Tag the revert with the next version in the `§ Release` format, so the tag list
   says what is live.
2. Redeploy each server function from its source at the previous release tag
   (`git show <previous tag>:<path>`), exactly as it was, through the stack pack's path.
3. Leave backward-compatible migrations in place. Where a migration was not backward
   compatible, ship its written reverse from `rollback.md` as a new migration file and apply it,
   in the order `rollback.md` states. A reverse that would discard rows written since the
   release is the one step that waits for the Product Lead's written decision. Until it comes,
   the previous code runs against the newer schema, which the backward-compatibility rule makes
   safe.
4. Verify the previous version: the history listing, the on-target tests, the platform checks
   and the smoke paths, with evidence saved as `rollback-<step>.txt`.
5. Write the rollback record in `release-log.md`: what happened, when, what was reverted, what
   data was affected, and what the fix will be.
6. Tell the Product Lead at once, with facts. The `release` gate is `fail`. A rollback that
   restored service hands off `rejected`, with a `blockers` entry naming the failing check and
   the agent who owns the fix. One that did not fully restore service hands off `escalated`,
   with the decision in `decisions_for_product_lead`.

Roll back first and report second. The cause is worked out afterwards.

---

## What goes to the Product Lead first

Confirm before, never after, unless it is already authorised for this run in writing:

- A push, tag or release that `run.json` or `ledger.md` does not record as authorised.
- Any destructive or irreversible migration, or a reverse that would lose data.
- Choosing a hosting target, and any paid platform feature.
- Anything that sends a message to a real user or customer.
- Anything public beyond the repository: a published release note, a repository going public,
  a domain change.
- A secret to set or rotate, and any secret found in history.
- Releasing with a known blocker, which is the Product Lead's override to make and the
  orchestrator's to record in the ledger.
- A pre-flight check that can pass only by breaking a brand or accessibility rule.
- A rollback that did not fully restore service.

---

## Evidence under evidence/release/

Every file the release produces sits under `.devteam/runs/<run-id>/evidence/release/`, with its
shell time and its command at the top. Where the stack pack names its own file for one of these
(for `stack-nextjs-supabase`, see the Evidence table in its Toolchain section), use its name.

| File | Holds |
|---|---|
| `preflight-<NN>-<check>.txt` | The full output of pre-flight row NN |
| `attribution-check.mjs`, `commit-messages.txt` | The attribution check and the messages it read |
| `scan-secrets.mjs` | The secret scan whose output is `preflight-05-secrets.txt` |
| `logs-baseline.txt`, `logs-after.txt` | The platform's logs for the hour before the first change, and after the smoke |
| `history-before.<ext>`, `history-after.<ext>` | The migration history before and after step 2 |
| `tables-after.<ext>` | The table listing after step 2 |
| `tests-offline.<ext>`, `tests-target-<test file>.<ext>` | The data-layer runs, each labelled with where it ran |
| `platform-<check>.<ext>` | Each advisor or scanner's output, with any written acceptance beside it |
| `functions-<name>-<case>.txt`, `functions-<name>-logs.txt` | A deployed function's call and its log lines |
| `build.txt` | The clean install and the build |
| `smoke-<path>[-<locale>][-<width>].<ext>` | Each critical path |
| `tag-annotation.txt`, `push.txt` | The tag's annotation, and the output of every push |
| `rollback-<step>.txt` | Each rollback step, when one fires |

A key, a token or a password never appears in evidence. Redact the value and keep the name.

---

## Before handing off

In addition to the four sub-gates in `release-engineer`'s agent file:

- [ ] `rollback.md` carries a shell timestamp earlier than the first change to any environment.
- [ ] Every pre-flight row is in `preflight.md`, in order, with its saved output or a reason it
      does not apply.
- [ ] The attribution check is clean on every commit, on the tag annotation and on the note.
- [ ] `release-log.md` opens with the authorisation, the work branch and its commit count, the
      attribution result and the hosting line, and its versions agree with the target's
      listings.
- [ ] Every critical path has its evidence, and the logs were compared with the baseline.
- [ ] The release note covers every locale in `§ Locales` when the change is user-facing.
- [ ] `release` is the only entry in `gates[]`, with `release-engineer/release-log.md` as its
      evidence, and the sub-gates are in `review.md`.
- [ ] The `PROJECT.md` sections you relied on are cited by name in `plan.md`, and `consumed`
      lists the files you read as paths.
