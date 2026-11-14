# Nadrix Solutions website

Astro site deployed on Vercel. Blog posts and events come from **Sanity**; the contact-page enquiry form sends email through **Resend**.

```
src/
  pages/             one .astro file per page (markup carried over from the original HTML)
    blog/[slug].astro   article pages, built from Sanity
    api/enquiry.ts      serverless function: enquiry form → Resend
  layouts/BaseLayout.astro   <head>, header, footer
  components/        Header, Footer, Cta
  lib/content.ts     reads posts & events from Sanity at build time
  data/initial-content.json  the original hard-coded posts/events (seed + fallback)
public/              css/, js/, assets/ served as-is (same paths as before)
studio/              Sanity Studio (separate app, deployed to nadrix.sanity.studio)
```

URLs are now clean (`/about`, `/blog/<slug>`). The old `.html` addresses 301-redirect to them.

## Local development

```bash
npm install
cp .env.example .env      # fill in values (all optional for local work)
npm run dev               # http://localhost:4321
```

With no `PUBLIC_SANITY_PROJECT_ID`, the site uses `src/data/initial-content.json`, so it looks exactly like before. With no `RESEND_API_KEY`, the form shows the "send it from your email app" fallback.

## One-time setup

### 1. Sanity (blogs & events)

1. Create the project and log in (opens a browser):
   ```bash
   cd studio
   npm install
   npx sanity login
   npx sanity projects create "Nadrix website"     # note the project ID it prints
   ```
   Or create it at [sanity.io/manage](https://www.sanity.io/manage). Make sure a dataset called `production` exists (`npx sanity dataset create production --visibility public`), then copy `studio/.env.example` to `studio/.env` and set `SANITY_STUDIO_PROJECT_ID`.
2. Import the existing 7 posts and 2 events (with their images):
   ```bash
   npm run seed
   ```
   Posts are imported **without article text**. A blog card only links to its article page once the post has a body, so write the articles in the Studio when ready.
3. Run the Studio locally (`npm run dev`, port 3333) or host it for the team:
   ```bash
   npm run deploy          # → https://nadrix.sanity.studio
   ```
   Invite editors at sanity.io/manage → project → Members.
4. In **sanity.io/manage → API → CORS origins**, add `http://localhost:4321`. The site reads at build time, so production doesn't need a CORS entry.

### 2. Resend (enquiry form)

1. Create an account at [resend.com](https://resend.com) and **add and verify the domain** `nadrixsolutions.com` (Domains → Add, then add the DNS records it shows at the domain's DNS provider).
2. Create an API key with *Sending access*.
3. The "from" address must be on that verified domain, e.g. `Nadrix Website <website@nadrixsolutions.com>`. Replies go straight to the visitor (reply-to is set to their email).

### 3. Vercel

In the Vercel project:

1. **Settings → Build & Deployment → Framework Preset: Astro.** It was a plain static site before. Build command `npm run build`, output is handled by the adapter.
2. **Settings → Environment Variables** (Production + Preview):

   | Name | Value |
   |---|---|
   | `PUBLIC_SANITY_PROJECT_ID` | from step 1 |
   | `PUBLIC_SANITY_DATASET` | `production` |
   | `RESEND_API_KEY` | from step 2 |
   | `ENQUIRY_FROM` | `Nadrix Website <website@nadrixsolutions.com>` |
   | `ENQUIRY_TO_SALES` | `sales@nadrixsolutions.com` |
   | `ENQUIRY_TO_TECHNICAL` | `pandurang.patole@nadrixsolutions.com` |
   | `SITE_URL` | the live domain, e.g. `https://www.nadrixsolutions.com` |

3. **Rebuild on publish:** Vercel → Settings → Git → *Deploy Hooks* → create one (branch `main`), copy its URL. Then in sanity.io/manage → API → *Webhooks* → Create: URL = the deploy hook, dataset `production`, trigger on create/update/delete, filter `_type in ["post", "event"]`, HTTP method POST. Publishing in the Studio now redeploys the site in about a minute.

## How events work

- The soonest event whose end date hasn't passed is shown as **Next event**. Events that have ended are listed under **Past events**.
- Each build works this out, and `public/js/main.js` re-checks the dates in the browser, so a finished event moves to "Past" on time even if nothing was published since.
