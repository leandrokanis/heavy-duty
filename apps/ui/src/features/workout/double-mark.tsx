import type { AriaAttributes } from 'react'

const MARK_CLASS =
  'inline-flex h-[22px] min-w-[30px] shrink-0 items-center justify-center rounded-(--radius-capsule) px-(--space-8) font-(--font-weight-heavy) text-(--color-label) text-(length:--font-size-footnote)'

// The ×2 takes the color of the open window, as in DESIGN.md 11.1; the ↺ ×2 of the muscle memory
// takes the gradient of the points, as in the prototype. The text is in the label color.
export function DoubleMark({
  muscleMemory,
  ...aria
}: { muscleMemory: boolean } & Pick<AriaAttributes, 'aria-label'>) {
  if (!muscleMemory) {
    return (
      <span
        className={`${MARK_CLASS} bg-[color-mix(in_srgb,var(--color-window-open)_22%,transparent)]`}
      >
        ×2
      </span>
    )
  }
  return (
    <span
      role={aria['aria-label'] ? 'img' : undefined}
      {...aria}
      data-muscle-memory=""
      className={`${MARK_CLASS} bg-linear-to-r from-[color-mix(in_srgb,var(--color-game-xp)_22%,transparent)] to-[color-mix(in_srgb,var(--color-game-xp-2)_22%,transparent)]`}
    >
      ↺ ×2
    </span>
  )
}
