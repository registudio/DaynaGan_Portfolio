import { Resend } from 'resend';
import { z } from 'zod';
import { loadPortfolio } from '@/lib/load';


const schema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email().max(200),
  company: z.string().trim().max(120).optional().default(''),
  role: z.string().trim().max(120).optional().default(''),
  reason: z.string().trim().max(60).optional().default(''),
  message: z.string().trim().min(5).max(5000),
  /** Honeypot — real visitors never see or fill this. */
  website: z.string().max(500).optional().default(''),
});

// Best-effort per-instance rate limit: 5 messages / 10 min / IP.
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 5;
const hits = new Map<string, number[]>();

function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > LIMIT;
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return Response.json(
      { error: 'Please check the form — a name, a valid email and a message are required.' },
      { status: 400 },
    );
  const data = parsed.data;
  // Silently accept bot submissions so they don't retry.
  if (data.website) return Response.json({ ok: true });

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (limited(ip))
    return Response.json({ error: 'Too many messages — try again in a few minutes.' }, { status: 429 });

  const key = process.env.RESEND_API_KEY;
  const site = loadPortfolio().site;
  if (!key)
    return Response.json(
      { error: 'The transmitter is offline.', fallback: `mailto:${site.email}` },
      { status: 503 },
    );

  const rows: [string, string][] = [
    ['Name', data.name],
    ['Email', data.email],
    ['Company', data.company],
    ['Role', data.role],
    ['Reason', data.reason],
  ];
  const html = `<h2>New portfolio message</h2><table>${rows
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td><b>${k}</b></td><td>${escape(v)}</td></tr>`)
    .join('')}</table><p style="white-space:pre-wrap">${escape(data.message)}</p>`;
  const text = `${rows
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')}\n\n${data.message}`;

  try {
    const { error } = await new Resend(key).emails.send({
      from: process.env.CONTACT_FROM_EMAIL || 'Portfolio <onboarding@resend.dev>',
      to: process.env.CONTACT_TO_EMAIL || site.email,
      replyTo: data.email,
      subject: `Portfolio: ${data.reason || 'message'} from ${data.name}`,
      html,
      text,
    });
    if (error) throw new Error(error.message);
    return Response.json({ ok: true });
  } catch (error) {
    console.error('Contact send failed', error);
    return Response.json(
      { error: 'Transmission failed — please try again or email directly.', fallback: `mailto:${site.email}` },
      { status: 502 },
    );
  }
}
