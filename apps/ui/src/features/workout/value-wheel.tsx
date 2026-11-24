import { Minus, Plus } from 'lucide-react'
import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { IconButton } from '@/components/ui/icon-button'
import {
  type AdjustField,
  adjustValue,
  DRAG_STEPS,
  formatFieldValue,
  MINIMUMS,
  stepsFromDrag,
  valueTextOf,
} from './drag-adjust'
import { useFitScale } from './use-fit-scale'
import { DRAG_STEP_PX, WHEEL_STEP_PX } from './workout.config'

const KEYBOARD_STEPS: Record<string, number> = {
  ArrowUp: 1,
  ArrowRight: 1,
  ArrowDown: -1,
  ArrowLeft: -1,
}

const UNITS: Record<AdjustField, string> = { loadG: 'kg', reps: 'rep', seconds: 's' }

export type ValueWheelProps = {
  field: AdjustField
  label: string
  value: number
  // Steps with sign: positive raises the value.
  onAdjust: (steps: number) => void
  // The card behind the wheel: grouped on the screen, fill inside a sheet.
  surface?: 'grouped' | 'fill'
}

const SURFACE_CLASS = {
  grouped: 'bg-(--color-background-grouped)',
  fill: 'bg-(--color-fill)',
} as const

export function ValueWheel({
  field,
  label,
  value,
  onAdjust,
  surface = 'grouped',
}: ValueWheelProps) {
  const labelId = useId()
  const dragAnchorY = useRef<number | null>(null)
  const [dragOffsetPx, setDragOffsetPx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const { areaRef, lineRef, scale } = useFitScale()
  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    dragAnchorY.current = event.clientY
    setDragging(true)
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // The drag still works inside the wheel when the browser no longer tracks the pointer.
    }
  }
  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (dragAnchorY.current === null) return
    // Up raises the value: the larger value sits below, so the finger pushes it up.
    const steps = stepsFromDrag(dragAnchorY.current - event.clientY, DRAG_STEP_PX)
    // The anchor walks whole steps, so a drag past the minimum does not pile up steps.
    dragAnchorY.current -= steps * DRAG_STEP_PX
    setDragOffsetPx(event.clientY - dragAnchorY.current)
    if (steps !== 0) onAdjust(steps)
  }
  const pressKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const steps = KEYBOARD_STEPS[event.key]
    if (steps === undefined) return
    event.preventDefault()
    onAdjust(steps)
  }
  const wheelRef = useRef<HTMLDivElement | null>(null)
  const onAdjustRef = useRef(onAdjust)
  onAdjustRef.current = onAdjust
  // React registers wheel listeners as passive, which cannot stop the page from scrolling.
  useEffect(() => {
    const element = wheelRef.current
    if (!element) return
    let pendingPx = 0
    const turn = (event: WheelEvent) => {
      event.preventDefault()
      if (event.deltaMode !== 0) {
        const lineSteps = Math.sign(-event.deltaY)
        if (lineSteps !== 0) onAdjustRef.current(lineSteps)
        return
      }
      pendingPx -= event.deltaY
      const steps = Math.trunc(pendingPx / WHEEL_STEP_PX)
      pendingPx -= steps * WHEEL_STEP_PX
      if (steps !== 0) onAdjustRef.current(steps)
    }
    element.addEventListener('wheel', turn, { passive: false })
    return () => element.removeEventListener('wheel', turn)
  }, [])
  const endDrag = () => {
    dragAnchorY.current = null
    setDragOffsetPx(0)
    setDragging(false)
  }
  const aboveValue = value - DRAG_STEPS[field]
  return (
    <div
      className={`flex flex-col gap-(--space-4) rounded-(--radius-control) p-(--space-12) ${SURFACE_CLASS[surface]}`}
    >
      <span
        id={labelId}
        className="text-center font-(--font-weight-semibold) text-(--color-label-secondary) text-(length:--font-size-footnote)"
      >
        {label}
      </span>
      <div className="flex items-center gap-(--space-8)">
        <IconButton
          aria-label={`Diminuir ${label.toLowerCase()}`}
          icon={Minus}
          size="workout"
          disabled={value <= MINIMUMS[field]}
          focusableWhenDisabled
          onClick={() => onAdjust(-1)}
        />
        <div
          role="spinbutton"
          ref={(element) => {
            wheelRef.current = element
            areaRef.current = element
          }}
          tabIndex={0}
          onKeyDown={pressKey}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          aria-labelledby={labelId}
          aria-valuenow={Number(formatFieldValue(field, value).replace(',', '.'))}
          aria-valuemin={Number(formatFieldValue(field, MINIMUMS[field]))}
          aria-valuetext={valueTextOf(field, value)}
          data-dragging={dragging ? 'true' : undefined}
          // Inside a sheet, the drag that closes the sheet would ride along with the drag of the value.
          data-base-ui-swipe-ignore=""
          className="group h-26 min-w-0 flex-1 touch-none select-none overflow-hidden rounded-(--radius-inner)"
        >
          {/* Tint and mask sit on a child so the fade matches the prototype and the focus ring stays whole. */}
          <span className="block size-full transition-colors duration-(--duration-fast) [mask-image:linear-gradient(rgba(0,0,0,0.3),#000_32%,#000_68%,rgba(0,0,0,0.3))] group-data-[dragging]:bg-(--color-accent-soft)">
            <span
              data-dragging={dragOffsetPx === 0 ? undefined : 'true'}
              style={{ '--drag-offset': `${dragOffsetPx}px` } as CSSProperties}
              className="grid translate-y-(--drag-offset) grid-cols-[minmax(0,1fr)] grid-rows-[1.375rem_3.75rem_1.375rem] items-center justify-items-center transition-transform duration-(--duration-medium) data-[dragging]:transition-none motion-reduce:translate-y-0 motion-reduce:transition-none"
            >
              <span
                aria-hidden="true"
                className="min-h-[1.25rem] font-(--font-weight-semibold) text-(--color-label-secondary) text-(length:--font-size-title-3) leading-none tabular-nums opacity-60"
              >
                {aboveValue >= MINIMUMS[field] ? formatFieldValue(field, aboveValue) : ''}
              </span>
              <span
                ref={lineRef}
                style={{ transform: `scale(${scale})` }}
                className="flex w-max origin-center items-baseline gap-(--space-8) whitespace-nowrap"
              >
                <span className="font-(--font-weight-bold) text-(length:--font-size-wheel) leading-none tracking-(--font-tracking-tight) tabular-nums">
                  {formatFieldValue(field, value)}
                </span>
                <span className="font-(--font-weight-semibold) text-(--color-label-secondary) text-(length:--font-size-unit)">
                  {UNITS[field]}
                </span>
              </span>
              <span
                aria-hidden="true"
                className="font-(--font-weight-semibold) text-(--color-label-secondary) text-(length:--font-size-title-3) leading-none tabular-nums opacity-60"
              >
                {formatFieldValue(field, adjustValue(field, value, 1))}
              </span>
            </span>
          </span>
        </div>
        <IconButton
          aria-label={`Aumentar ${label.toLowerCase()}`}
          icon={Plus}
          size="workout"
          onClick={() => onAdjust(1)}
        />
      </div>
    </div>
  )
}
