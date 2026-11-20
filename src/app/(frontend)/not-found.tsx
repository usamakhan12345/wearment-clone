import Link from 'next/link'

import styles from './page.module.scss'

export default function NotFound() {
  return (
    <main className={styles.state}>
      <h1 className={styles.title}>Page not found</h1>
      <p className={styles.text}>
        The page you are looking for does not exist or is not available any more.
      </p>
      <Link href="/" className={styles.button}>
        Back to home
      </Link>
    </main>
  )
}
