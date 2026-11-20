'use client'

import { useEffect, useRef, useState, type MouseEvent } from 'react'

import { CloseIcon, MenuIcon } from '../shared/icons'
import { SmartLink } from '../shared/SmartLink'
import styles from './NavDrawer.module.scss'

export type NavItem = {
  id: string
  label: string
  /** Raw CMS link value. */
  href: string
}

type NavDrawerProps = {
  primary: NavItem[]
  secondary: NavItem[]
}

function NavList({ items, className }: { items: NavItem[]; className?: string }) {
  if (items.length === 0) return null

  return (
    <ul className={className}>
      {items.map((item) => (
        <li key={item.id}>
          <SmartLink href={item.href} className={styles.link}>
            {item.label}
          </SmartLink>
        </li>
      ))}
    </ul>
  )
}

/**
 * Hamburger button plus a slide-in left drawer. The drawer is a native modal `<dialog>`, which
 * provides focus trapping, Escape to close, a backdrop, and returns focus to the button on close.
 */
export function NavDrawer({ primary, secondary }: NavDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)

  // The page behind a modal dialog can still scroll; lock it while the drawer is open.
  useEffect(() => {
    if (!open) return

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (primary.length === 0 && secondary.length === 0) return null

  const openDrawer = () => {
    dialogRef.current?.showModal()
    setOpen(true)
  }

  const closeDrawer = () => dialogRef.current?.close()

  // The dialog has no padding, so a click whose target is the dialog itself landed on the backdrop.
  const handleDialogClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) closeDrawer()
  }

  // Following a link keeps the layout mounted, so close the drawer ourselves.
  const handleNavClick = (event: MouseEvent<HTMLElement>) => {
    if (event.target instanceof Element && event.target.closest('a')) closeDrawer()
  }

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        onClick={openDrawer}
        aria-label="Open menu"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <MenuIcon className={styles.triggerIcon} />
      </button>

      <dialog
        ref={dialogRef}
        className={styles.drawer}
        aria-label="Menu"
        onClose={() => setOpen(false)}
        onClick={handleDialogClick}
      >
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <button
              type="button"
              className={styles.close}
              onClick={closeDrawer}
              aria-label="Close menu"
            >
              <CloseIcon className={styles.closeIcon} />
            </button>
          </div>

          <nav aria-label="Menu" onClick={handleNavClick}>
            <NavList items={primary} className={styles.list} />
            <NavList items={secondary} className={styles.secondaryList} />
          </nav>
        </div>
      </dialog>
    </>
  )
}
