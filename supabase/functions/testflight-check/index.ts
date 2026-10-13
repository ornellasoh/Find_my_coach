// Diagnostic interne : les clés App Store Connect sont-elles valides et le groupe TestFlight trouvé ?
// Appelée depuis la base uniquement : select public.call_edge('testflight-check', '{}'::jsonb);
// puis lire la réponse dans net._http_response. Ne modifie rien chez Apple.
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';
import { appStoreConfigured, checkAppStore } from '../_shared/appstore.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  const secret = req.headers.get('x-internal-secret');
  const { data: allowed } = secret ? await admin.rpc('internal_secret_ok', { s: secret }) : { data: false };
  if (allowed !== true) return json({ error: 'Accès refusé' }, 401);
  if (!appStoreConfigured()) {
    return json({
      configured: false,
      missing: ['ASC_ISSUER_ID', 'ASC_KEY_ID', 'ASC_PRIVATE_KEY'].filter((k) => !Deno.env.get(k)),
    });
  }
  try {
    return json({ configured: true, ...(await checkAppStore()) });
  } catch (err) {
    return json({ configured: false, error: (err as Error).message });
  }
});
