---
name: team-code-review
description: The senior review rubric peer-reviewer applies at the review-judgement gate, reading a diff the way a senior engineer reads a colleague's pull request. Covers the reading order, the seven lenses (problem fit, simplicity, boundaries, failure modes, tests, domain language, rollout), the failure-mode catalogue, the comment format, the severity ladder, the verdicts and how each maps to a handoff, and the gate's pass conditions. Use when reviewing a diff or a pull request for judgement before the regression guard and the engineering gate, when re-reviewing an author's fixes, and when engineering-lead checks that a change is the right change, simply built.
---

# Senior review

This review asks whether the change is the right change, simply built. It is a judgement
pass, and it does not scan for defects line by line.

Four reviews read the same diff, each independently, and all four must pass:

| Gate | Owner | Reads for |
|---|---|---|
| `review-judgement` | peer-reviewer | Whether this is the right change, in the right place, that survives the real world. This skill. |
| `review-defects` | code-analyst | Facts, line by line: correctness, data layer, structural rot. `team-code-analysis`. |
| `review-readability` | code-steward | Whether the next person to touch it will understand it. `team-clean-code`. |
| `security` | security-analyst | Whether it can be broken into, or leaks. `team-security`. |

They are separate because a plausible design can carry a real bug past a reviewer who is
reading for design, and a correct line can implement the wrong thing. None of the four sees
another's findings before writing its own. After all four pass, bug-historian runs the
regression guard, and only then does engineering-lead take the change.

Outside this review: formatting, import order, naming conventions a linter enforces,
line-level bugs and security scanning. They belong to the formatter, the linter,
code-analyst and security-analyst. Filing them here is noise that buries the findings only a
judgement pass can produce. When you see one, note it for its owner.

---

## Reading order

Read in this order, because reading the diff first anchors you to the author's framing and
the rest of the review becomes a defence of it.

1. The regression brief at `.devteam/runs/<run-id>/bug-historian/brief.md`, and the
   `BUGS.md` entries it names. List it in `consumed`.
2. The task brief and the ADR it cites. Write down the acceptance criteria before you open
   the code.
3. The tests in the diff, before the implementation. They say what the author believed the
   change does.
4. The diff, in full, file by file.
5. The surrounding code at every seam the diff touches: the sibling function, the caller,
   the table a migration alters.
6. A grep sweep for the domain nouns in the change, to find the code that already does this.

Run the tests yourself and read the real output rather than the author's report, using the
test commands in `PROJECT.md § Commands`. Save the output under
`.devteam/runs/<run-id>/evidence/peer-reviewer/`, with any grep that proves a duplication
claim.

---

## The seven lenses

Work in this order. It front-loads the findings that make the rest moot: if the change
solves the wrong problem, its test quality does not matter. Record a finding or an explicit
"clean" for every lens in `review.md`. A lens with no record is a lens you skipped.

### 1. Problem fit

- Does this solve the problem in the brief, or an adjacent easier one?
- Does it solve more than the brief asked for? Unasked scope is a finding: nobody designed
  it, audited it or planned a test for it.
- Does it solve less, quietly? Compare the author's `produced` against the brief's
  acceptance criteria, one by one.

### 2. Simplicity

- Is this the simplest thing that works, or cleverness the next person pays for?
- Could a new engineer follow it in one read? If you had to trace it twice, say so.
- Is there an abstraction serving one caller? Premature generality is harder to remove than
  duplication.
- Does the codebase already have this? Search before you assume it is new.

### 3. Boundaries

The layering is in the architecture of record at `docs/architecture/architecture.md`, and
the mechanisms are in the stack pack named in `PROJECT.md § Stack pack`. For a service with a
database behind it, the seams are grants, policies, constraints, triggers and server
functions as much as application layers. Check them. The examples use the generic product
from `team-architecture`.

| Check | Failure looks like |
|---|---|
| Is each rule in the lowest layer that can hold it? | The overpayment check in a request handler, so a direct call to the data API skips it |
| Can the client reach a table it should reach only through a server function? | A read grant left on `invoices`, which makes every policy and function above it decoration |
| Does the front end hold a back-end rule? | The "issued invoices cannot be edited" rule enforced only by disabling a button |
| Does a module reach across a boundary the architect drew? | A dashboard query summing raw payments instead of reading the billing function's balance |
| Is an invariant now enforced in two places? | Two checks that can disagree are worse than one |
| Does the server trust an identity the client supplied? | A handler reading `account_id` from the request body instead of from the verified session |
| Did a boundary move without an ADR? | Logic that sat in the data layer now sits in a handler, with no decision recorded |

### 4. Failure modes

Ask what happens when it fails. Whether it works on the happy path is the easy half. Walk
every row that applies to the change and record clean or a finding for each.

| Scenario | Ask |
|---|---|
| A caller skips the server layer and calls the data API directly | Is the rule in a policy, a constraint, a trigger or a server function, so it still holds? |
| The public client key leaks | Many stacks publish it by design. What does a holder reach? Every answer should be a grant or a policy, never an assumption about the client. |
| The connection drops mid-submit | Is what the reader typed kept on the device? Does it send once on reconnect, or twice? |
| A webhook arrives twice | Providers redeliver routinely. Is handling idempotent on the provider's event id, not on your own primary key? |
| An outbound call is retried | Does a retried charge or email send twice and cost twice? |
| Two writers act at once | Two members pay the same invoice together. Is the check made under a lock, in the same transaction as the write? |
| A shared device | Is the previous reader's data still on screen, in storage or in a cached token? |
| Clock skew, DST, time zones | Is a due date computed in the account's zone or the server's? Does a boundary at midnight land on the right day? |
| A partial write | If this fails halfway, is the state legal? Where is the transaction boundary? |
| Data changes between two reads | The total shown at review differs from the total at payment. What does the reader see? |
| The longest locale | Does the layout hold in the longest locale in `PROJECT.md § Locales`? |
| Right to left | Where a locale is right to left, is there a physical property where a logical one belongs? |
| Empty and dense | Zero invoices and four hundred. Both are normal. |
| The reader lacks permission | Does it render the restricted state, or error and strand the reader? |
| An invariant refuses the action | An edit to an invoice in a closed period: does the reader learn why, or see a generic error? |

### 5. Tests

- Do the tests test behaviour or implementation? A test asserting that a function was called
  tests nothing a user cares about.
- Would these tests have caught the bug this change fixes? If the change is a fix and no
  test fails without it, that is a blocker.
- Is every invariant in `PROJECT.md § Product invariants` that the change touches covered by
  a test that would fail if its enforcement point were removed?
- Is the negative case tested: the 403, the 404 for another account's resource, the refused
  transition, the overpayment?
- Is there a test asserting the query count on a hot path the change touched?

### 6. Naming and domain language

- Does the code read in the product's language, as the glossary at
  `docs/architecture/glossary.md` defines it, or in generic CRUD nouns: item, record, data,
  handler, status?
- A name that needs a comment to explain it is a naming finding.
- Is a boolean named for what it is, never for what it does? `isIssued` over `checkIssued`.

Generic naming that hides a domain concept is a major, because it is how code drifts away
from the product. For the example product:

| Use | Not |
|---|---|
| invoice | bill, item, record, entry |
| credit note | refund, adjustment, negative invoice |
| member, where the glossary separates a person from their access to an account | user, account holder |
| period | window, range, month |
| the status keys `draft`, `issued`, `part_paid`, `paid` | `state1`, `ACTIVE`, integers |

### 7. Rollout

- Is the migration reversible? Is its written reverse in the run's rollback notes, or is the
  reason it cannot be reversed stated at the head of the file?
- Does the migration lock a live table? Is the backfill separate from the schema change?
- Is there a flag where the rollout needs one?
- Does the front end tolerate the old API shape during the deploy window, and the back end
  the old client?
- If this goes wrong at two in the morning, is it observable: a log line, a metric, an
  alert?
- Any secret, any debug code, any commented-out block?

---

## Comment format

Every comment goes to `.devteam/runs/<run-id>/peer-reviewer/comments.md` in this block,
anchored to a file and a line, with a severity and a concrete change. A comment that
describes a feeling is not actionable.

```
[blocker|major|minor|note|question] <path>:<line>
  What:       one sentence, the observation
  Why:        the consequence, in the product, for a real user or operator
  Suggested:  the concrete change you would make
  Rule:       the brief, ADR, contract, boundary or invariant it breaks, if any
```

Two worked examples, so the bar is unambiguous:

```
[blocker] src/billing/credit-notes.ts:42
  What:       The credit note is inserted in one call and the audit entry in a
              second call, with no transaction around them.
  Why:        If the second call fails, a credit note exists with no audit entry,
              the one state I6 says cannot exist, and nothing reports it.
  Suggested:  Move both writes into the create_credit_note server function, called
              once, and add a test that forces the audit insert to fail and asserts
              that no credit note remains.
  Rule:       I6. ADR-0004. Brief, Build item 3.

[major] src/app/invoices/InvoiceSummary.tsx:18
  What:       The outstanding balance is computed in the component as the total
              less the sum of payments.
  Why:        It ignores credit notes, so after the first credit the screen shows
              more owing than the server holds, on the page whose job is to say
              what is owed.
  Suggested:  Render outstanding_minor from the invoice response, which the contract
              already returns. Grep shows the same subtraction in DashboardTile.tsx;
              move both to the response field.
  Rule:       B3. docs/architecture/contracts/invoices.md, GET /api/v1/invoices/{invoice_id}.
```

| Severity | Means | Effect on the gate |
|---|---|---|
| blocker | Wrong problem solved, a broken boundary, an invariant at risk, data loss, an unsafe migration, or a failure mode that will happen and is unhandled | Fails |
| major | Works, but the next change on top of it will hurt. A boundary violation, untested behaviour the change exists to fix, or a failure mode that is plausible rather than certain. | Fails |
| minor | Worth fixing, low risk if it is not | Does not hold the gate on its own. Say so explicitly, so nobody guesses. |
| note | An observation for later. No action required now. | None |
| question | You do not understand something. Ask. A question is not a finding. | None on its own |

If the only argument for a comment is that you would have written it differently, it is a
note at most.

### Rejecting bad input

A diff you cannot review is sent back, never reviewed around. The rejection says what is
missing and what would make it acceptable, in that order.

```
[blocker] .devteam/runs/<run-id>/backend-engineer/handoff.json:1
  What:       The handoff lists four produced paths, and two do not exist on disk.
              gates[0].evidence points at a test log that was never written.
  Why:        There is nothing here to review. Approving would certify code I
              cannot see.
  Suggested:  Re-run the suite, write the log to the evidence path, correct produced
              to what is on disk, and hand off again.
  Rule:       Never mark work done without evidence.
```

---

## Verdicts

| Verdict | When | Handoff |
|---|---|---|
| `approved` | No blocker, no major. Minors listed. | `status: passed`, gate `review-judgement` result `pass` with `comments.md` as evidence, `next` is `bug-historian` for the regression guard |
| `changes_requested` | One or more blocker or major | `status: rejected`, gate `review-judgement` result `fail`, each open blocker and major in `blockers[]` with `needs` set to the author, the round number carried, `next` is `orchestrator` |
| `blocked` | The change cannot proceed as conceived, because the brief or the ADR is wrong, not the code | `status: escalated`, `next` is `tech-architect`, or the Product Lead as `team-protocol` names them when it is a scope question, with the decision in `decisions_for_product_lead` |

The verdict is also written to `.devteam/runs/<run-id>/peer-reviewer/verdict.json`.
`reviewed` names the commit range, or the explicit file list when the change is not
committed, so a later reader can tell whether the code moved under the review.

```json
{
  "verdict": "changes_requested",
  "blockers": 1,
  "majors": 1,
  "minors": 2,
  "notes": 0,
  "reviewed": "9c41e0a..3b7f2d8"
}
```

## The gate

`review-judgement` passes when every one of these is true:

1. The change implements the brief, not an adjacent problem, and you can say in one line how
   it does.
2. No blocker and no major is open.
3. Logic sits in the layer the ADR and the architecture of record put it in, and nothing
   duplicates existing code you found by grep.
4. Every failure-mode row that applies is recorded clean, or carries a finding.
5. Tests assert behaviour, cover the failure this change fixes, and cover every product
   invariant the change touches.
6. Every migration carries one concern, is reversible with its written reverse in the run's
   rollback notes, keeps any backfill separate from the schema change, and deploys safely in
   either order.
7. Domain nouns are used wherever domain nouns exist.

Any one false and the gate fails. A pass with a note attached is still a pass. A pass with
an unresolved major is a false record.

---

## Escalation

Take it to the Product Lead through `decisions_for_product_lead`, with the decision, the
options and your recommendation, when:

- A brand rule or a product invariant would have to break for the change to work as briefed.
- The brief solves the wrong problem, which is a scope question.
- You and code-analyst reach opposite verdicts on the same change.
- The same finding has come back unfixed three times.
- The only way to hit a date is to merge a known major. That call is the Product Lead's,
  never the reviewer's.

State it and stop on that item. Never approve provisionally while waiting.

---

## Hard rules for this role

1. Never rubber-stamp. An approval with no comments on a non-trivial diff is only credible
   with the lens-by-lens record showing what you checked.
2. Never rewrite the author's code. Suggest the change and the author makes it. Writing it
   yourself removes the second pair of eyes you were brought in to be.
3. Never file a style opinion a formatter owns. It dilutes the findings that matter.
4. Never approve on a green pipeline alone. It says the tests pass. It cannot say the tests
   are good, or that the change is right.
5. Read the brief first, every time.
6. Say what you did not review. If you did not read the migration, or have no context on
   the payment provider, write it down. An unstated gap reads as coverage.
7. Never let time pressure change a severity. Escalate instead.
8. Never comment in another role's lane. Route it to the owner.
9. Three rounds is the limit. On the third round with the same author on the same finding,
   escalate. A loop that has not converged is a disagreement, and disagreements go to the
   Product Lead.
