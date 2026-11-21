import Image from 'next/image'
import Link from 'next/link'
import type { CSSProperties, ComponentType } from 'react'

import { Container } from '@/components/ui/Container/Container'
import { cx } from '@/lib/cx'
import { getFooter, getSiteSettings } from '@/services/globals'
import { toImageData } from '@/services/products'

import { NewsletterForm } from '../NewsletterForm/NewsletterForm'
import { FacebookIcon, GoogleIcon, InstagramIcon } from '../shared/icons'
import { isSvgUrl, sizeForHeight } from '../shared/imageSize'
import { resolveHref } from '../shared/links'
import { Logo } from '../shared/Logo'
import { SmartLink } from '../shared/SmartLink'
import styles from './SiteFooter.module.scss'

type SocialKey = 'googleMaps' | 'instagram' | 'facebook'

const SOCIAL_LINKS: {
  key: SocialKey
  label: string
  Icon: ComponentType<{ className?: string }>
}[] = [
  { key: 'googleMaps', label: 'Google Maps', Icon: GoogleIcon },
  { key: 'instagram', label: 'Instagram', Icon: InstagramIcon },
  { key: 'facebook', label: 'Facebook', Icon: FacebookIcon },
]

const PAYMENT_IMAGE_HEIGHT = 32

// Kept out of the component body: reading the clock is impure.
const currentYear = () => new Date().getFullYear()

export async function SiteFooter() {
  const [footer, settings] = await Promise.all([getFooter(), getSiteSettings()])

  const siteName = settings.siteName?.trim() || ''
  const newsletter = footer.newsletter
  const showNewsletter = Boolean(newsletter?.heading || newsletter?.text)

  const columns = (footer.columns ?? []).flatMap((column, index) => {
    const links = (column.links ?? []).flatMap((link, linkIndex) =>
      link.label && link.link
        ? [{ id: link.id ?? String(linkIndex), label: link.label, href: link.link }]
        : [],
    )

    return column.title && links.length > 0
      ? [{ id: column.id ?? String(index), title: column.title, links }]
      : []
  })

  const socials = SOCIAL_LINKS.flatMap(({ key, label, Icon }) => {
    const resolved = resolveHref(settings.social?.[key])

    return resolved?.external ? [{ key, label, Icon, href: resolved.href }] : []
  })

  const logo = toImageData(footer.logo ?? settings.logo, 'original')
  const payment = toImageData(footer.paymentImage, 'original')
  const copyright = footer.copyright?.trim() || (siteName ? `© ${currentYear()} ${siteName}` : '')

  const hasIntro = showNewsletter || socials.length > 0
  const hasTop = hasIntro || columns.length > 0
  const hasBottom = Boolean(copyright || logo || payment)

  if (!hasTop && !hasBottom) return null

  return (
    <footer className={styles.footer}>
      <Container>
        {hasTop ? (
          <div
            className={cx(styles.top, hasIntro && styles.withIntro)}
            style={{ '--column-count': Math.max(columns.length, 1) } as CSSProperties}
          >
            {hasIntro ? (
              <section
                className={styles.intro}
                aria-labelledby={newsletter?.heading ? 'footer-newsletter-title' : undefined}
              >
                {showNewsletter ? (
                  <>
                    {newsletter?.heading ? (
                      <h2 id="footer-newsletter-title" className={styles.heading}>
                        {newsletter.heading}
                      </h2>
                    ) : null}
                    {newsletter?.text ? <p className={styles.text}>{newsletter.text}</p> : null}
                    <NewsletterForm placeholder={newsletter?.placeholder} />
                  </>
                ) : null}

                {socials.length > 0 ? (
                  <ul className={styles.social} aria-label="Social media">
                    {socials.map(({ key, label, Icon, href }) => (
                      <li key={key}>
                        <SmartLink
                          href={href}
                          newTab
                          className={styles.socialLink}
                          aria-label={label}
                        >
                          <Icon className={styles.socialIcon} />
                        </SmartLink>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ) : null}

            {columns.length > 0 ? (
              <div className={styles.columns}>
                {columns.map((column) => (
                  <nav key={column.id} aria-labelledby={`footer-column-${column.id}`}>
                    <h2 id={`footer-column-${column.id}`} className={styles.heading}>
                      {column.title}
                    </h2>
                    <ul className={styles.links}>
                      {column.links.map((link) => (
                        <li key={link.id}>
                          <SmartLink href={link.href} className={styles.link}>
                            {link.label}
                          </SmartLink>
                        </li>
                      ))}
                    </ul>
                  </nav>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {hasBottom ? (
          <div className={styles.bottom}>
            <p className={styles.copyright}>{copyright}</p>

            {logo ? (
              <Link href="/" className={styles.logoLink} aria-label={`${siteName || 'Home'} home`}>
                <Logo image={logo} name={siteName} height={60} className={styles.logo} />
              </Link>
            ) : (
              <span />
            )}

            {payment ? (
              <Image
                src={payment.url}
                alt={payment.alt || 'Accepted payment methods'}
                {...sizeForHeight(payment, PAYMENT_IMAGE_HEIGHT, 8)}
                unoptimized={isSvgUrl(payment.url)}
                className={styles.payment}
              />
            ) : (
              <span />
            )}
          </div>
        ) : null}
      </Container>
    </footer>
  )
}
