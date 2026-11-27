import { CalendarDays, Dumbbell, type LucideIcon, PersonStanding } from 'lucide-react'
import Link from 'next/link'

export type TabSection = 'today' | 'map' | 'period'

const TABS: { section: TabSection; href: string; label: string; icon: LucideIcon }[] = [
  { section: 'today', href: '/', label: 'Treino', icon: Dumbbell },
  { section: 'map', href: '/mapa', label: 'Mapa', icon: PersonStanding },
  { section: 'period', href: '/periodo', label: 'Período', icon: CalendarDays },
]

// Room under the content for the floating bar, its 24 px gap and a margin; the body already
// pads the safe area.
const CLEARANCE = 'h-[calc(88px+var(--space-16))]'

// Switches sections only, never acts on the screen (DESIGN.md, Section 9.1). Hidden in the
// workout in progress and in the history (D108). No z-index, so the sheets,
// portalled after it, cover it.
export function TabBar({ current }: { current: TabSection }) {
  return (
    <>
      <div aria-hidden="true" className={`${CLEARANCE} shrink-0`} />
      <nav
        aria-label="Seções"
        className="glass fixed right-[calc(var(--space-16)+env(safe-area-inset-right))] bottom-[calc(var(--space-24)+env(safe-area-inset-bottom))] left-[calc(var(--space-16)+env(safe-area-inset-left))] mx-auto grid h-16 max-w-[608px] grid-cols-3 rounded-(--radius-capsule) p-[6px]"
      >
        {TABS.map(({ section, href, label, icon: Icon }) => (
          <Link
            key={section}
            href={href}
            aria-current={section === current ? 'page' : undefined}
            className="flex min-h-(--target-min) flex-col items-center justify-center gap-[2px] rounded-(--radius-capsule) font-(--font-weight-semibold) text-(--color-label-secondary) text-(length:--font-size-footnote) aria-[current=page]:bg-(--color-accent-soft) aria-[current=page]:text-(--color-accent)"
          >
            <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>
    </>
  )
}
