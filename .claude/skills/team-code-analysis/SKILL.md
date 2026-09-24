---
name: team-code-analysis
description: The line-by-line defect rubric code-analyst applies at the review-defects gate. Covers correctness, line-level security, the data layer, row-level security and database authorisation, concurrency and async, error handling, structural rot measured against fixed thresholds, and the project-specific defects drawn from PROJECT.md, the brand spec and the API contract, with the S1 to S3 finding format, the method and the gate's pass conditions. Use when scanning a diff for bugs, checking complexity and duplication, hunting structural rot, or proving a suspected defect before the regression guard and the engineering gate.
---

# Code analysis

Read the diff line by line for facts. A null path either exists or it does not. A query
either runs inside the loop or it does not. These findings are true or false regardless of
taste, and every one is proved before it is filed.

Four reviews read the same diff, each independently: peer-reviewer for judgement
(`review-judgement`), code-analyst for defects (`review-defects`, this skill), code-steward
for readability (`review-readability`) and security-analyst for security (`security`). All
four must pass. They are separate because a well-designed change can carry a real bug, and a
correct line can implement the wrong thing. Another reviewer's pass is never evidence about
anything this review checks.

Outside this review: whether this is the right solution, whether the abstraction is sound,
whether the rollout plan is safe. Those are peer-reviewer's. Also outside it: anything a
formatter or a linter already enforces.

Every finding carries a file, a line, a category, what is wrong, why it is wrong, the
concrete fix and a severity. A finding without a concrete fix is not finished.

The examples use the generic product from `team-architecture`: accounts, projects and
invoices, with its example invariants I1 to I6. Your invariants are in
`PROJECT.md § Product invariants`.

---

## 1. Correctness

| Hunt for | Signature |
|---|---|
| Off by one | `<=` where `<` was meant, a cursor boundary that repeats or skips a row, a limit compared with `>` where `>=` was meant |
| Null and undefined paths | A value that can be `null` or `undefined` reaching a property access or a method call unchecked. An optional chain that stops early, then a bare access two lines down. |
| Unhandled promise rejection | An `async` call with no `await` and no `.catch`, a floating promise in an effect, a `.then` chain whose error path returns `undefined` |
| Swallowed exception | An empty `catch`, an `exception when others then null` block, a `try` that logs and continues into an invalid state |
| Wrong boolean logic | De Morgan errors, `&&` and `||` precedence, a negated condition that reads correctly and is not |
| Wrong comparison | `==` on floats, identity where equality was meant, string comparison of numbers, `= null` in SQL where `is null` was meant |
| Time zone and DST | `timestamp` where `timestamptz` was meant, date arithmetic across a DST boundary done in days, a due date computed in the server's zone instead of the account's |
| Money as a float | Currency held as `float`, `real` or a fractional JavaScript number. Use `numeric` or integer minor units as `bigint`, and round once, at the end. |
| Division by zero | A rate computed before its denominator is checked |
| Race condition | Read then write without a lock or a transaction, check-then-act, two requests both passing a uniqueness check |
| Mutation of shared state | A module-level mutable in a server function reused across invocations, a React state object mutated in place |
| Unawaited async | A promise created and dropped in a serverless function, so the runtime freezes before it settles |
| Incorrect early return | A guard that returns before a required side effect, such as the audit write |

## 2. Security

security-analyst runs the full sweep: history, dependencies, configuration and the platform's
advisors. These are the line-level defects a reader of the diff must not walk past. When you
find one, it is your finding too.

| Hunt for | Signature |
|---|---|
| Injection | SQL built by string concatenation, a dynamic `format()` without `%I` or `%L`, `eval`, an unsanitised value reaching a shell |
| Missing authorisation | A table reachable with no policy covering the command, or a handler trusting a client-supplied identity instead of the verified session. Every table, every command. |
| Mass assignment | An update policy with no `with check`, or a server function taking a whole row as JSON and writing it unfiltered |
| Secrets in code or logs | A key, token or password literal. A log line carrying an email address, a name, a payment detail or free text a customer wrote. |
| Personal data in a URL | An email address or a personal identifier in a query string. It lands in access logs and in referrers. |
| Unsafe deserialisation | Untrusted JSON written straight into a typed column, or a webhook body parsed without schema validation |
| Server-side request forgery | A user-supplied URL fetched on the server |
| Open redirect | A `next` or `return_to` parameter not validated against an allowlist |
| Timing leak | An equality check on a secret or a signature that is not constant time |
| Missing rate limit | An endpoint that sends a message, charges a card, or can be used to enumerate accounts |

## 3. Data layer

| Hunt for | Signature |
|---|---|
| N+1 | A query per row in a loop, where a join, an embedded select or one set-returning function would do it once |
| Missing index | A filter, sort, join or policy predicate on an unindexed column, especially the hottest list, such as invoices on `(account_id, status, due_at)` |
| Unbounded read | A query with no limit and no cursor range |
| Offset pagination | `offset` on a list that changes while a reader pages, so they see duplicates and gaps. Use a cursor on `(due_at, id)`. |
| Missing transaction | Two writes that must both happen, not wrapped in one transaction or one server function |
| Aggregate in a loop | A `count(*)` per row, where one aggregate would do |
| Non-reversible migration | No written reverse in the run's rollback notes, and no stated reason at the head of the migration file |
| Locking migration | An `alter table` that rewrites a large live table, an index built without `concurrently`, a column type changed in place, a backfill in the same migration as the schema change |
| Migration outside the source of record | The stack pack names the source of record for the schema. With `stack-nextjs-supabase` it is hand-authored migration files, forward-only, one concern per file. The finding is SQL applied to the target with no file behind it, a file edited after it was applied, a file carrying more than one concern, or a change made only in a file the pack says is not a source of record. |

## 3a. Row-level security and database authorisation

This applies where `PROJECT.md § Stack` names a database that enforces row-level security,
such as Postgres and the platforms built on it. It is the class a general scan never finds.
Every hit here is at least S2, and most are S1. Traps specific to one platform are in the
stack pack.

| Hunt for | Why it hurts | Fix |
|---|---|---|
| A per-row function call in a policy predicate, such as the function that returns the current user | It is evaluated for every row, so a list scan becomes thousands of calls | Wrap it in a scalar subquery, `(select app.current_member_id())`, which Postgres evaluates once per statement |
| `security definer` without a pinned `search_path` | A caller can shadow an object and run their own code with the definer's rights | `set search_path = ''`, and schema-qualify every reference in the body |
| A view over protected data without `security_invoker = on` | It runs as its creator, silently bypassing the caller's policies | Set it on every view over a protected table |
| A new table without row-level security enabled | Open the moment anything is granted | Enable it in the same file that creates the table |
| Row-level security enabled with no policy | Denies everything, looks like a bug, and gets "fixed" by disabling row-level security | Write the policy in the same migration |
| Policies for `select` only | `insert`, `update` and `delete` fall to a broad grant added later to unblock someone | All four written explicitly, even where one is `false` |
| `using` without `with check` on an update policy | A row can be updated into a state the caller could not have selected, such as moved into another account | Always both |
| A grant on a base table the architecture says only a server function may serve | Every function and policy above it becomes decoration | Revoke, and expose only the server function |
| A credential that bypasses authorisation, such as a service or admin key, outside server-side secrets | It skips every policy. In a client bundle it is a full breach. | S1, always |
| A policy predicate calling a volatile function | Re-evaluated per row, and can leak timing | Mark the function `stable` and index what it reads |

## 4. Concurrency and async

- A background job that is not idempotent, where the queue delivers at least once.
- A retry with no backoff cap, or no dead-letter path.
- Shared mutable state across requests.
- A React effect with a missing or over-broad dependency array.
- A React effect deriving state that could be computed during render.
- A missing cleanup on a subscription or a timer.

## 5. Error handling

- An error message that leaks internals to the client.
- An error body that carries prose instead of a code from the contract. Copy belongs to
  ux-writer.
- A caught error that returns a success shape.
- A failure path with no observability: nothing logged, no metric, no way to know at two in
  the morning.
- A user-facing failure that blames the reader. "Couldn't save the invoice" is correct. "You
  entered an invalid amount" is not.

## 6. Structural rot

Measure each one, and report the number rather than an impression.

| Metric | Threshold | Finding |
|---|---|---|
| Function length | over 50 lines | It does more than one thing. Name the things and the seams to split on. |
| Cyclomatic complexity | over 10 | The measured value and the branch count. Extract the branches, or invert the guards. |
| Nesting depth | over 3 | The depth and the innermost line. Guard clauses and early returns. |
| Parameter count | over 4 | The parameters, and the object that should carry them |
| Duplicated block | over 6 lines, twice or more | Both locations, and the extraction, or why the duplication is honest |
| File length | over 400 lines | The responsibilities to split |
| Class methods | over 15 | A god object forming |

Run the complexity pass with a tool where the repository has one, and count branches by
hand where it does not. Report the number either way.

Named smells, and the refactor that resolves each:

| Smell | Looks like | Resolve with |
|---|---|---|
| God object | One class that knows every other | Split by responsibility, and push behaviour to the data it uses |
| Flag argument | `archiveProject(project, force = false)` where the body forks entirely | Two functions with honest names |
| Shotgun surgery | One change touching seven files | The concept is smeared. Give it a home. |
| Feature envy | A method using another object's data more than its own | Move the method |
| Primitive obsession | A status, a role or a currency passed as a bare string or number | An enum or a value object |
| Circular import | `a` imports `b` imports `a` | The shared thing belongs in a third module |
| Dead code | Unreachable, unreferenced, or behind a flag removed months ago | Delete it. Git remembers. |
| Commented-out code | A block in comments | Delete it. Git remembers. |
| Unnamed literal | `if (days > 30)` with no name | `PAYMENT_TERMS_DAYS`, defined once |
| Layering violation | A rule in a handler that a direct call to the data API bypasses, or a grant on a table only a function should serve | See the architecture of record and the stack pack |
| Boolean parameter list | `render(true, false, true)` | An options object, or separate functions |

---

## 7. Project-specific defects

A general scan never finds these. They come from `PROJECT.md`, from the brand spec at the
path in `PROJECT.md § Brand`, and from the contracts in `docs/architecture/contracts/`. Check
every one on any diff that touches the interface, an API or a product invariant. Read the
brand spec and cite its section in the finding, never a value from memory.

| Defect | Why it matters | Severity |
|---|---|---|
| A path that can break an invariant in `PROJECT.md § Product invariants`: its enforcement point removed, bypassed, or held only in the client | It is the product's claim | S1, always |
| A direct client read of a table the architecture says only a server function may serve | The grant was revoked for a reason, and this route goes around it | S1 |
| An error that names the protected input behind an access or privacy refusal | It leaks the thing the rule protects | S1 |
| An outbound message or a charge sent with no idempotency key | Retries are routine, and each one costs the customer | S1 |
| A design value written as a literal: a colour, spacing value, radius, duration or type size | The brand spec holds every value as a token, and a literal is drift | S2 |
| A spacing or size value that is not on the brand spec's scale | The scale is closed | S2 |
| A number rendered without the brand spec's numeric treatment | Figures that do not align in a column misread as different magnitudes | S2 |
| A rate rendered without its base or sample | A percentage with no base is a claim the reader cannot check | S2 |
| A status carried by colour alone, with no written label | Fails readers who cannot tell the colours apart | S2 |
| A text and background pair below the contrast threshold in `PROJECT.md § Quality bar`, computed from the brand spec's hex values | Fails the accessibility standard the project committed to | S2 |
| A date or deadline rendered in the reader's time zone where the contract carries the account's | The reader acts on the wrong day | S2 |
| A string concatenated with a count | Breaks the plural rules of many locales in `PROJECT.md § Locales` | S2 |
| A physical CSS property where a logical one belongs | Breaks right to left, where `PROJECT.md § Locales` has a right-to-left locale | S2 |
| A font or script loaded at runtime from a third-party origin the brand spec and the stack do not declare | A blocked request leaves the page unreadable, and every page view is disclosed to that origin | S2 |

Add one probe per invariant. For each of I1 to In in `PROJECT.md § Product invariants`, the
plan names the path in this diff that could break it, and the scan records whether its
enforcement point still stands and whether its test still fails when that point is removed.

---

## Finding format

One block per finding in `.devteam/runs/<run-id>/code-analyst/findings.md`, S1 first. The
label is the severity and a sequence number.

```
### S1-03  Credit note written without its audit entry
file:     src/billing/credit-notes.ts:61
category: product-invariant
what:     createCreditNote() inserts the credit note, then inserts the audit entry in a
          second call, with no transaction around the two.
why:      If the second insert fails, a credit note exists with no audit entry. I6 says
          that state cannot exist, and nothing reports it: the invoice page shows a
          credit nobody can trace.
fix:      Move both inserts into the create_credit_note server function, which runs in
          one transaction, and call it once. Add a test that forces the audit insert to
          fail and asserts that no credit note remains.
evidence: evidence/code-analyst/credit-note-trace.txt
```

Categories: `correctness`, `security`, `data`, `authorisation`, `concurrency`,
`error-handling`, `structure`, `product-invariant`, `brand`, `locale`.

| Label | Severity | Means |
|---|---|---|
| S1 | Blocker | Data loss, a security hole, a broken invariant, or a defect that will fire in normal use |
| S2 | Major | A real defect on a path that is reachable but not routine, or a structural threshold breach the author neither fixed nor carried |
| S3 | Minor | A latent problem, a smell below threshold, or a threshold breach the author carried with a written, dated reason in `files.md`. Worth fixing, does not hold the gate. |

A carried breach is recorded as S3 with the author's reason quoted, so it does not hold the
`review-defects` gate. engineering-lead accepts or refuses each carry at the engineering gate.
code-analyst records the carry and never grants it.

Rank by severity. Never pad the list with style opinions a formatter owns: each one makes
the S1 at the top less likely to be read. Merge a finding that appears under two categories
and keep the higher severity. A defect you could not prove is written as `suspected`, with
the trace so far, as a question for the author. It is never filed as fact.

---

## Method

1. Read the task brief and the ADR, so you know what the code was supposed to do. Read the
   regression brief at `.devteam/runs/<run-id>/bug-historian/brief.md`, and add every
   detection command it names to your probe list, copied exactly as the brief publishes it:
   the same flags, the same pattern, the same pathspecs. A shortened command is a different
   check with an unknown result. Save each detection's output with a first line holding `$`
   and the command as run, so bug-historian can compare it with the brief.
2. Run `git diff --stat` against the base ref in `run.json`, then `git diff` in full. Read
   every changed line and the whole function around it, because context lines hide the bug
   more often than changed lines do. Where a changed function calls something outside the
   diff, read the callee too.
3. Choose the probes from the change surface, and write them in `plan.md`. A diff with a
   migration needs every probe in sections 3 and 3a. A diff that touches a view or a server
   function touches authorisation, whether or not a policy changed.
4. Work sections 1 to 7 in order. Sections 1 to 3a catch the defects that ship. Sections 6
   and 7 catch the ones that accumulate.
5. Prove each finding: trace the path, or write the failing case. Quote the lines.
6. Run the tooling and read its output rather than trusting the exit code: the typecheck and
   lint commands in `PROJECT.md § Commands`, the complexity report, the data-layer checks the
   stack pack names, and a query plan for any query a policy filters. Read that plan as the
   role the policy applies to, inside a transaction that rolls back, because a plan read as
   the owner skips the policy. Nothing beyond `PROJECT.md § Toolchain` may be assumed, and a
   tool that is missing is reported as blocked, never faked.
7. Save command output, grep results, complexity numbers and query plans under
   `.devteam/runs/<run-id>/evidence/code-analyst/`. Write the findings, ordered by severity,
   and record in `review.md` every probe that ran and returned clean. A clean probe is
   evidence, and a report of zero findings with no probe list reads as a shrug.

## The gate

`review-defects` passes when every one of these is true:

1. No S1 finding is open.
2. No S2 finding is open.
3. Every planned probe ran, with its output in evidence.
4. Every structural threshold breach is fixed, or carried with a written, dated reason in the
   author's `files.md` and recorded as S3. engineering-lead accepts or refuses the carry at the
   engineering gate. code-analyst records the carry and never grants it.
5. Every detection the regression brief names ran exactly as published, with its log in
   evidence.
6. No migration in the diff is non-reversible or locks a live table, unless tech-architect
   signed the lock window in the ADR.

A fail is binding: engineering-lead does not open the engineering gate without this pass.

## Handoff

On a pass: `status: passed`, gate `review-defects` result `pass` with `findings.md` as
evidence, and `next` is `bug-historian`, whose regression guard runs once all four reviews
are in and before engineering-lead.

On a fail: `status: rejected`, gate `review-defects` result `fail`, each open S1 and S2 in
`blockers[]` with `what`, `why` and `needs` set to the author, the round number carried, and
`next` is `orchestrator`, which routes the fix. On the third round with the same finding
unfixed, escalate to the Product Lead through `decisions_for_product_lead` instead.

code-analyst writes findings and never edits the code under review. The author makes the fix.
