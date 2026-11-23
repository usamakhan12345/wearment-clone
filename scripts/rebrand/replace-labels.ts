/**
 * Replaces the old brand name printed in photos (neck labels, hang tags, bags) with AMORA.
 * Reads detections from `find-labels.ts` (`.rebrand-backup/labels.json`) and the original images in
 * `.import-cache/images`; writes patched JPEGs to `brand-assets/amora/photos/` and before/after
 * contact sheets to `.rebrand-backup/qa/`. Does NOT touch the database (see apply-photos.ts).
 *
 *   node scripts/rebrand/replace-labels.ts
 *   FILES=a,b  LIMIT=n  OFFSET=n   restrict which images are processed
 *   DETECTIONS=name                use `.rebrand-backup/<name>.json` (default labels)
 *   TAG=n                          suffix for the QA folder and report, so parallel runs on
 *                                  different OFFSET/LIMIT slices do not overwrite each other
 *
 * Per detection: (1) take the pixels inside the OCR box, split ink from label background with an
 * Otsu threshold; (2) erase the ink (plus a thin halo) by diffusion inpainting, so the fill
 * continues the label/fabric gradient; (3) draw AMORA in Jost at the old text's height, angle and
 * colour, slightly blurred to match the photo. Text that is cut off (hang tag half under a
 * collar) is erased but not redrawn, because AMORA would spill over the garment.
 *
 * Runs on Node's native TypeScript support: erasable syntax only.
 */
import fs from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'

const CACHE = path.resolve('.import-cache/images')
const OUT_DIR = path.resolve('brand-assets/amora/photos')
const TAG = process.env.TAG ? `-${process.env.TAG}` : ''
const QA_DIR = path.resolve(`.rebrand-backup/qa${TAG}`)
const FONT = process.env.BRAND_FONT ?? path.resolve('brand-assets/fonts/Jost.ttf')
const BRAND = 'AMORA'

type Detection = {
  file: string
  text: string
  region: string
  score: number
  cx: number
  cy: number
  length: number
  thick: number
  angle: number
  partial: boolean
}

type Report = {
  file: string
  text: string
  status: 'replaced' | 'erased' | 'skipped'
  reason?: string
  ink?: { length: number; height: number; angle: number; color: string }
  cx: number
  cy: number
  box: number
}

type Raster = { data: Uint8Array; w: number; h: number }

const luma = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** Otsu threshold of 0..255 values; also returns each side's mean and size. */
function otsu(values: number[]) {
  const hist = new Array<number>(256).fill(0)
  for (const v of values) hist[clamp(Math.round(v), 0, 255)]!++
  const total = values.length
  let sumAll = 0
  for (let i = 0; i < 256; i++) sumAll += i * hist[i]!
  let wB = 0
  let sumB = 0
  let best = -1
  let threshold = 127
  for (let t = 0; t < 256; t++) {
    wB += hist[t]!
    if (wB === 0) continue
    const wF = total - wB
    if (wF === 0) break
    sumB += t * hist[t]!
    const mB = sumB / wB
    const mF = (sumAll - sumB) / wF
    const between = wB * wF * (mB - mF) ** 2
    if (between > best) {
      best = between
      threshold = t
    }
  }
  let lowSum = 0
  let lowN = 0
  let highSum = 0
  let highN = 0
  for (const v of values) {
    if (v <= threshold) (lowSum += v), lowN++
    else (highSum += v), highN++
  }
  return {
    threshold,
    lowMean: lowN ? lowSum / lowN : 0,
    highMean: highN ? highSum / highN : 0,
    lowN,
    highN,
  }
}

/** Diffusion inpainting: masked pixels relax towards the mean of their 4 neighbours (SOR). */
function inpaint(img: Raster, mask: Uint8Array, x0: number, y0: number, bw: number, bh: number) {
  const idx: number[] = []
  for (let i = 0; i < bw * bh; i++) if (mask[i]) idx.push(i)
  if (idx.length === 0) return

  const channels = [0, 1, 2].map((c) => {
    const f = new Float32Array(bw * bh)
    for (let y = 0; y < bh; y++)
      for (let x = 0; x < bw; x++) f[y * bw + x] = img.data[((y0 + y) * img.w + (x0 + x)) * 3 + c]!
    return f
  })

  // Start from the mean of the known pixels touching the mask.
  for (const f of channels) {
    let sum = 0
    let n = 0
    for (const i of idx) {
      const x = i % bw
      const y = (i / bw) | 0
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= bw || ny >= bh) continue
        const j = ny * bw + nx
        if (!mask[j]) (sum += f[j]!), n++
      }
    }
    const mean = n ? sum / n : 128
    for (const i of idx) f[i] = mean
  }

  const omega = 1.9
  const maxIter = clamp(Math.round(Math.max(bw, bh) * 6), 400, 3000)
  for (const f of channels) {
    for (let iter = 0; iter < maxIter; iter++) {
      let delta = 0
      for (const i of idx) {
        const x = i % bw
        const y = (i / bw) | 0
        const left = x > 0 ? f[i - 1]! : f[i]!
        const right = x < bw - 1 ? f[i + 1]! : f[i]!
        const up = y > 0 ? f[i - bw]! : f[i]!
        const down = y < bh - 1 ? f[i + bw]! : f[i]!
        const next = f[i]! + omega * ((left + right + up + down) / 4 - f[i]!)
        delta = Math.max(delta, Math.abs(next - f[i]!))
        f[i] = next
      }
      if (delta < 0.03) break
    }
  }

  // Photo grain: the ring around the mask tells us how noisy the surface is.
  let noiseSum = 0
  let noiseN = 0
  for (const i of idx) {
    const x = i % bw
    const y = (i / bw) | 0
    for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]] as const) {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || ny < 0 || nx >= bw || ny >= bh || mask[ny * bw + nx]) continue
      const k = ((y0 + ny) * img.w + (x0 + nx)) * 3
      const k2 = ((y0 + ny) * img.w + (x0 + nx - dx)) * 3
      noiseSum += Math.abs(img.data[k + 1]! - img.data[k2 + 1]!)
      noiseN++
    }
  }
  const sigma = noiseN ? clamp((noiseSum / noiseN) * 0.5, 0, 4) : 0
  let seed = 7
  const gauss = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    const a = seed / 0xffffffff
    seed = (seed * 1664525 + 1013904223) >>> 0
    const b = seed / 0xffffffff
    return Math.sqrt(-2 * Math.log(a + 1e-9)) * Math.cos(2 * Math.PI * b)
  }

  for (const i of idx) {
    const x = i % bw
    const y = (i / bw) | 0
    for (let c = 0; c < 3; c++) {
      img.data[((y0 + y) * img.w + (x0 + x)) * 3 + c] = clamp(Math.round(channels[c]![i]! + gauss() * sigma), 0, 255)
    }
  }
}

/** Rendering text with a font file is slow (fontconfig), so each weight is rendered once. */
const glyphCache = new Map<string, Promise<Buffer>>()
function glyphAlpha(weight: 'Jost' | 'Jost Medium'): Promise<Buffer> {
  let cached = glyphCache.get(weight)
  if (!cached) {
    cached = (async () => {
      const { data } = await sharp({
        text: { text: `<span letter_spacing="26000">${BRAND}</span>`, font: weight, fontfile: FONT, rgba: true, dpi: 1400 },
      })
        .png()
        .toBuffer({ resolveWithObject: true })
      const trimmed = await sharp(data).trim().png().toBuffer()
      return sharp(trimmed).extractChannel(3).png().toBuffer()
    })()
    glyphCache.set(weight, cached)
  }
  return cached
}

/** AMORA as a solid-colour RGBA image with the glyphs in the alpha channel. */
async function wordmark(color: [number, number, number], weight: 'Jost' | 'Jost Medium', heightPx: number) {
  const alpha = await sharp(await glyphAlpha(weight)).resize({ height: Math.max(2, Math.round(heightPx)) }).png().toBuffer()
  const { width = 1, height = 1 } = await sharp(alpha).metadata()
  return sharp({ create: { width, height, channels: 3, background: { r: color[0], g: color[1], b: color[2] } } })
    .joinChannel(alpha)
    .png()
    .toBuffer()
}

type Patch = { det: Detection; report: Report; draw?: { color: [number, number, number]; s: number; t: number; height: number } }

/** Erases one detection's ink in `img`; returns what to draw afterwards. */
function eraseOne(img: Raster, det: Detection): Patch {
  const rad = (det.angle * Math.PI) / 180
  const ux = Math.cos(rad)
  const uy = Math.sin(rad)
  const vx = -Math.sin(rad)
  const vy = Math.cos(rad)
  const base = { file: det.file, text: det.text, cx: det.cx, cy: det.cy, box: Math.round(det.length) }
  const skip = (reason: string): Patch => ({ det, report: { ...base, status: 'skipped', reason } })

  // OCR sometimes misses a letter (a thread over the "S", a collar over the "W"): widen the search
  // on the side(s) where letters are missing, and keep only ink connected to the word.
  const { missingStart, missingEnd } = missingLetters(det.text)
  const charWidth = det.length / Math.max(1, norm(det.text).length)
  const extStart = missingStart * charWidth
  const extEnd = missingEnd * charWidth

  // Pixels inside the box, in text-frame coordinates (s along the text, t across it).
  const halfL = det.length / 2 + 2
  const halfT = det.thick * 0.45
  const reach = Math.ceil(Math.hypot(halfL + Math.max(extStart, extEnd), halfT)) + 1
  const px: Array<{ x: number; y: number; s: number; t: number; l: number }> = []
  for (let y = Math.max(0, Math.floor(det.cy - reach)); y <= Math.min(img.h - 1, Math.ceil(det.cy + reach)); y++) {
    for (let x = Math.max(0, Math.floor(det.cx - reach)); x <= Math.min(img.w - 1, Math.ceil(det.cx + reach)); x++) {
      const dx = x - det.cx
      const dy = y - det.cy
      const s = dx * ux + dy * uy
      const t = dx * vx + dy * vy
      if (s < -(halfL + extStart) || s > halfL + extEnd || Math.abs(t) > halfT) continue
      const k = (y * img.w + x) * 3
      px.push({ x, y, s, t, l: luma(img.data[k]!, img.data[k + 1]!, img.data[k + 2]!) })
    }
  }
  if (px.length < 40) return skip('box outside image')

  const split = otsu(px.map((p) => p.l))
  if (split.highMean - split.lowMean < 30) return skip('low contrast')

  // Background is whichever side dominates the outer band of the box (top/bottom edges).
  const band = px.filter((p) => Math.abs(p.t) > halfT * 0.78)
  const bandLow = band.filter((p) => p.l <= split.threshold).length
  const inkIsDark = bandLow < band.length / 2

  // Contrast against the LOCAL background: at each position along the text, the median across the
  // text is the label surface (ink covers well under half of the cross-section). That removes
  // lighting gradients, e.g. a tag whose text is dark at one end and faded at the other.
  const columns = new Map<number, number[]>()
  for (const p of px) {
    const key = Math.round(p.s)
    const list = columns.get(key)
    if (list) list.push(p.l)
    else columns.set(key, [p.l])
  }
  const median = (values: number[]) => [...values].sort((a, b) => a - b)[values.length >> 1]!
  const globalBg = median(px.map((p) => p.l))
  const localBg = new Map<number, number>()
  for (const [key, list] of columns) localBg.set(key, list.length >= 3 ? median(list) : globalBg)
  const contrastOf = (p: { s: number; l: number }) => {
    const bg = localBg.get(Math.round(p.s)) ?? globalBg
    return inkIsDark ? bg - p.l : p.l - bg
  }
  const contrasts = px.map(contrastOf).sort((a, b) => a - b)
  const p95 = contrasts[Math.floor(contrasts.length * 0.95)]!
  if (p95 < 22) return skip('low contrast')
  const inkThreshold = Math.max(9, p95 * 0.22)
  const isInk = (p: { s: number; l: number }) => contrastOf(p) > inkThreshold

  // Ink grid, then drop isolated specks.
  const gx0 = Math.floor(det.cx - reach)
  const gy0 = Math.floor(det.cy - reach)
  const gw = reach * 2 + 3
  const grid = new Uint8Array(gw * gw)
  for (const p of px) if (isInk(p)) grid[(p.y - gy0) * gw + (p.x - gx0)] = 1
  const solid = new Uint8Array(gw * gw)
  for (const p of px) {
    const gi = (p.y - gy0) * gw + (p.x - gx0)
    if (!grid[gi]) continue
    let n = 0
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && grid[gi + dy * gw + dx]) n++
    if (n >= 2) solid[gi] = 1
  }
  let ink = px.filter((p) => solid[(p.y - gy0) * gw + (p.x - gx0)])
  if (ink.length < 20) return skip('no ink found')

  // Ink beyond the OCR box (the widened ends) only counts when it connects to the word itself.
  const inBox = (p: { s: number }) => p.s >= -halfL && p.s <= halfL
  if (extStart > 0 || extEnd > 0) {
    const gap = 3
    const kept = new Set<number>()
    const lookup = new Map<number, (typeof ink)[number]>()
    for (const p of ink) lookup.set(p.y * img.w + p.x, p)
    const queue = ink.filter(inBox)
    for (const p of queue) kept.add(p.y * img.w + p.x)
    for (let qi = 0; qi < queue.length; qi++) {
      const p = queue[qi]!
      for (let dy = -gap; dy <= gap; dy++)
        for (let dx = -gap; dx <= gap; dx++) {
          const key = (p.y + dy) * img.w + (p.x + dx)
          const q = lookup.get(key)
          if (q && !kept.has(key)) (kept.add(key), queue.push(q))
        }
    }
    ink = ink.filter((p) => kept.has(p.y * img.w + p.x))

    // Letters cover about a third of their band; a near-solid blob out there is fabric, not text.
    const extra = ink.filter((p) => !inBox(p)).length
    if (extra > (extStart + extEnd) * halfT * 2 * 0.6) ink = ink.filter(inBox)
  }

  // Extents from the dense band of ink, so a stray shadow or the neighbouring black size tag
  // cannot inflate the measured text height.
  const bins = new Map<number, number>()
  for (const p of ink) bins.set(Math.round(p.t), (bins.get(Math.round(p.t)) ?? 0) + 1)
  const peakRow = [...bins.entries()].sort((a, b) => b[1] - a[1])[0]![0]
  const peak = bins.get(peakRow)!
  let lo = peakRow
  let hi = peakRow
  while ((bins.get(lo - 1) ?? 0) >= peak * 0.18 || (bins.get(lo - 2) ?? 0) >= peak * 0.18) lo--
  while ((bins.get(hi + 1) ?? 0) >= peak * 0.18 || (bins.get(hi + 2) ?? 0) >= peak * 0.18) hi++
  ink = ink.filter((p) => Math.round(p.t) >= lo && Math.round(p.t) <= hi)
  if (ink.length < 20) return skip('no ink found')

  const sMin = Math.min(...ink.map((p) => p.s))
  const sMax = Math.max(...ink.map((p) => p.s))
  const tMin = Math.min(...ink.map((p) => p.t))
  const tMax = Math.max(...ink.map((p) => p.t))
  const inkLength = sMax - sMin
  const inkHeight = tMax - tMin
  if (inkHeight < 4) return skip('text too small')
  if (inkLength / inkHeight < 2.5) return skip('ink is not word-shaped')

  // Ink colour: the half of the ink that differs most from the background.
  const sorted = [...ink].sort((a, b) => (inkIsDark ? a.l - b.l : b.l - a.l))
  const core = sorted.slice(0, Math.max(10, Math.floor(sorted.length * 0.4)))
  const color = [0, 1, 2].map((c) =>
    Math.round(core.reduce((sum, p) => sum + img.data[(p.y * img.w + p.x) * 3 + c]!, 0) / core.length),
  ) as [number, number, number]

  // Erase: ink dilated by a halo, inside a bounding grid.
  const halo = Math.max(2, Math.round(inkHeight * 0.16))
  const xs = ink.map((p) => p.x)
  const ys = ink.map((p) => p.y)
  const ex0 = Math.max(0, Math.min(...xs) - halo - 3)
  const ey0 = Math.max(0, Math.min(...ys) - halo - 3)
  const ex1 = Math.min(img.w - 1, Math.max(...xs) + halo + 3)
  const ey1 = Math.min(img.h - 1, Math.max(...ys) + halo + 3)
  const bw = ex1 - ex0 + 1
  const bh = ey1 - ey0 + 1
  const mask = new Uint8Array(bw * bh)
  for (const p of ink) {
    for (let dy = -halo; dy <= halo; dy++)
      for (let dx = -halo; dx <= halo; dx++) {
        if (dx * dx + dy * dy > halo * halo + 1) continue
        const x = p.x + dx - ex0
        const y = p.y + dy - ey0
        if (x >= 0 && y >= 0 && x < bw && y < bh) mask[y * bw + x] = 1
      }
  }
  inpaint(img, mask, ex0, ey0, bw, bh)

  const report: Report = {
    ...base,
    status: 'erased',
    ink: { length: Math.round(inkLength), height: Math.round(inkHeight), angle: Math.round(det.angle), color: `rgb(${color.join(',')})` },
  }

  // Cut-off text (collar over the tag, tag at the photo's edge): leave the erased tag blank.
  const full = norm(det.text).length >= 7 && inkLength / inkHeight >= 4.2
  if (!full) return { det, report: { ...report, reason: 'text cut off, erased only' } }

  return {
    det,
    report: { ...report, status: 'replaced' },
    draw: { color, s: (sMin + sMax) / 2, t: (tMin + tMax) / 2, height: inkHeight },
  }
}

const norm = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, '')

const TARGET = 'WEARMENTS'

/** How many letters of WEARMENTS the OCR text is missing before and after it (best alignment). */
function missingLetters(text: string) {
  const n = norm(text)
  if (n.length === 0 || n.length >= TARGET.length) return { missingStart: 0, missingEnd: 0 }
  let best = { dist: Infinity, start: 0 }
  for (let start = 0; start + n.length <= TARGET.length; start++) {
    const slice = TARGET.slice(start, start + n.length)
    let dist = 0
    for (let i = 0; i < n.length; i++) if (n[i] !== slice[i]) dist++
    if (dist < best.dist) best = { dist, start }
  }
  const missingStart = best.start
  const missingEnd = TARGET.length - (best.start + n.length)
  // Only nearly-complete words: with more missing, the "ink" next to the box is as likely garment.
  return n.length >= 7 && missingStart + missingEnd <= 2 ? { missingStart, missingEnd } : { missingStart: 0, missingEnd: 0 }
}

async function patchImage(file: string, dets: Detection[]) {
  const src = sharp(path.join(CACHE, file)).removeAlpha()
  const { data, info } = await src.raw().toBuffer({ resolveWithObject: true })
  const img: Raster = { data: new Uint8Array(data), w: info.width, h: info.height }
  const before = Buffer.from(data)

  // Erase all detections first, then draw, so a later erase never smears an earlier drawing.
  const patches = dets.map((det) => eraseOne(img, det))

  const layers: sharp.OverlayOptions[] = []
  for (const patch of patches) {
    if (!patch.draw) continue
    const { color, s, t, height } = patch.draw
    const rad = (patch.det.angle * Math.PI) / 180
    const cx = patch.det.cx + Math.cos(rad) * s - Math.sin(rad) * t
    const cy = patch.det.cy + Math.sin(rad) * s + Math.cos(rad) * t
    const weight = height >= 16 ? 'Jost Medium' : 'Jost'
    let text = sharp(await wordmark(color, weight, height))
    text = text.rotate(patch.det.angle, { background: { r: color[0], g: color[1], b: color[2], alpha: 0 } })
    const blur = clamp(height * 0.03, 0.5, 1.4)
    const rotated = await text.blur(blur).png().toBuffer({ resolveWithObject: true })
    layers.push({
      input: rotated.data,
      left: Math.round(cx - rotated.info.width / 2),
      top: Math.round(cy - rotated.info.height / 2),
    })
  }

  const out = await sharp(Buffer.from(img.data), { raw: { width: img.w, height: img.h, channels: 3 } })
    .composite(layers)
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer()
  return { out, before, after: out, info, patches }
}

/** Before | after crops around each detection, stacked into sheets for visual review. */
async function contactSheets(items: Array<{ label: string; before: Buffer; after: Buffer }>) {
  await fs.mkdir(QA_DIR, { recursive: true })
  for (const old of await fs.readdir(QA_DIR)) await fs.rm(path.join(QA_DIR, old), { force: true })
  const perSheet = 16
  for (let s = 0; s * perSheet < items.length; s++) {
    const slice = items.slice(s * perSheet, (s + 1) * perSheet)
    const rows = await Promise.all(
      slice.map(async (item) => {
        const pair = await sharp({ create: { width: 520, height: 240, channels: 3, background: '#ffffff' } })
          .composite([
            { input: item.before, left: 0, top: 0 },
            { input: item.after, left: 260, top: 0 },
          ])
          .png()
          .toBuffer()
        return { input: pair, label: item.label }
      }),
    )
    const cols = 2
    const sheet = sharp({
      create: { width: 520 * cols + 10, height: Math.ceil(rows.length / cols) * 244, channels: 3, background: '#888888' },
    })
    await sheet
      .composite(rows.map((r, i) => ({ input: r.input, left: (i % cols) * 524, top: Math.floor(i / cols) * 244 })))
      .jpeg({ quality: 88 })
      .toFile(path.join(QA_DIR, `sheet-${String(s + 1).padStart(2, '0')}.jpg`))
    await fs.writeFile(
      path.join(QA_DIR, `sheet-${String(s + 1).padStart(2, '0')}.txt`),
      slice.map((r, i) => `${i + 1}. ${r.label}`).join('\n'),
    )
  }
}

async function crop(raw: Buffer, w: number, h: number, cx: number, cy: number, half: number) {
  const left = clamp(Math.round(cx - half), 0, Math.max(0, w - 2))
  const top = clamp(Math.round(cy - half), 0, Math.max(0, h - 2))
  const width = Math.min(Math.round(half * 2), w - left)
  const height = Math.min(Math.round(half * 2), h - top)
  return sharp(raw, { raw: { width: w, height: h, channels: 3 } })
    .extract({ left, top, width, height })
    .resize({ width: 256, height: 236, fit: 'contain', background: '#ffffff' })
    .png()
    .toBuffer()
}

async function main() {
  const name = process.env.DETECTIONS ?? 'labels'
  const { detections } = JSON.parse(await fs.readFile(path.resolve('.rebrand-backup', `${name}.json`), 'utf8')) as {
    detections: Detection[]
  }
  const only = process.env.FILES?.split(',').filter(Boolean)
  const byFile = new Map<string, Detection[]>()
  for (const d of detections) {
    if (only && !only.some((o) => d.file.includes(o))) continue
    byFile.set(d.file, [...(byFile.get(d.file) ?? []), d])
  }
  let files = [...byFile.keys()].sort()
  const offset = Number(process.env.OFFSET ?? 0)
  const limit = Number(process.env.LIMIT ?? 0)
  files = files.slice(offset, limit ? offset + limit : undefined)

  await fs.mkdir(OUT_DIR, { recursive: true })
  const reports: Report[] = []
  const sheets: Array<{ label: string; before: Buffer; after: Buffer }> = []

  for (const file of files) {
    const dets = byFile.get(file)!
    const { out, before, after, info, patches } = await patchImage(file, dets)
    await fs.writeFile(path.join(OUT_DIR, `${path.parse(file).name}.jpg`), out)
    const afterRaw = await sharp(after).removeAlpha().raw().toBuffer()
    for (const patch of patches) {
      reports.push(patch.report)
      const half = Math.max(patch.det.length, patch.det.thick) * 0.9 + 24
      sheets.push({
        label: `${file.slice(0, 48)} [${patch.report.status}${patch.report.reason ? ': ' + patch.report.reason : ''}]`,
        before: await crop(before, info.width, info.height, patch.det.cx, patch.det.cy, half),
        after: await crop(afterRaw, info.width, info.height, patch.det.cx, patch.det.cy, half),
      })
    }
    process.stdout.write('.')
  }

  await contactSheets(sheets)
  await fs.writeFile(path.resolve('.rebrand-backup', `photo-report${TAG}.json`), JSON.stringify(reports, null, 2))
  const count = (s: Report['status']) => reports.filter((r) => r.status === s).length
  console.log(
    `\n${files.length} images, ${reports.length} detections: ${count('replaced')} replaced, ${count('erased')} erased only, ${count('skipped')} skipped`,
  )
  for (const r of reports.filter((x) => x.status === 'skipped').slice(0, 15)) console.log(`  skipped ${r.file.slice(0, 50)}: ${r.reason}`)
  console.log(`Patched images: ${OUT_DIR}\nReview sheets:  ${QA_DIR}`)
}

await main()
