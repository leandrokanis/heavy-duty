'use client'

import { useEffect, useState } from 'react'
import { MedalIcon } from './medal-icon'
import { medalTitleOf } from './medal-shelf'
import type { Medal } from './medals.types'

// Keeps in step with --duration-toast in DESIGN.md, Section 18.
const MEDAL_VISIBLE_MS = 2600

export function medalAnnouncementOf(medals: readonly Medal[]): string {
  return medals.map((medal) => `Medalha nova: ${medalTitleOf(medal)}`).join('. ')
}

export type MedalToastProps = {
  // The medals the API awarded since the last read, shown one after the other.
  medals: readonly Medal[]
  onDone: () => void
}

// A new medal drops from the top of the screen (docs/gamificacao.md); with reduced motion it shows
// still. Only visual: the live region of the screen announces it with medalAnnouncementOf.
export function MedalToast({ medals, onDone }: MedalToastProps) {
  const [index, setIndex] = useState(0)
  const medal = medals[index]

  useEffect(() => {
    if (medals.length === 0) setIndex(0)
  }, [medals.length])

  useEffect(() => {
    if (!medal) {
      if (medals.length > 0) onDone()
      return
    }
    const timer = setTimeout(() => setIndex((current) => current + 1), MEDAL_VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [medal, medals.length, onDone])

  return (
    <div className="pointer-events-none fixed inset-x-(--space-margin-inline) top-[calc(env(safe-area-inset-top)+var(--space-16))] z-50 flex justify-center">
      <div aria-hidden="true" className="max-w-full">
        {medal && (
          <div
            key={medal.code}
            className="flex items-center gap-(--space-12) rounded-(--radius-card) bg-(--color-background-grouped) py-(--space-8) pr-(--space-16) pl-(--space-8) shadow-lg motion-safe:animate-[medal-drop_var(--duration-base)_cubic-bezier(.2,1.4,.4,1)]"
          >
            <span className="grid size-12 place-items-center rounded-full bg-[color-mix(in_srgb,var(--color-game-gold)_18%,transparent)]">
              <MedalIcon icon={medal.icon} size={30} />
            </span>
            <span className="flex flex-col">
              <strong className="text-(--color-label) text-(length:--font-size-body)">
                {medalTitleOf(medal)}
              </strong>
              <span className="text-(--color-label-secondary) text-(length:--font-size-footnote)">
                Medalha nova
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
