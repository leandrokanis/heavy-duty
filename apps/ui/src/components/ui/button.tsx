import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { MotionButton, type MotionButtonProps } from './motion-button'

type ButtonVariant = 'primary' | 'secondary' | 'destructive'
type ButtonSize = 'min' | 'workout' | 'large'

type ButtonProps = Omit<MotionButtonProps, 'children' | 'tapBrightness'> & {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: LucideIcon
  iconPosition?: 'start' | 'end'
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-(--color-accent) text-(--color-on-accent)',
  secondary: 'bg-(--color-fill) text-(--color-label)',
  destructive: 'bg-(--color-background-elevated) text-(--color-danger)',
}

const SIZE_CLASS: Record<ButtonSize, string> = {
  min: 'min-h-(--target-min)',
  workout: 'min-h-(--target-workout)',
  large: 'min-h-(--target-large) text-(length:--font-size-button-large)',
}

const PRIMARY_TAP_BRIGHTNESS = 0.9

function Button({
  variant = 'primary',
  size = 'min',
  icon: Icon,
  iconPosition = 'start',
  className,
  children,
  ...props
}: ButtonProps) {
  const icon = Icon ? <Icon size={22} strokeWidth={1.8} aria-hidden="true" /> : null

  return (
    <MotionButton
      tapBrightness={variant === 'primary' ? PRIMARY_TAP_BRIGHTNESS : undefined}
      className={`inline-flex cursor-pointer select-none items-center justify-center gap-(--space-8) rounded-(--radius-capsule) px-(--space-20) font-(--font-weight-semibold) data-disabled:opacity-45 ${SIZE_CLASS[size]} ${VARIANT_CLASS[variant]}${className ? ` ${className}` : ''}`}
      {...props}
    >
      {iconPosition === 'start' ? icon : null}
      {children}
      {iconPosition === 'end' ? icon : null}
    </MotionButton>
  )
}

export { Button, type ButtonProps }
