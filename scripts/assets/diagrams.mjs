/**
 * The explanatory diagrams: the delivery flow, the five-step loop, the twelve gates, the
 * team by layer and the security gate.
 *
 * Each diagram is one function of a theme, so the light variant (navy ink on paper) and the
 * dark variant (white ink on navy) share every coordinate. Names come from team.mjs; every
 * colour, font, radius and stroke comes from tokens.mjs.
 *
 * Mint means one thing throughout: a gate, the point where work waits for its owner to
 * record a pass. On paper mint is only ever a fill behind navy ink, never text and never a
 * thin line, because mint on paper is about 1.5:1.
 *
 * Text renders in the viewer's system font, so every label is measured generously (0.6 em
 * per character for the sans, 0.62 for mono) with 20 percent slack on top, and the build
 * throws if a label would not fit the space it is given.
 */

import { NAVY, MINT, WHITE, FONT, MONO, theme, RADIUS, STROKE, esc, svg } from './tokens.mjs'
import { TEAM, GATES, LOOP } from './team.mjs'

// ---------------------------------------------------------------------------------------
// Names

const AGENTS = new Map(TEAM.map((a) => [a.name, a]))
const GATE_NAMES = new Set(GATES.map((g) => g.name))
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const PRODUCT_LEAD = 'Product Lead'

/** An agent name, checked against the roster so a typo fails the build. */
function agent(name) {
  if (!AGENTS.has(name)) throw new Error(`diagrams: unknown agent "${name}"`)
  return name
}

/** The gate an agent owns, checked against the gate list. */
function gateOf(name) {
  const gate = AGENTS.get(agent(name)).gate
  if (!GATE_NAMES.has(gate)) throw new Error(`diagrams: ${name} owns no gate in GATES`)
  return gate
}

function word(n) {
  if (!WORDS[n]) throw new Error(`diagrams: no word for ${n}`)
  return WORDS[n]
}

// ---------------------------------------------------------------------------------------
// Measuring

const EM = { sans: 0.6, mono: 0.62 }
const SLACK = 1.2

/** Estimated rendered width of a label, with the slack already added. */
function measure(label, size, mono = false) {
  return String(label).length * size * (mono ? EM.mono : EM.sans) * SLACK
}

function assertFits(label, size, space, mono = false) {
  const need = measure(label, size, mono)
  if (need > space) {
    throw new Error(`diagrams: "${label}" needs ${Math.ceil(need)}px at ${size}px and has ${Math.floor(space)}px`)
  }
}

function assertRoom(what, need, space) {
  if (need > space) throw new Error(`diagrams: ${what} needs ${Math.ceil(need)}px and has ${Math.floor(space)}px`)
}

/**
 * Breaks a line into the fewest rows that fit, then picks the break with the most even
 * rows, so a caption never ends on one stranded word when a balanced break exists.
 */
function wrap(label, size, space, mono = false) {
  const words = String(label).split(' ')
  for (let rows = 1; rows <= words.length; rows++) {
    let best = null
    for (const cut of partitions(words.length, rows)) {
      const lines = cut.map(([a, b]) => words.slice(a, b).join(' '))
      const widest = Math.max(...lines.map((l) => measure(l, size, mono)))
      if (widest <= space && (!best || widest < best.widest)) best = { lines, widest }
    }
    if (best) return best.lines
  }
  throw new Error(`diagrams: "${label}" cannot wrap into ${space}px`)
}

function* partitions(n, rows, start = 0) {
  if (rows === 1) {
    yield [[start, n]]
    return
  }
  for (let end = start + 1; end <= n - rows + 1; end++) {
    for (const rest of partitions(n, rows - 1, end)) yield [[start, end], ...rest]
  }
}

// ---------------------------------------------------------------------------------------
// Primitives

const num = (n) => +n.toFixed(2)

function attrs(pairs) {
  return Object.entries(pairs)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => ` ${k}="${typeof v === 'number' ? num(v) : v}"`)
    .join('')
}

const rect = (x, y, width, height, a = {}) => `<rect${attrs({ x, y, width, height, ...a })}/>`
const circle = (cx, cy, r, a = {}) => `<circle${attrs({ cx, cy, r, ...a })}/>`
const line = (x1, y1, x2, y2, a = {}) => `<line${attrs({ x1, y1, x2, y2, ...a })}/>`

function text(x, y, content, { size, weight = 400, fill, anchor = 'start', mono = false, opacity, spacing } = {}) {
  return `<text${attrs({
    x, y,
    'font-size': size,
    'font-weight': weight,
    'font-family': mono ? MONO : undefined,
    'letter-spacing': spacing,
    'text-anchor': anchor === 'start' ? undefined : anchor,
    fill,
    'fill-opacity': opacity,
  })}>${esc(content)}</text>`
}

/** Vertical offset from the centre line of a row of text to its baseline. */
const toBaseline = (size) => size * 0.34

/** An orthogonal polyline with every corner rounded. */
function route(points, radius) {
  let d = `M${num(points[0][0])} ${num(points[0][1])}`
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i - 1]
    const [cx, cy] = points[i]
    const [nx, ny] = points[i + 1]
    const inLen = Math.hypot(cx - px, cy - py)
    const outLen = Math.hypot(nx - cx, ny - cy)
    const k = Math.min(radius, inLen / 2, outLen / 2)
    const ax = cx - ((cx - px) / inLen) * k
    const ay = cy - ((cy - py) / inLen) * k
    const bx = cx + ((nx - cx) / outLen) * k
    const by = cy + ((ny - cy) / outLen) * k
    d += ` L${num(ax)} ${num(ay)} Q${num(cx)} ${num(cy)} ${num(bx)} ${num(by)}`
  }
  const [lx, ly] = points[points.length - 1]
  return `${d} L${num(lx)} ${num(ly)}`
}

// ---------------------------------------------------------------------------------------
// Shared parts

/**
 * Connectors are drawn in solid ink inside one group with an opacity, so where two lines
 * share a segment they stay one tone instead of doubling up.
 */
const LINK = { opacity: 0.5, corner: 12, head: 8, halfHead: 4.5, dash: '5 5' }
const TIP_GAP = 2

function links(items) {
  return `<g opacity="${LINK.opacity}">${items.join('')}</g>`
}

/** A connector through `points`, ending in a small arrowhead unless `arrow` is false. */
function link(points, ink, { arrow = true, dashed = false, corner = LINK.corner } = {}) {
  const pts = points.map((p) => [...p])
  let head = ''
  if (arrow) {
    const [ax, ay] = pts[pts.length - 2]
    const [bx, by] = pts[pts.length - 1]
    const len = Math.hypot(bx - ax, by - ay)
    const ux = (bx - ax) / len
    const uy = (by - ay) / len
    const baseX = bx - ux * LINK.head
    const baseY = by - uy * LINK.head
    const px = -uy * LINK.halfHead
    const py = ux * LINK.halfHead
    head = `<path d="M${num(bx)} ${num(by)} L${num(baseX + px)} ${num(baseY + py)} L${num(baseX - px)} ${num(baseY - py)} Z" fill="${ink}"/>`
    pts[pts.length - 1] = [bx - ux * (LINK.head - 1), by - uy * (LINK.head - 1)]
  }
  const body = `<path${attrs({
    d: route(pts, corner),
    fill: 'none',
    stroke: ink,
    'stroke-width': STROKE.line,
    'stroke-linejoin': 'round',
    'stroke-dasharray': dashed ? LINK.dash : undefined,
  })}/>`
  return body + head
}

/** A small filled dot, used where a memory connection meets what it touches. */
const dot = (x, y, ink) => circle(x, y, 3.5, { fill: ink })

/** The rounded card every diagram sits on, so it reads in either GitHub theme. */
function ground(w, h, t) {
  return rect(0.5, 0.5, w - 1, h - 1, { rx: RADIUS.xl, fill: t.bg, stroke: t.line, 'stroke-width': STROKE.hair })
}

/**
 * A node surface. White on paper; on navy an opaque navy base under a faint white wash, so
 * a node stays solid even when it sits on the tinted review band. The Product Lead is drawn
 * in solid ink, the one human in the system.
 */
function surface(x, y, w, h, t, { human = false, rx = RADIUS.md } = {}) {
  if (human) return rect(x, y, w, h, { rx, fill: t.fg })
  if (t.mode === 'light') return rect(x, y, w, h, { rx, fill: WHITE, stroke: t.line, 'stroke-width': STROKE.hair })
  return rect(x, y, w, h, { rx, fill: NAVY }) + rect(x, y, w, h, { rx, fill: t.faint, stroke: t.line, 'stroke-width': STROKE.hair })
}

const chipHeight = (size) => Math.round(size * 1.875)
const chipPad = (size) => Math.round(size * 0.625)
const chipWidth = (label, size, mono = true) => measure(label, size, mono) + 2 * chipPad(size)

/** A gate chip: a mint pill with navy ink, centred on (x, cy) or starting at x. */
function chip(x, cy, label, t, { size = 16, mono = true, anchor = 'middle' } = {}) {
  const w = chipWidth(label, size, mono)
  const h = chipHeight(size)
  const left = anchor === 'middle' ? x - w / 2 : x
  return (
    rect(left, cy - h / 2, w, h, { rx: h / 2, fill: t.accent }) +
    text(left + w / 2, cy + toBaseline(size), label, { size, weight: 600, fill: t.onAccent, anchor: 'middle', mono })
  )
}

function document(w, h, title, t, parts) {
  return svg({ w, h, title, body: `${ground(w, h, t)}\n<g font-family="${FONT}">\n${parts.join('\n')}\n</g>` })
}

// ---------------------------------------------------------------------------------------
// The delivery flow

/**
 * The run from brief to acceptance, top to bottom. Four columns 280 apart, with the gutter
 * centres between them as half steps. Gates with long names sit on vertical connectors,
 * where they have the width; short ones sit on horizontal connectors with at least 24px of
 * line either side.
 */
function flow(t) {
  const W = 1200
  const COL = [180, 460, 740, 1020]
  const GUT = [320, 600, 880]
  const NODE = { w: 236, h: 64, pad: 12, name: 17, caption: 14, captionGap: 8 }
  const GAP = { gate: 88, split: 104, merge: 56, exit: 104, run: 24 }
  const BAND = { x: 48, w: 1104, padTop: 44, padBottom: 16 }
  const CHIP = 16
  const LEFT_EDGE = COL[0] - NODE.w / 2
  const RIGHT_EDGE = COL[3] + NODE.w / 2

  const TITLE_Y = 76
  const R1 = 124
  const R2 = R1 + NODE.h + GAP.split
  const R3 = R2 + NODE.h + GAP.gate
  const R4 = R3 + NODE.h + GAP.gate
  const BAND_TOP = R4 + NODE.h + GAP.merge
  const RB = BAND_TOP + BAND.padTop
  const BAND_BOTTOM = RB + NODE.h + BAND.padBottom
  const R6 = BAND_BOTTOM + GAP.exit
  const R7 = R6 + NODE.h + GAP.gate
  const R8 = R7 + NODE.h + GAP.gate
  const H = R8 + NODE.h + 48

  const SPLIT_CHIP_Y = R1 + NODE.h + 36
  const SPLIT_Y = R1 + NODE.h + 72
  const MERGE_Y = R4 + NODE.h + 28
  const EXIT_CHIP_Y = BAND_BOTTOM + 32
  const EXIT_BUS_Y = BAND_BOTTOM + 76

  // Stage numbers are the run plan's, so parallel roles share one.
  const n = {
    brief: { cx: COL[0], y: R1, name: PRODUCT_LEAD, note: 'brief', human: true },
    plan: { cx: COL[1], y: R1, name: agent('orchestrator'), note: 'plan' },
    history: { cx: COL[2], y: R1, name: agent('bug-historian'), stage: 1, note: 'brief' },
    arch: { cx: COL[3], y: R1, name: agent('tech-architect'), stage: 1 },
    design: { cx: COL[1], y: R2, name: agent('ux-designer'), stage: 2 },
    audit: { cx: COL[2], y: R2, name: agent('ux-auditor'), stage: 3 },
    backend: { cx: COL[3], y: R2, name: agent('backend-engineer'), stage: 2 },
    copy: { cx: COL[2], y: R3, name: agent('ux-writer'), stage: 4 },
    front: { cx: COL[2], y: R4, name: agent('frontend-engineer'), stage: 5 },
    guard: { cx: GUT[0], y: R6, name: agent('bug-historian'), stage: 7, note: 'guard' },
    eng: { cx: GUT[2], y: R6, name: agent('engineering-lead'), stage: 8 },
    test: { cx: GUT[2], y: R7, name: agent('qc-engineer'), stage: 9 },
    lead: { cx: GUT[1], y: R7, name: agent('qc-lead'), stage: 10 },
    release: { cx: COL[0], y: R7, name: agent('release-engineer'), stage: 11 },
    record: { cx: COL[0], y: R8, name: agent('bug-historian'), stage: 12, note: 'record' },
    close: { cx: COL[1], y: R8, name: agent('orchestrator'), note: 'close' },
    accept: { cx: COL[3], y: R8, name: PRODUCT_LEAD, note: 'accepts', human: true },
  }
  const reviewers = TEAM.filter((a) => a.track === 'Review').map((a, i) => ({ cx: COL[i], y: RB, name: a.name, stage: 6 }))

  const left = (node) => node.cx - NODE.w / 2
  const right = (node) => node.cx + NODE.w / 2
  const bottom = (node) => node.y + NODE.h
  const mid = (node) => node.y + NODE.h / 2
  const between = (a, b) => (right(a) + left(b)) / 2
  const ink = t.fg

  // Connectors, in the order the run meets them.
  const L = []
  const row1 = [n.brief, n.plan, n.history, n.arch]
  for (let i = 0; i < row1.length - 1; i++) {
    L.push(link([[right(row1[i]), mid(row1[i])], [left(row1[i + 1]) - TIP_GAP, mid(row1[i + 1])]], ink))
  }
  L.push(link([[n.arch.cx, bottom(n.arch)], [n.arch.cx, SPLIT_Y], [n.design.cx, SPLIT_Y], [n.design.cx, n.design.y - TIP_GAP]], ink))
  L.push(link([[n.arch.cx, bottom(n.arch)], [n.backend.cx, n.backend.y - TIP_GAP]], ink))
  const LOOP_DY = 7
  L.push(link([[right(n.design), mid(n.design) - LOOP_DY], [left(n.audit) - TIP_GAP, mid(n.audit) - LOOP_DY]], ink))
  L.push(link([[left(n.audit), mid(n.audit) + LOOP_DY], [right(n.design) + TIP_GAP, mid(n.design) + LOOP_DY]], ink))
  L.push(link([[n.audit.cx, bottom(n.audit)], [n.copy.cx, n.copy.y - TIP_GAP]], ink))
  L.push(link([[n.copy.cx, bottom(n.copy)], [n.front.cx, n.front.y - TIP_GAP]], ink))
  L.push(link([[n.backend.cx, bottom(n.backend)], [n.backend.cx, MERGE_Y], [GUT[1], MERGE_Y], [GUT[1], BAND_TOP - TIP_GAP]], ink))
  L.push(link([[n.front.cx, bottom(n.front)], [n.front.cx, MERGE_Y]], ink, { arrow: false }))
  const reviewBottom = RB + NODE.h
  L.push(link([[COL[0], reviewBottom], [COL[0], EXIT_BUS_Y], [COL[3], EXIT_BUS_Y], [COL[3], reviewBottom]], ink, { arrow: false }))
  L.push(link([[COL[1], reviewBottom], [COL[1], EXIT_BUS_Y]], ink, { arrow: false }))
  L.push(link([[COL[2], reviewBottom], [COL[2], EXIT_BUS_Y]], ink, { arrow: false }))
  L.push(link([[n.guard.cx, EXIT_BUS_Y], [n.guard.cx, n.guard.y - TIP_GAP]], ink))
  L.push(link([[right(n.guard), mid(n.guard)], [left(n.eng) - TIP_GAP, mid(n.eng)]], ink))
  L.push(link([[n.eng.cx, bottom(n.eng)], [n.test.cx, n.test.y - TIP_GAP]], ink))
  L.push(link([[left(n.test), mid(n.test)], [right(n.lead) + TIP_GAP, mid(n.lead)]], ink))
  L.push(link([[left(n.lead), mid(n.lead)], [right(n.release) + TIP_GAP, mid(n.release)]], ink))
  L.push(link([[n.release.cx, bottom(n.release)], [n.record.cx, n.record.y - TIP_GAP]], ink))
  L.push(link([[right(n.record), mid(n.record)], [left(n.close) - TIP_GAP, mid(n.close)]], ink))
  L.push(link([[right(n.close), mid(n.close)], [left(n.accept) - TIP_GAP, mid(n.accept)]], ink))

  // Gates, each on the connector it guards.
  const onVertical = (node, owner) => [node.cx, bottom(node) + GAP.gate / 2, gateOf(owner)]
  const onHorizontal = (a, b, owner) => {
    const gate = gateOf(owner)
    assertRoom(`the ${gate} chip`, chipWidth(gate, CHIP) + 2 * GAP.run, left(b) - right(a))
    return [between(a, b), mid(a), gate]
  }
  const gates = [
    [n.arch.cx, SPLIT_CHIP_Y, gateOf('tech-architect')],
    onVertical(n.audit, 'ux-auditor'),
    onVertical(n.copy, 'ux-writer'),
    ...reviewers.map((r) => [r.cx, EXIT_CHIP_Y, gateOf(r.name)]),
    onHorizontal(n.guard, n.eng, 'bug-historian'),
    onVertical(n.eng, 'engineering-lead'),
    [(right(n.release) + left(n.lead)) / 2, mid(n.lead), gateOf('qc-lead')],
    onVertical(n.release, 'release-engineer'),
    onHorizontal(n.close, n.accept, 'orchestrator'),
  ]
  assertRoom('the quality chip', chipWidth(gateOf('qc-lead'), CHIP) + 2 * GAP.run, left(n.lead) - right(n.release))
  for (let i = 0; i < reviewers.length - 1; i++) {
    const a = gates[3 + i]
    const b = gates[4 + i]
    assertRoom('the review chips', (chipWidth(a[2], CHIP) + chipWidth(b[2], CHIP)) / 2 + GAP.run, b[0] - a[0])
  }

  const band =
    t.mode === 'light'
      ? rect(BAND.x, BAND_TOP, BAND.w, BAND_BOTTOM - BAND_TOP, { rx: RADIUS.lg, fill: MINT, 'fill-opacity': 0.2 })
      : rect(BAND.x, BAND_TOP, BAND.w, BAND_BOTTOM - BAND_TOP, {
          rx: RADIUS.lg, fill: MINT, 'fill-opacity': 0.1, stroke: MINT, 'stroke-opacity': 0.36, 'stroke-width': STROKE.hair,
        })

  const drawNode = (node) => {
    const x = left(node)
    const nameInk = node.human ? t.bg : t.fg
    const capInk = node.human ? t.bg : t.muted
    const capOpacity = node.human ? 0.72 : undefined
    const inner = NODE.w - 2 * NODE.pad
    assertFits(node.name, NODE.name, inner)
    const capWidth =
      (node.stage ? measure(node.stage, NODE.caption, true) : 0) +
      (node.stage && node.note ? NODE.captionGap : 0) +
      (node.note ? measure(node.note, NODE.caption) : 0)
    assertRoom(`the caption of ${node.name}`, capWidth, inner)
    const spans = []
    if (node.stage) spans.push(`<tspan font-family="${MONO}">${node.stage}</tspan>`)
    if (node.note) spans.push(`<tspan${node.stage ? ` dx="${NODE.captionGap}"` : ''}>${esc(node.note)}</tspan>`)
    const caption = `<text${attrs({
      x: node.cx, y: node.y + 26, 'font-size': NODE.caption, 'text-anchor': 'middle', fill: capInk, 'fill-opacity': capOpacity,
    })}>${spans.join('')}</text>`
    return (
      surface(x, node.y, NODE.w, NODE.h, t, { human: node.human }) +
      caption +
      text(node.cx, node.y + 48, node.name, { size: NODE.name, weight: 600, fill: nameInk, anchor: 'middle' })
    )
  }

  // The legend sits in the open space left of the design track, where nothing else runs.
  const LEGEND = { x: LEFT_EDGE, textX: LEFT_EDGE + 84, size: 16, lead: 22 }
  const legendChip = chipWidth('gate', CHIP)
  const legendLines = ['A gate. The next stage waits', 'until its owner records a pass.']
  const legendNote = 'Stage number, from the run plan'
  const legendRight = left(n.copy) - GAP.run
  for (const l of [...legendLines, legendNote]) assertFits(l, LEGEND.size, legendRight - LEGEND.textX)
  assertRoom('the legend chip', legendChip + 16, LEGEND.textX - LEGEND.x)
  const legendGateY = mid(n.copy)
  const legendStageY = mid(n.front)

  const bandCaptionY = BAND_TOP + 28
  const bandLeft = 'Four independent reviews, in parallel'
  const bandRight = 'All four must pass'
  assertRoom('the band captions', measure(bandLeft, 14) + measure(bandRight, 14) + 2 * GAP.run, RIGHT_EDGE - LEFT_EDGE)
  assertRoom('the band caption', LEFT_EDGE + measure(bandLeft, 14), GUT[1] - GAP.run)

  const parts = [
    band,
    links(L),
    ...Object.values(n).map(drawNode),
    ...reviewers.map(drawNode),
    ...gates.map(([x, y, g]) => chip(x, y, g, t, { size: CHIP })),

    text(LEFT_EDGE, TITLE_Y, 'The delivery flow', { size: 28, weight: 600, fill: t.fg, spacing: -0.4 }),
    text(RIGHT_EDGE, TITLE_Y, 'Read top to bottom', { size: 16, fill: t.muted, anchor: 'end' }),

    text(n.design.cx - 10, R2 - 10, 'design track', { size: 14, fill: t.muted, anchor: 'end' }),
    text(n.backend.cx + 10, R2 - 10, 'build track', { size: 14, fill: t.muted }),
    text(GUT[1], bottom(n.design) + 24, 'until clean', { size: 14, fill: t.muted, anchor: 'middle' }),

    text(LEFT_EDGE, bandCaptionY, bandLeft, { size: 14, fill: t.muted }),
    text(RIGHT_EDGE, bandCaptionY, bandRight, { size: 14, fill: t.muted, anchor: 'end' }),

    chip(LEGEND.x, legendGateY, 'gate', t, { size: CHIP, anchor: 'start' }),
    text(LEGEND.textX, legendGateY - 5, legendLines[0], { size: LEGEND.size, fill: t.muted }),
    text(LEGEND.textX, legendGateY - 5 + LEGEND.lead, legendLines[1], { size: LEGEND.size, fill: t.muted }),
    text(LEGEND.x + legendChip / 2, legendStageY + toBaseline(14), '7', { size: 14, fill: t.muted, anchor: 'middle', mono: true }),
    text(LEGEND.textX, legendStageY + toBaseline(LEGEND.size), legendNote, { size: LEGEND.size, fill: t.muted }),
  ]

  const title = `The delivery flow: from the ${PRODUCT_LEAD}'s brief through ${word(GATES.length)} gates to an accepted release`
  return document(W, H, title, t, parts)
}

// ---------------------------------------------------------------------------------------
// The five-step loop

/**
 * Five stations on one track, 228 apart. Captions are left-aligned under their station and
 * wrap inside the step, so no caption reaches the next one. Review returns to Execute over
 * the top; Hand off leaves to the right through a mint chip, the gate the next role meets.
 */
function loop(t) {
  const W = 1200
  const H = 352
  const M = 40
  const STEP = 228
  const R = 22
  const TITLE_Y = 64
  const ARC_Y = 112
  const TRACK_Y = 170
  const NAME_Y = TRACK_Y + R + 36
  const LINE_Y = NAME_Y + 28
  const LINE_H = 20
  const TEXT_W = STEP - 16
  const SIZE = { title: 26, name: 20, line: 14, numeral: 17, exit: 15 }
  const X = LOOP.map((_, i) => M + R + i * STEP)
  const ink = t.fg

  const L = []
  for (let i = 0; i < X.length - 1; i++) {
    L.push(link([[X[i] + R, TRACK_Y], [X[i + 1] - R - TIP_GAP, TRACK_Y]], ink))
  }
  const review = LOOP.findIndex((s) => s.name === 'Review')
  const execute = LOOP.findIndex((s) => s.name === 'Execute')
  L.push(link([[X[review], TRACK_Y - R], [X[review], ARC_Y], [X[execute], ARC_Y], [X[execute], TRACK_Y - R - TIP_GAP]], ink, { corner: 16 }))
  const exitFrom = X[X.length - 1] + R
  const exitTo = W - M
  L.push(link([[exitFrom, TRACK_Y], [exitTo, TRACK_Y]], ink))
  assertRoom('the exit chip', chipWidth('next role', SIZE.exit, false) + 32, exitTo - exitFrom)

  const stations = LOOP.map((step, i) => {
    const x = X[i]
    const textX = x - R
    const space = i === LOOP.length - 1 ? W - M - textX : TEXT_W
    assertFits(step.name, SIZE.name, space)
    const rows = wrap(step.line, SIZE.line, space)
    return [
      circle(x, TRACK_Y, R, { fill: t.fg }),
      text(x, TRACK_Y + toBaseline(SIZE.numeral), step.n, { size: SIZE.numeral, weight: 600, fill: t.bg, anchor: 'middle', mono: true }),
      text(textX, NAME_Y, step.name, { size: SIZE.name, weight: 600, fill: t.fg }),
      ...rows.map((row, j) => text(textX, LINE_Y + j * LINE_H, row, { size: SIZE.line, fill: t.muted })),
    ].join('')
  })

  const title = `The ${word(LOOP.length)}-step loop`
  const subtitle = 'Every agent runs it inside its own turn'
  assertRoom('the loop header', M + measure(title, SIZE.title) + measure(subtitle, 16) + 48, W - M)

  const parts = [
    links(L),
    ...stations,
    chip((exitFrom + exitTo) / 2, TRACK_Y, 'next role', t, { size: SIZE.exit, mono: false }),
    text((X[execute] + X[review]) / 2, ARC_Y - 12, 'fix', { size: 16, fill: t.muted, anchor: 'middle' }),
    text(M, TITLE_Y, title, { size: SIZE.title, weight: 600, fill: t.fg, spacing: -0.4 }),
    text(W - M, TITLE_Y, subtitle, { size: 16, fill: t.muted, anchor: 'end' }),
  ]
  const alt = `${title}: ${LOOP.map((s) => s.name).join(', ')}. Review returns to Execute to fix; Hand off passes to the next role.`
  return document(W, H, alt, t, parts)
}

// ---------------------------------------------------------------------------------------
// The twelve gates

/**
 * One row per gate, in the order a run meets them: number, gate chip, owner, and the
 * condition that passes it. Columns are fixed; the condition wraps to at most two rows.
 */
function gates(t) {
  const W = 1200
  const M = 56
  const COL = { num: M, chip: 100, owner: 366, pass: 596 }
  const PASS_W = W - M - COL.pass
  const SIZE = { title: 28, sub: 16, head: 14, num: 14, chip: 16, owner: 17, pass: 16 }
  const TITLE_Y = 76
  const SUB_Y = 108
  const HEAD_Y = 164
  const TOP = 180
  const ROW_H = 72
  const LEAD = 22
  const H = TOP + GATES.length * ROW_H + 52

  const rows = GATES.map((g, i) => {
    const top = TOP + i * ROW_H
    const centre = top + ROW_H / 2
    assertRoom(`the ${g.name} chip`, chipWidth(g.name, SIZE.chip), COL.owner - COL.chip - 24)
    assertFits(g.owner, SIZE.owner, COL.pass - COL.owner - 24)
    const lines = wrap(g.passes, SIZE.pass, PASS_W)
    if (lines.length > 2) throw new Error(`diagrams: the ${g.name} condition needs ${lines.length} rows`)
    const first = centre + toBaseline(SIZE.pass) - ((lines.length - 1) * LEAD) / 2
    return [
      text(COL.num, centre + toBaseline(SIZE.num), String(i + 1).padStart(2, '0'), { size: SIZE.num, fill: t.muted, mono: true }),
      chip(COL.chip, centre, g.name, t, { size: SIZE.chip, anchor: 'start' }),
      text(COL.owner, centre + toBaseline(SIZE.owner), agent(g.owner), { size: SIZE.owner, weight: 500, fill: t.fg }),
      ...lines.map((l, j) => text(COL.pass, first + j * LEAD, l, { size: SIZE.pass, fill: t.muted })),
    ].join('')
  })

  const rules = GATES.map((_, i) => TOP + i * ROW_H).concat(TOP + GATES.length * ROW_H)
    .map((y) => line(M, y, W - M, y, { stroke: t.line, 'stroke-width': STROKE.hair }))

  const title = `The ${word(GATES.length)} gates`
  const sub = 'In the order a run meets them. Only the owner records the result, in its handoff.'
  assertFits(sub, SIZE.sub, W - 2 * M)

  const parts = [
    ...rules,
    ...rows,
    text(M, TITLE_Y, title, { size: SIZE.title, weight: 600, fill: t.fg, spacing: -0.4 }),
    text(M, SUB_Y, sub, { size: SIZE.sub, fill: t.muted }),
    text(COL.chip, HEAD_Y, 'Gate', { size: SIZE.head, weight: 600, fill: t.muted }),
    text(COL.owner, HEAD_Y, 'Owner', { size: SIZE.head, weight: 600, fill: t.muted }),
    text(COL.pass, HEAD_Y, 'Passes when', { size: SIZE.head, weight: 600, fill: t.muted }),
  ]
  const alt = `${title}, in order: ${GATES.map((g) => `${g.name}, owned by ${g.owner}`).join('; ')}`
  return document(W, H, alt, t, parts)
}

// ---------------------------------------------------------------------------------------
// The team by layer

/**
 * The Product Lead, then the orchestrator, then the three leads, then the specialists in
 * four track panels. bug-historian sits at the side as memory, with dashed connections to
 * the three points it joins a run: the start, the guard after review, and the close.
 */
function roster(t) {
  const W = 1200
  const M = 48
  const CX = 600
  const CARD = { w: 232, h: 52, gated: 84, name: 16, chip: 14 }
  const L2_X = [340, 600, 860]
  const PANEL = { x: [48, 324, 600, 876], w: 260, pad: 16, head: 44, gap: 12, h: 432 }
  const MEMORY = { x: 884, w: 252, card: 220, top: 196, rail: 1060 }
  const Y = { title: 76, sub: 108, l0: 144, l1: 236, l2: 372, l3: 528 }
  const BUS_Y = Y.l1 + CARD.gated + 26
  const GUARD_Y = Y.l2 + CARD.gated + 36
  const H = Y.l3 + PANEL.h + 48
  const ink = t.fg

  const drawCard = (cx, y, name, { w = CARD.w, gate = null, human = false } = {}) => {
    const h = gate ? CARD.gated : CARD.h
    assertFits(name, CARD.name, w - 20)
    if (gate) assertRoom(`the ${gate} chip`, chipWidth(gate, CARD.chip), w - 16)
    return (
      surface(cx - w / 2, y, w, h, t, { human }) +
      text(cx, y + 32, name, { size: CARD.name, weight: 600, fill: human ? t.bg : t.fg, anchor: 'middle' }) +
      (gate ? chip(cx, y + 58, gate, t, { size: CARD.chip }) : '')
    )
  }

  const layer = (y, code, words) =>
    `<text${attrs({ x: M, y, 'font-size': 14, fill: t.muted })}><tspan font-family="${MONO}">${code}</tspan><tspan dx="8">${esc(words)}</tspan></text>`

  const leads = ['tech-architect', 'engineering-lead', 'qc-lead'].map(agent)
  const tracks = [
    { title: 'Design', tracks: ['Design'] },
    { title: 'Build', tracks: ['Build'] },
    { title: 'Review', tracks: ['Review'] },
    { title: 'Quality and release', tracks: ['Quality', 'Release'] },
  ]

  const panels = tracks.map((group, i) => {
    const px = PANEL.x[i]
    const members = TEAM.filter((a) => a.layer === 'L3' && group.tracks.includes(a.track))
    let y = Y.l3 + PANEL.head
    const cards = members.map((a) => {
      const out = drawCard(px + PANEL.w / 2, y, a.name, { w: PANEL.w - 2 * PANEL.pad, gate: a.gate })
      y += (a.gate ? CARD.gated : CARD.h) + PANEL.gap
      return out
    })
    assertRoom(`the ${group.title} panel`, y - PANEL.gap + PANEL.pad, Y.l3 + PANEL.h)
    assertFits(group.title, 15, PANEL.w - 2 * PANEL.pad)
    return (
      rect(px, Y.l3, PANEL.w, PANEL.h, { rx: RADIUS.lg, fill: t.faint }) +
      text(px + PANEL.pad, Y.l3 + 28, group.title, { size: 15, weight: 600, fill: t.muted }) +
      cards.join('')
    )
  })

  const orchRight = CX + CARD.w / 2
  const orchMid = Y.l1 + CARD.gated / 2
  const memoryCardX = MEMORY.x + (MEMORY.w - MEMORY.card) / 2
  const memoryBottom = Y.l1 + CARD.gated + 16
  const review = PANEL.x[2] + PANEL.w / 2
  assertRoom('the reporting bus', MEMORY.x - (L2_X[2] + LINK.corner), MEMORY.x)
  assertRoom('the memory rail', L2_X[2] + CARD.w / 2 + 48, MEMORY.rail)

  const reporting = [
    link([[CX, Y.l0 + CARD.h], [CX, Y.l1]], ink, { arrow: false }),
    link([[CX, Y.l1 + CARD.gated], [CX, Y.l2]], ink, { arrow: false }),
    link([[L2_X[0], Y.l2], [L2_X[0], BUS_Y], [L2_X[2], BUS_Y], [L2_X[2], Y.l2]], ink, { arrow: false }),
  ]
  const memory = [
    link([[orchRight, orchMid], [MEMORY.x, orchMid]], ink, { arrow: false, dashed: true }),
    link([[MEMORY.rail, Y.l1 + CARD.gated], [MEMORY.rail, GUARD_Y], [review, GUARD_Y], [review, Y.l3]], ink, { arrow: false, dashed: true }),
    link([[MEMORY.rail, GUARD_Y], [MEMORY.rail, Y.l3]], ink, { arrow: false, dashed: true }),
    dot(orchRight, orchMid, ink),
    dot(review, Y.l3, ink),
    dot(MEMORY.rail, Y.l3, ink),
  ]

  const sub = 'Solid lines are reporting. Dashed lines mark where memory joins the run.'
  assertFits(sub, 16, W - 2 * M)

  const parts = [
    rect(MEMORY.x, MEMORY.top, MEMORY.w, memoryBottom - MEMORY.top, { rx: RADIUS.lg, fill: t.faint }),
    ...panels,
    links([...reporting, ...memory]),
    drawCard(CX, Y.l0, PRODUCT_LEAD, { human: true }),
    drawCard(CX, Y.l1, agent('orchestrator'), { gate: gateOf('orchestrator') }),
    ...leads.map((name, i) => drawCard(L2_X[i], Y.l2, name, { gate: gateOf(name) })),
    drawCard(memoryCardX + MEMORY.card / 2, Y.l1, agent('bug-historian'), { w: MEMORY.card, gate: gateOf('bug-historian') }),

    text(M, Y.title, 'The team, by layer', { size: 28, weight: 600, fill: t.fg, spacing: -0.4 }),
    text(M, Y.sub, sub, { size: 16, fill: t.muted }),
    layer(Y.l0 + 32, 'L0', 'human'),
    layer(Y.l1 + 32, 'L1', 'the run'),
    layer(Y.l2 + 32, 'L2', 'leads'),
    layer(Y.l3 - 16, 'L3', 'specialists, by track'),
    text(memoryCardX, Y.l1 - 14, 'Memory', { size: 14, weight: 600, fill: t.muted }),
    text((orchRight + MEMORY.x) / 2, orchMid - 10, 'start', { size: 14, fill: t.muted, anchor: 'middle' }),
    text((review + MEMORY.rail) / 2, GUARD_Y - 8, 'guard', { size: 14, fill: t.muted, anchor: 'middle' }),
    text(MEMORY.rail + 10, Y.l3 - 12, 'close', { size: 14, fill: t.muted }),
  ]
  const alt = `The team, by layer: the ${PRODUCT_LEAD}; the orchestrator; ${leads.join(', ')}; the specialists by track; bug-historian as memory at the start, the guard and the close`
  return document(W, H, alt, t, parts)
}

// ---------------------------------------------------------------------------------------
// The security gate

/** The passes of the security sweep, in the order the security catalogue runs them. */
const SECURITY_PASSES = [
  { title: 'Secrets and keys', line: 'Keys and passwords in the diff, the tree and every commit.' },
  { title: 'Exposure and configuration', line: 'Open data stores and endpoints, storage, client variables, CORS.' },
  { title: 'Authentication and access control', line: 'Decided on the server, IDOR probed as every role, every route in.' },
  { title: 'Injection and dangerous functions', line: 'SQL, XSS, command and template injection, eval and its relatives.' },
  { title: 'Dependencies and supply chain', line: 'Every new package proved real, the audit clean of known CVEs.' },
  { title: 'Data handling', line: 'Client storage, data in URLs and logs, headers, CSRF, rate limits.' },
  { title: 'Failure handling', line: 'Every failure path run, nothing swallowed, errors and logs clean.' },
]

/** A numbered checklist with drawn ticks, one row per pass, and the gate's authority below. */
function security(t) {
  const W = 1200
  const M = 64
  const COL = { num: M, tick: 132, text: 168 }
  const SIZE = { title: 32, sub: 16, num: 16, pass: 20, line: 16, foot: 16, owner: 16, chip: 16 }
  const TICK_R = 15
  const TITLE_Y = 88
  const SUB_Y = 124
  const RULE_Y = 156
  const ROW_H = 76
  const FOOT_Y = RULE_Y + SECURITY_PASSES.length * ROW_H + 44
  const H = FOOT_Y + 56

  const gate = GATES.find((g) => g.name === 'security')
  const owner = `owned by ${agent(gate.owner)}`
  const ownerW = measure(owner, SIZE.owner)
  const chipW = chipWidth(gate.name, SIZE.chip)
  const chipX = W - M - ownerW - 12 - chipW
  const title = 'The security gate'
  assertRoom('the security header', M + measure(title, SIZE.title) + 48, chipX)

  const rows = SECURITY_PASSES.map((p, i) => {
    const top = RULE_Y + i * ROW_H
    const cy = top + 38
    assertFits(p.title, SIZE.pass, W - M - COL.text)
    assertFits(p.line, SIZE.line, W - M - COL.text)
    const tick = `M${num(COL.tick - 6)} ${num(cy + 0.5)} L${num(COL.tick - 1.5)} ${num(cy + 5)} L${num(COL.tick + 6.5)} ${num(cy - 5)}`
    return [
      text(COL.num, cy + toBaseline(SIZE.num), String(i + 1).padStart(2, '0'), { size: SIZE.num, fill: t.muted, mono: true }),
      circle(COL.tick, cy, TICK_R, { fill: t.accent }),
      `<path${attrs({ d: tick, fill: 'none', stroke: t.onAccent, 'stroke-width': STROKE.bold, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })}/>`,
      text(COL.text, top + 32, p.title, { size: SIZE.pass, weight: 600, fill: t.fg }),
      text(COL.text, top + 56, p.line, { size: SIZE.line, fill: t.muted }),
    ].join('')
  })

  const rules = SECURITY_PASSES.map((_, i) => RULE_Y + i * ROW_H).concat(RULE_Y + SECURITY_PASSES.length * ROW_H)
    .map((y) => line(M, y, W - M, y, { stroke: t.line, 'stroke-width': STROKE.hair }))

  const sub = 'Run on every diff, in this order. Every pass keeps its output as evidence, clean or not.'
  const foot = 'Blocks on its own authority. Critical and high findings are fixed or accepted in writing.'
  assertFits(sub, SIZE.sub, W - 2 * M)
  assertFits(foot, SIZE.foot, W - 2 * M)

  const parts = [
    ...rules,
    ...rows,
    text(M, TITLE_Y, title, { size: SIZE.title, weight: 600, fill: t.fg, spacing: -0.5 }),
    chip(chipX, TITLE_Y - 6, gate.name, t, { size: SIZE.chip, anchor: 'start' }),
    text(W - M, TITLE_Y, owner, { size: SIZE.owner, fill: t.muted, anchor: 'end' }),
    text(M, SUB_Y, sub, { size: SIZE.sub, fill: t.muted }),
    text(M, FOOT_Y, foot, { size: SIZE.foot, weight: 500, fill: t.fg }),
  ]
  const alt = `${title}, owned by ${gate.owner}. The sweep, in order: ${SECURITY_PASSES.map((p) => p.title).join('; ')}. ${foot}`
  return document(W, H, alt, t, parts)
}

// ---------------------------------------------------------------------------------------

const DIAGRAMS = { flow, loop, gates, roster, security }

export function diagrams() {
  const out = []
  for (const [name, draw] of Object.entries(DIAGRAMS)) {
    for (const mode of ['light', 'dark']) out.push({ file: `${name}-${mode}.svg`, svg: draw(theme(mode)) })
  }
  return out
}
