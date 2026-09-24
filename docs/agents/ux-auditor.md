<p><img src="../../assets/agents/ux-auditor.svg" alt="ux-auditor, Audits the design before any code exists" width="100%"></p>

# ux-auditor

The ux-auditor is the independent check on the ux-designer's work, and on every surface that
has already shipped. It starts from the assumption that the design has defects it has not
found yet, and it proves each one with measured evidence. A designer grading their own work is
blind to exactly the failures an audit exists to catch, so the two roles are kept apart. It
finds and proves. It never fixes, and it never proposes the fix.

## When it runs

- Stage 3, straight after the ux-designer, whenever the run plan includes a design stage.
- Its stage has no `blocked_by` gate, but it needs the ux-designer's spec to exist. A handoff
  with missing states, raw values or no `review.md` is rejected back before the audit starts.
- It runs again after every repair pass, writing `handoff-stage3-round<R>.json`, until the
  gate passes or the third loop escalates.
- The orchestrator can also dispatch it on shipped UI at any time, and after the
  frontend-engineer to check a build against its spec.

## What it reads

| Input | Why |
|---|---|
| `PROJECT.md` sections Product, Brand, Locales, Quality bar, Toolchain | The reader, the brand spec, the locales, the widths, the accessibility standard and the tools it may use |
| The brand spec and its status | The rules it audits against. A spec marked `status: proposed` binds nothing yet |
| `.devteam/runs/<run-id>/ux-designer/spec.md`, `tokens-used.md`, `string-slots.json`, `review.md` | The design under audit, its token trace, its length budgets and its self-review |
| `.devteam/runs/<run-id>/bug-historian/brief.md` | Every standing rule for this surface becomes a check |
| `.devteam/runs/<run-id>/tech-architect/brief-frontend.md` and the ADR | Which constraints are deliberate |
| `frontend-engineer/files.md` | Only when auditing built UI |

## What it writes

| Output | What it holds |
|---|---|
| `ux-auditor/findings.md` | Every finding, grouped by severity, for people. The evidence for the gate |
| `ux-auditor/findings.json` | The same findings as machine-readable records |
| `ux-auditor/plan.md`, `review.md`, `handoff.json` | Its five-step loop, on disk |
| `evidence/ux-audit/` | The contrast script and its output, Playwright captures at every width, theme and locale and at 200% zoom, desaturated frames, keyboard traces, gap measurements, the anti-generic frame |

Run paths sit under `.devteam/runs/<run-id>/`.

## Its gate

It owns the `design` gate. The gate passes when the spec survives an independent audit
against the brand spec and the accessibility standard in `PROJECT.md § Quality bar`, which
defaults to WCAG 2.2 AA. In practice that means zero open blockers and zero open majors, an
approved brand spec, every colour pair measured in every theme, every state covered, and
every check in the plan actually performed. An unperformed check is a fail, never a pass with
a note.

It says no in three ways. A fail goes back to the ux-designer with `status: rejected` and
every finding routed to the agent who can fix it. A handoff it cannot start on is rejected
back the same cycle, with the missing item named. A decision that belongs to the Product Lead,
such as a brand spec still marked proposed, a brand rule that would have to break, or a third
failed loop, goes up with `status: escalated` and a `decisions_for_product_lead` entry. The
engineering-lead cannot wave a design fail through.

## How it works

1. Plan. It lists every screen, state and width under audit, the rule set in force, and the
   method and command for each check, before it opens a single screen.
2. Audit the plan. It asks which states it left out because the designer did not draw them,
   which check it was about to do by eye, and which rule it was quoting from memory.
3. Execute. Four passes in order: a mechanical sweep of tokens and values, the brand bans and
   the design system's structural rules, the ten interaction heuristics, and measured
   accessibility under real conditions of use. Contrast is computed in a node script, and
   screenshots come from Playwright at every width, theme and locale.
4. Review. It opens every evidence path, checks every severity against the ladder, and drops
   any finding that describes a generic user rather than this product's reader.
5. Hand off. It records the design gate. On a fail it sets `next` to `orchestrator`, with the
   ux-designer named in `blockers[].needs`. On a pass it sets `next` to `ux-writer`, or to
   `frontend-engineer` when there is no copy stage.

## Skills and tools

- [team-protocol](../../.claude/skills/team-protocol/SKILL.md)
- [team-brand-guard](../../.claude/skills/team-brand-guard/SKILL.md)
- [team-design-system](../../.claude/skills/team-design-system/SKILL.md)
- [team-ux-audit](../../.claude/skills/team-ux-audit/SKILL.md)

Companion skills, if installed, are listed in [SKILLS.md](../SKILLS.md). Tools: every tool
and MCP server the project connects, except `Agent`, because only the orchestrator dispatches.

## Works with

- Upstream: [orchestrator](./orchestrator.md), [ux-designer](./ux-designer.md),
  [bug-historian](./bug-historian.md), [tech-architect](./tech-architect.md), and
  [frontend-engineer](./frontend-engineer.md) when it audits built UI.
- Downstream: [ux-designer](./ux-designer.md) on a fail, [ux-writer](./ux-writer.md) on a
  pass, and [frontend-engineer](./frontend-engineer.md), which is blocked on its gate.
- Peers whose gates it may conflict with: [engineering-lead](./engineering-lead.md) and
  [qc-lead](./qc-lead.md). A conflict goes to the Product Lead.

[Read the definition](../../.claude/agents/ux-auditor.md)

---

[Previous: ux-designer](./ux-designer.md) · [Back to the team](../../README.md#the-team) · [Next: ux-writer](./ux-writer.md)
