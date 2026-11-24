// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { TOAST_EXIT_MS, TOAST_VISIBLE_MS } from '../components/ui/toast'
import { LEVEL_CELEBRATION_MS, TICK_MS } from '../features/workout/workout.config'

// Body of the first block opened by the given prelude, e.g. '@media (prefers-contrast: more)'.
function blockAfter(css: string, prelude: string): string {
  const start = css.indexOf(prelude)
  if (start < 0) return ''
  let depth = 0
  for (let index = css.indexOf('{', start); index < css.length; index += 1) {
    if (css[index] === '{') depth += 1
    if (css[index] === '}') depth -= 1
    if (depth === 0) return css.slice(css.indexOf('{', start) + 1, index)
  }
  return ''
}

// Section 18 of DESIGN.md, the single source of the design tokens.
const designTokens = readDesignTokens()

type TokenRow = {
  name: string
  light: string
  dark: string | undefined
  highContrast: string[] | string | undefined
}

function backticks(cell: string): string[] {
  return [...cell.matchAll(/`([^`]+)`/g)].map((match) => match[1] as string)
}

// Parses the token tables of Section 18: colour (6 cells), material and shadow (5) and the rest (4).
function readDesignTokens(): TokenRow[] {
  const design = readFileSync(new URL('../../../../DESIGN.md', import.meta.url), 'utf8')
  const section = design.slice(design.indexOf('## 18. Tokens de design'), design.indexOf('## 19.'))
  const rows: TokenRow[] = []
  for (const line of section.split('\n')) {
    if (!line.startsWith('| `--')) continue
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim())
    const name = backticks(cells[0] ?? '')[0] as string
    if (cells.length === 6) {
      const highContrast = (cells[3] ?? '').startsWith('igual a ')
        ? (backticks(cells[3] ?? '')[0] as string)
        : cells[3] === 'igual'
          ? undefined
          : backticks(cells[3] ?? '')
      rows.push({
        name,
        light: backticks(cells[1] ?? '')[0] as string,
        dark: backticks(cells[2] ?? '')[0],
        highContrast,
      })
    } else if (cells.length === 5) {
      const dark = (cells[2] ?? '') === 'igual' ? undefined : backticks(cells[2] ?? '')[0]
      rows.push({
        name,
        light: backticks(cells[1] ?? '')[0] as string,
        dark,
        highContrast: undefined,
      })
    } else {
      rows.push({
        name,
        light: backticks(cells[1] ?? '')[0] as string,
        dark: undefined,
        highContrast: undefined,
      })
    }
  }
  return rows
}

// Compares values ignoring spaces, case and the leading and trailing zeros of decimals.
function normalise(value: string | undefined): string {
  return (value ?? '')
    .replace(/\s+/g, '')
    .toLowerCase()
    .replace(/(^|[^0-9])0\./g, '$1.')
    .replace(/(\.\d*?)0+(?![0-9])/g, '$1')
}

function expectedDeclaration(row: TokenRow): string {
  return row.dark !== undefined && normalise(row.dark) !== normalise(row.light)
    ? `light-dark(${row.light},${row.dark})`
    : row.light
}

// Body of the rule for the given selector inside a block of CSS, e.g. '.glass'.
function ruleBody(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return css.match(new RegExp(`(?:^|[\\s}])${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? ''
}

function readToken(css: string, name: string): string | undefined {
  return css.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1]?.trim()
}

describe('Given globals.css', () => {
  const css = readFileSync(new URL('./globals.css', import.meta.url), 'utf8')

  describe('When the touch target tokens are read', () => {
    it('Then should declare --target-min as 44px and --target-workout as 56px', () => {
      expect({
        targetMin: readToken(css, '--target-min'),
        targetWorkout: readToken(css, '--target-workout'),
      }).toEqual({ targetMin: '44px', targetWorkout: '56px' })
    })
  })

  describe('When the glass material tokens are read', () => {
    it('Then should declare --material-glass and --material-glass-fill', () => {
      expect({
        glass: readToken(css, '--material-glass') !== undefined,
        fill: readToken(css, '--material-glass-fill') !== undefined,
      }).toEqual({ glass: true, fill: true })
    })
  })

  describe('When reduced transparency or more contrast is asked for', () => {
    it('Then .glass should drop the backdrop-filter in both media queries', () => {
      const dropsBlur = (prelude: string) =>
        /\.glass\s*\{[^}]*backdrop-filter:\s*none/.test(blockAfter(css, prelude))

      expect({
        reducedTransparency: dropsBlur('@media (prefers-reduced-transparency: reduce)'),
        moreContrast: dropsBlur('@media (prefers-contrast: more)'),
      }).toEqual({ reducedTransparency: true, moreContrast: true })
    })
  })

  describe('When the Dynamic Type rule is read', () => {
    it('Then font: -apple-system-body should live only inside @supports', () => {
      const supported = blockAfter(css, '@supports (font: -apple-system-body)')

      expect({
        insideSupports: supported.includes('font: -apple-system-body'),
        occurrences: css.split('font: -apple-system-body').length - 1,
      }).toEqual({ insideSupports: true, occurrences: 2 })
    })
  })
  describe('When the tokens of DESIGN.md, Section 18, are compared with the file', () => {
    const declared = (name: string) =>
      readToken(blockAfter(css, '@theme static'), name) ??
      readToken(blockAfter(css, ':root {'), name)

    it('Then should declare every token with the value of the document', () => {
      const mismatches = designTokens
        .filter((row) => normalise(declared(row.name)) !== normalise(expectedDeclaration(row)))
        .map((row) => row.name)

      expect({ tokens: designTokens.length > 60, mismatches }).toEqual({
        tokens: true,
        mismatches: [],
      })
    })

    it('Then should declare each high contrast value inside prefers-contrast: more', () => {
      const moreContrast = blockAfter(css, '@media (prefers-contrast: more)')
      const expected = designTokens
        .filter((row) => row.highContrast !== undefined)
        .map((row) => {
          const value = Array.isArray(row.highContrast)
            ? `light-dark(${row.highContrast[0]},${row.highContrast[1]})`
            : `var(${row.highContrast})`
          return [row.name, normalise(value)]
        })
      const mismatches = expected
        .filter(([name, value]) => normalise(readToken(moreContrast, name as string)) !== value)
        .map(([name]) => name)

      expect({ count: expected.length, mismatches }).toEqual({ count: 4, mismatches: [] })
    })

    it('Then should not keep the provisional values', () => {
      expect(
        ['Canvas 72%', '#b45309', 'blur(20px) saturate(180%)'].filter((value) =>
          css.includes(value),
        ),
      ).toEqual([])
    })

    it('Then should declare only the game and tier colour tokens that the document defines', () => {
      const documented = new Set(designTokens.map((row) => row.name))
      const undocumented = (css.match(/--color-(game|tier)-[a-z0-9-]+/g) ?? []).filter(
        (name) => !documented.has(name),
      )

      expect(undocumented).toEqual([])
    })
  })
  describe('When the shell rules are read', () => {
    it('Then body should use the background, label, font, body size and safe area tokens', () => {
      const body = ruleBody(css, 'body')

      expect(
        [
          'background: var(--color-background)',
          'color: var(--color-label)',
          'font-family: var(--font-sans)',
          'font-size: var(--font-size-body)',
          'line-height: var(--font-leading-body)',
          'env(safe-area-inset-top)',
          'env(safe-area-inset-left)',
        ].filter((fragment) => !body.includes(fragment)),
      ).toEqual([])
    })

    it('Then :focus-visible should draw a 3px accent outline offset by 2px', () => {
      const focus = ruleBody(css, ':focus-visible')

      expect({
        outline: focus.includes('outline: 3px solid var(--color-accent)'),
        offset: focus.includes('outline-offset: 2px'),
      }).toEqual({ outline: true, offset: true })
    })
  })

  describe('When the glass rules are read', () => {
    it('Then .glass should use the glass fill, blur, border and shadow tokens', () => {
      const glass = ruleBody(css, '.glass')

      expect(
        [
          'background: var(--material-glass-fill)',
          'backdrop-filter: var(--material-glass)',
          'border: 1px solid var(--material-glass-border)',
          'box-shadow: var(--shadow-glass)',
        ].filter((fragment) => !glass.includes(fragment)),
      ).toEqual([])
    })

    it('Then .glass-sheet should use the sheet fill with the same blur, border and shadow', () => {
      const sheet = ruleBody(css, '.glass-sheet')

      expect(
        [
          'background: var(--material-sheet-fill)',
          'backdrop-filter: var(--material-glass)',
          'border: 1px solid var(--material-glass-border)',
          'box-shadow: var(--shadow-glass)',
        ].filter((fragment) => !sheet.includes(fragment)),
      ).toEqual([])
    })

    it('Then both should turn opaque in the three fallbacks', () => {
      const opaque = (block: string, selector: string) => {
        const rule = ruleBody(block, selector)
        return (
          rule.includes('background: var(--color-background-elevated)') &&
          /backdrop-filter:\s*none/.test(rule)
        )
      }
      const fallbacks = [
        blockAfter(css, '@media (prefers-reduced-transparency: reduce)'),
        blockAfter(css, '@media (prefers-contrast: more)'),
        blockAfter(css, '@supports not'),
      ]

      expect(
        fallbacks.map((block) => [opaque(block, '.glass'), opaque(block, '.glass-sheet')]),
      ).toEqual([
        [true, true],
        [true, true],
        [true, true],
      ])
    })

    it('Then the high contrast border should use the label colour', () => {
      const moreContrast = blockAfter(css, '@media (prefers-contrast: more)')

      expect({
        glass: ruleBody(moreContrast, '.glass').includes('border: 1px solid var(--color-label)'),
        sheet: ruleBody(moreContrast, '.glass-sheet').includes(
          'border: 1px solid var(--color-label)',
        ),
      }).toEqual({ glass: true, sheet: true })
    })
  })
  describe('When the toast durations are read', () => {
    it('Then --duration-toast and --duration-base should match the constants of the Toast', () => {
      expect({
        toast: readToken(css, '--duration-toast'),
        base: readToken(css, '--duration-base'),
      }).toEqual({ toast: `${TOAST_VISIBLE_MS}ms`, base: `${TOAST_EXIT_MS}ms` })
    })
  })
  describe('When the ring tick duration is read', () => {
    it('Then --duration-tick should match TICK_MS of the workout clock', () => {
      expect(readToken(css, '--duration-tick')).toBe(`${TICK_MS}ms`)
    })
  })
  describe('When the duration of the full screen of a new tier is read', () => {
    it('Then --duration-level-celebration should match LEVEL_CELEBRATION_MS of the screen', () => {
      expect(readToken(css, '--duration-level-celebration')).toBe(`${LEVEL_CELEBRATION_MS}ms`)
    })
  })
  describe('When the countdown animation is read', () => {
    const popFrames = (body: string) => body.replace(/\s+/g, ' ')
    it('Then countdown-pop should scale from 1.5 down to 0.92 with the opacity of the prototype', () => {
      const frames = popFrames(blockAfter(css, '@keyframes countdown-pop'))
      expect(frames).toContain('0% { opacity: 0; transform: scale(1.5); }')
      expect(frames).toContain('25% { opacity: 1; transform: scale(1); }')
      expect(frames).toContain('100% { opacity: 0.85; transform: scale(0.92); }')
    })
    it('Then countdown-pop should change only the opacity with reduced motion', () => {
      const reduced = blockAfter(
        css,
        '@media (prefers-reduced-motion: reduce) {\n  @keyframes countdown-pop',
      )
      const frames = popFrames(blockAfter(reduced, '@keyframes countdown-pop'))
      expect({
        hasOpacity: frames.includes('opacity'),
        hasTransform: frames.includes('transform'),
      }).toEqual({
        hasOpacity: true,
        hasTransform: false,
      })
    })
  })
  describe('When a dialog container takes focus', () => {
    it('Then should not draw the focus ring around the whole sheet', () => {
      expect(ruleBody(css, '[role="dialog"]:focus-visible')).toContain('outline: none')
    })
  })
})
