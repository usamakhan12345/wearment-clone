'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

import { InfoIcon, type InfoIconName } from './InfoIcon'

import styles from './InfoDialogs.module.scss'

export type InfoPanel = {
  key: string
  /** Button text and dialog heading. */
  label: string
  icon: InfoIconName
  content: ReactNode
}

type InfoDialogsProps = {
  panels: InfoPanel[]
}

/**
 * Row of buttons that each open their content in one shared native `<dialog>`. The browser
 * provides the focus trap, Escape-to-close and focus restoration; this component adds
 * backdrop-click to close and background scroll locking.
 */
export function InfoDialogs({ panels }: InfoDialogsProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [activeKey, setActiveKey] = useState<string | null>(null)

  // Lock background scrolling while a dialog is open; the cleanup restores it (also on unmount).
  useEffect(() => {
    if (activeKey === null) return

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previous
    }
  }, [activeKey])

  if (panels.length === 0) return null

  const active = panels.find((panel) => panel.key === activeKey) ?? null

  function open(key: string) {
    setActiveKey(key)
    dialogRef.current?.showModal()
  }

  return (
    <>
      <ul className={styles.buttons}>
        {panels.map((panel) => (
          <li key={panel.key}>
            <button
              type="button"
              className={styles.button}
              aria-haspopup="dialog"
              onClick={() => open(panel.key)}
            >
              <InfoIcon name={panel.icon} />
              <span>{panel.label}</span>
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby={titleId}
        onClose={() => setActiveKey(null)}
        onClick={(event) => {
          // Only the backdrop reports the dialog itself as the target; the inner box fills it.
          if (event.target === event.currentTarget) dialogRef.current?.close()
        }}
      >
        <div className={styles.box}>
          <div className={styles.header}>
            <h2 id={titleId} className={styles.title}>
              {active?.label}
            </h2>
            <button
              type="button"
              className={styles.close}
              aria-label="Close"
              onClick={() => dialogRef.current?.close()}
            >
              <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
                <path d="m1 1 12 12M13 1 1 13" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          </div>
          <div className={styles.body}>{active?.content}</div>
        </div>
      </dialog>
    </>
  )
}
