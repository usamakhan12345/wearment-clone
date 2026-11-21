import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { AnnouncementBar } from '@/components/layout/AnnouncementBar/AnnouncementBar'
import { SiteFooter } from '@/components/layout/SiteFooter/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader/SiteHeader'
import { CONTENT_ID, SkipLink } from '@/components/layout/SkipLink/SkipLink'
import { WhatsAppButton } from '@/components/layout/WhatsAppButton/WhatsAppButton'
import { parseEnv } from '@/config/env'
import { siteConfig } from '@/config/site'
import { getSiteSettings } from '@/services/globals'
import { fontVariables } from '@/styles/fonts'
import '@/styles/global.scss'

import styles from './layout.module.scss'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  const siteName = settings.siteName?.trim() || siteConfig.name
  const description = settings.tagline?.trim() || siteConfig.description

  return {
    // Resolves relative Open Graph / canonical URLs. Set SITE_URL in production.
    metadataBase: new URL(parseEnv(process.env).siteUrl),
    title: { default: siteName, template: `%s | ${siteName}` },
    description,
  }
}

// Pages read CMS content from MongoDB on each request, so don't prerender them at build time
// (the build must not require a live database).
export const dynamic = 'force-dynamic'

export default function FrontendLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body className={styles.body}>
        <SkipLink />
        <AnnouncementBar />
        <SiteHeader />
        {/* Focus target for the skip link; pages render their own <main> inside. */}
        <div id={CONTENT_ID} tabIndex={-1} className={styles.content}>
          {children}
        </div>
        <SiteFooter />
        <WhatsAppButton />
      </body>
    </html>
  )
}
