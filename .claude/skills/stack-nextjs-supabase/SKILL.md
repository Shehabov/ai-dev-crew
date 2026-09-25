---
name: stack-nextjs-supabase
description: The default stack pack, a Next.js App Router app in web/ and a Supabase back end, built and proved through the Supabase MCP from hand-authored migrations, with an offline Postgres proof on PGlite and no Docker or Supabase CLI. Read it by path when PROJECT.md § Stack pack names stack-nextjs-supabase. Use it at kickoff and at run open for the MCP setup and pre-flight, when scaffolding web/ or generating database types and client keys, when writing, reviewing or probing migrations, row level security policies, grants, database functions, triggers, Edge Functions and pgTAP tests, and when applying, proving, releasing or rolling any of them back. Covers the toolchain, the evidence names, the RLS-first patterns and traps, the security probes and what the offline proof cannot prove.
---

# Next.js and Supabase

This pack describes a Next.js App Router app in `web/` (TypeScript, npm) and a
Supabase back end (Postgres, row level security, PostgREST, Edge Functions, Auth and
Storage). The database is built from hand-authored migration files, applied and proved
through the Supabase MCP server, and proved again offline on PGlite before anything touches
the project.

The pack is opt-in. It applies only when `PROJECT.md § Stack pack` names
`stack-nextjs-supabase`, and the stack-dependent roles read it by path at step 1:
`.claude/skills/stack-nextjs-supabase/SKILL.md`. It is never preloaded, so a project on
another stack never carries it.

Two third-party skills carry the general craft and are worth reading beside this one, if
installed: `supabase` for the platform's products and client libraries, and
`supabase-postgres-best-practices` for schema design, indexes, locks and query plans.
`docs/SKILLS.md` says where to get them. Both also teach the Supabase CLI and a declarative
`supabase/schemas/` workflow, which this pack does not use. Where either disagrees with this
file, this file wins, because the toolchain below is the only one the team can run and
evidence.

---

## When to use this pack

Read the sections your role needs, at the step shown. Every other file cites these section
names, so they do not change.

| Role | Sections | When |
|---|---|---|
| orchestrator | Kickoff setup, Pre-flight at run open | Kickoff, and every run open |
| tech-architect | Toolchain, Repository layout, RLS first, Migrations | Step 1, so every brief names a mechanism the stack has and a proof the team can run |
| backend-engineer | All of it. Before handing off is the step 4 checklist | Steps 1, 3 and 4 |
| frontend-engineer | The app in web/, Generated types, Auth | Steps 1 and 3 |
| code-analyst | RLS traps, Query plans, Security probes (catalogue queries), The offline proof | Steps 1 and 3 |
| security-analyst | Security probes, RLS traps, Auth, Edge Functions | Steps 1 and 3 |
| peer-reviewer, code-steward | RLS first, Migrations | When the change touches the data layer |
| engineering-lead | Toolchain, Migrations, pgTAP, Generated types, The offline proof | Every data-layer row of the engineering table |
| qc-engineer, qc-lead | pgTAP, Security probes, Edge Functions, The app in web/ | Step 1, and for every data-layer case |
| release-engineer | Release on this stack, Toolchain, Edge Functions | Steps 1 and 3 |
| bug-historian | RLS traps, Security probes | For detection commands in the regression brief and guard |

---

## Toolchain

This section is the canonical statement of how the team does database work on this stack.
Every other file cites it rather than restating it.

Present on the machine: git, node, npm, npx, and the Supabase MCP server (`supabase` in
`.mcp.json`, scoped to one project). `PROJECT.md § Toolchain` records the versions. Nothing
else may be assumed.

The team never uses Docker, the Supabase CLI, Deno, the Vercel CLI, pnpm, psql, jq or
python on this stack. None of them is a required step, a gate criterion, an evidence source
or an allowed permission. A tool that is missing is reported as `blocked`, never faked.

### The MCP workflow

Database work goes through the Supabase MCP. The tools named here are the server's own.

| Job | How | Never |
|---|---|---|
| Iterate offline | `node .claude/skills/stack-nextjs-supabase/scripts/db-test.mjs`, the `db test` command in `PROJECT.md § Commands`. See The offline proof. | A local Supabase stack. There is none. |
| Iterate on the project | `execute_sql` against the project. Anything that changes the schema runs inside `begin; ... rollback;`, so the project only ever changes through `apply_migration` | DDL that commits outside a migration file |
| Apply | `apply_migration` once per migration file, in filename order. `name` is the file's slug, `query` is the file's exact contents | SQL that is not in a migration file in the repository. A second apply of the same file |
| Verify the apply | `list_migrations`, matched on name, because the server stamps its own version when it applies. Then `list_tables`, which also shows row level security on every new table | Reading success from the apply call alone |
| Prove | pgTAP on the project. A migration enables it: `create extension if not exists pgtap with schema extensions;`. Each test file runs through `execute_sql` with its exact contents as the query. Every test file opens with `begin;` and ends with `rollback;`, so it is never wrapped twice; a file that does not open its own transaction is wrapped as `begin; ... rollback;` before it is sent. See pgTAP | An empty result read as a pass |
| Probe as a role | `execute_sql`, one probe per call, inside `begin; ... rollback;`, with `set local role anon` or `set local role authenticated` and `set local request.jwt.claims` inside that transaction. See Security probes | A probe run as the connecting role, which skips every policy |
| Advisors | `get_advisors` for type `security` and type `performance`. These are the platform checks, and the data layer's static checks, that other files cite. Clean, or every finding accepted in writing, before review and again at the engineering gate and at release | A finding left open with no written acceptance |
| Types | `generate_typescript_types`, written to `web/src/lib/database.types.ts` exactly as returned | Hand-edited generated types |
| Edge Functions | `deploy_edge_function`, then call the function's URL (base from `get_project_url`) with curl or a node fetch script, and read `get_logs` | Local Deno, or serving a function locally |
| Debugging | `get_logs` for the service in question: `api`, `postgres`, `edge-function`, `auth`, `storage` or `realtime` | Guessing from the client error alone |
| Docs | `search_docs` | Working from memory |
| Client config | `get_project_url` and `get_publishable_keys` (or `get_anon_key` where that is the tool the server exposes), written to `web/.env.local`, which is gitignored | The `service_role` key in the client or in the repository. Ever. |
| Branches | `create_branch`, `merge_branch`, `reset_branch`, `rebase_branch` and `delete_branch` are optional and ask-first, because they cost money | A gate that requires one |

`execute_sql` connects as a privileged role that owns the tables, and a table owner skips
row level security. That is why every role check switches role inside the transaction, and
why a query plan read without the switch says nothing about the policy.

### Evidence

Every call above that produces output is saved under the run's `evidence/`, named so a
reader knows where it ran. These names replace the generic ones in `team-architecture`;
anything this table does not name keeps the name the brief gives it.

| File | Holds | Written by |
|---|---|---|
| `evidence/backend/db-test-pglite.tap` | The full offline run. PGlite in its name and on its first line, never passed off as the project | backend-engineer |
| `evidence/backend/pgtap-project-<test file>.tap` | Each `supabase/tests/*.test.sql` run on the project through `execute_sql` | backend-engineer |
| `evidence/backend/list-migrations.json`, `list-tables.json` | The project after the apply | backend-engineer |
| `evidence/backend/advisors-security.json`, `advisors-performance.json` | `get_advisors` output, with any written acceptance beside it | backend-engineer |
| `evidence/backend/explain-<query>.txt` | `EXPLAIN ANALYZE` output, labelled with where it ran and as which role | backend-engineer, code-analyst |
| `evidence/backend/reverse-<slug>-pglite.tap`, `reverse-<slug>-project.txt` | Each reverse, proved offline and in a rolled-back transaction on the project | backend-engineer |
| `evidence/backend/edge-<function>-<case>.txt`, `edge-<function>-logs.txt` | The request, the response and the `get_logs` lines for a deployed function | backend-engineer |
| `evidence/frontend/types-generate.txt` | The `generate_typescript_types` call and the path it was written to | frontend-engineer |
| `evidence/security/catalogue-<query>.json` | Each catalogue query in Security probes, with the rows it returned | security-analyst |
| `evidence/security/probe-<role>-<case>.txt`, `rest-<role>-<case>.txt` | Each role-switched probe, and the same case sent to the REST URL | security-analyst |
| `evidence/release/` | The same names, taken again at release, plus `build.txt` and `smoke-<path>.*` | release-engineer |

A key, a token or a password never appears in evidence. Redact the value and keep the name.

An empty result is not a pass. A pgTAP file's evidence shows the plan line, every `ok` and
`not ok` line and the final count. If `execute_sql` returns less than that, record exactly
what came back, treat the file as not run, and raise a `machinery_findings` entry naming
this pack, because the route to the project proof is then the thing that is broken.

### When the MCP does not answer

If the Supabase MCP is not connected (its tools are missing, or a call returns an auth
error), nothing is faked. Run the offline proof, set `status` to `blocked` with the reason
`supabase MCP not authorised` in the handoff, and the orchestrator escalates to the Product
Lead, who authorises the server with `/mcp`. Generated types are never written by hand and a
key is never invented while the server is down.

### What the team does not do, and who does

| Job | Who, and how |
|---|---|
| Edge Function secrets | No MCP tool sets them. The agent names every secret a function reads in its handoff, under `decisions_for_product_lead`, and the Product Lead sets it in the Supabase dashboard. The value never passes through an agent, the repository or the run folder. |
| Project settings | `supabase/config.toml`, if it exists, is read only by the Supabase CLI, which is not used, so it configures nothing. A setting the hosted project needs (exposed schemas, the API row cap, an Auth provider, redirect URLs) goes in the handoff for the Product Lead to set in the dashboard. |
| Running an Edge Function locally | Deferred, because it needs Deno. A function is proved deployed, on the project, and nowhere else. |
| Seeding the project | `supabase/seed.sql` is applied offline by the offline proof. It is not a migration, so it never reaches the project through `apply_migration`. Loading rows into the project for a demo or a flow test is ask-first, because the project is also the release target. |
| Front-end hosting | Deferred until the Product Lead picks a target in `PROJECT.md § Release`. Until then it is recorded as `deferred: no target chosen`, which is not a release-gate failure. |

---

## Kickoff setup

The orchestrator runs this once, at kickoff, when the Product Lead confirms this pack in
`PROJECT.md § Stack pack`. Ask before installing anything.

1. The MCP server. Copy `.claude/skills/stack-nextjs-supabase/templates/mcp.json` to
   `.mcp.json` at the project root, or add its `supabase` entry to an existing `.mcp.json`
   without removing any other server. Replace `<project-ref>` with the project ref the
   Product Lead gives you: the short id in the project's dashboard URL. The file holds no
   key and no token; the server authenticates through the browser. Tell the Product Lead to
   authorise it with `/mcp`, and that it loads in the next session. The template turns on
   the `docs`, `account`, `database`, `debugging`, `development`, `functions` and
   `branching` tool groups, and the project ref scopes every call to one project.
2. The offline proof. It needs PGlite in the project root, the folder the proof runs from.
   If the root has no `package.json`, create one first, so npm does not install into a
   parent folder:

   ```bash
   npm init -y
   npm pkg set private=true --json
   npm i -D @electric-sql/pglite
   ```

   Run this once. The root `package.json` and `package-lock.json` are committed, and
   `npm install` at the root restores PGlite on a fresh clone.
3. Ignore rules. The root `.gitignore` covers `node_modules/`, `.env` and `.env.*`, with
   `!.env.example` so the example file is still committed.
4. The profile. Offer these as the defaults for the `PROJECT.md` sections, for the Product
   Lead to confirm or change:

   | Section | Default |
   |---|---|
   | § Stack | Front end: Next.js, App Router, TypeScript, in `web/`. Back end: Supabase (PostgREST, database functions, Edge Functions, Auth). Database: Supabase Postgres with row level security on every table. Hosting: not chosen yet |
   | § Toolchain | Present: git, node, npm, npx, and the Supabase MCP server scoped to one project. Never assumed: Docker, the Supabase CLI, Deno, the Vercel CLI, pnpm, psql, jq, python |
   | § Release | Target: `deferred: no target chosen` |

   And for `§ Commands`:

   | Purpose | Command |
   |---|---|
   | install | `npm install && cd web && npm install` |
   | dev | `cd web && npm run dev` |
   | build | `cd web && npm run build` |
   | lint | `cd web && npm run lint` |
   | typecheck | `cd web && npm run typecheck` |
   | test | `cd web && npm test` |
   | e2e | `cd web && npm run e2e` |
   | db test | `node .claude/skills/stack-nextjs-supabase/scripts/db-test.mjs` |

   Until `web/` exists, the install command runs at the root only.

Client configuration comes later, once the server answers and `web/` exists, and it is
frontend-engineer's job, because frontend-engineer owns `web/`: `get_project_url` and
`get_publishable_keys` written to `web/.env.local`, and the variable names with empty values
in the committed `web/.env.example`. See The app in web/.

---

## Pre-flight at run open

The orchestrator runs these checks after the `run opened` ledger line and before the first
dispatch, and writes each one, with its command or call and its answer or error, to
`evidence/toolchain-preflight.log`.

| Check | Passes when | On failure |
|---|---|---|
| `npm --version` | It prints a version | Escalate. No stage on this stack can run without npm |
| `npx --version` | It prints a version | Escalate. The scaffold and Playwright need it |
| `list_tables` through the Supabase MCP, schemas `["public"]` | It answers. An empty list is an answer | Record `supabase MCP not authorised` in the ledger and in `blockers`, escalate to the Product Lead, who runs `/mcp`, and dispatch no entry that needs the server until a re-run answers |
| `npm ls @electric-sql/pglite` at the project root | It lists the package | The offline proof cannot run. Ask the Product Lead to approve the install in Kickoff setup, step 2. Stages that need only the MCP may still run |

That one `list_tables` call is the orchestrator's only MCP call. It never applies, queries
or changes anything through the server.

Entries that need the server, for the list in `orchestrator/plan.md`: backend-engineer,
frontend-engineer (types and client keys), code-analyst and security-analyst (read-only
checks and probes), engineering-lead, qc-engineer, qc-lead, and release-engineer when the
run ships. bug-historian, tech-architect, ux-designer, ux-auditor, ux-writer, peer-reviewer
and code-steward do not need it.

---

## Repository layout

```
web/                                     the Next.js App Router app, TypeScript, npm;
                                         only frontend-engineer writes here
web/src/app/                             routes
web/src/lib/database.types.ts            generated by generate_typescript_types, never edited
web/.env.local                           project URL and publishable key, gitignored
web/.env.example                         the same variable names, empty values, committed
supabase/migrations/<yyyymmddhhmmss>_<slug>.sql
                                         the database source of record: hand-authored,
                                         forward-only, one concern per file
supabase/tests/*.test.sql                pgTAP, run offline and on the project
supabase/seed.sql                        seed rows, applied offline only
supabase/functions/<name>/index.ts       Edge Functions, one folder each
content/strings/<locale>.json            the shipped string catalogue, written by ux-writer,
                                         one file per locale in PROJECT.md § Locales
package.json, package-lock.json          the root: private, holds @electric-sql/pglite
.mcp.json                                the Supabase MCP server, from templates/mcp.json
```

Migrations are the source of record, and they are hand-authored. There is no declarative
`supabase/schemas/` workflow: generating a migration from it needs `supabase db diff`, which
needs the Supabase CLI and Docker, and neither is used. Schema files, if any exist, are not a
source of record. Nothing applies them and nothing tests them, so they are never read as the
current schema.

---

## The app in web/

frontend-engineer owns this section and everything under `web/`.

| Concern | Rule |
|---|---|
| Creating it | If `web/` does not exist, create it from the project root with `npx create-next-app@latest web --yes --ts --app --eslint --src-dir --use-npm --import-alias "@/*" --disable-git`, adding `--tailwind` or `--no-tailwind` as the ADR decides. `--yes` takes the defaults for anything not named, so the command never stops at a prompt. Save the command and its output in evidence. Then add `!.env.example` to `web/.gitignore`, because the generated file ignores every `.env*`. |
| Scripts | In `web/package.json`: `dev` (`next dev`), `build` (`next build`), `start` (`next start`), `lint` (ESLint, as the scaffold sets it), `typecheck` (`tsc --noEmit`), `test` (Vitest, `vitest run`), `e2e` (Playwright, `playwright test`). |
| Dependencies | `@supabase/supabase-js` and `@supabase/ssr` at runtime. `vitest` and `@playwright/test` as dev dependencies, plus what the component tests need, such as `jsdom` and Testing Library. All installed with npm in `web/`. Run `npx playwright install chromium` once per machine. |
| Clean install | `npm ci` at the root and `npm ci` in `web/`, each against its committed lockfile. The check fails if either install rewrites its lockfile. |
| Local production build | `cd web && npm run build && npm run start`, pointed at the project through `web/.env.local`. Release smoke tests run against it until a hosting target exists. |
| Client configuration | `get_project_url` and `get_publishable_keys` written to `web/.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`NEXT_PUBLIC_SUPABASE_ANON_KEY` where the server returns only the legacy anon key). `web/.env.example` carries the same names with empty values. Everything prefixed `NEXT_PUBLIC_` ships to every browser, so only the publishable key may carry that prefix. |
| Data access | A browser client from `@supabase/ssr` for client components, and a server client that reads and writes the auth cookies for server components, route handlers and server actions. Both typed with `Database` from `web/src/lib/database.types.ts`. |
| Screenshots | Playwright through `npx playwright`, at every width in `PROJECT.md § Quality bar`, every theme and every locale. |

The app never holds a rule. It may hide a control a reader cannot use; the database decides
whether they can reach the data. See RLS first.

---

## The offline proof

```bash
node .claude/skills/stack-nextjs-supabase/scripts/db-test.mjs
```

Run it from the project root. PGlite is real Postgres compiled to WebAssembly, so the proof
needs nothing but node and the one dev dependency from Kickoff setup, step 2. In order, it:

1. Starts PGlite in memory. Nothing is written to disk.
2. Applies a Supabase-shaped bootstrap: the `anon`, `authenticated` and `service_role`
   roles, Supabase's default grants on `public`, the `extensions` schema with `pgcrypto` and
   `uuid-ossp`, and an `auth` schema with `auth.users`, `auth.uid()`, `auth.jwt()`,
   `auth.role()` and `auth.email()` reading `request.jwt.claims`.
3. Applies `supabase/migrations/*.sql` in filename order, one statement at a time, so a
   failure names the file and the line. A migration's `create extension pgtap` is skipped
   and reported, because a shim stands in for pgTAP offline.
4. Applies `supabase/seed.sql`, if there is one.
5. Installs the pgTAP-compatible shim from this pack's `scripts/db-test-shim.sql`, and runs
   every `supabase/tests/*.test.sql`, each inside a transaction that is rolled back, printing
   TAP.

| Flag | Does |
|---|---|
| `--only <file>` | Runs one test file: a path, or a file name inside `supabase/tests/` |
| `--reverse <file>` | After the tests, applies this reverse script to the migrated, seeded database, then re-applies the newest migration |
| `--supabase-dir <dir>` | Proves this folder instead of `./supabase`. `DEVTEAM_SUPABASE_DIR` does the same; the flag wins |
| `--json` | Prints one JSON object instead of TAP |
| `--help` | Prints the usage and exits |

Exit code 0 when every test passes, 1 on any failure or SQL error (including PGlite not being
installed), 2 when there are no migrations to prove.

Save the run with its first line intact, so the file opens with the PGlite label:

```bash
node .claude/skills/stack-nextjs-supabase/scripts/db-test.mjs > .devteam/runs/<run-id>/evidence/backend/db-test-pglite.tap
```

The shim implements `plan`, `no_plan`, `finish`, `ok`, `is`, `isnt`, `pass`, `fail`, `diag`,
`is_empty`, `isnt_empty`, `throws_ok` (every text and integer form), `lives_ok`,
`results_eq`, `set_eq` and `bag_eq`. Any other pgTAP function fails loudly offline, and the
output names it. Extend the shim, or prove that test file on the project only and say so in
the handoff.

### What the offline proof cannot prove

It proves that the migrations, the seed and the tests hold on real Postgres. It is not the
project, so it never replaces pgTAP through the MCP:

- No PostgREST, so no status code, header or error mapping is proved.
- No real pgTAP. The shim implements part of pgTAP's interface and compares rows by their
  text form, so a column type mismatch that pgTAP would report passes offline.
- No Supabase platform: no Auth service, Storage, Realtime or Edge Functions, no platform
  extensions such as `pg_net`, `pg_cron` or `pg_graphql`, and no advisors.
- Migrations run as a superuser offline, which the project's connecting role is not, so a
  privilege error can pass offline and fail on the project.
- PGlite may run a newer Postgres than the project. Check the project's with
  `select version()` through `execute_sql` before relying on a recent feature.
- It applies a migration one statement at a time. `apply_migration` sends the whole file,
  so a statement that cannot run inside a transaction block, such as
  `create index concurrently`, can pass offline and fail on the project.

---

## Migrations

| Rule | |
|---|---|
| Hand-authored, one concern per file | `supabase/migrations/<yyyymmddhhmmss>_<slug>.sql`. The timestamp comes from the shell, never invented: `node -e "console.log(new Date().toISOString().replace(/\D/g,'').slice(0,14))"`. The slug is snake_case, names the one concern, and is unique in the folder, because the project's history is matched by name. |
| Forward-only | Never edit a migration once it has been applied. A correction, including one a reviewer asks for, is a new migration. |
| A written reverse for every file | Written with the migration, recorded in `.devteam/runs/<run-id>/backend-engineer/rollback-notes.md`, and saved beside the notes as `reverse-<slug>.sql`. If it is ever needed, it ships as a new forward migration. |
| The reverse, proved offline | `node .claude/skills/stack-nextjs-supabase/scripts/db-test.mjs --reverse <that file>`, which applies it to the migrated, seeded database and then re-applies the newest migration. It proves the newest migration's reverse only, so prove each reverse while its migration is still the newest. |
| The reverse, proved on the project | One `execute_sql` call, rolled back: `begin;`, a row written to a table the change does not own, the migration's exact contents if the project does not show it applied yet, the reverse's exact contents, the migration's exact contents again, a select that reads the row back, `rollback;`. The row must still be readable, and nothing persists. |
| Proved before it is applied | Green offline, and its contents run through `execute_sql` inside `begin; ... rollback;` on the project. Only then `apply_migration`, once. |
| Reviewed for lock behaviour | The lock each statement takes, and on which table, recorded in the rollback notes. A rewrite on a live table is an outage. |
| Indexes built `concurrently` | On a table that already holds rows, outside a transaction block, in a migration of its own. `apply_migration` runs each file as one request, where `concurrently` can fail, and the offline proof will not catch it. Until a concurrent build has been seen to apply on this project, one is a decision for the Product Lead before the apply: a plain `create index` with its write lock recorded, or a quiet window. Never drop `concurrently` quietly, and never run it through `execute_sql` instead, because SQL outside a migration file is never applied. An index on a new, empty table needs no concurrent build. |
| Three steps for a non-null column | Add it nullable, backfill in batches, then set not null. |
| Never a rename | Add, dual-write, backfill, stop reading, drop. |
| Policies migrate with their table | A migration that adds a table enables row level security and writes all four command policies and its grants in the same file. A table whose policy comes later ships open. |
| Applied, then verified | `list_migrations` shows every file by name and in order, `list_tables` shows the tables and their row level security, `get_advisors` is clean for `security` and `performance` or every finding is accepted in writing, and `generate_typescript_types` has rewritten `web/src/lib/database.types.ts`. |

Where the team applies migrations: backend-engineer applies each one to the project while it
builds, so the tests run there. At release, release-engineer proves the project's history
matches the folder exactly, applies any file not yet applied, and proves it again.

---

## RLS first

The product's invariants (`PROJECT.md § Product invariants`) are enforced in the database,
because only the database holds against every caller: a leaked publishable key, a direct
connection, a mistaken client query, an Edge Function nobody reviewed, and a PostgREST call
the front end was never meant to make.

| Enforced where | Holds against |
|---|---|
| The client | Nothing |
| An Edge Function | Only calls that route through that function |
| A security-definer function, with the base table's grants revoked | Every caller that has no direct grant |
| A row level security policy, with column grants | Every caller, including one with a valid key |

One enforcement point per invariant. `team-architecture` calls two enforcement points that
can disagree a defect, and that rule holds here.

The mechanism for each kind of rule in `team-architecture`, on this stack:

| The rule is about | Hold it with |
|---|---|
| Which rows a caller may see or write | A policy for each of the four commands, keyed on `(select auth.uid())` or on a membership set such as `private.my_account_ids()` |
| Which transitions are valid | A `before update` trigger, and one security-definer function as the only writer |
| A value inside one row | A check constraint, an enum type or a column type |
| Uniqueness or a sequence | A unique index, with the value allocated in the same transaction as the write |
| A property of a set: a sum, a count, a balance, a minimum group | A security-definer function that locks what it reads with `select ... for update` and refuses in the same transaction, with writes on the base table revoked |
| History that must never change | An insert grant and nothing else, with `false` policies for update and delete |
| A field that must not cross the boundary | Column grants on the table, then a `security_invoker` view to shape the read |

The examples below use a small invoicing product: accounts, their members, projects,
invoices and time entries. Each pattern ran green under the offline proof, with tests for
the positive and the negative case, before it was written here.

### Row visibility by membership

A member reads and writes only the rows of accounts they belong to. The membership lookup
lives in a security-definer function in a schema PostgREST does not expose, so a policy can
call it without recursing into the membership table's own policy, and it returns a set the
planner evaluates once per statement.

```sql
-- supabase/migrations/<yyyymmddhhmmss>_account_membership.sql (extract)
create type public.member_role as enum ('owner', 'member');

create table public.account_members (
  account_id uuid not null references public.accounts (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       public.member_role not null,
  primary key (account_id, user_id)
);

create index account_members_user_id_idx on public.account_members (user_id);

create schema private;
grant usage on schema private to authenticated;

create function private.my_account_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.account_id
    from public.account_members m
   where m.user_id = (select auth.uid());
$$;

revoke all on function private.my_account_ids() from public;
grant execute on function private.my_account_ids() to authenticated;
```

A sibling, `private.my_owner_account_ids()`, adds `and m.role = 'owner'`. Then every tenant
table takes all four command policies in the file that creates it:

```sql
create index projects_account_id_idx on public.projects (account_id);

alter table public.projects enable row level security;
revoke all on public.projects from anon, authenticated;
grant select, insert, update, delete on public.projects to authenticated;

create policy projects_select on public.projects
  for select to authenticated
  using (account_id in (select private.my_account_ids()));

create policy projects_insert on public.projects
  for insert to authenticated
  with check (account_id in (select private.my_account_ids()));

create policy projects_update on public.projects
  for update to authenticated
  using (account_id in (select private.my_account_ids()))
  with check (account_id in (select private.my_account_ids()));

create policy projects_delete on public.projects
  for delete to authenticated
  using (account_id in (select private.my_owner_account_ids()));
```

The update policy carries both `using` and `with check`, so a member cannot move a project
into an account they do not belong to. The grants are explicit because Supabase's default
privileges hand `anon` and `authenticated` every privilege on a new table, `truncate`,
`references` and `trigger` included, and row level security governs none of those three.

### Field exposure

An invoice's internal note never reaches a client. Revoke the table, then grant `select` on
the columns that may cross the boundary. The note has no grant, so there is no path to it,
and the row policy still decides which rows.

```sql
revoke all on public.invoices from anon, authenticated;
grant select (id, account_id, number, status, total_minor, currency)
  on public.invoices to authenticated;

create policy invoices_select on public.invoices
  for select to authenticated
  using (account_id in (select private.my_owner_account_ids()));

-- writes go through definer functions; the policies say so
create policy invoices_insert on public.invoices
  for insert to authenticated with check (false);
create policy invoices_update on public.invoices
  for update to authenticated using (false) with check (false);
create policy invoices_delete on public.invoices
  for delete to authenticated using (false);

create view public.invoice_summaries
with (security_invoker = on) as
  select id, account_id, number, status, total_minor, currency
    from public.invoices;

grant select on public.invoice_summaries to authenticated;
```

A view with `security_invoker = on` checks the caller's own privileges on the table beneath
it, and the caller needs a grant on every column the view reads. Over a table whose grants
are fully revoked it refuses every caller with `42501`, so field exposure is done with column
grants, and the view only shapes the read. That works because the view reads nothing the
caller cannot. When the view has to transform a column the caller must never read, such as
redacting free text, column grants cannot help: a grant on that column lets the caller read
it from the table directly. Route clients through a security-definer function instead, and
give no client grant on the view. A view without `security_invoker` runs as its owner and
skips every policy, which is a trap, not a fix.

### An aggregate that never reports a small group

Some invariants are facts about a set, not a row: a report never shows a group smaller than
a minimum size, so no one person's figures can be read off an average. A row policy cannot
express that. Revoke the base table entirely, and expose the report only through a
security-definer function that applies the rule before it returns anything.

```sql
-- supabase/migrations/<yyyymmddhhmmss>_team_hours_report.sql (extract)
revoke all on public.time_entries from anon, authenticated;

create function public.team_hours_report(p_account uuid, p_from date, p_to date)
returns table (project_id uuid, avg_hours numeric, members integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c_min_group constant integer := 10;   -- the minimum, from PROJECT.md § Product invariants
  v_members integer;
begin
  if p_account not in (select private.my_owner_account_ids()) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  select count(distinct t.user_id) into v_members
    from public.time_entries t
   where t.account_id = p_account
     and t.worked_on between p_from and p_to;

  if v_members < c_min_group then
    raise exception 'below_minimum_group' using errcode = 'P0001';
  end if;

  return query
    select t.project_id, round(avg(t.hours), 2), count(distinct t.user_id)::integer
      from public.time_entries t
     where t.account_id = p_account
       and t.worked_on between p_from and p_to
     group by t.project_id
    having count(distinct t.user_id) >= c_min_group;
end;
$$;

revoke all on function public.team_hours_report(uuid, date, date) from public, anon;
grant execute on function public.team_hours_report(uuid, date, date) to authenticated;
```

Four things are not negotiable here:

1. `set search_path = ''` on every security-definer function, with every reference
   schema-qualified. Without it a caller can create a shadowing object in a schema they
   control and run their own code as the definer.
2. The refusal names the invariant, never the input. `below_minimum_group`, never the date
   range or the filter that tripped it, because naming the input lets a caller narrow one
   query at a time towards exactly what the rule protects. The same holds for `not_found`:
   an account that exists and one that does not answer alike.
3. Every group returned is at or above the minimum (the `having`), and so is the whole set
   the filters select. Test the difference attack too: two permitted queries whose results
   subtract to a group below the minimum.
4. The base table is revoked. If `authenticated` can read `time_entries` directly, the
   function is decoration.

### Guarded transitions

A rule about what a row may become is a trigger, not a policy, because a policy decides
whether a row is visible or writable and cannot say what a valid transition is. The trigger
holds whatever wrote the row, the table owner included.

```sql
create function public.guard_invoice_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status <> 'draft'
     and (new.total_minor, new.currency, new.number)
         is distinct from (old.total_minor, old.currency, old.number) then
    raise exception 'invoice_issued_is_immutable' using errcode = 'P0001';
  end if;

  if (old.status, new.status) not in (
       ('draft', 'draft'), ('draft', 'issued'), ('draft', 'void'),
       ('issued', 'issued'), ('issued', 'paid'), ('issued', 'void'),
       ('paid', 'paid'), ('void', 'void')) then
    raise exception 'invoice_transition_not_allowed' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger invoice_transition_guard
  before update on public.invoices
  for each row execute function public.guard_invoice_transition();

revoke execute on function public.guard_invoice_transition() from public, anon, authenticated;
```

The transition function that moves an invoice to `issued` or `paid` is a security-definer
function that reads the actor from `auth.uid()`, never from an argument, locks the row with
`select ... for update`, and writes its audit row in the same transaction.

### Separation

A class of record that must never appear in another workflow lives in its own schema with
its own grant, never behind a flag on a shared table, because a flag can be forgotten in a
`where` clause and a missing grant cannot. PostgREST exposes only the schemas the project's
settings list, so a new schema stays unreachable over the API until the Product Lead exposes
it, which is a decision for the handoff.

---

## Auth

- Authorisation on the server reads the verified user: `supabase.auth.getUser()` or
  `supabase.auth.getClaims()`. `getSession()` reads the cookie without verifying it, so it
  never decides access.
- Membership and role come from a table keyed by `auth.uid()`, such as `account_members`.
  Never from `user_metadata` (`raw_user_meta_data`), which the signed-in user can change
  about themselves. A policy that reads `auth.jwt() -> 'user_metadata'` is a privilege
  escalation. `app_metadata` is writable only with a privileged key, and still second best
  to a table the policies can index.
- Sign-out clears the session cookies and any local state, so the next person on a shared
  device sees nothing.
- The `service_role` key never leaves a server context. It bypasses every policy; in a
  browser bundle it is a full breach.

---

## RLS traps

These are the ones that bite. code-analyst and security-analyst check every one, and a hit
is a security finding, not a style point.

| Trap | Why it hurts | Fix |
|---|---|---|
| `auth.uid()` called bare in a policy | Re-evaluated for every row, so a list scan becomes thousands of calls | Wrap it: `(select auth.uid())`, which the planner evaluates once per statement |
| A policy that joins or filters on an unindexed column | A scan per row | Index every column a policy filters on, always |
| A membership check written as a correlated subquery per row | The same cost as the bare call | `account_id in (select private.my_account_ids())`, a set evaluated once |
| `security definer` without `set search_path = ''` | A caller can shadow an object and run code as the definer | Pin it on every definer function, with every reference schema-qualified |
| A view without `security_invoker = on` | Runs as its owner, silently skipping the caller's policies | Set it on every view in an exposed schema |
| A `security_invoker` view over a fully revoked table | Refuses every caller with `42501`, and gets "fixed" by dropping `security_invoker` | To hide columns: column grants on the table, then the view. To transform a column no client may read: a security-definer function as the only client path, and no client grant on the view |
| Column grants with `select=*` from the client | `*` expands to every column, including ungranted ones, so the request fails with `42501` | Name the columns, or read through the view |
| Row level security enabled with no policy | Denies everything, which looks like a bug and gets "fixed" by disabling it | Write the policies in the same migration that enables it |
| A new table with no `enable row level security` | Supabase's default privileges grant it to `anon` and `authenticated`, so it is open over the API at once | Enable it in the same file that creates the table. No exceptions |
| Policies written only for `select` | `insert`, `update` and `delete` fall to a broad grant added later to unblock someone | Write all four explicitly, even where one is `false` |
| `using` without `with check` on an update policy | A row can be updated into a state the caller could not have selected | Always both |
| A new function in `public` left executable by `anon` | Supabase's default privileges grant execute on it to `anon` and `authenticated`, so it is callable over `/rest/v1/rpc` | Revoke execute from `public` and `anon` on every function that is not part of the API |
| A policy or a function that reads `user_metadata` | The user writes that field about themselves | Read membership and role from a table |
| `service_role` in anything the browser downloads | Bypasses every policy. A full breach | It lives in Edge Function secrets and server environments only |
| A public Storage bucket for private files | Anyone with the path reads the file, and a path is not a secret | Private buckets with policies on `storage.objects`, and short-lived signed URLs |
| Default grants left in place on a new table | They include `truncate`, `references` and `trigger`, which row level security does not govern | Revoke all from `anon` and `authenticated`, then grant only the commands the policies cover |
| A table added to the realtime publication | Each change is checked against the subscriber's select policy, so a loose select policy leaks rows the moment they are written, to anyone subscribed | Add a table to `supabase_realtime` only with its select policy proved for every role that can subscribe |

`get_advisors` for type `security` catches several of these on the project. It does not
replace the table: a clean advisor run with a bare `auth.uid()` in a policy is still a
finding.

---

## PostgREST conventions

The API contract lives in `team-architecture` and `docs/architecture/contracts/`. PostgREST
is the transport.

| Concern | Convention |
|---|---|
| Reads | A table under row level security and column grants, a `security_invoker` view, or an RPC. A base table an invariant protects is revoked, and read only through a function. |
| Writes | An RPC for anything with a rule. Direct table writes only where the policies fully express the rule. |
| Errors | `raise exception '<snake_case_code>' using errcode = 'P0001'`. PostgREST answers 400 with the code in `message`, and the web data client wraps it into the one error shape in `team-architecture`. `42501` arrives as 401 for `anon` and 403 for a signed-in caller. Edge Functions return the error shape directly. Copy belongs to ux-writer. |
| Pagination | Keyset on a stable ordering such as `(created_at, id)`. Never `offset`, because rows move while a reader pages. The project's row cap is a backstop, not a page size. |
| Times | `timestamptz` throughout. A time zone that matters is its own labelled column, never inferred. |
| Enums | Postgres enum types, not check constraints on text, so the wire format, the schema and the generated types cannot drift. |
| Embedding | Use resource embedding rather than N round trips, but never across a boundary a policy protects. |

---

## Security probes

security-analyst runs these, and qc-engineer and qc-lead reuse the probe form for invariant
cases. Every tool here reads or probes; nothing is applied, deployed or changed.

### Keys

| Key | Where it may appear | What protects the data |
|---|---|---|
| Publishable key (`sb_publishable_...`), or the legacy `anon` key | The browser bundle, by design | Row level security and grants, and nothing else. A publishable key with a table left open is a public database. |
| Secret key (`sb_secret_...`), or the legacy `service_role` key | Edge Function secrets and server environments only | Nothing. It bypasses every policy. |

The privileged key names for the history pattern are `service_role`, `SERVICE_ROLE`,
`SUPABASE_SERVICE_ROLE_KEY`, `sb_secret_` and `SUPABASE_JWT_SECRET`. A legacy key is a JWT
(it starts `eyJ`), so decode the payload of any committed one and treat
`"role":"service_role"` as a leak.

```bash
# a privileged key name or value in anything the browser downloads: must print nothing
git grep -nE 'service_role|SERVICE_ROLE|sb_secret_|SUPABASE_JWT_SECRET' -- web/

# a secret key value anywhere in the tree, then in every commit on every branch
git grep -nE 'sb_secret_[A-Za-z0-9_-]{16,}'
git log -p --all | grep -nE 'sb_secret_[A-Za-z0-9_-]{16,}|SUPABASE_SERVICE_ROLE_KEY\s*=\s*\S+'

# a browser variable named like a secret: must print nothing
git grep -nE 'NEXT_PUBLIC_[A-Z0-9_]*(SECRET|SERVICE|PRIVATE)'
```

A hit in `web/` stops the gate and is a rotation event: the fix is a new key, not a deleted
line.

### Catalogue queries

Run each in its own `execute_sql` call, add every schema the migrations create to the list,
and save the call and its rows as `evidence/security/catalogue-<query>.json`. Every query
here ran under the offline proof except the Storage one, which needs the platform.

```sql
-- tables with row level security off in a project schema: must return nothing
select n.nspname as schema_name, c.relname as table_name
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where c.relkind in ('r', 'p')
   and n.nspname in ('public', 'private')
   and not c.relrowsecurity;

-- row level security on with no policy: must return nothing
select c.oid::regclass as table_name
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where c.relkind in ('r', 'p')
   and n.nspname in ('public', 'private')
   and c.relrowsecurity
   and not exists (select 1 from pg_policy p where p.polrelid = c.oid);

-- what the client roles hold on each table: read against the architecture
select table_schema, table_name, grantee,
       string_agg(privilege_type, ', ' order by privilege_type) as privileges
  from information_schema.role_table_grants
 where grantee in ('anon', 'authenticated')
   and table_schema in ('public', 'private')
 group by table_schema, table_name, grantee
 order by table_schema, table_name, grantee;

-- security definer functions without a pinned search path: must return nothing
select p.oid::regprocedure as function_name
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where p.prosecdef
   and n.nspname in ('public', 'private')
   and not exists (
     select 1 from unnest(coalesce(p.proconfig, '{}')) setting
      where setting like 'search_path=%');

-- views that run as their owner: must return nothing
select c.oid::regclass as view_name
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where c.relkind = 'v'
   and n.nspname in ('public', 'private')
   and not exists (
     select 1 from unnest(coalesce(c.reloptions, '{}')) opt
      where opt ~* '^security_invoker=(on|true|yes|1)$');

-- functions anon may execute: each one must be meant for an anonymous caller
select p.oid::regprocedure as function_name
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname in ('public', 'private')
   and has_function_privilege('anon', p.oid, 'execute');

-- every policy, for the review against the permission matrix
select schemaname, tablename, policyname, cmd, roles, qual, with_check
  from pg_policies
 where schemaname in ('public', 'private')
 order by schemaname, tablename, cmd;

-- Storage buckets: a public one must hold only public files
select id, public from storage.buckets;
```

### Role-switched probes

The catalogue shows the setting; a probe as the caller shows the effect. One probe per
`execute_sql` call, because the first error aborts the transaction, and every probe inside
`begin; ... rollback;` so nothing it does persists.

```sql
begin;
set local role anon;
select count(*) from public.invoices;   -- expected: 42501, no grant
rollback;
```

```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<member of account A>","role":"authenticated"}';
select count(*) from public.projects
 where account_id = '<account B>';      -- expected: 0
rollback;
```

```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<member of account A>","role":"authenticated"}';
update public.projects set name = 'probe'
 where account_id = '<account B>'
returning id;                            -- expected: no rows
rollback;
```

Probe every command, not only `select`, and every role in the permission matrix.

### The same cases from outside

Then send the same case to the REST URL with the publishable key, as a real client would,
with curl or a node fetch script. The base comes from `get_project_url`; the keys and a test
user's access token come from the environment, never from the repository or the evidence.

```bash
# anonymous: expected 401 with code 42501, never a 200
curl -s -w '\n%{http_code}\n' "$SUPABASE_URL/rest/v1/invoices?select=id" \
  -H "apikey: $SUPABASE_PUBLISHABLE_KEY"

# a signed-in member of account A asking for account B: expected 200 and []
curl -s -w '\n%{http_code}\n' "$SUPABASE_URL/rest/v1/projects?select=id&account_id=eq.<account B>" \
  -H "apikey: $SUPABASE_PUBLISHABLE_KEY" \
  -H "Authorization: Bearer $MEMBER_A_ACCESS_TOKEN"
```

A test user's access token comes from signing a test account in through
`$SUPABASE_URL/auth/v1/token?grant_type=password`. The Product Lead sets up the test
accounts; their passwords live in the environment of the machine that runs the probe.

---

## Query plans

A plan read as the connecting role skips every policy, so it says nothing about the policy's
cost. Read it as the role the policy applies to, inside a transaction that rolls back,
because `EXPLAIN ANALYZE` runs the statement:

```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<member of account A>","role":"authenticated"}';
explain (analyze, buffers)
select id, name from public.projects
 order by created_at desc, id desc
 limit 50;
rollback;
```

Save it as `evidence/backend/explain-<query>.txt`, labelled with where it ran and as which
role. A sequential scan on a large table under a policy, or a policy function called once
per row, is a finding. The offline proof can produce a plan too, labelled PGlite, but only
at the row counts the seed provides.

---

## pgTAP

The invariant suite reads as a specification, and it is the product's claim in executable
form. Every change that touches a policy, a grant, a view or a security-definer function
touches this suite, or it is a finding, because the surface moved and nobody re-proved the
claim.

Every test file opens with `begin;` and ends with `rollback;`, and inserts any rows it needs
inside that transaction, so the same file proves the same thing in both places and leaves
nothing behind.

| Where | How | Evidence |
|---|---|---|
| Offline | The offline proof, under the shim | `evidence/backend/db-test-pglite.tap`, labelled PGlite |
| On the project | `execute_sql`, with the file's exact contents as the query, after a migration has enabled `pgtap` in the `extensions` schema | `evidence/backend/pgtap-project-<test file>.tap` |

The suites live at fixed paths, so every role finds them: `supabase/tests/invariants.test.sql`
for the rules in `PROJECT.md § Product invariants`, `supabase/tests/rls.test.sql` for every
table and every role, and `supabase/tests/transitions.test.sql` for every legal and illegal
transition. More files may sit beside them.

`execute_sql` returns one result set, and for a query of many statements that is, in
practice, the last one that returned rows. A plain pgTAP file therefore sends back a single
line, and the plan and every earlier result are lost. Write each test file in the collector
form, which gathers every TAP line into a temporary table and returns them all from the
final select. It runs unchanged offline, where the proof reads the same rows, and it still
works if a server returns every result set.

```sql
-- supabase/tests/invariants.test.sql
begin;

-- Collects every TAP line, so the last statement before rollback returns the whole run.
create temp table tap_out (n integer generated always as identity, line text) on commit drop;
grant insert, select on tap_out to public;

insert into tap_out (line) select plan(4);

-- I1: a member reads only the rows of accounts they belong to
set local role authenticated;
set local request.jwt.claims = '{"sub":"<member of account A>","role":"authenticated"}';

insert into tap_out (line) select results_eq(
  $$ select name from public.accounts $$,
  array['Account A'],
  'member_of_other_account_reads_nothing'
);

insert into tap_out (line) select throws_ok(
  $$ select internal_note from public.invoices $$,
  '42501',
  null,
  'the internal note has no grant, so it never crosses the boundary'
);

insert into tap_out (line) select throws_ok(
  $$ select * from public.team_hours_report('<account B>', '2026-09-01', '2026-09-30') $$,
  'P0001',
  'not_found',
  'another account''s report is refused as not found'
);

reset role;

-- the guarded transition holds whatever wrote the row
insert into tap_out (line) select throws_ok(
  $$ update public.invoices set total_minor = 1 where status = 'issued' $$,
  'P0001',
  'invoice_issued_is_immutable',
  'issued_invoice_refuses_edit'
);

insert into tap_out (line) select * from finish();
select line from tap_out order by n;
rollback;
```

Role checks switch role inside the transaction with `set local`, and switch back with
`reset role` before anything that must run as the owner. The grant on `tap_out` is what lets
the switched role write its results.

Name each test after the rule it proves, as the architecture names it. Cover every table and
every role, positive and negative, including a direct read of each revoked base table that
must be refused with `42501`.

---

## Edge Functions

Edge Functions carry what the database should not do: outbound email and messages, provider
webhooks, payment calls, and anything that reads a secret.

- Each lives at `supabase/functions/<name>/index.ts`. Deploy it with `deploy_edge_function`,
  with the files exactly as they are in the repository, after the schema it relies on.
- Prove it by calling `<project url>/functions/v1/<name>` with curl or a node fetch script,
  with and without a valid session, and read `get_logs` for the `edge-function` service
  straight after, because it returns recent entries only. Save both.
- JWT verification stays on. A provider webhook is the exception: it turns verification off
  for that function only and verifies the provider's signature instead.
- The function creates its Supabase client with the caller's `Authorization` header, so row
  level security applies to what it reads and writes. A privileged client is used only
  where the ADR says the function must bypass a policy, and then it takes the caller's
  identity from the verified JWT, never from the request body.
- Every outbound side effect carries an idempotency key under a unique constraint in the
  database. An idempotency proof sends the same request twice to the deployed function and
  counts the rows through `execute_sql`.
- No personal data, token or secret in a log line, no personal data in a URL, and a
  dead-letter row rather than a silent drop.
- Imports are pinned to exact versions (`npm:` or `jsr:` specifiers with a version), because
  they resolve at deploy time.
- Type checking needs Deno, which is not used. engineering-lead records it as
  `deferred: no local Deno`, never as clean. The deploy succeeding and the calls answering
  are the proof.
- Every secret the function reads is named in `decisions_for_product_lead`, never valued.
  release-engineer verifies it by calling the function and reading the logs for a
  missing-variable error.

---

## Generated types

`generate_typescript_types` returns the database's types. Write them to
`web/src/lib/database.types.ts` exactly as returned, after every migration applied in the
run, and never edit the file. Keep it out of the lint and format passes, so nothing rewrites
it.

engineering-lead proves the committed file is current: generate again, save the output as
`evidence/engineering-lead/database.types.generated.ts`, and compare byte for byte:

```bash
git diff --no-index --exit-code web/src/lib/database.types.ts .devteam/runs/<run-id>/evidence/engineering-lead/database.types.generated.ts
```

A difference means a migration was applied after the types were written, or the file was
edited. Either way it goes back to frontend-engineer.

---

## Release on this stack

The target environment is the Supabase project whose ref is in `.mcp.json`. release-engineer
runs this sequence, with the pre-flight in `team-release` first. The data layer goes first
and stays backward compatible for one release, so the running client never talks to a schema
it does not know.

```
1. Prove offline     the db test command, output saved to evidence/release/
2. Data layer        apply_migration once per file list_migrations does not show, in
                     filename order, name = the file's slug, query = its exact contents
3. Verify            list_migrations matches supabase/migrations/ exactly, by name and order;
                     list_tables shows row level security on every table
4. Prove on project  every supabase/tests/*.test.sql through execute_sql
5. Platform checks   get_advisors for security and performance, clean or accepted in writing;
                     the key scan in Security probes, clean
6. Functions         deploy_edge_function for each function in the diff, after the schema;
                     call each URL, read get_logs, and confirm the API serves the new shape
                     and still serves the old one
7. Front end         npm ci at the root and in web/, then the build command, green.
                     Front-end hosting: deferred: no target chosen
8. Smoke             a local production build of web/ (npm run build, then npm run start)
                     pointed at the project, driven with Playwright through npx playwright
9. Tag and push      as PROJECT.md § Release and team-release set out
```

Rollback on this stack:

1. The release commits are reverted with `git revert` and the revert is pushed. Never
   force-push.
2. Edge Functions are redeployed from the previous release tag's source with
   `deploy_edge_function`.
3. A backward-compatible migration stays. One that is not ships its written reverse as a
   new migration file, applied with `apply_migration` in the order `rollback.md` states.
   Never apply SQL that is not in a migration file.
4. The previous version is verified with `list_migrations`, the pgTAP suite through
   `execute_sql`, `get_advisors` and the smoke paths.

---

## Before handing off

backend-engineer's step 4 checklist on this stack. Each line has an evidence path.

- [ ] Every new table enables row level security in the file that creates it, with all four
      command policies, the default grants revoked and only the covered commands granted
- [ ] Every base table an invariant protects is revoked from `anon` and `authenticated`, and
      reached only through a function or through column grants
- [ ] Every security-definer function pins `search_path = ''` and schema-qualifies every
      reference
- [ ] Every view in an exposed schema sets `security_invoker = on`
- [ ] Every policy wraps `auth.uid()` in a scalar subquery, and every column a policy filters
      on is indexed
- [ ] Every update policy has both `using` and `with check`
- [ ] No function that is not part of the API is executable by `anon`
- [ ] No policy or function reads `user_metadata`
- [ ] Every refusal names the invariant, never the input
- [ ] The invariant suite covers every invariant this change touched, in the collector form,
      and passes offline (`db-test-pglite.tap`) and on the project
      (`pgtap-project-<test file>.tap`)
- [ ] No secret or `service_role` key value anywhere outside Edge Function secrets and
      server environments, and no reference to one under `web/`
- [ ] Every migration is hand-authored in `supabase/migrations/`, has its reverse in the
      rollback notes proved offline and on the project, and was proved in a rolled-back
      transaction on the project before `apply_migration`
- [ ] `list_migrations` shows every migration file by name and in order, and `list_tables`
      output is saved
- [ ] `get_advisors` is clean for `security` and `performance`, or every finding is accepted
      in writing, with the output saved
- [ ] `web/src/lib/database.types.ts` was regenerated with `generate_typescript_types`
- [ ] Every Edge Function touched was deployed with `deploy_edge_function` and proved by a
      call to its URL, with the `get_logs` lines saved
- [ ] Every Edge Function secret and project setting the change needs is named in
      `decisions_for_product_lead`, with no value written anywhere
- [ ] If the MCP did not answer, `status` is `blocked` with the reason
      `supabase MCP not authorised`, and the offline proof is attached
