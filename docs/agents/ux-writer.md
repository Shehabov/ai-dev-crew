<p><img src="../../assets/agents/ux-writer.svg" alt="ux-writer, Writes every string, in every locale" width="100%"></p>

# ux-writer

The ux-writer writes every string a person reads in the product, in every locale in
`PROJECT.md § Locales`, and holds each one to the same standard. If a string ships, the
ux-writer wrote it or approved it. The engineers never invent a label or an error message.
Copy written at the last minute, in one language, is where a product stops telling its reader
what happened and what to do next, and this role is there to stop that.

## When it runs

- Stage 4, whenever a change adds or alters a user-visible string.
- It starts only when the `design` gate reads pass, so the ux-designer's spec and string slots
  exist and the ux-auditor has passed them.
- It runs again when a budget comes back from the ux-designer, when the ux-auditor files a
  copy finding against built UI, or when a later stage finds a string missing in one locale.
  A fix round writes `handoff-stage4-round<R>.json`, and a pass for a later plan entry writes
  `handoff-stage<N>.json`.

## What it reads

| Input | Why |
|---|---|
| `PROJECT.md` sections Product, Locales, Brand, Stack | The readers, the locale list and which one is authored first, the brand spec's voice, and where the source tree lives |
| `.devteam/runs/<run-id>/ux-designer/spec.md` and `string-slots.json` | The states it writes for, and the budget per slot measured on the longest locale |
| `.devteam/runs/<run-id>/ux-auditor/findings.md` | The design gate result, and any copy findings routed to it |
| `.devteam/runs/<run-id>/bug-historian/brief.md` | What has already gone wrong with copy on this surface |
| `.devteam/runs/<run-id>/tech-architect/brief-frontend.md` | The data each screen shows, and where every number comes from |
| The backend-engineer's error taxonomy | When the change adds error codes that need human messages |

## What it writes

| Output | What it holds |
|---|---|
| `ux-writer/strings.md` | The string catalogue, the source of truth: key, one column per locale, reader, context, budget, plural forms, left-to-right runs, screenshot, native review status |
| `ux-writer/strings-<locale>.json` | One machine-readable file per locale, the paths the frontend-engineer wires |
| `ux-writer/length-budget.md` | Longest-locale widths per slot, for the ux-designer |
| `ux-writer/unwritable.md` | Strings it refused to write, and what is missing |
| `ux-writer/plan.md`, `review.md`, `handoff.json` | Its five-step loop, on disk |
| `content/strings/<locale>.json` | The shipped resource, once the app that reads it exists, unless the stack pack names another home |

Run paths sit under `.devteam/runs/<run-id>/`.

## Its gate

It owns the `copy` gate. The gate passes when every string exists in every locale, within its
length budget. It fails the gate itself, rather than waiting to be caught, when a visible
string is missing from the catalogue, a key is missing a locale, a string runs over its budget
in the longest locale, a count is assembled from fragments, a number lacks its unit, period or
base, a status lacks its written label, or a string lacks its native review status. Strings in
any locale other than the first-authored one stay marked `needs native review` until a named
native speaker has read them on a physical device. The mark may ship; it is never removed to
make the gate pass.

It says no by rejecting upstream: to the ux-designer when a budget is missing or cannot hold
the longest locale, and to the tech-architect or the backend-engineer when a number has no
source or an error code has no message. It never softens a sentence to hide a gap. Decisions
that belong to the Product Lead, such as a missing native reviewer with a release at risk, or
a locale being added or dropped, go up as a `decisions_for_product_lead` entry with a
recommendation.

## How it works

1. Plan. It lists every surface and state it will write for, the reader of each, every key,
   and every place a number, date, name or status appears.
2. Audit the plan. It looks for skipped unglamorous states, strings planned as fragments,
   rates without a base, and budgets measured on the first-authored locale.
3. Execute. It writes the first-authored locale, then every other locale straight after, in
   the same run and from the same brief. Every locale is written, not translated, and every
   sentence must pass the competitor test.
4. Review. It greps the catalogue for numbers, dates, banned words and concatenated counts,
   checks every budget in the longest locale, and confirms every review mark.
5. Hand off. It records the copy gate and sets `next` to `frontend-engineer` when the strings
   are ready to wire.

## Skills and tools

- [team-protocol](../../.claude/skills/team-protocol/SKILL.md)
- [team-copy](../../.claude/skills/team-copy/SKILL.md)
- [team-brand-guard](../../.claude/skills/team-brand-guard/SKILL.md)

Companion skills, if installed, are listed in [SKILLS.md](../SKILLS.md). Tools: every tool
and MCP server the project connects, except `Agent`, because only the orchestrator dispatches,
and the Playwright MCP server (`mcp__playwright`), which among the dispatched roles only
qc-engineer and qc-lead hold.

## Works with

- Upstream: [orchestrator](./orchestrator.md), [ux-designer](./ux-designer.md),
  [ux-auditor](./ux-auditor.md), [bug-historian](./bug-historian.md),
  [tech-architect](./tech-architect.md) and [backend-engineer](./backend-engineer.md).
- Downstream: [frontend-engineer](./frontend-engineer.md), which is blocked on its gate, and
  [qc-engineer](./qc-engineer.md) and [qc-lead](./qc-lead.md), which test and audit every
  locale and see every review mark.

[Read the definition](../../.claude/agents/ux-writer.md)

---

[Previous: ux-auditor](./ux-auditor.md) · [Back to the team](../../README.md#the-team) · [Next: backend-engineer](./backend-engineer.md)
