'use client'

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

// Keeps in step with --duration-toast and --duration-base in DESIGN.md, Section 18.
const TOAST_VISIBLE_MS = 2600
const TOAST_EXIT_MS = 300

type ToastApi = { show: (message: string) => void }

const ToastContext = createContext<ToastApi>({ show: () => {} })

type ToastState = { id: number; message: string; leaving: boolean }

function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const nextId = useRef(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = useCallback(() => {
    for (const timer of timers.current) clearTimeout(timer)
    timers.current = []
  }, [])

  const show = useCallback(
    (message: string) => {
      clearTimers()
      nextId.current += 1
      const id = nextId.current
      setToast({ id, message, leaving: false })
      timers.current.push(
        setTimeout(() => setToast({ id, message, leaving: true }), TOAST_VISIBLE_MS),
        setTimeout(() => setToast(null), TOAST_VISIBLE_MS + TOAST_EXIT_MS),
      )
    },
    [clearTimers],
  )

  useEffect(() => clearTimers, [clearTimers])

  const api = useMemo(() => ({ show }), [show])

  return (
    <ToastContext value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-(--space-margin-inline) bottom-[calc(env(safe-area-inset-bottom)+var(--target-large)+var(--space-24)+var(--space-20))] z-50 flex justify-center">
        <div role="status" className="max-w-full">
          {toast ? (
            <p
              key={toast.id}
              data-slot="toast"
              data-leaving={toast.leaving ? '' : undefined}
              className="toast glass pointer-events-none m-0 max-w-full rounded-(--radius-capsule) px-(--space-16) py-(--space-12) text-center font-(--font-weight-semibold) text-(--color-label) text-(length:--font-size-subheadline)"
            >
              {toast.message}
            </p>
          ) : null}
        </div>
      </div>
    </ToastContext>
  )
}

function useToast(): ToastApi {
  return useContext(ToastContext)
}

export { TOAST_EXIT_MS, TOAST_VISIBLE_MS, ToastProvider, useToast }
