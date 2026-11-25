import { type MouseEvent, useId } from 'react'
import { type BodyMapGroup, type FigureState, figureStateOf } from './body-map'

type Shape =
  | { kind: 'rect'; x: number; y: number; width: number; height: number; rx: number }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { kind: 'circle'; cx: number; cy: number; r: number }

// A group of the catalog, or null for a part with no group (head, neck, forearms, front hips and shins).
type Part = { group: string | null; shape: Shape }

const rect = (x: number, y: number, width: number, height: number, rx: number): Shape => ({
  kind: 'rect',
  x,
  y,
  width,
  height,
  rx,
})

// The figure of prototype v1 (viewBox 300 × 330), drawn around the centre x of each side.
function partsOf(x: number, back: boolean): Part[] {
  const side = (group: string | null, shape: Shape): Part => ({ group, shape })
  const torso: Part[] = back
    ? [
        side('back', rect(x - 23, 54, 46, 58, 16)),
        side('lower-back', rect(x - 19, 115, 38, 39, 12)),
      ]
    : [side('chest', rect(x - 21, 54, 42, 40, 14)), side('abs', rect(x - 18, 98, 36, 56, 12))]
  const arm = back ? 'triceps' : 'biceps'
  const thigh = back ? 'hamstrings' : 'quadriceps'
  const thighY = back ? 189 : 184
  const thighHeight = back ? 52 : 57
  return [
    side(null, { kind: 'circle', cx: x, cy: 26, r: 16 }),
    side(null, rect(x - 7, 41, 14, 10, 4)),
    side('shoulders', { kind: 'ellipse', cx: x - 30, cy: 64, rx: 15, ry: 12 }),
    side('shoulders', { kind: 'ellipse', cx: x + 30, cy: 64, rx: 15, ry: 12 }),
    ...torso,
    side(arm, rect(x - 51, 78, 16, 50, 8)),
    side(arm, rect(x + 35, 78, 16, 50, 8)),
    side(null, rect(x - 55, 132, 14, 48, 7)),
    side(null, rect(x + 41, 132, 14, 48, 7)),
    back
      ? side('glutes', rect(x - 21, 157, 42, 28, 12))
      : side(null, rect(x - 18, 158, 36, 22, 10)),
    side(thigh, rect(x - 19, thighY, 18, thighHeight, 9)),
    side(thigh, rect(x + 1, thighY, 18, thighHeight, 9)),
    side(back ? 'calves' : null, rect(x - 18, 245, 16, 51, 8)),
    side(back ? 'calves' : null, rect(x + 2, 245, 16, 51, 8)),
  ]
}

const FRONT_X = 75
const BACK_X = 225
const PARTS: Part[] = [...partsOf(FRONT_X, false), ...partsOf(BACK_X, true)]

const FLAT_FILL: Record<Exclude<FigureState, 'cooling'>, string> = {
  open: 'var(--color-window-open)',
  resting: 'var(--color-window-rest)',
  neutral: 'var(--color-fill-strong)',
}

function ShapeOf({ shape, ...props }: { shape: Shape } & Record<string, unknown>) {
  if (shape.kind === 'circle') return <circle cx={shape.cx} cy={shape.cy} r={shape.r} {...props} />
  if (shape.kind === 'ellipse') {
    return <ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} {...props} />
  }
  return (
    <rect
      x={shape.x}
      y={shape.y}
      width={shape.width}
      height={shape.height}
      rx={shape.rx}
      {...props}
    />
  )
}

export type BodyFigureProps = {
  groups: BodyMapGroup[]
  selectedSlug: string | null
  onSelect: (slug: string) => void
}

// Decorative for the screen reader: the list of the groups below says the same in text. The tap on
// a part is a shortcut to the row of the group, which keyboard and screen reader use.
export function BodyFigure({ groups, selectedSlug, onSelect }: BodyFigureProps) {
  const hatchId = useId()
  const stateOf = (slug: string): FigureState => {
    const group = groups.find((listed) => listed.slug === slug)
    return group ? figureStateOf(group) : 'neutral'
  }
  const select = (event: MouseEvent<SVGSVGElement>) => {
    const slug = (event.target as Element).closest('[data-group]')?.getAttribute('data-group')
    if (slug) onSelect(slug)
  }
  return (
    <svg
      viewBox="0 0 300 330"
      aria-hidden="true"
      className="block h-auto max-h-[290px] w-full"
      onClick={select}
    >
      <defs>
        <pattern
          id={hatchId}
          width="7"
          height="7"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="7" height="7" fill="var(--color-window-cooling)" opacity="0.35" />
          <line x1="0" y1="0" x2="0" y2="7" stroke="var(--color-window-cooling)" strokeWidth="3" />
        </pattern>
      </defs>
      {PARTS.map(({ group, shape }, index) => {
        if (group === null) {
          // biome-ignore lint/suspicious/noArrayIndexKey: the parts are a fixed drawing.
          return <ShapeOf key={index} shape={shape} fill="var(--color-fill-strong)" />
        }
        const state = stateOf(group)
        const selected = group === selectedSlug
        return (
          <ShapeOf
            // biome-ignore lint/suspicious/noArrayIndexKey: the parts are a fixed drawing.
            key={index}
            shape={shape}
            data-group={group}
            data-state={state}
            data-selected={selected ? '' : undefined}
            fill={state === 'cooling' ? `url(#${hatchId})` : FLAT_FILL[state]}
            stroke={selected ? 'var(--color-label)' : 'var(--color-background-grouped)'}
            strokeWidth={selected ? 3 : 2}
            className="cursor-pointer"
          />
        )
      })}
      <text
        x={FRONT_X}
        y="320"
        textAnchor="middle"
        fill="var(--color-label-secondary)"
        fontSize="12"
        fontWeight="600"
      >
        Frente
      </text>
      <text
        x={BACK_X}
        y="320"
        textAnchor="middle"
        fill="var(--color-label-secondary)"
        fontSize="12"
        fontWeight="600"
      >
        Costas
      </text>
    </svg>
  )
}
