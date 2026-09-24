---
name: team-brand-guard
description: Enforce the project's brand spec on any surface, string, component or asset. Use before designing, writing copy, building UI or reviewing anything a person will see, when a gate needs a brand check, and whenever a companion design skill's advice meets the brand spec. Covers what to do when the spec is missing or unapproved, the pre-flight checklist, the contrast script, the failures that happen most often with their fixes, the companion skill policy and how to record an override.
---

# Brand guard

The brand spec is the file at the path in `PROJECT.md § Brand` (default `BRAND.md`, started
from `templates/BRAND.md`). This skill covers what to check before anything ships, what goes
wrong most often, and how a companion design skill may contribute. It does not repeat the
spec.

Where any skill and the brand spec disagree, the brand spec wins. Record the override in
`.devteam/runs/<run-id>/<agent>/review.md`, in the format at the end of this file.

The section names below are the ones `templates/BRAND.md` uses. A brand spec written in
another shape is read for the same facts under whatever headings it has.

---

## First, is there a spec that binds

Open the brand spec before you plan. You will find one of three things.

| What you find | What it means |
|---|---|
| A filled spec with `status: approved` and no `TODO:` markers | It binds every value you use. |
| No spec, or the template with its `TODO:` markers in place | The ux-designer drafts one from the design references, marks it `status: proposed` and escalates it for approval. No other role fills it in. |
| A spec marked `status: proposed` | It was drafted and never approved. Work may proceed against it so it is ready when approval lands, but it binds nothing, and the design gate cannot pass on it. |

Only the ux-designer writes values into a draft. Every other role that needs a value from a
missing or unapproved spec says so in its handoff, as `missing_inputs` or a blocker, and never
supplies the value itself.

### A value the spec does not have

Never invent a colour, spacing value, radius, duration, curve or type size. If the value you
want is not in the spec, change the design until it uses one that is. The gap between two
steps on a scale is deliberate, and reaching into it is the drift that makes a product look
assembled.

A genuine gap, where the spec is silent on something every screen needs (a focus treatment, a
target size, a dark theme), goes to the Product Lead through `decisions_for_product_lead` with
a proposed value and the reason. While it is open, hold the floor the accessibility standard in
`PROJECT.md § Quality bar` sets, for example the WCAG 2.2 AA minimum target of 24 by 24 CSS
pixels, and record that you did.

---

## Pre-flight, before any surface ships

Work through every line. Each one ends as a yes or a finding, and nothing ships on a maybe.

### Colour

- [ ] Every colour is a role token from the spec's roles by theme section. No raw hex in a
      design spec, a component or a stylesheet outside the token file, even where the hex
      matches a token.
- [ ] The accent stays inside the budget the spec's accent section sets. If the accent is
      doing more than marking the one thing that matters, cut it back.
- [ ] One primary action per view. Two primaries means neither is.
- [ ] At most one featured surface per view, treated the way the spec says. The featured
      surface and the primary action share one accent budget, so nothing else in the view
      reads as emphatic.
- [ ] Every foreground and background pair is in the spec's Contrast table, or was measured
      with the script below before it was used, in every theme the spec defines.
- [ ] No pair from the spec's Known failures table appears anywhere.
- [ ] Accent as text uses the step the spec names as safe on that ground, never the fill step
      by default.
- [ ] A reserved colour appears only in the scope the spec reserves it for.
- [ ] Status and category never share one colour signal. A status carries a written label as
      well as its colour.
- [ ] No opacity applied to text. A lighter text colour is a text role whose contrast was
      measured.
- [ ] Every role renders in every theme the spec defines. A colour that works in one theme
      only is not part of the system.

### Type

- [ ] Every text part names a style from the spec's Typography section. No size, weight or
      leading outside it.
- [ ] No weight the spec does not list.
- [ ] Every number takes the numeric treatment the spec sets, and every numeric column uses
      tabular figures.
- [ ] The case rule holds everywhere, including buttons and headings.
- [ ] All caps appears only in the style the spec allows it in, or nowhere.
- [ ] The measure stays inside the spec's maximum. Constrain the container, never shrink the
      type.
- [ ] Fonts load the way the spec says, and the fallback it names is what renders when a font
      fails.

### Space, radius, elevation

- [ ] Every spacing value is a step on the spec's space scale. A value between two steps is a
      finding.
- [ ] Gaps follow the spec's rhythm: one value inside a component, one between components,
      one between groups, one between sections, repeated down the page.
- [ ] Every radius is a radius token, used only on what the spec's radius table allows.
- [ ] An element bordered on one side only takes the single-sided radius, which is usually 0.
- [ ] Only the surfaces the spec's Elevation section names carry a shadow. Everything in the
      document flow stays flat.
- [ ] Surfaces separate the way the spec's roles section says. Where it is silent, a panel
      lifts by a tint step and space, a hairline separates repeated records, and the two are
      never swapped.

### Motion

- [ ] Every transition uses the spec's one curve and its durations, and nothing exceeds
      `motion-max`.
- [ ] Only the properties the spec allows animate, usually `transform` and `opacity`.
- [ ] Every transition is triggered by a reader action. Nothing animates on load except the
      exceptions the spec names.
- [ ] `prefers-reduced-motion` is honoured on every transition, without exception.
- [ ] Nothing on the spec's Never list moves: typically a spring, an overshoot, a stagger, a
      parallax, a number counting up, a chart drawing itself or a shimmering placeholder.

### Copy

- [ ] The rules in the spec's Voice and copy section hold: case, punctuation, emoji, first
      person.
- [ ] No word from the spec's banned list, in any locale.
- [ ] Every number carries its context: its unit, its period, and its base where it is a rate.
- [ ] Every status carries a written label, the same word for the same status everywhere.
- [ ] Every string in every locale in `PROJECT.md § Locales` exists. `team-copy` holds the
      method.
- [ ] The competitor check: could another product publish this sentence unchanged? Then it
      carries no information. Rewrite it.

### Reality

- [ ] Designed at the phone width first, at the design baseline in `PROJECT.md § Quality bar`,
      with larger layouts inheriting from it.
- [ ] Every target meets `min-touch-target`, never below the floor of the accessibility
      standard, including targets inside tables and lists.
- [ ] Every state `team-design-system` names is covered.
- [ ] The layout holds at the longest locale, not the first-authored one.
- [ ] Where a locale is right to left, the layout mirrors from logical properties alone, with
      no second stylesheet.
- [ ] Nothing clips, overlaps or scrolls sideways at 200% browser zoom.
- [ ] Nothing on the spec's Bans list appears, and nothing decorative appears that the spec
      does not name.
- [ ] Every contrast ratio was computed from the spec's hex values in a node script, never
      estimated, with both hex values recorded beside the result.

---

## Computing contrast

Contrast is computed, never read by eye. A mid-tone accent routinely looks darker than it
measures, which is why the most common accessibility failure in a new brand is light text on
an accent fill.

Save this script to the run's evidence folder as `evidence/contrast-<surface>.mjs`, run it, and
save its output beside it as `evidence/contrast-<surface>.md`. It reads every JSON block in
the brand spec, resolves each role through the chosen theme to a hex value, and prints both hex
values with the WCAG ratio. It needs only node.

```js
// node contrast.mjs <brand-spec> <theme> <foreground> <background> [<foreground> <background> ...]
// Each colour is a role, a primitive token or a literal #RRGGBB.
import { readFileSync } from 'node:fs'

const [specPath, theme, ...pairs] = process.argv.slice(2)
const spec = readFileSync(specPath, 'utf8')
const tokens = {}
for (const [, body] of spec.matchAll(/```json\r?\n([\s\S]*?)```/g)) Object.assign(tokens, JSON.parse(body))
const roles = tokens[theme] ?? {}

function hex(name, depth = 0) {
  if (/^#[0-9a-f]{6}$/i.test(name)) return name.toUpperCase()
  const next = roles[name] ?? tokens[name]
  if (typeof next !== 'string' || depth > 5) throw new Error(`${name} does not resolve to a #RRGGBB value`)
  return hex(next, depth + 1)
}

function luminance(value) {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(value.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function ratio(a, b) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (high + 0.05) / (low + 0.05)
}

for (let i = 0; i < pairs.length; i += 2) {
  const [fg, bg] = [hex(pairs[i]), hex(pairs[i + 1])]
  // Truncate, never round: 4.499 must not print as a pass at 4.50.
  const value = Math.floor(ratio(fg, bg) * 100) / 100
  console.log(`${theme}  ${pairs[i]} ${fg}  on  ${pairs[i + 1]} ${bg}  ${value.toFixed(2)}:1`)
}
```

A sanity check before you trust it: `node contrast.mjs BRAND.md light '#000000' '#FFFFFF'`
prints `21.00:1`. A role that does not resolve stops the script with its name, which usually
means a `TODO:` is still in the spec.

Compare each result with the threshold in the spec's Contrast table. Text needs 4.5:1, and
large text and non-text elements need 3:1, under WCAG 2.2 AA, unless `PROJECT.md § Quality bar`
names another standard.

---

## The failures that actually happen

Ordered by how often they occur, with the fix beside each.

| Failure | Why it happens | Fix |
|---|---|---|
| Light text on a mid-tone accent fill | The accent reads darker than it measures, so it looks fine on the designer's screen | Measure it. Use the text-on-accent role the spec approved, which is usually dark text. |
| The accent fill step used as link or body text on a light ground | It is the brand colour, so it feels correct | The text step the spec's accent section names as safe on that ground |
| A second accent appears for a chart series or a badge | There are three categories and one accent, so someone reaches for a new hue | The spec's chart roles, in order. No new hue, ever. |
| A gap between two scale steps | The eye wants a value in between | Pick one of the two steps. The gap between them is the point of a short scale. |
| A hex typed straight into a component | It was faster than finding the token | The role token. A raw value is a finding even when it matches. |
| A value lifted from a reference image | The reference looked right | The brand spec token. References set structure, never values. |
| Numbers in the body face without tabular figures | The component was built before anyone read the type rules | The spec's numeric treatment, on every number |
| A percentage with no base | It reads cleaner | Add the base and the period: `38% paid on time (n=412 invoices, last 90 days)`. |
| Two primary buttons in one view | Both actions feel important | One primary, one secondary. If that feels wrong, the view has two jobs and should be split. |
| Rounded corners on a one-sided border | The component library rounds everything | The single-sided radius, usually 0 |
| A shadow separating two cards | Depth is a habit | A tint step and space. Only the surfaces the spec's Elevation section names lift. |
| A hairline drawn around a panel to lift it | Outlines are the default in most libraries | A tint step lifts. A hairline separates repeated records or divides inside one surface. |
| Title Case on a button | Most design systems do it | The spec's case rule, everywhere |
| An empty state that apologises | It feels polite | Say what will appear here and what puts it there. |
| A toast that congratulates | It feels friendly | A fact in the past tense, with an undo where the action can be undone |
| `margin-left` in a layout | Nobody was thinking about right-to-left locales | `margin-inline-start`. Logical properties throughout. |
| A status shown by colour alone | The colour seemed obvious | The written label beside it, always |

---

## Companion skills

Companion skills are third-party design and interface skills, described in `docs/SKILLS.md`
and used only if installed. They are never listed in an agent's `skills:` field.

- Take their craft: composition, hierarchy, spacing discipline, component API shape, and their
  review checklists.
- Many optimise for decoration, such as gradients, glow, heavy shadows, frosted panels and
  decorative motion. Take none of it unless the brand spec allows it by name.
- Where a companion disagrees with the brand spec, the brand spec wins. Where it disagrees with
  `team-design-system` on anatomy, density or states, the design system wins.
- A companion that is not installed changes nothing about the step. The team skills carry the
  rule, and you note the absence in `review.md`.
- If a companion's advice seems right for a task and it would break a brand rule, that is an
  escalation to the Product Lead, never a judgement call. Name the rule and why the task needs
  the exception.

---

## Recording an override

When you depart from a companion skill's advice, or from any default this team sets, write it
in your `review.md`:

```markdown
## Overrides

| Departed from | What it advised | What I did | Why |
|---|---|---|---|
| taste-skill | A layered shadow to lift the invoice card off the page | A tint step and the between-groups gap | Brand spec, Elevation: only overlays carry a shadow |
```

A recorded override is a decision. An unrecorded one is drift, and drift is what makes a
product look assembled rather than designed.
