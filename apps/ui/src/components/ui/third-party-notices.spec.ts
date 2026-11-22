// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const LICENSE_COMMENT = 'Adapted from Animate UI, licensed under MIT + Commons Clause'
const notices = readFileSync(
  new URL('../../../../../THIRD_PARTY_NOTICES.md', import.meta.url),
  'utf8',
)

function filesWithTheLicenseComment(): string[] {
  const folder = new URL('./', import.meta.url)
  return readdirSync(folder)
    .filter(
      (name) => /\.tsx?$/.test(name) && !name.endsWith('.spec.ts') && !name.endsWith('.spec.tsx'),
    )
    .filter((name) => readFileSync(new URL(name, folder), 'utf8').includes(LICENSE_COMMENT))
}

describe('Given the files of components/ui', () => {
  describe('When a file carries the Animate UI license comment', () => {
    it('Then should be listed in THIRD_PARTY_NOTICES.md', () => {
      const files = filesWithTheLicenseComment()
      const unlisted = files.filter(
        (name) => !notices.includes(`apps/ui/src/components/ui/${name}`),
      )

      expect({ found: files.length > 0, unlisted }).toEqual({ found: true, unlisted: [] })
    })
  })

  describe('When THIRD_PARTY_NOTICES.md is read', () => {
    it('Then should carry the full license text and no provisional wording', () => {
      expect({
        licenseText: notices.includes('Commons Clause Restriction'),
        provisional: notices.includes('no dia da primeira cópia'),
      }).toEqual({ licenseText: true, provisional: false })
    })
  })
})
