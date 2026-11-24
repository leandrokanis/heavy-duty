'use client'

import { Drawer } from '@base-ui/react/drawer'
import type { ReactNode, RefObject } from 'react'

type SheetRootProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  finalFocus?: RefObject<HTMLElement | null>
  // alertdialog for a confirmation that removes data.
  role?: 'dialog' | 'alertdialog'
  children: ReactNode
}

function SheetRoot({ open, onOpenChange, finalFocus, role, children }: SheetRootProps) {
  return (
    <Drawer.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <Drawer.Portal>
        <Drawer.Backdrop
          data-slot="sheet-backdrop"
          className="sheet-backdrop fixed inset-0 bg-(--color-backdrop)"
        />
        <Drawer.Viewport className="fixed inset-x-0 bottom-0 flex justify-center">
          <Drawer.Popup
            finalFocus={finalFocus}
            // An undefined role would erase the dialog role of the Drawer, so it goes only when set.
            {...(role ? { role } : {})}
            className="sheet-popup glass-sheet mr-[calc(var(--space-8)+env(safe-area-inset-right))] mb-[calc(var(--space-8)+env(safe-area-inset-bottom))] ml-[calc(var(--space-8)+env(safe-area-inset-left))] flex max-h-[88dvh] max-w-[640px] flex-1 flex-col rounded-(--radius-sheet) px-(--space-20) pt-(--space-8) pb-(--space-24)"
          >
            <div
              data-slot="sheet-handle"
              aria-hidden="true"
              className="mx-auto mt-(--space-4) mb-(--space-12) h-[5px] w-9 shrink-0 rounded-[3px] bg-(--color-fill-strong)"
            />
            {children}
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

function SheetTitle({ children }: { children: ReactNode }) {
  return (
    <Drawer.Title className="m-0 mb-(--space-4) shrink-0 font-(--font-weight-bold) text-(length:--font-size-title-2)">
      {children}
    </Drawer.Title>
  )
}

function SheetBody({ children }: { children: ReactNode }) {
  return <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
}

function SheetActions({ children }: { children: ReactNode }) {
  return (
    <div className="mt-(--space-16) grid shrink-0 grid-cols-2 gap-(--space-12)">{children}</div>
  )
}

const Sheet = {
  Root: SheetRoot,
  Title: SheetTitle,
  Body: SheetBody,
  Actions: SheetActions,
}

export { Sheet, type SheetRootProps }
