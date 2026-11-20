import { getHeader } from '@/services/globals'

import { AnnouncementTicker, type AnnouncementMessage } from './AnnouncementTicker'

/** Thin dark bar above the header; rotates the messages configured in the Header global. */
export async function AnnouncementBar() {
  const header = await getHeader()
  const { messages: rawMessages, autoplaySeconds } = header.announcement ?? {}

  const messages = (rawMessages ?? []).flatMap<AnnouncementMessage>((message, index) => {
    const text = message.text?.trim()

    return text ? [{ id: message.id ?? String(index), text, href: message.link ?? null }] : []
  })

  if (messages.length === 0) return null

  return <AnnouncementTicker messages={messages} autoplaySeconds={autoplaySeconds ?? 4} />
}
