---
name: team-ux-audit
description: Audit a design spec or a built interface against usability heuristics, the accessibility standard in PROJECT.md (default WCAG 2.2 AA), localisation and right to left, the bans in the project's brand spec and the team design system. Use when reviewing a spec before the design gate, auditing a built or shipped surface, checking an implementation against the spec it claims to follow, and when filing, grading or triaging UX findings. Covers the finding format, severities and their gate effect, the order of passes, each checklist, the state coverage matrix and the evidence every finding needs.
---

# UX audit

The auditor finds and proves. The designer fixes. Keeping those two jobs in separate agents is
the point: a designer grading their own work is blind to exactly the failures an audit exists to
catch.

A finding without evidence is an opinion, and it is not filed.

---

## Finding format

```markdown
### F-07 · Invoice list · Status carried by colour alone at 320px

| | |
|---|---|
| Reproduction | Invoice list, phone, 320px, light theme, first-authored locale, dense state |
| Rule | CLAUDE.md hard rule 5: colour is never the only carrier of meaning |
| Severity | Blocker |
| Evidence | `evidence/invoices-320-light-en-dense.png`, `evidence/invoices-320-light-en-dense-grey.png` |
| Owner | ux-designer |

What. Below 340px the written status label is dropped to make room for the amount column, and
only the coloured dot remains.

Why it hurts this reader. An account owner with red-green colour blindness, scanning thirty
invoices on a phone, cannot tell overdue from paid, which is the one thing this list exists to
show.
```

| Field | Rule |
|---|---|
| Heading | The finding number, the surface, and the defect in one line |
| Reproduction | Surface, width, theme, locale and state. A finding the designer cannot reproduce is rejected back, and rightly. |
| Rule | Where the rule lives, quoted: a brand spec section, a rule in `team-design-system`, a heuristic by name, an accessibility criterion by number and name, or a `CLAUDE.md` hard rule. Quote the rule itself, so the owner can act without opening the file. "Feels off" and "not smooth" are not rules. |
| Severity | One of the three below |
| Evidence | Paths under the run's `evidence/` folder |
| Owner | ux-designer for design, ux-writer for copy, frontend-engineer for a build that drifted from its spec, tech-architect for a data contract that makes a required state impossible |
| What | The defect, stated so it can be checked |
| Why it hurts this reader | The reader is a role from `PROJECT.md § Product`, in the conditions `PROJECT.md § Quality bar` describes |

No suggested fix. A proposed fix invites the owner to argue with your solution instead of your
evidence, and it hands the design back to you. State what is wrong, prove it and name the rule.

Findings are numbered from F-01 and keep their number across rounds. A fixed finding is marked
closed with the evidence that closed it, never deleted or renumbered.

## Severity

| Severity | Means | Gate effect |
|---|---|---|
| Blocker | Breaks a brand spec rule or ban, fails the accessibility standard, or makes a task impossible for a real reader on the devices in `PROJECT.md § Quality bar` | The design gate fails. No exceptions. |
| Major | Degrades the task materially, or fails in one locale, one theme, one width or one state. An uncovered state and a component missing one of its seven headings are both Major. | The design gate fails. Only the Product Lead can waive one, and the waiver is recorded. |
| Minor | An inconsistency or friction that does not block the task | Logged. It does not fail the gate, and it is fixed in this run if the fix is cheap. |

Do not inflate. An auditor who files everything as a Blocker gets ignored, and then the real
blockers ship.

---

## The order of passes

Mechanical work first, because a token violation usually explains the thing that looked wrong,
and a Blocker found there can end the audit early.

| Pass | Checks | Rules come from |
|---|---|---|
| A | Mechanical sweep, by grep and computation | The brand spec's tokens |
| B | The brand spec's bans | The brand spec, and the hard rules in `CLAUDE.md` |
| C | The design system | `team-design-system` |
| D | Usability heuristics | This skill |
| E | Accessibility | `PROJECT.md § Quality bar`, default WCAG 2.2 AA |
| F | Localisation and right to left | `PROJECT.md § Locales` and `team-copy` |
| G | Responsive | `PROJECT.md § Quality bar` and `team-design-system` |
| H | State coverage | `team-design-system` |
| I | The reality check | `PROJECT.md § Product` and `PROJECT.md § Quality bar` |

### Pass A: mechanical

Grep and compute. Nothing here is a judgement call.

```
raw colour     any hex, rgb() or hsl() outside the token file
spacing        any margin, padding or gap that is not a step on the space scale
radius         any radius that is not a radius token; any radius on a single-sided border
elevation      any shadow on an element the brand spec does not allow to lift
motion         any curve or duration outside the brand spec; any transition with no
               prefers-reduced-motion path; any animated layout property
type           any size, weight or leading outside the type scale; a number outside the
               numeric treatment; a numeric column without tabular figures
text opacity   opacity or an alpha colour used to lighten text in place of a text role
font loading   any font request the brand spec's loading rule forbids
direction      left and right physical properties where logical ones exist
literal copy   user-visible text in code that is not a key in the string catalogue
```

On a spec, before anything is built, the same sweep runs over the spec and its token list. Any
raw hex or pixel value in the spec that is not traced to a token is a finding.

### Pass B: the brand spec's bans

Build this checklist from the brand spec each run, by reading it, never from memory.

- [ ] Every line in the spec's Bans section.
- [ ] Every pair in the spec's Known failures table.
- [ ] Every rule in the spec's Voice and copy section: case, punctuation, emoji, first person,
      banned words.
- [ ] Every reserved colour, outside the scope it is reserved for.
- [ ] Every entry on the Never list in the spec's Motion section.
- [ ] Every misuse listed in the spec's section on the mark.

Breaking one is a Blocker by definition, because the rule is written in the spec rather than
left to taste.

These hold whatever the brand spec says, and each break is a Blocker. The first four come from
the hard rules in `CLAUDE.md`, the last from the pre-flight in `team-brand-guard`.

- [ ] Colour is the only carrier of a meaning.
- [ ] A number in product copy has no context: no unit, no period, or no base for a rate.
- [ ] A status has no written label.
- [ ] A design value is not in the brand spec.
- [ ] A view has more than one primary action.

### Pass C: the design system

From `team-design-system`. Quote the rule you file against. A break here is Major. Where the
same thing is also a brand ban, file it once, as a Blocker against the ban.

| Failure | Rule it breaks | How you prove it |
|---|---|---|
| Two featured surfaces in a view, or a featured surface and a third emphatic element beside the primary action | The featured-surface rule | Count the featured surfaces and the emphatic elements in one frame |
| More elements than the view's stated cap | Counting elements | List each element against the cap |
| A row of four or more metric tiles, or a tile lifted by a border or a shadow | The metric tile rules | Count the tiles in one row, and read the fill and border on each |
| A hairline lifting a panel off the page, or two treatments for one job in one view | Surfaces separate by lightness and space | Read the fill and border in the markup or the layer list |
| A card inside a card | The card rules | Read the DOM or the layer tree, never the screenshot. Nesting is a finding even when the inner card has no border. |
| A wide layout with no phone view behind it: a table that works only wide, columns that survive only as a sideways scroll, a top bar action with nowhere to go at the phone width | The phone translation | Ask for the phone artefact. If it does not exist, or the wide view cannot be traced back to it, that is the finding. |
| A chart hue outside the brand spec's chart roles | Charts | Count the distinct series colours |
| A component missing any of the seven headings | Components: the seven headings | Read the spec. File it against the component rather than the screen. |
| A value justified by a reference image | Take the structure, hold the surface to the brand spec | Read the spec for reference names beside values |
| A borrowed pattern with no adopt or adapt row | The adopt, adapt and reject table | Compare with the table in the references folder |
| A transition with no stated curve, duration, property or trigger | Motion discipline | Read the spec's motion lines |
| A panel outlined where a tint step belongs, a mid-size step under the featured figure, chrome styled rather than removed, anything animating on load, or a gap off the four-gap rhythm | The five smoothness checks | Walk the five in order: surface, scale, chrome, motion, rhythm, and name the check each failure breaks |
| The main screen cannot be told apart from the counter-example | The counter-example test | A side-by-side capture, saved as evidence |

### Pass D: usability heuristics

Cite the heuristic by name when you file against it.

| # | Heuristic | What to check |
|---|---|---|
| 1 | Visibility of system status | Can the reader tell what state an object is in, who has it and when it is due, without opening it? Is a slow action acknowledged within a second? |
| 2 | Match between the system and the real world | Does the interface use the reader's own words from `PROJECT.md § Product`? "Record" or "item" where the reader says "invoice" is a finding. |
| 3 | User control and freedom | Can every reversible action be undone? Does every irreversible one sit behind a confirmation that states the consequence? Is there a way out of every flow? |
| 4 | Consistency and standards | Does the same thing look and behave the same on every surface? Two patterns for one job is a finding. |
| 5 | Error prevention | Is the reader stopped before the mistake rather than told after it? Validation on blur, examples in placeholders, constraints in the control, no destructive action as the primary. |
| 6 | Recognition rather than recall | Are labels persistent? Can the reader see what a filter is doing right now? Does anything have to be remembered from one screen to the next? |
| 7 | Flexibility and efficiency of use | Can a frequent reader move through a long list quickly, by keyboard or in bulk, without losing their place? |
| 8 | Aesthetic and minimalist design | Is anything on screen that does not help this reader do this task? |
| 9 | Help users recognise, diagnose and recover from errors | Does every error say what happened and the next step, with the control beside it where the action is possible from that screen? |
| 10 | Help and documentation | Is the mechanism shown in place, at the moment it matters, rather than explained somewhere else? |

### Pass E: accessibility

The standard is the one `PROJECT.md § Quality bar` names, WCAG 2.2 AA by default. The criteria
below are the ones that fail most often on product interfaces. The standard is the full list,
and a criterion outside this table still counts.

| Criterion | Check | Proof |
|---|---|---|
| 1.1.1 Non-text content | Every meaningful image and icon has a text alternative. Decorative ones are hidden from assistive technology. | Accessibility tree |
| 1.3.1 Info and relationships | Headings, lists, tables and labels exist in the markup, not only in the styling | Accessibility tree |
| 1.3.4 Orientation | Works in portrait and landscape | Landscape capture |
| 1.4.1 Use of colour | No meaning rests on colour alone | A greyscale capture |
| 1.4.3 Contrast (minimum) | Text 4.5:1, large text 3:1 | Contrast script output |
| 1.4.4 Resize text | Text at 200% with no loss of content or function | Capture at 200% zoom |
| 1.4.10 Reflow | No scrolling in two dimensions at 320 CSS pixels wide | Capture at 320px |
| 1.4.11 Non-text contrast | Focus rings, input borders, status indicators and chart series reach 3:1 against what sits beside them | Contrast script output |
| 1.4.12 Text spacing | No loss when text spacing is increased | Capture with the text spacing style below injected |
| 1.4.13 Content on hover or focus | Tooltips and popovers can be dismissed, can be hovered, and stay until dismissed | Keyboard and pointer walk |
| 2.1.1 Keyboard | Every function works by keyboard | Keyboard walk |
| 2.1.2 No keyboard trap | Focus can always leave, and a dialog releases it on Escape | Keyboard walk |
| 2.2.1 Timing adjustable | No timeout without a warning and a way to extend it | Spec and build read |
| 2.3.1 Three flashes | Nothing flashes more than three times a second | Build read |
| 2.4.3 Focus order | Focus follows reading order in every state | Keyboard walk against the spec's focus order |
| 2.4.7 Focus visible | Focus is visible on every interactive element, never removed and never shown by colour alone | Captures of focused states |
| 2.4.11 Focus not obscured (minimum) | A focused element is never fully hidden behind a sticky header, footer or banner | Keyboard walk with captures |
| 2.5.3 Label in name | The accessible name contains the visible label | Accessibility tree |
| 2.5.7 Dragging movements | Every drag has a single-pointer alternative | Spec and build read |
| 2.5.8 Target size (minimum) | Targets at least 24 by 24 CSS pixels, or spaced to the same effect. The brand spec's `min-touch-target` usually sets a higher bar, and it binds. | Target measurements |
| 3.1.1 and 3.1.2 Language of page and of parts | `lang` set per locale, and inline runs in another language marked | Markup read |
| 3.2.6 Consistent help | Help sits in the same place on every page that has it | Captures across pages |
| 3.3.1 and 3.3.2 Error identification, labels or instructions | Every input has a persistent visible label, and every error names the field and the problem in text | Captures of error states |
| 3.3.7 Redundant entry | Nothing the reader already entered in the flow is asked for again | Flow walk |
| 3.3.8 Accessible authentication (minimum) | No memory or puzzle test to sign in, and paste works in password and code fields | Flow walk |
| 4.1.2 Name, role, value | Every custom control exposes its name, role and state | Accessibility tree |
| 4.1.3 Status messages | Success, error and progress messages are announced without moving focus | Accessibility tree and a screen reader pass |

Two more checks sit beside the standard. `prefers-reduced-motion` is honoured on every
transition, because the brand spec requires it. And the screen reader pass runs on whole flows,
never on one component in isolation.

The text spacing style for 1.4.12, injected with Playwright's `page.addStyleTag`:

```css
* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
p { margin-bottom: 2em !important; }
```

### Pass F: localisation and right to left

- [ ] Every string exists in every locale in `PROJECT.md § Locales`, and none falls back to the
      first-authored locale at run time.
- [ ] The layout holds at the longest locale, measured, never at the first-authored one.
- [ ] No string is built by joining a count to a fragment, and every count string carries the
      plural forms its locale needs.
- [ ] No sentence is assembled from fragments.
- [ ] Dates, numbers and currency follow each locale's format, and no date is numeric-only.
- [ ] Strings in every locale other than the first-authored one carry `needs native review`
      until a named native speaker clears them.
- [ ] A person with a single name can complete every form. Names, addresses and phone numbers
      accept the formats of every locale's region.
- [ ] No copy gives directions by side, such as "the button on the right".
- [ ] Where a locale is right to left, the layout mirrors from logical properties alone, with no
      second stylesheet.
- [ ] Directional icons mirror. Clocks, search, calendars and locks do not.
- [ ] Numerals, charts, identifiers, phone numbers, email addresses and code stay left to right,
      in isolated runs.
- [ ] No letterspacing on a connected script, no synthesised bold, and the size and line height
      adjustments the brand spec's right-to-left section sets.
- [ ] `lang` and `dir` are set on the root element for every locale.

### Pass G: responsive

Its own pass on every surface, never folded into the accessibility pass.

- [ ] Every width in `PROJECT.md § Quality bar` holds. The narrowest works with nothing lost.
- [ ] The design baseline is the width the surface was designed at, and larger layouts inherit
      from it.
- [ ] The tablet width is a real layout, not a stretched phone.
- [ ] The widest width caps content at the data width, never full-bleed text.
- [ ] Tested between the breakpoints as well as at them. Layouts break at 1023px and 769px far
      more often than at the round numbers.
- [ ] No horizontal scroll on the page body at any width. A table, diagram or code block may
      scroll inside its own container, and nothing else may.
- [ ] Every target meets `min-touch-target` at every width.
- [ ] Both orientations on phone and tablet.
- [ ] 200% zoom treated as a width.
- [ ] Nothing hidden to make it fit. Moved, stacked or sent to a detail view is a decision.
      Deleted at a breakpoint is data loss.
- [ ] The longest locale at the narrowest width.
- [ ] Right to left at every width, not only at desktop.
- [ ] No device sniffing. The layout responds to viewport and capability, never to a user agent
      string.

A spec with three screenshots at three widths has covered three widths, and the finding is the
missing evidence.

### Pass H: state coverage

Cover every state on every surface. An uncovered cell is a Major, because the state will
happen and somebody will meet it.

| State | Covered | What the evidence must show |
|---|---|---|
| Empty | | Which kind of empty it is, what will appear and what puts it there. No apology. |
| Loading | | The final layout reserved, placeholders at the real row height, no shimmer unless the brand spec allows it |
| Partial | | What is known and what is pending, told apart without opening anything |
| Error | | What failed and the next step, the reader's input kept, no apology and no blame |
| Offline | | What is held on the device and what happens on reconnect |
| Dense | | The realistic worst case: many rows, the longest locale, the longest names, the narrowest width |
| Restricted | | Its own class before any label is read, and who can act. Never styled as an error. |
| Invariant | | The rule stated at the point it applies, revealing nothing it protects |
| Success, per action | | A past-tense fact, an undo where possible, focus placed, announced as a status |
| Every theme | | Surfaces separate by lightness in a dark theme, and every pair measured |
| 200% zoom | | No clipping, no overlap, no sideways scroll |
| Right to left | | Mirrored from logical properties, with numerals, charts and identifiers unmirrored |
| Longest locale, narrowest width | | No truncation that the spec did not specify |

### Pass I: the reality check

This pass catches what a desk review misses. Read `PROJECT.md § Product` for who uses the
product and `PROJECT.md § Quality bar` for the devices, browsers and conditions, then ask:

- [ ] Was the phone view designed first, or squeezed from the desktop?
- [ ] On the slowest device and connection the quality bar names, does anything block on a
      request when it could show known data marked as stale?
- [ ] Does the surface survive a dropped connection and a reconnect without losing input?
- [ ] Where the reader is on a phone, is the primary action within reach of one thumb?
- [ ] Is it legible in bright light, or does anything rely on a low-contrast distinction?
- [ ] Is it safe on a shared device? Nothing that should persist per device persists per
      account, and nothing from the previous reader stays on screen after sign-out.
- [ ] Does it require anything `PROJECT.md § Product` says the reader may not have, such as a
      desktop, an installed app or a work email address?

---

## Evidence

Everything goes under `.devteam/runs/<run-id>/evidence/`, named
`<surface>-<width>-<theme>-<locale>-<state>.png` for captures, and every path is listed in the
handoff's `produced`.

| Check | How it is proved |
|---|---|
| Contrast | The node script from `team-brand-guard`, run for every pair in every theme, with its output saved: both hex values, the ratio and the theme. Never estimated. |
| Layout | Playwright captures through `npx playwright` (`npx playwright install chromium` once) at every width in the quality bar, every theme, every locale, under `dir="rtl"` where a locale needs it, the longest locale at the narrowest width, one at 200% zoom and one phone in landscape |
| Targets | Measured in CSS pixels from the rendered page, from each interactive element's bounding box in Playwright. Before anything is built, measured from the spec's dimensions. |
| Keyboard | A walk recorded as a numbered list of focus stops per state, compared with the spec's focus order |
| Accessibility tree | Playwright's ARIA snapshot (`locator.ariaSnapshot()`) of each state, plus a screen reader pass on whole flows where one is available |
| Colour alone | A capture with `filter: grayscale(1)` applied to the page |

A check that cannot run with the tools `PROJECT.md § Toolchain` lists is recorded as not run,
with the reason. The gate cannot pass on a check that did not run, and a capture you did not
take is never described.

---

## Running an audit

1. Read the design spec or open the built surface. Read the frontend brief and the ADR it
   cites, the regression brief at `bug-historian/brief.md`, and the `BUGS.md` entries it names
   for this surface.
2. Write the plan before opening a single screen: the surfaces, states and widths under audit,
   the rules in force, the evidence method for each check, the acceptance criteria and what is
   out of scope. Write it before you can be influenced by what you see.
3. Work passes A to I in order, capturing evidence as you go.
4. Write the findings to `.devteam/runs/<run-id>/ux-auditor/findings.md`, numbered and ordered
   by severity. Each later round adds a section headed with its round number, so the history
   survives.
5. Set the gate. The design gate passes only on an approved brand spec with no open Blocker or
   Major. A proposed brand spec fails it, whatever else is true. Record the result in your
   handoff's `gates[]`, since you own the gate.
6. Hand off. On a failure, the status is `rejected` and `next` is `orchestrator`, with one
   `blockers[]` entry per open Blocker or Major, `needs` set to the owner named in the finding
   (usually the ux-designer) and the round number in `what`. On a pass, set `next` to the
   ux-writer. The orchestrator dispatches either.

You do not fix, and you do not propose the fix. Choosing and applying the fix is the owner's job,
and doing either for them destroys the independence that makes the audit worth running.

Zero findings is an allowed result, but it shows its work: every checklist row marked, and the
evidence behind every pass. Zero findings with thin evidence is a defect in the audit.

An audit can reopen a shipped surface at any time. When the audit compares a build with its
spec, every difference is a finding against the frontend-engineer, citing the spec line and the
capture that shows the drift.

Three rounds is the limit. On the third loop with the same owner on the same finding, escalate
to the Product Lead through `decisions_for_product_lead`, with both positions stated plainly,
rather than filing a fourth round.
