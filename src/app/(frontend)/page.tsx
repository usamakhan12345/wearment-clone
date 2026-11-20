import Link from 'next/link'

import { HOME_PAGE_SLUG } from '@/collections/Pages'
import { RenderBlocks } from '@/components/blocks/RenderBlocks'
import { siteConfig } from '@/config/site'
import { getSiteSettings } from '@/services/globals'
import { getPageBySlug } from '@/services/pages'

import styles from './page.module.scss'

export default async function HomePage() {
  const [page, settings] = await Promise.all([getPageBySlug(HOME_PAGE_SLUG), getSiteSettings()])

  if (!page?.layout || page.layout.length === 0) {
    return (
      <main className={styles.state}>
        <h1 className={styles.title}>Nothing to show yet</h1>
        <p className={styles.text}>
          {page
            ? 'The home page has no sections. Add some in the admin panel.'
            : 'The home page has not been published. Create a page with the slug “home” in the admin panel.'}
        </p>
        <Link href="/admin" className={styles.button}>
          Open admin panel
        </Link>
      </main>
    )
  }

  return (
    <main>
      {/* The design has no title block, but the page still needs a level-one heading for assistive tech and search. */}
      <h1 className={styles.srOnly}>{settings.siteName?.trim() || siteConfig.name}</h1>
      <RenderBlocks blocks={page.layout} />
    </main>
  )
}
