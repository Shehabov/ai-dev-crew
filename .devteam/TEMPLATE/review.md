# Review · <agent> · <run-id>

Step 4 of the loop. Verify your own output before you hand it on. Fix what you find, or
name what you could not fix and carry it into the handoff as a blocker.

---

## Against my own acceptance criteria

From `plan.md` step 1.

| # | Criterion | Met | Evidence |
|---|---|---|---|
| 1 | | | |
| 2 | | | |

## Against the brand spec

The spec at the path in `PROJECT.md § Brand`. Skip only if this work touches nothing a user
sees or reads, and say so if you skip it.

| Check | Result |
|---|---|
| Every value traced to a token in the brand spec | |
| Contrast measured by script, both colour values recorded | |
| Colour is never the only carrier of meaning | |
| Every number in product copy carries its context: unit, period, sample | |
| Checked in the longest locale in `PROJECT.md § Locales`, not only the first | |

## Against my role's definition of done

From my agent file.

| Item | Result |
|---|---|
| | |

## Self-checks and sub-gates

Checks I ran on my own work that are not a gate I own. They belong here, never in the
handoff's `gates[]`, where any name that is not in `run.json` raises `UNKNOWN_GATE`.

| Check | Result | Evidence |
|---|---|---|
| | | |

## Overrides

Departures from a companion skill, a convention or a default. An override that is recorded
is a decision; an override that is quiet is drift.

| Departed from | What it advised | What I did | Why |
|---|---|---|---|
| | | | |

## What I could not fix

Carried into the handoff as blockers. An unfixed problem that is named is acceptable. An
unfixed problem that is quiet is a defect.

| What | Why not | Needs |
|---|---|---|
| | | |

## What I did not check

State the gaps. An unstated gap reads as coverage. A proof run only offline, and not against
the real environment named in `PROJECT.md § Stack`, is a gap and is named here.

-

---

## Verdict

One of: clean, handing off · blocked, see handoff · rejecting upstream, round <n>.
