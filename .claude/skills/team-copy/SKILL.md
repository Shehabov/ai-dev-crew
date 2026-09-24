---
name: team-copy
description: Write and review product copy in every locale named in PROJECT.md. Use for any string a person reads, including labels, buttons, errors, empty states, confirmations, status labels, notifications and help text, when reviewing existing copy, and when a locale is added. Covers the writing method and the competitor test, the order locales are written in and the native review rule, the string catalogue and its files, length budgets against the longest locale with pseudo-locale expansion and a length-check script, plural categories per locale, numbers, dates and currency with their context, status labels, error, empty and confirmation patterns, and right-to-left and mixed-direction text.
---

# Product copy

Good product copy reads like a colleague who has already read the file. It says what
happened and what the reader can do next, and it names things instead of reassuring anyone.

A reader deciding whether to trust an interface is assessing risk. Enthusiasm reads as a
sales pitch. Precision reads as a system that will behave predictably.

| Decides | Source |
|---|---|
| The voice: register, case, punctuation, first person, banned words | The brand spec's Voice and copy section, at the path in `PROJECT.md § Brand` |
| The locales, which one is authored first, which are right to left, and who reads each natively | `PROJECT.md § Locales` |
| The readers | `PROJECT.md § Product` |
| Script settings: families, size and line height adjustments, digits | The brand spec's Right to left and scripts section |
| The method, the catalogue, budgets, plurals, formats and message patterns | This skill |

Where this skill and the brand spec disagree, the brand spec wins. Where the brand spec is
missing or only proposed, `team-brand-guard` says what binds.

---

## The method

Write every string through four filters, in order.

### 1. It names something

The left column names a person, a number, a date or a mechanism. The right column names a
feeling or an intention.

| Write | Not |
|---|---|
| Maya Chen approved 12 hours on Northwind, 14 Mar 2026 | Time entries successfully updated |
| 3 of 8 invoices paid this month | Great progress this month |
| Exports run once a day, at 02:00 UTC. | Your export is on its way |
| Couldn't send the invoice. Check the email address and try again. | Oops, something went wrong |
| Only account owners can change billing details. Maya Chen owns this account. | You don't have access |
| Paid 02 Apr 2026, 12 days late | Completed |
| No time has been logged on this project since 3 Mar 2026. | Keep the momentum going |
| 38% paid on time (n=412 invoices, last 90 days) | Strong collections |
| A sent invoice can't be edited. Issue a credit note to correct it. | Editing is not available |

The examples in this skill show copy as a reader sees it, with values filled in. In the
catalogue, every live value in them, such as a name, a date, a count or an amount, is a
placeholder. The dates use a day, short month and year form, and the brand spec sets the real
one.

### 2. The competitor test

Could a competitor publish this sentence unchanged? Then it carries no information. Rewrite
it. This one test removes more weak copy than every other rule here combined.

"Manage your invoices with ease" survives in any billing product on the market, so it says
nothing. "Maya Chen can send March invoices once the period closes on 31 Mar 2026" survives
nowhere else, so it says something. The test runs in every locale, never only in the first.

### 3. Register by reader

Each reader comes from `PROJECT.md § Product`. Match the reader to a register, and use the same
register the ux-designer recorded for the slot in `string-slots.json`.

| Reader | How |
|---|---|
| Someone doing a task, often on a phone | The shortest sentences. Describe the mechanism, not the intention. |
| Someone who owns an outcome, such as an approver or a project lead | Lead with the action and the deadline. |
| Someone who runs the system, such as an administrator | Volume, trend, and where the load falls. |
| Someone deciding, such as an owner reading a dashboard | The number first, then what it means. |
| Anyone, in an error | What happened, then the next step. No apology. Never blame the reader. |
| Anyone, about permissions, data or security | Precise and unhurried. Never soften a limitation. |

### 4. Mechanics

The voice rules come from the brand spec's Voice and copy section. Read every row of it before
you write: case, punctuation, emoji, first person, banned words, banned in errors, numbers,
dates, status labels and idiom. Where a row is silent, the default below holds, and you record
in `review.md` that you applied it.

| Rule | Default when the brand spec is silent |
|---|---|
| Case | Sentence case everywhere, including buttons, headings, tabs and menu items |
| Punctuation | No exclamation marks in system copy. A full sentence ends with a full stop; a label, button or heading takes none. |
| Emoji | None, anywhere in the product |
| First person | None. The product has no "I" and no "we". |
| Errors | Never "oops", "sorry", "unfortunately", "something went wrong", "please try again later" or "an unexpected error occurred" |
| Buttons | A verb and its object, saying what will happen: `Export invoices`, never `OK`, `Submit` or `Continue` |
| Numbers | Before adjectives: `6 days overdue`, not `significantly overdue` |
| People and dates | Named wherever the product has them |
| Directions | Never by side or by colour. Not "the button on the right", not "the green button". Name the control. |
| Idiom | None, in any locale |

Nothing from the brand spec's banned list appears in any locale. A banned word rendered in
another language is still banned.

---

## Every locale, in the same run

Every feature ships in every locale in `PROJECT.md § Locales`. There is no single-locale
release and no locale backlog.

| Order | |
|---|---|
| 1 | The first-authored locale, the one `PROJECT.md § Locales` names, is written first. It is the language the brief and the acceptance criteria are written in, so it is the one that gets argued over. |
| 2 | Every other locale is written immediately after, for the same keys, from the same brief, in the same run. Never in the next run. |
| 3 | No locale is done until every locale is. A catalogue with one column filled and another empty fails the copy gate. |

### Written from the brief

Each locale is written from the brief, never translated from the finished first-authored
string. A literal rendering of a soft sentence produces a soft sentence in a second language,
and then there are two weak strings. The method above applies identically in every locale.

Some decisions are made once per locale and held across every string:

| Decision | Rule |
|---|---|
| Form of address | Many locales choose between a formal and an informal "you": French vous or tu, German Sie or du, Spanish usted or tú. It is a voice decision, so it comes from the brand spec. Where the spec is silent, propose one through `decisions_for_product_lead`, and hold it across every string until it is settled. Mixed forms make one product read as two. |
| Regional variety | Where a language has regional varieties, such as European and Latin American Spanish, the locale code in `PROJECT.md § Locales` names the one written. For Arabic, Modern Standard Arabic, unless that section names a regional variety. |
| Grammatical gender | Arabic, French, Spanish and Hebrew mark gender in words that address the reader. Where the product does not know the reader's grammatical gender, write a construction that does not mark it, such as a noun phrase in place of a verb addressed to the reader. The Arabic button label `تصدير الفواتير` ("export of the invoices") is a verbal noun for this reason. Never default to the masculine. |

### The native review rule

Every string in a locale other than the first-authored one carries `needs native review` until
a named native speaker has read it on a physical device, at the real size, in the real layout.
The first-authored locale carries the mark only when `PROJECT.md § Locales` says it has no
native reader.

- The review is recorded per locale, with the reader's name, the device and the date.
- The writer never clears the mark on their own authority. The copy gate may pass with the mark
  in place, and the mark stays visible to the qc-lead. Shipping with it is the Product Lead's
  decision, never the writer's.
- Editing a reviewed string resets it to `needs native review`. A review covers the words that
  were read.
- The reading happens on the device because that is where a native reader catches what a file
  hides: an awkward line break, a clipped mark, a number reordered beside a name.

### What this binds

| Role | |
|---|---|
| tech-architect | A brief that names a screen names every locale in its acceptance criteria |
| ux-designer | Every slot is budgeted on the longest locale, or on the pseudo-locale while strings do not exist, and specified in right to left where a locale needs it |
| ux-writer | Every locale column is filled before the copy gate is set |
| backend-engineer | Returns keys and raw values, never sentences: a `message_key` for every error, a `<field>_label_key` beside every enum, dates in ISO 8601 UTC, amounts in minor units with their currency, rates beside their base |
| frontend-engineer | Every locale's catalogue resolves. A missing key is a build failure, never a run-time fallback to the first-authored locale. Plurals go through the catalogue's plural handling, and numbers and dates through one shared formatter. |
| qc-engineer | Every flow is tested in every locale, including right to left at every width |
| qc-lead | A release with one locale complete and another partial is a no-go |

A feature that reaches production missing a locale is a defect of class `locale`, recorded in
`BUGS.md` like any other.

---

## The string catalogue

No string exists in the product that is not a row in the catalogue. The ux-writer agent
defines every field of a row. This section fixes the files and their shape.

| File | What it holds |
|---|---|
| `.devteam/runs/<run-id>/ux-writer/strings.md` | The catalogue, the source of truth for the run. One row per key, one column per locale. |
| `.devteam/runs/<run-id>/ux-writer/strings-<locale>.json` | One file per locale in `PROJECT.md § Locales`, holding only the strings. These are the paths the run plan tracks and the frontend-engineer wires, so their names never vary. |
| `.devteam/runs/<run-id>/ux-writer/length-budget.md` | The measured length of every slot in every locale |
| `content/strings/<locale>.json` | The shipped resource: the same rows, in the same shape, unless the stack pack names another home. Written once the app that reads it exists. Until then the run files are the record. |

Run paths sit under `DEVTEAM_RUNS_DIR` where that is set.

### strings.md

The columns, in this order: `key`, one column per locale in the order `PROJECT.md § Locales`
gives with the first-authored locale first, `reader`, `context`, `max_chars`,
`longest_locale`, `plural_forms`, `ltr_runs`, `screenshot` and `review`. With English, French
and Arabic as the locales:

| key | en | fr | ar | reader | context | max_chars | longest_locale | plural_forms | ltr_runs | screenshot | review |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `billing.export.button` | Export invoices | Exporter les factures | تصدير الفواتير | account owner | Primary button on the billing page. Exports one calendar month of invoices as CSV. | 24 | fr, 21 | n/a | none | pending build | fr: needs native review; ar: needs native review |
| `invoice.sent.toast` | Invoice {invoice_number} sent to {name} | Facture {invoice_number} envoyée à {name} | أُرسلت الفاتورة {invoice_number} إلى {name} | account owner | Toast after an invoice is sent. The number and the recipient are live. | 48 | ar, 37 | n/a | `{invoice_number}`; `{name}`, direction from its content | pending build | fr: needs native review; ar: needs native review |

A cell is never empty and never a stand-in, such as `TBD` or the first-authored string copied
across. The one cell that holds no string is a plural category a locale does not have, which
reads `n/a: no <category> category in <locale>`. That is a decision, not a gap.

### Keys

- Dot-namespaced by surface: `billing.export.button`, `invoice.list.empty.title`. A surface key
  is never reused on another surface, so rewording one never silently changes another.
- Two families are set by the API contract instead: `error.<code>`, which the API returns as
  `message_key`, and `<entity>.status.<state>`, which it returns as `status_label_key`
  (`team-architecture` defines both). Every surface that shows that error or that status uses
  the same key, so a state never carries two words.
- A count key takes its plural category as the last segment: `invoice.overdue.count.one`. The
  slot in `string-slots.json` names the base key, `invoice.overdue.count`.
- A key describes meaning, never wording: `invoice.send.button`, not
  `invoice.send_now_label`. Rewording a string never renames its key.

### Placeholders

- Named for what they hold: `{name}`, `{invoice_number}`, `{due_date}`, and `{n}` for a count.
  Never positional, such as `%s` or `{0}`, because word order differs between locales and a
  writer cannot move what they cannot name.
- Every placeholder in the first-authored string appears in every locale's string, spelled the
  same.
- A placeholder receives a formatted value: a date from the date formatter, an amount from the
  currency formatter. Never a raw ISO string or a floating-point number.
- A placeholder never carries a word or a phrase. `{status} since {date}`, with the status word
  injected, breaks gender and case agreement in many locales. Write the full sentence for each
  status.
- Markup stays out of strings. Where a link must sit inside a sentence, use a named tag the
  localisation library supports, such as `<link>Read the billing guide</link>`, and never split
  the sentence around it.

### strings-<locale>.json

One object per locale. A key maps to its string. A count key maps to an object holding only the
categories that locale uses, plus any exact-value variant.

```json
{
  "billing.export.button": "Export invoices",
  "invoice.overdue.count": {
    "one": "{n} invoice is overdue",
    "other": "{n} invoices are overdue"
  }
}
```

```json
{
  "billing.export.button": "تصدير الفواتير",
  "invoice.overdue.count": {
    "zero": "لا توجد فواتير متأخرة",
    "one": "فاتورة واحدة متأخرة",
    "two": "فاتورتان متأخرتان",
    "few": "{n} فواتير متأخرة",
    "many": "{n} فاتورة متأخرة",
    "other": "{n} فاتورة متأخرة"
  }
}
```

Review marks, budgets and context stay in `strings.md`. Where the frontend's localisation
library needs another shape, such as ICU message syntax, the frontend-engineer converts from
these files in a build step, and these files remain the source.

---

## Length budgets

Give the ux-designer the longest variant, never the first-authored one. A component laid out
for the first-authored string breaks in the first locale that runs longer, and it breaks at the
narrowest width, where nobody on the team was looking.

### Measure, then record

- The ux-designer sets `max_chars` for each slot in `string-slots.json`. The ux-writer measures
  every locale against it and records the widest in `longest_locale`, with its count.
- Count what a reader sees: grapheme clusters, never bytes or code units. A letter with a
  combining accent is one character. JavaScript's `.length` counts UTF-16 code units and
  overcounts some scripts, so the script below uses `Intl.Segmenter`.
- A string over budget is never truncated. Rewrite it shorter in that locale, or send the slot
  back to the ux-designer with the measured length. An ellipsis is a design decision the spec
  makes for a named slot, never a fix the writer applies.

### How locales tend to run

A starting point before anything is written, replaced by measurement as soon as strings exist.

| Locale | Against English | What to watch |
|---|---|---|
| German | Longer, and often the longest Latin-script locale | Compound nouns have no break point, so one word can overflow a narrow slot |
| French | Longer | French punctuation puts a space before a colon, a semicolon and a question mark. The string carries it as a no-break space, so the mark never wraps onto a line of its own. |
| Spanish, Italian, Portuguese | Longer | Longer articles and prepositions in short labels |
| Russian, Polish | Longer | Long inflected words that do not break |
| Arabic, Hebrew | Often fewer characters | Taller on the line, see below |
| Chinese, Japanese, Korean | Far fewer characters | Each character is about twice the width of a Latin letter |

The shorter the string, the larger the proportional growth. A label under ten characters can
double or triple, while a long sentence grows by about a third. So a short slot, such as a
button, a tab or a status label, is laid out to wrap to a second line or to grow, never to clip
at exactly the budget.

### Wide, tall and unspaced scripts

A character count is a Latin-script measure. Other scripts need more than one number.

- Chinese, Japanese and Korean characters count as two against `max_chars`, because each is
  about twice the width of a Latin letter. The script below does this.
- Arabic often needs fewer characters than English but more height. Its connected letterforms,
  its marks above and below the line, and the size and line height adjustments in the brand
  spec's Right to left and scripts section all make a line taller. Budget lines as well as
  characters, and never fix the height of a text container.
- Scripts with marks stacked above and below the letters, such as Thai, Vietnamese and
  Devanagari, clip inside a fixed height or a tight line height. Budget height as well as width.
- Scripts written without spaces between words, such as Chinese, Japanese and Thai, break lines
  by rules the browser applies. Never type a line break or a space into a string to force one.
- A shorter string in one locale never makes the slot shorter. The budget is set by the longest
  locale, whichever it is.

### Before the strings exist: the pseudo-locale

A **pseudo-locale** is a generated stand-in, built from the first-authored strings or from the
ux-designer's draft labels, that tests a layout before the real locales are written. It is
never shipped and never counts as a locale for the copy gate. The team's pseudo-locale:

- Expands every string by 30 percent, padding it to 130 percent of its length, rounded up.
  This is the figure the ux-designer budgets with and the ux-auditor tests against until the
  real strings exist.
- Replaces letters with accented forms, so a missing glyph or a font fallback shows at a
  glance, and a hard-coded string, which stays plain, stands out.
- Wraps each string in brackets, so truncation (a missing closing bracket) and concatenation
  (brackets in the middle of a line) show at a glance.
- Is rendered under `dir="rtl"` on the root element when a locale is right to left, so the
  mirrored layout is tested before a word of that locale exists.

`Export invoices` becomes `[Éxpørţ ïñvøïçéš·····]`. The codes `en-XA` (accented and expanded)
and `ar-XB` (right to left) are a common convention for pseudo-locales, taken from Android.

Save this script to the run's evidence folder as `evidence/pseudo.mjs` and run it over a strings
file. It needs only node.

```js
// node pseudo.mjs <strings-file> > strings-pseudo.json
// Builds the pseudo-locale from a strings file: accented, expanded by 30 percent, bracketed.
import { readFileSync } from 'node:fs'

const EXPANSION = 0.3
const ACCENTED = { a: 'á', c: 'ç', e: 'é', i: 'ï', n: 'ñ', o: 'ø', s: 'š', t: 'ţ', u: 'ü', y: 'ý' }
const PLACEHOLDER = /(\{[^{}]+\})/

function accent(text) {
  return text.replace(/[a-z]/gi, (letter) => {
    const mark = ACCENTED[letter.toLowerCase()]
    if (!mark) return letter
    return letter === letter.toLowerCase() ? mark : mark.toUpperCase()
  })
}

// Placeholders pass through untouched, so the app can still fill them.
function pseudo(text) {
  const parts = text.split(PLACEHOLDER)
  const accented = parts.map((part) => (PLACEHOLDER.test(part) ? part : accent(part))).join('')
  const padding = '·'.repeat(Math.ceil(text.length * EXPANSION))
  return `[${accented}${padding}]`
}

function transform(value) {
  if (typeof value === 'string') return pseudo(value)
  return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, transform(inner)]))
}

const strings = JSON.parse(readFileSync(process.argv[2], 'utf8'))
console.log(JSON.stringify(transform(strings), null, 2))
```

### The length check

Once every locale is written, measure every slot in every locale. Save this script as
`evidence/length-check.mjs`, run it from the repository root, and paste its table into
`ux-writer/length-budget.md`. It reads `ux-designer/string-slots.json` and each
`ux-writer/strings-<locale>.json`, and needs only node.

```js
// node length-check.mjs <run-dir> <locale> [<locale> ...] [--fill <placeholder>=<value> ...]
// Measures every slot in ux-designer/string-slots.json against ux-writer/strings-<locale>.json.
// Length is counted in grapheme clusters, with a wide East Asian character counted as two.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const WIDE = /[\p{Script=Han}\p{Script=Hangul}　-ヿㇰ-ㇿ！-｠￠-￦]/u
const PLACEHOLDER = /\{([^{}]+)\}/g

function parseArgs(argv) {
  const fills = {}
  const positional = []
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] !== '--fill') {
      positional.push(argv[i])
      continue
    }
    const [name, ...value] = argv[++i].split('=')
    fills[name] = value.join('=')
  }
  const [runDir, ...locales] = positional
  return { runDir, locales, fills }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

// Grapheme clusters, so a letter and its combining marks count once, as a reader sees them.
function width(text, locale) {
  let total = 0
  for (const { segment } of new Intl.Segmenter(locale, { granularity: 'grapheme' }).segment(text)) {
    total += WIDE.test(segment) ? 2 : 1
  }
  return total
}

// A count key holds one variant per plural category, and the widest variant sets its length.
function measure(value, locale, fills) {
  const variants = typeof value === 'string' ? [value] : Object.values(value)
  const unfilled = new Set()
  let widest = 0
  for (const variant of variants) {
    const rendered = variant.replace(PLACEHOLDER, (match, name) => {
      if (name in fills) return fills[name]
      unfilled.add(name)
      return match
    })
    widest = Math.max(widest, width(rendered, locale))
  }
  return { widest, unfilled: [...unfilled] }
}

const { runDir, locales, fills } = parseArgs(process.argv.slice(2))
const slots = readJson(join(runDir, 'ux-designer', 'string-slots.json'))
const catalogues = Object.fromEntries(
  locales.map((locale) => [locale, readJson(join(runDir, 'ux-writer', `strings-${locale}.json`))]),
)

let failures = 0
console.log('| Slot | max_chars | Measured | Longest locale |')
console.log('|---|---|---|---|')
for (const slot of slots) {
  const cells = []
  let longest = { locale: 'none', widest: -1 }
  for (const locale of locales) {
    const value = catalogues[locale][slot.slot]
    if (value === undefined) {
      cells.push(`${locale} MISSING`)
      failures++
      continue
    }
    const { widest, unfilled } = measure(value, locale, fills)
    const over = widest > slot.max_chars
    if (over) failures++
    if (widest > longest.widest) longest = { locale, widest }
    const notes = [over ? 'OVER' : '', unfilled.length ? `unfilled ${unfilled.join(', ')}` : '']
    cells.push([`${locale} ${widest}`, ...notes.filter(Boolean)].join(' '))
  }
  console.log(`| ${slot.slot} | ${slot.max_chars} | ${cells.join('; ')} | ${longest.locale} ${longest.widest} |`)
}
console.log(`\nFailures: ${failures}`)
process.exit(failures ? 1 : 0)
```

Run it with every locale in `PROJECT.md § Locales`, and fill each placeholder with a realistic
long value from the brief:

```
node .devteam/runs/<run-id>/evidence/length-check.mjs .devteam/runs/<run-id> en fr ar --fill n=1234 --fill "name=Maya Chen" --fill invoice_number=INV-2041
```

It exits non-zero when a slot is over budget or a locale is missing a key. An unfilled
placeholder is measured as written and flagged, so the number it prints for that slot is not
yet a measurement. Under the table in `length-budget.md`, record the fills you used, because
every count depends on them, and list every slot marked `OVER` with the note sent to the
ux-designer.

---

## Plurals

### Never concatenate a count

Locales form plurals differently, and the failure is silent to everyone on the team who does not
read the locale that breaks. It breaks at exactly the counts a reader notices.

Wrong:

```js
`${count} ` + t('invoices_overdue')
count === 1 ? t('invoice') : t('invoices')
```

Right: a full variant for every plural category the locale uses, with the count inside each.
The localisation library selects the category from the number with the locale's rules, through
`Intl.PluralRules` or its own equivalent.

### Categories by locale

CLDR, the Unicode locale data every major platform uses, defines six category names: `zero`,
`one`, `two`, `few`, `many` and `other`. Each locale uses a subset, and every locale has
`other`. The names label rules, not numbers: French `one` covers 0 as well as 1, and Arabic
`few` covers 103 as well as 3.

| Locale | Categories | Which numbers |
|---|---|---|
| English `en`, German `de`, Dutch `nl` | one, other | one: 1. other: everything else, including 0 and any number shown with decimals. |
| French `fr` | one, many, other | one: 0 and 1, and decimals below 2. many: exact millions and above, as in `1 000 000 de factures`. other: the rest. |
| Spanish `es`, Italian `it` | one, many, other | one: 1. many: exact millions and above, as in `1 000 000 de facturas`. other: the rest, including 0. |
| Portuguese `pt` | one, many, other | one: 0 and 1, and decimals below 2. many: exact millions and above. other: the rest. European Portuguese, `pt-PT`, puts 0 and decimals in other, as Spanish does. |
| Russian `ru` | one, few, many, other | one: 1, 21, 31, never 11. few: 2 to 4, 22 to 24, never 12 to 14. many: 0, 5 to 20, 25 to 30. other: decimals. |
| Polish `pl` | one, few, many, other | one: 1 only. few: 2 to 4, 22 to 24, never 12 to 14. many: 0, 5 to 21, 25 to 31. other: decimals. |
| Hebrew `he` | one, two, other | one: 1. two: 2. other: everything else. |
| Arabic `ar` | zero, one, two, few, many, other | zero: 0. one: 1. two: 2. few: 3 to 10, 103 to 110. many: 11 to 99, 111 to 199. other: 100 to 102, 200 to 202, and decimals. |
| Japanese `ja`, Chinese `zh`, Korean `ko` | other | One form for every number. |

CLDR revises these rules between versions, so check the runtime the product ships on rather
than a memory of it. `new Intl.PluralRules('fr').resolvedOptions().pluralCategories` returns the
categories, and `new Intl.PluralRules('fr').select(0)` returns the category for a number. A
locale not in the table is read the same way, and its categories are recorded in
`plural_forms`.

### A full set

`invoice.overdue.count` in English, French and Arabic, as rows in `strings.md`:

| key | en | fr | ar |
|---|---|---|---|
| `invoice.overdue.count.zero` | n/a: no zero category in en | n/a: no zero category in fr | لا توجد فواتير متأخرة |
| `invoice.overdue.count.one` | {n} invoice is overdue | {n} facture en retard | فاتورة واحدة متأخرة |
| `invoice.overdue.count.two` | n/a: no two category in en | n/a: no two category in fr | فاتورتان متأخرتان |
| `invoice.overdue.count.few` | n/a: no few category in en | n/a: no few category in fr | {n} فواتير متأخرة |
| `invoice.overdue.count.many` | n/a: no many category in en | {n} de factures en retard | {n} فاتورة متأخرة |
| `invoice.overdue.count.other` | {n} invoices are overdue | {n} factures en retard | {n} فاتورة متأخرة |

The French and Arabic rows carry `needs native review`, like any string outside the
first-authored locale. Keep `{n}` in every variant whose rule covers more than one number:
French `one` covers 0 and 1, and Arabic `few` covers 3 to 10. The Arabic `one` and `two` rows
spell the number as words because each covers exactly one number.

### Exact values, decimals and ordinals

- An exact-value variant, `=0`, wins over the category for that number. Use it where zero reads
  as a different sentence, such as `No invoices are overdue`, and write it in every locale, so
  zero means the same thing everywhere. It sits beside the categories: the row
  `invoice.overdue.count.=0` in `strings.md`, and the member `"=0"` in each JSON file.
- The library selects on the number as it is shown. English selects `one` for 1 and `other` for
  1.0, so a count formatted with decimals needs the same fraction settings passed to the plural
  rules as to the number formatter.
- Ordinals have categories of their own: English uses one, two, few and other for 1st, 2nd, 3rd
  and 4th. Prefer a cardinal phrasing, such as `Reminder 2 of 3`, that needs no ordinal. Where
  one is unavoidable, it is a set of its own, selected with the ordinal rules.

---

## Numbers, dates and currency

### A number carries its context

- Every number in product copy carries its unit, its period, and its base where it is a rate:
  `3 of 8 invoices paid this month`, `38% paid on time (n=412 invoices, last 90 days)`. Never
  `38% paid`.
- The form of the base follows the brand spec's Numbers rule. Where it is silent, prefer a
  fraction such as `3 of 8` for readers who are not analysts, and show a small base as the
  fraction rather than a percentage: `2 of 3`, not `67%`.
- A number the brief gives no source for is unwritable. It goes to `unwritable.md`, never into
  a sentence as an estimate.

### Format through the locale, never by hand

Every number, amount, date and time goes through one shared formatter with the locale, such as
`Intl.NumberFormat` and `Intl.DateTimeFormat` or the stack's equivalent. The string holds a
placeholder and the formatter supplies the rest. The same value reads differently by locale:

| Value | en-GB | de-DE | fr-FR |
|---|---|---|---|
| 1234.5 | 1,234.5 | 1.234,5 | 1 234,5 |
| 0.38 as a percentage | 38% | 38 % | 38 % |
| 1250 in euros | €1,250.00 | 1.250,00 € | 1 250,00 € |

French groups digits with a narrow no-break space (U+202F), and French and German put a
no-break space (U+00A0) before the euro and percent signs. Never type a data value, a separator
or a currency symbol into a string: write `Enter an amount of {min_amount} or more`, and the
formatter supplies `0.01` or `0,01`. Never replace the formatter's no-break spaces with ordinary
ones either: they stop an amount breaking across two lines.

Which digits a locale shows is a brand decision, recorded in the brand spec's Right to left and
scripts section. Set it explicitly on the formatter, because runtime defaults vary by region. In
current ICU, `ar` formats 1234.5 with Western digits as `1,234.5`, while `ar-EG` and `ar-SA` use
Arabic-Indic digits as `١٬٢٣٤٫٥`. A `-u-nu-latn` or `-u-nu-arab` extension on the locale tag
fixes the choice.

### Currency

- Amounts arrive from the backend as integer minor units with an ISO 4217 code. The formatter
  applies the currency's own decimals: none for the Japanese yen, two for the euro, three for
  the Kuwaiti dinar.
- A symbol is ambiguous wherever a reader can meet more than one currency: `$` is the US,
  Canadian and Australian dollar, among others. Where an account can hold more than one
  currency, or readers span countries, show the ISO code, as in `USD 1,250.00`, and let the
  formatter place it.
- The currency shown is the currency of the record. Copy never converts an amount, and never
  implies a figure in the reader's currency that the system did not compute.
- Symbol position and spacing belong to the formatter: `€1,250.00` in en-GB, `1.250,00 €` in
  de-DE.

### Dates and times

- The brand spec's Voice and copy section sets the date format for tables and for prose. It
  names the parts and their length, such as day, short month and year, and each locale orders
  and spells them through the formatter: `14 Mar 2026` in en-GB, `Mar 14, 2026` in en-US,
  `14 mars 2026` in fr-FR, `14. März 2026` in de-DE, `2026年3月14日` in ja-JP. Where the brand
  spec fixes one pattern for every locale, apply it and cite the section.
- Never a numeric-only date. `03/04/2026` is 3 April in one locale and 4 March in another.
- The Gregorian calendar, unless `PROJECT.md § Locales` names another, set explicitly with
  `-u-ca-gregory`. Some locales default to another calendar: `th-TH` formats 2026 as the
  Buddhist year 2569, and `fa` uses the Persian calendar.
- A deadline is an absolute date: `Due 14 Mar 2026`, not `Due in 3 days`, wherever the string
  can outlive the moment it was rendered, as in an email, a notification, an export or a
  screenshot. Relative time, such as `3 days ago`, is for recency in a live view only, through
  `Intl.RelativeTimeFormat`, which handles its own plurals. In Arabic it returns a single word,
  `أول أمس`, for two days ago. The absolute date stays available beside it.
- Times follow the locale's 12-hour or 24-hour convention through the formatter, unless the
  brand spec fixes one. A time without a zone is ambiguous where readers span zones: show the
  zone that governs, such as `17:00 UTC` or the account's zone, and name it.
- Dates arrive from the backend in ISO 8601 UTC. The client converts them to the zone that
  governs, then formats them.

### Names

- One field holds one full name, as the backend returns it in `full_name`. Never ask for or
  assume a surname, and never split a name to greet someone, because name order differs between
  cultures. `Sent to Maya Chen` works for every name. `Hi {first_name}` does not.
- A person with a single name completes every form. No validation message asks for a second
  name.
- A name is data, so it is isolated in right-to-left text, and in left-to-right text too: a name
  typed in Arabic or Hebrew inside an English sentence reorders the words around it. See right to
  left, below.

---

## Status labels

No status without a written label. Colour, an icon or a position may accompany a status. None of
them carries it alone.

- One word or short phrase per state, the same everywhere. The key is
  `<entity>.status.<state>`, the one the API names in `status_label_key`. A state never carries
  two words, and two states never share one.
- The label names the state, never its colour or a feeling about it.
- Where the product knows when and who, the label or the line beside it says so:
  `Paid 02 Apr 2026`, `Sent to Maya Chen`.
- The label is visible text. A tooltip, a title attribute or an accessible name alone does not
  count, because a reader on a touch screen never sees it.
- Every label exists in every locale, with its own budget. A status label is a short slot, and
  short strings grow the most.

| key | en | Not |
|---|---|---|
| `invoice.status.draft` | Draft | A grey dot |
| `invoice.status.sent` | Sent | Pending |
| `invoice.status.part_paid` | Part paid | In progress |
| `invoice.status.overdue` | Overdue | Red, or At risk |
| `invoice.status.paid` | Paid | Done, or a green tick |

---

## Message patterns

### Errors

What happened, then what to do. Two sentences at most. No apology, and never blame the reader.
Name the object that failed.

| State | Write | Not |
|---|---|---|
| A save failed | Couldn't save the invoice. Check your connection and try again. | Oops, something went wrong |
| Offline | You're offline. Your changes are saved on this device and will sync when you reconnect. | Network error |
| Validation | Enter an amount of 0.01 or more. | Invalid amount |
| Permission | Only account owners can export invoices. Maya Chen owns this account. | You don't have permission |
| A product rule | This invoice has been sent, so it can't be edited. Issue a credit note to correct it. | Action not allowed |
| A rate limit | Too many exports in the last hour. Try again after 15:00 UTC. | Please try again later |
| An unknown failure | Couldn't load invoices. Try again, and if it keeps failing, contact support with reference T91AC. | An unexpected error occurred |

- `Couldn't send` is right. `You entered an invalid email address` is wrong: it assigns the
  failure to the reader.
- A validation message sits at its field, says what is accepted, and stays until the value is
  fixed.
- Every error code the API can return has its message at `error.<code>`. A code without copy is
  rejected back to the backend-engineer.
- A support reference is the only code a reader ever sees, and in right-to-left text it is an
  isolated left-to-right run.
- An error never promises what the system does not do. "Will sync when you reconnect" is written
  only if it does. Otherwise the string is unwritable until the behaviour is defined.

### Empty states

There are two kinds, and the copy says which one the reader is looking at.

| Kind | Write |
|---|---|
| Nothing yet | No invoices yet. Invoices appear here once you send one from a project. Button: `Create invoice` |
| A filter matched nothing | No invoices match Overdue in March 2026. Button: `Clear filters` |

- Say what will appear here and what puts it there, then offer the one action. Never an apology,
  never a joke, and never an illustration standing in for the sentence.
- A restricted view takes its own copy. `Only account owners can see invoices.` is true, while
  `No invoices` is false to a reader who lacks access.

### Confirmations

Before a destructive or irreversible action:

- The title names the action and its object: `Delete the Northwind project?`
- The body says what is lost, with counts, and whether it can be undone:
  `Its 14 invoices and 230 time entries are deleted with it. This can't be undone.` Each count is
  a plural set of its own.
- The confirming button repeats the verb and object: `Delete project`. The other button says what
  it keeps, such as `Keep project`, or uses the brand spec's cancel label. Never `Yes` and `No`,
  and never `OK`.
- Where the action can be undone, skip the dialog and offer undo afterwards. A confirmation on a
  reversible action trains readers to click through the ones that matter.

### Success

- A fact in the past tense, naming the object: `Invoice INV-2041 sent to Maya Chen.` Never
  congratulations.
- An undo where the action can be undone: `3 invoices archived.` with an `Undo` button.
- Nothing at all when the result is already visible on screen. A toast that repeats what the
  reader can see is noise.

### Notifications and plain-text channels

- The first line carries the fact and the date, because every channel truncates from the end:
  `Invoice INV-2041 is 6 days overdue` as an email subject, never `An update on your account`.
- Each message carries one fact and one action.
- A subject line, a push notification and an SMS carry no markup, so a left-to-right run inside
  right-to-left text is isolated with Unicode isolate characters instead. See right to left,
  below.
- Where the product sends SMS, a single segment holds 160 characters in the GSM 7-bit alphabet,
  and 70 once any character outside it appears, which includes every Arabic, Hebrew, Cyrillic,
  Chinese, Japanese or Korean character. Longer messages split into segments of 153 and 67.
  Budget SMS copy per locale, in segments.
- Message templates that a third party must approve word for word are out of scope unless the
  brief names them.

---

## Right to left

This section applies when `PROJECT.md § Locales` names a right-to-left locale. Its isolation
rules also apply in every locale that can display a name or a value typed in a right-to-left
script. The layout's mirroring is specified in `team-design-system` and built by the
frontend-engineer. This section covers what the words need.

### Direction in the words

- Never give a direction by side. "The button on the right" is wrong in the mirrored layout.
  Name the control.
- Use logical words: start and end, next and previous, never left and right.
- An arrow typed as a character, such as `→`, does not mirror. Use a mirrored icon from the
  design system, or a word. Brackets and parentheses do mirror on their own, so type them in
  their normal logical order.

### Isolating left-to-right runs

Inside right-to-left text, a run of Latin letters, digits or code is laid out by the Unicode
bidirectional algorithm, and the spaces and punctuation beside it can land on the wrong side or
reorder the run.

- Record every such run in `ltr_runs`: identifiers such as `INV-2041`, email addresses, URLs,
  phone numbers, code, product names in Latin script, amounts with a currency code, and every
  placeholder that interpolates one of them.
- The frontend-engineer wraps each run in `<bdi>`, or in `dir="ltr"` with
  `unicode-bidi: isolate` when the run is known to be left to right.
- A placeholder whose direction is not known in advance, such as a person's name or a project
  name a user typed, is isolated with its direction taken from its own first strong character
  (`<bdi>`, or `dir="auto"`). That way a Latin name in an Arabic sentence and an Arabic name in an
  English sentence both read correctly. Record it in `ltr_runs` as isolated, direction from its
  content.
- Where there is no markup, as in an email subject, a push notification or an SMS, use the
  Unicode isolates: U+2066 LEFT-TO-RIGHT ISOLATE, or U+2068 FIRST STRONG ISOLATE when the
  direction is unknown, before the run, and U+2069 POP DIRECTIONAL ISOLATE after it. Never the
  older embedding and override controls, U+202A to U+202E, which do not isolate and disturb the
  text around them.

The failures isolation prevents, each seen often:

| Written | What renders without isolation |
|---|---|
| A name ending in punctuation, such as `Acme Inc.`, at the end of an Arabic sentence | The name's full stop renders before the name instead of after it |
| A phone number with spaces, such as `+44 20 7946 0000`, inside Arabic text | The groups reorder, because each space splits the number into separate runs |
| An Arabic or Hebrew name followed by a number, as in `{name}: 3 invoices`, inside English text | The number attaches to the name and moves to its other side |

### Punctuation

- Use the locale's own marks where it has them. In Arabic, the comma `،` (U+060C), the semicolon
  `؛` (U+061B) and the question mark `؟` (U+061F). The full stop is shared with Latin script.
  Hebrew uses the Latin marks.
- Punctuation sits in logical order, where it falls when the sentence is read. Type it at the
  end, and let the renderer place it. Never move it to make a preview look right, because the
  preview is the thing that is wrong.
- The number formatter already inserts direction marks around a percent sign in Arabic. Do not
  add your own.

### Script setting

The details live in the brand spec's Right to left and scripts section and in
`team-design-system`. Four rules reach the words:

- Never letterspace a connected script such as Arabic. Its letters join, and tracking breaks them.
- Never ask for a synthesised bold or an italic. Arabic has no italic, so emphasis comes from a
  real weight or from position.
- Arabic and Hebrew have no letter case, so emphasis that depends on capitals, such as an
  all-caps label, has no equivalent. Carry it by weight or position in every locale.
- No justification by stretching letters (kashida). Set text ragged.

---

## No idiom, in any locale

No idioms, metaphors or wordplay, anywhere. The reader is often on a small screen, sometimes in a
second language, between tasks, and each of those makes figurative language cost more to parse
than it is worth. None of it survives localisation, and a writer in another locale who must
invent an equivalent ends up writing a different product.

---

## Before handing off

- [ ] Every slot in `ux-designer/string-slots.json` has a key and a string.
- [ ] Every key has a final string in every locale in `PROJECT.md § Locales`, with the
      first-authored locale written first and the rest in the same run.
- [ ] Every string outside the first-authored locale carries `needs native review`, unless a
      named native reader cleared it on a device, and no reviewed string changed after its
      review.
- [ ] No string concatenates a count or assembles a sentence from fragments. Every count key
      has every category each locale uses, checked against the runtime's `pluralCategories`.
- [ ] Every placeholder is named, and appears in every locale's string.
- [ ] Every number carries its unit, its period and its base where it is a rate, and no data
      value, separator or currency symbol is typed into a string.
- [ ] Every date follows the brand spec's format through the formatter, and none is
      numeric-only.
- [ ] Every status has its written label at `<entity>.status.<state>`.
- [ ] The length check ran over every locale, its table is in `length-budget.md`, and every
      slot fits or has a note with the ux-designer.
- [ ] Every left-to-right run inside right-to-left text, and every name placeholder, is recorded
      in `ltr_runs`.
- [ ] The brand spec's voice rules hold in every locale: case, punctuation, emoji, first person
      and the banned list.
- [ ] The competitor test ran on every sentence, in every locale.
- [ ] Anything that could not be written truthfully is in `unwritable.md`, never softened.
