// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

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
})
