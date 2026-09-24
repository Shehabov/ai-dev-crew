---
name: team-design-system
description: The method for turning the project's design references and brand spec into surfaces that hold at every width, in every locale and in every state. Use when designing, building or auditing any screen, component or flow, including the app shell, navigation, panels, lists, tables, charts, forms and empty states. Covers adopting, adapting or rejecting a reference pattern, shell anatomy, the featured-surface rule, density and rhythm, the five smoothness checks, the card and metric tile rules, the eight states and success feedback, responsive rules at the quality-bar widths, right to left, themes, motion discipline, the seven component headings and the evidence a surface needs before it leaves the designer.
---

# Design system

This skill is a method. The look belongs to the project, in two places named in
`PROJECT.md § Brand`: the brand spec, which sets every value, and the design references folder,
which sets structure. This skill turns the two into surfaces that hold up at every width, in
every locale and in every state, and that could not be mistaken for any other product.

| Decides | Source |
|---|---|
| Colour, type, space, radius, elevation, motion, voice | The brand spec |
| Anatomy, component structure, density, states, responsive behaviour | This skill, and the design references read through it |
| Craft: composition, hierarchy, component API shape | Companion skills, if installed. They lose to both rows above. |

Where this skill is silent, the designer decides and says in the spec that they did. Where it
implies a value, the brand spec supplies the value.

---

## Take the structure, hold the surface to the brand spec

References show anatomy, density, hierarchy, interaction and the overall feel of a product.
They never set a value. A colour, type size, radius or duration taken from a reference image
is a defect even when it looks right, because the reference belongs to another product with
its own palette and its own bans.

The one exception is a proposed brand draft, which the ux-designer writes when no approved
brand spec exists. It records the reference beside each value it took, and it binds nothing
until the Product Lead approves it.

### Reading the references folder

Each reference plays one of three parts.

| Part | Means |
|---|---|
| Primary | Sets anatomy and feel. Where references disagree, the primary wins, and any exception is written down with its reason. |
| Supporting | Contributes the patterns named in the table below, and nothing else. |
| Counter-example | Kept so it can be recognised and refused. It shows the convention the product exists to avoid. |

The Product Lead decides which reference is primary. If nobody has, the ux-designer proposes
one through `decisions_for_product_lead` with the reason, and works against the proposal until
the answer lands.

The verdicts live in a `README.md` inside the references folder, so every run reads the same
ones. The ux-designer drafts it the first time the references are used and the Product Lead
approves it. Each later change is a row added with its reason, never a row quietly edited.

### The adopt, adapt and reject table

```markdown
| Reference | Pattern | Verdict | In this product | Rule that decides it |
|---|---|---|---|---|
| ref-01-billing.png (primary) | Sidebar grouped under small section labels | Adopt | Groups flat, labels in the brand spec's label style | Brand spec, Typography |
| ref-01-billing.png | Two large metric panels in place of a tile row | Adopt | The featured panel carries the amount owed and its due date | The featured-surface rule, this skill |
| ref-02-dashboard.png | Card with a corner icon, a figure and a delta | Adapt | Figure, label and delta kept; the icon removed | Chrome is removed before it is styled |
| ref-02-dashboard.png | Row of six small metric tiles | Reject | Two or three large panels | The metric tile rules, this skill |
| ref-02-dashboard.png | Soft gradient behind the hero card | Reject | Flat fill | Brand spec, Bans |
| ref-03-grid.png (counter-example) | Every cell a tinted pill on a multi-hue ramp | Reject | Written values and one accent | Colour is never the only carrier of meaning |
```

| Verdict | Means | The row must say |
|---|---|---|
| Adopt | Taken as it is, with every value from the brand spec | Which brand tokens it takes |
| Adapt | The intent taken, the form changed | What changed, and why |
| Reject | Refused | The rule that refuses it |

Three rules hold for the table:

- No row adopts a colour, type size, radius or duration. Those come from the brand spec, so
  the table has no column for them, and a row that cites a reference as the reason for a value
  is a defect.
- A pattern that is not in the table is not adopted. Add the row before you borrow it.
- Every row names the rule that decides it: a brand spec section, a rule in this skill, a
  usability heuristic or an accessibility criterion.

### Patterns to expect to reject

References are usually commercial products shown at their most decorative. These patterns
appear in them often, and are rejected unless the brand spec allows them by name.

- Decorative gradients, glow, frosted panels and coloured shadows.
- A multi-hue colour ramp that encodes nothing a reader can decode.
- Tinted callout boxes, which spend the accent budget on a container.
- Three or more accent elements in one view.
- A row of four or more small metric tiles, the clearest sign of a generic dashboard.
- An icon in the corner of every card, repeating what its label already says.
- A greeting by name where the reader's work should be.
- Desktop-first density with no phone view behind it.

### The counter-example test

Put the main screen beside the counter-example. A stranger should be able to tell which product
does what, from what each screen does, whatever the palette. Where the folder has no
counter-example, use the most generic template in the product's category. If the stranger
cannot tell the two apart, that is the finding.

### The anti-generic check

Run this before any surface leaves the designer. Each yes is a finding.

- [ ] Is there a row of four or more small metric tiles?
- [ ] Is any region separated by a heavier treatment than it needs: a tinted ground where a
      hairline would do, or a hairline where space would do?
- [ ] Is anything bold that is not a heading?
- [ ] Is the featured figure smaller than the largest display style the brand spec defines?
- [ ] Does the view hold more elements than its cap?
- [ ] Does the content fill the viewport exactly, with no air after the last element?
- [ ] Is there a border anywhere that a tint step could have done?
- [ ] Does every card carry an icon in its corner?
- [ ] Could this screenshot be dropped into another product in the same category unnoticed?

The last question is the whole test. A screen that passes every brand rule and still fails it
has failed.

---

## Composition

### The featured-surface rule

One surface per view may be featured, with the treatment the brand spec's roles section
defines (often an inverted ground). It carries the one thing the reader came for. On a billing
page that is the amount owed and its due date. On a project it is the hours logged against
its budget. Everything else stays neutral.

- The featured surface and the primary action share one accent budget, so nothing else in the
  view reads as emphatic.
- Never two featured surfaces in one view.
- The spec names the featured surface for each view, or states in one line that there is none.

### Counting elements

The element cap is the strongest restraint in a calm interface, so it is counted rather than
felt. Set a cap per view in the spec by counting the primary reference. Where the references
give no guide, twelve is a sound starting cap for a working screen.

One element is: the top bar, each panel or card, a tab group, a navigation group, a chart, an
empty state, or a list of repeated rows however many rows it holds. A list of forty invoices is
one element. One over the cap is a finding.

### Emphasis comes from size

Weight belongs to headings. The featured figure takes the largest display style the brand spec
defines, at that style's own weight: a large figure at a regular weight reads as an instrument,
and a bolded one reads as a dashboard. Do not reach for a mid-size to soften the jump from the
figure to its label. The jump is the composition.

### Chrome is removed before it is styled

Before styling any element, delete: the border, the legend, the axis, the gridline, the
container, the icon that repeats its label, and the count nobody asked for. Style what
survives. A bare sparkline with two labels reads calmer than a styled chart because there is
less to read.

### Surfaces separate by lightness and space

Where the brand spec is silent, each job takes one treatment.

| Job | Treatment |
|---|---|
| Lift a panel off the page | One tint step, and space |
| Separate repeated records, such as table rows and list rows | A hairline |
| Mark a structural edge in the chrome, such as the sidebar edge or the split between navigation and settings | A hairline |
| Divide inside one surface, such as the rule under a panel header | A hairline |
| Lift an overlay: a menu, a popover, a dialog | The overlay shadow, or in a dark theme the border the brand spec gives it |

A hairline drawn around a panel to lift it is what makes an interface look assembled. Two
treatments for the same job inside one view is a finding.

### Row heights are composed

A row height is never picked. It is block padding from the space scale, plus the line box of
its type style, plus the same padding again. With a 24px line and 12px of padding a row is
48px, which may also meet the touch target, so the row needs no separate touch height. If the
height you want cannot be reached from scale steps, the padding is wrong.

### Density and rhythm

Four gaps, each a step on the brand spec's space scale, and taken from its rhythm block where
it has one: inside a component, between components, between groups, between sections. Name
the four in the design spec and repeat them down the page. An irregular gap reads as an error
even when the reader cannot say why.

Density follows the reader's task.

| The reader | Density |
|---|---|
| Scans many items to pick one, such as an invoice list | Dense. Compact rows, a hairline between them, no zebra striping. |
| Reads each item, such as a comment thread | Open. The text is the content, and rows grow with it. |
| Checks a few figures, such as a dashboard | Few large panels, generous padding, and air at the end of the screen. |

One density per list. A density toggle doubles every state to design and test, and the compact
mode usually produces a table too wide for a phone.

### The five smoothness checks

A calm interface comes from consistency. Run these five checks in order on every surface,
before the spec is written out. Each is a structural fact read off the spec, the markup or one
screenshot, so none is a judgement call.

| Check | The rule | The finding |
|---|---|---|
| Surface | Panels and repeated records separate differently, as Surfaces separate by lightness and space sets out | A panel lifted by a border, or rows separated by a tint |
| Scale | One type scale used across its full range, with the featured figure on the largest display style, as Emphasis comes from size sets out | A mid-size step between the featured figure and its label |
| Chrome | Delete before you style, as Chrome is removed before it is styled sets out | A legend, axis, gridline, container or repeated icon that was styled rather than removed |
| Motion | The brand spec's curve and durations, `transform` and `opacity` only, triggered by a reader action, as Motion discipline sets out | Anything that animates on load, or a curve, duration or property the brand spec does not define |
| Rhythm | The four gaps, named and repeated down the page, as Density and rhythm sets out | A gap varied to fill space, even when its value is on the scale |

Smoothness never comes from a gradient, a glow, a frosted panel, a longer transition, a larger
radius or more whitespace everywhere. A dense list is correct when the reader came to scan
forty items.

---

## Shell anatomy

```
+------------------+----------------------------------------------------+
| SIDEBAR          | TOP BAR                                            |
|                  | title, subtitle, search, actions, one primary      |
| account switch   +----------------------------------------------------+
| ---------------- | CANVAS                                             |
| PROJECTS         | capped at width-data for tables and dashboards,    |
|   Overview       | at width-reading for prose                         |
|   Invoices    4  |                                                    |
|   Reports        |  +-- featured panel ----+  +-- second panel ----+  |
|                  |  |                      |  |                    |  |
| ---------------- |  +----------------------+  +--------------------+  |
| Settings         |                                                    |
| Account          |  +-- list of repeated rows --------------------+   |
|                  |  |                                              |  |
+------------------+----------------------------------------------------+
```

| Region | Rules |
|---|---|
| Sidebar | Width from the brand spec's layout section. Quieter than the content: prefer the canvas ground with one hairline on its inline-end edge. Primary destinations grouped flat under section labels in the brand spec's label style, with no second tier. Settings and account sit apart from primary navigation, after a hairline and a large gap, so what the reader uses hourly never mixes with what they use twice a year. |
| Navigation item | Height composed from scale steps. The active item takes the hover or raised tint with the primary text colour, never an accent fill, because the accent budget belongs to the primary action. A count appears only where the number is actionable. |
| Top bar | Title, a one-line subtitle where it helps (the period the page covers), actions at the inline end, exactly one primary. It separates from the canvas with a hairline and never gains a shadow or a ground on scroll unless the brand spec says so. |
| Canvas | The page ground. Content capped at `width-data` for tables and dashboards and at `width-reading` for prose. Side margins step down with the breakpoints. Never full-bleed text at any width. |
| Account area | The foot of the sidebar, or the inline end of the top bar. Anything the brand spec reserves for a parent brand appears here and nowhere else. |

Where the sidebar no longer fits beside the data width, it becomes an icon rail, with an
accessible name on every icon and the label on hover and focus. At the phone width it becomes
the bottom bar or menu sheet in the table below.

### The phone translation

| Wide pattern | At the design baseline |
|---|---|
| Sidebar | A bottom bar of up to five destinations with labels always shown, or a menu sheet. Never icons alone. |
| Two or three panels | One column, the featured panel first |
| A two-column card grid | One column, the primary card first |
| A table with many columns | Rows showing the two columns that matter, with the rest on the detail view. Never a page that scrolls sideways. |
| A top bar with several actions | The title and the one primary action. The rest move into the view or an overflow menu, and none is deleted. |
| Search with a keyboard shortcut chip | A search icon. There is no keyboard, so the chip repeats nothing. |

The phone view is designed first, and every larger layout is written as a set of deltas from
it, never the reverse.

---

## Lists, tables and cards

### Rows and tables

- A list of objects takes rows. One object in detail takes a card. Forty invoices rendered as
  cards cannot be scanned.
- Numeric columns and dates align to the inline end, in the brand spec's numeric treatment with
  tabular figures, so a long column scans vertically.
- An empty cell shows the placeholder the brand spec names. Never blank, and never a zero that
  is not a real zero.
- Sort by default on a fact the reader acts on, such as a due date, in preference to a
  judgement, such as a priority someone assigned.
- A row that opens something is one target with no second control inside it. One list is
  either all interactive or all static, so the reader never has to test which rows open.
- Every object with an identifier shows it in the numeric treatment, in the same place on every
  card and row. Support conversations find things by it.

### The card rules

- A card holds one object in detail, or one panel's worth of related content.
- A card never contains another card. Group inside a card with a hairline and space.
- A card lifts off the page by one tint step and space, as a panel does. Never a hairline drawn
  around it, and never a shadow unless the brand spec gives cards one by name.
- No icon in the corner that repeats the card's label.
- A card that opens something is one target, with no second control inside it.

### The metric tile rules

A metric tile is a card that carries one figure: its label, the figure, and at most one
comparison, such as the change on the previous period with that period named.

- Two or three tiles in a row, never four or more. Where more figures matter, the featured
  panel carries the one the reader came for and the rest move to a table.
- A tile lifts by one tint step and space, like every card. A border or a shadow on a tile is a
  finding.
- The figure takes the numeric treatment, and its label carries its unit, its period and its
  base where it is a rate.
- The direction of a change is written, as in `up 12 percent on August`, never carried by the
  colour or the arrow alone.
- A sparkline on a tile is a second reading of the figure already stated, never the only one.

## Forms

- Every input has a persistent visible label above the field. A placeholder shows an example
  and is never the label.
- Helper text sits under the label and is tied to the field with `aria-describedby`.
- Validate on blur or on submit, never on each keystroke. The error sits beside its field, says
  what is wrong and what to do, and is tied to the field so assistive technology reads it.
- What the reader typed survives every error, every dropped connection and every reload the
  product can survive.
- Required and optional are marked in words, never by an asterisk alone.
- A full name is one field unless the brief needs its parts, and a person with a single name
  can complete every form.
- One primary action. A destructive action is never the primary, and an irreversible one sits
  behind a confirmation that states the consequence.
- Never ask for the same information twice in one flow.

## Charts

- The palette is the chart roles in the brand spec, in their order. No new hue.
- More categories than chart colours means splitting the chart or grouping the tail, never a
  multi-hue ramp.
- Every figure carries its context: its unit, its period, and its base where it is a rate.
- Axis labels and figures take the numeric treatment.
- Label series directly where the labels fit, in preference to a legend.
- Never a dual axis, a truncated value axis on a bar chart, 3D, or a chart that draws itself on
  load. Radial forms (pie, donut, gauge) only where the brand spec allows them, and never for
  more than three parts.
- Show the comparison even when it is unflattering.
- Write the conclusion in text beside the chart, so the chart is a second reading of a figure
  already stated. A decorative sparkline is `aria-hidden`, is not focusable, and carries only
  its first and last period labels.
- A gap in the data shows as a gap. It is never interpolated.
- Charts do not mirror in right-to-left layouts. Time runs the same way in every locale.

---

## The states

Every surface ships all eight. Each has its own layout, its own string slots and its own focus
order, never a spinner laid over the default. An uncovered state is a Major audit finding,
because the state will happen and somebody will meet it.

| State | Trigger | What it must do |
|---|---|---|
| Empty | Nothing in scope yet, or a filter matched nothing | Say which of the two it is. One sentence naming what will appear and what puts it there, then one action or none. It sits inside the panel it belongs to, at the height one row of content would take, so nothing jumps when data lands. Never an apology, never "nothing here yet", and an illustration only where the brand spec names one. |
| Loading | A request in flight | Reserve the final layout so nothing shifts on arrival, with placeholders at the real row height. A plain progress indicator, and no shimmer unless the brand spec allows it. Anything held on the device shows at once. |
| Partial | Some data arrived and some did not | Show what is known and mark what is pending or missing, so the reader can tell which without opening anything. Never interpolate a gap. |
| Error | A request failed, or a submit could not send | Say what failed and the next step, with the control beside the message where the action is possible from that screen. Keep everything the reader typed. No apology, and never blame the reader. |
| Offline | The connection dropped mid-read or mid-submit | Say what is held on the device and what happens on reconnect. Nothing the reader typed is lost. |
| Dense | The realistic worst case | Many rows, the longest locale, the longest names, the narrowest width. It stays readable, and every truncation is specified rather than accidental. |
| Restricted | The reader lacks permission for an item or an action | Reads as its own class before any label is read, and says who can act. Never styled as an error, and never a control that fails on tap. |
| Invariant | A rule in `PROJECT.md § Product invariants` changes what this reader may see or do | State the rule in plain words at the point it applies, without revealing anything the rule protects. An invoice in a closed period that can no longer be edited is the shape. |

### Success, for every action

The eight states describe a surface. Every action on the surface also specifies its success
feedback.

- A fact in the past tense naming what changed: `Invoice INV-2041 sent to Dana Okafor`.
- An undo where the action can be undone, shown long enough to use.
- Where focus lands afterwards.
- It is announced to assistive technology as a status message, without taking focus.
- It never congratulates, and it moves only as the brand spec's motion rules allow.
- An irreversible action gets a confirmation before it runs, because an undo after it is
  impossible.

---

## Components: the seven headings

Every component a spec introduces or changes is written out under seven headings. A missing
heading is a blocker, because the frontend-engineer would otherwise decide it in code where no
auditor sees it.

| Heading | Must state |
|---|---|
| Dimensions | Every size in scale values, including the touch size |
| Type | A brand spec style for every text part |
| States | Every state it can reach, each with its own treatment. "Same as default but greyed" is not a state. |
| Keyboard | Roles, keys and where focus sits. Or one line saying it is not interactive and how its meaning is written out instead. |
| Phone width | What changes at the design baseline, what is dropped, and what is never dropped |
| Themes | Every theme by role token, with any pair outside the brand spec's Contrast table measured |
| Right to left | What mirrors, what does not, and which runs stay left to right |

"As the design system says" is not an answer under any heading. Write the value for this
surface.

### A worked example: the segmented tab group

For switching one panel between two to four views of the same object, such as a project's
overview, invoices and members. Never for navigation, which is the sidebar's job.

Dimensions

| Part | Spec |
|---|---|
| Group | No container, no border, no ground. The tabs sit on the panel. |
| Tab | `control-height`, or `control-height-touch` on touch; `radius-pill` where the brand spec allows it on tab groups, otherwise `radius-control`; inline padding at the between-components gap |
| Gap | The inside-component gap between tabs |
| Count | The inside-component gap after the label, and only where the number is actionable |

Type

The body style in every state. Neither the size nor the weight changes on activation, because a
label that grows or thickens reflows the whole group. A count takes the numeric treatment.

States

| State | Treatment |
|---|---|
| Inactive | Transparent ground, `text-secondary` label |
| Active | `bg-hover` ground, `text-primary` label, weight unchanged. Never an accent fill: the accent budget belongs to the primary action. |
| Hover, inactive | The label moves to `text-primary`. Pointer only, so it does not exist on touch. |
| Hover, active | No change |
| Focus | `focus-ring` at `focus-offset` on the tab's own shape, never clipped by the group |
| Disabled | `text-muted` label and `aria-disabled`. Used only where the view cannot exist for this reader, never in place of a permission message. |

Keyboard

- `role="tablist"` on the group, `role="tab"` with `aria-selected` and `aria-controls` on each
  tab, `role="tabpanel"` with `aria-labelledby` on each panel.
- Roving tabindex. Tab enters the group once, on the active tab, and Tab again leaves it.
- Arrow keys move between tabs and wrap at both ends. The panel updates on focus where it
  renders without a wait, and on Enter or Space where it has to fetch.
- Home and End reach the first and last tab.

Phone width

Two or three tabs share the full content width equally, at the touch height. Four do not fit
with a readable label, so the group becomes a full-width select with its label above it, or the
fourth view moves to its own screen. Never a horizontally scrolling strip: the tabs off screen
are invisible, and the strip fights the page scroll under a thumb.

Themes

Every state is named by role token, and the brand spec resolves it per theme. Measure the active
ground against the panel in every theme. If it falls below 3:1, add a signal that is not colour
and that the brand spec allows, such as a hairline under the active tab, because the active
state must not rest on colour alone.

Right to left

The group mirrors: the first tab sits at the inline start, which renders on the right. Arrow
keys follow the visual order, so the left arrow moves to the next tab. A count stays left to
right inside an isolated run.

---

## Motion discipline

| Rule | |
|---|---|
| Curve | The brand spec's one curve, everywhere |
| Duration | The micro duration for a control, the panel duration for a panel or sheet, and nothing over `motion-max` |
| Properties | `transform` and `opacity` only, unless the brand spec allows another by name. Animating a layout property stutters on low-end devices. |
| Trigger | A reader action. Nothing animates itself in on load. A progress indicator is the usual exception, because it reports work rather than decorating an entrance. |
| Reduced motion | `prefers-reduced-motion` honoured on every transition: movement removed, a short opacity change at most |
| Never | A spring, an overshoot, a stagger, a parallax, a number counting up, a chart drawing itself or a shimmering placeholder, unless the brand spec allows one by name |
| Layout shift | Space is reserved before content arrives, so nothing moves under the reader's finger |

Every transition in a spec states its curve and duration by token, the property, and the reader
action that triggers it. Smoothness comes from the absence of jank. A view that animates as it
arrives feels slower than one that appears at once.

---

## Responsive rules

A surface that works at three widths and breaks at the fourth is unfinished, and "tablet later"
is a defect with a date on it.

The widths and the design baseline come from `PROJECT.md § Quality bar` (default widths 320,
360, 768, 1024, 1440, with 360 as the baseline). The breakpoints come from the brand spec's
layout section. Where the quality bar names other widths, the same roles apply to the nearest
one.

| Width | Represents | Must |
|---|---|---|
| 320px | The smallest phone still in use | Work, with nothing lost |
| 360px | The design baseline, by default | Be the width the surface was designed at |
| 390px to 430px | Current phones | Inherit from the baseline with no separate layout |
| 768px | Tablet portrait | A real layout, not a stretched phone |
| 1024px | Tablet landscape and small laptops | The shell's compact form, such as the icon rail |
| 1440px and above | Desktops and large monitors | Content capped at the data width, never full-bleed text |

1. Design at the baseline first. Every larger layout inherits from it, and a desktop layout
   squeezed down shows as a squeeze and is a finding.
2. No horizontal scroll on the page body at any width. A table, a diagram or a code block may
   scroll inside its own container, and nothing else may.
3. Test between the breakpoints as well as at them. Layouts break at 1023px and 769px far more
   often than at the round numbers, so drag the viewport.
4. Every target meets `min-touch-target` at every width, including a desktop with a
   touchscreen.
5. Both orientations, on phone and tablet. A landscape phone is a viewport about 360px tall.
6. 200% browser zoom counts as a width. At 200% a 1280px window is a 640px layout, and it must
   work.
7. Nothing is hidden to make it fit. Moving, stacking or sending a control to a detail view is
   a design decision. Deleting it at a breakpoint is data loss.
8. The longest locale at the narrowest width is the real test.
9. Right to left at every width, not only at desktop.
10. No device sniffing. Respond to the viewport and to capability, with media queries on width,
    pointer and hover, never to a user agent string.

---

## Right to left

This section applies when `PROJECT.md § Locales` names a right-to-left locale.

- Logical properties throughout: `margin-inline-start`, `padding-inline`, `inset-inline-end`,
  `border-inline-start`, `text-align: start`. A layout built this way mirrors with no second
  stylesheet. A physical property where a logical one exists is a finding.
- `lang` and `dir` set on the root element per locale, and `lang` on any inline run in another
  language.
- Mirrors: layout and reading order, columns, the sidebar (which moves to the inline end),
  directional icons (arrows, chevrons, back and forward, indentation), progress bars and
  sliders (which fill from the right), steppers and carousels. Arrow keys in a horizontal
  widget follow the visual order.
- Does not mirror: the mark unless the brand spec says so, non-directional icons (clock,
  search, calendar, lock), numerals, charts and their value axes, media controls, phone
  numbers, email addresses, code and identifiers. The brand spec's right-to-left section may
  add to this list.
- Left-to-right runs inside a right-to-left line, such as identifiers, phone numbers, Latin
  product names and code, are isolated with `dir="ltr"` and `unicode-bidi: isolate`, or with
  `<bdi>`. Without isolation they reorder unpredictably.
- Script settings come from the brand spec's right-to-left section: the family, the size and
  line height adjustments, no letterspacing on a connected script such as Arabic, no
  synthesised bold, and no justification by stretched letters.
- A rotation in the block axis, such as a chevron turning as a section opens, does not mirror.

## Themes

- Every theme the brand spec defines, on every surface. A colour that works in one theme only is
  not part of the system.
- A dark theme is designed, never computed by inverting the light one. Surfaces lift by moving
  lighter, because a shadow is invisible on a near-black ground.
- Every role pair is measured in every theme.
- `prefers-color-scheme` sets the default. A reader's explicit choice wins, and it persists per
  device.

---

## The evidence a surface needs

Everything goes under `.devteam/runs/<run-id>/evidence/` and is listed in the handoff's
`produced`.

| Evidence | Standard |
|---|---|
| Screenshots | Every width in `PROJECT.md § Quality bar`, every theme, every locale in `PROJECT.md § Locales` (or the pseudo-locale at plus 30 percent from `team-copy` before the strings exist), under `dir="rtl"` where a locale needs it, the longest locale at the narrowest width, one at 200% zoom and one phone in landscape. Taken with Playwright through `npx playwright` (`npx playwright install chromium` once), or with the capture tool `PROJECT.md § Toolchain` names. |
| Contrast | The node script from `team-brand-guard` and its output: every pair, every theme, both hex values and the ratio |
| Focus order | A numbered list per state, including the trap and the return for every dialog and sheet |
| Token trace | Every token the spec uses, its value, and the brand spec section it comes from |
| Reference verdicts | The adopt, adapt and reject rows the surface relies on |
| Checks | The five smoothness checks, the anti-generic check and the counter-example test, with the answer to each |

If no capture tool can run, the handoff is `blocked` with the error. Never describe a screenshot
you did not take. A spec with three screenshots at three widths has covered three widths.

---

## Pre-flight

Before any surface leaves the designer:

- [ ] The phone view was designed first, and every larger layout is written as deltas from it.
- [ ] Every value is a brand spec token, traced in the token list.
- [ ] Every borrowed pattern has an adopt or adapt row, and no row takes a value from a
      reference.
- [ ] Exactly one featured surface per view, or a line saying there is none.
- [ ] Exactly one primary action per view.
- [ ] The element count is at or under the cap.
- [ ] Panels lift by a tint step and space, and hairlines only separate records, mark a chrome
      edge or divide inside a surface.
- [ ] The featured figure takes the largest display style, with no mid-size softening the jump.
- [ ] Chrome was deleted before anything was styled.
- [ ] The four rhythm gaps are named and repeat down the page.
- [ ] No card inside a card, and no row of four or more metric tiles.
- [ ] The five smoothness checks pass: surface, scale, chrome, motion, rhythm.
- [ ] All eight states are specified per surface, and every action has its success feedback.
- [ ] Every component has all seven headings, written for this surface.
- [ ] Every transition states its curve, duration, property and trigger, and nothing animates on
      load.
- [ ] Every status has a written label, and no meaning rests on colour or an icon alone.
- [ ] Every number carries its numeric treatment and its context.
- [ ] Every width in the quality bar holds, with no horizontal page scroll and nothing hidden to
      fit.
- [ ] Right to left is specified per element where a locale needs it.
- [ ] Every theme is specified, and every pair is measured in every theme.
- [ ] The anti-generic check and the counter-example test pass.
- [ ] The evidence above exists, and every path is in the handoff.

Then hand off with `next` set to the ux-auditor. The orchestrator routes the spec to it, and the
string slot list reaches the ux-writer once the design gate passes. The auditor works this list
too, so a surface that fails here fails twice.
