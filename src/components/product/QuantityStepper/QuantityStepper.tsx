'use client'

import { useId, useState } from 'react'

import styles from './QuantityStepper.module.scss'

type QuantityStepperProps = {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}

/** Quantity input with minus/plus buttons. Typing is free-form and clamped when focus leaves. */
export function QuantityStepper({ value, onChange, min = 1, max = 99 }: QuantityStepperProps) {
  const inputId = useId()
  // While the field is being edited the raw text is kept, so it can be cleared before retyping.
  const [draft, setDraft] = useState<string | null>(null)

  const clamp = (next: number) => Math.min(Math.max(next, min), max)

  function step(delta: number) {
    setDraft(null)
    onChange(clamp(value + delta))
  }

  return (
    <div className={styles.stepper}>
      <label className={styles.label} htmlFor={inputId}>
        Quantity
      </label>

      <button
        type="button"
        className={styles.button}
        onClick={() => step(-1)}
        disabled={value <= min}
        aria-label="Decrease quantity"
      >
        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
          <path d="M1 6h10" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      <input
        id={inputId}
        className={styles.input}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        value={draft ?? String(value)}
        onChange={(event) => {
          setDraft(event.target.value)

          const next = Number.parseInt(event.target.value, 10)
          if (Number.isFinite(next)) onChange(clamp(next))
        }}
        onBlur={() => setDraft(null)}
      />

      <button
        type="button"
        className={styles.button}
        onClick={() => step(1)}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
          <path d="M1 6h10M6 1v10" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
    </div>
  )
}
