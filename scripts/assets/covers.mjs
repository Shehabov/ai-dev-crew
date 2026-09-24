/**
 * The covers: the repository hero and one card per agent.
 *
 * Every colour, font and radius comes from tokens.mjs and every name, line and gate from
 * team.mjs, so the art never disagrees with the docs. Text renders in the viewer's system
 * font, so every label is measured with a deliberately wide estimate and must leave 20
 * percent of its room unused. A label that does not fit throws, and the build reports it
 * instead of writing an image with text over an edge.
 *
 * Hero, 1280 x 640, navy card with radius 28:
 *   side margins 88. The mark is a 376px square flush to the right margin and centred
 *   vertically (y 132 to 508). The text column starts at x 88 and ends 48px before the mark.
 *   The label's cap line sits on the mark's top edge; the address sits on its bottom edge.
 *
 * Agent card, 640 x 400, navy card with radius 28:
 *   padding 40 on every side. Header baseline 53, hairline rule at 76. Glyph box 192 x 128
 *   centred at (320, 184). Name baseline 316, line baseline 356. The gate pill sits on the
 *   name row, flush right.
 */

import { NAVY, MINT, WHITE, FONT, MONO, RADIUS, STROKE, SPACE, theme, esc, svg } from './tokens.mjs'
import { TEAM } from './team.mjs'

const INK = theme('dark')

/** White at opacities the theme roles do not name. */
const ALPHA = {
  glyph: 0.8, // every white stroke in an agent glyph
  quiet: 0.56, // the layer label and the hero address
  outline: 0.32, // the sixteen outlines of the hero mark
}

/* Measuring text ------------------------------------------------------------------------ */

/** Advance per character as a share of the font size. Wider than any real system font. */
const ADVANCE = { sans: 0.6, caps: 0.72, mono: 0.62 }
/** A label may use at most 1 / SLACK of its room. */
const SLACK = 1.2
/** Cap height as a share of the font size, used to place baselines. */
const CAP = 0.72

const round2 = (v) => Math.round(v * 100) / 100

function textWidth(text, size, kind = 'sans', tracking = 0) {
  return [...text].length * (size * ADVANCE[kind] + tracking)
}

function assertFits(what, width, room) {
  if (width * SLACK > room) {
    throw new Error(`${what} needs ${Math.ceil(width * SLACK)}px with slack and has ${room}px`)
  }
}

/** Greedy word wrap against the slack rule. */
function wrap(text, size, room) {
  const lines = ['']
  for (const word of text.split(' ')) {
    const last = lines[lines.length - 1]
    const next = last ? `${last} ${word}` : word
    if (!last || textWidth(next, size) * SLACK <= room) lines[lines.length - 1] = next
    else lines.push(word)
  }
  return lines
}

/* Drawing ------------------------------------------------------------------------------- */

function text({ x, y, size, content, family = FONT, weight = 400, fill = WHITE, opacity, anchor, tracking }) {
  const attrs = [
    `x="${x}"`,
    `y="${y}"`,
    `font-family="${family}"`,
    `font-size="${size}"`,
    weight === 400 ? '' : `font-weight="${weight}"`,
    anchor ? `text-anchor="${anchor}"` : '',
    tracking ? `letter-spacing="${tracking}"` : '',
    `fill="${fill}"`,
    opacity === undefined ? '' : `fill-opacity="${opacity}"`,
  ]
  return `<text ${attrs.filter(Boolean).join(' ')}>${content}</text>`
}

const line = (x1, y1, x2, y2, extra = '') =>
  `<line x1="${round2(x1)}" y1="${round2(y1)}" x2="${round2(x2)}" y2="${round2(y2)}"${extra}/>`
const rect = (x, y, w, h, rx = 0, extra = '') =>
  `<rect x="${round2(x)}" y="${round2(y)}" width="${round2(w)}" height="${round2(h)}"${rx ? ` rx="${rx}"` : ''}${extra}/>`
const circle = (cx, cy, r, extra = '') => `<circle cx="${round2(cx)}" cy="${round2(cy)}" r="${r}"${extra}/>`
const path = (d, extra = '') => `<path d="${d}"${extra}/>`

/** The one accent in a glyph: a mint line one step heavier than the white strokes, or a mint fill. */
const MINT_LINE = ` fill="none" stroke="${MINT}" stroke-width="${STROKE.bold}" stroke-linecap="round" stroke-linejoin="round"`
const MINT_FILL = ` fill="${MINT}"`
const NAVY_FILL = ` fill="${NAVY}"`
const WHITE_DOT = ` fill="${WHITE}" stroke="none"`

/**
 * A polyline through `points` with each corner rounded to radius `r`. Corners are right
 * angles here, so each rounding is a quarter circle that stays inside the cell it turns in.
 */
function roundedPolyline(points, r) {
  const unit = (a, b) => {
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    return { x: (b.x - a.x) / len, y: (b.y - a.y) / len }
  }
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length - 1; i++) {
    const [p0, p1, p2] = [points[i - 1], points[i], points[i + 1]]
    const u1 = unit(p0, p1)
    const u2 = unit(p1, p2)
    const sweep = u1.x * u2.y - u1.y * u2.x > 0 ? 1 : 0
    const inX = round2(p1.x - u1.x * r)
    const inY = round2(p1.y - u1.y * r)
    const outX = round2(p1.x + u2.x * r)
    const outY = round2(p1.y + u2.y * r)
    d += ` L ${inX} ${inY} A ${r} ${r} 0 0 ${sweep} ${outX} ${outY}`
  }
  const end = points[points.length - 1]
  return `${d} L ${end.x} ${end.y}`
}

/** Drop the points that sit on a straight run, so only the corners are rounded. */
function corners(points) {
  return points.filter((p, i) => {
    if (i === 0 || i === points.length - 1) return true
    const a = points[i - 1]
    const b = points[i + 1]
    return (p.x - a.x) * (b.y - p.y) - (p.y - a.y) * (b.x - p.x) !== 0
  })
}

/* Hero ---------------------------------------------------------------------------------- */

const HERO = {
  W: 1280,
  H: 640,
  MARGIN: 88,
  CELL: 76,
  GAP: SPACE[5], // 24
  GUTTER: SPACE[7], // 48, between the text column and the mark
}
HERO.PITCH = HERO.CELL + HERO.GAP // 100
HERO.MARK = 4 * HERO.CELL + 3 * HERO.GAP // 376
HERO.MARK_X = HERO.W - HERO.MARGIN - HERO.MARK // 816
HERO.MARK_Y = (HERO.H - HERO.MARK) / 2 // 132
HERO.COLUMN = HERO.MARK_X - HERO.GUTTER - HERO.MARGIN // 680

const HERO_TEXT = {
  label: { text: 'CLAUDE CODE AGENTS', size: 16, tracking: 3 },
  title: { lines: ['Shehab’s', 'Dev Team'], size: 84, lead: 92, tracking: -1.5 },
  lede: { lines: ['A plug-and-play product team.', 'Sixteen roles. A gate at every handoff.'], size: 24, lead: 36 },
  address: { text: 'github.com/Shehabov/dev-team', size: 16 },
}

/**
 * The agents in the mark run as a column serpentine: down the first column, up the second,
 * down the third, up the fourth. The path never moves left, so work only moves forward, and
 * it ends on release-engineer at the top right.
 */
function serpentine(k) {
  const col = Math.floor(k / 4)
  const step = k % 4
  return { col, row: col % 2 === 0 ? step : 3 - step }
}

function hero() {
  const { W, H, MARGIN, CELL, PITCH, MARK, MARK_X, MARK_Y, COLUMN } = HERO
  const { label, title, lede, address } = HERO_TEXT

  // Vertical rhythm, top to bottom. The label's cap line meets the mark's top edge.
  const labelY = MARK_Y + Math.round(CAP * label.size) // 144
  const titleY = labelY + SPACE[6] + Math.round(CAP * title.size) // 236, then 328
  const titleLastY = titleY + title.lead * (title.lines.length - 1)
  const ledeY = titleLastY + SPACE[7] + Math.round(CAP * lede.size) // 393, then 429
  const addressY = MARK_Y + MARK // 508, the mark's bottom edge

  assertFits('hero label', textWidth(label.text, label.size, 'caps', label.tracking), COLUMN)
  for (const t of title.lines) assertFits(`hero title "${t}"`, textWidth(t, title.size), COLUMN)
  for (const t of lede.lines) assertFits(`hero lede "${t}"`, textWidth(t, lede.size), COLUMN)
  assertFits('hero address', textWidth(address.text, address.size, 'mono'), COLUMN)

  const cells = TEAM.map((agent, k) => {
    const { col, row } = serpentine(k)
    const x = MARK_X + col * PITCH
    const y = MARK_Y + row * PITCH
    return { agent, x, y, cx: x + CELL / 2, cy: y + CELL / 2 }
  })
  const last = cells[cells.length - 1]
  const route = roundedPolyline(corners(cells.map((c) => ({ x: c.cx, y: c.cy }))), RADIUS.lg)

  const body = [
    rect(0, 0, W, H, RADIUS.xl, NAVY_FILL),
    text({ x: MARGIN, y: labelY, size: label.size, weight: 600, tracking: label.tracking, fill: MINT, content: esc(label.text) }),
    ...title.lines.map((t, i) =>
      text({ x: MARGIN, y: titleY + i * title.lead, size: title.size, weight: 600, tracking: title.tracking, content: esc(t) }),
    ),
    ...lede.lines.map((t, i) => text({ x: MARGIN, y: ledeY + i * lede.lead, size: lede.size, fill: INK.muted, content: esc(t) })),
    text({ x: MARGIN, y: addressY, size: address.size, family: MONO, opacity: ALPHA.quiet, content: esc(address.text) }),
    `<g fill="none" stroke="${WHITE}" stroke-width="${STROKE.hair}" opacity="${ALPHA.outline}">`,
    ...cells.slice(0, -1).map((c) => rect(c.x, c.y, CELL, CELL, RADIUS.md)),
    '</g>',
    path(route, MINT_LINE),
    rect(last.x, last.y, CELL, CELL, RADIUS.md, MINT_FILL),
  ]

  return svg({
    w: W,
    h: H,
    title: "Shehab's Dev Team: a plug-and-play product team of sixteen Claude Code agents, with a gate at every handoff.",
    body: body.join('\n'),
  })
}

/* Agent cards --------------------------------------------------------------------------- */

const CARD = { W: 640, H: 400, PAD: 40 }
const CARD_HEAD = { baseline: 53, rule: 76, number: 18, label: 13, tracking: 1.8, partGap: 10 }
const CARD_NAME = { size: 34, tracking: -0.5, toLine: 40 }
const CARD_LINE = { size: 16, lead: 24, lastBaseline: 356 }
const CARD_PILL = { h: 28, size: 13, pad: 10 }
const GLYPH = { cx: 320, cy: 184, w: 192, h: 128 }

/**
 * One glyph per agent, drawn in a 192 x 128 box around (0, 0): white strokes, returned as
 * `white`, and exactly one mint element, returned as `mint`.
 */
const GLYPHS = {
  /** A hub with spokes to six nodes. The hub is mint: the one role that dispatches. */
  orchestrator() {
    const ORBIT = 62
    const NODE = 8
    const HUB = 12
    const CLEAR = 8
    const white = [0, 60, 120, 180, 240, 300]
      .map((deg) => {
        const a = (deg * Math.PI) / 180
        const [c, s] = [Math.cos(a), Math.sin(a)]
        return line((HUB + CLEAR) * c, (HUB + CLEAR) * s, (ORBIT - NODE) * c, (ORBIT - NODE) * s) + circle(ORBIT * c, ORBIT * s, NODE)
      })
      .join('')
    return { white, mint: circle(0, 0, HUB, MINT_FILL) }
  },

  /** A ruled ledger with a margin and numbered rows. One entry is written, in mint. */
  'bug-historian'() {
    const RULES = [-48, -16, 16, 48]
    const ROWS = [-32, 0, 32]
    const MARGIN = -44
    const white =
      RULES.map((y) => line(-80, y, 80, y)).join('') +
      line(MARGIN, -64, MARGIN, 64) +
      ROWS.map((y) => line(-68, y, -56, y)).join('')
    return { white, mint: line(-28, 0, 56, 0, MINT_LINE) }
  },

  /** A dot grid with two posts. The beam across them is mint. */
  'tech-architect'() {
    const COLS = [-80, -48, -16, 16, 48, 80]
    const ROWS = [-48, -16, 16, 48]
    const BEAM = -16
    const POSTS = [-48, 48]
    const FOOT = 48
    const DOT = 1.75
    const dots = COLS.flatMap((x) => ROWS.map((y) => [x, y]))
      .filter(([x, y]) => y !== BEAM && !(POSTS.includes(x) && y > BEAM))
      .map(([x, y]) => circle(x, y, DOT, WHITE_DOT))
      .join('')
    const posts = POSTS.map((x) => line(x, BEAM, x, FOOT)).join('')
    return { white: dots + posts, mint: line(-80, BEAM, 80, BEAM, MINT_LINE) }
  },

  /** Nested frames of a screen. One card is selected, with handles, in mint. */
  'ux-designer'() {
    const SEL = { x: -12, y: -36, w: 76, h: 30 }
    const HANDLE = 6
    const white =
      rect(-88, -60, 176, 120, RADIUS.md) +
      rect(-76, -48, 40, 96, RADIUS.sm) +
      rect(-24, -48, 100, 96, RADIUS.sm) +
      rect(-12, 6, 76, 30, RADIUS.sm)
    const handles = [
      [SEL.x, SEL.y],
      [SEL.x + SEL.w, SEL.y],
      [SEL.x, SEL.y + SEL.h],
      [SEL.x + SEL.w, SEL.y + SEL.h],
    ]
      .map(([x, y]) => rect(x - HANDLE / 2, y - HANDLE / 2, HANDLE, HANDLE, 0, MINT_FILL))
      .join('')
    return { white, mint: `<g>${rect(SEL.x, SEL.y, SEL.w, SEL.h, 0, MINT_LINE)}${handles}</g>` }
  },

  /** An element above a ruler. The measurement between them is mint. */
  'ux-auditor'() {
    const RULER_Y = 16
    const ticks = Array.from({ length: 11 }, (_, k) => {
      const x = -80 + 16 * k
      return line(x, RULER_Y, x, RULER_Y + (k % 2 ? 8 : 16))
    }).join('')
    const white = rect(-88, RULER_Y, 176, 40, RADIUS.sm) + ticks + rect(-48, -60, 96, 40, RADIUS.sm)
    return { white, mint: path('M -48 -10 V 6 M -48 -2 H 48 M 48 -10 V 6', MINT_LINE) }
  },

  /** Two letters on a baseline, under a dotted x-height. The text cursor is mint. */
  'ux-writer'() {
    const BASE = 32
    const XH = -8
    const ASC = -48
    const R = (BASE - XH) / 2
    const MID = BASE - R
    const white =
      line(-88, BASE, 88, BASE) +
      line(-88, XH, 88, XH, ' stroke-dasharray="2 6"') +
      circle(-40, MID, R) +
      line(-20, XH, -20, BASE) +
      line(0, ASC, 0, BASE) +
      circle(20, MID, R)
    return { white, mint: line(60, ASC - 4, 60, BASE + 12, MINT_LINE) }
  },

  /** A cylinder of stacked layers. One layer is mint. */
  'backend-engineer'() {
    const RX = 64
    const RY = 16
    const TOP = -45
    const BOTTOM = 45
    const front = (cy, extra = '') => path(`M ${-RX} ${cy} A ${RX} ${RY} 0 0 0 ${RX} ${cy}`, extra)
    const white =
      `<ellipse cx="0" cy="${TOP}" rx="${RX}" ry="${RY}"/>` +
      line(-RX, TOP, -RX, BOTTOM) +
      line(RX, TOP, RX, BOTTOM) +
      front(BOTTOM) +
      front(15)
    return { white, mint: front(-15, MINT_LINE) }
  },

  /** A window with blocks. One block is built, in mint. */
  'frontend-engineer'() {
    const BAR = -36
    const white =
      rect(-88, -60, 176, 120, RADIUS.md) +
      line(-88, BAR, 88, BAR) +
      [-72, -60, -48].map((x) => circle(x, -48, 3.5)).join('') +
      rect(-76, -24, 152, 18, RADIUS.sm) +
      rect(-76, 4, 44, 44, RADIUS.sm) +
      rect(32, 4, 44, 44, RADIUS.sm)
    return { white, mint: rect(-22, 4, 44, 44, RADIUS.sm, MINT_FILL) }
  },

  /** Two overlapping circles, two readers. Where they agree is mint. */
  'peer-reviewer'() {
    const R = 52
    const C = 30
    const h = round2(Math.sqrt(R * R - C * C))
    const white = circle(-C, 0, R) + circle(C, 0, R)
    return { white, mint: path(`M 0 ${-h} A ${R} ${R} 0 0 1 0 ${h} A ${R} ${R} 0 0 1 0 ${-h} Z`, MINT_FILL) }
  },

  /** A column of code bars, one flagged by a marker. The flagged bar is mint. */
  'code-analyst'() {
    const LEVELS = [0, 1, 1, 2, 1, 0]
    const LENGTHS = [120, 88, 112, 104, 72, 56]
    const FLAG = 3
    const BAR = 10
    const bar = (i, extra = '') => rect(-58 + 16 * LEVELS[i], -50 + 20 * i - BAR / 2, LENGTHS[i], BAR, BAR / 2, extra)
    const flagY = -50 + 20 * FLAG
    const white =
      LEVELS.map((_, i) => (i === FLAG ? '' : bar(i))).join('') + path(`M -78 ${flagY - 6} L -72 ${flagY} L -78 ${flagY + 6}`)
    return { white, mint: bar(FLAG, MINT_FILL) }
  },

  /** Lines of equal length in strict indentation. The indent guide is mint. */
  'code-steward'() {
    const LEVELS = [0, 1, 2, 2, 1, 0]
    const START = -72
    const INDENT = 24
    const LENGTH = 96
    const white = LEVELS.map((lv, i) => {
      const x = START + INDENT * lv
      const y = -50 + 20 * i
      return line(x, y, x + LENGTH, y)
    }).join('')
    return { white, mint: line(START, -38, START, 38, MINT_LINE) }
  },

  /** A padlock of plain geometry. The keyhole is mint. */
  'security-analyst'() {
    const TOP = -4
    const SHACKLE = 34
    const white =
      rect(-60, TOP, 120, 68, RADIUS.md) +
      path(`M ${-SHACKLE} ${TOP} V -30 A ${SHACKLE} ${SHACKLE} 0 0 1 ${SHACKLE} -30 V ${TOP}`)
    const R = 9
    const CY = 22
    const sy = round2(CY + Math.sqrt(R * R - 4.5 * 4.5))
    return { white, mint: path(`M -4.5 ${sy} A ${R} ${R} 0 1 1 4.5 ${sy} L 6 44 L -6 44 Z`, MINT_FILL) }
  },

  /** Two parts, a tab and a notch, joined along a mint seam. */
  'engineering-lead'() {
    const R = RADIUS.md
    const left = `M -6 -48 H ${-88 + R} A ${R} ${R} 0 0 0 -88 ${-48 + R} V ${48 - R} A ${R} ${R} 0 0 0 ${-88 + R} 48 H -6 V 10 H 10 V -10 H -6 Z`
    const right = `M 6 -48 H ${88 - R} A ${R} ${R} 0 0 1 88 ${-48 + R} V ${48 - R} A ${R} ${R} 0 0 1 ${88 - R} 48 H 6 V 22 H 22 V -22 H 6 Z`
    return { white: path(left) + path(right), mint: path('M 0 -48 V -16 H 16 V 16 H 0 V 48', MINT_LINE) }
  },

  /** A grid of check boxes. One is checked, in mint. */
  'qc-engineer'() {
    const BOX = 28
    const GAP = 16
    const COLS = 4
    const ROWS = 3
    const CHECKED = { col: 2, row: 1 }
    const x0 = -(COLS * BOX + (COLS - 1) * GAP) / 2
    const y0 = -(ROWS * BOX + (ROWS - 1) * GAP) / 2
    const at = (col, row) => [x0 + col * (BOX + GAP), y0 + row * (BOX + GAP)]
    const white = []
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (col === CHECKED.col && row === CHECKED.row) continue
        const [x, y] = at(col, row)
        white.push(rect(x, y, BOX, BOX, RADIUS.sm))
      }
    }
    const [bx, by] = at(CHECKED.col, CHECKED.row)
    const tick = `M ${bx + 8} ${by + 14.5} L ${bx + 12.5} ${by + 19} L ${bx + 20} ${by + 9.5}`
    const mint = `<g>${rect(bx, by, BOX, BOX, RADIUS.sm, MINT_FILL)}${path(
      tick,
      ` fill="none" stroke="${NAVY}" stroke-width="${STROKE.bold}" stroke-linecap="round" stroke-linejoin="round"`,
    )}</g>`
    return { white: white.join(''), mint }
  },

  /** A two-position switch. The knob stands at go, in mint. */
  'qc-lead'() {
    const W = 176
    const H = 88
    const KNOB = 32
    const white = rect(-W / 2, -H / 2, W, H, H / 2) + circle(-(W / 2 - H / 2), 0, 6)
    return { white, mint: circle(W / 2 - H / 2, 0, KNOB, MINT_FILL) }
  },

  /** A history line with commits. The release leaves it as a mint arrow. */
  'release-engineer'() {
    const BASE = 48
    const NODE = 6
    const white = line(-88, BASE, 88, BASE) + [-72, -36, 0].map((x) => circle(x, BASE, NODE, NAVY_FILL)).join('')
    return { white, mint: path(`M ${NODE} ${BASE} H 20 A 32 32 0 0 0 52 16 V -44 M 38 -30 L 52 -44 L 66 -30`, MINT_LINE) }
  },
}

function layerParts(agent) {
  return agent.layer === agent.track ? [agent.layer] : [agent.layer, agent.track]
}

function agentCard(agent) {
  const { W, H, PAD } = CARD
  const room = W - 2 * PAD
  const draw = GLYPHS[agent.name]
  if (!draw) throw new Error(`no glyph for ${agent.name}`)
  const glyph = draw()

  // Header: the number on the left, the layer and track on the right.
  const parts = layerParts(agent).map((p) => p.toUpperCase())
  const labelWidth =
    parts.reduce((sum, p) => sum + textWidth(p, CARD_HEAD.label, 'caps', CARD_HEAD.tracking), 0) +
    CARD_HEAD.partGap * (parts.length - 1)
  const numberWidth = textWidth(agent.n, CARD_HEAD.number, 'mono')
  assertFits(`${agent.name} header`, numberWidth + labelWidth, room - SPACE[5])

  // Bottom block, anchored to the bottom padding: the line, then the name above it.
  const lines = wrap(agent.line, CARD_LINE.size, room)
  if (lines.length > 2) throw new Error(`${agent.name} line needs more than two lines`)
  for (const l of lines) assertFits(`${agent.name} line "${l}"`, textWidth(l, CARD_LINE.size), room)
  const lineY = CARD_LINE.lastBaseline - CARD_LINE.lead * (lines.length - 1)
  const nameY = lineY - CARD_NAME.toLine
  const nameWidth = textWidth(agent.name, CARD_NAME.size)
  assertFits(`${agent.name} name`, nameWidth, room)

  const glyphBottom = GLYPH.cy + GLYPH.h / 2
  const nameTop = nameY - CAP * CARD_NAME.size
  if (nameTop - glyphBottom < SPACE[4]) throw new Error(`${agent.name} name crowds the glyph`)

  // Gate pill, flush right on the name row, centred on the name's cap height.
  let pill = ''
  if (agent.gate) {
    const inner = Math.ceil(textWidth(agent.gate, CARD_PILL.size, 'mono') * SLACK)
    const pw = inner + 2 * CARD_PILL.pad
    const px = W - PAD - pw
    const py = nameY - Math.round((CAP * CARD_NAME.size) / 2) - CARD_PILL.h / 2
    if (PAD + nameWidth * SLACK + SPACE[5] > px) throw new Error(`${agent.name} name runs into its gate pill`)
    pill = [
      rect(px, py, pw, CARD_PILL.h, CARD_PILL.h / 2, MINT_FILL),
      text({
        x: px + pw / 2,
        y: py + CARD_PILL.h / 2 + Math.round(0.34 * CARD_PILL.size),
        size: CARD_PILL.size,
        family: MONO,
        weight: 600,
        anchor: 'middle',
        fill: NAVY,
        content: esc(agent.gate),
      }),
    ].join('\n')
  }

  const label = parts.map((p, i) => `<tspan${i ? ` dx="${CARD_HEAD.partGap}"` : ''}>${esc(p)}</tspan>`).join('')

  const body = [
    rect(0, 0, W, H, RADIUS.xl, NAVY_FILL),
    text({ x: PAD, y: CARD_HEAD.baseline, size: CARD_HEAD.number, family: MONO, weight: 500, fill: MINT, content: esc(agent.n) }),
    text({
      x: W - PAD,
      y: CARD_HEAD.baseline,
      size: CARD_HEAD.label,
      weight: 600,
      tracking: CARD_HEAD.tracking,
      anchor: 'end',
      opacity: ALPHA.quiet,
      content: label,
    }),
    line(PAD, CARD_HEAD.rule, W - PAD, CARD_HEAD.rule, ` stroke="${INK.line}" stroke-width="${STROKE.hair}"`),
    `<g transform="translate(${GLYPH.cx} ${GLYPH.cy})">`,
    `<g fill="none" stroke="${WHITE}" stroke-width="${STROKE.line}" stroke-linecap="round" stroke-linejoin="round" opacity="${ALPHA.glyph}">${glyph.white}</g>`,
    glyph.mint,
    '</g>',
    text({
      x: PAD,
      y: nameY,
      size: CARD_NAME.size,
      weight: 600,
      tracking: CARD_NAME.tracking,
      content: esc(agent.name),
    }),
    ...lines.map((l, i) => text({ x: PAD, y: lineY + i * CARD_LINE.lead, size: CARD_LINE.size, fill: INK.muted, content: esc(l) })),
    pill,
  ].filter(Boolean)

  const layerText = layerParts(agent).join(', ')
  const gateText = agent.gate ? ` Owns the ${agent.gate} gate.` : ''
  return svg({
    w: W,
    h: H,
    title: `Agent ${agent.n}, ${agent.name} (${layerText}). ${agent.line}.${gateText}`,
    body: body.join('\n'),
  })
}

export function covers() {
  return [
    { file: 'hero.svg', svg: hero() },
    ...TEAM.map((agent) => ({ file: `agents/${agent.name}.svg`, svg: agentCard(agent) })),
  ]
}
