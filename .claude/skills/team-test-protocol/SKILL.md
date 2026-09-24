---
name: team-test-protocol
description: Plan, run and evidence testing, and decide release readiness. Use when qc-engineer plans or runs a test pass, reproduces or files a defect, or re-tests a fix, when qc-lead audits that evidence, probes by blast radius or writes the readiness report, and whenever someone asks whether a change is tested. Covers the test plan, the test areas (the API contract against the tech-architect's brief, every product invariant in PROJECT.md, guarded state transitions, real flows at every quality-bar width with Playwright, accessibility at the PROJECT.md standard, every locale, and the regression list from the bug-historian's brief), evidence names, the test log and the defect record with the severity ladder, re-test rounds through the orchestrator, re-verifying the product claim, and the nine sections of the readiness report with the go or no-go rule only the Product Lead can overturn.
---

# Test protocol

Two roles share this skill. qc-engineer plans and runs the tests and produces the evidence.
qc-lead audits that evidence, runs its own probes and decides go or no-go.

qc-engineer uses this skill at step 1 to build the plan and at step 3 while executing.
qc-lead uses it twice: at step 2 as the checklist qc-engineer was meant to satisfy, which
makes the coverage audit objective, and at step 3 as the method for its own probes, so every
piece of evidence in the run has the same shape.

A test that cannot be evidenced did not run. Command output, response bodies, screenshots and
traces go under `.devteam/runs/<run-id>/evidence/` and are cited by path from the test log
and the handoff. If you ran a test and lost the output, it did not run: run it again and
capture it.

The examples use the generic product from `team-architecture`: accounts that run projects and
bill for them with invoices, its example invariants I1 to I6 and its contract conventions.
Your product, its claim and its invariants are in `PROJECT.md § Product` and
`PROJECT.md § Product invariants`.

---

## Where the facts come from

Every fact a test depends on comes from a named source, read at the moment it is used.

| Fact | Source |
|---|---|
| The one claim the product must keep | `PROJECT.md § Product` |
| The invariants, numbered I1 onward | `PROJECT.md § Product invariants` |
| The widths, the accessibility standard, the devices and browsers | `PROJECT.md § Quality bar` |
| Every locale, the one authored first, the right-to-left ones | `PROJECT.md § Locales` |
| The commands for install, build, lint, typecheck, test, e2e and db test | `PROJECT.md § Commands` |
| The tools that exist on the machine | `PROJECT.md § Toolchain` |
| How a test reaches the data layer, server functions and the real target | The stack pack named in `PROJECT.md § Stack pack`, read by path at `.claude/skills/<pack>/SKILL.md` |
| Themes, contrast rules, the minimum touch target, the numeric treatment, the voice rules | The brand spec at the path in `PROJECT.md § Brand` |
| The endpoints, their contract and the guarded transitions | The ADR, `tech-architect/brief-backend.md` and the contract files it cites |
| What the change touched | `engineering-lead/verdict.md`, its touched-surface list |
| What has broken here before | `bug-historian/brief.md` and the `BUGS.md` entries it names |

A fact the source does not hold is a blocker, never a guess. For a `PROJECT.md` fact, hand off
`blocked` with the section named in `missing_inputs`, as `team-protocol` sets out.

A command recorded as `none` in `§ Commands` means that runner does not exist on this
project. Say so in the test log, cover the surface another way where you can, and name what
stays untested. A `none` never passes by silence.

---

## How the tests reach the product

With a stack pack, it names the mechanism for each row. For `stack-nextjs-supabase`, read its
sections pgTAP, Security probes, Edge Functions and The app in web/. With `none`, work from
`PROJECT.md § Stack` and `PROJECT.md § Commands`.

| Surface | How it is reached | Never |
|---|---|---|
| API | The running build's real base URL, with a signed-in test user's credentials for each role under test, through curl or a node fetch script. The full request line and the full response, headers included, saved per case | A privileged, admin or service key in a test, a log, the evidence or the repository |
| Data layer | The `db test` command in `§ Commands`, and the on-target proof the stack pack defines, run under the role and claims each case needs | A result with no label saying where it ran |
| Server functions | Called at their real URL with curl or a node fetch script, with the platform's logs read straight after | A function proved only by reading its source |
| Front end | The `install`, `build`, `lint`, `typecheck`, `test` and `e2e` commands. Screens and flows through Playwright with `npx playwright` (`npx playwright install chromium` once), or the capture tool `§ Toolchain` names | A desktop window resized to a phone width and called a phone |
| Contrast | The contrast script in `team-brand-guard` (Computing contrast), run on the hex values the computed style shows the element actually renders | An estimate, or a value read from the source file |

An offline run is evidence, labelled offline. It never stands in for the run on the target
where the stack pack defines one, because the offline proof cannot see the platform: status
codes, grants the connecting role lacks, platform services. Every invariant in scope needs a
run on the target behind it.

A tool that does not answer is reported, never faked. Run the offline proof, hand off
`blocked` with the tool and the exact error in `blockers`, using the reason the stack pack
names (for `stack-nextjs-supabase`, `supabase MCP not authorised`), and the orchestrator
escalates to the Product Lead.

### Capturing an API case

One file per case, with the time and the request at the top and the response below it. The
token comes from the environment and never reaches the file, because `-i` prints the
response headers and not the request headers.

```bash
EV=.devteam/runs/<run-id>/evidence/qc
OUT="$EV/api-invoices-get-404-other-account.txt"
{
  date -u +%Y-%m-%dT%H:%M:%SZ
  echo "GET /api/v1/invoices/<an invoice in account B> as the owner of account A"
  curl -sS -i "$BASE_URL/api/v1/invoices/$ACCOUNT_B_INVOICE_ID" \
    -H "Authorization: Bearer $OWNER_A_TOKEN"
} > "$OUT"
```

Save the body as it came back. A summary of a body ("the shape is right") is not evidence.

### Capturing a screen

`npx playwright screenshot` takes a device profile, a width, a theme and a locale in one
command. At phone widths, always pass a mobile device profile, so the touch input, the device
scale and the mobile user agent are real.

```bash
npx playwright screenshot \
  --device="Pixel 7" --viewport-size="320,720" \
  --color-scheme=dark --lang=ar \
  --load-storage="$AUTH_STATE" --wait-for-timeout=1500 \
  "$APP_URL/billing" \
  ".devteam/runs/<run-id>/evidence/qc/flows/flow-billing-export-ar-320-dark.png"
```

`$AUTH_STATE` is a storage file from signing a test account in. It holds a live session, so it
lives outside the repository and outside the evidence folder, and it is deleted when the pass
ends.

Flows that click through several screens run through the `e2e` command where the product's
suite covers them. A flow the suite does not cover is driven by a script you write under the
run folder, never by a file you add to the product's source. A test you believe the suite
should carry is a finding for frontend-engineer, not a file you write into their tree.

---

## The test plan

qc-engineer writes it before the first test runs, at `.devteam/runs/<run-id>/qc-engineer/plan.md`,
the same file that carries the step 2 audit. Every line of it is something qc-lead will later
compare against the test log.

| Section | What it holds |
|---|---|
| Change under test | One sentence, in your own words. If you cannot write it, ask before you test |
| Inputs | Every file read, with what you took from it |
| Endpoints | Method, path, auth requirement, and the negative cases you will run on each |
| Invariants in scope | By number from `§ Product invariants`, with why each is in scope for this change |
| State transitions | The legal and illegal moves the ADR defines that the change touches |
| Flows | Named, each with its device profile, width, locale and theme |
| Cross-cutting matrix | Widths, themes, locales, accessibility, states and conditions, with every cell you will not cover and the reason |
| Regression list | Copied from the engineering-lead's touched list and the bug-historian's brief. Never invented |
| Planned evidence paths | The paths the orchestrator fixed in `run.json` for this stage, copied exactly. See [Evidence](#evidence) |
| Acceptance criteria | Per surface, stated as the observable result, never as an intention |
| Out of scope | Named, with the role that covers each item |

### A filled plan

```markdown
# Test plan · qc-engineer · 2026-10-01-invoice-export

## 1. Plan

Change under test: account owners can export one calendar month of their account's invoices
as CSV from the billing page.

Inputs: engineering-lead/verdict.md (touched: the export endpoint, the billing page, the
invoice list query), tech-architect/adr-0007-invoice-export.md, tech-architect/brief-backend.md,
tech-architect/brief-frontend.md, backend-engineer/files.md, frontend-engineer/files.md,
ux-writer/strings-en.json, strings-fr.json, strings-ar.json, ux-auditor/findings.md,
bug-historian/brief.md.

| # | Endpoint | Auth | Negative cases |
|---|---|---|---|
| 1 | GET /api/v1/invoices/export?month=2026-09 | owner session | no session (401), member without the billing role (403), month malformed (400 invalid_query), month in the future (400), month with no invoices (200, header row only), unexpected extra parameter (ignored, per contract) |

Invariants in scope: I1, because the export is a new path that reads invoices, and every new
read path is a way round the account boundary. I2 to I6 add no case, because the export writes
nothing; the whole invariant suite still runs, as it does on every change.

Transitions: none added. One guard: exporting a draft invoice must not issue it or allocate a
number (I5).

| Flow | Profile | Width | Locale | Theme |
|---|---|---|---|---|
| F1 Owner exports September, opens the file, every row is account A's | Pixel 7 | 320 | ar | dark |
| F2 The same, in the longest locale | Pixel 7 | 320 | fr | light |
| F3 Member opens billing and meets the restricted state | Pixel 7 | 360 | en | light |

Not covered: a physical iPhone, because none is available this run. Safari runs in
Playwright's WebKit instead, and the gap goes in the readiness report.

Regression list: the invoice list query (engineering-lead touched list), and the brief's
entry on CSV cells that begin with = being run as formulas.

Planned evidence paths: evidence/qc/api-contract.log, evidence/qc/invariants.log,
evidence/qc/transitions.log, evidence/qc/flows/, evidence/qc/accessibility.md,
evidence/qc/locales/, evidence/qc/regression.log.

Acceptance: every export row belongs to the caller's account, proved at the data layer on the
target and through the API; every negative case returns the status and code in the contract;
F1 to F3 complete at their widths with no horizontal page scroll.

Out of scope: emailed exports (a later run), the security sweep (security-analyst).
```

### The audit

Under `## Audit` in the same file, answered in writing before any test runs. At minimum:

- Which endpoint has only its happy path listed? Every endpoint that takes input gets a
  request with no credentials, one as the wrong role, one as the wrong account, one for a
  missing record, one with invalid input and one with a malformed payload, each expecting the
  status the brief specifies.
- Which invariant did I assume was untouched? A new column in a shared view, a new list or
  export path, a search index or a cached response all reach invariants. Name why each is
  safe, or test it.
- Which transition did I test only in the legal direction?
- Am I testing on a mobile profile, or on a desktop window I resized?
- Is each right-to-left locale a pass of its own, or a checkbox?
- Is there a count in any string, and did I plan its plural forms in every locale?
- Which locale runs longest, and is it at the narrowest width?
- What would qc-lead reject this evidence for?
- What did the engineering-lead say was touched that no test of mine reaches?

Then list what the audit changed, and why. An audit that changed nothing is suspicious, as
`team-protocol` says: either the test pass is trivial or the audit was done for show. State
which.

---

## The test areas

Every change is tested across six areas, run in this order, because a failure in each one
makes the results of the next untrustworthy. "Covered" has a specific meaning in each.

| # | Area | Covered means |
|---|---|---|
| 1 | API contract | Every endpoint the change touches, against the tech-architect's brief: every status code, every error body, the happy path and every negative case, each saved |
| 2 | Product invariants | Every invariant in `§ Product invariants` the change could touch, exercised at the lowest layer that holds it and again through the API, on the target where the stack pack defines one. Zero failures, zero skips |
| 3 | State transitions | Every legal transition attempted and allowed, every illegal one attempted and refused with the brief's error |
| 4 | Product flows | The named flows, end to end, as a user, at the narrowest width in `§ Quality bar` on a mobile profile |
| 5 | Cross-cutting | Every width, accessibility at the `§ Quality bar` standard, every locale, every theme, every state, and the conditions: offline, slow connection, reduced motion |
| 6 | Regression | Everything on the engineering-lead's touched list and in the bug-historian's brief for these surfaces |

### 1. API contract

For every endpoint the change touches, compared field by field with the contract the brief
cites, never by eye:

- [ ] Response shape matches the contract: every field, type, nullability and enum value.
- [ ] Every status code in the contract produced on purpose, at least once.
- [ ] Every error uses the one error shape in `team-architecture`, carrying a code, never
      prose.
- [ ] No credentials: 401.
- [ ] The wrong role in the right account: 403.
- [ ] A resource in another account: 404, identical to a resource that does not exist, so
      existence does not leak. This is the case most often skipped.
- [ ] Validation at the boundaries: empty, maximum length, one past it, wrong type, null,
      missing required, an unexpected extra field, unicode, and a right-to-left string with
      embedded Latin digits where `§ Locales` has a right-to-left locale.
- [ ] A malformed payload: the contract's 400, never a 500.
- [ ] Pagination: the first page, a middle page, the last page, an empty set, a cursor past
      the end, and a row inserted between two page reads, which must neither repeat nor
      vanish.
- [ ] Idempotency: the same key twice produces one effect and the first response; the same
      key with a different body returns the contract's code.
- [ ] Rate limit, where the contract sets one: 429 with a retry hint.
- [ ] Times in ISO 8601 UTC with the account's time zone as a separate labelled field; money
      in minor units with its currency; every rate with its base; every enum with its label
      key.

### 2. Product invariants

The invariants are the product's promises, so they get a dedicated suite and are never
skipped, whether for time, because the change looks unrelated or because they passed
yesterday. The whole suite runs on every change. The invariants in scope also get cases
through the API.

For each invariant in scope, run these case shapes:

| Case shape | Expected |
|---|---|
| The input that crosses the invariant, at the lowest layer that holds it, as the role it protects against | Refused, with an error that names the invariant and never the input |
| The same input through every path that reaches the data: list, detail, export, search, any aggregate, any cached response | Refused identically on every path |
| The values either side of any boundary the invariant sets | The exact behaviour the invariant states, on both sides |
| An ordinary user's direct read of the protected store, under that user's role | Refused, or empty. This is the case that proves the rule lives below the client, and the one most often missing |
| The error body on a refusal | Confirms nothing: no id, no field name, no count that tells the caller the record exists |
| The legitimate case | Allowed, so a rule that refuses everything cannot read as a pass |

For I1 in the example product (a member reads and writes only the rows of accounts they
belong to): account A's owner asks for account B's invoice by id, in the invoice list, in the
export and in search, and gets nothing each time, with no error that confirms the invoice
exists. A query at the data layer under account A's user returns no row from account B. An
update aimed at account B's invoice changes nothing. Account A's own invoice is returned.

Where the suite lives is the stack pack's call. For `stack-nextjs-supabase` it is
`supabase/tests/invariants.test.sql`, run offline by the `db test` command and on the target
through the route its pgTAP section sets. Save both outputs, each named for where it ran:
`inv-i1-cross-account-offline.log` and `inv-i1-cross-account-target.log`.

A change that touches an access rule, a grant, a view or a privileged function, and does not
touch the invariant suite, is a finding you file. The surface moved and nobody proved the
claim again.

#### The permission matrix

Run whenever an access rule or a grant changes: every resource, every role, every command,
positive and negative. Build it from the ADR, then test every cell. The example product's
matrix, for its read command:

| Read | anonymous | member | member with billing role | owner |
|---|---|---|---|---|
| `accounts` | deny | own accounts | own accounts | own accounts |
| `projects` | deny | own accounts | own accounts | own accounts |
| `invoices` | deny | deny | own accounts | own accounts |
| `time_entries` | deny | own entries | own entries | own accounts |
| `audit_entries` | deny | deny | deny | own accounts |

A `deny` cell is tested by asserting the refusal or an empty set, never by assuming it. A
scoped cell is tested twice: inside the scope expecting rows, outside it expecting none. The
same matrix is repeated for insert, update and delete.

### 3. State transitions

Every guarded transition the ADR defines, attempted in both directions, through the API and
through the interface. Record each refusal with the code the brief specifies. The example
product's invoice, whose status runs `draft`, `issued`, `part_paid`, `paid`:

| Case | Expected |
|---|---|
| Issue a draft | Allowed. A number allocated in sequence (I5) and an audit entry written (I6) |
| Change a line amount on an issued invoice, by any path | Refused by the guard, whatever wrote the row (I2) |
| Return a paid invoice to draft | Refused |
| Record a payment dated inside a closed period | Refused (I3) |
| Two payments sent at once that each fit alone and together exceed the balance | Exactly one succeeds (I4) |
| The audit write fails inside the transition | Status unchanged. No issued invoice exists without its audit entry (I6) |
| Issue the same invoice twice | Refused, or idempotent as the contract says. Never a second number |

A terminal state is tested by trying to leave it. A transition that needs a named actor is
tested with the actor missing.

### 4. Product flows

Run as a user, never as API calls. Each flow runs at the narrowest width in `§ Quality bar`,
on a mobile device profile, on a throttled connection, and in the locales and themes the plan
names. Capture the screens and a trace as you go.

The shape, for the example product:

- Sign in as an account owner, open billing, choose a month, export, open the file, and
  confirm every row belongs to that account.
- Issue an invoice, then try to change a line, and read what the product says.
- Raise a credit note against an issued invoice and see the outstanding balance change.
- Start an invoice, lose the connection mid-form, reconnect, and confirm nothing was lost or
  sent twice.
- Sign in as a member, open billing, and meet the restricted state rather than an error.
- Open the invoice list with two hundred rows, sort, filter, and find one.

### 5. Cross-cutting

This area has five parts, and each is a pass of its own with its own evidence.

#### Every width

The widths come from `PROJECT.md § Quality bar`, and the rules from `team-design-system`
(Responsive rules). Test at every listed width and at one width between each adjacent pair,
because layouts break just below and just above a breakpoint far more often than at the round
number (with the default widths, 769 and 1023 are the classic failures). Both orientations on
phone and tablet. 200% browser zoom counts as a width.

| Check | How it is measured | Fails when |
|---|---|---|
| No horizontal scroll on the page body | `document.documentElement.scrollWidth` against `window.innerWidth`, read in the browser, never judged from a screenshot | The body is wider than the viewport. A table or code block may scroll inside its own container |
| Touch targets | The rendered box of every control against the brand spec's minimum | Any control smaller, at any width, including a desktop with touch |
| Nothing hidden to fit | The control inventory at the widest width against the narrowest | A control present at one width and reachable nowhere at another |
| A phone held sideways | A viewport about 360px tall | Content or actions unreachable |
| Longest locale at the narrowest width | The locale that runs longest in `§ Locales`, at the narrowest width | Truncation that was not specified, overlap, clipping |
| Right to left at every width | Each right-to-left locale at every width | Mirrors at desktop and breaks on the phone |

Evidence is a screenshot per width, per theme, per locale, plus the longest locale at the
narrowest width, one phone held sideways and one at 200% zoom. A test log that claims
"responsive verified" with three screenshots has verified three widths.

#### Accessibility

Tested against the standard in `PROJECT.md § Quality bar` (default WCAG 2.2 AA), measured,
never estimated.

| Check | Evidence |
|---|---|
| Contrast of every new or changed pair, in every theme | The contrast script's output, with both hex values and the ratio |
| Keyboard only: every interactive element reachable, in reading order, with a visible focus ring that is never hidden behind a sticky header or panel | A recorded tab sequence per flow, with a screenshot of focus on each control that moved |
| Target size at the brand spec's minimum, which is never below the standard's own floor | Measured boxes |
| A screen reader on the primary flows, run as flows | A transcript of what was announced, step by step |
| Every control has a name and a role; every status message is announced without taking focus | The accessibility tree for the changed screens |
| Reflow at 320 CSS pixels and at 200% zoom, with no loss of content or function | The width screenshots |
| Colour is never the only carrier of meaning: every status has a written label | A greyscale screenshot of each status-bearing screen |
| Errors identified in text, next to the field, with the fix | The error states, captured |
| Reduced motion honoured on every transition | A capture with reduced motion requested |
| No drag-only interaction, no information asked twice in one flow, sign-in with no memory or puzzle test | The flow captures |

#### Every locale

Every flow runs in every locale in `PROJECT.md § Locales`. Never sampled, and never "the
strings exist, so it is covered". The copy rules are in `team-copy`.

| Check | Fails when |
|---|---|
| Every key resolves in every locale's catalogue | A missing key, or a silent fallback to the first-authored locale |
| Each right-to-left locale mirrors as the brand spec sets out | Layout not mirrored, or mirrored where it must not be |
| Numerals, identifiers, charts, media controls and code read left to right inside a right-to-left line | An invoice number or an amount reversed |
| Left-to-right runs inside right-to-left strings are isolated | A name or a number jumps to the wrong end of the sentence |
| No letterspacing on connected scripts, and the brand spec's size and line-height adjustments per script | Letters pulled apart, or a script set too small to read |
| No string concatenated around a count | A count read correctly in the first-authored locale and wrongly in another. Test the plural categories a reader notices, such as zero, one and two where a locale has them |
| Dates, numbers and currency formatted through the locale | A format built by hand |
| The longest locale breaks no layout | Clipping, overlap or a wrap the design did not specify |
| Every string outside the first-authored locale carries `needs native review` until a native reader has read it, as `team-copy` sets out | The marker missing on an unreviewed string |

A pseudo-locale is a design tool and never counts as a tested locale. A feature that passed in
the first-authored locale and was never opened in another has not been tested there: record it
as untested in the readiness report, so it cannot read as covered.

#### Themes and states

Every theme the brand spec defines. A colour that works in one theme only is not part of the
system. Every surface the change touches is reached in each of the eight states in
`team-design-system` (The states): empty, loading, partial, error, offline, dense, restricted
and invariant, and every action shows its success feedback.

#### Conditions

- Offline, then reconnect, with input in progress: nothing lost, nothing sent twice, and the
  held state stated plainly on screen.
- A throttled connection, including a blocked web font request, under which every surface
  still reads.
- The devices and browsers `§ Quality bar` names. An emulated profile is labelled as emulated,
  and a named physical device you could not reach goes in the readiness report as untested.

### 6. Regression

Take the engineering-lead's touched list and every entry in the bug-historian's brief for these
surfaces. For each, run the case that used to prove it worked, and cite the `BUGS.md` entry or
the touched item in the case. If no such case exists, that is the finding: the surface was
never covered, and this change has made that visible.

The regression list is copied, never invented. A regression you suspect that neither file
names goes in the test log as a case of your own, marked as yours.

---

## Evidence

| Counts | Does not count |
|---|---|
| The response body, saved with its request line and status | "The shape is right" |
| Command output, saved with the command at the top | "Tests pass" |
| A Playwright screenshot at the real width, profile, theme and locale | "It looks fine on mobile" |
| A contrast ratio from the script, with both hex values | "Contrast is fine" |
| A data-layer run labelled with where it ran, offline or target | "The database tests pass" |
| A trace or a HAR for a network case | "It was slow" |
| Both runs, the failing one and the passing one | "I fixed it" |

### Where it goes

qc-engineer writes under `evidence/qc/`. qc-lead writes its own probes under
`evidence/qc-lead/`. Neither writes into the other's folder, or into another role's.

Before the tests run, the orchestrator fixes one evidence path per test area this change needs
in `run.json`, in qc-engineer's `produces` and in qc-lead's `consumes`, and puts the same list
in qc-engineer's dispatch brief. Write exactly those paths; never rename one, because a planned
path that does not exist at handoff reads as missing output. A planned area path takes one of
two forms:

| Form | Example | Holds |
|---|---|---|
| An area folder | `evidence/qc/flows/` | The case files for that area. It counts when it holds at least one file |
| An area log | `evidence/qc/api-contract.log` | Every case in the area in sequence, each under a heading with its case id and its shell time, with any larger file it cites saved beside it in `evidence/qc/` |

### Names

A reader knows what a file proves from its name alone:

```
<area>-<subject>-<case>[-<locale>][-<width>][-<theme>][-<where>][-round<R>].<ext>
```

| Prefix | Area |
|---|---|
| `api` | API contract, with the status in the case: `api-invoices-get-404-other-account.txt` |
| `inv` | Product invariants, with the invariant number: `inv-i1-cross-account-target.log` |
| `state` | State transitions: `state-invoice-paid-to-draft-refused.txt` |
| `flow` | Product flows: `flow-billing-export-ar-320-dark.png` |
| `width` | Every width: `width-invoice-list-fr-769-light.png` |
| `a11y` | Accessibility: `a11y-billing-keyboard-focus-order.txt` |
| `locale` | Every locale: `locale-billing-missing-keys-ar.txt` |
| `cond` | Themes, states and conditions: `cond-invoice-form-offline-reconnect-en-360.png` |
| `reg` | Regression, with the entry it re-proves: `reg-invoice-list-query-target.log` |
| `cmd` | A command from `§ Commands`: `cmd-e2e.txt`, `cmd-typecheck.txt` |

`<where>` is `target` or `offline` for anything that reached the data layer, or the stack
pack's own labels where it names them. Lower case, hyphens, no spaces.

- The first line of every text file is the shell timestamp, then the command or the request.
- A later round never overwrites a file. It adds `-round<R>` to the name, so the failing run
  and the passing run both stay on disk.
- A key, a token, a password or a session storage file never appears in evidence. Redact the
  value and keep the name.
- A defect you could not reproduce is a note, filed as one, with whatever you captured.

---

## The test log

qc-engineer writes `.devteam/runs/<run-id>/qc-engineer/test-log.md`: every case run, with its
id, surface, expected result, actual result, evidence path and where it ran. A case id is the
area and a number: `API-01`, `INV-01`, `ST-01`, `FL-01`, `XC-01`, `REG-01`. In the excerpt
below the totals are whole and the case table shows five of its rows.

```markdown
# Test log · qc-engineer · 2026-10-01-invoice-export

Build under test: commit 4f2a9c1 on feat/invoice-export, the ref engineering-lead/verdict.md names
Started 2026-10-01T13:02:11Z, finished 2026-10-01T15:47:30Z. Rounds: 1 and 2.

## Totals

The latest result of each case.

| Area | Planned | Run | Passed | Failed | Not run | Fixed after failing |
|---|---|---|---|---|---|---|
| API contract | 9 | 9 | 9 | 0 | 0 | 1 |
| Product invariants | 14 | 14 | 14 | 0 | 0 | 1 |
| State transitions | 3 | 3 | 3 | 0 | 0 | 0 |
| Product flows | 3 | 3 | 3 | 0 | 0 | 0 |
| Cross-cutting | 26 | 25 | 25 | 0 | 1 | 0 |
| Regression | 2 | 2 | 2 | 0 | 0 | 0 |
| Total | 57 | 56 | 56 | 0 | 1 | 2 |

## Cases

| ID | Surface | Case | Expected | Actual | Result | Where it ran | Evidence | Round |
|---|---|---|---|---|---|---|---|---|
| API-01 | Export endpoint | Export September as the owner of A | 200, CSV, 14 rows, all account A | 200, CSV, 14 rows, all account A | pass | target | evidence/qc/api-contract.log (API-01) | 1 |
| API-04 | Export endpoint | Export as a member without the billing role | 403 role_not_permitted | 403 role_not_permitted | pass | target | evidence/qc/api-contract.log (API-04) | 1 |
| INV-03 | Export function | I1, export for a user in two accounts | Account A's rows only | 17 rows, 3 from account B. D-01 | fail | target | evidence/qc/inv-i1-export-two-accounts-target.log | 1 |
| INV-03 | Export function | I1, export for a user in two accounts | Account A's rows only | 14 rows, all account A | pass | target | evidence/qc/inv-i1-export-two-accounts-target-round2.log | 2 |
| XC-19 | Billing page | Billing on a physical iPhone | Renders and exports | Not run: no device this run. WebKit emulated in XC-18 | not run | none | none | 1 |
```

- Every planned case has a row. A case that did not run has a row saying why.
- The result is `pass`, `fail`, `not run` or `note`. Nothing else.
- The totals reconcile with the rows, and with the runner's own output. "All tests passed"
  with no number is not a count.
- A re-tested case gets a new row with its round. The earlier row stays.
- Where it ran is `target`, `offline`, a device profile or a named device. An emulated device
  says so.

---

## The defect record

qc-engineer writes `.devteam/runs/<run-id>/qc-engineer/defects.md` on every run, even when it
holds no defect, because qc-lead audits it and the bug-historian's record pass reads it. With
none, it says so and gives the number of cases run: "No defects. 56 cases run across six
areas, listed in test-log.md."

Every defect carries its id, severity, surface, numbered reproduction steps, expected, actual,
evidence path, the locale, width and device where it was found, the responsible agent, whether
it is a regression, and its status by round.

```markdown
# Defects · qc-engineer · 2026-10-01-invoice-export

Cases run: 56. Open: 0 critical, 0 high, 0 medium, 0 low. Fixed in this run: 1.

### D-01 · critical · The export includes invoices from a second account the caller belongs to

| Field | Value |
|---|---|
| Surface | API, GET /api/v1/invoices/export, and the export function behind it |
| Found at | API case, no locale or width. Confirmed at the data layer on the target |
| Responsible agent | backend-engineer |
| Regression | No. A new path |
| Evidence | evidence/qc/inv-i1-export-two-accounts-target.log, evidence/qc/api-contract.log (API-07) |
| Status | Found in round 1. Fixed in round 2: evidence/qc/inv-i1-export-two-accounts-target-round2.log |

Reproduce
1. Sign in as the test user who owns account A and is a member of account B without the
   billing role.
2. With account A selected, request GET /api/v1/invoices/export?month=2026-09 on the target's
   base URL, with that user's session.
3. Compare every invoice number in the file with account A's invoice list for September.

Expected: 14 rows, every one an account A invoice.
Actual: 17 rows. Three are account B's invoices, with their totals.

Why critical: it breaches I1 and I4. It shows another account's invoices and totals to a
person who may not see billing there. A query at the data layer under the same user shows the
export reads every account the user belongs to, not the selected one.
```

### The severity ladder

qc-engineer rates every defect on this ladder, and qc-lead uses the same one for its own
findings:

| Severity | Means |
|---|---|
| critical | A product invariant breach, data loss or corruption, a guarded transition that let an illegal move through, or another account's data or a secret exposed |
| high | A broken flow, a failed auth check, or an accessibility failure that blocks a task |
| medium | A wrong state, a wrong string, or a brand rule violation |
| low | Cosmetic, with a workaround |

- Critical is never negotiated down.
- A defect is rated by its worst consequence, not by how likely it looks. A leak that needs
  an unusual account setup is still a leak.
- A defect is rated where it is worst. A layout break that hides a control only in the
  right-to-left locale at the narrowest width is a broken flow for every reader there.
- Only the Product Lead can accept a defect and ship with it, in writing. The acceptance is
  logged in the ledger by the orchestrator. The severity does not change.
- Any open critical or high means qc-engineer hands off `rejected`. Medium and low do not stop
  a pass: they are listed for qc-lead to weigh in the readiness report.

### Who owns a defect

| The defect is in | Responsible agent |
|---|---|
| The data layer, the API, a server function, an access rule | backend-engineer |
| The interface: rendering, layout, client behaviour, state handling | frontend-engineer |
| A string: its words, a missing key, a count concatenated into it, a missing locale | ux-writer |
| The design: a state never specified, a layout that cannot hold the longest locale | ux-designer |
| The brief or the contract: it contradicts itself, an invariant, or what was built | tech-architect |

Name one agent. Where the fix spans two, file two defects that cite each other.

---

## Re-test rounds

The orchestrator is the only dispatcher, so every re-test goes through it and lands in the
ledger. A re-test arranged any other way is missing from the ledger and reads as a skipped
gate.

1. qc-engineer finds an open critical or high. Its handoff is `rejected` with `next` set to
   `orchestrator`, and one `blockers` entry per defect: the defect id and the round in `what`
   ("D-01, round 1: the export includes a second account's invoices"), the evidence path in
   `why`, and the responsible agent in `needs`.
2. The orchestrator dispatches the owner with the defect record as input, and routes the fix
   through the gates its plan sets.
3. The orchestrator dispatches qc-engineer for round R. qc-engineer re-runs the failing cases
   and the regression around them: the other cases on the same surface, and the whole
   invariant suite when the fix touched the data layer. New evidence carries `-round<R>`.
   `test-log.md` and `defects.md` are updated in place, each re-tested defect marked fixed or
   still open with the round. The handoff is `handoff-stage9-round<R>.json`, with `stage` 9,
   citing the defect ids.
4. qc-lead never asks qc-engineer directly. For a bounded re-test, its handoff is `rejected`
   with `next` set to `orchestrator` and a `blockers` entry with `needs` set to `qc-engineer`,
   listing the exact case ids to run again. The orchestrator dispatches it.
5. The same defect back a third time from the same agent, or a third round of the same
   rejection, goes to the Product Lead through `decisions_for_product_lead` instead.

---

## Re-verifying the product claim

The claim in `PROJECT.md § Product` is the one promise the product makes. If it breaks, the
product is saying something false, and that is a no-go whatever every other result says.
qc-lead re-verifies it on every run, against this build, never from the test log.

1. Copy the claim from `§ Product`, word for word, into `qc-lead/plan.md`.
2. Split it into the separate promises it makes.
3. For each promise, write down the input that would make it false on this build. That input
   is the probe.
4. Run the probe at the lowest layer that holds the promise, and through every path a user or
   a caller can take to the same data.
5. Expect it to hold, or to be refused with a written reason, with no error that confirms the
   thing refused exists.

For a claim such as "an invoice total always equals the sum of its lines, and no account ever
sees another account's data":

| Promise | The input that would break it | Probed at | Expected | Evidence |
|---|---|---|---|---|
| A total equals the sum of its lines | A line added to a draft while its total is read; a direct update of a total under a member's role | Data layer on the target, then the API | The total equals the line sum to the minor unit at every read; the direct update refused | `evidence/qc-lead/claim-total-equals-lines-target.log` |
| No account sees another's data | Account A's owner asking for account B's invoice by id, in the list, the export and search | Data layer under A's user, then the API | Nothing returned, and no error that confirms the invoice exists | `evidence/qc-lead/claim-no-cross-account-target.log` |

Then, the same way: each invariant in `§ Product invariants` the change could touch, with the
input that crosses it; access, as the role and the account that should not see the data; and
each illegal transition the ADR names.

---

## The QC lead's audit

File by file, never summary by summary. A claim you did not open is a claim you did not check.

### The evidence audit

1. Does it exist? Every path in qc-engineer's `produced` is on disk and non-empty. A missing
   file is `PHANTOM_OUTPUT`, and the run blocks.
2. Does it show what the log claims? Read the body, look at the screenshot. A log line saying
   "pass" beside a screenshot of a broken layout happens.
3. Is it this build? The commit or build id in the evidence matches the ref engineering-lead
   passed. Evidence dated before the last change landed is stale.
4. Was every planned case run? Compare the plan with the test log, row by row.
5. Was each failure fixed rather than muted? Trace it to a fix and a re-run, with both runs on
   disk. A skipped test, a loosened assertion or a widened timeout is a finding.
6. Do the counts reconcile? The totals in the test log against the runner's output.
7. Is the source named? Every data-layer result says offline or target, and every invariant in
   scope has a run on the target where the stack pack defines one.

### The coverage grid

Fill it from evidence only. Every empty cell is a finding, never a gap to mention in passing.

| Surface | en | fr | ar | Narrowest width | Widest width | Each theme | Eight states | Denied by role | Denied by account |
|---|---|---|---|---|---|---|---|---|---|
| Billing page | flows/ | flows/ | flows/ | flows/ | width-billing-* | cond-billing-* | cond-billing-states-* | api-contract.log (API-04) | inv-i1-* |
| Export endpoint | n/a | n/a | n/a | n/a | n/a | n/a | n/a | api-contract.log (API-04) | inv-i1-* |

The columns follow `§ Locales`, `§ Quality bar` and the brand spec's themes. Add the inputs
nobody tried (empty, maximum length, duplicate submit, the back button mid-flow, two people on
one record) wherever the surface takes input.

### Your own pass

Five to nine paths, chosen by blast radius, never by how easy they are to reach. Map the blast
radius first:

| Surface | Who is affected | Reversible | Silent or loud | Rank |
|---|---|---|---|---|
| Export reading across accounts | Every owner in more than one account | No, the file has left the product | Silent | 1 |
| Invoice list query, touched by the change | Every owner | Yes | Loud | 3 |

Silent and irreversible ranks above loud and reversible, always. Do not re-run the suite:
probe where a failure would hurt most, including older paths that reach the same data. Every
probe, pass or fail, is captured under `evidence/qc-lead/` with the naming above.

---

## The readiness report

qc-lead writes `.devteam/runs/<run-id>/qc-lead/readiness.md` for the Product Lead. Someone who
was not in the run reads it in five minutes and knows exactly what risk they are accepting. It
has exactly these nine sections, in this order, and no others:

1. Verdict
2. What changed
3. What was tested
4. What failed and was fixed
5. What is knowingly untested
6. My own pass
7. Product claim re-verified
8. Residual risk
9. Decisions for the Product Lead

```markdown
# Release readiness · 2026-10-01-invoice-export · round 1

Written 2026-10-01T16:40:12Z by qc-lead.

## 1. Verdict

Go: every case ran on this build except the one named in section 5, the one critical defect was
fixed and re-run in round 2, and the claim holds on the target.

## 2. What changed

Account owners can export one calendar month of their account's invoices as CSV from the
billing page (ADR-0007). The export runs in the database, behind the same access rule as the
invoice list, and writes nothing.

## 3. What was tested

| Area | Cases | Passed | Failed, then fixed | Evidence |
|---|---|---|---|---|
| API contract | 9 | 9 | 1 | evidence/qc/api-contract.log |
| Product invariants | 14 | 14 | 1 | evidence/qc/invariants.log |
| State transitions | 3 | 3 | 0 | evidence/qc/transitions.log |
| Product flows | 3 | 3 | 0 | evidence/qc/flows/ |
| Cross-cutting | 26 | 25 | 0 | evidence/qc/accessibility.md, evidence/qc/locales/ |
| Regression | 2 | 2 | 0 | evidence/qc/regression.log |

Locales en, fr and ar, ar mirrored. Every width in the quality bar and 769 and 1023, both
themes, all eight states on the billing page, Chromium on a Pixel 7 profile and WebKit.

## 4. What failed and was fixed

| Defect | Severity | What | Fix | Re-run evidence |
|---|---|---|---|---|
| D-01 | critical | The export included a second account's invoices | backend-engineer, round 2, backend-engineer/files.md | evidence/qc/inv-i1-export-two-accounts-target-round2.log |

## 5. What is knowingly untested

| What | Why | Risk of leaving it |
|---|---|---|
| Billing on a physical iPhone | No device this run. WebKit emulated instead | Low. Emulation covers layout, not the device's own font rendering |
| An export taken while an invoice in the same month is being issued | No way to force the timing | Medium. The invoice may appear or not; the ADR says either is correct, and neither leaks |

## 6. My own pass

- The export for a user in three accounts, one of them archived. Held.
  evidence/qc-lead/inv-i1-export-three-accounts-target.log
- The invoice list and search, which share the changed query. No cross-account row.
  evidence/qc-lead/api-invoices-search-other-account.txt
- A cell beginning with = in a project name, opened as a spreadsheet. Escaped.
  evidence/qc-lead/flow-export-formula-cell.png

## 7. Product claim re-verified

| Promise | Holds | Evidence |
|---|---|---|
| An invoice total equals the sum of its lines | yes | evidence/qc-lead/claim-total-equals-lines-target.log |
| No account sees another account's data | yes | evidence/qc-lead/claim-no-cross-account-target.log |
| I1, on every path the export touches | yes | evidence/qc-lead/inv-i1-export-three-accounts-target.log |

## 8. Residual risk

1. An owner in many accounts exports the wrong one by mistake. The file names its account
   and month, so it is recoverable by reading, not silent.
2. The timing case in section 5.

## 9. Decisions for the Product Lead

None.
```

- Section 5 is never empty by omission. If everything was tested, it says so, in those words.
- Every number carries its base, and every status its written label.
- The verdict sentence still reads correctly when quoted alone in the ledger.
- A later round rewrites the report in full, never as a patch, and its title says which round
  it answers.

---

## Go or no-go

qc-lead owns the `quality` gate. The rule:

- Go only when every line of the gate in `qc-lead`'s agent file is true.
- Any unchecked line is a no-go. There is no conditional go, and no go with a list of things
  to watch in production.
- If you are not sure, it is a no-go, and the Product Lead decides.
- The result goes in qc-lead's handoff `gates[]` as `quality`, `pass` on a go and `fail` on a
  no-go, with `qc-lead/readiness.md` as its evidence. No other role records it, and no other
  name goes in `gates[]`.

Only the Product Lead can overturn a no-go, and only in writing. When they do:

1. The orchestrator appends a `decision` line to `ledger.md` quoting their words. qc-lead
   never writes the ledger; it asks for the line in its handoff.
2. The orchestrator dispatches qc-lead for a new round, which writes
   `handoff-stage10-round<R>.json` and rewrites `readiness.md`.
3. Section 9 quotes the override verbatim under the decision it answers, with the date from
   the shell and the ledger line it rests on.
4. Section 1 keeps qc-lead's own no-go sentence and adds one saying the Product Lead accepted
   the named risk in writing, so the report reads as a go by override and says so.
5. The gate is recorded `pass` on the strength of that written acceptance, and the accepted
   risk stays at the top of section 8.

An approval that exists only in conversation did not happen. Never assume one.

---

## Before handing off

qc-engineer, in addition to the exit condition in its agent file:

- [ ] `plan.md` has its `## Audit` section and the list of what the audit changed.
- [ ] Every planned case has a row in `test-log.md`, and the totals reconcile.
- [ ] `defects.md` exists, with every defect in the full record, or with the count of cases run
      when there are none.
- [ ] Every planned evidence path exists and is non-empty, every file is named to the
      convention, and none holds a secret.
- [ ] Every data-layer result says where it ran.
- [ ] The exit condition is recorded in `review.md`, never in `gates[]`.

qc-lead, in addition to the gate in its agent file:

- [ ] Every evidence path in qc-engineer's handoff was opened, not listed.
- [ ] The coverage grid is filled from evidence, and every empty cell is a finding or a line
      in section 5.
- [ ] Your own probes are under `evidence/qc-lead/`, each named for what it proves.
- [ ] The claim in `§ Product` was re-verified on this build.
- [ ] `readiness.md` has the nine sections, in order, and the verdict is one sentence.
- [ ] `quality` is the only entry in `gates[]`.
