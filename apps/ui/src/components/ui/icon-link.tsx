import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import type { ComponentProps } from 'react'

type IconLinkProps = Omit<ComponentProps<typeof Link>, 'children'> & {
  'aria-label': string
  icon: LucideIcon
}

// Navigation with the look of IconButton: a link, not a button, as it changes the screen.
function IconLink({ icon: Icon, className, ...props }: IconLinkProps) {
  return (
    <Link
      className={`inline-flex size-(--target-min) shrink-0 cursor-pointer select-none items-center justify-center rounded-(--radius-circle) bg-(--color-fill) text-(--color-label) transition-colors duration-(--duration-fast) active:bg-(--color-fill-strong)${className ? ` ${className}` : ''}`}
      {...props}
    >
      <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
    </Link>
  )
}

export { IconLink, type IconLinkProps }
