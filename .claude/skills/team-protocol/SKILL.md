---
name: team-protocol
description: The operating loop every agent on the team follows on every task, in five steps (plan, audit the plan, execute, review, hand off). Use at the start of any task an agent performs, before planning or touching a file, and again before writing the handoff. Defines the run folder and its artefacts, the handoff schema and its field rules, the handoff file names for a first pass, a later stage and a fix round, what counts as evidence, how to reject bad input and how to escalate to the Product Lead. Also sets the rules for facts from PROJECT.md (a missing fact is blocked, never guessed), for tools (a missing tool is blocked, never faked) and for gate results (only the gate you own, with self-checks in review.md).
---

# The team protocol

Every agent runs this loop on every task, without exception. The loop is what makes the
team auditable: a run leaves a record on disk that anyone can inspect afterwards without
reading a transcript.

If you are reading this mid-task and have no plan on disk, go back to step 1.

---

## The five steps

| # | Step | Produces | Path |
|---|---|---|---|
| 1 | Plan | The plan | `.devteam/runs/<run-id>/<agent>/plan.md` |
| 2 | Audit the plan | The audit and its revision log, appended to the plan | same file |
| 3 | Execute | The work | wherever the work lives |
| 4 | Review | The self-review | `.devteam/runs/<run-id>/<agent>/review.md` |
| 5 | Hand off | The handoff record | `.devteam/runs/<run-id>/<agent>/handoff.json`, or the name under [Handoff file names](#handoff-file-names) |

Step 2 runs before execution. An audit after the fact is a review, and you already have one
of those at step 4.

### 1. Plan

Write it before touching anything. Copy `.devteam/TEMPLATE/plan.md`. It states:

- The task in one sentence.
- Every input, with what you are taking from it.
- The facts you need from `PROJECT.md`, each cited by its section heading, and whether the
  section holds it. See [Facts from PROJECT.md](#facts-from-projectmd).
- For a role that depends on the stack, the stack pack named in `PROJECT.md § Stack pack`,
  read by path at `.claude/skills/<pack>/SKILL.md`, or a line saying it is `none`.
- The tools the work needs, and whether each one answered when you checked it.
- Every assumption, and whether you checked it.
- Acceptance criteria, stated so someone else could verify them.
- What is out of scope, named so nobody mistakes it for an oversight.
- The rules that constrain the work, cited by file and section rather than by value: the
  brand spec at the path in `PROJECT.md § Brand`, `PROJECT.md § Product invariants`, the
  standing rules in `BUGS.md` and the brief bug-historian addressed to you.
- The steps.

A plan that says "implement the feature" is not a plan. If you cannot write acceptance
criteria, you do not understand the task yet, and that is the finding.

### 2. Audit the plan

Interrogate your own plan before you execute it, under a heading that starts with `Audit`
(the template uses `## 2. Audit of the plan`). The utilisation check looks for that heading
and reports `LOOP_SKIPPED` without it. Answer all five in writing, even where the answer is
"nothing":

1. What is missing from the plan?
2. What did I assume without checking?
3. Which rule could this break? The brand spec, the product invariants, the standing rules
   in `BUGS.md` and the hard rules in `CLAUDE.md`.
4. What would the downstream agent reject?
5. What is the failure mode nobody has named yet?

Record what changed in the revision table. A plan that came through the audit with no
revisions is suspicious: either the task is trivial or the audit was performed for show.
State which.

### 3. Execute

Against the audited plan. If reality forces a departure, amend the plan and say why, in the
plan file. The record and the work never drift apart.

### 4. Review

Copy `.devteam/TEMPLATE/review.md` and verify your own output against three things, in
order:

1. Your own acceptance criteria from step 1.
2. The brand spec, if the work touches anything a person sees or reads.
3. Your role's definition of done, in your own agent file.

Self-checks and sub-gates belong here, in the table the template gives them. They never go
in the handoff's `gates[]`. See [Gate results](#gate-results).

Fix what you find. Where you cannot, say plainly what it is and why, and carry it into the
handoff as a blocker. An unfixed problem you name is acceptable. One you leave unsaid is a
defect.

### 5. Hand off

Write the handoff to the [schema below](#the-handoff-schema), under the file name the
[naming rule](#handoff-file-names) gives, and return. The orchestrator parses it, so the key
names are fixed. Before you write it, check the keys:

```bash
node -e 'const h=require("./.devteam/runs/<run-id>/<agent>/handoff.json");const keys=["run","agent","stage","status","started","finished","consumed","produced","gates","blockers","missing_inputs","machinery_findings","decisions_for_product_lead","next"];const missing=keys.filter((k)=>!(k in h));console.log(missing.length?"missing keys: "+missing.join(", "):"every key present")'
```

---

## Only the orchestrator dispatches

You never dispatch, re-run or reject directly to another agent. Every agent except the
orchestrator runs with the Agent tool disallowed. The orchestrator is the only dispatcher,
because it writes the ledger and runs the utilisation check, and a dispatch it did not make
reads as a skipped gate.

To send work forward, set `next`. To send work back, or to ask for someone's help, write a
`blockers` entry whose `needs` names the agent, set `next` to `orchestrator`, and return.
The orchestrator routes it. That is the whole mechanism: `status`, `next` and
`blockers[].needs` are the routing signal, and the orchestrator reads all three on every
handoff.

---

## Run artefacts

```
.devteam/runs/<run-id>/
├── run.json                              orchestrator only: plan, gates, utilisation
├── ledger.md                             orchestrator only: append-only event log
├── <agent>/
│   ├── plan.md                           steps 1 and 2
│   ├── review.md                         step 4
│   ├── handoff.json                      step 5, first pass
│   ├── handoff-stage<N>.json             step 5, a later plan entry
│   ├── handoff-stage<N>-round<R>.json    step 5, a repeat pass at the same stage
│   └── <role artefacts>                  ADRs, specs, findings, verdicts, briefs
└── evidence/                             logs, screenshots, command output, traces
```

The runs folder is `DEVTEAM_RUNS_DIR`, which `.claude/settings.json` sets to
`.devteam/runs`. Git ignores it. Where the variable points elsewhere, every path above sits
under it instead.

The run id is `<yyyy-mm-dd>-<short-slug>`, for example `2026-10-01-invoice-export`. The
orchestrator assigns it and every agent in the run uses the same one.

Paths in the plan are relative to the run folder: `ux-designer/spec.md`, `evidence/build.log`.
A handoff may cite a path run-relative, repository-relative or absolute, and the check
accepts each, but run-relative is the plainest.

`run.json` and `ledger.md` are the orchestrator's alone. The only fields of `run.json` that
change after the run opens are `gates[].result` and `gates[].evidence`, which only
`.devteam/bin/sync-gates.mjs` writes, copied from each gate owner's handoff, and
`utilisation`, to which the orchestrator appends.

An agent that runs more than once in a run shares one `plan.md` and one `review.md`. Each
later pass appends its own section (for example `## Guard`, with its own `### Audit`)
rather than overwriting the earlier one.

**Timestamps** come from the shell at the moment they are written, never from memory and
never estimated:

```bash
date -u +%Y-%m-%dT%H:%M:%SZ
```

---

## Handoff file names

A handoff is never overwritten. Each pass writes its own file, so every earlier record, and
every `consumed` entry that points at it, stays true.

| The pass | File | `stage` key |
|---|---|---|
| The first handoff you write in a run | `handoff.json` | the stage of the plan entry it answers |
| Your first handoff for a later plan entry | `handoff-stage<N>.json` | N |
| A repeat pass at the same stage: a fix round after a rejection, a re-review, a re-audit | `handoff-stage<N>-round<R>.json` | N |

N is always the stage of the plan entry the pass answers, never the stage of the role that
sent the work back. R counts passes at that stage: the first pass is round 1 and carries no
suffix, so the first repeat is `round2`. The utilisation check reads the stage in a file name
and compares it with the `stage` key, and raises `MALFORMED_HANDOFF` when they differ.

Some examples, from the run plan template:

| Agent | Passes | Files |
|---|---|---|
| bug-historian | brief at 1, guard at 7, record at 12 | `handoff.json`, `handoff-stage7.json`, `handoff-stage12.json` |
| tech-architect | ADR at 1, architecture holds at 6 | `handoff.json`, `handoff-stage6.json` |
| ux-designer | spec at 2, then a fix after the audit | `handoff.json`, `handoff-stage2-round2.json` |
| ux-auditor | audit at 3, re-audit of the fix | `handoff.json`, `handoff-stage3-round2.json` |
| peer-reviewer | review at 6, re-review after fixes | `handoff.json`, `handoff-stage6-round2.json` |
| frontend-engineer | build at 5, fix after a review rejection | `handoff.json`, `handoff-stage5-round2.json` |
| orchestrator | run open, then each completed stage | `handoff.json` with `stage` 0, `handoff-stage1.json` onward, `handoff-stage<N>-round<R>.json` when a fix round completes a stage again |

Any other artefact you write more than once in a run either keeps every round inside it,
newest first and each headed with its round, or carries the pass in its name. A file that
only ever holds the latest state, such as a verdict, says which round it records. Never
silently replace a record another role has already consumed.

---

## The handoff schema

```json
{
  "run": "2026-10-01-invoice-export",
  "agent": "ux-auditor",
  "stage": 3,
  "status": "passed",
  "started": "2026-10-01T09:14:02Z",
  "finished": "2026-10-01T09:41:55Z",
  "consumed": [
    "ux-designer/spec.md",
    "ux-designer/handoff.json",
    "bug-historian/brief.md"
  ],
  "produced": [
    "ux-auditor/findings.md",
    "evidence/contrast-billing-export.json"
  ],
  "gates": [
    { "name": "design", "result": "pass", "evidence": "ux-auditor/findings.md" }
  ],
  "blockers": [],
  "missing_inputs": [],
  "machinery_findings": [],
  "decisions_for_product_lead": [],
  "next": "ux-writer"
}
```

The blank form, with a note on every field, is `.devteam/TEMPLATE/handoff.json`.

| Field | Rule |
|---|---|
| `run` | The run id, identical across every agent in the run. |
| `agent` | Your agent name, matching your file name and your folder in the run. |
| `stage` | The stage of the plan entry this handoff answers, as a number. The orchestrator uses 0 for its run-open handoff. |
| `status` | `passed`, `blocked`, `rejected` or `escalated`. Nothing else. See the table below. |
| `started`, `finished` | ISO 8601 UTC, from the shell. `started` is at or before `finished`. |
| `consumed` | Every path you actually read. This is how the orchestrator proves an upstream role was used. Listing a path you did not read falsifies the record, and a path that does not exist raises `FALSE_CONSUMPTION`. |
| `produced` | Every path you wrote. Each exists on disk and is non-empty, or the check raises `PHANTOM_OUTPUT`. A folder counts when it holds at least one file. |
| `gates` | Only a gate you own, by its name in `run.json` `gates[]`, with `result` `pass` or `fail` and an `evidence` path that exists. An empty list when you own no gate. See [Gate results](#gate-results). |
| `blockers` | `{ "what": "", "why": "", "needs": "" }`. `what` is the specific defect or gap, with the round number on a rejection. `needs` is the agent that must act, or `product-lead`. |
| `missing_inputs` | A promised input that never arrived and that you worked around, or a `PROJECT.md` fact you needed and did not find, written as `PROJECT.md § <section>: <the missing fact>`. |
| `machinery_findings` | A defect in the team's own machinery: an agent file, a skill, a template or a script that was ambiguous, self-contradictory or missing something the task needed. Name the file. |
| `decisions_for_product_lead` | `{ "question": "", "options": [], "recommendation": "" }`. Never a bare question. See [Escalation](#escalation). |
| `next` | On a pass, the agent that should run next. On a rejected, blocked or escalated handoff, `orchestrator`, with `blockers[].needs` naming who must act. `product-lead` where the next move is the Product Lead's. `null` only in the orchestrator's closing handoff. |

### Status

| Status | When | `next` | `blockers` |
|---|---|---|---|
| `passed` | The work is done, evidenced, and any gate you own is recorded | The agent the plan runs next | Empty |
| `rejected` | An input you received is wrong or missing, and you are sending it back | `orchestrator` | One entry per defect, `needs` set to the agent that owns the fix, the round number in `what` |
| `blocked` | You cannot proceed: a tool is missing, an MCP server is not authorised, a `PROJECT.md` fact is missing, or a gate you depend on has not passed | `orchestrator` | One entry per cause, `needs` set to whoever can clear it, which is `product-lead` for a tool, a server or a `PROJECT.md` fact |
| `escalated` | A decision only the Product Lead can make, or a disagreement no gate owner can settle | `orchestrator` | `needs` set to `product-lead`, or to the role whose artefact is wrong, with the decision in `decisions_for_product_lead` |

`product-lead` is a valid value for both `next` and `blockers[].needs`. Either way, the
orchestrator is the role that puts the question to the Product Lead and logs the answer.

A blocked or rejected handoff still gets written. Silence is the one status the orchestrator
cannot act on.

A blocker stops the run. A missing input you routed around without stopping belongs in
`missing_inputs`, where the next agent and the check can see it, and never only in prose.

---

## Gate results

A gate result is recorded only by the gate's owner, in the `gates[]` of its own handoff,
under the exact name `run.json` carries. The twelve gates, their owners and their pass
conditions are in `team-orchestration`.

- Record only a gate you own. A result for another role's gate is refused by the gate sync
  and raised as `GATE_SELF_CERTIFIED`.
- Use only a name in `run.json` `gates[]`. Any other name is refused and raised as
  `UNKNOWN_GATE`. Gate names are never renamed or invented for a run.
- `result` is `pass` or `fail`. A pass carries an `evidence` path that exists; without one
  the gate is unresolved.
- Self-checks, sub-gates, rubric lenses and your own acceptance criteria go in `review.md`
  or in your verdict file. Never in `gates[]`.
- A later round that changes the result records the gate again. The sync takes the owner's
  latest record.

---

## Facts from PROJECT.md

Every stack, product, locale and release fact you need comes from `PROJECT.md`, by section
heading: Product, Product Lead, Stack, Commands, Toolchain, Stack pack, Locales, Brand,
Product invariants, Quality bar, Release, House rules.

- Cite the section, for example `PROJECT.md § Locales`. Never copy its values into your own
  artefacts, so a change to the profile reaches every role at once.
- Read the section at the moment you cite it, never from memory.
- A fact the section does not hold is a blocker. Hand off `blocked`, name it in
  `missing_inputs` as `PROJECT.md § <section>: <the missing fact>`, add a `blockers` entry
  with `needs` set to `product-lead`, and set `next` to `orchestrator`. The orchestrator
  asks the Product Lead, writes the answer into the section and dispatches you again.
- Never guess a missing fact, and never fill it from another project, a companion skill or
  what seems usual.
- `none` is a real answer. With `none` in `§ Commands`, skip that step and say so in your
  evidence. With `none` in `§ Stack pack`, work from `§ Stack` and `§ Commands`.

---

## The toolchain

The team itself needs git and node, and nothing else is assumed. Every other tool is present
only when `PROJECT.md § Toolchain` lists it, and the commands to use are in
`PROJECT.md § Commands`. The Playwright MCP server (`playwright` in `.mcp.json`) ships for
qc-engineer and qc-lead, and like every other tool it is present only when
`PROJECT.md § Toolchain` lists it.

A missing tool is reported as blocked, never faked. Set `status` to `blocked`, name the tool
and the exact error in `blockers`, and run whatever proof you still can, such as the offline
proof the stack pack defines. Never write a result for a tool that did not run, and never
present an offline proof as if it were the real environment: label it and name the gap in
`review.md`.

An MCP server that does not answer (its tools are missing, or a call returns an auth error)
is the same. The blocker reads `<server> MCP not authorised`, `needs` is `product-lead`,
and the Product Lead authorises it with `/mcp`.

Practical notes that save a dispatch:

- Parse JSON with `node -e`, never with a tool the toolchain does not list.
- Write a multi-line file with the file-writing tool, or write a script and run it. A shell
  heredoc can hang in some environments and be killed at the timeout with no file written.
- Search recursively with `git grep --untracked` or `grep -r`. Plain `git grep` skips files
  that are not yet committed, which is every file a run has just added, and a `**` glob is
  expanded only one folder deep by some shells.
- Commands can be slow on some machines. Prefer the dedicated read and search tools over
  shell loops.

---

## What counts as evidence

| Counts | Does not count |
|---|---|
| Command output saved to a file, with the command at the top | "The tests pass" |
| A response body captured from the running service | "The endpoint returns the right shape" |
| A screenshot of the actual screen at the actual width | "It looks fine on mobile" |
| A measured contrast ratio with both colour values | "The contrast should be fine" |
| A diff, a trace, a log line with a timestamp | "I checked" |
| A failing test that now passes, both runs captured | "I fixed it" |

Evidence lives under `.devteam/runs/<run-id>/evidence/` and is referenced by path from the
handoff. A claim with no file behind it is a blocker, not a pass.

---

## Rejecting bad input

A downstream agent that receives bad input sends it back. It does not work around it and it
does not guess.

A rejection states four things:

1. What you received that is wrong or missing, with the file and line where there is one.
2. Why it blocks you, specifically. "The brief does not say what the export returns for a
   month with no invoices" is a rejection. "The brief is unclear" is not.
3. What you need to proceed, stated concretely enough to act on.
4. The round number: one, two or three.

Write it as a `blockers` entry with `needs` set to the agent that owns the fix, set `status`
to `rejected` and `next` to `orchestrator`, and write the handoff. The orchestrator
re-dispatches the owner with your rejection quoted, and then dispatches you for the next
round, which writes `handoff-stage<N>-round<R>.json`.

Three rounds is the limit. On the third rejection between the same two roles on the same
finding, escalate instead of continuing. A loop that has not converged in three rounds is a
disagreement rather than a misunderstanding, and disagreements go to the Product Lead.

---

## Escalation

Escalate to the Product Lead, named in `PROJECT.md § Product Lead`, when any of these is
true:

| Trigger | Why it is theirs |
|---|---|
| The work would change scope | Only the Product Lead can change scope |
| A brand spec rule would have to break | The spec is theirs, and breaking a rule is a decision, never a workaround |
| Two gates disagree | Neither gate owner can overrule the other |
| The same rejection has run three rounds | See above |
| The work would break a rule in `PROJECT.md § Product invariants`, or contradict the claim in `PROJECT.md § Product` | The claim is what every gate protects |
| An action is irreversible or outward-facing and not already authorised for this run | Pushes, releases, anything a customer sees |
| A tool is missing or an MCP server is not authorised | Only the Product Lead can install a tool or authorise a server |
| A fact is missing from `PROJECT.md` | Only the Product Lead can supply it |

Every escalation carries three things and never fewer:

```json
{
  "question": "Should the invoice export include draft invoices, or only sent ones?",
  "options": [
    "Sent only. Matches what the account owner has billed, but a month with only drafts exports an empty file.",
    "Sent and drafts, with a status column. Complete, but a draft total can change after the file is taken."
  ],
  "recommendation": "Sent only. The export is a record of what was billed, and a file whose totals can change later is worse than one that is empty."
}
```

Never a bare question. An escalation without a recommendation moves the work to the Product
Lead's desk without moving it forward.

---

## Hard rules for every agent

1. Attribution follows `PROJECT.md § House rules`. The default is none, anywhere: no
   co-author line, no generated-by line and no mention of the tool or model that produced
   it, on any commit, tag, pull request, release note, code comment, document or artefact.
2. Never mark work done without evidence. "It should work" is a blocker.
3. Never silently narrow scope. Finish what you can and name exactly what you left.
4. Never invent a design value. Every colour, spacing value, radius, duration and type size
   is in the brand spec at the path in `PROJECT.md § Brand`. If the value you want is not
   there, the design is wrong, not the scale.
5. Never certify a gate you do not own, and never put a self-check in `gates[]`.
6. Never claim you consumed something you did not read.
7. Never dispatch another agent. Set `next` and `blockers[].needs`, and return.
8. Never guess a `PROJECT.md` fact, and never fake a tool or a result.
9. The rules in `PROJECT.md § Product invariants` are enforced in the lowest layer that can
   hold them, never only in the client.
10. Work autonomously. Do not ask permission to run your own loop. Ask only for decisions
    that belong to the Product Lead.

---

## Worked example: a filled plan

```markdown
# Plan · backend-engineer · 2026-10-01-invoice-export

## 1. Plan

### Task, in one sentence

Serve one calendar month of the requesting account's invoices as CSV, and nothing from any
other account.

### Inputs I am working from

| Path | What I am taking from it |
|---|---|
| tech-architect/brief-backend.md | The endpoint, the columns, the error cases, criteria 1 to 4 |
| tech-architect/adr-0007-invoice-export.md | The export runs in the database, behind the same access rule as the invoice list |
| bug-historian/brief.md | SR-05 and SR-09 bind me; nothing in the register touches this surface |

### Facts from PROJECT.md

| Section | What I need from it | Present? |
|---|---|---|
| `PROJECT.md § Product invariants` | The account isolation rule, I1 | yes |
| `PROJECT.md § Commands` | The db test and the test commands | yes |
| `PROJECT.md § Stack pack` | The pack to read by path | yes |

### Assumptions

| Assumption | Checked? | How |
|---|---|---|
| Every invoice row carries its account | yes | read the invoices migration |
| A month runs midnight to midnight UTC | no | the brief is silent; see the audit |

### Acceptance criteria

1. A request returns every invoice of the caller's account issued in the month, as CSV.
2. A second account's invoice in the same month never appears, proved by a test in the
   database, not in the client.
3. A month with no invoices returns the header row and nothing else.
4. The tests for 1 to 3 run with the db test command and the output is saved as evidence.

### Out of scope

The page and the button. Every string. Scheduled or emailed exports.

## 2. Audit of the plan

### What is missing from the plan above

What happens when the caller belongs to two accounts. Added criterion 5: the account is
taken from the request's selected account, and the test covers a member of two accounts.

### What did I assume without checking

That a month is a UTC month. The ADR says invoice dates are shown in the account's time
zone, so the month must be too. Plan amended, and a test added for an invoice issued at
23:30 on the last day in the account's zone.

### Which rule could this break

I1. An error on the refused path could name the invoice it refused. The error test now
asserts on the message, not only the status.

### What would the downstream agent reject

frontend-engineer needs the file name contract, which the brief does not give. Raised with
tech-architect as a blocker rather than decided here.

### What is the failure mode nobody has named yet

A very large account. The export streams rows rather than building the file in memory,
and the test seeds ten thousand invoices.

### Revisions made

| # | What changed | Why |
|---|---|---|
| 1 | Added criterion 5 | A member of two accounts must export the selected one |
| 2 | The month follows the account's time zone | The assumption was wrong |
| 3 | The error test asserts on the message | I1 can leak through an error |

### Verdict

Revised and re-audited, proceeding to execute. One contract question is with
tech-architect, tracked as a blocker rather than assumed.
```
