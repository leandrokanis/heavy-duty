export type SetPipsProps = {
  total: number
  recorded: number
}

// Decorative: the text next to the pips carries the count for the screen reader.
export function SetPips({ total, recorded }: SetPipsProps) {
  return (
    <span aria-hidden="true" className="inline-flex shrink-0 gap-(--space-4)">
      {Array.from({ length: total }, (_, index) => (
        <i
          // biome-ignore lint/suspicious/noArrayIndexKey: the pips are positions, not items
          key={index}
          data-pip=""
          data-recorded={index < recorded ? 'true' : undefined}
          className="block size-[9px] rounded-(--radius-circle) bg-(--color-fill-strong) data-[recorded=true]:bg-(--color-label)"
        />
      ))}
    </span>
  )
}
