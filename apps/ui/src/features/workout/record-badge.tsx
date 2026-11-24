import { Sparkle } from 'lucide-react'

// The "Recorde" pill of a set that beat a personal record (F18). The text names the state, so the
// color is never the only sign.
export function RecordBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-(--space-4) rounded-(--radius-capsule) bg-(--color-game-record) py-px pr-(--space-8) pl-(--space-4) font-(--font-weight-bold) text-(--color-on-game-record) text-(length:--font-size-footnote) ${className}`}
    >
      <Sparkle aria-hidden="true" size={14} fill="currentColor" />
      Recorde
    </span>
  )
}
