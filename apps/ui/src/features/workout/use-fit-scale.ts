import { useLayoutEffect, useRef, useState } from 'react'

// Scale (at most 1) that keeps a line of text inside its area: it shrinks only when the line is
// wider than the area, so a long value like "142,5 kg" fits 320 px without cutting or scrolling.
export function useFitScale() {
  const areaRef = useRef<HTMLDivElement | null>(null)
  const lineRef = useRef<HTMLSpanElement | null>(null)
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const measure = () => {
      const area = areaRef.current?.clientWidth ?? 0
      const line = lineRef.current?.offsetWidth ?? 0
      const next = line > 0 && area > 0 && line > area ? area / line : 1
      setScale((current) => (current === next ? current : next))
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    if (areaRef.current) observer.observe(areaRef.current)
    if (lineRef.current) observer.observe(lineRef.current)
    return () => observer.disconnect()
  }, [])
  return { areaRef, lineRef, scale }
}
