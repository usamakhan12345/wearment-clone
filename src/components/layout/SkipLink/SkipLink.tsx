import styles from './SkipLink.module.scss'

export const CONTENT_ID = 'content'

/** First focusable element on the page; lets keyboard users jump past the header navigation. */
export function SkipLink() {
  return (
    <a href={`#${CONTENT_ID}`} className={styles.link}>
      Skip to content
    </a>
  )
}
