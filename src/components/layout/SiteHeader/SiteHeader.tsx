import Link from 'next/link'

import { getHeader, getSiteSettings } from '@/services/globals'
import { toImageData } from '@/services/products'

import { BagIcon, SearchIcon, UserIcon } from '../shared/icons'
import { Logo } from '../shared/Logo'
import { NavDrawer, type NavItem } from './NavDrawer'
import styles from './SiteHeader.module.scss'

type RawNavItem = { id?: string | null; label?: string | null; link?: string | null }

function toNavItems(items: RawNavItem[] | null | undefined): NavItem[] {
  return (items ?? []).flatMap<NavItem>((item, index) =>
    item.label && item.link
      ? [{ id: item.id ?? String(index), label: item.label, href: item.link }]
      : [],
  )
}

/** Menu + search on the left, centred logo, and (not yet available) account / cart on the right. */
export async function SiteHeader() {
  const [header, settings] = await Promise.all([getHeader(), getSiteSettings()])

  const siteName = settings.siteName?.trim() || 'Home'
  const logo = toImageData(settings.logo, 'original')

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.side}>
          <NavDrawer
            primary={toNavItems(header.primaryNav)}
            secondary={toNavItems(header.secondaryNav)}
          />

          <Link href="/search" className={styles.iconControl} aria-label="Search">
            <SearchIcon className={styles.icon} />
          </Link>
        </div>

        <Link href="/" className={styles.brand} aria-label={logo ? `${siteName} home` : undefined}>
          <Logo image={logo} name={siteName} height={32} className={styles.logo} preload />
        </Link>

        <div className={`${styles.side} ${styles.sideEnd}`}>
          {/* Accounts and the cart arrive in a later phase: inert, but visible and explained. */}
          <button
            type="button"
            className={`${styles.iconControl} ${styles.unavailable}`}
            aria-disabled="true"
            aria-label="Account"
            title="Coming soon"
          >
            <UserIcon className={styles.icon} />
          </button>
          <button
            type="button"
            className={`${styles.iconControl} ${styles.unavailable}`}
            aria-disabled="true"
            aria-label="Cart"
            title="Coming soon"
          >
            <BagIcon className={styles.icon} />
          </button>
        </div>
      </div>
    </header>
  )
}
