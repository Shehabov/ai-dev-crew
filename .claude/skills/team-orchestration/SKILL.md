---
name: team-orchestration
description: Run planning, right-sizing, gate enforcement, routing and the utilisation check for the team. Use when opening a run (the kickoff interview while PROJECT.md still carries TODO markers, the toolchain pre-flight, writing run.json from the run plan template and expanding its placeholders), when deciding which roles a change needs and recording why each other role is omitted, when dispatching an agent or routing a handoff that came back, when syncing gates and running the utilisation check after a stage, when judging a stall or a rejection loop, when writing a ledger line (including a decision line for every Product Lead answer and acceptance), and when closing a run with the report for the Product Lead.
---

# Orchestration

This is the orchestrator's toolkit. The orchestrator proves that the right roles did the
work in the right order, and that each gate was resolved by the role that owns it. It does
none of the work itself.

One question runs through everything below, and the orchestrator asks it after every stage:
did every agent that should have run actually run, and was every agent that ran actually
used?

This skill is the specification. `.devteam/bin/sync-gates.mjs` and
`.devteam/bin/utilisation-check.mjs` are its implementation, and `.devteam/README.md`
explains the run folder they read. The orchestrator's definition,
`.claude/agents/orchestrator.md`, carries the same run plan template and the same routing
table. The two are kept identical, and a check compares the templates byte for byte.

---

## The orchestrator's place

The orchestrator runs as the main thread of the session and is the only role that
dispatches. `.claude/settings.json` sets `"agent": "orchestrator"`, so a plain session opened
in the project is already the orchestrator, and `claude --agent orchestrator` starts one
explicitly. Every other agent runs as its subagent with the Agent tool disallowed. None of
them dispatches, re-runs or rejects directly to another: they set `next` and
`blockers[].needs` in their handoff and return, and the orchestrator routes.

A dispatch has to land in the ledger and in the utilisation check. One made by any other role
lands in neither, and afterwards reads as a skipped gate.

A small, self-contained change may go straight to the responsible agent when the Product Lead
asks for that. The orchestrator still records the run afterwards and runs the utilisation
check at the end, because no other role checks that the gates held.

---

## Opening a run

A run opens in this order, and nothing is dispatched until the last step.

| # | Step | Ledger line |
|---|---|---|
| 1 | Kickoff, only while `PROJECT.md` carries a `TODO:` outside its worked example. No run folder exists yet. | Written at step 2 |
| 2 | Create the run folder and `ledger.md` | `run opened`, then `kickoff` naming the sections filled in this session, when there were any |
| 3 | The toolchain pre-flight, written to `evidence/toolchain-preflight.log` | `toolchain pre-flight` |
| 4 | Write `run.json` from the template, right-sized, and `orchestrator/plan.md` with its `## Audit` | Cited in the step 5 line |
| 5 | Write `orchestrator/handoff.json` with `stage` 0 and `next` set to `bug-historian` | `handoff` |
| 6 | Dispatch bug-historian, before any other agent plans | `dispatch` |

Opening a run is work with a standard, but it is not a gate, so it never goes in `gates[]`,
where an unlisted name raises `UNKNOWN_GATE`. It is done when `PROJECT.md` has no `TODO:`
left, `run.json` exists with a non-empty `plan`, `gates` and `done_means`, every omission has
a reason, the audit is written and the pre-flight is on disk.

### Kickoff: filling PROJECT.md

Every stack, product and locale fact an agent needs comes from `PROJECT.md`, by section
heading. Before opening a run, search it for `TODO:`, ignoring the worked example inside its
HTML comment. If any marker remains, the project has not been profiled yet, and the
orchestrator interviews the Product Lead before anything else.

1. Take the twelve sections in their shipped order: Product, Product Lead, Stack, Commands,
   Toolchain, Stack pack, Locales, Brand, Product invariants, Quality bar, Release, House
   rules. Skip a section with no `TODO:` left.
2. Ask about one section at a time. Say in one line what the section is for and which roles
   read it. Where the section ships a default (the widths and WCAG 2.2 AA in Quality bar,
   `deferred: no target chosen` in Release, no attribution in House rules, `BRAND.md` in
   Brand), offer it and ask the Product Lead to confirm or change it. In Toolchain, say that
   the root `.mcp.json` declares the Playwright MCP server for qc-engineer and qc-lead, and ask
   whether the project keeps it. On a yes, list it as present. On a no, ask before removing
   its entry from `.mcp.json` and `playwright` from `enabledMcpjsonServers` in
   `.claude/settings.json`, and leave it out of the section. Remove the two together and
   change nothing else, the permission rules and the `.playwright-mcp/` line in `.gitignore`
   included: `scripts/check.mjs` reads both gone as a decline and passes it, fails on one
   without the other, and still requires the five permission rules the server depends on,
   and that line.
3. Write the answer into that section in place of the marker, then read it back. Never
   rename, reorder or merge a heading, because every agent finds its facts by heading. `none`
   is a valid answer in Commands and Stack pack. A section is never filled with a guess.
4. State each product invariant as a rule the data layer or the server can refuse to break,
   numbered I1, I2 and on. A rule only the client can hold is written down with that
   limitation named.
5. For Stack pack, list the `stack-*` folders under `.claude/skills/` and suggest the one that
   matches the Stack section, or `none`. Where a pack is chosen, offer its command set as the
   default for Commands.
6. When a pack is named, run the setup section of its `SKILL.md`. For
   `stack-nextjs-supabase` that is its Kickoff setup: add the `supabase` entry from
   `.claude/skills/stack-nextjs-supabase/templates/mcp.json` to the root `.mcp.json`, beside
   the team's `playwright` entry, creating the file from the template only when there is
   none and never replacing it or changing another server's entry, replace `<project-ref>`
   with the ref the Product Lead gives, and put no key or token in the file. Then tell the
   Product Lead to authorise the server with `/mcp`, and that it loads in the next session.
   Ask before installing anything a setup section lists.
7. Search for `TODO:` once more. Open the run only when none remain outside the worked
   example.

When the session cannot put questions to the Product Lead (a headless run, for example),
stop before opening the run and list the sections that still carry `TODO:`. A missing fact is
asked for, never invented.

### Toolchain pre-flight

Run it after the `run opened` line and before the first dispatch.

| Check | Command or call | Source |
|---|---|---|
| git | `git --version` | The core. Always checked. |
| node | `node --version` | The core. Always checked. |
| Every tool `PROJECT.md § Toolchain` lists as present | Its version command | The project profile |
| The Playwright MCP server, when `PROJECT.md § Toolchain` lists it | `claude mcp list`, from the project root. It answers when its `playwright:` line ends `Connected`. `Pending approval`, `Failed` or no line at all is a server that does not answer | The team's `.mcp.json` |
| Whatever the stack pack's pre-flight asks for | As its `SKILL.md` states | The pack named in `PROJECT.md § Stack pack`, read by path at `.claude/skills/<pack>/SKILL.md` |

For `stack-nextjs-supabase`, the section is Pre-flight at run open: `npm --version`,
`npx --version`, `npm ls @electric-sql/pglite` at the project root, and one `list_tables`
call through the Supabase MCP. That one read is the only call the orchestrator ever makes
through a project's MCP server. It never applies, queries or changes anything through one.
`claude mcp list` makes no call through a server: it asks Claude Code whether each server
starts. The orchestrator never calls a Playwright tool.

Write every check to `evidence/toolchain-preflight.log`, one line each, with the shell
timestamp, the command or call, and the answer or the exact error:

```text
# Toolchain pre-flight · 2026-10-01-invoice-export
2026-10-01T08:03:05Z  git --version                  git version 2.47.1
2026-10-01T08:03:05Z  node --version                 v24.1.0
2026-10-01T08:03:06Z  npm --version                  11.3.0        stack pack
2026-10-01T08:03:06Z  npx --version                  11.3.0        stack pack
2026-10-01T08:03:08Z  npm ls @electric-sql/pglite    (empty)       stack pack: offline proof unavailable
2026-10-01T08:03:09Z  list_tables (supabase MCP)     auth error    supabase MCP not authorised
2026-10-01T08:03:12Z  claude mcp list                playwright: Connected
```

| Result | Do this |
|---|---|
| Everything answers | Dispatch as planned. |
| git or node is missing | Stop and escalate. No stage can run. |
| A tool the Toolchain section lists is missing | Escalate, and plan no stage that needs it until a re-run of the check answers. |
| A check the stack pack lists fails | Do what the pack's table says for that row, and escalate where it says so. |
| An MCP server does not answer (its tools are missing, or the call returns an auth error) | Record `<server> MCP not authorised` in the ledger and in the stage 0 handoff's `blockers`, with `needs` set to `product-lead`, who authorises it with `/mcp`. Dispatch no entry that needs the server until a re-run answers. Still dispatch every entry that does not. |

Decide at planning time which plan entries need which server, and write that list in
`orchestrator/plan.md`. The stack pack names them for its own server. No entry needs the
Playwright MCP server to pass, because gate evidence comes from the suite, so a Playwright
server that does not answer is escalated and holds nothing, and qc-engineer and qc-lead name
the cases that needed it (`team-test-protocol`, When the MCP does not answer). An agent that
finds a server missing mid-run runs whatever offline proof its stack pack defines and hands off
`blocked` with the same reason, and it routes to the Product Lead the same way. A missing tool
is reported as blocked, never faked, and a result is never accepted in place of a tool that
did not run.

---

## Planning the run

### Before you write the plan

- Read the brief. `brief` in `run.json` is the Product Lead's words, verbatim.
- Read `PROJECT.md` in full, at the moment you plan.
- Read `BUGS.md`: the standing rules that bind the orchestrator, and the entries on the
  surfaces the brief names.
- Read the gate table below, so the names you write into `run.json` are the names the owners
  write back.
- Find prior runs on the same surface by searching `.devteam/runs/*/run.json` for the surface
  name, and read the `orchestrator/report.md` of any that match. Runs are gitignored, so a
  fresh clone may have none, and `BUGS.md` is the durable record.
- Take every timestamp from the shell, `date -u +%Y-%m-%dT%H:%M:%SZ`, never from memory.

### The run plan template

The run id is `<yyyy-mm-dd>-<short-slug>`, for example `2026-10-01-invoice-export`. The run
folder is `.devteam/runs/<run-id>/`, or `<run-id>/` under `DEVTEAM_RUNS_DIR` where that is
set. `run.json` is written before anything is dispatched, and every `run.json` follows this
template. `.claude/agents/orchestrator.md` carries the identical block, and in the team's own
repository `node scripts/check.mjs` fails when the two differ by a single byte, so never edit
one without the other.

```json
{
  "run": "2026-10-01-invoice-export",
  "brief": "Let account owners export a month of invoices as CSV from the billing page, in every locale, without exposing invoices from any other account.",
  "opened": "2026-10-01T08:02:11Z",
  "ships": true,
  "done_means": [
    "An account owner can export one calendar month of their own invoices as CSV from the billing page.",
    "The export can never contain a row from another account, proved at the data layer, not in the client.",
    "The page and the file work in every locale in PROJECT.md, at every width in the quality bar."
  ],
  "out_of_scope": [
    "Scheduled or emailed exports."
  ],
  "plan": [
    { "stage": 1, "agent": "bug-historian", "task": "Regression brief: what has already broken on these surfaces", "consumes": ["run.json"], "produces": ["bug-historian/brief.md"], "blocked_by": [] },
    { "stage": 1, "agent": "tech-architect", "task": "ADR and task briefs for this change", "consumes": ["run.json", "bug-historian/brief.md"], "produces": ["tech-architect/adr-NNNN-<slug>.md", "tech-architect/brief-frontend.md", "tech-architect/brief-backend.md"], "blocked_by": [] },
    { "stage": 2, "agent": "ux-designer", "task": "Design spec, every surface and every state", "consumes": ["tech-architect/brief-frontend.md", "bug-historian/brief.md"], "produces": ["ux-designer/spec.md", "ux-designer/string-slots.json"], "blocked_by": ["design-authority"] },
    { "stage": 2, "agent": "backend-engineer", "task": "Data layer, API and the tests that prove the invariants", "consumes": ["tech-architect/brief-backend.md", "bug-historian/brief.md"], "produces": ["backend-engineer/files.md"], "blocked_by": ["design-authority"] },
    { "stage": 3, "agent": "ux-auditor", "task": "Independent audit of the design spec", "consumes": ["ux-designer/spec.md", "bug-historian/brief.md"], "produces": ["ux-auditor/findings.md"], "blocked_by": [] },
    { "stage": 4, "agent": "ux-writer", "task": "Every string for every new surface, in every locale", "consumes": ["ux-designer/spec.md", "ux-designer/string-slots.json", "ux-auditor/findings.md", "bug-historian/brief.md"], "produces": ["ux-writer/strings.md", "ux-writer/strings-<locale>.json"], "blocked_by": ["design"] },
    { "stage": 5, "agent": "frontend-engineer", "task": "Interface implementation against the approved spec", "consumes": ["tech-architect/brief-frontend.md", "ux-designer/spec.md", "ux-writer/strings-<locale>.json", "bug-historian/brief.md"], "produces": ["frontend-engineer/files.md"], "blocked_by": ["design", "copy"] },
    { "stage": 6, "agent": "peer-reviewer", "task": "Senior review: judgement, boundaries, failure modes", "consumes": ["backend-engineer/files.md", "frontend-engineer/files.md", "bug-historian/brief.md"], "produces": ["peer-reviewer/verdict.json", "peer-reviewer/comments.md"], "blocked_by": [] },
    { "stage": 6, "agent": "code-analyst", "task": "Line-by-line defects and structural rot", "consumes": ["backend-engineer/files.md", "frontend-engineer/files.md", "bug-historian/brief.md"], "produces": ["code-analyst/findings.md"], "blocked_by": [] },
    { "stage": 6, "agent": "code-steward", "task": "Clean code: naming, shape, module headers, comments", "consumes": ["backend-engineer/files.md", "frontend-engineer/files.md", "bug-historian/brief.md"], "produces": ["code-steward/findings.md"], "blocked_by": [] },
    { "stage": 6, "agent": "security-analyst", "task": "Security sweep: secrets, exposure, access control, injection, dependencies, failure handling", "consumes": ["backend-engineer/files.md", "frontend-engineer/files.md", "bug-historian/brief.md"], "produces": ["security-analyst/findings.md", "evidence/security/"], "blocked_by": [] },
    { "stage": 7, "agent": "bug-historian", "task": "Regression guard: was a known defect repeated", "consumes": ["bug-historian/brief.md", "backend-engineer/files.md", "frontend-engineer/files.md"], "produces": ["bug-historian/guard.md", "evidence/regression/"], "blocked_by": ["review-judgement", "review-defects", "review-readability", "security"] },
    { "stage": 8, "agent": "engineering-lead", "task": "Integration: does it build, migrate and run end to end", "consumes": ["peer-reviewer/verdict.json", "peer-reviewer/comments.md", "code-analyst/findings.md", "code-steward/findings.md", "security-analyst/findings.md", "bug-historian/guard.md"], "produces": ["engineering-lead/verdict.md", "evidence/build.log"], "blocked_by": ["review-judgement", "review-defects", "review-readability", "security", "regression-guard"] },
    { "stage": 9, "agent": "qc-engineer", "task": "Test the contract, the invariants, the flows, accessibility, locales and regressions", "consumes": ["engineering-lead/verdict.md", "bug-historian/brief.md"], "produces": ["qc-engineer/test-log.md", "qc-engineer/defects.md", "evidence/<test artefacts>"], "blocked_by": ["engineering"] },
    { "stage": 10, "agent": "qc-lead", "task": "Evidence audit and independent final pass", "consumes": ["qc-engineer/test-log.md", "qc-engineer/defects.md", "evidence/<test artefacts>"], "produces": ["qc-lead/readiness.md"], "blocked_by": [] },
    { "stage": 11, "agent": "release-engineer", "task": "Pre-flight, release, tag, verify", "consumes": ["qc-lead/readiness.md"], "produces": ["release-engineer/preflight.md", "release-engineer/release-log.md", "release-engineer/release-note.md", "release-engineer/rollback.md", "evidence/release/"], "blocked_by": ["quality"] },
    { "stage": 12, "agent": "bug-historian", "task": "Record: every defect and agent mistake raised in this run, into BUGS.md", "consumes": ["qc-engineer/defects.md", "qc-lead/readiness.md", "bug-historian/guard.md"], "produces": ["bug-historian/record.md"], "blocked_by": ["release"] }
  ],
  "omitted": [],
  "gates": [
    { "name": "design-authority", "owner": "tech-architect", "blocks": ["ux-designer", "backend-engineer"], "result": "pending" },
    { "name": "design", "owner": "ux-auditor", "blocks": ["ux-writer", "frontend-engineer"], "result": "pending" },
    { "name": "copy", "owner": "ux-writer", "blocks": ["frontend-engineer"], "result": "pending" },
    { "name": "review-judgement", "owner": "peer-reviewer", "blocks": ["bug-historian", "engineering-lead"], "result": "pending" },
    { "name": "review-defects", "owner": "code-analyst", "blocks": ["bug-historian", "engineering-lead"], "result": "pending" },
    { "name": "review-readability", "owner": "code-steward", "blocks": ["bug-historian", "engineering-lead"], "result": "pending" },
    { "name": "security", "owner": "security-analyst", "blocks": ["bug-historian", "engineering-lead"], "result": "pending" },
    { "name": "regression-guard", "owner": "bug-historian", "blocks": ["engineering-lead"], "result": "pending" },
    { "name": "engineering", "owner": "engineering-lead", "blocks": ["qc-engineer"], "result": "pending" },
    { "name": "quality", "owner": "qc-lead", "blocks": ["release-engineer"], "result": "pending" },
    { "name": "release", "owner": "release-engineer", "blocks": ["bug-historian"], "result": "pending" },
    { "name": "run-closure", "owner": "orchestrator", "blocks": [], "result": "pending" }
  ],
  "utilisation": []
}
```

### Field rules

| Field | Rule |
|---|---|
| `run` | The run id. Every agent in the run uses the same one. |
| `brief` | The Product Lead's words, verbatim. |
| `opened` | From the shell. |
| `ships` | `true` when release-engineer is planned, `false` when it is in `omitted`. |
| `done_means` | Every line checkable against a file, a log or a screenshot. Rewrite a line until it is. |
| `out_of_scope` | Named so no role reads a gap as an oversight. |
| `plan` | One entry per pass. An agent that runs more than once has one entry per pass, each with its own stage. Two entries that share a stage number run in parallel once both are due. |
| `consumes`, `produces` | Paths relative to the run folder, fully expanded. The check measures every handoff against them, so an entry with an empty `produces` cannot be verified. |
| `blocked_by` | Gate names, never agent names. Every name is in `gates`, and that gate's `blocks` lists this agent. |
| `omitted` | One object per plan entry left out, with its reason. See Right-sizing. |
| `gates` | The twelve canonical names, minus any whose owner is omitted. Never rename one for a run: the owner writes the same name back and the check matches it literally. |
| `utilisation` | Empty at open. The orchestrator appends one summary per check run. |

`run.json` is written once. The plan is amended only by appending a new entry and logging an
`amendment` line, never by editing an entry in place once the run has started. The only
fields that change after open are `gates[].result` and `gates[].evidence`, which only
`sync-gates.mjs` writes, and `utilisation`, to which the orchestrator appends.

### Expanding the placeholders

The template keeps its placeholders so it reads for any product. A real `run.json` expands
every one of them before the first dispatch. The check tests a planned input for existence on
disk, and a placeholder can never exist, so an entry that consumes one is never due and the
run stalls without saying why. The utilisation check raises `PLACEHOLDER_IN_PLAN` for any
path in `consumes` or `produces` that still holds text in angle brackets, or the ADR number
`NNNN`.

| Placeholder | Becomes | Where |
|---|---|---|
| `ux-writer/strings-<locale>.json` | One path per locale in `PROJECT.md § Locales`. With the worked example's English, French and Arabic, `ux-writer/strings-en.json`, `ux-writer/strings-fr.json` and `ux-writer/strings-ar.json`. | ux-writer's `produces` and frontend-engineer's `consumes` |
| `tech-architect/adr-NNNN-<slug>.md` | The real name: the next free number in `docs/decisions/` and this run's slug, for example `tech-architect/adr-0007-invoice-export.md` | tech-architect's `produces`, and the architecture-holds pass's `consumes` |
| `evidence/<test artefacts>` | The evidence paths qc-engineer will write, one per test area this change needs under `team-test-protocol`, for example `evidence/qc/api-contract.log`, `evidence/qc/invariants.log`, `evidence/qc/flows/`, `evidence/qc/accessibility.md` and `evidence/qc/locales/` | qc-engineer's `produces`, qc-lead's `consumes`, and qc-engineer's dispatch brief, so the names are fixed before the tests run |

To confirm nothing is left, search the file before the first dispatch:

```bash
node -e "const r=require('./.devteam/runs/<run-id>/run.json');const left=r.plan.flatMap(e=>[...e.consumes,...e.produces].filter(p=>/<[^<>]*>|\bNNNN\b/.test(p)).map(p=>e.agent+': '+p));console.log(left.length?left.join('\n'):'no placeholders left')"
```

### Right-sizing

Plan only the roles this change needs, and write down why each role left out is not needed.
The utilisation check reads only the plan, so a right-sized plan checks clean.

| Role | When it is planned |
|---|---|
| bug-historian (all three passes), tech-architect, peer-reviewer, code-analyst, code-steward, security-analyst, engineering-lead, qc-engineer, qc-lead | Always, for a code change |
| ux-designer and ux-auditor | A surface a person sees changes |
| ux-writer | A user-visible string changes, in any locale |
| backend-engineer | The data layer, the API or a server path changes |
| frontend-engineer | The interface changes |
| release-engineer | The change ships |

For every plan entry left out, add one object to `omitted`. The reason names what the change
does not touch. "Not needed" is not a reason, and neither is a deadline: leaving a role out
for any reason other than "this change does not touch it" is a scope decision, and it goes to
the Product Lead.

```json
{
  "omitted": [
    { "agent": "ux-designer", "stage": 2, "reason": "No surface changes: the rate limit is enforced in the API and returns an existing error." },
    { "agent": "ux-auditor", "stage": 3, "reason": "No surface changes, so there is no design spec to audit." },
    { "agent": "ux-writer", "stage": 4, "reason": "No user-visible string changes: the API returns the existing rate limit error code." },
    { "agent": "frontend-engineer", "stage": 5, "reason": "No interface changes: the client already handles that error code." }
  ]
}
```

Then make the rest of the plan agree with what is left, because a plan that points at a role
that will not run can never check clean:

- Remove every gate whose owner is omitted from `gates`, and remove its name from every
  remaining `blocked_by` and `blocks`. With ux-designer, ux-auditor and ux-writer omitted and
  frontend-engineer kept, frontend-engineer's `blocked_by` becomes `["design-authority"]`,
  and `design-authority` gains `frontend-engineer` in its `blocks`.
- Remove every omitted role's artefacts from the remaining entries' `consumes`. With
  frontend-engineer omitted, the reviewers and bug-historian's guard consume only
  `backend-engineer/files.md`.
- Remove an artefact from its producer's `produces` when every planned consumer of it is
  omitted, and say so in that producer's dispatch brief. With no design track and no
  frontend-engineer, tech-architect does not produce `brief-frontend.md`.
- When release-engineer is omitted, set `ships` to false, remove the `release` gate, and give
  bug-historian's stage 12 entry `blocked_by: ["quality"]`, with `bug-historian` added to the
  `quality` gate's `blocks`.

A change that is not code at all (a design exploration, a copy pass) plans the roles it needs
by the same table, and every other role goes into `omitted` with its reason.

### The architecture-holds pass

The template has one pass for tech-architect, at stage 1. The architecture is also
re-examined after the implementation lands, so whenever tech-architect and at least one
builder are planned, append this entry after the four stage 6 reviewers, with its
placeholders expanded:

`{ "stage": 6, "agent": "tech-architect", "task": "Architecture holds: re-read the diff against the ADR, the contracts and the product invariants", "consumes": ["tech-architect/adr-NNNN-<slug>.md", "backend-engineer/files.md", "frontend-engineer/files.md"], "produces": ["tech-architect/holds.md"], "blocked_by": [] }`

It runs beside the four reviewers and is independent of them. It owns no gate: its verdict
feeds engineering-lead's `adr-conformance` check, and engineering-lead lists
`tech-architect/holds.md` in its `consumed`, so add that path to engineering-lead's
`consumes` too. tech-architect writes this pass's handoff as `handoff-stage6.json`. Drop a
builder's `files.md` from the entry's `consumes` when that builder is omitted.

### Records a role writes beside its planned output

Some roles write a record the template does not track, and list it in `produced` as every
path they write: ux-auditor's `findings.json` beside `findings.md`, and ux-writer's
`length-budget.md` and `unwritable.md`. No plan entry consumes them, so the check waits for
every later stage and then raises `UNUSED_OUTPUT` unless someone read them. Read each one when
its handoff comes back: `unwritable.md` holds decisions for the Product Lead, and the others
feed the run report. List each in the `consumed` of the orchestrator handoff that follows.
Never add one to a later entry's `consumes`: a record that is sometimes not written would leave
that entry never due. This covers only records no plan entry consumes. An output with a planned
reader is that reader's to consume, and the orchestrator reading it never stands in for them.

### When an entry is due

An entry is due when every gate in its `blocked_by` reads `pass` in `run.json` and every path
in its `consumes` is on disk. That is why tech-architect shares stage 1 with bug-historian but
still waits for `bug-historian/brief.md`, and why ux-auditor, which no gate blocks, waits for
the spec. Dispatch each entry when it is due, never before.

- The design track (ux-designer, then ux-auditor, looping until `design` passes, then
  ux-writer) runs in parallel with backend-engineer. Stage numbers order the work inside a
  track. The gates are the barriers between tracks.
- frontend-engineer waits for `design` and `copy`, because it cannot finish without the spec
  and the strings.
- peer-reviewer, code-analyst, code-steward and security-analyst run in parallel and
  independently. None reads another's verdict before filing its own, and one never covers for
  another.
- Any change that touches a string, a number, a state, colour, spacing, motion or
  right-to-left layout routes through ux-writer and ux-auditor, whoever wrote the code.
- Mirror the plan into the session's task list, so the run is visible while it executes.

### Auditing the plan

Before the first dispatch, interrogate the plan and write the answers into
`orchestrator/plan.md` under a heading `## Audit`, with what you changed. The mechanical
questions come first, because each maps to something the check would raise later.

| Question | What it prevents |
|---|---|
| Is any placeholder left in `consumes` or `produces`? | `PLACEHOLDER_IN_PLAN` |
| Does any `blocked_by` name a gate that is not in `gates`? | `UNKNOWN_GATE` |
| Does any gate have an owner who is not planned? | `GATE_UNRESOLVED` |
| Does any `consumes` point at an omitted role's artefact? | An entry that is never due |
| Does every entry left out have an `omitted` object whose reason names what the change does not touch? | A silent omission |
| Does every output meant to feed another role have a planned reader? | `UNUSED_OUTPUT` at close |

Then the judgement questions: which dispatch brief its receiver would reject as
underspecified, and for what missing input; which stage could start before the gate that
blocks it resolves (trace every `blocks` edge); whether the change touches a locale, a
right-to-left layout, a number or a status label with no ux-writer or ux-auditor planned;
which `done_means` line cannot be checked against a file; which `PROJECT.md` section a planned
role needs that is thin or missing; and what in the brief is a scope decision that belongs to
the Product Lead.

---

## The gates

Twelve gates. These literal names go into `run.json` and come back in each owner's handoff.
The pass condition is the one in the table below, the same text the team's own repository
keeps in `scripts/assets/team.mjs`, and the owner's agent file states it in full under its
gate heading.

| Gate | Owner | Passes when | Blocks |
|---|---|---|---|
| `design-authority` | tech-architect | An ADR and task briefs exist and hold the product invariants | ux-designer, backend-engineer |
| `design` | ux-auditor | The spec survives an independent audit against the brand and WCAG 2.2 AA | ux-writer, frontend-engineer |
| `copy` | ux-writer | Every string exists in every locale, within its length budget | frontend-engineer |
| `review-judgement` | peer-reviewer | A senior read finds the design, boundaries and failure modes sound | bug-historian (guard), engineering-lead |
| `review-defects` | code-analyst | A line-by-line read finds no open blocker or major | bug-historian (guard), engineering-lead |
| `review-readability` | code-steward | Names, shape and comments meet the clean code standard | bug-historian (guard), engineering-lead |
| `security` | security-analyst | Every pass of the security sweep ran, and nothing critical or high is open | bug-historian (guard), engineering-lead |
| `regression-guard` | bug-historian | No defect already in BUGS.md has been repeated | engineering-lead |
| `engineering` | engineering-lead | It builds, migrates and runs end to end, with the log to prove it | qc-engineer |
| `quality` | qc-lead | The evidence holds up to audit, and the call is go | release-engineer |
| `release` | release-engineer | Shipped, tagged, verified, with a written rollback | bug-historian (record) |
| `run-closure` | orchestrator | Every planned role ran, and every output was used | nothing |

The accessibility standard in `design` is the one `PROJECT.md § Quality bar` names, WCAG 2.2
AA unless the profile says otherwise.

The three review gates and the security gate are four names rather than one gate with four
owners, so the check can say which reviewer is outstanding instead of reporting one
ambiguous failure. `regression-guard` belongs to the role that also opens the run:
bug-historian publishes the brief at stage 1, and its guard at stage 7 checks that the brief
was honoured.

### Who records a gate

- A gate result is recorded only by its owner, in the `gates[]` of its own handoff, under the
  exact name `run.json` carries, with `result` `pass` or `fail` and an `evidence` path that
  exists.
- Self-checks, sub-gates and rubric lenses go in the agent's `review.md` or verdict file,
  never in `gates[]`, where an unlisted name raises `UNKNOWN_GATE`. Opening a run, the
  regression brief, the record pass and the architecture-holds pass are work with a standard,
  not gates.
- `sync-gates.mjs` copies each owner's latest record into `run.json`. It is a copy, never a
  decision, so running it does not breach the rule that the orchestrator never certifies
  another role's gate. Without it every gate reads `pending`, no blocked entry ever becomes
  due, and the run stalls.
- The orchestrator never writes a result into a gate another role owns, even when it is
  certain of the outcome and even when that role is blocked. `run-closure` is the only gate it
  records.
- A stage never opens while a gate that blocks it reads `pending` or `fail`. Enforce this
  before dispatching, not after.

### The three gates certified by their producer

`design-authority` is certified by tech-architect over its own ADR, `copy` by ux-writer over
its own strings, and `release` by release-engineer over its own release. A run cannot change
that, because renaming or reassigning a gate breaks the literal match every handoff relies
on. Each is checked downstream instead: the ADR by peer-reviewer and engineering-lead, the
strings by ux-auditor and qc-engineer, the release by its post-release smoke check. Every run
report names this, so the Product Lead sees it each time.

---

## Dispatching

Dispatch with the Agent tool, one call per entry, and send entries that are due together in
one message so they run in parallel. Every dispatch brief carries:

1. The run id and the run folder.
2. The plan entry it answers: stage number and task.
3. Its artefact folder, `.devteam/runs/<run-id>/<agent>/`, and the handoff file name to write:
   `handoff.json` for its first pass in the run, `handoff-stage<N>.json` for a later plan
   entry, `handoff-stage<N>-round<R>.json` for a repeat pass at the same stage, as
   `team-protocol` names them.
4. The paths it must consume, expanded, including `bug-historian/brief.md` and the section of
   the brief addressed to it by name.
5. The paths it must produce, expanded and exact.
6. The gate it certifies and that gate's pass condition, or the gate its work feeds, and the
   upstream gates that passed, each with its evidence path.
7. The `PROJECT.md` sections that constrain it, by heading. For a stack-dependent role, the
   stack pack path, `.claude/skills/<pack>/SKILL.md`, or a line saying the pack is `none`.
8. The brand spec sections that constrain it, by heading, never by value.
9. The `done_means` lines its work serves, and the `out_of_scope` lines.
10. For a re-dispatch, the round number and the rejection being answered, quoted from the
    handoff that raised it.
11. For a reviewer, the independence rule, stated.
12. Anything the toolchain pre-flight found that affects it, such as a server that is not
    authorised.

A brief never carries a colour, spacing value, radius, duration or type size. It cites the
brand spec at the path in `PROJECT.md § Brand` by section heading.

---

## Routing every handoff

Every handoff comes back to you. No other role dispatches, re-runs or rejects directly to
another, so the handoff's `status`, `next` and `blockers[].needs` are the whole routing
signal. Read all three every time, then act on the first row that matches.

| The handoff says | You do |
|---|---|
| `next` or any `blockers[].needs` is `product-lead` | Put the decision to the Product Lead (see Escalation), log an `escalation` line, and hold only the work that depends on the answer. |
| `status: rejected`, `next: orchestrator`, and `blockers[].needs` names an agent | This is a reject. Re-dispatch each agent named in `needs`, with the blocker quoted and the round number, which sets the handoff file it writes (`handoff-stage<N>-round<R>.json`, as `team-protocol` names it). Log a `reject` line. When the fix hands off, re-dispatch the rejecting role for its next round. The rejecting role never dispatches the fix itself. |
| `status: blocked`, and `blockers[].needs` names an agent | Dispatch the named agent for exactly what the blocker says, then re-dispatch the blocked role with the answer. |
| `status: blocked`, with `missing_inputs` naming a `PROJECT.md` section | Ask the Product Lead for the fact, write it into that section, log it, and re-dispatch. |
| `status: escalated`, with `decisions_for_product_lead` | Put each decision to the Product Lead as written, options and recommendation included. Never answer one yourself. |
| `status: passed`, and `next` names an agent | Sync the gates. Dispatch that agent when its plan entry is due, and not before. `next` says where the work goes; the plan and the gates say when. |

Whatever the status, log every entry in `machinery_findings`. bug-historian carries them into
the register at stage 12, and a finding that breaks the current plan is an amendment you
append now.

When the Product Lead answers, append a `decision` line that quotes their words, names the
handoff and the question it answers, and records the option chosen. An acceptance is logged
the same way: a waived finding, an accepted risk, a carried defect, a release accepted. A role
that relies on an acceptance cites that ledger line, and the run report lists every one. An
acceptance that exists only in conversation did not happen.

A rejection is counted by round. The round number is in the rejecting handoff's
`blockers[].what` and in the file name of every repeat pass, so the ledger and the file tree
agree on which round the run is in. See Stalls and rejection loops for the limit.

---

## Escalation

Stop and put the decision to the Product Lead, named in `PROJECT.md § Product Lead`, through
`decisions_for_product_lead` in the orchestrator's next handoff, with the decision stated, the
options listed and a recommendation named, when:

- Scope would change, including any role being left out for a reason other than "this change
  does not touch it".
- A brand spec rule would have to break to ship. The orchestrator never authorises this.
- Two gate owners disagree, for example engineering-lead passes `engineering` and qc-lead
  fails `quality` on the same build.
- `REJECTION_LOOP` fires.
- A deadline is at risk and the only remedy offered is cutting a gate.
- A tool or MCP server is missing at pre-flight or mid-run. Only the Product Lead can install
  a tool or authorise a server with `/mcp`.
- A fact an agent needs is missing from `PROJECT.md`.
- bug-historian reports a defect pattern at its third occurrence.

While a decision is pending, keep the run open, log the escalation, and continue any work that
does not depend on the answer. Never guess the answer, and never read silence as approval.

---

## The ledger

`.devteam/runs/<run-id>/ledger.md` is append-only, and the orchestrator is its only writer.
One line per event. A line is never edited, reordered or deleted; a mistake is put right by
appending a `correction` line. Other roles ask for a line in their handoff and never write
one. A run opens with a `run opened` line and ends with a `run closed` line.

The file opens with this header, then one table row per event, with the full timestamp from
the shell:

```markdown
# Ledger · 2026-10-01-invoice-export

Append-only. Correct an entry by appending a correction, never by editing history.
Every timestamp is taken from the shell with `date -u +%Y-%m-%dT%H:%M:%SZ`.

| Time (UTC) | Event | Agent | Detail |
|---|---|---|---|
```

The event names are fixed, so a search for one finds every instance:

| Event | Agent column | Detail carries |
|---|---|---|
| `run opened` | orchestrator | The brief in a few words, the number of plan entries and gates, and `ships` |
| `kickoff` | orchestrator | The `PROJECT.md` sections filled in this session, and any stack pack setup done |
| `toolchain pre-flight` | orchestrator | What answered, what did not, and `evidence/toolchain-preflight.log` |
| `dispatch` | the agent dispatched | Stage, task, the handoff file it will write, and the round when it is not the first |
| `handoff` | the agent that handed off | Status, any gate and its result, `next`, the stage, and the handoff file |
| `sync` | orchestrator | What `sync-gates.mjs` applied and what it refused |
| `gate` | the gate's owner | The gate, its result and its evidence path, as the sync copied them |
| `utilisation check` | orchestrator | The stage it ran after, the finding codes and their count, the entries due now, and the evidence path |
| `reject` | the rejecting role, or orchestrator for a finding | Who must fix it (`needs`), the round, and the blocker or finding code, quoted |
| `escalation` | orchestrator | What went to the Product Lead, and from which handoff |
| `decision` | orchestrator | `answer` or `acceptance`, the handoff and the question it answers, the option chosen, and the Product Lead's words, verbatim, in quotation marks |
| `amendment` | orchestrator | The plan entry appended or expanded, and why |
| `correction` | orchestrator | The line corrected, by its timestamp, and what was wrong with it |
| `run closed` | orchestrator | The final check result, `run-closure` and its evidence, and the report path |

An example, from the middle of a run:

```markdown
| 2026-10-01T08:02:11Z | run opened | orchestrator | invoice export as CSV · 18 plan entries across 15 agents · 12 gates · ships true |
| 2026-10-01T08:02:12Z | kickoff | orchestrator | filled Product, Locales, Product invariants · stack pack setup: supabase entry added to .mcp.json, /mcp asked of the Product Lead |
| 2026-10-01T08:03:12Z | toolchain pre-flight | orchestrator | git, node, npm, npx and the Playwright MCP server answered · supabase MCP not authorised · evidence/toolchain-preflight.log |
| 2026-10-01T08:03:40Z | escalation | orchestrator | supabase MCP not authorised, from orchestrator/handoff.json · entries needing the server held |
| 2026-10-01T08:04:02Z | handoff | orchestrator | passed · stage 0 · next bug-historian · orchestrator/handoff.json |
| 2026-10-01T08:04:05Z | dispatch | bug-historian | stage 1 · regression brief · writes handoff.json |
| 2026-10-01T08:21:47Z | handoff | bug-historian | passed · stage 1 · next tech-architect · handoff.json |
| 2026-10-01T08:52:30Z | handoff | tech-architect | passed · stage 1 · gate design-authority pass · next ux-designer · handoff.json |
| 2026-10-01T08:52:41Z | sync | orchestrator | applied design-authority pending to pass · refused none |
| 2026-10-01T08:52:41Z | gate | tech-architect | design-authority pass · tech-architect/adr-0007-invoice-export.md |
| 2026-10-01T08:52:55Z | utilisation check | orchestrator | after stage 1 · 0 findings · due now: ux-designer, backend-engineer · evidence/utilisation/after-stage-1.json |
| 2026-10-01T09:10:02Z | decision | orchestrator | answer · orchestrator/handoff.json, "authorise the database server?" · chose authorise · "Done, I ran /mcp and approved it." |
| 2026-10-01T11:20:04Z | reject | code-analyst | needs backend-engineer · round 1 · "unbounded query on the export path" |
| 2026-10-01T11:20:30Z | dispatch | backend-engineer | stage 2 · fix round 2 · writes handoff-stage2-round2.json |
| 2026-10-01T11:31:15Z | correction | orchestrator | the 2026-10-01T11:20:04Z line quoted the blocker from memory; code-analyst/handoff.json reads "unbounded query on the export endpoint" |
| 2026-10-01T15:40:12Z | decision | orchestrator | acceptance · ux-auditor/handoff-stage3-round2.json, "waive the major on the export button's position at the narrowest width?" · chose waive for this release · "Waive it for this release, and put it first in the next one." |
```

---

## The utilisation check

The orchestrator exists to run this check. The algorithm below is the specification and
`.devteam/bin/utilisation-check.mjs` is its implementation, and the two are kept in step:
change one and change the other in the same commit. The script is the only thing you run;
never re-derive the check by hand.

### When to run it

After every handoff you read, sync the gates, so a gate that just passed can open the next
entry. After every stage completes (every entry with that stage number has handed off), and
at close, run the pair, in this order:

```bash
node .devteam/bin/sync-gates.mjs .devteam/runs/<run-id>
node .devteam/bin/utilisation-check.mjs .devteam/runs/<run-id> --json
```

Skipping the sync leaves every gate `pending`, so no blocked entry ever becomes due and the
check reads stale results. Both scripts accept a bare run id in place of the folder and
resolve it under `DEVTEAM_RUNS_DIR`. `.devteam/README.md` gives their usage, exit codes and
output in full.

Save each `--json` result to `evidence/utilisation/after-stage-<N>.json`, where N is the
stage that just completed. A second run after the same stage, once a fix has handed off,
writes `after-stage-<N>-round<R>.json`, numbered as handoff files are. Append a summary to
`run.json` `utilisation`, log a `utilisation check` line, and cite the file in your next
handoff:

```json
{ "after_stage": 6, "at": "2026-10-01T13:02:44Z", "clean": false, "findings": ["UNUSED_OUTPUT: ux-writer: produced ux-writer/strings-ar.json, which no later agent consumed"] }
```

### What pending means

The check separates work that is not due yet from work that failed. Everything it lists as
pending is not a finding, and does not make the result unclean:

- An entry whose gates have not passed, or whose inputs are not yet on disk. It names what it
  is waiting on.
- An entry that is due now: its gates pass, its inputs are on disk, and it has no handoff yet.
  The script cannot see a dispatch, because it never reads the ledger, so it lists the entry
  for you to dispatch. Finishing stage N always makes some of stage N+1 due, so this is how a
  healthy run looks at every stage boundary.
- An output whose planned reader has not handed off yet.

A due entry becomes `NEVER_RAN` once the run has moved past it: a planned entry that consumes
its output hands off without it, or the orchestrator records `run-closure`. Whether a due
entry was dispatched is yours to judge from the ledger, as `IDLE_AGENT` and `STALLED` below.

### The algorithm

For the plan as a whole, then for each planned pass in stage order:

```text
0. THE PLAN IS EXPANDED
   Does any path in any entry's consumes or produces still hold <...> or NNNN?
   YES -> PLACEHOLDER_IN_PLAN
   Does any entry's blocked_by name a gate that is not in run.json gates[]?
   YES -> UNKNOWN_GATE

1. HANDOFF EXISTS, once per planned pass
   Handoffs pair with plan entries by their stage key: handoff.json,
   handoff-stage<N>.json and handoff-stage<N>-round<R>.json in the agent's folder.
   No handoff, and a planned consumer of its output has handed off,
   or the run is closing                                   -> NEVER_RAN
   No handoff otherwise                                    -> pending (due now, or waiting)

2. HANDOFF IS WELL FORMED
   It parses as a JSON object; status is passed, blocked, rejected or escalated;
   agent matches its folder; stage is present, matches the stage in the file
   name, and is a stage the plan gives this agent; every gate result is pass or fail.
   NO  -> MALFORMED_HANDOFF

3. OUTPUT EXISTS
   Every path in produced[] exists and is non-empty (a folder holds a file).
   NO  -> PHANTOM_OUTPUT

4. OUTPUT WAS CONSUMED
   Every path in produced[] appears in some handoff's consumed[].
   NO, and every planned reader has handed off              -> UNUSED_OUTPUT
   NO, and a planned reader has not handed off yet          -> pending
   Exempt: evidence/, handoff files, plan.md and review.md, and the output of the
   last stage in the plan. Where no entry plans to read an output, every later
   stage is a possible reader.

5. INPUTS WERE REAL
   Every path in consumed[] exists.
   NO  -> FALSE_CONSUMPTION

6. GATES RESOLVED
   Every pass in gates[] carries an evidence path that exists.
   NO  -> GATE_UNRESOLVED

7. GATE OWNERSHIP
   Every name in gates[] is in run.json gates[].            NO  -> UNKNOWN_GATE
   run.json names this agent as the gate's owner.           NO  -> GATE_SELF_CERTIFIED

8. NO SKIPPED DEPENDENCY
   Every gate in the entry's blocked_by reads pass now, and read pass, by its
   owner's records, when this pass started.
   NO  -> GATE_SKIPPED

9. THE LOOP WAS WORKED
   A non-empty plan.md with a heading that starts with Audit (numbered or not),
   and a non-empty review.md, in the agent's folder.
   NO  -> LOOP_SKIPPED

10. TIMING IS COHERENT
   started and finished are ISO 8601 times, and started is at or before finished.
   NO  -> NO_TIMING

11. HANDOFFS OUTSIDE THE PLAN
   The orchestrator's handoffs get checks 2, 3, 5, 6, 7 and 10.
   A handoff in any other folder the plan does not name     -> MALFORMED_HANDOFF

12. EVERY GATE IN THE RUN
   Its owner is not in the plan (the orchestrator excepted)  -> GATE_UNRESOLVED
   run.json shows a result no handoff by its owner records   -> GATE_UNRESOLVED
   It still reads pending after its owner handed off every
   pass it has, or named the gate in a handoff              -> GATE_UNRESOLVED
```

### Findings the script raises

These twelve codes are the whole vocabulary of `utilisation-check.mjs`. There are no
synonyms, and `PENDING` is not among them.

| Finding | Raised when | Do this |
|---|---|---|
| `PLACEHOLDER_IN_PLAN` | A path in a plan entry's `consumes` or `produces` still holds text in angle brackets, or `NNNN` | Expand it by the placeholder rule. Before the first dispatch that is an edit to `run.json`. After, it is the one in-place change a plan entry may take, logged as an `amendment`, because an entry that consumes a placeholder can never have run. |
| `NEVER_RAN` | A planned pass has no handoff, and a planned entry that consumes its output has already handed off, or the run is closing | Dispatch it. Work that ran without it runs again afterwards, because its inputs were not valid. If it was left out on purpose, it belongs in `omitted` with its reason: amend the plan, and escalate when the reason is anything but "this change does not touch it". |
| `MALFORMED_HANDOFF` | A handoff does not parse, is not an object, has a status outside the four, an agent key that is missing or differs from its folder, no stage key, a stage that differs from its file name or that the plan does not give the agent, or a gate result that is neither pass nor fail; or it sits in a folder that is not a planned agent | Send it back to its author. Never infer the missing value. |
| `PHANTOM_OUTPUT` | A path in `produced` is missing, or is an empty file or folder | Block. The record is false, not mistyped. Re-dispatch and say why. |
| `UNUSED_OUTPUT` | Every planned reader of an output has handed off and none lists it in `consumed` | Find out which failure it is: the reader skipped its input (re-dispatch the reader), or the work was not needed and the plan was wrong (amend it and say so in the report). Both are findings. |
| `FALSE_CONSUMPTION` | A path in `consumed` does not exist | Block. The agent did not read what it says it read. |
| `GATE_UNRESOLVED` | A pass has no evidence path, or one that does not exist; a gate's owner is not in the plan; `run.json` shows a result no owner handoff records; or a gate still reads `pending` after its owner handed off | The gate has not passed. Run the sync if the owner recorded a result. Otherwise send the owner back for its record and evidence, or, for an unplanned owner, remove the gate with the role and record the omission. Never proceed on it. |
| `GATE_SELF_CERTIFIED` | A handoff records a gate another agent owns | Void the record, which the sync already refused, and dispatch the real owner. |
| `GATE_SKIPPED` | A pass ran while a gate in its `blocked_by` reads anything but pass, or read anything but pass when the pass started | Stop the run. Re-run the stage after the gate resolves, because its inputs were not valid when it ran. |
| `UNKNOWN_GATE` | A `blocked_by` or a handoff's `gates[]` names a gate that is not in `run.json` | Send the handoff back, or amend the plan entry. Gate names are canonical and never renamed for a run. |
| `LOOP_SKIPPED` | The agent's folder has no non-empty `plan.md`, no heading starting with Audit in it, or no non-empty `review.md` | Send it back. A deliverable without the loop is not accepted. |
| `NO_TIMING` | `started` or `finished` is missing or not an ISO 8601 time, or `started` is after `finished` | Send it back. Timestamps come from the shell. |

The script exits 0 with no findings, 1 with one or more, and 2 when `run.json` is missing or
does not parse. `run-closure` depends on the 0.

### Conditions you judge

Four conditions live in the ledger and the file tree, which the script does not read. Judge
them at the same moments you run the script.

| Code | Means | How to find it |
|---|---|---|
| `STALLED` | A dispatched agent with no handoff and no blocker for two stages, or work waiting on an agent you have not dispatched | A `dispatch` line followed by two `utilisation check` lines and no `handoff` line for that agent. |
| `REJECTION_LOOP` | The same agent rejected by the same source three times on the same finding | Count `reject` lines with the same rejecting role, the same `needs` and the same finding. The third is the loop. |
| `IDLE_AGENT` | A planned agent with upstream output waiting for it and no dispatch line | An entry the check lists as due now, with no `dispatch` line since the check that first listed it. |
| `ORPHAN_EVIDENCE` | A file in `evidence/` that no handoff cites, which usually means a test ran and nobody read its result | List every file under `evidence/`. Each is cited when a handoff's `produced`, `consumed` or `gates[].evidence` names it or a folder that holds it. |

### Recording the result

Write the result to `orchestrator/review.md` as a table with one row per planned entry, not
only the failures, so the absence of a row is itself visible:

| Agent | Stage | Handoff | Status | Produced on disk | Consumed by | Gates | Finding |
|---|---|---|---|---|---|---|---|
| tech-architect | 1 | handoff.json | passed | 3 of 3 | ux-designer, backend-engineer, frontend-engineer | design-authority: pass | none |
| ux-writer | 4 | handoff.json | passed | 4 of 4 | frontend-engineer (strings-en.json and strings-fr.json only) | copy: pass | UNUSED_OUTPUT |

Below it, every finding in its own table, with the action, and the run's status in one line:

```markdown
## Utilisation check · after stage 6 · 2026-10-01T13:02:44Z

| Finding | Agent | Detail | Action |
|---|---|---|---|
| UNUSED_OUTPUT | ux-writer | `ux-writer/strings-ar.json` appears in no consumed list | frontend-engineer built the page without the Arabic catalogue. Re-dispatch frontend-engineer, round 2. |
| GATE_UNRESOLVED | code-analyst | gate `review-defects` passed with no evidence path | Send back for the evidence path. |

Run status: blocked. 2 findings. Stage 7 will not be dispatched.
```

Any finding blocks the run. Route the fix to the agent that caused it, log a `reject` line
with the finding code and the specific reason, and run the pair again after the fix. Never
clear a finding by editing the thing it points at, and never proceed past one because it
looks minor.

---

## Stalls and rejection loops

| Signal | Threshold | What you do |
|---|---|---|
| `STALLED` | Two stages with no handoff and no blocker after a dispatch | Ask the agent for its status. If it has no `plan.md` either, it never started: re-dispatch it and log why. |
| A rejection | Each one, from round 1 | Route it by the table in Routing every handoff: `next: orchestrator` with `blockers[].needs` naming the agent who owns the fix. |
| `REJECTION_LOOP` | The third rejection between the same two roles on the same finding | Stop. Dispatch no fourth round. Escalate with both positions and your recommendation. |
| Ping-pong | Two roles each rejecting to the other, on any finding | The contract between them is usually what is wrong. Route it to tech-architect, or escalate when it is a scope question. |
| Silent scope narrowing | Any handoff whose `produced` covers less than its brief asked for, with no blocker explaining the gap | Reject it back, naming the missing part. The ledger and the brief are the only places this shows, so compare them on every handoff. |

---

## Closing the run

A run closes only when every line below is true. Any one false means the run is open.

- Every entry in `run.json` `plan` has a handoff on disk for its pass, with a status of
  passed, blocked, rejected or escalated.
- Every path in every `produced` array exists and is non-empty.
- Every output meant to feed another role appears in a later agent's `consumed`.
- Every gate in `run.json` `gates` reads pass, recorded by its owner, with an evidence path
  that exists.
- No open blocker and no unanswered `decisions_for_product_lead`, and every answer and
  acceptance the Product Lead gave has its own `decision` line.
- release-engineer has handed off against `PROJECT.md § Release` (a target, or
  `deferred: no target chosen`), or `ships` is false and release-engineer is in `omitted` with
  its reason.
- The pair has run after the final handoff and the check exits 0.
- `orchestrator/report.md` is written and addressed to the Product Lead.

Then, in order:

1. Write `orchestrator/report.md`, below.
2. Write the closing handoff, `handoff-stage<N>.json` for the last stage in the plan, with
   `run-closure` in `gates[]`, `orchestrator/report.md` as its evidence, and `next` set to
   `null`.
3. Run the pair once more, so `run.json` reads `run-closure: pass` and the check is clean. From
   this point every planned pass without a handoff is `NEVER_RAN`, whether or not it was due.
4. Append the `run closed` line.

`run-closure` passes when every planned role ran and every output was used: every line above
is true, the final check exits 0, and the report is written.

### The run report

Written for the Product Lead, plain and specific, with no summary language. It holds, in this
order: what changed, in one paragraph; each agent, what it produced and its gate result with
the evidence path; the roles in `omitted` and why; the final utilisation table; the three
gates certified by their producer and where each was checked downstream; every acceptance the
Product Lead gave in this run, with its ledger line; every carried threshold breach
engineering-lead accepted, from its `verdict.md`; what was left undone and why; what is
knowingly untested and the risk it carries; and every decision that needs them, each with
options and a recommendation.

```markdown
# Run report · 2026-10-01-invoice-export

Brief: "Let account owners export a month of invoices as CSV from the billing page, in every
locale, without exposing invoices from any other account."
Status: released as v1.4.0. One decision needs you. One item is knowingly untested.

## What changed

Account owners can export one calendar month of their own invoices as CSV from the billing
page. The export runs in the database behind the same access rule as the invoice list, so a
row from another account cannot reach the file, and a test in the database proves it. The
page and the file work in all three locales, at every width in the quality bar.

## Who did what

| Agent | Stage | Produced | Gate | Evidence |
|---|---|---|---|---|
| bug-historian | 1, 7, 12 | brief, guard, record with 1 new entry | regression-guard: pass | bug-historian/guard.md |
| tech-architect | 1, 6 | ADR 0007, 2 task briefs, holds | design-authority: pass | tech-architect/adr-0007-invoice-export.md |
| ux-designer | 2 | spec, 6 states, 9 string slots | none | ux-designer/spec.md |
| ux-auditor | 3 | 7 findings, 6 closed, 1 major waived | design: pass | ux-auditor/findings.md |
| ux-writer | 4 | 9 strings in en, fr and ar | copy: pass | ux-writer/strings.md |
| backend-engineer | 2 | 5 files, isolation tests | none | backend-engineer/files.md |
| frontend-engineer | 5 | 4 files | none | frontend-engineer/files.md |
| peer-reviewer | 6 | 3 comments, 3 resolved | review-judgement: pass | peer-reviewer/verdict.json |
| code-analyst | 6 | 4 findings, 3 fixed, 1 carried | review-defects: pass | code-analyst/findings.md |
| code-steward | 6 | 2 findings, 2 fixed | review-readability: pass | code-steward/findings.md |
| security-analyst | 6 | 1 finding, fixed, audit clean | security: pass | security-analyst/findings.md |
| engineering-lead | 8 | integration verdict, build log | engineering: pass | engineering-lead/verdict.md |
| qc-engineer | 9 | 31 cases, 2 defects filed and fixed | none | qc-engineer/test-log.md |
| qc-lead | 10 | readiness report, go | quality: pass | qc-lead/readiness.md |
| release-engineer | 11 | release, tag, rollback plan | release: pass | release-engineer/release-log.md |

## Left out of the plan

None. Every role in the template was planned.

## Utilisation

18 of 18 plan entries handed off. 0 findings at close. Every output meant for another role
was consumed. The full table is in orchestrator/review.md.

## Gates certified by their producer

| Gate | Certified by | Checked downstream by |
|---|---|---|
| design-authority | tech-architect, over its own ADR | peer-reviewer and engineering-lead: no deviation found |
| copy | ux-writer, over its own strings | ux-auditor and qc-engineer: all three locales exercised |
| release | release-engineer, over its own release | the post-release smoke check, evidence/release/smoke.log |

## Your acceptances in this run

| What you accepted | Ledger line |
|---|---|
| The major on the export button's position at the narrowest width, waived for this release | 2026-10-01T15:40:12Z decision |

## Carried threshold breaches

| Breach | Reason given | engineering-lead |
|---|---|---|
| The CSV writer function is 64 lines against a limit of 50 | Splitting it would separate the header from the rows it must match | Accepted, in engineering-lead/verdict.md |

## Left undone

Nothing in the brief.

## Knowingly untested

| What | Why | Risk |
|---|---|---|
| An account with more than 50,000 invoices in one month | No fixture that large this run | Medium. The export streams rows, but the time to first byte at that size is unmeasured. |

## Decisions that need you

| Decision | Options | Recommendation |
|---|---|---|
| Whether the export includes draft invoices | Sent only; or sent and drafts, with a status column | Sent only. The export is a record of what was billed, and a file whose totals can change later is worse than one that omits drafts. |
```
