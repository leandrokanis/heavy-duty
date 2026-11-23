import { useId } from 'react'
import type { ReopenRow } from './reopen-rows'
import { formatWindowWhen } from './window-format'

const FULL_WEEKDAYS: Record<string, string> = {
  dom: 'domingo',
  seg: 'segunda',
  ter: 'terça',
  qua: 'quarta',
  qui: 'quinta',
  sex: 'sexta',
  sáb: 'sábado',
}

// "qui 9h" reads "quinta às 9h"; "12/12 9h" reads "dia 12/12 às 9h".
function spokenWhen(when: string): string {
  const [day = '', time = ''] = when.split(' ')
  const spokenDay = FULL_WEEKDAYS[day] ?? (day.includes('/') ? `dia ${day}` : day)
  return `${spokenDay} às ${time}`
}

const capitalized = (name: string) => name.charAt(0).toUpperCase() + name.slice(1)

// When each group worked in the finished workout opens again, from the windows of the API.
export function ReopenSummary({
  rows,
  nowMs,
  timeZone,
}: {
  rows: ReopenRow[]
  nowMs: number
  timeZone?: string
}) {
  const titleId = useId()
  if (rows.length === 0) return null
  const longestMs = Math.max(...rows.map(({ opensAtMs }) => opensAtMs - nowMs), 1)
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-(--space-8)">
      <h2
        id={titleId}
        className="m-0 px-(--space-4) font-(--font-weight-semibold) text-(--color-label-secondary) text-(length:--font-size-footnote) uppercase tracking-(--font-tracking-caps)"
      >
        Janelas reabrem
      </h2>
      <ul className="m-0 flex list-none flex-col overflow-hidden rounded-(--radius-card) bg-(--color-background-grouped) px-(--space-16) py-(--space-8)">
        {rows.map(({ slug, name, opensAtMs }) => {
          const when = formatWindowWhen(opensAtMs, nowMs, timeZone)
          const widthPercent = Math.round((Math.max(0, opensAtMs - nowMs) / longestMs) * 100)
          return (
            <li key={slug}>
              <div
                role="img"
                aria-label={`${capitalized(name)}, abre ${spokenWhen(when)}`}
                className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-(--space-12) py-(--space-8) font-(--font-weight-bold) text-(--color-label) text-(length:--font-size-callout)"
              >
                <span>{capitalized(name)}</span>
                <span
                  aria-hidden="true"
                  className="block h-2 overflow-hidden rounded-(--radius-capsule) bg-(--color-fill)"
                >
                  <i
                    className="block h-full rounded-[inherit] bg-(--color-window-rest)"
                    style={{ width: `${widthPercent}%` }}
                  />
                </span>
                <span className="tabular-nums">{`abre ${when}`}</span>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
