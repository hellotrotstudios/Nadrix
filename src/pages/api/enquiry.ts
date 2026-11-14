// POST /api/enquiry — sends the contact-page enquiry to the chosen team via Resend.
// Runs as a Vercel serverless function; everything else on the site is static.
import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const prerender = false;

const TEAMS = {
  sales: { label: 'Sales team: new requirement', env: 'ENQUIRY_TO_SALES', fallback: 'sales@nadrixsolutions.com' },
  technical: { label: 'Technical team: existing system', env: 'ENQUIRY_TO_TECHNICAL', fallback: 'pandurang.patole@nadrixsolutions.com' },
} as const;
type Team = keyof typeof TEAMS;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LIMITS = { name: 120, email: 200, phone: 40, message: 5000 };

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const env = (key: string): string | undefined => (import.meta.env[key] as string | undefined) ?? process.env[key];

export const POST: APIRoute = async ({ request }) => {
  let data: Record<string, unknown>;
  try {
    data = await request.json();
  } catch {
    return json(400, { error: 'Invalid request.' });
  }
  const field = (k: string) => (typeof data[k] === 'string' ? (data[k] as string).trim() : '');

  // Honeypot: real visitors never see or fill this field. Pretend success so bots move on.
  if (field('website')) return json(200, { ok: true });

  const name = field('name');
  const email = field('email');
  const phone = field('phone');
  const message = field('message');
  const team: Team = field('team') === 'technical' ? 'technical' : 'sales';

  const errors: string[] = [];
  if (name.length < 2 || name.length > LIMITS.name) errors.push('name');
  if (!EMAIL_RE.test(email) || email.length > LIMITS.email) errors.push('email');
  if (phone.length > LIMITS.phone) errors.push('phone');
  if (message.length < 5 || message.length > LIMITS.message) errors.push('message');
  if (errors.length) return json(422, { error: 'Please check the highlighted fields.', fields: errors });

  const apiKey = env('RESEND_API_KEY');
  const from = env('ENQUIRY_FROM');
  if (!apiKey || !from) {
    console.error('Enquiry not sent: RESEND_API_KEY or ENQUIRY_FROM is not set.');
    return json(503, { error: 'Email is not configured.' });
  }

  const to = env(TEAMS[team].env) || TEAMS[team].fallback;
  const rows: [string, string][] = [
    ['Name', name],
    ['Email', email],
    ['Phone', phone || '—'],
    ['Enquiry for', TEAMS[team].label],
  ];
  const text = `${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${message}\n\n— Sent from the enquiry form on the Nadrix website`;
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#151515;max-width:600px">
      <h2 style="margin:0 0 16px;font-size:20px;color:#0f1a31">New website enquiry</h2>
      <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px">
        ${rows
          .map(
            ([k, v]) =>
              `<tr><td style="padding:4px 16px 4px 0;color:#666;vertical-align:top">${k}</td><td style="padding:4px 0;font-weight:bold">${esc(v)}</td></tr>`,
          )
          .join('')}
      </table>
      <div style="padding:16px;border-left:3px solid #ff9e16;background:#f6f6f6;white-space:pre-wrap">${esc(message)}</div>
      <p style="margin-top:24px;font-size:13px;color:#8d8d8d">Reply to this email to answer ${esc(name)} directly.</p>
    </div>`;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: email,
      subject: `Website enquiry from ${name.replace(/[\r\n]+/g, ' ')}`,
      text,
      html,
    });
    if (error) {
      console.error('Resend error:', error);
      return json(502, { error: 'We could not send your enquiry.' });
    }
  } catch (err) {
    console.error('Resend request failed:', err);
    return json(502, { error: 'We could not send your enquiry.' });
  }

  return json(200, { ok: true });
};

export const ALL: APIRoute = () => json(405, { error: 'Method not allowed.' });
