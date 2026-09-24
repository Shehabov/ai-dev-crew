# Plan · <agent> · <run-id>

Steps 1 and 2 of the loop. Write this before touching anything. Append the audit below the
plan rather than editing the plan in place, so the revision is visible. The protocol is in
`.claude/skills/team-protocol/SKILL.md`.

---

## 1. Plan

### Task, in one sentence

### Inputs I am working from

| Path or handoff | What I am taking from it |
|---|---|
| | |

### Facts from PROJECT.md

Cite the section, never restate its value here. A fact the section does not carry is a
blocker: hand off `blocked` with the section named in `missing_inputs`, and never guess.

| Section | What I need from it | Present? |
|---|---|---|
| `PROJECT.md § ` | | |

### Stack pack

The pack named in `PROJECT.md § Stack pack`, read by path at
`.claude/skills/<pack>/SKILL.md`, or `none`. Skip this if your role does not depend on the
stack.

### Tools this needs

Only what `PROJECT.md § Toolchain` says is present, and whether each answered when you
checked it. A tool that is missing is a blocker, never faked.

| Tool | Answered? | How checked |
|---|---|---|
| | | |

### Assumptions

| Assumption | Checked? | How |
|---|---|---|
| | | |

### Acceptance criteria

How I will know this is done, stated so someone else could verify it.

1.
2.

### Out of scope

Named so nobody mistakes it for an oversight.

-

### Rules that constrain this

Cite the file and section, not the value.

| Rule | Source |
|---|---|
| | brand spec at `PROJECT.md § Brand`, section |
| | `PROJECT.md § Product invariants`, I |
| | `BUGS.md`, SR- |

### Steps

1.
2.

---

## 2. Audit of the plan

Run before executing. Answer all five, in writing, even where the answer is "nothing".

### What is missing from the plan above

### What did I assume without checking

### Which rule could this break

The brand spec, the product invariants, the standing rules in `BUGS.md`, and the hard rules
in `CLAUDE.md`.

### What would the downstream agent reject

### What is the failure mode nobody has named yet

### Revisions made

| # | What changed | Why |
|---|---|---|
| 1 | | |

### Verdict

One of: sound, proceeding to execute · revised and re-audited · blocked, see handoff.
