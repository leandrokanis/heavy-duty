// The answer of GET /api/windows/week (docs/arquitetura/contratos.md).
export type WeekWindows = {
  now: string
  from: string
  to: string
  weeklyGoal: number | null
  windowsUsed: number
  windowsMissed: number
  windowsOpen: number
  usedPercent: number | null
}
