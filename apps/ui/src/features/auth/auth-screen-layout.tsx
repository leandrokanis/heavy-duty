import { CircleAlert, Dumbbell } from 'lucide-react'
import type { ReactNode } from 'react'

type AuthScreenLayoutProps = {
  icon: 'app' | 'status'
  statusIcon?: ReactNode
  title: string
  children?: ReactNode
  message?: string | null
}

const ICON_CLASS = {
  app: 'rounded-(--radius-icon) bg-(--color-label) text-(--color-background)',
  status: 'rounded-(--radius-circle) bg-(--color-fill) text-(--color-label-secondary)',
}

// The group sits 32 px above the centre through the extra bottom padding; the message hangs below the group.
export function AuthScreenLayout({
  icon,
  statusIcon,
  title,
  children,
  message,
}: AuthScreenLayoutProps) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-(--space-24) pt-(--space-24) pb-[calc(var(--space-24)+var(--space-32)*2)]">
      <div className="relative flex w-full max-w-[640px] flex-col items-center">
        <div className={`flex size-21 items-center justify-center ${ICON_CLASS[icon]}`}>
          {icon === 'app' ? (
            <Dumbbell aria-hidden="true" size={44} className="rotate-45" />
          ) : (
            statusIcon
          )}
        </div>
        <h1 className="m-0 mt-(--space-12) text-center font-(--font-weight-bold) text-(length:--font-size-large-title) leading-(--font-leading-tight) tracking-(--font-tracking-tight)">
          {title}
        </h1>
        {children ? <div className="mt-(--space-40) w-full">{children}</div> : null}
        <p
          aria-live="polite"
          className="absolute inset-x-0 top-full m-0 mt-(--space-16) flex items-start justify-center gap-(--space-8) text-center text-(--color-danger)"
        >
          {message ? (
            <>
              <CircleAlert
                aria-hidden="true"
                size={22}
                strokeWidth={1.8}
                className="mt-px shrink-0"
              />
              <span>{message}</span>
            </>
          ) : null}
        </p>
      </div>
    </main>
  )
}
