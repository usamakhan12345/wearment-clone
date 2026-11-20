import { serializeJsonLd, type ProductJsonLd } from '@/lib/catalog/json-ld'

/** Inline schema.org structured data; the serializer escapes anything that could close the tag. */
export function JsonLd({ data }: { data: ProductJsonLd }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  )
}
