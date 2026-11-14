// Blog posts and events for the website, read from Sanity at build time.
// A Sanity webhook triggers a Vercel rebuild whenever content is published (see README).
// Until PUBLIC_SANITY_PROJECT_ID is set, the site falls back to src/data/initial-content.json
// so it keeps building and looking the same.
import { createClient, type SanityClient } from '@sanity/client';
import { createImageUrlBuilder } from '@sanity/image-url';
import type { PortableTextBlock } from '@portabletext/types';
import initial from '../data/initial-content.json';

export type Topic = 'systems' | 'industries' | 'service';

export interface Img {
  /** Returns a URL for the image at the given width (Sanity crops/resizes on its CDN). */
  url: (width: number, height?: number) => string;
  alt: string;
}

export interface Post {
  slug: string;
  title: string;
  topic: Topic;
  featured: boolean;
  publishedAt: string;
  excerpt: string;
  image: Img;
  body: PortableTextBlock[];
  seoTitle?: string;
  seoDescription?: string;
}

export interface SiteEvent {
  id: string;
  name: string;
  tagline?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD (same as start for one-day events)
  venue: string;
  stall?: string;
  image?: Img;
  meetingEmail: string;
}

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID as string | undefined;
const dataset = (import.meta.env.PUBLIC_SANITY_DATASET as string | undefined) || 'production';

export const sanity: SanityClient | null = projectId
  ? createClient({ projectId, dataset, apiVersion: '2025-02-19', useCdn: false, perspective: 'published' })
  : null;

const builder = sanity ? createImageUrlBuilder(sanity) : null;

type SanityImage = { asset?: { _ref: string }; alt?: string; hotspot?: unknown; crop?: unknown } | null | undefined;

export function sanityImage(source: SanityImage): Img | undefined {
  if (!source?.asset || !builder) return undefined;
  return {
    alt: source.alt ?? '',
    url: (w, h) => {
      let b = builder.image(source).width(w).auto('format').quality(80);
      if (h) b = b.height(h).fit('crop');
      return b.url();
    },
  };
}

const localImage = (file: string, alt: string): Img => ({ alt, url: () => `/assets/images/${file}` });

// ---------------------------------------------------------------------------

const POST_FIELDS = `
  "slug": slug.current, title, topic, "featured": coalesce(featured, false), publishedAt, excerpt,
  mainImage, "body": coalesce(body, []), seoTitle, seoDescription`;

type RawPost = Omit<Post, 'image'> & { mainImage: SanityImage };

let postsCache: Promise<Post[]> | undefined;

/** All published posts, newest first. */
export function getPosts(): Promise<Post[]> {
  postsCache ??= (async () => {
    if (!sanity) {
      return initial.posts.map((p) => ({
        ...p,
        topic: p.topic as Topic,
        featured: Boolean((p as { featured?: boolean }).featured),
        image: localImage(p.image, p.alt),
        body: [],
      }));
    }
    const raw = await sanity.fetch<RawPost[]>(
      `*[_type == "post" && defined(slug.current) && !(_id in path("drafts.**"))] | order(publishedAt desc) {${POST_FIELDS}}`,
    );
    return raw.map(({ mainImage, ...p }) => ({
      ...p,
      image: sanityImage(mainImage) ?? { alt: '', url: () => '' },
    }));
  })();
  return postsCache;
}

type RawEvent = Omit<SiteEvent, 'image' | 'endDate'> & { endDate?: string; image: SanityImage };

let eventsCache: Promise<SiteEvent[]> | undefined;

/** All events, newest first. */
export function getEvents(): Promise<SiteEvent[]> {
  eventsCache ??= (async () => {
    let events: SiteEvent[];
    if (!sanity) {
      events = initial.events.map((e) => ({
        ...e,
        image: 'image' in e && e.image ? localImage(e.image, e.alt ?? '') : undefined,
      }));
    } else {
      const raw = await sanity.fetch<RawEvent[]>(
        `*[_type == "event" && defined(startDate) && !(_id in path("drafts.**"))] {
          "id": _id, name, tagline, startDate, endDate, venue, stall, image,
          "meetingEmail": coalesce(meetingEmail, "sales@nadrixsolutions.com")
        }`,
      );
      events = raw.map(({ image, ...e }) => ({ ...e, endDate: e.endDate || e.startDate, image: sanityImage(image) }));
    }
    return events.sort((a, b) => b.startDate.localeCompare(a.startDate));
  })();
  return eventsCache;
}

// ---------------------------------------------------------------------------
// Formatting helpers

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "26–28 Nov 2026", "30 Nov – 2 Dec 2026", "30 Dec 2026 – 2 Jan 2027", "26 Nov 2026" */
export function formatDateRange(start: string, end: string): string {
  const [sy, sm, sd] = start.split('-').map(Number);
  const [ey, em, ed] = end.split('-').map(Number);
  const s = { d: sd, m: MONTHS[sm - 1], y: sy };
  const e = { d: ed, m: MONTHS[em - 1], y: ey };
  if (start === end) return `${s.d} ${s.m} ${s.y}`;
  if (sy !== ey) return `${s.d} ${s.m} ${s.y} – ${e.d} ${e.m} ${e.y}`;
  if (sm !== em) return `${s.d} ${s.m} – ${e.d} ${e.m} ${e.y}`;
  return `${s.d}–${e.d} ${e.m} ${e.y}`;
}

/** "1 November 2026" */
export function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

export const TOPIC_LABELS: Record<Topic, string> = { systems: 'Systems', industries: 'Industries', service: 'Service' };

export const postUrl = (slug: string) => `/blog/${slug}`;
