import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { RichText } from '@/components/content/RichText/RichText'
import { Container } from '@/components/ui/Container/Container'
import { hasLexicalContent, lexicalToPlainText, truncateText } from '@/lib/catalog/rich-text'
import { getPageBySlug } from '@/services/pages'

import styles from './page.module.scss'

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const page = await getPageBySlug(slug)

  if (!page) return { title: 'Page not found' }

  const description = truncateText(lexicalToPlainText(page.content), 160)

  return {
    title: page.title,
    ...(description ? { description } : {}),
  }
}

/** Text page (policies, FAQ, ...): a narrow reading column with the title and rich-text body. */
export default async function CmsPage({ params }: PageProps) {
  const { slug } = await params
  const page = await getPageBySlug(slug)

  if (!page) notFound()

  return (
    <Container as="main" className={styles.main}>
      <h1 className={styles.title}>{page.title}</h1>
      {hasLexicalContent(page.content) ? (
        <RichText data={page.content} />
      ) : (
        <p className={styles.empty}>This page has no content yet.</p>
      )}
    </Container>
  )
}
