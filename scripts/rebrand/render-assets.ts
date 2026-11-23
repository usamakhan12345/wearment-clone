/**
 * Renders the AMORA brand assets locally. Reads from `.import-cache/images`, writes to
 * `brand-assets/amora/`. Does NOT touch the database; `upload-assets.ts` does that.
 *
 *   node scripts/rebrand/render-assets.ts          # uses brand-assets/fonts/Jost.ttf (SIL OFL)
 *   BRAND_FONT=path/to/other.ttf node scripts/rebrand/render-assets.ts
 *
 * - logo-header.png / logo-footer.png: AMORA wordmark, transparent background.
 * - banner-2..6.jpg: the old banners with the baked-in "WEARMENTS" erased and "AMORA" drawn in its
 *   place, in the same position, height and colour. Banner 1 never showed the name.
 *
 * Erasing works by detecting the dark text pixels inside a small search box, then replacing them
 * with a vertical blend of the clean rows above and below the box. That is exact for soft walls
 * and gradients (all five banners) and would not suit a busy background.
 *
 * Runs on Node's native TypeScript support, so keep it to erasable syntax (no enums/namespaces).
 */
import fs from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'

const BRAND = 'AMORA'
const FONT = process.env.BRAND_FONT ?? path.resolve('brand-assets/fonts/Jost.ttf')

const SRC = path.resolve('.import-cache/images')
const OUT = path.resolve('brand-assets/amora')

type Box = [left: number, top: number, right: number, bottom: number]
type BannerSpec = { source: string; out: string; box: Box; align: 'center' | 'left' }

// Search boxes were measured from the banners; each leaves a clean margin around the text.
const BANNERS: BannerSpec[] = [
  { source: 'wearments-banner-2-6eb4663930.jpg', out: 'banner-2.jpg', box: [965, 212, 1315, 285], align: 'center' },
  { source: 'wearments-banner-3-fce11c7ec1.jpg', out: 'banner-3.jpg', box: [1010, 238, 1355, 308], align: 'center' },
  { source: 'wearments-banner-4-6b48a8411e.jpg', out: 'banner-4.jpg', box: [925, 335, 1330, 412], align: 'center' },
  { source: 'wearments-banner-5-da3052d96c.jpg', out: 'banner-5.jpg', box: [115, 265, 640, 358], align: 'left' },
  { source: 'wearments-banner-6-5cd550cf7d.jpg', out: 'banner-6.jpg', box: [270, 458, 750, 545], align: 'center' },
]

/** AMORA as a tightly trimmed transparent PNG. `tracking` is letter spacing in Pango units. */
async function wordmark(color: string, weight: 'Jost' | 'Jost Medium', tracking: number) {
  const { data } = await sharp({
    text: {
      text: `<span foreground="${color}" letter_spacing="${tracking}">${BRAND}</span>`,
      font: weight,
      fontfile: FONT,
      rgba: true,
      dpi: 1400,
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true })
  return sharp(data).trim().png().toBuffer()
}

async function renderLogos() {
  const color = '#2d2d2d'
  const mark = await wordmark(color, 'Jost', 40000)
  const { width = 0, height = 0 } = await sharp(mark).metadata()

  // Header: wordmark only, padded a little so antialiasing is never clipped.
  const pad = Math.round(height * 0.18)
  await sharp(mark)
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(OUT, 'logo-header.png'))

  // Footer: wordmark with a short rule underneath.
  const ruleWidth = Math.round(width * 0.34)
  const ruleHeight = Math.max(3, Math.round(height * 0.05))
  const gap = Math.round(height * 0.32)
  const canvasW = width + pad * 2
  const canvasH = height + gap + ruleHeight + pad * 2
  await sharp({
    create: { width: canvasW, height: canvasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: mark, left: pad, top: pad },
      {
        input: {
          create: { width: ruleWidth, height: ruleHeight, channels: 4, background: color },
        },
        left: Math.round((canvasW - ruleWidth) / 2),
        top: pad + height + gap,
      },
    ])
    .png()
    .toFile(path.join(OUT, 'logo-footer.png'))
}

/** Rolling dilation of a boolean mask by `radius` pixels (separable box). */
function dilate(mask: Uint8Array, w: number, h: number, radius: number): Uint8Array {
  const pass = (src: Uint8Array, horizontal: boolean) => {
    const dst = new Uint8Array(src.length)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!src[y * w + x]) continue
        for (let d = -radius; d <= radius; d++) {
          const nx = horizontal ? x + d : x
          const ny = horizontal ? y : y + d
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) dst[ny * w + nx] = 1
        }
      }
    }
    return dst
  }
  return pass(pass(mask, true), false)
}

async function renderBanner(spec: BannerSpec) {
  const { data, info } = await sharp(path.join(SRC, spec.source))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width: W, height: H } = info // 3 channels
  const [l, t, r, b] = spec.box
  const w = r - l
  const h = b - t
  const px = (x: number, y: number, c: number) => data[(y * W + x) * 3 + c]!
  const luma = (x: number, y: number) =>
    0.299 * px(x, y, 0) + 0.587 * px(x, y, 1) + 0.114 * px(x, y, 2)

  // Clean reference rows: average of 3 rows at the very top and very bottom of the box.
  const ref = (x: number, rows: number[], c: number) =>
    rows.reduce((sum, y) => sum + px(x, y, c), 0) / rows.length
  const topRows = [t, t + 1, t + 2]
  const botRows = [b - 3, b - 2, b - 1]

  // `mask` (strict) measures where the text is; `halo` (loose) is what gets erased, so the faint
  // antialiasing and JPEG ringing around each letter goes too.
  const mask = new Uint8Array(w * h)
  const halo = new Uint8Array(w * h)
  const core: Array<[number, number]> = []
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const gx = l + x
      const gy = t + y
      const k = y / (h - 1)
      const bgLuma =
        0.299 * ((1 - k) * ref(gx, topRows, 0) + k * ref(gx, botRows, 0)) +
        0.587 * ((1 - k) * ref(gx, topRows, 1) + k * ref(gx, botRows, 1)) +
        0.114 * ((1 - k) * ref(gx, topRows, 2) + k * ref(gx, botRows, 2))
      const diff = bgLuma - luma(gx, gy)
      if (diff > 30) mask[y * w + x] = 1
      if (diff > 12) halo[y * w + x] = 1
      if (diff > 90) core.push([gx, gy])
    }
  }

  // Text bounds, ignoring stray pixels: a row/column counts only with 2+ mask pixels.
  const colCount = new Uint16Array(w)
  const rowCount = new Uint16Array(h)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (mask[y * w + x]) {
        colCount[x]!++
        rowCount[y]!++
      }
  const xs = [...colCount.keys()].filter((x) => colCount[x]! >= 2)
  const ys = [...rowCount.keys()].filter((y) => rowCount[y]! >= 2)
  if (xs.length === 0 || core.length === 0) throw new Error(`${spec.source}: no text found in box`)
  const x0 = l + xs[0]!
  const x1 = l + xs[xs.length - 1]!
  const y0 = t + ys[0]!
  const y1 = t + ys[ys.length - 1]!
  if (xs[0]! < 6 || xs[xs.length - 1]! > w - 6 || ys[0]! < 6 || ys[ys.length - 1]! > h - 6) {
    throw new Error(`${spec.source}: text touches the search box edge, widen the box`)
  }

  // Text colour: mean of the solid core pixels.
  const color = [0, 1, 2].map((c) =>
    Math.round(core.reduce((sum, [x, y]) => sum + px(x, y, c), 0) / core.length),
  )

  // Erase: diffusion inpainting. Start from the vertical blend of the clean rows, then relax every
  // erased pixel towards the mean of its four neighbours (Laplace equation, SOR). The fill then
  // continues the surrounding gradient from all sides, including diagonal shadows.
  const erase = dilate(new Uint8Array(halo.map((v, i) => (v || mask[i] ? 1 : 0))), w, h, 5)
  const field = [0, 1, 2].map((c) => {
    const f = new Float32Array(w * h)
    for (let y = 0; y < h; y++) {
      const k = y / (h - 1)
      for (let x = 0; x < w; x++) {
        f[y * w + x] = erase[y * w + x]
          ? (1 - k) * ref(l + x, topRows, c) + k * ref(l + x, botRows, c)
          : px(l + x, t + y, c)
      }
    }
    return f
  })
  const omega = 1.9
  for (let iter = 0; iter < 800; iter++) {
    for (const f of field) {
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x
          if (!erase[i]) continue
          const avg = (f[i - 1]! + f[i + 1]! + f[i - w]! + f[i + w]!) / 4
          f[i] = f[i]! + omega * (avg - f[i]!)
        }
      }
    }
  }
  const out = Buffer.from(data)
  let seed = 1
  const grain = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return (seed / 0xffffffff - 0.5) * 3.5
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!erase[y * w + x]) continue
      for (let c = 0; c < 3; c++) {
        const v = field[c]![y * w + x]! + grain()
        out[((t + y) * W + (l + x)) * 3 + c] = Math.max(0, Math.min(255, Math.round(v)))
      }
    }
  }

  // Draw AMORA at the old text's cap height, in its colour and position.
  const hex = `#${color.map((v) => v.toString(16).padStart(2, '0')).join('')}`
  const mark = await wordmark(hex, 'Jost Medium', 45000)
  const targetH = y1 - y0 + 1
  const resized = await sharp(mark).resize({ height: targetH }).png().toBuffer()
  const markW = (await sharp(resized).metadata()).width ?? 0
  const left = spec.align === 'center' ? Math.round((x0 + x1) / 2 - markW / 2) : x0

  await sharp(out, { raw: { width: W, height: H, channels: 3 } })
    .composite([{ input: resized, left, top: y0 }])
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(path.join(OUT, spec.out))

  console.log(
    `${spec.out}: old text ${x1 - x0 + 1}x${targetH} at (${x0},${y0}) colour ${hex} -> AMORA ${markW}x${targetH}`,
  )
}

await fs.mkdir(OUT, { recursive: true })
await renderLogos()
console.log('logo-header.png, logo-footer.png written')
for (const spec of BANNERS) await renderBanner(spec)
console.log(`\nDone. Review the files in ${OUT}`)
