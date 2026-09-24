<p><img src="../../assets/agents/ux-designer.svg" alt="ux-designer, Designs every screen and every state" width="100%"></p>

# ux-designer

The ux-designer designs every surface a person sees, before anyone writes code. Its aim is a
spec the ux-auditor can test and the frontend-engineer can build without guessing. Layout,
states, focus order and right-to-left behaviour all get decided somewhere, and when that
happens in code, it happens where no auditor sees it. It never writes final copy, never
implements, and never marks its own work clean.

## When it runs

- Stage 2, in parallel with the backend-engineer, whenever a change adds or alters a surface.
- It starts only when the `design-authority` gate reads pass, so the tech-architect's ADR and
  `brief-frontend.md` exist first.
- It runs again each time the ux-auditor returns findings, writing
  `handoff-stage2-round<R>.json` for each fix round, until the design gate passes.
- It also runs when no approved brand spec exists, to draft one for the Product Lead.

## What it reads

| Input | Why |
|---|---|
| `PROJECT.md` sections Product, Brand, Locales, Product invariants, Quality bar | The reader, the brand spec path, the locales, the rules a surface must show, the widths and the accessibility standard |
| The brand spec (default `BRAND.md`) and the design references folder | Every token it may use, and the structure the references set |
| `.devteam/runs/<run-id>/bug-historian/brief.md` and the `BUGS.md` entries it names | What has already broken on this surface |
| `.devteam/runs/<run-id>/tech-architect/brief-frontend.md` and the ADR | The data contract, the permission rules, the invariants |
| `.devteam/runs/<run-id>/ux-auditor/findings.md` | On a repair pass, the findings to fix |

## What it writes

| Output | What it holds |
|---|---|
| `ux-designer/spec.md` | One section per surface: phone layout first, all eight states, breakpoint deltas, right to left, themes, focus order, motion, token trace |
| `ux-designer/string-slots.json` | Every string slot, with its reader, register, budget and longest locale, for the ux-writer |
| `ux-designer/tokens-used.md` | Every token used, its value and its brand spec section |
| `ux-designer/plan.md`, `review.md`, `handoff.json` | Its five-step loop, on disk |
| `evidence/contrast-<surface>.mjs` and `.md` | The node script that computed every contrast ratio, and its output |
| `evidence/frames-<surface>.html` | A static frame board with Playwright captures, where one helps |
| `design/surfaces/<surface>.md` | The canonical spec, written after the design gate passes, unless the stack pack names another home |
| The brand spec path, marked `status: proposed` | Only when no approved brand spec exists |

Run paths sit under `.devteam/runs/<run-id>/`.

## Its gate

It owns no gate. Its exit condition is the entry condition to the design gate, and it records
that self-check in `review.md`, never in `gates[]`. The condition holds when every
definition-of-done box is ticked: eight states per surface, no literal values, contrast
computed for every pair in every theme, focus order written, right to left specified where a
locale needs it, and every override logged.

When it cannot meet the condition, it hands off `blocked` and names the box. When an input is
wrong, it hands off `rejected` to the orchestrator, naming the agent that sent it in
`blockers[].needs`, with the round number. When the decision belongs to the Product Lead,
such as approving a drafted brand spec, breaking a brand rule, or adding a screen the brief
did not ask for, it hands off `escalated` with a `decisions_for_product_lead` entry that
carries the options and a recommendation.

## How it works

1. Plan. It loads `team-design-system`, opens the brand spec, reads the regression brief and
   the frontend brief, and writes the surface inventory, the phone budget, the state matrix
   and acceptance criteria the auditor could test without asking.
2. Audit the plan. It asks, in writing, what breaks at the narrowest width, at 200% zoom, in
   the longest locale and in right to left, and what the auditor will reject.
3. Execute. It writes the spec state by state, the token trace, the string slots and the
   contrast script, and captures frame boards with Playwright at every width in the quality
   bar, in every theme.
4. Review. It greps for raw values, reruns the contrast script, walks the focus order and
   checks the five smoothness checks and the seven component headings.
5. Hand off. It sets `next` to `ux-auditor` and loops with it until the design is clean,
   escalating on the third round over the same finding.

## Skills and tools

- [team-protocol](../../.claude/skills/team-protocol/SKILL.md)
- [team-brand-guard](../../.claude/skills/team-brand-guard/SKILL.md)
- [team-design-system](../../.claude/skills/team-design-system/SKILL.md)

Companion skills, if installed, are listed in [SKILLS.md](../SKILLS.md). Tools: every tool
and MCP server the project connects, except `Agent`, because only the orchestrator dispatches.

## Works with

- Upstream: [orchestrator](./orchestrator.md), [bug-historian](./bug-historian.md),
  [tech-architect](./tech-architect.md).
- Downstream: [ux-auditor](./ux-auditor.md), which audits its spec,
  [ux-writer](./ux-writer.md), which writes against its slots, and
  [frontend-engineer](./frontend-engineer.md), which builds from its spec.

[Read the definition](../../.claude/agents/ux-designer.md)

---

[Previous: tech-architect](./tech-architect.md) · [Back to the team](../../README.md#the-team) · [Next: ux-auditor](./ux-auditor.md)
