# PROJECT.md

The project profile. Every fact about this product that an agent needs, and that is not
true of every product, lives here: the stack, the commands, the locales, the brand, the
invariants and the release target. Agents cite a section by its heading, for example
`PROJECT.md § Stack`, and never copy its values into their own files.

Each unanswered item below carries a to-do marker. While any marker remains, the
orchestrator runs kickoff before it opens a run: it asks the Product Lead about one section
at a time and writes the answers here, replacing the marker. Values marked "default" are
already filled in; change them only where this project differs. A worked example for a
small SaaS product sits in a comment at the end of this file, visible in the source and
hidden when rendered.

An agent that needs a fact this file does not hold hands off `blocked` and names the
section in `missing_inputs`. It never guesses.

---

## Product

What the product is, who uses it, and the one claim it must keep. Two to four sentences.
Every agent reads this before it plans, and the claim is what the gates protect.

TODO: what the product is, who uses it, and the one claim it must keep.

## Product Lead

The one person who can change scope, accept a release or overrule a gate, and how an
escalation reaches them. Agents address them by role; the name lives only here.

TODO: name, and how escalations reach them.

## Stack

The technology at each layer, with versions where they matter.

| Layer | Choice |
|---|---|
| Front end | TODO: |
| Back end | TODO: |
| Database | TODO: |
| Hosting | TODO: |

## Commands

The command for each purpose. Commands run from the repository root; where one belongs in
a subfolder, write it that way, for example `cd web && npm run build`. `none` is a valid
value: an agent then skips that step and says so in its evidence, rather than inventing a
command.

| Purpose | Command |
|---|---|
| install | TODO: |
| dev | TODO: |
| build | TODO: |
| lint | TODO: |
| typecheck | TODO: |
| test | TODO: |
| e2e | TODO: |
| db test | TODO: |

## Toolchain

What is installed on the machine the team runs on, and what is never assumed. The team
itself needs only git and node. A step that needs a tool not listed as present is reported
as `blocked`, never faked. The Playwright MCP server (`playwright` in `.mcp.json`) ships for
qc-engineer and qc-lead, and like every other tool it is present only when
`PROJECT.md § Toolchain` lists it.

| | |
|---|---|
| Present | TODO: tools and versions, and any MCP servers the project connects |
| Never assumed | TODO: tools an agent must not rely on, or `none` |

## Stack pack

The `stack-*` skill under `.claude/skills/` that matches the stack, or `none`.
Stack-dependent agents read it by path at step 1. With `none`, they work from the Stack and
Commands sections above.

TODO: `stack-nextjs-supabase`, another `stack-*` skill, or `none`.

## Locales

Every locale a feature ships in, which one is authored first, and which are written right
to left. Every feature ships in all of them, in the same run. A string stays marked
`needs native review` until the native reader named for its locale has read it on a device.

| | |
|---|---|
| Locales | TODO: each locale with its code |
| Authored first | TODO: |
| Right to left | TODO: the right-to-left locales, or `none` |
| Native readers | TODO: per locale, the person who reads its strings on a device, or `none` for a locale with no native reader yet |
| Calendar | Gregorian (default). Name another only where a locale needs one, for example `th` Buddhist. |

## Brand

Where the brand spec lives and where the design references are. The design roles take
every value from the brand spec. References set structure and feel, never a value.

| | |
|---|---|
| Brand spec | `BRAND.md` (default). Until it exists, ux-designer drafts it from `templates/BRAND.md` and the references, for the Product Lead to approve. |
| Design references | TODO: a folder of approved reference images, for example `design/references/`, or `none` |

## Product invariants

The rules the product must never break, numbered I1, I2 and onward. Each one says what
holds, which layer holds it (the database, the server), and whose access or data it
protects. An invariant is never enforced only in the client.

TODO: I1 and onward, one line each.

## Quality bar

What every surface is verified against before it passes.

| | |
|---|---|
| Widths to verify | 320, 360, 768, 1024, 1440 (default) |
| Design baseline | 360 (default). The width each surface is designed at first; every larger layout inherits from it. |
| Accessibility | WCAG 2.2 AA (default) |
| Devices and browsers | TODO: the devices, browsers and themes every surface is tested on |
| Least capable device | TODO: the slowest device and weakest connection a reader uses, for example a mid-range Android phone on a slow 4G connection. Performance and motion are judged on it. |

## Release

Where a release goes, from which branch, and how it is tagged.

| | |
|---|---|
| Target | `deferred: no target chosen` (default). While deferred, release-engineer records it as such, which does not fail the release gate. |
| Branch | TODO: |
| Tag format | TODO: |

## House rules

Rules every agent follows that are particular to this project.

| | |
|---|---|
| Attribution | None (default). No co-author line, no generated-by line and no mention of any tool or model, on any commit, tag, pull request, release note, code comment or document. |
| Commit style | TODO: |
| Anything else | TODO: any other rule every agent must follow, or `none` |

<!--
Worked example. A filled profile for a fictional product, kept here as a guide to the
level of detail each section wants. It is a comment, so no agent reads it as this
project's profile.

§ Product

Acme Billing is invoicing for small agencies. Account owners create projects, log billable
work, send invoices and see what is owed on a dashboard. Members log their own time and
never see billing. The claim it must keep: an invoice total always equals the sum of its
lines, and no account ever sees another account's data.

§ Product Lead

Jordan Lee. Escalations arrive as decisions_for_product_lead entries in a handoff, and the
orchestrator raises them in the session. Nothing waits on email.

§ Stack

| Layer | Choice |
|---|---|
| Front end | Next.js 15, App Router, TypeScript, in web/ |
| Back end | Supabase: PostgREST, database functions, Edge Functions, Auth |
| Database | Supabase Postgres 15 with Row Level Security on every table |
| Hosting | Not chosen yet |

§ Commands

| Purpose | Command |
|---|---|
| install | npm install && cd web && npm install |
| dev | cd web && npm run dev |
| build | cd web && npm run build |
| lint | cd web && npm run lint |
| typecheck | cd web && npm run typecheck |
| test | cd web && npm test |
| e2e | cd web && npm run e2e |
| db test | node .claude/skills/stack-nextjs-supabase/scripts/db-test.mjs |

§ Toolchain

| | |
|---|---|
| Present | git, node 24, npm, npx, the Supabase MCP server scoped to one project, and the Playwright MCP server for qc-engineer and qc-lead |
| Never assumed | Docker, the Supabase CLI, Deno, the Vercel CLI, pnpm, psql, jq, python |

§ Stack pack

stack-nextjs-supabase

§ Locales

| | |
|---|---|
| Locales | English (en), French (fr), Arabic (ar) |
| Authored first | English |
| Right to left | Arabic |
| Native readers | en: Jordan Lee. fr: Camille Martin. ar: none yet, so every Arabic string ships marked needs native review. |
| Calendar | Gregorian (default) |

§ Brand

| | |
|---|---|
| Brand spec | BRAND.md (default) |
| Design references | design/references/ |

§ Product invariants

I1. A user reads and writes only rows that belong to an account they are a member of.
    Held by Row Level Security on every table. Protects each account from the members of
    every other account.
I2. An invoice total equals the sum of its lines, to the minor unit, in the invoice
    currency. Held by a database constraint and a trigger. Protects the customer being
    billed.
I3. A sent invoice is never edited. A correction is a credit note that references it.
    Held by a guarded state transition in the database. Protects the audit trail.
I4. Only an account owner sees rates, invoices and totals. Members see their own time
    entries and nothing that carries a rate. Held by Row Level Security and a
    security-definer function behind the dashboard. Protects rates from members.
I5. Money is stored as integer minor units with an ISO 4217 currency code, never as a
    floating-point number. Held by column types and a check constraint.

§ Quality bar

| | |
|---|---|
| Widths to verify | 320, 360, 768, 1024, 1440 (default) |
| Design baseline | 360 (default) |
| Accessibility | WCAG 2.2 AA (default) |
| Devices and browsers | A mid-range Android phone on Chrome, an iPhone on Safari, and the latest two versions of Chrome, Firefox and Safari on desktop, in light and dark themes |
| Least capable device | The mid-range Android phone on a slow 4G connection |

§ Release

| | |
|---|---|
| Target | deferred: no target chosen (default) |
| Branch | main |
| Tag format | v<major>.<minor>.<patch>, for example v1.4.0 |

§ House rules

| | |
|---|---|
| Attribution | None (default) |
| Commit style | An imperative subject under 72 characters, then a body that says why |
| Anything else | British spelling in code comments and documents |
-->
