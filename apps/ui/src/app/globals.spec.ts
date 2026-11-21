// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

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
})
