/**
 * Independent check of replace-labels.ts: crops the area around every detection from the PATCHED
 * image, OCRs the crops, and flags any that still read like the old name (WEAR, ARMEN, MENTS ...).
 * READ-ONLY on images and the database. Flagged crops are listed in `.rebrand-backup/verify.json`.
 *
 *   RAPID_PYTHON=<venv>/Scripts/python.exe node scripts/rebrand/verify-photos.ts
 *
 * Env: DETECTIONS=name (default labels), WORKERS=6, OCR_THREADS=2
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'

const PHOTOS = path.resolve('brand-assets/amora/photos')
const DIR = path.resolve('.rebrand-backup/verify')
const PYTHON = process.env.RAPID_PYTHON
const WORKERS = Number(process.env.WORKERS ?? 6)
if (!PYTHON) throw new Error('Set RAPID_PYTHON to a python with rapidocr-onnxruntime installed')

type Detection = { file: string; text: string; cx: number; cy: number; length: number; thick: number }
type OcrLine = { file: string; regions: Array<{ text: string; score: number }> }

const OLD_NAME_FRAGMENT = /WEAR|EARM|ARME|RMEN|MENT|ENTS|WARMNT|ARMNTS|WEARM/

async function main() {
  const name = process.env.DETECTIONS ?? 'labels'
  const { detections } = JSON.parse(await fs.readFile(path.resolve('.rebrand-backup', `${name}.json`), 'utf8')) as {
    detections: Detection[]
  }
  await fs.rm(DIR, { recursive: true, force: true })
  await fs.mkdir(DIR, { recursive: true })

  const crops: Array<{ id: string; det: Detection }> = []
  const patched = new Set(await fs.readdir(PHOTOS))
  let n = 0
  for (const det of detections) {
    const jpg = `${path.parse(det.file).name}.jpg`
    if (!patched.has(jpg)) continue
    const img = sharp(path.join(PHOTOS, jpg))
    const { width = 0, height = 0 } = await img.metadata()
    const half = Math.max(det.length, det.thick) * 0.9 + 30
    const left = Math.max(0, Math.round(det.cx - half))
    const top = Math.max(0, Math.round(det.cy - half))
    const w = Math.min(Math.round(half * 2), width - left)
    const h = Math.min(Math.round(half * 2), height - top)
    const id = String(n++).padStart(5, '0')
    await img.extract({ left, top, width: w, height: h }).png().toFile(path.join(DIR, `${id}.png`))
    crops.push({ id, det })
  }
  console.log(`${crops.length} crops written, OCR with ${WORKERS} workers`)

  const lines: OcrLine[] = []
  await Promise.all(
    Array.from({ length: WORKERS }, async (_, w) => {
      const mine = crops.filter((_, i) => i % WORKERS === w)
      if (mine.length === 0) return
      const list = path.join(DIR, `list-${w}.txt`)
      const out = path.join(DIR, `ocr-${w}.jsonl`)
      await fs.writeFile(list, mine.map((c) => path.join(DIR, `${c.id}.png`)).join('\n'))
      await new Promise<void>((resolve, reject) => {
        const child = spawn(PYTHON!, ['-I', path.resolve('scripts/rebrand/ocr_rapid.py'), out, '2', `@${list}`], {
          stdio: ['ignore', 'ignore', 'inherit'],
          env: { ...process.env, OCR_THREADS: process.env.OCR_THREADS ?? '2' },
        })
        child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`worker ${w} exited ${code}`))))
        child.on('error', reject)
      })
      for (const row of (await fs.readFile(out, 'utf8')).split('\n').filter(Boolean)) lines.push(JSON.parse(row))
    }),
  )

  const byId = new Map(crops.map((c) => [c.id, c.det]))
  const flagged: Array<{ crop: string; file: string; cx: number; cy: number; read: string[] }> = []
  for (const line of lines) {
    const id = path.parse(line.file).name
    const det = byId.get(id)!
    const hits = line.regions
      .map((r) => r.text)
      .filter((t) => OLD_NAME_FRAGMENT.test(t.toUpperCase().replace(/[^A-Z]/g, '')))
    if (hits.length) flagged.push({ crop: id, file: det.file, cx: Math.round(det.cx), cy: Math.round(det.cy), read: hits })
  }

  await fs.writeFile(path.resolve('.rebrand-backup/verify.json'), JSON.stringify(flagged, null, 2))
  console.log(`\n${flagged.length} of ${crops.length} patched regions still read like the old name`)
  for (const f of flagged.slice(0, 30)) console.log(`  ${f.crop} ${f.file.slice(0, 44)} @${f.cx},${f.cy}: ${JSON.stringify(f.read)}`)
}

await main()
