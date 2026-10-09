// Envoi d'emails depuis contact@findmycoach.io (SMTP Google, secret SMTP_PASSWORD).
import nodemailer from 'npm:nodemailer@6.9.16';

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Email de notification à la charte Find My Coach (logo, carte blanche, bouton vert). */
export function notificationEmail(opts: { prenom?: string; title: string; message: string; cta?: string; ctaUrl?: string }) {
  const hello = opts.prenom ? `Bonjour ${esc(opts.prenom)},` : 'Bonjour,';
  const cta = opts.cta ?? 'Ouvrir Find My Coach';
  const url = opts.ctaUrl ?? 'https://findmycoach.io/telecharger';
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.title)}</title></head>
<body style="margin:0;padding:0;background:#F6F9FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0F172A;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(opts.message)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F9FA;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
<tr><td align="center" style="background:#1D1D1D;border-radius:28px 28px 0 0;padding:24px;">
<img src="https://seftoygihefwohrioojo.supabase.co/storage/v1/object/public/downloads/brand/logo-email.png" width="200" alt="Find My Coach" style="display:block;width:200px;max-width:100%;height:auto;border:0;"></td></tr>
<tr><td style="background:#FFFFFF;border:1px solid #E2E8F0;border-top:0;border-radius:0 0 28px 28px;padding:36px 32px;">
<h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;font-weight:800;color:#0F172A;">${esc(opts.title)}</h1>
<p style="margin:0 0 10px;font-size:16px;line-height:1.6;color:#334155;">${hello}</p>
<p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#334155;">${esc(opts.message)}</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#00D664;border-radius:999px;">
<a href="${url}" style="display:inline-block;padding:15px 30px;font-size:16px;font-weight:700;color:#0F172A;text-decoration:none;">${esc(cta)} &rarr;</a></td></tr></table>
<p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#64748B;">Une question ? Répondez simplement à cet email.<br><br>À très vite,<br><strong style="color:#0F172A;">Jessie Kouassi, fondateur de Find My Coach</strong></p>
</td></tr>
<tr><td align="center" style="padding:24px 16px 0;font-size:12px;line-height:1.7;color:#94A3B8;">
<strong style="color:#0F172A;">Your Coach Anytime, Anywhere.</strong><br>
Find My Coach · <a href="https://findmycoach.io" style="color:#94A3B8;">findmycoach.io</a> · <a href="mailto:contact@findmycoach.io" style="color:#94A3B8;">contact@findmycoach.io</a><br>
Vous pouvez désactiver ces emails dans l'app : Profil → Notifications.</td></tr>
</table></td></tr></table></body></html>`;
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

export async function sendMail(to: string, subject: string, html: string) {
  const pass = Deno.env.get('SMTP_PASSWORD');
  if (!pass) return;
  const user = Deno.env.get('SMTP_USER') ?? 'contact@findmycoach.io';
  transporter ??= nodemailer.createTransport({
    host: Deno.env.get('SMTP_HOST') ?? 'smtp.gmail.com',
    port: Number(Deno.env.get('SMTP_PORT') ?? 465),
    secure: true,
    auth: { user, pass },
  });
  await transporter.sendMail({ from: `"Find My Coach" <${user}>`, to, replyTo: user, subject, html });
}
