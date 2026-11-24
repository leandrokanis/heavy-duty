export type WeeklyGoalItemProps = {
  weeklyGoal: number
  windowsUsed: number
}

const RING_RADIUS = 13
const RING_LENGTH = 2 * Math.PI * RING_RADIUS

// The weekly goal in the game strip: a ring with the windows used out of the goal, full at the goal.
export function WeeklyGoalItem({ weeklyGoal, windowsUsed }: WeeklyGoalItemProps) {
  const filled = Math.min(windowsUsed / weeklyGoal, 1)
  return (
    <div
      role="img"
      aria-label={`${windowsUsed} de ${weeklyGoal} janelas aproveitadas na semana`}
      className="flex min-h-[44px] min-w-0 flex-col items-center gap-(--space-4) rounded-(--radius-card) bg-(--color-background-grouped) px-(--space-8) py-(--space-12) text-center text-(--color-label)"
    >
      <svg aria-hidden="true" viewBox="0 0 32 32" className="size-8 -rotate-90">
        <circle
          cx="16"
          cy="16"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="5"
          className="stroke-(--color-fill-strong)"
        />
        <circle
          cx="16"
          cy="16"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={RING_LENGTH * (1 - filled)}
          className="stroke-(--color-window-open)"
        />
      </svg>
      <span className="font-(--font-weight-bold) text-(length:--font-size-subheadline) tabular-nums">
        {windowsUsed}/{weeklyGoal}
      </span>
      <span className="font-(--font-weight-semibold) text-(--color-label-secondary) text-(length:--font-size-footnote)">
        janelas
      </span>
    </div>
  )
}
