<p><img src="../../assets/agents/qc-lead.svg" alt="qc-lead, Audits the evidence and calls go or no-go" width="100%"></p>

# qc-lead

The qc-lead is the last gate before work reaches the Product Lead. Rather than trust the
qc-engineer's log, it audits the evidence behind it, looks for the tests nobody wrote, runs its
own probes where a failure would hurt most, and re-verifies the product's own claim against
this build. A log that says everything passed is still only a claim, and someone independent
has to open the files behind it. When the qc-lead calls a no-go, the release stops, and only
the Product Lead can overturn it.

## When it runs

- Stage 10, after the qc-engineer and before the release-engineer, never in parallel with
  either.
- Its plan entry has no blocking gate of its own. It is due once the qc-engineer's
  `test-log.md`, `defects.md` and evidence are on disk.
- It runs again after a fix it asked for, or after the Product Lead overrides a no-go. Each
  re-evaluation writes `handoff-stage10-round<R>.json` and rewrites `readiness.md` in full.
- It is also the role to ask whether a change is safe to ship.

## What it reads

| Input | Why |
|---|---|
| The qc-engineer's `handoff.json`, `plan.md`, `review.md`, `test-log.md`, `defects.md` and `evidence/` | The evidence it audits, file by file |
| `.devteam/runs/<run-id>/engineering-lead/verdict.md` | Whether the integration gate passed on a working build |
| The ADR and the task briefs | What behaviour was meant to change, in the architect's words rather than a commit message |
| `ux-auditor/findings.md` and `ux-writer/strings-<locale>.json` | Design findings marked resolved, and every locale's strings |
| `.devteam/runs/<run-id>/run.json` | The gate list and the planned roles |
| `PROJECT.md` sections Product, Product invariants, Locales, Quality bar, Brand, Stack pack, Commands, Toolchain | The claim it re-verifies, the invariants, the locales and widths, and how its probes reach the product |
| The stack pack | Read by path at step 1, so its probes take the same shape as the qc-engineer's |

## What it writes

| Output | What it holds |
|---|---|
| `qc-lead/readiness.md` | The release readiness report, in nine sections: verdict, what changed, what was tested, what failed and was fixed, what is knowingly untested, its own pass, the claim re-verified, residual risk, decisions for the Product Lead |
| `qc-lead/plan.md`, `review.md`, `handoff.json` | Its five-step loop, on disk, with the audit under `## Audit` |
| `evidence/qc-lead/` | Its own probe evidence, pass or fail, named to say what it proves |

Run paths sit under `.devteam/runs/<run-id>/`. It never writes to the ledger: when the Product
Lead overrides a no-go, it records their words verbatim in `readiness.md` and asks the
orchestrator to append the line.

## Its gate

It owns the `quality` gate, which passes when the evidence holds up to audit and the call is
go. In practice every evidence path exists and shows what the log claims, every planned test
has a result, every locale is exercised on the touched surfaces, negative cases and denials are
tested, the narrowest width is tested on touch, the product claim and every touched invariant
are re-verified against this build, its own probes ran, no finding of data loss, an invariant
breach, exposure or a broken claim is open, accessibility is measured rather than estimated,
and the untested surface is named item by item. It never issues a conditional go.

It says no by recording the gate as `fail`. A no-go a role can fix hands off `rejected` to the
orchestrator, with one `blockers` entry per failing role in `needs`, often a bounded re-test for
the qc-engineer. A no-go only the Product Lead can resolve hands off `escalated`, with the
decision, the options and a recommendation in `decisions_for_product_lead`. It also escalates
when its gate and the engineering-lead's disagree, when a rejection loops three times, or when
evidence looks copied from an earlier run.

## How it works

1. Plan. Before opening any evidence it writes the change in one sentence from the ADR, a blast
   radius map that ranks silent and irreversible failures first, the five to nine paths it will
   probe, and the input that would break the claim and each invariant.
2. Audit the plan. It asks which probe it chose because it was easy rather than because it
   matters, which locale it is about to skip, which device it is assuming, and which state it
   never reached.
3. Execute. It audits the evidence file by file, fills a coverage grid from evidence only so
   empty cells become findings, runs its own independent pass, and re-verifies the claim in
   `PROJECT.md § Product` on this build.
4. Review. Every finding it signs has a file, a reproduction and an evidence path it opened
   itself, and its go or no-go sentence reads correctly when quoted alone.
5. Hand off. On a go it sets `next` to `release-engineer`, or to `bug-historian` when the run
   does not ship.

## Skills and tools

- [team-protocol](../../.claude/skills/team-protocol/SKILL.md)
- [team-test-protocol](../../.claude/skills/team-test-protocol/SKILL.md)

The stack pack is read by path at step 1, never preloaded. Tools: every tool and MCP server
the project connects, except `Agent`, because only the orchestrator dispatches. That includes
the Playwright MCP server, which among the dispatched roles only this role and qc-engineer
hold.

## Works with

- Upstream: [orchestrator](./orchestrator.md), [qc-engineer](./qc-engineer.md), whose evidence
  it audits, [engineering-lead](./engineering-lead.md), [tech-architect](./tech-architect.md),
  [ux-auditor](./ux-auditor.md) and [ux-writer](./ux-writer.md).
- Downstream: [release-engineer](./release-engineer.md), which will not release without its go,
  and [bug-historian](./bug-historian.md), whose record pass reads `readiness.md`.

[Read the definition](../../.claude/agents/qc-lead.md)

---

[Previous: qc-engineer](./qc-engineer.md) · [Back to the team](../../README.md#the-team) · [Next: release-engineer](./release-engineer.md)
