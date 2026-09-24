---
name: team-architecture
description: Design and record the architecture of the product described in PROJECT.md. Covers the domain model drawn from its Product section, the product invariants from its Product invariants section and the layer that must enforce each one, the architecture of record, API contracts and their conventions, ADRs and where they live, and the task briefs frontend-engineer and backend-engineer build from. Use when making a technical decision, writing or superseding an ADR, issuing a task brief, choosing the layer that holds an invariant, checking a module header or a boundary against the architecture, or re-reading a diff after a change lands to confirm the architecture still holds.
---

# Architecture

This skill covers the architecture of record for the product in `PROJECT.md`, and the
artefacts the tech-architect produces from it. The ADR records a decision. The contract fixes an API shape
once, for both sides. The task brief is what the implementing agents build from.

A task brief that leaves the implementer guessing is a defect in the architect's work. The
implementer should never need a follow-up question.

---

## Where the facts come from

Every product and stack fact has one home. This skill says how to use each one and never
holds a second copy.

| Fact | Source of record | What this skill does with it |
|---|---|---|
| What the product is, who uses it, the one claim it must keep | `PROJECT.md § Product` | Derives the domain model, in the product's own language |
| The rules that must always hold, numbered I1, I2 and on | `PROJECT.md § Product invariants` | Chooses the layer that enforces each one and the test that proves it |
| Front end, back end, database, hosting | `PROJECT.md § Stack` | Writes the deployment shape into the architecture of record |
| Mechanisms, repository layout and evidence names for the stack | The stack pack named in `PROJECT.md § Stack pack`, read at `.claude/skills/<pack>/SKILL.md` | Briefs name only mechanisms the stack has, at paths the layout has |
| The tools that exist | `PROJECT.md § Toolchain` | A brief never asks for a tool that is not listed |
| Where and how the product ships | `PROJECT.md § Release` | The deployment shape records `deferred: no target chosen` until a target is set |
| The Product Lead | `PROJECT.md § Product Lead` | Receives every escalation this skill names |

Cite the section by name. Never restate its values in an ADR or a brief, because two copies
drift and the stale one gets built. A fact the work needs that `PROJECT.md` does not hold is
a `blocked` handoff with `missing_inputs`, never a guess.

---

## Domain model

Use the product's own language. Code that says `Item`, `Record` and `Status` where the
product says invoice, credit note and issued has already started drifting away from the
product.

The domain model lives in the architecture of record at `docs/architecture/architecture.md`.
The first run writes it from `PROJECT.md § Product`. Each entity gets one row: what it is,
and the rules that bind it. Each name goes into the glossary at
`docs/architecture/glossary.md`, and the same name is used in code, in copy and in the
database.

The worked example below is a generic SaaS product: accounts that run projects and bill for
them with invoices. It shows the shape and the depth a real model needs. Your entities come
from `PROJECT.md § Product`.

| Entity | Is | Rules that bind it |
|---|---|---|
| `Account` | The customer, and the tenant boundary | Every row beneath it carries its account. Nothing reads or writes across accounts. |
| `Member` | A person with access to an account | One role per account. A person may belong to several accounts. May have a single name, so a family name is never required. |
| `Project` | A unit of work an account bills for | Belongs to one account. Archived, never deleted, while an invoice refers to it. |
| `Invoice` | A request for payment for one project | Draft until issued. Immutable once issued. Numbered in sequence per account. |
| `LineItem` | One charge on an invoice | Amount in integer minor units, in the invoice's currency. Never a float. |
| `Payment` | Money received against an invoice | Never takes the outstanding balance below zero. Idempotent on the payment provider's id. |
| `CreditNote` | The correction to an issued invoice | Refers to exactly one issued invoice. The only way an issued amount changes. |
| `Period` | An accounting period for an account | Once closed, nothing dated inside it can be written. |
| `AuditEntry` | Who changed what, and when | Insert only. Never updated, never deleted. |

An enum is part of the model. In the example, invoice status is `draft`, `issued`,
`part_paid` or `paid`: exactly these four, defined once, and a fifth value needs an ADR. A
second copy of an enum on the other side of the API is a defect, because it drifts from the
first.

### Keys and labels

A status key or a role key is an internal identifier. It is never what a reader sees. The
written label belongs to ux-writer, and it names the thing in the reader's terms. Every
contract therefore carries the key and a label key as two fields (`status` and
`status_label_key`), so a label can be rewritten or translated without a migration and
without a client mapping keys to words in one language. The payload carries the label key,
never the rendered words: ux-writer authors the strings, and the client resolves the key
from the string catalogue in the reader's locale, for every locale in `PROJECT.md § Locales`.

---

## Product invariants

Invariants are the product's claim, expressed as code. They are listed in
`PROJECT.md § Product invariants`, and that list is the register. This skill holds the method
and an example, never a second copy of your invariants.

A change that weakens an invariant is an escalation to the Product Lead, never a trade made
under delivery pressure. Adding an invariant, or moving where one is enforced, is an ADR.

Each invariant is enforced in the lowest layer that can hold it, so it holds against a leaked
client key, a direct database connection and a caller who never opens the interface. The
client may repeat a rule to give the reader early feedback. It never holds a rule alone.

### Choosing the layer

| The rule is about | Hold it with | Why that layer |
|---|---|---|
| Which rows a caller may see or write | A row-level policy for every command, or a server function that is the only granted path | A filter in application code holds only for callers who route through that code |
| Which transitions are valid | A before-update trigger, or one server function that is the only writer | A visibility policy decides who sees a row and cannot say what the row may become |
| A value inside one row | A check constraint or a column type | Holds for every writer with no application code at all |
| Uniqueness or a sequence | A unique index, with allocation in the same transaction as the write | A read-then-insert check races |
| A property of a set: a sum, a count, a balance | A server function that locks what it reads and refuses in the same transaction | A row policy and a check constraint each see one row |
| History that must never change | An insert-only grant, with no update or delete grant to anyone | A grant that was never given cannot be misused |

The stack pack names the concrete mechanism for each of these on its stack. With
`PROJECT.md § Stack pack` set to `none`, the architecture of record names them from
`PROJECT.md § Stack` on the first run.

### Worked example

The invariants the example product would write in `PROJECT.md § Product invariants`, with
the enforcement point and the test the architecture assigns to each.

| # | Invariant | Enforced where | Test, named as the rule |
|---|---|---|---|
| I1 | A member reads and writes only the rows of accounts they belong to | A row-level policy on every tenant table, for all four commands, keyed on membership of the row's account. The account comes from the verified session, never from a value the client sends. | `member_of_other_account_reads_nothing` |
| I2 | An issued invoice is never edited. A correction is a credit note. | A before-update trigger on invoices and line items that refuses any change to a document column once the invoice is issued. A trigger, because this is a rule about valid transitions. | `issued_invoice_refuses_line_edit` |
| I3 | Nothing dated inside a closed period is written | The same trigger family, on insert and update, for invoices, payments and credit notes, reading the period's closed flag | `write_into_closed_period_is_refused` |
| I4 | A payment or credit never takes an invoice's outstanding balance below zero | The payment and credit functions lock the invoice row, read the balance and refuse in one transaction. A check constraint sees one row, so it cannot hold this. | `concurrent_overpayment_admits_exactly_one` |
| I5 | Invoice numbers run in sequence per account and are never reused | A unique index on account and number, with the number allocated by the issuing function in the same transaction as the status change | `invoice_number_is_never_reused` |
| I6 | Every change to an invoice, a payment or a credit note writes an audit entry | The triggers and functions above write the audit row in the same transaction. The audit table has an insert grant and nothing else. | `credit_note_without_audit_entry_is_impossible` |

Every invariant has a dedicated test with a positive case and a negative case, in the test
suite the stack pack sets out, or run by the test command in `PROJECT.md § Commands` when the
pack is `none`. An invariant with no test fails the design-authority gate, because an
enforcement point nobody exercises is an assumption.

---

## Architecture of record

`docs/architecture/architecture.md` is the description the whole team reads. It holds, in
this order:

1. The product in one paragraph, citing `PROJECT.md § Product`.
2. The domain model, as above.
3. The boundaries, numbered B1, B2 and on, each with what erosion looks like in a diff.
4. The trust boundaries: every third party, and exactly what data crosses to it.
5. The data flow for each path that writes, from the reader's action to the stored row.
6. The deployment shape, from `PROJECT.md § Stack` and `PROJECT.md § Release`.
7. The invariants, cited by number from `PROJECT.md § Product invariants`, each with its
   enforcement point and its test. Cited, never restated.

The boundaries the example product would record:

| # | Boundary | What erosion looks like in a diff |
|---|---|---|
| B1 | Account to account | A query with no account predicate, a cache key without the account, a join that can pair rows from two accounts |
| B2 | Client to data layer | A client reading a table that only a server function should serve, or a rule applied only in the interface |
| B3 | Billing to reporting | The dashboard computing a balance from raw payments instead of reading the billing function's figure, so one number has two formulas |
| B4 | Issued record to any edit path | A write to an issued invoice or into a closed period through an admin action, a bulk import, a data migration or a support script |
| B5 | Identity and permission to everything | A permission checked in the page only, or derived from a role name instead of the member's role in this account |
| B6 | Server to outbound channels | An email body assembled in the client, a payload carrying more than the message needs, a count concatenated into a sentence |
| B7 | Product to third parties | Customer data sent to a processor that no ADR names |

A stale architecture document is worse than none, because people trust it. When a change
moves a boundary, the same run updates the architecture of record. A genuinely new boundary
is added to the list in the run that creates it.

---

## Repository layout

This skill does not fix where product code lives. The layout comes from the stack pack's
layout section when `PROJECT.md § Stack pack` names a pack, and from `PROJECT.md § Stack`
when it is `none`. With `stack-nextjs-supabase` that is `web/` for the application and
`supabase/migrations/` for the database, as the pack sets out. The architecture of record
cites whichever applies and never copies it.

What this skill does fix is where the architecture's own files live:

```
docs/architecture/architecture.md              the architecture of record
docs/architecture/glossary.md                  one name per concept
docs/architecture/contracts/<resource>.md      one file per API resource, the single source
docs/decisions/adr-NNNN-<slug>.md              ADRs of record, immutable once accepted
.devteam/runs/<run-id>/tech-architect/
    adr-NNNN-<slug>.md                         the run's copy of each ADR it wrote
    brief-frontend.md                          task brief for frontend-engineer
    brief-backend.md                           task brief for backend-engineer
```

The run folder sits under `DEVTEAM_RUNS_DIR` where that is set. A task brief never tells an
implementer to use a tool `PROJECT.md § Toolchain` does not list, and never names a path the
layout does not have unless the brief says the implementer creates it.

---

## ADRs

One file per decision. Numbered, and immutable once accepted: a changed decision is a new
ADR that supersedes the old one.

The ADR of record is `docs/decisions/adr-NNNN-<slug>.md`: four digits, sequential, never
reused. Find the next free number by listing `docs/decisions/adr-*.md`. The slug is the
decision in a few lowercase words joined by hyphens.

Copy each ADR, byte for byte, to `.devteam/runs/<run-id>/tech-architect/adr-NNNN-<slug>.md`
in the same step, and list both paths in `produced`. The docs file is the record, and it is
committed. The run folder is gitignored, and the copy is there because the run's consumers
and the utilisation check read the run folder. If the two ever differ, the docs file wins
and the difference is a defect.

An accepted ADR is never edited, with one exception: when a later ADR supersedes it, its
`Superseded by` line is filled in. The date comes from the shell (`date -u +%Y-%m-%d`),
never from memory.

Every heading is required, even when the answer is short.

```markdown
# ADR-0004: An issued invoice is corrected by credit note, never edited

Status: accepted                  (proposed, accepted, or superseded by ADR-NNNN)
Date: 2026-09-20
Run: 2026-09-20-invoice-corrections
Invariants touched: I2, I6
Supersedes: none
Superseded by: none

## Context

Account owners find mistakes after an invoice is issued: a wrong quantity, a line billed to
the wrong project. Support has been correcting them by editing the row, which changes a
document the customer already holds and leaves an audit trail showing a total nobody was
sent.

## Options considered

| Option | Consequence |
|---|---|
| Allow audited edits to issued invoices | Quick to build. The customer's copy and ours disagree, and I2 becomes a setting. |
| Void and reissue under a new number | Every correction spends a number, and the customer receives two documents for one piece of work. |
| Credit note against the issued invoice | The issued invoice never changes. The correction is its own document with its own number, and the balance is the invoice less its credit notes and payments. |

## Decision

Credit note. An issued invoice is immutable in every column that appears on the document.
A correction is a credit note that refers to exactly one issued invoice. The outstanding
balance is computed by one function from the invoice, its credit notes and its payments.
The guard is a before-update trigger, so it holds for support scripts and imports as well as
for the interface.

## Consequences

- The invoice page needs a credit notes panel, and the dashboard's balance must read the
  same function as the invoice page (B3).
- Support loses direct edits. They need a create-credit-note action on the first day, or
  the pressure to relax the trigger arrives within a week.
- Accounting exports gain a document type, and customers who import them need telling.

## What would make us revisit

A jurisdiction whose tax rules require reissue rather than credit, confirmed in writing, or
credit notes exceeding one in ten issued invoices over a quarter, which would say the draft
step is failing.
```

---

## Contracts

One file per resource at `docs/architecture/contracts/<resource>.md`. Written once, here,
and consumed by both sides. Every section is filled, and every body is written out as an
example. Prose about a shape is not a shape.

```markdown
# Contract: invoices

Owner: tech-architect. Last ADR: ADR-0004

## GET /api/v1/invoices

Auth: member session. Scope: the account in the session, never one named in the request.
Query: status (enum, optional), project (uuid, optional), cursor (string, optional),
       limit (int, default 25, max 100)
Ordering: due_at descending, then id. Server side only.

200:
{ "next_cursor": "eyJkdWVfYXQiOiIyMDI2LTEwLTAxIn0",
  "results": [ { "id": "3f6c1d2e-8a41-4c7b-9e0f-5b2a7d914c63", "number": "INV-0042",
    "project": { "id": "a81e04b9-2c5d-4f3a-8b67-0d9e1c2f7a58", "name": "Harbour Street fit-out" },
    "status": "part_paid", "status_label_key": "invoice.status.part_paid",
    "total_minor": 1250000, "outstanding_minor": 450000, "currency": "GBP",
    "issued_at": "2026-09-01T09:00:00Z", "due_at": "2026-10-01T22:59:59Z",
    "account_time_zone": "Europe/London" } ] }

Errors use the one shape in the conventions below:
400: { "error": { "code": "invalid_query", "message_key": "error.invalid_query",
       "fields": { "limit": ["max_100"] }, "trace_id": "7c0e9b" } }
401: { "error": { "code": "unauthenticated", "message_key": "error.unauthenticated",
       "fields": {}, "trace_id": "7c0e9c" } }

Idempotency: reads are safe to repeat.
```

---

## Task briefs

The task brief is the artefact frontend-engineer and backend-engineer build from. It must
be implementable without a follow-up question. If the implementer has to ask, the brief was
incomplete, and the fix is to the brief.

Paths: `.devteam/runs/<run-id>/tech-architect/brief-backend.md` and `brief-frontend.md`.

```markdown
# Task brief for backend-engineer, run 2026-09-20-invoice-corrections

For: backend-engineer
ADRs that bind this: ADR-0004
Invariants that bind this: I1, I2, I4, I6

## Build

1. A `credit_notes` table and its lines, account scoped, with row-level policies for all
   four commands (I1). One migration.
2. The guard: a before-update trigger on invoices and line items that refuses any change to
   an issued invoice's document columns (I2). One migration.
3. A server function `create_credit_note(invoice_id, reason, lines, idempotency_key)` that
   locks the invoice, refuses a credit that would take the outstanding balance below zero
   (I4), and writes the credit note, its lines and the audit entry (I6) in one transaction.
   One migration.
4. `outstanding_balance(invoice_id)` amended to subtract credit notes, and the dashboard's
   balance figure reading it instead of computing its own (B3). One migration.

Every migration is hand-authored, forward-only and one concern per file, applied and proved
the way the stack pack sets out.

## Contract

docs/architecture/contracts/invoices.md, sections POST /api/v1/invoices/{invoice_id}/credit-notes
and GET /api/v1/invoices/{invoice_id}. Implement it field for field. A deviation needs an
amended contract first, and an ADR where it changes a decision.

POST /api/v1/invoices/{invoice_id}/credit-notes
Auth: member session holding the billing role in the invoice's account.
Headers: Idempotency-Key, required.

Body:
{ "reason": "quantity_error",
  "lines": [ { "line_item_id": "c2d9e7f0-1b3a-4e5c-8d6f-7a9b0c1d2e3f", "amount_minor": 25000 } ] }

201:
{ "id": "5e8a2c1f-7d3b-4a9e-b0c6-2f1d8e7a3b54", "number": "CN-0007",
  "invoice_id": "3f6c1d2e-8a41-4c7b-9e0f-5b2a7d914c63",
  "reason": "quantity_error", "reason_label_key": "credit_note.reason.quantity_error",
  "total_minor": 25000, "currency": "GBP", "invoice_outstanding_minor": 425000,
  "created_at": "2026-09-20T10:14:00Z" }

| Error | Status | Code, and fields |
|---|---|---|
| Invoice not found, or in another account | 404 | `not_found` |
| Member lacks the billing role in this account | 403 | `role_not_permitted` |
| Invoice still a draft | 409 | `invoice_not_issued` |
| Credit would take the balance below zero | 409 | `credit_exceeds_balance`, fields `{"lines": ["exceeds_balance"]}` |
| Idempotency key reused with a different body | 422 | `idempotency_key_reused` |

## Invariants this must not break

- I1: the invoice is looked up inside the session's account. An id from another account
  returns 404, identical to an id that does not exist, so existence does not leak.
- I2: a credit note is a new row. Nothing on this path updates the invoice's document
  columns, and the trigger refuses anything that tries.
- I4: the balance is read under a row lock inside the transaction that inserts the credit.
  A check made before the transaction opens is a race.
- I6: the audit entry is written in the same transaction. A credit note with no audit entry
  is a state I6 says cannot exist.

## Acceptance criteria

1. A credit of exactly the outstanding balance succeeds and returns
   `invoice_outstanding_minor` of 0.
2. A credit of the outstanding balance plus one minor unit returns 409
   `credit_exceeds_balance` and writes nothing, asserted by row counts before and after.
3. Two concurrent credits that each fit alone and together exceed the balance: exactly one
   succeeds, tested.
4. The same Idempotency-Key replayed returns the first response and writes nothing new.
5. A direct update to an issued invoice's line amount, as the member role, is refused by the
   trigger, tested (I2).
6. A member of another account receives 404 for a real invoice id, tested (I1).
7. The create path runs a fixed number of queries whatever the number of lines, asserted in
   the test.
8. Every table, policy, trigger and function lands as a migration file, and the applied
   migration list on the target shows each one.

## Evidence to produce

Under .devteam/runs/<run-id>/evidence/backend/, named so a reader knows where each ran.
With a stack pack, the names in its evidence section replace these.

| File | Must show |
|---|---|
| db-test-offline.log | The database suite run offline, with the tests for I1, I2, I4 and I6 named and passing |
| db-test-target.log | The same suite on the target database, where the stack can reach one |
| migrations.txt | The applied migration list, including every file this brief names |
| query-count.log | The test that asserts criterion 7, and its output |

## Out of scope

- The credit note screen and its copy. They are in brief-frontend.md and with ux-writer.
- Emailing the credit note to the customer. A later run.
- Any change to I2. See ADR-0004.

## Questions to me, not around me

Write them as a blocker in your handoff with needs set to tech-architect. Criteria 1 to 6
block on the answer; criteria 7 and 8 do not.

Open question, not a blocker: whether a credit note may be raised against an invoice in a
closed period. Raised with the Product Lead in decisions_for_product_lead. Build it as
allowed, because the credit note itself is dated in an open period and I3 holds. A refusal
lands in a later run if the Product Lead chooses one.
```

The frontend brief uses the same headings and quotes the same contract section, copied from
the same contract file, so the two briefs agree field for field. It adds what only the
interface needs:

- The surfaces the change implies, for ux-designer, and the states the contract can produce:
  empty, restricted, the invariant refusal, and one state for each error code, so every code
  has a designed screen and a rendered one.
- Where each label key resolves: the string files ux-writer produces, one per locale in
  `PROJECT.md § Locales`.
- Evidence captured at every width in `PROJECT.md § Quality bar` and in every locale, with
  the file names the frontend acceptance criteria use.

### Before a brief leaves

Each of these holds, or the brief is not finished and design-authority does not pass.

- [ ] Every decision in the run has an accepted ADR in `docs/decisions/`, copied into the run
      folder.
- [ ] Every endpoint touched has a contract entry: auth, request, response, status codes,
      error bodies, pagination and idempotency.
- [ ] The frontend and backend briefs quote the same contract, and agree on every field
      name, type, nullability, enum value and error code.
- [ ] Every invariant the change touches is named by number, with its enforcement point and
      its test.
- [ ] Every acceptance criterion is checkable by reading output or running a command. None
      says "works".
- [ ] No brief says "as appropriate", "handle correctly", "standard" or "etc.".
- [ ] No brief asks for a tool outside `PROJECT.md § Toolchain`, or a mechanism the stack
      does not have.
- [ ] No response carries a rate without its base, a status without its label key, or money
      as a float.

---

## API contract conventions

| Concern | Convention |
|---|---|
| Naming | Nouns, plural, in the domain's language: `/invoices`, `/credit-notes`. Never `/items`. |
| Errors | One shape everywhere: `{"error": {"code": "<snake_case_code>", "message_key": "error.<code>", "fields": {}, "trace_id": "<id>"}}`. A code, never a sentence, because copy belongs to ux-writer. The front end's data client wraps any platform error into this shape, so a component reads one shape only. |
| Another account's resource | 404, identical to a resource that does not exist, so existence does not leak. 403 is for a resource in the reader's own account that the reader's role may not touch. |
| Pagination | A cursor over a stable order that ends in the id. Offset repeats and skips rows when the list changes while a reader pages. |
| Times | ISO 8601 UTC in the payload. The account's time zone is a separate labelled field. The client never infers it from the reader's device. |
| Money | Integer minor units named `<name>_minor`, with an ISO 4217 `currency` beside it. Never a float. The client formats. |
| Rates | A fraction from 0 to 1 named `<name>_rate`, with `<name>_n` beside it, always. The client formats the percentage and shows the base. |
| Enums | Snake case strings, never integers, so a log line is readable. Each ships a `<field>_label_key` beside it, and the client resolves the words from the string catalogue. |
| Nullability | Explicit. A field that can be absent says so in the contract. |
| Idempotency | Every write a retry could duplicate takes an `Idempotency-Key` and is unique on it in the database. A duplicated charge or email costs the customer. |
| Change | Additive where possible. A breaking change is a new version path, and each side tolerates the other's previous shape for one deploy window. |

---

## The post-change architecture review

The architecture is re-examined after every change that lands, including the small ones.
The questions are the same whichever role asks them: tech-architect on a post-change pass,
engineering-lead in its conformance check, and code-steward or security-analyst when they
read a module header or a boundary against the architecture of record.

Read the diff, then answer each question in writing. A yes to any of the first five is a
finding.

1. Did a boundary move without an ADR? Logic that sat in the data layer now sits in a
   handler, a module reaches across a boundary, or a client now knows something only the
   server should.
2. Did the API contract change in a way the other side has not implemented?
3. Did any invariant in `PROJECT.md § Product invariants` lose its enforcement point, or
   gain a second one that can disagree with the first?
4. Did a constant become a setting, or a setting become a constant, without a decision?
5. Did the change add a second way to do something the system already does once?
6. Does the implementation match the task brief, or did it drift under delivery pressure?
7. Does anything here make the product contradict the claim in `PROJECT.md § Product`? For
   the example product: a payment path that can overpay, an issued invoice editable through
   a support script, a dashboard figure computed with a second formula.

Record the answers in your own `review.md`, one line per boundary in the architecture of
record with a verdict of `holds` or `eroded`, so a missing row is itself visible. Where the
architecture eroded, the remediation is a task brief from tech-architect naming the agent
who fixes it, and the gate that found it fails. A note that says "worth revisiting" leaves
the erosion in place.
