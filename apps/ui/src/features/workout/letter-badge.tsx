export type LetterBadgeProps = {
  letter: string
  size: 44 | 30
  // The letter suggested for today: the inner ring in the label colour, as the current set.
  suggested?: boolean
}

const SIZE_CLASS = {
  44: 'size-11 text-(length:--font-size-unit)',
  30: 'size-[30px] text-(length:--font-size-callout)',
} as const

// Circle with the letter of the day; it is text, so it joins the name of the button around it.
export function LetterBadge({ letter, size, suggested = false }: LetterBadgeProps) {
  return (
    <span
      data-suggested={suggested ? '' : undefined}
      className={`inline-flex shrink-0 items-center justify-center rounded-(--radius-circle) bg-(--color-fill) font-(--font-weight-bold) text-(--color-label) leading-none data-[suggested]:bg-(--color-background-grouped) data-[suggested]:shadow-[inset_0_0_0_3px_var(--color-label)] ${SIZE_CLASS[size]}`}
    >
      {letter}
    </span>
  )
}
