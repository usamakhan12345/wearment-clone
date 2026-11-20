import { getSiteSettings } from '@/services/globals'

import { WhatsAppIcon } from '../shared/icons'
import { buildWhatsAppUrl, normalizeWhatsAppNumber } from '../shared/links'
import styles from './WhatsAppButton.module.scss'

/** Floating "chat with us" button. Renders nothing until a WhatsApp number is set in Site settings. */
export async function WhatsAppButton() {
  const settings = await getSiteSettings()
  const number = normalizeWhatsAppNumber(settings.whatsapp?.number)

  if (!number) return null

  return (
    <a
      href={buildWhatsAppUrl(number, settings.whatsapp?.message)}
      className={styles.button}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
    >
      <WhatsAppIcon className={styles.icon} />
    </a>
  )
}
