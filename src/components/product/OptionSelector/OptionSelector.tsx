import { cx } from '@/lib/cx'
import type { OptionValueState } from '@/lib/catalog/variants'

import styles from './OptionSelector.module.scss'

type OptionSelectorProps = {
  /** Option name, e.g. "Size". */
  name: string
  /** Unique radio-group name. */
  groupName: string
  selectedValue: string
  states: OptionValueState[]
  onSelect: (value: string) => void
}

/** One option group as a radio group of pills; native radios give arrow-key navigation for free. */
export function OptionSelector({
  name,
  groupName,
  selectedValue,
  states,
  onSelect,
}: OptionSelectorProps) {
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>
        {name}: <span className={styles.selected}>{selectedValue}</span>
      </legend>

      <div className={styles.values}>
        {states.map((state) => (
          <label key={state.value} className={styles.pill}>
            <input
              type="radio"
              className={styles.input}
              name={groupName}
              value={state.value}
              checked={state.selected}
              disabled={state.disabled}
              onChange={() => onSelect(state.value)}
            />
            <span className={cx(styles.text, state.unavailable && styles.unavailable)}>
              {state.value}
              {state.unavailable ? <span className={styles.srOnly}> (sold out)</span> : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
