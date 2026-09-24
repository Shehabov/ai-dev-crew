---
name: team-bug-register
description: How bug-historian keeps BUGS.md, the defect register, and uses it to stop the same defect being made twice. Use when a run opens and the team needs its regression brief (stage 1), when the four reviews have passed and the regression guard must check the change against every known defect and every binding standing rule (stage 7), when a run closes and every defect and agent mistake raised in it must be recorded (stage 12), and whenever the Product Lead or a quality role raises a defect. Covers the BUG-NNNN entry format and every field, why a defect got through each gate, standing rules from SR-13 onward and when a defect generalises into one, repeats and the third-occurrence escalation, detection commands that run with git, grep and node only, agent mistakes as entries, and the Open index with its count check.
---

# The bug register

`BUGS.md` at the project root is the register. It holds every defect found in the product and
every mistake an agent made while building it, each with the rule it produced and a command
that detects it. This skill is how the register is kept and how it is used. bug-historian is
the only agent that writes to it.

A repeated defect is worse than a new one. A new defect means something was hard. A repeated
defect means the register was written and nobody read it, which is a failure of process
rather than of code. Everything below exists to make that second kind rare.

---

## What the register is for

It does three jobs, one at each of bug-historian's passes through a run.

| Job | Pass | What it prevents |
|---|---|---|
| Brief | Stage 1, before any other agent plans | An agent repeating a defect because nobody told it the defect existed |
| Guard | Stage 7, after the four reviews | A known defect shipping because the brief was read and then not honoured |
| Record | Stage 12, after the release | A defect raised in this run being unknown to the next one |

A register that only records is an archive: nobody opens it at the moment it would help. The
brief is what turns it into a control, and the guard is what makes the brief binding.

## Who writes it

bug-historian writes `BUGS.md`, and no other agent edits it. Every other role reports, and
bug-historian carries the report into the register.

| Who | How a defect reaches the register |
|---|---|
| The Product Lead | Anything, in any form. One line is enough. The orchestrator opens a run for it, and bug-historian fills in every field. |
| qc-engineer | `qc-engineer/defects.md`, with reproduction steps and an evidence path |
| qc-lead | `qc-lead/readiness.md`, with the evidence it audited or the probe it ran |
| The four reviewers | Their findings, and their rejections in the `blockers` of their handoffs |
| Any agent | `blockers` and `machinery_findings` in its handoff |
| The orchestrator | Its utilisation findings in `orchestrator/review.md`, and the rejections and decisions in `ledger.md` |

The register binds bug-historian too. Its briefs, guard results and entries are held to the
same standing rules as everyone else's work, and a detection it publishes that does not run is
an agent mistake with bug-historian at fault.

---

## The shape of BUGS.md

Use the sections as they stand, in this order, and never rename them. The brief, the guard and
the commands below find them by heading.

| Section | Holds | Changed |
|---|---|---|
| How to use this file | Who does what with the register | Only on the Product Lead's decision |
| Entry format | The block every entry copies, with an illustrative example | Only on the Product Lead's decision |
| Classes | The class taxonomy | Only on the Product Lead's decision, because a new class changes what every brief filters on |
| Standing rules | The rules table, then one `### SR-NN` block per rule | At the record pass, when an entry generalises |
| Open | An index of every open entry, derived from the entries | At the record pass, rebuilt by command and never edited from memory |
| Entries | Every entry ever raised, in id order, open and closed together | At the record pass |
| Raised and not yet registered | Real, reproduced findings waiting for an entry of their own | At the record pass |
| Repeat offenders | Every pattern seen twice or more | At the record pass |

Ids never change once given. Entries are `BUG-NNNN`, four digits, from `BUG-0001`. Standing
rules are `SR-NN`, two digits. The twelve seed rules that ship with the team hold `SR-01` to
`SR-12`, so the first rule this project produces is `SR-13`. No id is reused, renumbered or
deleted, and no entry leaves the file: an entry closes, and it stays.

Run paths below are relative to the run folder, `.devteam/runs/<run-id>/`, or the folder
`DEVTEAM_RUNS_DIR` names where that is set. Every time and date you write comes from the shell
at the moment you write it: `date -u +%Y-%m-%dT%H:%M:%SZ` for a handoff, `date -u +%Y-%m-%d`
for a register date.

### The survey

Run this from the project root before you add anything. It gives the next free ids and the
surface and component names already in use. It reads entry headings and table rows, never the
prose, so an id mentioned in a sentence does not move the count, and it skips the example
inside the fenced block under Entry format.

```bash
node -e '
const t = require("fs").readFileSync("BUGS.md", "utf8").replace(/\r/g, "").replace(/^\x60{3}[\s\S]*?^\x60{3}/gm, "");
const next = (re, width) => String(Math.max(0, ...[...t.matchAll(re)].map((m) => Number(m[1]))) + 1).padStart(width, "0");
console.log(`next entry: BUG-${next(/^### BUG-(\d{4})/gm, 4)}, next rule: SR-${next(/^\| SR-(\d{2}) \|/gm, 2)}`);
const tally = (label, re) => { const n = {}; for (const m of t.matchAll(re)) n[m[1]] = (n[m[1]] || 0) + 1; console.log(label + (Object.entries(n).map(([k, v]) => `\n  ${v}  ${k}`).join("") || " none yet")); };
tally("surfaces in use:", /^\| Surface \| (.*?) \|$/gm);
tally("components in use:", /^\| Component \| (.*?) \|$/gm);
'
```

On the register as it ships, it prints `next entry: BUG-0001, next rule: SR-13`.

---

## Writing an entry

Six steps, in order. The entry is the unit everything else is built from: the brief quotes it,
the guard runs its command, and the Open index counts it.

### 1. Take the next id

From the survey. Two entries written in the same record pass take consecutive ids in the order
you write them.

### 2. Fill every field

Copy the block under Entry format in `BUGS.md` exactly. Every field is filled or reads `none`,
and a blank field is a defect in the register.

| Field | What good looks like | May be `none` |
|---|---|---|
| Heading | `### BUG-NNNN · ` and a sentence-case title that says what went wrong as a user, a caller or the next agent met it. "Invoice totals were a cent short on invoices with many small lines", never "Fix rounding in totals". | No |
| `Status` | `open` or `closed`, and nothing else, because the Open index and its count check read this row | No |
| `Raised by` | The role that first reported it, or `Product Lead` | No |
| `Raised on` | The date from `date -u +%Y-%m-%d` | No |
| `Run` | The run id it was raised in. A defect raised outside a run is recorded in the run the orchestrator opens for it. | No |
| `Surface` | The area a user or a caller meets, named exactly as earlier entries name it: a route family, an API path, a scheduled job, or for the team's own machinery the file. Check the survey's list before you coin a new name, because the brief filters on this field. | No |
| `Component` | The named unit inside the surface: a function, a module, a policy, a region of a screen, a section of an agent file. A process defect with no single unit names the stage or the gate. | No |
| `Agent at fault` | The role whose output carried the defect. Where the brief, the spec or an agent file was wrong rather than the implementer, name that role or that file. This is routing, and an inaccurate one sends the next brief to the wrong agent. | When no role's output carried it, such as a dependency that broke upstream. Route it through "Who must be briefed". |
| `Class` | One class from the Classes section. When two fit, `invariant` wins, then `security`, and otherwise the class of the gate that should have caught it. A gate skipped rather than failed makes it `process`. Use `team-architecture` to test an `invariant` claim against `PROJECT.md § Product invariants`. | No |
| `Severity` | `blocker`, `major` or `minor`, as `BUGS.md` defines them | No |
| `Evidence` | The path of the file that proves it, under the run's `evidence/` folder | No. A defect raised without evidence is reproduced first, and the reproduction is the evidence. |
| `Fixed in` | Where the fix landed (a commit, a branch, or the handoff of the fix round) and the date it closed. For an entry closed because it no longer reproduces, that reason. | While `open` |
| `Repeat of` | The earliest entry with the same pattern | For a first occurrence |
| What happened | Two or three sentences on what was observed, with the line of output, the response or the message that shows it | No |
| Why it got through | The gates it passed, and the hole in each. See step 3. | No |
| The rule this produces | The lesson as a class, and the standing rule that carries it where there is one. See step 4. | No. A defect that teaches nothing does not belong in the register. |
| Who must be briefed | Every role the rule binds, by name | No |
| How to detect it next time | A command that runs on this project, what firing looks like, and where it was seen to fire. See step 5. | No |

Runs are gitignored, so the evidence path may not exist on another clone or a year from now.
Quote the line that proves the defect in "What happened", and the line that proves the
detection fired in "How to detect it next time". The entry has to stand on its own.

### 3. Write why it got through

Why it happened is the cause. Why it got through is the process finding, and it is the part
of the entry that improves the team rather than one file. Every defect that reached a handoff
passed some number of gates that should have caught it. Name every gate it passed, and the
hole in each, rather than only the last one.

| It passed | Gate | So the finding is |
|---|---|---|
| The author's own review | none, it is step 4 of the author's loop | The author's definition of done, or the brief addressed to the author, did not name the check, or named it and the author did not run it. Say which. |
| tech-architect | `design-authority` | The ADR or the task brief allowed it: a contract field missing, an error case left out, an invariant with no enforcement point. The entry routes to tech-architect. |
| ux-auditor | `design` | The audit in `team-ux-audit` has no check for it, or ran the check at a width, a state or a locale that did not show it. Name the check. |
| ux-writer | `copy` | A string rule in `team-copy` is missing or was not applied. Name the rule. |
| peer-reviewer | `review-judgement` | A lens in `team-code-review` had a hole: problem fit, simplicity, boundaries, failure modes, tests, naming and domain language, or rollout. Name the lens and the question it did not ask. |
| code-analyst | `review-defects` | No probe in `team-code-analysis` reached it. Name the section and the probe that would have fired. |
| code-steward | `review-readability` | A name, a comment or a shape misled the reader past it, and the standard in `team-clean-code` did not flag it. Name the rule. Where readability had no bearing on the defect, write that, and the gate is not counted as a miss. |
| security-analyst | `security` | The catalogue in `team-security`, or the sweep that applies it, has a hole. Name the pass by its number and title. |
| bug-historian | `regression-guard` | The entry that should have caught it was left out of the brief, because the match was made on the path and missed the class, or its detection could not reach the defect: the wrong language, a plain `git grep` that skipped untracked files, a shell glob expanded one folder deep, a pathspec that missed the folder. Fix the command, prove it fires, and record the miss as its own `agent-behaviour` entry with bug-historian at fault. |
| engineering-lead | `engineering` | The integration run or the regression scope did not exercise the path. Name the seam. |
| qc-engineer | none, it is the test pass | The test matrix has a hole. Name the surface, state, locale, width or error path left untested. |
| qc-lead | `quality` | The evidence audit accepted a claim, or the independent pass shared the test pass's blind spot. Name the evidence that was missing. |
| release-engineer | `release` | The verification after release did not look where the defect was. |
| No gate, it was found after release | | Name the gate that should own it. Where no gate can own it, that is a missing gate, and a class that keeps recurring for want of one goes to the Product Lead. |

Where a gate did catch it, write which gate caught it and which earlier step should have. For
an agent mistake, that earlier step is nearly always the agent's own step 4.

Where a gate was skipped rather than failed, the class is `process`, and the entry names the
role that should have held it. That is usually the orchestrator, when a stage started before
the gate it waits for had passed.

### 4. Write the rule it produces

An incident note tells the next agent about one file. A rule tells every agent about a class
of mistake, and only rules prevent anything.

| Incident note | Rule |
|---|---|
| Do not call `parseFloat` on the invoice amount in the totals module | Every amount is held and summed in integer minor units. A floating-point number never holds an amount. |
| The project list forgot to filter archived projects | Every list query states its filter on archived rows in the query, never in the client after the fetch. |
| code-analyst dropped `--untracked` from the briefed command | A briefed detection is run exactly as published. A shortened command is a different check, with an unknown result. |

A good rule is written as a class, can be checked, and names the roles it binds. Where an
existing standing rule already says it, cite that rule and write nothing new. Where it
generalises and no rule says it yet, it becomes a standing rule: see
[Standing rules](#standing-rules).

### 5. Write the detection

Every entry carries a command that finds the defect if it comes back. The rules for writing
one are in [Detection commands](#detection-commands), and they are strict, because a detection
that cannot fire looks like coverage and provides none.

### 6. Check for a repeat

Before the entry is final, search the register for the same pattern. How, and what follows
when you find one, is in [Repeats and the third occurrence](#repeats-and-the-third-occurrence).

---

## Detection commands

Every entry has one, the brief quotes it wherever the entry binds a run, and the guard runs it.
A detection earns its place only if it runs on this project exactly as written.

The rules:

- It runs with git, grep and node, which are always present, or with a command from
  `PROJECT.md § Commands`, such as the db test. A tool `PROJECT.md § Toolchain` does not list
  is never used. A detection that needs one is rewritten before the entry is written.
- It targets the language the surface is written in, from `PROJECT.md § Stack`. A search for
  another stack's syntax returns nothing for the wrong reason.
- It searches recursively in a form that reaches every file: `git grep --untracked` or
  `grep -rn`. Plain `git grep` skips files not yet committed, which is every file a run has
  just added. Some shells expand a `**` glob one folder deep. Quote every git pathspec so the
  shell never expands it: to git, `'src/*.ts'` matches `.ts` files at every depth under `src/`.
- A search never targets the runs folder with `git grep`: it is gitignored, and `--untracked`
  still skips ignored files. Search run artefacts with `grep -rn`.
- It says what firing looks like. For a search, any line of output is a hit and empty output
  is clean. For a script or a test, the entry names the line that fails.
- It carries no placeholder. The one parameter allowed is the run folder, written
  `<run-dir>`, which the guard fills with the current run's folder, as the utilisation check
  takes it. A command with any other placeholder is not a check.
- It has been seen to fire on the unfixed state, and to return nothing on the fixed one,
  before the entry closes (SR-05).

`git grep` reports through its exit status as well as its output, and all three values mean
something different.

| Exit | Output | Means |
|---|---|---|
| 0 | One or more lines | Fired. The pattern is present. |
| 1 | Nothing | Clean |
| 128, or anything else | An error | The command did not run. That is neither fired nor clean, and a check that did not run is an unchecked rule. |

### Kinds of detection

Prefer the first kind that can see the defect.

| Kind | Use it for | Form |
|---|---|---|
| A search that must return nothing | A banned call, a literal value, a pattern in code or in a document | `git grep --untracked -nE` with the pattern and quoted pathspecs |
| The same search on the unfixed state | Proving a detection fires before an entry closes | `git grep -nE` with the pattern, then a commit or the run's base ref, then the pathspecs. Git reads the committed tree, and nothing in the working tree changes. |
| A node script | Structure a search cannot judge: two copies that must match, a count that must agree, a field every file must carry | `node -e`, printing each hit and nothing when clean |
| A test | Behaviour: an access rule, a state transition, a rounding path | The test command from `PROJECT.md § Commands`, naming the test file, the test, and the line that fails on the unfixed code |
| A narrowed reading | A defect only a reader can judge, such as what an error message discloses | A command that lists exactly the lines to read, and the question to ask of each hit. Use it last: a reading repeats only as well as its reader does. |

Two practical notes. Write node detections with regular expression literals and single
backslashes: some shells halve a doubled backslash on its way to node, and a pattern built from
a string with `\\` then silently matches something else. Where a detection needs double quotes
or a `$` of its own, save it as a script under the run's `evidence/regression/` folder and run
the script, so the shell cannot alter it.

### Saving the output

Every run of a detection at the guard or at a closure is saved with the command at the top and
the exit status at the bottom. Paste the command from the entry between the double quotes
unchanged, so the log proves that the published command is the one that ran.

```bash
RUN=.devteam/runs/2026-10-14-invoice-reminders
cmd="git grep --untracked -nE '(parseFloat|Number)\((.*\.)?(amount|total|subtotal|balance)' -- 'src/*.ts' 'src/*.tsx'"
{ echo "\$ $cmd"; eval "$cmd"; echo "exit: $?"; } > "$RUN/evidence/regression/BUG-0004.log" 2>&1
```

Where `DEVTEAM_RUNS_DIR` is set, `RUN` sits under it instead.

---

## Standing rules

A standing rule is the lesson of one or more entries, stated as a class, and it binds every
run that touches what it names. It outranks an agent's instinct, which is the reason it is
written down. It does not outrank the brand spec, an ADR or a rule in
`PROJECT.md § Product invariants`: where a standing rule conflicts with one of those, the
conflict goes to the Product Lead, and nobody picks a side alone.

### The seed and the numbering

The team ships with twelve seed rules, `SR-01` to `SR-12`, in `BUGS.md` under Standing rules.
They come from mistakes that recur on any project, whatever its stack, and they bind from the
first run. Their table rows read `seed` in the From column. The first rule this project
produces is `SR-13`, and each one after it takes the next number from the survey.

### When an entry becomes a rule

Add a standing rule when all four of these are true:

1. The lesson binds beyond the component where it was found. Another surface, another agent or
   another run could make the same mistake.
2. It can be stated as a class, in one or two sentences.
3. A breach can be detected, by a command or a narrowed reading, written in the rule's block.
4. No existing rule already says it. Where one does, cite that rule in the entry's "The rule
   this produces" and add nothing: two rules for one lesson is the defect SR-03 describes.

A repeat always produces a rule, if the first occurrence did not already. An `agent-behaviour`
entry nearly always does, because a behaviour repeats on every surface the agent touches.

An entry that breaches an existing standing rule cites the rule, and counts as an occurrence
of that rule's pattern. A second entry breaching the same rule is a repeat, whatever
components the two touched.

### Writing a rule

Two edits, made together. First a row at the end of the table under Standing rules:

```markdown
| SR-13 | Money never passes through a floating-point number | BUG-0004 | backend-engineer, frontend-engineer, code-analyst, qc-engineer |
```

Then a block after the last rule block, in the shape the seed rules use:

```markdown
### SR-13 · Money never passes through a floating-point number

| | |
|---|---|
| Rule | Every amount is held, summed and stored in integer minor units, and formatted for display only at the edge, through the one formatting module. No amount is parsed into, or computed as, a floating-point number. |
| Why | A floating-point sum drifts below the cent, and a display that truncates shows the drift. BUG-0004 put a total a cent short on a customer's invoice. |
| Detect a breach | The detection under BUG-0004. Any line of output is a breach. |
```

The title is the rule in a few words, as a statement. The Rule row is the class, written so a
reader could apply it to code that does not exist yet. The Why row is the cost of breaking it,
drawn from the entry. The Detect a breach row runs as written, or names the entry whose
detection it uses.

The Binds column names the roles that can break the rule. Write `every agent` only when every
role can. A brief that tells everyone the same thing is read by no one.

### Retiring a rule

A rule is never deleted. When a rule conflicts with the brand spec, an ADR or a product
invariant, or guards something the product no longer has, escalate it. If the Product Lead
retires it, its row stays, its Binds cell reads `retired <date>: <reason>, decided in
<run-id>`, and briefs stop carrying it.

---

## Repeats and the third occurrence

Two occurrences of a pattern make it a repeat. A third is escalated to the Product Lead as a
process failure, because by then the rule was written, briefed and guarded, and the mistake
was made anyway.

### Finding a repeat

At the record pass, search the register for every new entry three ways:

1. The same class and the same component.
2. The same shape across components. Read "The rule this produces" of every entry in the same
   class: two entries whose rules say the same thing are one pattern, whatever files they
   touched.
3. The same standing rule breached.

This lists every entry with its class, component and status, one block each, for the first
two searches:

```bash
grep -nE '^(### BUG-|\| (Class|Component|Status) \|)' BUGS.md
```

The first block it prints is the example under Entry format, which is not an entry.

### Recording a repeat

The new entry's `Repeat of` names the earliest occurrence. At the second occurrence, the
pattern gets a row in Repeat offenders, and every later occurrence adds its id to that row.

| Column | Holds |
|---|---|
| Pattern | The class of mistake in plain words, such as "An amount parsed or summed as a floating-point number". Never "BUG-0004 again". |
| Occurrences | Every entry id, oldest first |
| Standing rule | The rule the pattern breaches |
| State | `watching` at two occurrences: every brief on a surface the pattern touches carries it. `escalated` at three or more, while the decision is with the Product Lead. `decided` once the Product Lead has chosen, with the choice quoted and dated in the rule's block and the ledger line cited. |

### The third occurrence

Escalate at whichever pass first sees it: the brief, the guard or the record. Set `status` to
`escalated` and `next` to `product-lead`, and carry the decision in
`decisions_for_product_lead` with options and a recommendation, never a bare question. At the
guard the gate also fails.

The options are changes to the process, which is why they are the Product Lead's:

| Option | What it does |
|---|---|
| Mechanise the rule | A check in the project's own lint or test commands, from `PROJECT.md § Commands`, that fails on a breach, so nobody has to remember the rule |
| Remove the way to make the mistake | One module or one type that owns the concept, such as a money type or a date helper, so the wrong form cannot be written |
| Change the machinery | A line in the agent file or skill of the role that keeps making it, so its own step 4 catches it |
| Accept the risk | Keep guarding, with the cost of a fix round each time written down |

The worked example at the end of this skill shows one.

---

## The regression brief (stage 1)

| | |
|---|---|
| Dispatched | First, ahead of tech-architect |
| Blocked by | Nothing |
| Produces | `bug-historian/brief.md` |
| Handoff | `handoff.json`, `stage` 1, no gate, `next` is `tech-architect` |

### What to read

- `run.json`: the surfaces and components in scope, the planned agents, and `omitted` with the
  reason for each.
- `BUGS.md`, in full and never by search alone, because patterns live across entries rather
  than inside one.
- `PROJECT.md § Stack`, `§ Commands`, `§ Toolchain` and `§ Stack pack`, so every detection you
  brief runs on this project.

A plan that names no surface and no component is rejected back to the orchestrator: without
them the register cannot be filtered.

### What goes in

| Include | When |
|---|---|
| A standing rule | Its Binds names a planned agent, or every agent. One line each, naming the planned agents it binds. A rule whose roles are all omitted is left out, and one line says which rules and why. |
| An entry, open or closed | Its Surface or Component is in scope, or its Class and shape match a change in scope on another path. Data leaking across accounts through a list binds a change to an export. |
| A live repeat pattern | Its occurrences touch a surface in scope, or a planned agent was at fault in one of them |
| A waiting finding | Its files are among those the run will change. It is briefed now and promoted to a full entry at this run's record pass. |
| A section per agent | Every planned agent that a rule or an entry above gives something specific to do. An omitted agent gets none. |

Leave out everything else. A brief that lists every defect ever is skipped, and the one that
mattered is skipped with it. Where nothing in the register touches the run beyond the rules
that bind every agent, say exactly that in one line. A short, honest brief keeps the long ones
credible.

### Run every detection before you brief it

Run each included entry's detection on the current tree (SR-09) and record its exit status in
`review.md`. On a closed entry it returns nothing. A command that errors is rewritten and
proved before it is briefed. A hit on a closed entry means the defect is back before this run
has changed anything: brief it as present, with the hits, so tech-architect can bring it into
scope or name it as out of scope, and register the occurrence at this run's record pass.

### The format

The sections, in this order. The worked example at the end of this skill fills them in.

| Section | Holds |
|---|---|
| Heading | `# Regression brief · <run-id>`, then the surfaces in scope, the planned agents and the omitted ones |
| Standing rules that bind this run | One row per binding rule: id, rule, the planned agents it binds |
| Prior defects on these surfaces | One row per included entry: id, status, what, agent at fault, and what it matched on (surface, component or class). Each entry's detection follows the table in a code block of its own, exactly as published, because the pipes in a command break a table row. |
| Live repeat patterns | Each pattern, its occurrences, and what this run must do about it, or one line saying none is live |
| Waiting findings this run will touch | Each row from Raised and not yet registered whose files the run changes |
| Per agent | One section per agent the brief gives something to do, addressed by name, saying which rule binds it, which entry was its own, and which detection to run before it hands off |

Address agents by name: a brief addressed to nobody in particular goes unread. Lead with the
standing rules, because they bind regardless of surface.

Every downstream agent lists `bug-historian/brief.md` in its `consumed`. If none does, the
utilisation check reports `UNUSED_OUTPUT` against bug-historian, which is what makes the brief
binding rather than advisory.

---

## The regression guard (stage 7)

| | |
|---|---|
| Dispatched | After the four reviews, before engineering-lead |
| Blocked by | `review-judgement`, `review-defects`, `review-readability`, `security` |
| Produces | `bug-historian/guard.md`, and the command output under `evidence/regression/` |
| Handoff | `handoff-stage7.json`, `stage` 7, the `regression-guard` gate |

### What to read

- `bug-historian/brief.md`, your own, which lists everything the guard must check.
- The build lists the plan names, `backend-engineer/files.md` and `frontend-engineer/files.md`,
  or one of them when the plan was right-sized. Reject a list that names no files, or names a
  file the diff does not contain.
- The diff. Where the dispatch names a base ref, `git diff --stat <base>...` and then
  `git diff <base>...` in full. Where it names none, the files in the lists.

The reviewers' findings are optional reading. A reviewer may already have flagged a known
defect, and the guard runs every detection anyway.

### The procedure

For every entry in the brief:

1. Run its detection exactly as published, over the whole tree rather than only the diff. A
   defect anywhere on these surfaces ships with this change.
2. Save the command and its full output to `evidence/regression/<bug-id>.log`, in the form
   under [Saving the output](#saving-the-output).
3. Read the result as clean, fired or not run, from the output and the exit status.
4. Where it fired, place each hit. A hit in a file named in the build lists means this run
   repeated the defect, and the fix belongs to that file's author. A hit in a file this run did
   not touch means an earlier fix did not reach everywhere (SR-05), and the fix belongs to the
   original entry's agent at fault. Either way the gate fails.
5. Count the pattern's occurrences, including this one. At three, escalate now.

For every standing rule that binds this run:

1. Check it the way its Detect a breach row says.
2. Where the check is a command, save the output to `evidence/regression/<rule-id>.log`. Where
   it is a reading, write in `guard.md` what you read and what you found.
3. Record the result as held, broken or unchecked. An unchecked rule fails the gate exactly as
   a broken one does.

Some rules are checked with the team's own scripts. `node .devteam/bin/utilisation-check.mjs
<run-dir>` is read-only and reports `PHANTOM_OUTPUT`, `NO_TIMING`, `NEVER_RAN`,
`GATE_SELF_CERTIFIED` and `UNKNOWN_GATE`. Never run `.devteam/bin/sync-gates.mjs`: it writes
`run.json`, which is the orchestrator's alone.

For every waiting finding in the brief, run its reproduction where it has one, and note in
`guard.md` whether this run fixed it. A waiting finding has no entry yet, so it cannot be
repeated and does not decide the gate. The record pass uses your note when it promotes it.

A repeat that a reviewer caught first still counts. If a reviewer flagged a known defect and
the author fixed it before the guard ran, the guard runs clean, and the record pass registers
the occurrence anyway: the author handed off a defect the brief had named.

A detection that errors is your own defect. Rewrite it in `BUGS.md`, prove the new command
fires on the unfixed state, run it on the change, and record the broken command at the record
pass. Never pass the gate on a command that did not run, and never touch the code: the guard
reports, and the author repairs (SR-06).

### guard.md

One row per entry in the brief and one row per binding rule, including every one that held,
each with its evidence. Then the waiting findings, then the verdict in one or two sentences.

A guard run again after a fix round keeps every earlier round in `guard.md`, newest first, each
headed with its round. Its evidence carries the round in the name, such as
`evidence/regression/BUG-0004-round2.log`, and its handoff is
`handoff-stage7-round<R>.json`. Nothing from an earlier round is overwritten.

### The gate

`regression-guard` passes when both of these are true:

1. Every entry in the brief was checked by running its detection, with the output saved as
   evidence, and none fired.
2. Every standing rule binding this run was checked, with the check stated and the result
   recorded, and none was broken.

This is not a judgement call. The gate never passes because the diff looks careful.

| Result | `status` | `gates` | `next` | `blockers` |
|---|---|---|---|---|
| Every entry clean, every rule held | `passed` | `regression-guard`, `pass`, evidence `bug-historian/guard.md` | `engineering-lead` | none |
| A detection fired, or a rule was broken | `rejected` | `regression-guard`, `fail`, evidence `bug-historian/guard.md` | `orchestrator` | One per hit. `what` gives the round, the entry id, and the file and line. `why` quotes the rule from the original entry. `needs` is the agent at fault. |
| A check could not run because a tool is missing or a server is not authorised | `blocked` | `regression-guard`, `fail` | `orchestrator` | `needs` is `product-lead`, naming the tool or the server and the exact error |
| A pattern reached its third occurrence | `escalated` | `regression-guard`, `fail` | `product-lead` | `needs` is `product-lead`, with the decision in `decisions_for_product_lead` |

Only bug-historian records the gate, in the guard's handoff for each round, and the gate sync
takes the latest. The guard's own self-checks go in `review.md`, never in `gates[]`, where an
unlisted name raises `UNKNOWN_GATE`.

---

## The record (stage 12)

| | |
|---|---|
| Dispatched | After the release, as the last pass before the orchestrator closes the run |
| Blocked by | `release`, or `quality` when the run does not ship |
| Produces | `bug-historian/record.md`, and the new and changed entries in `BUGS.md` |
| Handoff | `handoff-stage12.json`, `stage` 12, no gate, `next` is `orchestrator` |

### The sources

Read every one, and list each in `consumed`. A defect that reached any of them and is not in
`record.md` has been dropped.

| Source | What it gives |
|---|---|
| `qc-engineer/defects.md` | Defects with reproduction steps and evidence |
| `qc-lead/readiness.md` | Defects and gaps from the evidence audit and the independent pass |
| `bug-historian/guard.md` | Every repeat the guard found, in every round, and what this run did to each waiting finding |
| Every handoff in the run | `blockers`, where every rejection is a defect someone handed off; `machinery_findings`; `missing_inputs` |
| `orchestrator/review.md` | The utilisation findings: a planned role unused, an output nobody consumed, a claimed input that does not exist |
| `ledger.md` | The rejections and their rounds, and every Product Lead decision and acceptance |

### The checklist

Work it in this order, and tick each item in `record.md`.

1. List every candidate from the sources in a table in `record.md`, with a decision for each: a
   new entry, a waiting finding, or not recorded, with the reason from
   [What not to record](#what-not-to-record).
2. Write each new entry by the six steps in [Writing an entry](#writing-an-entry), naming in
   "Why it got through" the gate that should have caught it.
3. Add a standing rule for every entry that generalises, with the next `SR-NN`.
4. Check every new entry for a repeat, update Repeat offenders, and escalate any pattern at its
   third occurrence.
5. Close every open entry this run fixed. An entry closes only after its detection has been
   seen to fire on the unfixed state and to return nothing on the fixed one. For a search, run
   it at the run's base ref or at the commit before the fix, then on the current tree. For a
   test, cite the failing run and the passing run, both captured. Save both halves in
   `evidence/regression/close-<bug-id>.log`, fill `Fixed in`, and set `Status` to `closed`.
6. Close every open entry that no longer reproduces, with the reason in `Fixed in` and the
   attempt to reproduce it saved as evidence. Never delete an entry.
7. Promote every waiting finding whose surface this run worked to a full entry. Its row leaves
   Raised and not yet registered in the same edit that adds the entry, and the entry's "What
   happened" says which row it came from. Add every real, reproduced finding whose surface this
   run did not work to that table, rather than dropping it. The table's row numbers are never
   reused.
8. Rebuild the Open index from the entries with the command below. It prints one row per open
   entry. Add the Needs cell for each from the entry: what has to happen for it to close. When
   no entry is open, the table has no rows and the line under it reads "No entries are open."
9. Run the Open count check written under Open in `BUGS.md`,
   `grep -c '^| Status | open |' BUGS.md`, and confirm it equals the number of rows in the Open
   table. The command below makes the same comparison and names any entry that differs.
10. Run every detection you wrote in this pass once more, and the survey, against your own
    output. The register binds you.
11. Write `record.md`, then the handoff.

The count in `BUGS.md` reads the whole file, so it would also count the example under Entry
format if that example's `Status` ever read `open`. It reads `closed`, and it stays that way.

This rebuilds the index and checks it in one run, from the project root:

```bash
node -e '
const text = require("fs").readFileSync("BUGS.md", "utf8").replace(/\r/g, "").replace(/^\x60{3}[\s\S]*?^\x60{3}/gm, "");
const section = (name) => text.split(/^## /m).find((s) => s.split("\n")[0].trim() === name) || "";
const field = (block, name) => { const line = block.split("\n").map((l) => l.trim()).find((l) => l.startsWith(`| ${name} | `)); return line ? line.slice(name.length + 5, -2).trim() : "missing"; };
const entries = section("Entries").split(/^### /m).slice(1).map((b) => ({ id: b.slice(0, 8), what: b.split("\n")[0].slice(11).trim(), status: field(b, "Status"), surface: field(b, "Surface"), agent: field(b, "Agent at fault") }));
const open = entries.filter((e) => e.status === "open");
const indexed = [...section("Open").matchAll(/^\| (BUG-\d{4}) \|/gm)].map((m) => m[1]);
for (const e of open) console.log(`| ${e.id} | ${e.what} | ${e.surface} | ${e.agent} | |`);
const odd = entries.filter((e) => e.status !== "open" && e.status !== "closed").map((e) => `${e.id} (${e.status})`);
const missing = open.filter((e) => !indexed.includes(e.id)).map((e) => e.id);
const extra = indexed.filter((id) => !open.some((e) => e.id === id));
console.log(`open entries: ${open.length}, Open index rows: ${indexed.length}`);
if (odd.length) console.log(`status neither open nor closed: ${odd.join(", ")}`);
if (missing.length) console.log(`open but not in the index: ${missing.join(", ")}`);
if (extra.length) console.log(`in the index but not open: ${extra.join(", ")}`);
process.exitCode = odd.length + missing.length + extra.length ? 1 : 0;
'
```

It exits 0 when the index agrees with the entries and 1 when it does not. Paste its output
into `record.md`.

### record.md

It lists, each under its own heading: the sources read; the candidate table; every entry added,
updated, promoted or closed, with the close log for each closure; every rule added; every
change to Repeat offenders; every escalation; and the output of the Open count check. The
worked example at the end of this skill shows one.

A pattern at its third occurrence sets the record's handoff to `escalated`, with `next` set to
`product-lead` and the decision in `decisions_for_product_lead`. The entries are still written
first: the escalation is about the pattern, and the register stays complete either way.

---

## Recording outside a run

When the Product Lead raises a defect in one line, or a quality role reports one after a
release, the orchestrator opens a run for it and dispatches you. Take the report as given and
never send it back for more detail. You do the work of filling in the entry: reproduce the
defect, save the reproduction as evidence, find the gates it passed, and write the rule and the
detection. It is your first handoff in that run, so the file is `handoff.json`, with the
`stage` of the plan entry it answers.

---

## Agent mistakes

An agent mistake is behaviour: an agent did something its own file, or `team-protocol`, tells
it never to do. It is recorded as a full entry the first time it happens, whether or not a gate
caught it. A code defect lives in one file. A behaviour repeats on every surface the agent
touches, which makes it the more expensive of the two.

The class is `agent-behaviour`. Where the mistake was a gate skipped, a handoff unread or a
planned role left unused, the class is `process`.

| Mistake | Looks like | Detected by |
|---|---|---|
| Invented a value | A colour, size, duration or radius the brand spec at the path in `PROJECT.md § Brand` does not contain | A search of the brand spec for the value (SR-10) |
| Cited from memory | A section, token or rule that is missing from the cited file, or says something else there | Opening the cited file (SR-10) |
| Marked work done without evidence | `status: passed` with a `produced` path that is empty or missing | `PHANTOM_OUTPUT` in the utilisation check (SR-01) |
| Claimed a false input | A `consumed` path it did not read, or that does not exist | `FALSE_CONSUMPTION` in the utilisation check |
| Certified a gate it does not own | A `gates[]` entry for another role's gate, or under a name the plan does not carry | `GATE_SELF_CERTIFIED` and `UNKNOWN_GATE` (SR-08) |
| Skipped the plan audit | No heading starting with `Audit` in `plan.md`, or an audit with no revisions and no word on why none were needed | `LOOP_SKIPPED` for the first, a reading for the second |
| Invented a time | Reversed times, or a run of round ones | `NO_TIMING` (SR-02) |
| Overwrote an earlier pass | A later pass writing to the first pass's handoff | `NEVER_RAN` and `MALFORMED_HANDOFF` (SR-07) |
| Narrowed scope silently | Less than the brief asked for, with no blocker naming the gap | The brief's acceptance criteria read against the handoff and its evidence |
| Papered over bad input | Worked around a broken handoff instead of rejecting it | A gap in an upstream artefact that no `blockers` entry names |
| Guessed a `PROJECT.md` fact | A value in an artefact that the cited section does not hold | A search of `PROJECT.md` for it |
| Faked a tool or a result | Evidence from a tool `PROJECT.md § Toolchain` does not list, or output the command could not have produced | Running the command |
| Altered a published command | A detection run in a shorter or different form than the brief published | The command at the top of the agent's evidence log, compared with the brief |
| Repaired what it checks | A reviewer or a check editing the thing under review | A reviewer's `produced` naming a file under review (SR-06) |
| Dispatched another agent | Work that started with no `dispatch` line for it in `ledger.md` | `ledger.md` |
| Added attribution | A line `PROJECT.md § House rules` forbids, on a commit, a comment or a document | A search of the commit messages and the diff for the forbidden form |

Where the machinery caused the mistake, because an agent file or a skill was silent, ambiguous
or told the agent to do it, the entry's `Agent at fault` names that file and says so. The fix is
a change to the file, and it goes to the Product Lead in `decisions_for_product_lead` with the
change proposed.

---

## What not to record

The register is useful only while it is read, and it stops being read when it is padded.

- A defect caught and fixed inside one agent's own loop, before any handoff. That is the loop
  working. Record it only when it reveals a rule nobody has written.
- A style preference a formatter owns.
- A one-off failure of the environment with no product cause, such as a mail server that
  refused connections for four minutes.
- The same defect reported twice in one run, by two roles. It gets one entry, and "What
  happened" names both reports. A recurrence in a later run is different: that is a repeat, and
  it gets its own entry.
- A suspicion nobody could reproduce. Reproduce it yourself where you can. Where you cannot, it
  is not recorded, and `record.md` says why.

Every candidate left out appears in the candidate table in `record.md` with its reason, so the
decision can be checked.

---

## Worked example: one defect through three runs

A billing product with accounts, projects and invoices. One mistake, handling money as a
floating-point number, is recorded, briefed, caught on its return, and escalated when it comes
back a third time. The paths and the TypeScript are illustrative; on a real project they come
from `PROJECT.md § Stack`.

### Run one: the entry and its rule

qc-engineer reports a total a cent short in `2026-10-06-invoice-totals`. At that run's record
pass, bug-historian writes the entry below, and the SR-13 row and block shown under
[Writing a rule](#writing-a-rule).

```markdown
### BUG-0004 · Invoice totals were a cent short on invoices with many small lines

| | |
|---|---|
| Status | closed |
| Raised by | qc-engineer |
| Raised on | 2026-10-06 |
| Run | 2026-10-06-invoice-totals |
| Surface | billing/invoices |
| Component | invoice totals, `src/billing/totals.ts` |
| Agent at fault | backend-engineer |
| Class | correctness |
| Severity | major |
| Evidence | `.devteam/runs/2026-10-06-invoice-totals/evidence/qc/ten-line-invoice.log` |
| Fixed in | `backend-engineer/handoff-stage2-round2.json` of 2026-10-06-invoice-totals, closed 2026-10-07 |
| Repeat of | none |

**What happened.** An invoice with ten lines of 0.10 showed a total of 0.99. Each line was
read with `parseFloat` and summed, the sum came to 0.9999999999999999, and the display cut it
to cents. From the evidence: `total: 0.99, expected: 1.00`.

**Why it got through.** It passed backend-engineer's own review, and the brief had nothing
on money to point it at. It passed peer-reviewer, whose tests lens accepted fixtures priced in
whole units only. It passed code-analyst, because section 1, correctness, has no probe for an
amount held as a floating-point number. code-steward and security-analyst had no bearing on
it. There was no entry yet for the guard to run. qc-engineer caught it with a ten-line
invoice.

**The rule this produces.** Every amount is held and summed in integer minor units, and
formatted only at the edge. A floating-point number never holds an amount. Added as SR-13.

**Who must be briefed.** backend-engineer, frontend-engineer, code-analyst, qc-engineer.

**How to detect it next time.** Stack: TypeScript.
`git grep --untracked -nE '(parseFloat|Number)\((.*\.)?(amount|total|subtotal|balance)' -- 'src/*.ts' 'src/*.tsx'`.
Any line of output is a hit. Seen to fire at the run's base ref, on
`src/billing/totals.ts:2: rows.reduce((s, r) => s + parseFloat(r.amount), 0)`, and clean on
the fixed tree.
```

### Run two: the brief

`2026-10-14-invoice-reminders` sends reminders for overdue invoices and adds an amount-due
column to the invoice list. Every role is planned. The brief, in full:

````markdown
# Regression brief · 2026-10-14-invoice-reminders

Surfaces this run touches: billing/invoices, billing/reminders, api/invoices.
Planned: every role. Omitted: none.

## Standing rules that bind this run

| # | Rule | Binds in this run |
|---|---|---|
| SR-01 | Evidence is a file, never a claim | every planned agent |
| SR-02 | Timestamps come from the shell | every planned agent |
| SR-03 | One source for every definition, never two copies | tech-architect, orchestrator |
| SR-04 | A count is derived from the list it counts | every planned agent |
| SR-05 | A fix reaches everywhere the defect lives, and its detection is seen to fire first | every planned agent |
| SR-06 | A checker never repairs what it checks | orchestrator, bug-historian, the four reviewers, qc-lead |
| SR-07 | A handoff names its stage, and no pass overwrites another | every planned agent |
| SR-08 | A gate is recorded only by its owner, under a name the plan carries | every gate owner, orchestrator |
| SR-09 | A published command has been run | every planned agent |
| SR-10 | A spec is read at the moment it is cited | every planned agent |
| SR-11 | A reference image never sets a value | ux-designer, ux-auditor, frontend-engineer |
| SR-12 | A spec that contradicts itself goes to the Product Lead | every planned agent |
| SR-13 | Money never passes through a floating-point number | backend-engineer, frontend-engineer, code-analyst, qc-engineer |

## Prior defects on these surfaces

| Id | Status | What | Agent at fault | Matched on |
|---|---|---|---|---|
| BUG-0004 | closed | Invoice totals were a cent short on invoices with many small lines | backend-engineer | surface billing/invoices |
| BUG-0002 | closed | The overdue badge on the project list counted days in the viewer's time zone | frontend-engineer | class and shape: this run decides when an invoice is overdue |

Command 1, for BUG-0004. Any line of output is a hit.

```bash
git grep --untracked -nE '(parseFloat|Number)\((.*\.)?(amount|total|subtotal|balance)' -- 'src/*.ts' 'src/*.tsx'
```

Command 2, for BUG-0002. Any line of output is a hit.

```bash
git grep --untracked -nE 'new Date\(\)\.(getDate|getDay|setHours)\(' -- 'src/*.ts' 'src/*.tsx'
```

Both ran on the current tree before this brief was written: exit 1, clean.

## Live repeat patterns

None of the patterns in Repeat offenders touches these surfaces or these agents.

## Waiting findings this run will touch

| # | Finding | Files | Raised by |
|---|---|---|---|
| 3 | The amount on the invoice PDF puts the currency symbol before the number in every locale | src/billing/format.ts | qc-engineer |

It is promoted to a full entry at this run's record pass.

## Per agent

### tech-architect

SR-13 binds the contract: every amount in api/invoices and in the reminder payload travels in
integer minor units. SR-03: the reminder interval is defined in one place, and the ADR names
that place.

### backend-engineer

SR-13 binds you, and BUG-0004 was yours, on this surface. The reminder job sums what is due,
so it sums minor units. Run command 1 against your change before you hand off, and record the
result in your review.

### frontend-engineer

SR-13 binds you. The amount-due column formats minor units through the formatting module and
never parses an amount. BUG-0002 has the same shape as "overdue": decide it in the account's
time zone, as the contract carries it. Waiting finding 3 is in src/billing/format.ts, which you
will change. Run commands 1 and 2 before you hand off.

### code-analyst

Add commands 1 and 2 to your probe list, and run them exactly as written here. BUG-0004 got
past section 1, correctness, because no probe looked for an amount held as a floating-point
number.

### qc-engineer

The hole BUG-0004 exposed was fixtures priced in whole units. Test an invoice with ten lines of
0.10, and an invoice that falls due at 23:30 in an account east of UTC.

### ux-writer

Waiting finding 3: where the currency symbol sits is a rule per locale, and both the
amount-due header and the reminder email carry amounts.

Every other planned agent is bound by the rules in the table above, with nothing further in
this run.
````

### Run two: the guard fails

frontend-engineer hands off without running command 1. The four reviews pass, and the guard's
first round finds the defect in a file the run added.

```markdown
# Regression guard · 2026-10-14-invoice-reminders

## Round 1

Base ref: `main` at 4be1c07. In scope: the 9 files in backend-engineer/files.md and
frontend-engineer/files.md. Every detection ran over the whole tree.

### Entries

| Id | Result | Hits | Evidence |
|---|---|---|---|
| BUG-0004 | fired, exit 0 | `src/billing/reminder-summary.ts:12`, a file this run added, written by frontend-engineer | evidence/regression/BUG-0004.log |
| BUG-0002 | clean, exit 1 | none | evidence/regression/BUG-0002.log |

### Standing rules

| Rule | How it was checked | Result | Evidence |
|---|---|---|---|
| SR-01 | The utilisation check on this run: no `PHANTOM_OUTPUT` | held | evidence/regression/SR-01.log |
| SR-02 | The same run of the check: no `NO_TIMING` | held | evidence/regression/SR-01.log |
| SR-03 | `git grep --untracked -n 'REMINDER_INTERVAL_DAYS'`: one definition, two uses | held | evidence/regression/SR-03.log |
| SR-04 | The reminder states counted in the ADR and in the migration's enum: three in each | held | evidence/regression/SR-04.log |
| SR-05 | No fix in this run claims to close an entry, so there is no closure to trace; the record pass checks every closure | held | this row |
| SR-06 | The four reviewers' `produced` lists read: findings files only, no file under review | held | evidence/regression/SR-06.log |
| SR-07 | Every agent folder listed: each first handoff still present | held | evidence/regression/SR-07.log |
| SR-08 | The same run of the utilisation check: no `GATE_SELF_CERTIFIED`, no `UNKNOWN_GATE` | held | evidence/regression/SR-01.log |
| SR-09 | This run publishes no command in a skill, an agent file or the register, and both briefed detections ran at the brief | held | bug-historian/review.md |
| SR-10 | Every `PROJECT.md` and brand spec citation in the design spec and the ADR opened: each section exists and says what is cited | held | this row |
| SR-11 | The design spec searched for hex, pixel and duration values, and each hit read for a reference file name in the same row or sentence: none | held | evidence/regression/SR-11.log |
| SR-12 | The brand spec searched for "row height", the one token the spec relied on that two sections could govern: one section governs it | held | evidence/regression/SR-12.log |
| SR-13 | The BUG-0004 detection | broken | evidence/regression/BUG-0004.log |

### Waiting findings

| # | This run | Evidence |
|---|---|---|
| 3 | Not fixed: src/billing/format.ts still places the symbol first in every locale | evidence/regression/waiting-3.log |

### Verdict

Fail. BUG-0004 was repeated in a file this run added, which breaks SR-13, a rule the brief
addressed to frontend-engineer by name. It is the pattern's second occurrence, so it is a
repeat, and not yet an escalation. code-analyst's probe log shows the same detection reported
clean: it ran as plain `git grep`, which skipped the new, untracked file. Both go to the record
pass.
```

The handoff for that round:

```json
{
  "run": "2026-10-14-invoice-reminders",
  "agent": "bug-historian",
  "stage": 7,
  "status": "rejected",
  "started": "2026-10-15T10:02:11Z",
  "finished": "2026-10-15T10:31:40Z",
  "consumed": [
    "bug-historian/brief.md",
    "backend-engineer/files.md",
    "frontend-engineer/files.md"
  ],
  "produced": [
    "bug-historian/guard.md",
    "evidence/regression/"
  ],
  "gates": [
    { "name": "regression-guard", "result": "fail", "evidence": "bug-historian/guard.md" }
  ],
  "blockers": [
    {
      "what": "Round 1. BUG-0004 repeated at src/billing/reminder-summary.ts:12: const due = Number(invoice.total)",
      "why": "SR-13, from BUG-0004: every amount is held and summed in integer minor units, and no amount is parsed into a floating-point number. The brief addressed this rule and its detection to frontend-engineer by name.",
      "needs": "frontend-engineer"
    }
  ],
  "missing_inputs": [],
  "machinery_findings": [],
  "decisions_for_product_lead": [],
  "next": "orchestrator"
}
```

The orchestrator routes the fix to frontend-engineer, which writes
`handoff-stage5-round2.json`, and the reviews run again. The guard's second round sits above
the first in the same `guard.md`. Every row is run again, with its evidence named
`-round2`, and every row is clean. Its handoff, `handoff-stage7-round2.json`, passes
`regression-guard` with `next` set to `engineering-lead`.

### Run two: the record

After the release, the record pass writes two entries and promotes one waiting finding. The
repeat:

```markdown
### BUG-0009 · The amount-due column read invoice totals as floating-point numbers

| | |
|---|---|
| Status | closed |
| Raised by | bug-historian |
| Raised on | 2026-10-15 |
| Run | 2026-10-14-invoice-reminders |
| Surface | billing/invoices |
| Component | invoice list, amount-due column, `src/billing/reminder-summary.ts` |
| Agent at fault | frontend-engineer |
| Class | correctness |
| Severity | major |
| Evidence | `.devteam/runs/2026-10-14-invoice-reminders/evidence/regression/BUG-0004.log` |
| Fixed in | `frontend-engineer/handoff-stage5-round2.json` of 2026-10-14-invoice-reminders, closed 2026-10-16 |
| Repeat of | BUG-0004 |

**What happened.** The amount-due column read each invoice total with `Number(invoice.total)`
and summed the results. The guard's detection fired on it:
`src/billing/reminder-summary.ts:12:const due = Number(invoice.total)`.

**Why it got through.** The brief addressed SR-13 and the BUG-0004 detection to
frontend-engineer by name, and its review records no run of the detection, so the author's own
review let it through unchecked. It passed peer-reviewer, whose tests lens again accepted
fixtures priced in whole units, the hole BUG-0004 named. It passed code-analyst, whose probe
ran as plain `git grep` and skipped the new, untracked file (BUG-0010). code-steward and
security-analyst had no bearing on it. The guard caught it.

**The rule this produces.** SR-13, already standing. This is its second breach, and the
pattern is in Repeat offenders.

**Who must be briefed.** frontend-engineer, backend-engineer, code-analyst, qc-engineer.

**How to detect it next time.** The detection under BUG-0004, unchanged. It fired in round 1
of the guard, on the line above, and returned nothing in round 2, exit 1.
```

The agent mistake, recorded as a first-class entry with a rule of its own:

```markdown
### BUG-0010 · code-analyst reported a briefed detection clean after running a shorter form of it

| | |
|---|---|
| Status | closed |
| Raised by | bug-historian |
| Raised on | 2026-10-15 |
| Run | 2026-10-14-invoice-reminders |
| Surface | billing/invoices |
| Component | code-analyst's probe list, stage 6 |
| Agent at fault | code-analyst |
| Class | agent-behaviour |
| Severity | major |
| Evidence | `.devteam/runs/2026-10-14-invoice-reminders/evidence/code-analyst/probes.log` |
| Fixed in | `code-analyst/handoff-stage6-round2.json` of 2026-10-14-invoice-reminders, closed 2026-10-16 |
| Repeat of | none |

**What happened.** The brief published the BUG-0004 detection with `--untracked`.
code-analyst's probe log shows it ran `git grep -nE` with the same pattern and no
`--untracked`, reported the probe clean, and passed `review-defects`. The file carrying the
defect was new and untracked, so the search never read it.

**Why it got through.** Nothing compares the command in a reviewer's probe log with the
command the brief published. It passed code-analyst's own step 4, which checked that every
probe ran, and not that each ran as written. The guard caught it, by running the published form
and firing on the same file.

**The rule this produces.** A briefed detection is run exactly as published, and its log
starts with a line holding `$` and the command as run. SR-09 covers publishing a command, not
running one, so this is added as SR-14.

**Who must be briefed.** peer-reviewer, code-analyst, code-steward, security-analyst,
qc-engineer, qc-lead, bug-historian.

**How to detect it next time.** Stack: any.
`grep -rn --exclude-dir=regression '^\$ git grep' <run-dir>/evidence/ | grep -v -- '--untracked'`.
Any line of output is a `git grep` run without `--untracked`, to be read against the brief.
Seen to fire on round 1's `evidence/code-analyst/probes.log`, and to print nothing from round
2's `probes-round2.log`.
```

The record itself:

````markdown
# Record · 2026-10-14-invoice-reminders

## Sources read

| Source | Found |
|---|---|
| qc-engineer/defects.md | One defect, D-1 |
| qc-lead/readiness.md | No defect beyond D-1 |
| bug-historian/guard.md | One repeat and one altered probe in round 1; round 2 clean; waiting finding 3 not fixed |
| Every handoff | One rejection, the guard's round 1; no machinery findings; no missing inputs |
| orchestrator/review.md | No utilisation findings |
| ledger.md | One reject line; one decision line, in which the Product Lead kept waiting finding 3 out of scope |

## Candidates

| Source | Finding | Decision |
|---|---|---|
| guard.md, round 1 | BUG-0004 repeated in src/billing/reminder-summary.ts | New entry BUG-0009, repeat of BUG-0004 |
| guard.md, round 1 | code-analyst ran the BUG-0004 detection without `--untracked` | New entry BUG-0010, agent-behaviour |
| brief.md, waiting row 3 | The currency symbol placed first in every locale | Promoted to BUG-0011, open. This run worked the surface, and the ledger's decision line kept the fix out of scope. |
| qc-engineer/defects.md, D-1 | The test mail server refused connections for four minutes | Not recorded: an environment failure with no product cause |

## Entries added

BUG-0009, closed in this run. BUG-0010, closed in this run. BUG-0011, open.

## Entries closed

| Id | Fired on the unfixed state | Clean on the fixed state | Close log |
|---|---|---|---|
| BUG-0009 | Guard round 1: one hit, exit 0 | Guard round 2: exit 1 | evidence/regression/close-BUG-0009.log |
| BUG-0010 | Round 1's probes.log: one hit | Nothing from probes-round2.log | evidence/regression/close-BUG-0010.log |

## Rules added

SR-14 · A briefed detection runs exactly as published. From BUG-0010. Binds the four reviewers,
qc-engineer, qc-lead and bug-historian.

## Repeat offenders

New row: "An amount parsed or summed as a floating-point number", BUG-0004 and BUG-0009, SR-13,
watching.

## Escalations

None. The pattern is at its second occurrence.

## Open count check

```text
$ grep -c '^| Status | open |' BUGS.md
1

The rebuild and check command from team-bug-register, run from the project root:
| BUG-0011 | The invoice PDF puts the currency symbol before the amount in every locale | billing/invoices | frontend-engineer | |
open entries: 1, Open index rows: 1
exit: 0
```
````

### Run three: the escalation

In `2026-11-03-credit-notes`, the guard fires on the BUG-0004 detection again, in the credit
note total. That is BUG-0015, the pattern's third occurrence and SR-13's second breach after
it was briefed by name. The guard fails, the Repeat offenders row moves to `escalated`, and the
handoff reads `status: escalated` and `next: product-lead`, with this decision:

```json
{
  "question": "An amount parsed as a floating-point number has now happened three times, in BUG-0004, BUG-0009 and BUG-0015, and the last two came after SR-13 was briefed by name to the agent at fault. How should it be stopped?",
  "options": [
    "Mechanise SR-13: a money type that holds minor units, and a rule in the project's lint command that fails on parseFloat or Number over an amount. One run of work, after which the mistake fails the build.",
    "Add the BUG-0004 detection to the definition of done in frontend-engineer.md and backend-engineer.md. No product code, but it still depends on the check being run.",
    "Accept the risk and keep guarding. The guard caught the last two, at the cost of a fix round each."
  ],
  "recommendation": "Mechanise it. Two breaches after two briefs show that reading does not hold this rule, and a check the build runs does not depend on anyone remembering it."
}
```

When the Product Lead chooses, the orchestrator logs a `decision` line in `ledger.md`. At the
record pass, the Repeat offenders row moves to `decided`, and the SR-13 block quotes the choice
with its date and cites that ledger line.
