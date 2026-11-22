import { Button } from '@base-ui/react/button'
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
import {
  type AdjustField,
  adjustValue,
  DRAG_STEPS,
  formatFieldValue,
  MINIMUMS,
  stepsFromDrag,
  valueTextOf,
} from './drag-adjust'
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
}

const BUTTON_CLASS =
  'glass flex size-(--target-workout) shrink-0 items-center justify-center rounded-(--radius-circle) active:opacity-60 data-[disabled]:opacity-40'

export function ValueWheel({ field, label, value, onAdjust }: ValueWheelProps) {
  const labelId = useId()
  const dragAnchorY = useRef<number | null>(null)
  const [dragOffsetPx, setDragOffsetPx] = useState(0)
  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    dragAnchorY.current = event.clientY
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // The drag still works inside the wheel when the browser no longer tracks the pointer.
    }
  }
  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (dragAnchorY.current === null) return
    const steps = stepsFromDrag(event.clientY - dragAnchorY.current, DRAG_STEP_PX)
    // The anchor walks whole steps, so a drag past the minimum does not pile up steps.
    dragAnchorY.current += steps * DRAG_STEP_PX
    setDragOffsetPx(event.clientY - dragAnchorY.current)
    if (steps !== 0) onAdjust(steps)
  }
  const pressKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const steps = KEYBOARD_STEPS[event.key]
    if (steps === undefined) return
    event.preventDefault()
    onAdjust(steps)
  }
  const wheelRef = useRef<HTMLDivElement>(null)
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
  }
  const belowValue = value - DRAG_STEPS[field]
  return (
    <div className="flex flex-col gap-(--space-8)">
      <span id={labelId} className="text-[0.9375rem] opacity-60">
        {label}
      </span>
      <div className="flex items-center gap-(--space-16)">
        <Button
          aria-label={`Diminuir ${label.toLowerCase()}`}
          className={BUTTON_CLASS}
          disabled={value <= MINIMUMS[field]}
          focusableWhenDisabled
          onClick={() => onAdjust(-1)}
        >
          <Minus aria-hidden="true" />
        </Button>
        <div
          role="spinbutton"
          ref={wheelRef}
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
          className="flex touch-none select-none flex-col items-start"
        >
          <span
            data-dragging={dragOffsetPx === 0 ? undefined : 'true'}
            style={{ '--drag-offset': `${dragOffsetPx}px` } as CSSProperties}
            className="flex translate-y-(--drag-offset) flex-col items-start transition-transform data-[dragging]:transition-none motion-reduce:translate-y-0 motion-reduce:transition-none"
          >
            <span aria-hidden="true" className="text-[1.5rem] leading-none opacity-30 tabular-nums">
              {formatFieldValue(field, adjustValue(field, value, 1))}
            </span>
            <span className="flex items-baseline gap-(--space-8)">
              <span className="text-[5rem] leading-none font-(--font-weight-semibold) tabular-nums">
                {formatFieldValue(field, value)}
              </span>
              <span className="text-[1.25rem] font-(--font-weight-regular) opacity-60">
                {UNITS[field]}
              </span>
            </span>
            <span
              aria-hidden="true"
              className="min-h-[1.5rem] text-[1.5rem] leading-none opacity-30 tabular-nums"
            >
              {belowValue >= MINIMUMS[field] ? formatFieldValue(field, belowValue) : ''}
            </span>
          </span>
        </div>
        <Button
          aria-label={`Aumentar ${label.toLowerCase()}`}
          className={BUTTON_CLASS}
          onClick={() => onAdjust(1)}
        >
          <Plus aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
