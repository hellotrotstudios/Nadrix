// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  // Used for canonical URLs and social preview images. Override with SITE_URL in Vercel if the domain differs.
  site: process.env.SITE_URL || 'https://www.nadrixsolutions.com',
  // Clean URLs: /about, /blog/<slug>. (The Vercel adapter always builds folder-style pages.)
  trailingSlash: 'never',
  // Keep whitespace exactly as written: compression would glue words to tags (e.g. "</strong> Unit").
  compressHTML: false,
  // Pages are prerendered at build time; only /api/enquiry runs on demand (serverless).
  output: 'static',
  adapter: vercel(),
  // The site launched with .html URLs: keep old links and search results working.
  redirects: {
    '/index.html': '/',
    '/about.html': '/about',
    '/systems.html': '/systems',
    '/industries.html': '/industries',
    '/blogs-events.html': '/blogs-events',
    '/contact.html': '/contact',
  },
});
