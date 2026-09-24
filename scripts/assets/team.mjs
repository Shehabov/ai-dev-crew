/**
 * The roster, in delivery order. The single source for every cover, diagram and roster
 * table, so a name or a gate never differs between the art and the docs.
 */

export const TEAM = [
  { n: '01', name: 'orchestrator', layer: 'L1', track: 'Run', gate: 'run-closure', line: 'Plans the run and holds every gate' },
  { n: '02', name: 'bug-historian', layer: 'Memory', track: 'Memory', gate: 'regression-guard', line: 'Remembers every mistake so it is not repeated' },
  { n: '03', name: 'tech-architect', layer: 'L2', track: 'Architecture', gate: 'design-authority', line: 'Writes the decisions and the briefs' },
  { n: '04', name: 'ux-designer', layer: 'L3', track: 'Design', gate: null, line: 'Designs every screen and every state' },
  { n: '05', name: 'ux-auditor', layer: 'L3', track: 'Design', gate: 'design', line: 'Audits the design before any code exists' },
  { n: '06', name: 'ux-writer', layer: 'L3', track: 'Design', gate: 'copy', line: 'Writes every string, in every locale' },
  { n: '07', name: 'backend-engineer', layer: 'L3', track: 'Build', gate: null, line: 'Builds the data layer and the API' },
  { n: '08', name: 'frontend-engineer', layer: 'L3', track: 'Build', gate: null, line: 'Builds the interface from the approved spec' },
  { n: '09', name: 'peer-reviewer', layer: 'L3', track: 'Review', gate: 'review-judgement', line: 'Reviews judgement, like a senior engineer' },
  { n: '10', name: 'code-analyst', layer: 'L3', track: 'Review', gate: 'review-defects', line: 'Reads every line for defects' },
  { n: '11', name: 'code-steward', layer: 'L3', track: 'Review', gate: 'review-readability', line: 'Keeps the code readable for whoever is next' },
  { n: '12', name: 'security-analyst', layer: 'L3', track: 'Review', gate: 'security', line: 'Blocks anything that leaks or can be broken into' },
  { n: '13', name: 'engineering-lead', layer: 'L2', track: 'Integration', gate: 'engineering', line: 'Proves it works end to end' },
  { n: '14', name: 'qc-engineer', layer: 'L3', track: 'Quality', gate: null, line: 'Tests the product and keeps the evidence' },
  { n: '15', name: 'qc-lead', layer: 'L2', track: 'Quality', gate: 'quality', line: 'Audits the evidence and calls go or no-go' },
  { n: '16', name: 'release-engineer', layer: 'L3', track: 'Release', gate: 'release', line: 'Ships it, tags it, and can roll it back' },
]

/** The twelve gates, in the order a run meets them. */
export const GATES = [
  { name: 'design-authority', owner: 'tech-architect', passes: 'An ADR and task briefs exist and hold the product invariants' },
  { name: 'design', owner: 'ux-auditor', passes: 'The spec survives an independent audit against the brand and WCAG 2.2 AA' },
  { name: 'copy', owner: 'ux-writer', passes: 'Every string exists in every locale, within its length budget' },
  { name: 'review-judgement', owner: 'peer-reviewer', passes: 'A senior read finds the design, boundaries and failure modes sound' },
  { name: 'review-defects', owner: 'code-analyst', passes: 'A line-by-line read finds no open blocker or major' },
  { name: 'review-readability', owner: 'code-steward', passes: 'Names, shape and comments meet the clean code standard' },
  { name: 'security', owner: 'security-analyst', passes: 'Every pass of the security sweep ran, and nothing critical or high is open' },
  { name: 'regression-guard', owner: 'bug-historian', passes: 'No defect already in BUGS.md has been repeated' },
  { name: 'engineering', owner: 'engineering-lead', passes: 'It builds, migrates and runs end to end, with the log to prove it' },
  { name: 'quality', owner: 'qc-lead', passes: 'The evidence holds up to audit, and the call is go' },
  { name: 'release', owner: 'release-engineer', passes: 'Shipped, tagged, verified, with a written rollback' },
  { name: 'run-closure', owner: 'orchestrator', passes: 'Every planned role ran, and every output was used' },
]

/** The five-step loop every agent runs inside its own turn. */
export const LOOP = [
  { n: 1, name: 'Plan', line: 'Inputs, assumptions, acceptance criteria, out of scope' },
  { n: 2, name: 'Audit the plan', line: 'Adversarially, before a line of work' },
  { n: 3, name: 'Execute', line: 'Against the audited plan' },
  { n: 4, name: 'Review', line: 'Own output, against own criteria and the brand' },
  { n: 5, name: 'Hand off', line: 'A record the next role can verify' },
]
