# shemiproduct

The **AMORA** storefront, a Payload-driven rebuild of a Shopify store (originally wearments.com, renamed; see "Brand" in CLAUDE.md and `scripts/rebrand/`): Next.js (App Router) frontend styled with SCSS, Payload CMS embedded in the same app, MongoDB as the database. All content (239 products, collections, pages, homepage sections, header/footer, ~880 images) is stored in Payload and was imported from the live store.

## Stack

| Concern  | Choice                                                                    |
| -------- | ------------------------------------------------------------------------- |
| Frontend | Next.js 16, React 19, TypeScript (strict)                                 |
| Styling  | SCSS (Sass modules + CSS Modules, design tokens as CSS custom properties) |
| CMS      | Payload 3 (admin UI + REST/GraphQL API served by Next.js)                 |
| Database | MongoDB via `@payloadcms/db-mongodb`                                      |
| Tooling  | ESLint, Prettier, Stylelint, Vitest                                       |

## Getting started

Requirements: Node `^22.23.5 || ^24.22.3 || >=26.13.1` (Payload's supported range), npm, and a MongoDB database.

```bash
npm install
cp .env.example .env   # set MONGODB_URI and PAYLOAD_SECRET (see the file for a one-liner)
npm run dev
```

`MONGODB_URI` can be MongoDB Atlas or a local server. `npm run db:up` starts a local MongoDB with Docker (`docker-compose.yml`).

- Site: http://localhost:3000
- Admin panel: http://localhost:3000/admin (the first visit asks you to create the initial admin user)
- REST API: http://localhost:3000/api, GraphQL: http://localhost:3000/api/graphql

Optional: set `SITE_URL` (e.g. `https://shop.example.com`) so Open Graph and canonical URLs are absolute.

### Loading the store content

On an empty database, import the storefront from wearments.com (about 10 minutes, mostly image downloads):

```bash
npm run import:wearments
IMPORT_ONLY=catalog,pages,site npm run import:wearments   # run selected steps
IMPORT_LIMIT=5 IMPORT_ONLY=catalog npm run import:wearments   # small test run
```

It is safe to re-run: records are matched by handle/slug and images by source URL, and downloaded images are cached in `.import-cache/`. **It writes to whatever database `.env` points at.** Images are stored in the same MongoDB database (GridFS), so they work on serverless hosts such as Vercel with no extra storage service.

### Images and deployment

Uploaded and imported images are stored in MongoDB (GridFS, bucket `media_files`) and served by Payload at `/api/media/file/<filename>`; nothing is read from disk. To deploy on Vercel you only need these environment variables: `MONGODB_URI`, `PAYLOAD_SECRET` and `SITE_URL`, and your Atlas network access must allow Vercel (Network Access: allow `0.0.0.0/0`).

Images are converted to WebP with a 2000px cap (about 290 KB each including a small thumbnail, ~250 MB for the full catalog); a free Atlas cluster holds 512 MB. If you have existing media on local disk, load it into the database once with `npm run media:migrate`.

## Pages

| URL                     | Content                                                           |
| ----------------------- | ----------------------------------------------------------------- |
| `/`                     | Homepage: the `home` page's block layout                          |
| `/collections/[handle]` | Product grid with availability/price filters, sorting, paging     |
| `/collections/all`      | Every product                                                     |
| `/products/[handle]`    | Gallery, variants, deals, size chart / returns / shipping dialogs |
| `/pages/[slug]`         | Text pages (FAQs, policies, About, Contact)                       |
| `/search?q=`            | Product title search                                              |

Not built yet: cart, checkout, orders, payments and customer accounts. The related buttons and header icons are visibly disabled.

## Scripts

| Script                            | Purpose                                                              |
| --------------------------------- | -------------------------------------------------------------------- |
| `npm run dev` / `build` / `start` | Next.js development / production build / serve                       |
| `npm run lint` / `lint:styles`    | ESLint (TS/TSX) / Stylelint (SCSS)                                   |
| `npm run typecheck`               | `tsc --noEmit`                                                       |
| `npm test`                        | Vitest (single file: `npx vitest run path/to/file.ts`)               |
| `npm run format`                  | Prettier                                                             |
| `npm run generate:types`          | Regenerate `src/payload-types.ts` from the CMS schema                |
| `npm run generate:importmap`      | Regenerate the admin import map after adding custom admin components |
| `npm run import:wearments`        | Import the storefront content (see above)                            |
| `npm run media:migrate`           | Move image files from local disk into MongoDB (GridFS)               |
| `npm run db:up` / `db:down`       | Start / stop the local MongoDB container                             |

Run `generate:types` whenever you change a collection, global or block.

## Project layout

```
src/
  app/
    (frontend)/      Public site: /, collections/, products/, pages/, search/ (own root layout)
    (payload)/       Payload admin + API routes (generated by Payload; don't hand-edit)
  access/            Reusable Payload access-control functions
  blocks/            Page-builder block schemas (homepage sections)
  collections/       Payload collections: products, categories, pages, media, subscribers, users
  globals/           Site settings, header, footer, product-page settings
  fields/            Reusable field helpers (handle/slug, links)
  components/
    blocks/          One renderer per page-builder block (+ RenderBlocks)
    layout/          Announcement bar, header + menu drawer, footer, WhatsApp button
    catalog/         Collection grid, pagination, filter controls
    product/         Product card, gallery, option selector, dialogs, trust badges
    content/ ui/     Rich text, testimonials, container
  config/            Typed, validated env (env.ts) and site constants
  lib/               Pure helpers (catalog query parsing, pricing, countdown, slugify, ...)
  services/          Data-access layer: the only place frontend code queries the CMS
  styles/            abstracts/ (mixins, breakpoints), base/ (tokens, reset, typography), fonts
  storage/           GridFS storage adapter: media files live in MongoDB, not on disk
  payload.config.ts  Payload entry point
scripts/import-wearments/   Storefront importer
```

## Conventions

- **Styling:** components use CSS Modules (`Foo.module.scss`) and read design tokens with `var(--token)` from `styles/base/_root.scss`. Sass helpers are available with `@use 'abstracts' as *;` from any `.scss` file.
- **Adding a homepage section:** add a block schema in `src/blocks`, register it in `src/blocks/index.ts`, add its renderer in `src/components/blocks` and a case in `RenderBlocks.tsx`, then run `npm run generate:types`.
- **Adding a CMS collection:** create `src/collections/X.ts`, register it in `payload.config.ts`, run `npm run generate:types`, then add query functions to `src/services/`.
- **Access control:** the Payload Local API bypasses access rules unless `overrideAccess: false` is passed. Frontend queries in `src/services/` set it so draft content stays private.
