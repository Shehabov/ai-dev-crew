/**
 * Design tokens for every generated image in this repository.
 *
 * Two brand colours and nothing else: deep navy and mint. White and a cool paper tone are
 * the neutrals. Every other value is navy, mint or white at an opacity, never a new hue.
 *
 * Contrast (WCAG 2.x, computed): mint on navy 11.1:1, white on navy 17.5:1, navy on mint
 * 11.1:1, navy on paper 16.4:1. Mint on paper is about 1.5:1, so on a light ground mint is
 * only ever a fill behind navy text or a wide accent bar, never text and never a thin line
 * that carries meaning.
 */

export const NAVY = '#021449'
export const MINT = '#21EA9D'
export const WHITE = '#FFFFFF'
export const PAPER = '#F6F7FB'

export const FONT = "'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif"
export const MONO = "'JetBrains Mono', 'SFMono-Regular', 'Cascadia Mono', Menlo, Consolas, monospace"

/** Theme roles. `dark` is the navy ground, `light` the paper ground. */
export function theme(mode) {
  if (mode === 'dark') {
    return {
      mode, bg: NAVY, fg: WHITE,
      muted: 'rgba(255,255,255,0.64)', subtle: 'rgba(255,255,255,0.40)',
      line: 'rgba(255,255,255,0.16)', faint: 'rgba(255,255,255,0.06)',
      accent: MINT, accentText: MINT, onAccent: NAVY,
    }
  }
  return {
    mode, bg: PAPER, fg: NAVY,
    muted: 'rgba(2,20,73,0.64)', subtle: 'rgba(2,20,73,0.42)',
    line: 'rgba(2,20,73,0.14)', faint: 'rgba(2,20,73,0.04)',
    accent: MINT, accentText: NAVY, onAccent: NAVY,
  }
}

/** Spacing and shape. Multiples of 4, radii from one short scale. */
export const SPACE = [0, 4, 8, 12, 16, 24, 32, 48, 64, 80, 96, 128]
export const RADIUS = { sm: 8, md: 12, lg: 20, xl: 28 }
export const STROKE = { hair: 1, line: 1.5, bold: 2.5 }

/** Escape text for SVG. */
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Wrap content in an SVG root with a title for screen readers. */
export function svg({ w, h, title, body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
${body}
</svg>
`
}
