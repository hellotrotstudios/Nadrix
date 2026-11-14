// Builds seed.ndjson from ../../src/data/initial-content.json so the posts and events that were
// hard-coded on the site can be imported into Sanity once:  npm run seed
// Images are uploaded from ../../public/assets/images. Posts are imported without a body:
// write each article in the Studio (the site only links a card to its article once it has a body).
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../..')
const content = JSON.parse(fs.readFileSync(path.join(root, 'src/data/initial-content.json'), 'utf8'))
const image = (file, alt) => ({
  _type: 'image',
  _sanityAsset: `image@${pathToFileURL(path.join(root, 'public/assets/images', file)).href}`,
  alt,
})

const docs = [
  ...content.posts.map((p) => ({
    _id: `post-${p.slug}`,
    _type: 'post',
    title: p.title,
    slug: {_type: 'slug', current: p.slug},
    topic: p.topic,
    featured: Boolean(p.featured),
    publishedAt: p.publishedAt,
    excerpt: p.excerpt,
    mainImage: image(p.image, p.alt),
  })),
  ...content.events.map((e) => ({
    _id: `event-${e.id}`,
    _type: 'event',
    name: e.name,
    tagline: e.tagline,
    startDate: e.startDate,
    endDate: e.endDate,
    venue: e.venue,
    stall: e.stall,
    meetingEmail: e.meetingEmail,
    ...(e.image ? {image: image(e.image, e.alt)} : {}),
  })),
]

const out = path.join(here, 'seed.ndjson')
fs.writeFileSync(out, docs.map((d) => JSON.stringify(d)).join('\n') + '\n')
console.log(`Wrote ${docs.length} documents to ${path.relative(process.cwd(), out)}`)
