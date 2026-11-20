'use client'

import { useEffect, useRef, useState } from 'react'

import styles from './CopyButton.module.scss'

type CopyButtonProps = {
  /** Text copied to the clipboard (e.g. a coupon code). */
  value: string
}

type CopyState = 'idle' | 'copied' | 'failed'

/** Legacy path for browsers/contexts without the async Clipboard API (e.g. plain http). */
function copyWithSelection(text: string): boolean {
  const field = document.createElement('textarea')
  field.value = text
  field.setAttribute('readonly', '')
  field.style.position = 'fixed'
  field.style.opacity = '0'
  document.body.appendChild(field)
  field.select()

  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    field.remove()
  }
}

/** Copies `value` to the clipboard and confirms it, visually and to screen readers. */
export function CopyButton({ value }: CopyButtonProps) {
  const [state, setState] = useState<CopyState>('idle')
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current)
    },
    [],
  )

  async function copy() {
    let copied = false

    try {
      await navigator.clipboard.writeText(value)
      copied = true
    } catch {
      copied = copyWithSelection(value)
    }

    setState(copied ? 'copied' : 'failed')

    if (resetTimer.current) clearTimeout(resetTimer.current)
    resetTimer.current = setTimeout(() => setState('idle'), 2000)
  }

  return (
    <>
      <button type="button" className={styles.button} onClick={copy}>
        {state === 'copied' ? 'Copied' : state === 'failed' ? 'Failed' : 'Copy'}
        <span className={styles.srOnly}> code {value}</span>
      </button>
      <span role="status" className={styles.srOnly}>
        {state === 'copied' ? `Code ${value} copied to clipboard` : null}
        {state === 'failed' ? 'Could not copy the code' : null}
      </span>
    </>
  )
}
