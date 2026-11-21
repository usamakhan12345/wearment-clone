import Image from 'next/image'

import { SmartLink } from '@/components/layout/shared/SmartLink'
import type { CollectionTilesBlock } from '@/payload-types'
import { toImageData, type ImageData } from '@/services/products'

import { splitIntoColumns } from './columns'
import styles from './CollectionTiles.module.scss'

type Tile = {
  id: string
  image: ImageData
  href: string
}

const TILE_SIZES = '(min-width: 72rem) 575px, (min-width: 40rem) 50vw, 100vw'

function TileLink({ tile, order }: { tile: Tile; order: number }) {
  const { image } = tile
  const hasSize = Boolean(image.width && image.height)

  return (
    // `order` restores the authored sequence when the two columns collapse into one on phones. On
    // wider screens it is harmless: each column's indexes are already ascending.
    <SmartLink href={tile.href} className={styles.tile} style={{ order }}>
      {hasSize ? (
        <Image
          src={image.url}
          alt={image.alt}
          width={image.width ?? 0}
          height={image.height ?? 0}
          sizes={TILE_SIZES}
          className={styles.image}
        />
      ) : (
        <span className={styles.placeholder}>
          <Image src={image.url} alt={image.alt} fill sizes={TILE_SIZES} className={styles.cover} />
        </span>
      )}
    </SmartLink>
  )
}

/** Two-column mosaic of large, clickable collection images shown at their natural proportions. */
export function CollectionTiles({ block }: { block: CollectionTilesBlock }) {
  const tiles = (block.tiles ?? []).flatMap<Tile>((tile, index) => {
    const image = toImageData(tile.image, 'original')

    return image && tile.link ? [{ id: tile.id ?? String(index), image, href: tile.link }] : []
  })

  if (tiles.length === 0) return null

  const { left, right } = splitIntoColumns(tiles.length)

  return (
    <section className={styles.section} aria-label="Shop by collection">
      <div className={styles.grid}>
        {[left, right].map((indexes, column) => (
          <div key={column} className={styles.column}>
            {indexes.map((index) => (
              <TileLink key={tiles[index].id} tile={tiles[index]} order={index} />
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
