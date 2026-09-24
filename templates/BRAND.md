# Brand spec: TODO: product name

The source of truth for every interface, document and asset the product ships. Where a design
instinct, a reference image or a companion skill disagrees with this file, this file wins.
Every design role binds to it through `PROJECT.md § Brand`.

How to use this template. Copy it to the path `PROJECT.md § Brand` names (default `BRAND.md`)
and replace every `TODO:` with a decision. Keep every section: one that does not apply says
`none` and gives the reason. Inside a block, delete a token the product will not use rather
than leaving it as `TODO:`. Values live in the fenced blocks so a script can read them, and the
prose around them explains the rule. Every JSON block must stay valid JSON.

The ux-designer drafts this file when none exists, marks it `status: proposed`, and records
beside each value the design reference it came from. A proposed spec binds nothing. Only the
Product Lead sets `status: approved`, and the design gate cannot pass until they do.

```
status: TODO: proposed or approved
version: TODO: 1.0
date: TODO: yyyy-mm-dd
approved_by: TODO: the Product Lead named in PROJECT.md § Product Lead
companion_document: TODO: path to a human-facing brand guideline, or none
```

---

## 0. Identity

> Guidance: the names a reader sees, and the one sentence that says what the product does.

| Field | Value |
|---|---|
| Product name | TODO: |
| Parent brand | TODO: name, or none |
| Correct first mention | TODO: how the product is named the first time in any document |
| Tagline | TODO: one line, or none |
| What the product does | TODO: one sentence, in the product's own voice |
| Retired names and marks | TODO: anything that must never appear again, or none |

---

## 1. Design tokens

> Guidance: emit these to one token file (CSS custom properties or the stack's equivalent), and never hardcode a value in a component.

### 1.1 Colour: accent

> Guidance: one accent scale; say which step is the fill and which step is safe as text on a light ground.

```json
{
  "accent-50": "TODO: #RRGGBB",
  "accent-100": "TODO: #RRGGBB",
  "accent-200": "TODO: #RRGGBB",
  "accent-400": "TODO: #RRGGBB",
  "accent-500": "TODO: #RRGGBB",
  "accent-600": "TODO: #RRGGBB",
  "accent-700": "TODO: #RRGGBB",
  "accent-800": "TODO: #RRGGBB",
  "accent-900": "TODO: #RRGGBB"
}
```

| Rule | Value |
|---|---|
| Fill step | TODO: the step used for the primary action and the featured figure |
| Text step on a light ground | TODO: the lightest step that passes the text threshold in section 2 |
| Accent budget | TODO: the share of a view the accent may take, for example a neutral, ink and accent ratio |
| Reserved colours | TODO: any colour limited to one scope, such as a parent brand mark, and the only place it may appear, or none |

### 1.2 Colour: neutrals

> Guidance: the greys that carry pages, panels, text and hairlines; keep the scale short enough that each step has a job.

```json
{
  "neutral-0": "TODO: #RRGGBB",
  "neutral-50": "TODO: #RRGGBB",
  "neutral-100": "TODO: #RRGGBB",
  "neutral-150": "TODO: #RRGGBB",
  "neutral-300": "TODO: #RRGGBB",
  "neutral-500": "TODO: #RRGGBB",
  "neutral-700": "TODO: #RRGGBB",
  "neutral-900": "TODO: #RRGGBB",
  "neutral-950": "TODO: #RRGGBB"
}
```

### 1.3 Colour: status

> Guidance: rename these to the product's own states; a status colour never appears without its written label.

```json
{
  "status-neutral": "TODO: #RRGGBB",
  "status-info": "TODO: #RRGGBB",
  "status-success": "TODO: #RRGGBB",
  "status-warning": "TODO: #RRGGBB",
  "status-danger": "TODO: #RRGGBB"
}
```

| Token | Means | Written label | Never used for |
|---|---|---|---|
| `status-neutral` | TODO: | TODO: | TODO: |
| `status-info` | TODO: | TODO: | TODO: |
| `status-success` | TODO: | TODO: | TODO: |
| `status-warning` | TODO: | TODO: | TODO: |
| `status-danger` | TODO: | TODO: | TODO: |

### 1.4 Colour: roles by theme

> Guidance: components use these roles, never the primitives above; each value names a primitive token or a hex, and a theme the product does not ship is deleted.

```json
{
  "light": {
    "bg-page": "TODO: token",
    "bg-panel": "TODO: token",
    "bg-overlay": "TODO: token",
    "bg-featured": "TODO: token",
    "bg-hover": "TODO: token",
    "text-primary": "TODO: token",
    "text-secondary": "TODO: token",
    "text-muted": "TODO: token",
    "text-on-accent": "TODO: token",
    "text-on-featured": "TODO: token",
    "accent-fill": "TODO: token",
    "accent-text": "TODO: token",
    "border-hairline": "TODO: token",
    "border-strong": "TODO: token",
    "focus-ring": "TODO: token",
    "chart-primary": "TODO: token",
    "chart-comparison": "TODO: token",
    "chart-secondary": "TODO: token",
    "chart-grid": "TODO: token"
  },
  "dark": {
    "bg-page": "TODO: token",
    "bg-panel": "TODO: token",
    "bg-overlay": "TODO: token",
    "bg-featured": "TODO: token",
    "bg-hover": "TODO: token",
    "text-primary": "TODO: token",
    "text-secondary": "TODO: token",
    "text-muted": "TODO: token",
    "text-on-accent": "TODO: token",
    "text-on-featured": "TODO: token",
    "accent-fill": "TODO: token",
    "accent-text": "TODO: token",
    "border-hairline": "TODO: token",
    "border-strong": "TODO: token",
    "focus-ring": "TODO: token",
    "chart-primary": "TODO: token",
    "chart-comparison": "TODO: token",
    "chart-secondary": "TODO: token",
    "chart-grid": "TODO: token"
  }
}
```

| Rule | Value |
|---|---|
| How surfaces separate | TODO: for example, a panel lifts off the page by one tint step and a hairline separates repeated records |
| The featured surface | TODO: how the one featured surface per view is treated, in each theme |
| Dark theme | TODO: how dark differs from light beyond the values, for example no shadows and surfaces lifting by lightness |

### 1.5 Space

> Guidance: one short scale on one base unit; a value between two steps does not exist.

```json
{
  "base-unit": "TODO: px",
  "space": "TODO: array of px values, smallest first",
  "rhythm": {
    "inside-component": "TODO: a step from space",
    "between-components": "TODO: a step from space",
    "between-groups": "TODO: a step from space",
    "between-sections": "TODO: a step from space"
  },
  "padding-card": "TODO: a step from space",
  "padding-card-phone": "TODO: a step from space"
}
```

### 1.6 Radius

> Guidance: as few radii as the product can live with, and a written list of what may take each.

```json
{
  "radius-control": "TODO: px",
  "radius-card": "TODO: px",
  "radius-pill": "TODO: px",
  "radius-single-sided-border": "TODO: px, usually 0"
}
```

| Radius | May be used on | Never used on |
|---|---|---|
| `radius-control` | TODO: | TODO: |
| `radius-card` | TODO: | TODO: |
| `radius-pill` | TODO: | TODO: |

### 1.7 Elevation

> Guidance: say which surfaces may lift; everything else stays flat in the document flow.

```json
{
  "shadow-inflow": "TODO: none, or a value",
  "shadow-overlay": "TODO: value",
  "shadow-dark-theme": "TODO: none, or a value"
}
```

| Rule | Value |
|---|---|
| What may carry a shadow | TODO: for example, overlays only: menus, popovers, dialogs |

### 1.8 Layout and interaction

> Guidance: the sizes every screen shares, including the target size and focus treatment the accessibility standard depends on.

```json
{
  "breakpoints": "TODO: array of px values",
  "width-reading": "TODO: px",
  "width-data": "TODO: px",
  "measure-max": "TODO: characters per line",
  "control-height": "TODO: px",
  "control-height-touch": "TODO: px",
  "min-touch-target": "TODO: px, never below the floor set by the accessibility standard in PROJECT.md § Quality bar",
  "border-hairline": "TODO: width and role token",
  "border-strong": "TODO: width and role token",
  "focus-ring": "TODO: width and role token",
  "focus-offset": "TODO: px"
}
```

| Rule | Value |
|---|---|
| Density | TODO: for example, compact rows for lists a reader scans, open rows for text a reader reads, and one density per list |

---

## 2. Contrast

> Guidance: every pair measured with the node script in `team-brand-guard`, never estimated; any pair not in this table is measured and added before it is used.

The Required column holds the WCAG 2.2 AA thresholds: 4.5:1 for text, 3:1 for large text and
for non-text elements. Change them if `PROJECT.md § Quality bar` names another standard.

| Theme | Foreground | Background | Use | Required | Measured | Verdict |
|---|---|---|---|---|---|---|
| light | `text-primary` | `bg-page` | Body text on the page | 4.5:1 | TODO: | TODO: |
| light | `text-primary` | `bg-panel` | Body text on a panel | 4.5:1 | TODO: | TODO: |
| light | `text-secondary` | `bg-panel` | Secondary text | 4.5:1 | TODO: | TODO: |
| light | `text-muted` | `bg-panel` | Muted text that carries information | 4.5:1 | TODO: | TODO: |
| light | `accent-text` | `bg-panel` | Links and accent text | 4.5:1 | TODO: | TODO: |
| light | `text-on-accent` | `accent-fill` | Label on the primary action | 4.5:1 | TODO: | TODO: |
| light | `text-on-featured` | `bg-featured` | Text on the featured surface | 4.5:1 | TODO: | TODO: |
| light | `accent-fill` | `bg-panel` | Primary action edge, where the fill is its only boundary | 3:1 | TODO: | TODO: |
| light | `border-strong` | `bg-panel` | Input border | 3:1 | TODO: | TODO: |
| light | `focus-ring` | `bg-page` | Focus indicator | 3:1 | TODO: | TODO: |
| light | `status-neutral` | `bg-panel` | Status indicator | 3:1 | TODO: | TODO: |
| light | `status-info` | `bg-panel` | Status indicator | 3:1 | TODO: | TODO: |
| light | `status-success` | `bg-panel` | Status indicator | 3:1 | TODO: | TODO: |
| light | `status-warning` | `bg-panel` | Status indicator | 3:1 | TODO: | TODO: |
| light | `status-danger` | `bg-panel` | Status indicator | 3:1 | TODO: | TODO: |
| light | `chart-primary` | `bg-panel` | Chart series | 3:1 | TODO: | TODO: |
| light | `chart-comparison` | `bg-panel` | Chart series | 3:1 | TODO: | TODO: |
| light | `chart-secondary` | `bg-panel` | Chart series | 3:1 | TODO: | TODO: |
| dark | `text-primary` | `bg-page` | Body text on the page | 4.5:1 | TODO: | TODO: |
| dark | `text-primary` | `bg-panel` | Body text on a panel | 4.5:1 | TODO: | TODO: |
| dark | `text-secondary` | `bg-panel` | Secondary text | 4.5:1 | TODO: | TODO: |
| dark | `text-muted` | `bg-panel` | Muted text that carries information | 4.5:1 | TODO: | TODO: |
| dark | `accent-text` | `bg-panel` | Links and accent text | 4.5:1 | TODO: | TODO: |
| dark | `text-on-accent` | `accent-fill` | Label on the primary action | 4.5:1 | TODO: | TODO: |
| dark | `text-on-featured` | `bg-featured` | Text on the featured surface | 4.5:1 | TODO: | TODO: |
| dark | `accent-fill` | `bg-panel` | Primary action edge, where the fill is its only boundary | 3:1 | TODO: | TODO: |
| dark | `border-strong` | `bg-panel` | Input border | 3:1 | TODO: | TODO: |
| dark | `focus-ring` | `bg-page` | Focus indicator | 3:1 | TODO: | TODO: |
| dark | `status-neutral` | `bg-panel` | Status indicator | 3:1 | TODO: | TODO: |
| dark | `status-info` | `bg-panel` | Status indicator | 3:1 | TODO: | TODO: |
| dark | `status-success` | `bg-panel` | Status indicator | 3:1 | TODO: | TODO: |
| dark | `status-warning` | `bg-panel` | Status indicator | 3:1 | TODO: | TODO: |
| dark | `status-danger` | `bg-panel` | Status indicator | 3:1 | TODO: | TODO: |
| dark | `chart-primary` | `bg-panel` | Chart series | 3:1 | TODO: | TODO: |
| dark | `chart-comparison` | `bg-panel` | Chart series | 3:1 | TODO: | TODO: |
| dark | `chart-secondary` | `bg-panel` | Chart series | 3:1 | TODO: | TODO: |

### Known failures

> Guidance: the tempting pairs that fail, measured once and banned here so nobody measures them again.

| Theme | Foreground | Background | Measured | Why it is tempting |
|---|---|---|---|---|
| TODO: | TODO: | TODO: | TODO: | TODO: for example, white on a mid-tone accent reads darker than it measures |

---

## 3. Typography

> Guidance: the families, the scale and the rules; every text part in a design spec names one of these styles.

```json
{
  "family-heading": "TODO: family, then fallbacks",
  "family-body": "TODO: family, then fallbacks",
  "family-mono": "TODO: family, then fallbacks",
  "family-rtl": "TODO: family for right-to-left scripts, or none"
}
```

```json
{
  "display": { "family": "TODO:", "weight": "TODO:", "size": "TODO: px", "leading": "TODO: px", "tracking": "TODO: em" },
  "h1": { "family": "TODO:", "weight": "TODO:", "size": "TODO: px", "leading": "TODO: px", "tracking": "TODO: em" },
  "h2": { "family": "TODO:", "weight": "TODO:", "size": "TODO: px", "leading": "TODO: px", "tracking": "TODO: em" },
  "h3": { "family": "TODO:", "weight": "TODO:", "size": "TODO: px", "leading": "TODO: px", "tracking": "TODO: em" },
  "body": { "family": "TODO:", "weight": "TODO:", "size": "TODO: px", "leading": "TODO: px", "tracking": "TODO: em" },
  "small": { "family": "TODO:", "weight": "TODO:", "size": "TODO: px", "leading": "TODO: px", "tracking": "TODO: em" },
  "caption": { "family": "TODO:", "weight": "TODO:", "size": "TODO: px", "leading": "TODO: px", "tracking": "TODO: em" },
  "label": { "family": "TODO:", "weight": "TODO:", "size": "TODO: px", "leading": "TODO: px", "tracking": "TODO: em" },
  "metric": { "family": "TODO:", "weight": "TODO:", "size": "TODO: px", "leading": "TODO: px", "tracking": "TODO: em" }
}
```

| Rule | Value |
|---|---|
| Weights allowed | TODO: the list; every other weight is banned |
| Numbers | TODO: the face and features every number takes, for example the mono family with tabular figures |
| Case | TODO: for example, sentence case everywhere, including buttons |
| All caps | TODO: never, or the one style that may use it |
| Measure | TODO: maximum characters per line, held by the container, never by shrinking the type |
| Letterspacing | TODO: where tracking is allowed, and where it never is |
| Loading | TODO: where fonts load from, the formats, the subsets, and what renders if a font fails |

---

## 4. Motion

> Guidance: one curve and a few durations; the rules below decide what may move at all.

```json
{
  "easing": "TODO: one cubic-bezier",
  "motion-micro": "TODO: ms",
  "motion-panel": "TODO: ms",
  "motion-max": "TODO: ms, the ceiling nothing exceeds",
  "properties": "TODO: for example, transform and opacity only"
}
```

| Rule | Value |
|---|---|
| Trigger | TODO: for example, a reader action only; nothing animates on load |
| Reduced motion | TODO: what `prefers-reduced-motion` removes or replaces |
| Allowed exceptions | TODO: for example, a progress indicator, or none |
| Never | TODO: for example, spring, overshoot, stagger, parallax, a number counting up, a chart drawing itself, a shimmering placeholder |

---

## 5. The mark

> Guidance: the logo is a file, never a drawing; list where the files live and how they may and may not be used.

| Field | Value |
|---|---|
| Files | TODO: folder and naming pattern |
| Construction | TODO: a short description, or a link to the construction file |
| Clear space | TODO: |
| Minimum size | TODO: digital and print |
| Approved backgrounds | TODO: |
| Mirroring in right-to-left layouts | TODO: whether the mark mirrors, and whether the lockup order changes |
| Approved animation | TODO: one, or none |
| Misuse | TODO: for example rotate, outline, recolour, stretch, add effects, enclose, redraw |

---

## 6. Iconography

> Guidance: one icon set, one style, sizes from the space scale, and never an icon as the only carrier of meaning.

| Field | Value |
|---|---|
| Set | TODO: library name, or the folder of custom icons |
| Style | TODO: line or filled, and when the other is allowed |
| Stroke | TODO: px |
| Grid | TODO: px |
| Render sizes | TODO: steps from the space scale |
| Active state | TODO: |
| Mirroring | TODO: which icons mirror in right-to-left layouts; directional icons usually do, clocks and search usually do not |
| Meaning | TODO: for example, every icon that acts alone has an accessible name, and none is the sole carrier of meaning |

---

## 7. Components

> Guidance: the tokens and rules each shared component takes; the design system fills in anatomy, states and behaviour per surface.

| Component | Tokens | Rules |
|---|---|---|
| Primary button | TODO: | TODO: for example, one per view |
| Secondary button | TODO: | TODO: |
| Text button | TODO: | TODO: |
| Input | TODO: | TODO: for example, a persistent label above the field |
| Select | TODO: | TODO: |
| Checkbox and radio | TODO: | TODO: |
| Status indicator | TODO: | TODO: for example, colour plus written label, always |
| Panel and card | TODO: | TODO: for example, no card inside a card |
| List row | TODO: | TODO: |
| Table | TODO: | TODO: for example, numeric columns aligned to the inline end with tabular figures |
| Tab group | TODO: | TODO: |
| Empty state | TODO: | TODO: for example, one sentence and at most one action, with an illustration only where this row names one |
| Toast | TODO: | TODO: |
| Dialog | TODO: | TODO: |
| Navigation shell | TODO: | TODO: |

---

## 8. Charts and data

> Guidance: the chart palette comes from the roles in 1.4, and no chart adds a hue.

| Rule | Value |
|---|---|
| Series order | TODO: for example, `chart-primary`, then `chart-comparison`, then `chart-secondary` |
| Most series in one chart | TODO: |
| More categories than series colours | TODO: for example, split the chart, or neutrals plus the accent scale |
| Allowed forms | TODO: |
| Banned forms | TODO: for example, dual axes, truncated value axes, 3D |
| Labels and figures | TODO: the type style, usually the numeric treatment from section 3 |
| Context | TODO: for example, every rate carries its base and period |
| Grid | TODO: `chart-grid`, or none |

---

## 9. Voice and copy

> Guidance: how the product speaks, specific enough that a writer can tell a right sentence from a wrong one.

TODO: one paragraph on the register. Who the product sounds like, whether it uses the first
person, and what it never sounds like.

| Write this | Not this |
|---|---|
| TODO: | TODO: |
| TODO: | TODO: |
| TODO: | TODO: |

| Rule | Value |
|---|---|
| Case | TODO: |
| Punctuation | TODO: for example, no exclamation marks in system copy |
| Emoji | TODO: for example, never in product copy |
| First person | TODO: whether the product says "we" or "I", or never |
| Form of address | TODO: formal or informal "you", per locale in `PROJECT.md § Locales`, for example `fr` vous, `de` Sie |
| Banned words | TODO: the list |
| Banned in errors | TODO: for example, apologies, and anything that blames the reader |
| Numbers | TODO: for example, every number carries its unit, period and base |
| Dates in tables | TODO: format, never numeric-only |
| Dates in prose | TODO: format |
| Empty values | TODO: what an empty cell or field shows, for example `none` or `not set`, never a blank and never a zero that is not a real zero |
| Status labels | TODO: for example, every status has a written label, and the same status uses the same word everywhere |
| Idiom | TODO: for example, none in any locale |

---

## 10. Bans

> Guidance: what the product never looks like, written specifically enough to check by eye or by grep. This is the prohibited list the design roles and the auditor check every surface against.

```
BANNED:
  TODO: one line per banned aesthetic, font, pattern or treatment

REQUIRED INSTEAD:
  TODO: one line per treatment the product uses in their place
```

---

## 11. Right to left and scripts

> Guidance: fill this when `PROJECT.md § Locales` names a right-to-left locale or a script with its own setting rules; otherwise write `none`.

| Script or locale | Family | Size adjustment | Line height adjustment | Letterspacing | Digits | Punctuation |
|---|---|---|---|---|---|---|
| TODO: | TODO: | TODO: | TODO: | TODO: for example, never on connected scripts | TODO: | TODO: |

```
MIRRORS:
  TODO: for example layout and columns, directional icons, progress bars and sliders

DOES NOT MIRROR:
  TODO: for example the mark, non-directional icons, numerals, charts, media controls,
        phone numbers, code and identifiers
```

---

## 12. Changelog

> Guidance: every change to this file, with who approved it; a value changed without a row here is a defect.

| Version | Date | Change | Approved by |
|---|---|---|---|
| TODO: | TODO: | TODO: first approved version | TODO: |
