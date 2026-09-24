---
name: team-clean-code
description: The clean code and commenting standard code-steward enforces at the review-readability gate, so the codebase stays readable for the people and the agents who change it next. Covers naming in the domain's language, the function, file and class thresholds, guard clauses, flag arguments, module headers, docstrings, comments that say why, errors, duplication, tests as specifications and the review checklist with its finding format. Use when writing, reviewing or refactoring any code, and when deciding whether a name, a function, a file or a comment is ready to ship.
---

# Clean code

Code is read far more often than it is written, and here it is read by two audiences with
different failure modes: a person who needs to change it under pressure, and an agent handed
a slice of it with no surrounding context. Both are served by code that explains itself, and
by comments that carry what the code cannot.

code-steward enforces this standard at the `review-readability` gate. It binds every role
that writes code, and the thresholds below are gate criteria.

The rules are stated for any language. The examples are TypeScript and SQL, and use the
generic example product from `team-architecture`: accounts, projects and invoices. Your own
domain terms come from the glossary at `docs/architecture/glossary.md`, and your invariants
from `PROJECT.md § Product invariants`.

---

## The test

Someone who has never seen this file can change it correctly, having read only the file and
the names in it. If that takes a conversation, the code is not finished.

---

## Naming

| Rule | Bad | Good |
|---|---|---|
| Use the domain's language, never CRUD nouns | `item`, `record`, `data`, `obj` | `invoice`, `creditNote`, `payment`, `period` |
| A name says what it is, never how it is stored | `invoiceArray`, `str_name` | `invoices`, `name` |
| Booleans read as a claim | `checkIssued`, `flag` | `isIssued`, `hasOpenBalance`, `canIssue` |
| Functions are verbs, and say what they return | `handleInvoice`, `process` | `issueInvoice`, `outstandingBalance` |
| No abbreviation the domain does not use | `invCnt`, `pmtAmt` | `invoiceCount`, `paymentAmount`. `n`, `id` and `url` are fine. |
| Constants name the meaning, never the number | `THIRTY`, `LIMIT` | `PAYMENT_TERMS_DAYS`, `MAX_PAGE_SIZE` |
| Opposites use opposite words | `open` and `finish` | `open` and `close`, `archive` and `restore` |
| No type in the name in a typed language | `invoiceString` | `invoice` |
| Units live in the name when the type cannot carry them | `timeout`, `amount` | `timeoutSeconds`, `amountMinor` |

A name that needs a comment to explain it is a naming defect. Rename first, then see whether
the comment is still needed. Usually it is not.

---

## Functions

| Rule | Threshold |
|---|---|
| One job. If you cannot name it without "and", split it. | |
| Length | 50 lines is the ceiling. Most should be far shorter. |
| Cyclomatic complexity | 10 |
| Nesting depth | 3 |
| Parameters | 4. Beyond that, the parameters are an object that has no name yet. |
| Return type is one thing | Never a value on success and a boolean on failure |

Two patterns do most of the work.

Guard clauses over nesting. Handle the exceptional cases first and return, so the happy path
is flat and reads last.

```ts
// Nested: the reader carries three conditions to reach the point
function issueInvoice(invoice: Invoice, by: MemberId, at: Date) {
  if (invoice.status === 'draft') {
    if (invoice.lineItems.length > 0) {
      if (!invoice.period.isClosed) {
        // ...
      }
    }
  }
}

// Guarded: each rule is stated once and the point sits at the left margin
function issueInvoice(invoice: Invoice, by: MemberId, at: Date) {
  if (invoice.status !== 'draft') throw new InvoiceAlreadyIssued(invoice.id)
  if (invoice.lineItems.length === 0) throw new InvoiceHasNoLines(invoice.id)
  if (invoice.period.isClosed) throw new PeriodClosed(invoice.period.id)
  // ...
}
```

No flag arguments. A boolean that forks the whole body is two functions sharing one name.

```ts
// The call site reads archiveProject(project, true) and tells the reader nothing
function archiveProject(project: Project, force = false) { /* ... */ }

// Two honest names
function archiveProject(project: Project) { /* ... */ }
function forceArchiveProject(project: Project, overrideReason: string) { /* ... */ }
```

---

## Files and modules

| Rule | Threshold |
|---|---|
| One responsibility per module | |
| File length | 400 lines. Past that, the file has more than one job. |
| Class methods | 15 |
| Import direction is one way | No circular imports, ever |
| Layer boundaries hold | Each rule sits in the layer `team-architecture` assigns it: the lowest layer that can hold it. The client never holds a rule alone, and never reaches a table only a server function should serve. The stack pack in `PROJECT.md § Stack pack` names the mechanisms. |

Order inside a file, consistently: imports, constants, types, public interface, private
helpers. A reader scanning top to bottom meets the important things first.

---

## Comments

This is where most codebases fail in both directions: many comments that restate the code,
and none where the reasoning lived only in someone's head.

### The rule

Code says what. Comments say why. A comment that repeats the code is noise that goes stale
and then lies.

```ts
// Noise. Delete it.
// increment the retry count
retryCount += 1

// Worth its space. Nothing in the code can carry this.
// The balance is read inside the payment transaction, under the row lock, rather
// than passed in by the caller. Two payments submitted together would both pass a
// check made against a balance read earlier. I4 depends on this read.
const balance = await outstandingBalance(tx, invoiceId)
```

### Always comment these

| Situation | Because |
|---|---|
| A non-obvious decision | The next reader will otherwise "fix" it back |
| A workaround | Name what it works around and the condition for removing it |
| A product invariant, a privacy rule or a safety constraint | Cite the invariant by number: `-- I2: enforced here so no caller can bypass it` |
| A performance choice that costs readability | State the measurement that justified it |
| A deliberate departure from this standard | Say why, so it reads as a decision and never as rot |
| Anything surprising | If it surprised you writing it, it will surprise the next reader |
| A unit, a range or a boundary the type does not carry | `// seconds, not milliseconds` |

### Never comment these

- What the next line does.
- Commented-out code. Delete it. Git remembers.
- A changelog, an author or a date. Git remembers those too.
- A `TODO` with no owner and no condition. Do it, or raise it with bug-historian for
  `BUGS.md`. A kept one names its owner and its condition:
  `TODO(backend-engineer): drop the fallback once every client sends currency`.
- A comment that contradicts the code. It is worse than no comment, and it happens whenever
  the code changes and the comment does not.
- Attribution of any kind that `PROJECT.md § House rules` does not allow.

### Module headers and docstrings

Every module opens with a short header saying what it is for and what it must not do. For an
agent handed this file alone, it is the most valuable comment in the repository.

```sql
-- 20260920101500_invoice_guards.sql: the guarded transitions on invoices.
--
-- I2 and I3. An issued invoice is never edited, and nothing dated inside a closed
-- period is written. Both are rules about valid transitions, so they live in a
-- before-update trigger. A row policy decides who sees a row and cannot say what
-- the row may become.
--
-- The trigger function is security definer with search_path pinned to ''. An
-- unpinned search_path lets a caller shadow an object and run their own code with
-- the definer's rights.
--
-- Never add a bypass flag here. A correction is a credit note (ADR-0004).
```

```ts
/**
 * Billing client for the invoice screens.
 *
 * Reads invoices and credit notes through the billing functions only. It never
 * computes a balance: the server's outstanding_balance is the one formula (B3),
 * and a second one here would disagree with it the first time a credit note lands.
 */
```

Every function that is not self-evident gets a comment saying what it returns, what it
raises, and which invariant it upholds, by number. Private helpers usually need only a good
name.

```sql
-- The outstanding balance of one invoice, in minor units.
--
-- Raises no_such_invoice when the id is unknown or belongs to another account, with
-- the same message either way, so existence does not leak across accounts (I1).
-- Raises rather than returning a negative number: I4 makes a negative balance
-- impossible, and a silent clamp to zero would hide the defect that produced one.
create or replace function app.outstanding_balance(p_invoice uuid)
returns bigint
language plpgsql
stable
security invoker
set search_path = ''
as $$ ... $$;
```

A policy is code and gets the same treatment. Every policy carries a comment naming the
invariant it upholds and why it is written the way it is, because a policy that reads as
arbitrary is the one a future change relaxes.

```sql
-- I1. Members read only the invoices of accounts they belong to. The account comes
-- from the membership table, never from a value the client sends, so a forged
-- account_id in a request reaches nothing. The member id sits in a scalar subquery
-- so Postgres evaluates it once per statement, not once per row.
create policy invoices_select_member on app.invoices
  for select to app_member
  using ( exists (
    select 1 from app.memberships m
     where m.member_id = (select app.current_member_id())
       and m.account_id = app.invoices.account_id ) );
```

---

## Structure that helps the next reader

This is why code-steward exists as its own gate rather than as a line in peer-reviewer's
rubric.

| Practice | Why it matters |
|---|---|
| The module header states the invariants the module upholds | An agent handed one file has no repository context. The header supplies it. |
| Domain terms used exactly as the glossary defines them | Consistent vocabulary lets a reader match code to the ADR without a translation step |
| The dangerous path fails loudly | A query helper that refuses to run without an account beats a comment saying "remember to filter by account". Make the wrong thing fail instead of warning against it. |
| Invariants cited by number where they are enforced | `-- I2` beside the guard ties the line to `PROJECT.md § Product invariants` and the architecture of record |
| One way to do each thing | Two patterns for one job make every reader work out which is current |
| Tests read as specifications | `issued_invoice_refuses_line_edit` tells a reader the rule. `test_invoice_2` tells them nothing. |
| No cleverness without a comment earning it | A clever line that saves four lines and costs ten minutes of reading is a bad trade |

---

## Errors

- Fail loudly and early. A swallowed error is a defect that surfaces somewhere unrelated.
- Never an empty `catch {}` in TypeScript, and never `exception when others then null` in
  plpgsql. Catch what you can handle and let the rest rise.
- Error messages name what happened and what to do. They never blame the reader.
- Error types carry the domain: `InvoiceAlreadyIssued`, `PeriodClosed`,
  `CreditExceedsBalance`. `Error('bad input')` tells nobody anything.
- An error raised by an access rule or a privacy rule names the rule, never the protected
  input that tripped it. "Not found" for another account's invoice, never "invoice belongs
  to account 42".
- The error body a client receives is a code from the contract, never prose. Copy belongs to
  ux-writer.

---

## Duplication

Duplication is cheaper than the wrong abstraction. Both are worse than the right one.

| Occurrences | Do |
|---|---|
| Twice | Leave it. Two things that look alike may be different things. |
| Three times, same reason | Extract. Name the concept, never the code shape. |
| Three times, different reasons | Leave it. They will diverge, and a shared helper will grow flags. |

When you extract, the name describes the concept. If the best name you can find is
`handleStuff` or `processData`, the code only happens to share a shape, and there is no
concept to name.

---

## The review

code-steward works this checklist against the diff at `review-readability`, reading every
touched file in full, since a file-length finding is invisible from a hunk. Tests get the
same standard as the code they specify.

- [ ] Every name says what the thing is, in the domain's language
- [ ] No function over 50 lines, complexity 10, nesting 3 or 4 parameters
- [ ] No flag argument that forks the body
- [ ] No file over 400 lines, no class over 15 methods, no circular import, no layer
      violation
- [ ] Guard clauses on the exceptional paths, so the happy path is flat
- [ ] Every new or substantially changed module has a header stating its purpose and the
      invariants it upholds
- [ ] Every non-obvious public function says what it returns, what it raises and which
      invariant it upholds
- [ ] Every comment says why
- [ ] No commented-out code, no stale comment, no ownerless `TODO`
- [ ] Invariants cited by number where they are enforced
- [ ] Error types carry the domain
- [ ] Tests read as specifications
- [ ] No third occurrence of the same concept left unextracted
- [ ] No second way to do something the codebase already does once

Measure what can be measured, and attach the output as evidence under
`.devteam/runs/<run-id>/evidence/code-steward/`. A threshold finding without the number
behind it is an opinion. These run with git and a POSIX shell alone; replace `<base>` with
the base ref in `run.json`, and the file extensions with the languages in
`PROJECT.md § Stack`.

```bash
# file lengths in the diff, longest first
git diff --name-only <base>... | grep -E '\.(ts|tsx|sql)$' | xargs wc -l | sort -rn

# commented-out code, and TODOs with no owner in brackets
git diff <base>... | grep -nE '^\+\s*(//|--)\s*(function |const |return |if |select |insert )'
git diff <base>... | grep -nE '^\+.*(TODO|FIXME|XXX)' | grep -vE 'TODO\([a-z-]+\)'

# modules with no header, in both comment forms
for f in $(git diff --name-only <base>... | grep -E '\.(ts|tsx|sql)$'); do
  head -3 "$f" | grep -qE '^\s*(/\*\*|//|--)' || echo "no module header: $f"
done
```

### Finding format

Every finding is anchored to a file and a line, says what it costs the next reader, and
names a concrete change. "This is hard to read" is not a finding. "This function does three
things and the third is only visible on line 88, so a reader changing the first will not
know the third exists" is one.

```
### F-02  major  src/billing/issue-invoice.ts:41
what:    process() issues the invoice, emails the customer and writes the audit entry.
cost:    A reader changing the email step will not see the audit write on line 88. An
         early return added for a failed email would skip it, and I6 would break
         without a test noticing.
change:  Split into issueInvoice(), which writes the audit entry inside its own
         transaction, and sendInvoiceEmail(), called after it commits. Name each for
         what it returns.
rule:    team-clean-code, Functions: one job. I6.
```

Findings go to `.devteam/runs/<run-id>/code-steward/findings.md`, ordered by severity, on
the same ladder as the other review gates:

| Severity | Means | Effect on the gate |
|---|---|---|
| blocker | The code misleads: a comment that contradicts it, a name that says the opposite of what the thing does, a module that hides the invariant it enforces | Fails |
| major | The next change on top of it will be riskier: a threshold breach, a missing header on a module that enforces an invariant, a flag argument, an unnamed concept used three times | Fails |
| minor | Untidy, and no more expensive to change later than now. Also a threshold breach the author carried in `files.md` with the measured number, a written reason and the date. | Does not hold the gate. Say so explicitly. |

A carried breach is filed as minor with the author's reason quoted, so it does not hold this
gate. engineering-lead accepts or refuses each carry at the engineering gate, as it does for
the same breach in code-analyst's findings. code-steward records the carry and never grants it.
A breach with no carry in `files.md` stays major.

Do not inflate. A steward who blocks on tidiness gets overruled, and the real findings go
with it. A correctness bug found while reading is routed to code-analyst, never filed here as
a readability finding. Whether the abstraction is right belongs to peer-reviewer; whether it
is named right belongs here. Nothing a formatter or a linter enforces is ever filed.

### The gate

`review-readability` passes when the checklist above is worked in full with evidence and no
blocker or major is open. On a pass the handoff's `next` is `bug-historian`, whose
regression guard runs once all four reviews are in and before engineering-lead. On a fail
the status is `rejected`, `next` is `orchestrator`, each open finding sits in `blockers[]` with
`needs` set to the authoring agent, and the round number is carried. A review with nothing to
report still writes its handoff, with an empty findings list and a record of what was checked,
because a missing review reads as a skipped gate.

code-steward never rewrites the author's code. It writes the finding, and the author makes
the change.
