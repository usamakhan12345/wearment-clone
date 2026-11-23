/**
 * Finds the old brand name printed inside photos (neck labels, hang tags, bags) by OCR.
 * READ-ONLY on the images and the database.
 *
 *   RAPID_PYTHON=<venv>/Scripts/python.exe node scripts/rebrand/find-labels.ts
 *
 * Env:  RAPID_PYTHON  python with `rapidocr-onnxruntime` installed (see ocr_rapid.py)   [required]
 *       WORKERS=4     parallel OCR processes
 *       SCALE=1       upscale before OCR
 *       FILES=a,b     only images whose name contains one of these
 *       LIMIT/OFFSET  slice of the sorted image list (trial runs)
 *       OUT=name      result `.rebrand-backup/<name>.json` (default labels); per-image OCR lines are
 *                     kept in `<name>.ocr.jsonl` so a finished OCR run is never repeated
 *
 * RapidOCR (unlike the Windows engine) copes with textured photos and rotated text. Every region
 * whose text is, or contains, a close match for "WEARMENTS" becomes a detection: centre, length
 * along the text, thickness, and reading angle (degrees clockwise, 0 = left-to-right).
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

const CACHE = path.resolve('.import-cache/images')
const BACKUP = path.resolve('.rebrand-backup')
const OUT_NAME = process.env.OUT ?? 'labels'
const OCR_LINES = path.join(BACKUP, `${OUT_NAME}.ocr.jsonl`)
const OUT = path.join(BACKUP, `${OUT_NAME}.json`)
const PYTHON = process.env.RAPID_PYTHON
const WORKERS = Number(process.env.WORKERS ?? 4)
const SCALE = Number(process.env.SCALE ?? 1)
const TARGET = 'WEARMENTS'

if (!PYTHON) throw new Error('Set RAPID_PYTHON to a python that has rapidocr-onnxruntime installed')

const norm = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, '')

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]!
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return row[b.length]!
}

/** A token that is (a damaged or truncated reading of) the brand name. */
const isBrandToken = (text: string) => {
  const n = norm(text)
  return n.length >= 5 && distance(n, TARGET) <= 3
}

type Region = {
  text: string
  score: number
  flipped: boolean
  poly: number[][]
  cx: number
  cy: number
  length: number
  thick: number
  angle: number
}
type OcrLine = { file: string; error?: string; regions: Region[] }

export type Detection = {
  file: string
  text: string
  /** The whole OCR region the word came from ("WEARMENTS CLOTHING"). */
  region: string
  score: number
  /** Centre of the brand word, original pixels. */
  cx: number
  cy: number
  /** Extent along the text and across it (the OCR box, padded), original pixels. */
  length: number
  thick: number
  /** Reading direction, degrees clockwise from left-to-right. */
  angle: number
  /** True when the region holds more than the brand word, so length/centre were apportioned. */
  partial: boolean
}

function detectionsOf(line: OcrLine): Detection[] {
  const found: Detection[] = []
  for (const region of line.regions) {
    const tokens = region.text.split(/\s+/).filter(Boolean)
    const whole = isBrandToken(region.text) // "WEARMENTS" read as one word, or with stray marks
    const index = whole ? -1 : tokens.findIndex(isBrandToken)
    if (!whole && index < 0) continue

    let { cx, cy, length } = region
    let partial = false
    if (!whole && tokens.length > 1) {
      // Apportion the box by character count (spaces count as one character).
      const total = region.text.length
      const start = tokens.slice(0, index).join(' ').length + (index > 0 ? 1 : 0)
      const end = start + tokens[index]!.length
      const mid = (start + end) / 2 / total - 0.5
      const rad = (region.angle * Math.PI) / 180
      cx += Math.cos(rad) * mid * region.length
      cy += Math.sin(rad) * mid * region.length
      length = ((end - start) / total) * region.length
      partial = true
    }
    found.push({
      file: path.basename(line.file),
      text: whole ? region.text : tokens[index]!,
      region: region.text,
      score: region.score,
      cx,
      cy,
      length,
      thick: region.thick,
      angle: region.angle,
      partial,
    })
  }
  return found
}

async function runWorkers(files: string[]) {
  await fs.mkdir(BACKUP, { recursive: true })
  // A previous run that was stopped leaves per-worker part files behind: keep what they finished.
  for (const leftover of (await fs.readdir(BACKUP)).filter((f) => f.startsWith(`${OUT_NAME}.part-`))) {
    const complete = (await fs.readFile(path.join(BACKUP, leftover), 'utf8')).split('\n').filter((line) => {
      try {
        return Boolean(line) && Boolean(JSON.parse(line))
      } catch {
        return false
      }
    })
    if (complete.length) await fs.appendFile(OCR_LINES, complete.join('\n') + '\n')
    await fs.rm(path.join(BACKUP, leftover))
  }
  const done = new Set<string>()
  try {
    for (const row of (await fs.readFile(OCR_LINES, 'utf8')).split('\n').filter(Boolean)) {
      done.add(path.basename((JSON.parse(row) as OcrLine).file))
    }
  } catch {
    // first run
  }
  const todo = files.filter((f) => !done.has(f))
  console.log(`${files.length} images, ${done.size} already OCR'd, ${todo.length} to do, ${WORKERS} workers`)
  if (todo.length === 0) return

  const chunks = Array.from({ length: WORKERS }, (_, w) => todo.filter((_, i) => i % WORKERS === w))
  const started = Date.now()
  let finished = 0

  await Promise.all(
    chunks.map(async (chunk, w) => {
      if (chunk.length === 0) return
      const listFile = path.join(BACKUP, `${OUT_NAME}.list-${w}.txt`)
      const partFile = path.join(BACKUP, `${OUT_NAME}.part-${w}.jsonl`)
      await fs.rm(partFile, { force: true })
      await fs.writeFile(listFile, chunk.map((f) => path.join(CACHE, f)).join('\n'))
      const child = spawn(
        PYTHON!,
        ['-I', path.resolve('scripts/rebrand/ocr_rapid.py'), partFile, String(SCALE), `@${listFile}`],
        { stdio: ['ignore', 'ignore', 'inherit'] },
      )
      const timer = setInterval(async () => {
        try {
          const lines = (await fs.readFile(partFile, 'utf8')).split('\n').filter(Boolean).length
          if (lines % 10 === 0 || lines === chunk.length) {
            const rate = ((Date.now() - started) / 1000 / Math.max(1, finished + lines)).toFixed(1)
            console.log(`  worker ${w}: ${lines}/${chunk.length} (~${rate}s/img overall)`)
          }
        } catch {
          // not written yet
        }
      }, 60_000)
      await new Promise<void>((resolve, reject) => {
        child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`worker ${w} exited ${code}`))))
        child.on('error', reject)
      })
      clearInterval(timer)
      finished += chunk.length
      await fs.appendFile(OCR_LINES, await fs.readFile(partFile, 'utf8'))
      await fs.rm(partFile, { force: true })
      await fs.rm(listFile, { force: true })
    }),
  )
  console.log(`OCR finished in ${Math.round((Date.now() - started) / 60000)} min`)
}

async function main() {
  const limit = Number(process.env.LIMIT ?? 0)
  const offset = Number(process.env.OFFSET ?? 0)
  const only = process.env.FILES?.split(',').filter(Boolean)
  let files = (await fs.readdir(CACHE)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort()
  if (only) files = files.filter((f) => only.some((o) => f.includes(o)))
  files = files.slice(offset, limit ? offset + limit : undefined)

  await runWorkers(files)

  const wanted = new Set(files)
  const detections: Detection[] = []
  const errors: string[] = []
  for (const row of (await fs.readFile(OCR_LINES, 'utf8')).split('\n').filter(Boolean)) {
    const line = JSON.parse(row) as OcrLine
    if (!wanted.has(path.basename(line.file))) continue
    if (line.error) errors.push(`${path.basename(line.file)}: ${line.error}`)
    detections.push(...detectionsOf(line))
  }

  await fs.writeFile(OUT, JSON.stringify({ scanned: files.length, detections, errors }, null, 2))
  const images = new Set(detections.map((d) => d.file)).size
  console.log(`\n${detections.length} detection(s) in ${images}/${files.length} images -> ${OUT}`)
  if (errors.length) console.log(`${errors.length} error(s), e.g. ${errors[0]}`)
}

await main()
