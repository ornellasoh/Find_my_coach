// Envoie le mail de bienvenue (une seule fois par compte) depuis contact@findmycoach.io.
import nodemailer from 'npm:nodemailer@6.9.16';
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

const TEMPLATE = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bienvenue sur Find My Coach</title></head>
<body style="margin:0;padding:0;background:#F6F9FA;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0F172A;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Votre compte est prêt : voici comment bien démarrer.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F9FA;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <!-- En-tête -->
        <tr><td align="center" style="background:#1D1D1D;border-radius:28px 28px 0 0;padding:28px 24px;">
          <img src="https://seftoygihefwohrioojo.supabase.co/storage/v1/object/public/downloads/brand/logo-email.png" width="220" alt="Find My Coach — Your Coach Anytime, Anywhere" style="display:block;width:220px;max-width:100%;height:auto;border:0;">
        </td></tr>
        <!-- Carte -->
        <tr><td style="background:#FFFFFF;border:1px solid #E2E8F0;border-top:0;border-radius:0 0 28px 28px;padding:40px 32px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#00A84F;">Bienvenue dans l'équipe</p>
          <h1 style="margin:0 0 16px;font-size:26px;line-height:1.25;font-weight:800;color:#0F172A;">Bienvenue {{prenom}} 💚</h1>
          <p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#334155;">Votre compte <strong>Find My Coach</strong> est activé. Vous faites désormais partie d'une communauté qui croit qu'avec le bon coach, tout le monde peut progresser — en sport, nutrition, bien-être, mindset, carrière ou business.</p>
          <p style="margin:24px 0 12px;font-size:16px;font-weight:800;color:#0F172A;">Vos premiers pas</p>
          __STEPS__
          
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0 8px;"><tr>
            <td style="background:#00D664;border-radius:999px;">
              <a href="https://findmycoach.io/telecharger" style="display:inline-block;padding:16px 32px;font-size:16px;font-weight:700;color:#0F172A;text-decoration:none;">Ouvrir Find My Coach &rarr;</a>
            </td>
          </tr></table>
          <p style="margin:20px 0 0;padding:14px 16px;background:#F6F9FA;border-radius:16px;font-size:13px;line-height:1.6;color:#64748B;">Une question, une idée ? Répondez simplement à cet email : notre équipe vous lit personnellement.<br><br>À très vite,<br><strong style="color:#0F172A;">Jessie Kouassi, fondateur de Find My Coach</strong></p>
        </td></tr>
        <!-- Pied -->
        <tr><td align="center" style="padding:28px 16px 0;font-size:12px;line-height:1.7;color:#94A3B8;">
          <strong style="color:#0F172A;">Your Coach Anytime, Anywhere.</strong><br>
          Find My Coach · <a href="https://findmycoach.io" style="color:#94A3B8;">findmycoach.io</a> · <a href="mailto:contact@findmycoach.io" style="color:#94A3B8;">contact@findmycoach.io</a><br>
          Vous recevez cet email car vous venez de créer un compte Find My Coach.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`;
const CLIENT_STEPS = `
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr><td style="padding:0 0 14px;vertical-align:top;width:44px;"><div style="width:32px;height:32px;border-radius:999px;background:#00D664;color:#0F172A;font-weight:800;font-size:15px;line-height:32px;text-align:center;">1</div></td>
<td style="padding:0 0 14px;vertical-align:top;"><p style="margin:0;font-size:15px;font-weight:700;color:#0F172A;">Complétez votre profil</p><p style="margin:2px 0 0;font-size:14px;line-height:1.5;color:#64748B;">Ajoutez une photo et vos objectifs pour des recommandations sur mesure.</p></td></tr>
            <tr><td style="padding:0 0 14px;vertical-align:top;width:44px;"><div style="width:32px;height:32px;border-radius:999px;background:#00D664;color:#0F172A;font-weight:800;font-size:15px;line-height:32px;text-align:center;">2</div></td>
<td style="padding:0 0 14px;vertical-align:top;"><p style="margin:0;font-size:15px;font-weight:700;color:#0F172A;">Trouvez votre coach</p><p style="margin:2px 0 0;font-size:14px;line-height:1.5;color:#64748B;">Filtrez par discipline, ville, prix ou note — à domicile, en salle, en extérieur ou en visio.</p></td></tr>
            <tr><td style="padding:0 0 14px;vertical-align:top;width:44px;"><div style="width:32px;height:32px;border-radius:999px;background:#00D664;color:#0F172A;font-weight:800;font-size:15px;line-height:32px;text-align:center;">3</div></td>
<td style="padding:0 0 14px;vertical-align:top;"><p style="margin:0;font-size:15px;font-weight:700;color:#0F172A;">Réservez votre première séance</p><p style="margin:2px 0 0;font-size:14px;line-height:1.5;color:#64748B;">Choisissez un créneau et payez en toute sécurité (carte, Apple Pay, Google Pay).</p></td></tr>
          </table>
          `;
const COACH_STEPS = `
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr><td style="padding:0 0 14px;vertical-align:top;width:44px;"><div style="width:32px;height:32px;border-radius:999px;background:#00D664;color:#0F172A;font-weight:800;font-size:15px;line-height:32px;text-align:center;">1</div></td>
<td style="padding:0 0 14px;vertical-align:top;"><p style="margin:0;font-size:15px;font-weight:700;color:#0F172A;">Complétez votre fiche coach</p><p style="margin:2px 0 0;font-size:14px;line-height:1.5;color:#64748B;">Photo, spécialités, diplômes et tarifs : c'est votre vitrine.</p></td></tr>
            <tr><td style="padding:0 0 14px;vertical-align:top;width:44px;"><div style="width:32px;height:32px;border-radius:999px;background:#00D664;color:#0F172A;font-weight:800;font-size:15px;line-height:32px;text-align:center;">2</div></td>
<td style="padding:0 0 14px;vertical-align:top;"><p style="margin:0;font-size:15px;font-weight:700;color:#0F172A;">Ouvrez vos disponibilités</p><p style="margin:2px 0 0;font-size:14px;line-height:1.5;color:#64748B;">Publiez vos créneaux pour recevoir vos premières réservations.</p></td></tr>
            <tr><td style="padding:0 0 14px;vertical-align:top;width:44px;"><div style="width:32px;height:32px;border-radius:999px;background:#00D664;color:#0F172A;font-weight:800;font-size:15px;line-height:32px;text-align:center;">3</div></td>
<td style="padding:0 0 14px;vertical-align:top;"><p style="margin:0;font-size:15px;font-weight:700;color:#0F172A;">Activez vos paiements</p><p style="margin:2px 0 0;font-size:14px;line-height:1.5;color:#64748B;">Reliez votre compte via Stripe pour être payé automatiquement après chaque séance.</p></td></tr>
          </table>
          `;

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: auth } = await admin.auth.getUser(token);
    const user = auth.user;
    if (!user?.email) return json({ error: 'Non connecté' }, 401);
    if (!user.email_confirmed_at) return json({ skipped: 'email non confirmé' });

    const { data: profile } = await admin.from('profiles').select('name, role, welcome_sent_at').eq('id', user.id).maybeSingle();
    if (!profile || profile.welcome_sent_at) return json({ skipped: 'déjà envoyé' });

    // Verrou : marque l'envoi avant d'envoyer (évite les doublons si l'app appelle deux fois)
    const { data: locked } = await admin
      .from('profiles')
      .update({ welcome_sent_at: new Date().toISOString() })
      .eq('id', user.id)
      .is('welcome_sent_at', null)
      .select('id');
    if (!locked?.length) return json({ skipped: 'déjà envoyé' });

    const prenom = escapeHtml((profile.name || '').trim().split(/\s+/)[0] || '');
    const html = TEMPLATE.replace('__STEPS__', profile.role === 'coach' ? COACH_STEPS : CLIENT_STEPS)
      .replaceAll('{{prenom}}', prenom)
      .replace('Bienvenue  💚', 'Bienvenue 💚');

    const smtpUser = Deno.env.get('SMTP_USER') ?? 'contact@findmycoach.io';
    const transporter = nodemailer.createTransport({
      host: Deno.env.get('SMTP_HOST') ?? 'smtp.gmail.com',
      port: Number(Deno.env.get('SMTP_PORT') ?? 465),
      secure: true,
      auth: { user: smtpUser, pass: Deno.env.get('SMTP_PASSWORD') },
    });

    try {
      await transporter.sendMail({
        from: `"Find My Coach" <${smtpUser}>`,
        to: user.email,
        replyTo: smtpUser,
        subject: 'Bienvenue sur Find My Coach 💚 Votre compte est prêt',
        html,
      });
    } catch (err) {
      // Échec d'envoi : on libère le verrou pour réessayer à la prochaine connexion
      await admin.from('profiles').update({ welcome_sent_at: null }).eq('id', user.id);
      throw err;
    }
    return json({ sent: true });
  } catch (err) {
    console.error('send-welcome', err);
    return json({ error: (err as Error).message }, 500);
  }
});
