// Adapted from Animate UI, licensed under MIT + Commons Clause, see THIRD_PARTY_NOTICES.md
// Source: packages/react/src/primitives/buttons/button/index.tsx, commit 9873c628afdcdb030e74dc2930774a2aa473bd39
'use client'

import { Button as BaseButton } from '@base-ui/react/button'
import { motion } from 'motion/react'
import * as React from 'react'

// Press scale of motionTokens.scale.press in the Animate UI source.
const TAP_SCALE = 0.97
const PRESS_TRANSITION = { duration: 0.12, ease: 'easeOut' } as const

type MotionButtonProps = BaseButton.Props & {
  tapScale?: number
  tapBrightness?: number
}

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia?.('(prefers-reduced-motion: reduce)')
  query?.addEventListener('change', onChange)
  return () => query?.removeEventListener('change', onChange)
}

function readReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

function usePrefersReducedMotion() {
  return React.useSyncExternalStore(subscribeReducedMotion, readReducedMotion, () => false)
}

function MotionButton({
  tapScale = TAP_SCALE,
  tapBrightness,
  disabled,
  render: _render,
  ...props
}: MotionButtonProps) {
  const reduce = usePrefersReducedMotion()
  const [pressed, setPressed] = React.useState(false)
  const interactive = !disabled
  const scale = reduce ? undefined : `scale(${tapScale})`
  const filter = tapBrightness === undefined ? undefined : `brightness(${tapBrightness})`
  const whileTap = scale || filter ? { transform: scale, filter } : undefined

  return (
    <BaseButton
      data-slot="button"
      data-pressed={interactive && pressed ? '' : undefined}
      disabled={disabled}
      render={
        <motion.button
          initial={{ transform: 'scale(1)', filter: 'brightness(1)' }}
          whileTap={interactive ? whileTap : undefined}
          transition={PRESS_TRANSITION}
          onTapStart={() => setPressed(true)}
          onTap={() => setPressed(false)}
          onTapCancel={() => setPressed(false)}
        />
      }
      {...props}
    />
  )
}

export { MotionButton, type MotionButtonProps }
