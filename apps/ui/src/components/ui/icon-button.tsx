import type { LucideIcon } from 'lucide-react'
import { MotionButton, type MotionButtonProps } from './motion-button'

type IconButtonSize = 'min' | 'workout'

type IconButtonProps = Omit<MotionButtonProps, 'children' | 'tapScale' | 'tapBrightness'> & {
  'aria-label': string
  icon: LucideIcon
  size?: IconButtonSize
}

const SIZE_CLASS: Record<IconButtonSize, string> = {
  min: 'size-(--target-min)',
  workout: 'size-(--target-workout)',
}

const ICON_TAP_SCALE = 0.94

function IconButton({ icon: Icon, size = 'min', className, ...props }: IconButtonProps) {
  return (
    <MotionButton
      tapScale={ICON_TAP_SCALE}
      className={`inline-flex shrink-0 cursor-pointer select-none items-center justify-center rounded-(--radius-circle) bg-(--color-fill) text-(--color-label) data-disabled:opacity-45 data-pressed:bg-(--color-fill-strong) ${SIZE_CLASS[size]}${className ? ` ${className}` : ''}`}
      {...props}
    >
      <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
    </MotionButton>
  )
}

export { IconButton, type IconButtonProps }
