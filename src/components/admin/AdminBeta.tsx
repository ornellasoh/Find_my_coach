import React, { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, RefreshCw, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TesterRow {
  id: string;
  email: string;
  first_name: string | null;
  platform: 'android' | 'ios' | null;
  role: 'client' | 'coach' | null;
  created_at: string;
  confirmed_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  testflight_invited_at: string | null;
  testflight_error: string | null;
  play_group_added_at: string | null;
  play_group_error: string | null;
}
type Filter = 'pending' | 'invited' | 'all';

const PLATFORM: Record<string, string> = { ios: 'iPhone', android: 'Android' };
const day = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const isPending = (r: TesterRow) => !!r.confirmed_at && !r.testflight_invited_at && !r.rejected_at && r.platform !== 'android';
const isInvited = (r: TesterRow) => !!r.testflight_invited_at || !!r.play_group_added_at;

function status(r: TesterRow): { text: string; tone: string } {
  if (r.testflight_invited_at) return { text: `Invité sur TestFlight le ${day(r.testflight_invited_at)}`, tone: 'text-emerald-700' };
  if (r.rejected_at) return { text: 'Demande écartée', tone: 'text-slate-500' };
  if (!r.confirmed_at) return { text: 'Adresse email non confirmée', tone: 'text-amber-600' };
  if (r.platform === 'android') {
    if (r.play_group_added_at) return { text: `Ajouté aux testeurs Google Play le ${day(r.play_group_added_at)}`, tone: 'text-emerald-700' };
    if (r.play_group_error) return { text: 'Ajout automatique échoué : à ajouter à la main', tone: 'text-rose-600' };
    return { text: 'Lien Android envoyé', tone: 'text-slate-500' };
  }
  return { text: 'En attente de votre validation', tone: 'text-[#0F172A] dark:text-white' };
}

/** Message d'erreur renvoyé par une fonction serveur (corps JSON `{ error }`). */
async function functionError(error: { message: string; context?: unknown }): Promise<string> {
  try {
    const ctx = error.context as Response | undefined;
    if (ctx) return (await ctx.json()).error || error.message;
  } catch { /* ignore */ }
  return error.message;
}

/** Bêta-testeurs inscrits sur le site : validation → ajout automatique au groupe TestFlight. */
export const AdminBeta: React.FC = () => {
  const [rows, setRows] = useState<TesterRow[] | null>(null);
  const [filter, setFilter] = useState<Filter>('pending');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [config, setConfig] = useState<{ configured: boolean; group?: string; error?: string } | null>(null);
  const [androidConfig, setAndroidConfig] = useState<{ configured: boolean; group?: string; error?: string } | null>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('beta_testers')
      .select('id, email, first_name, platform, role, created_at, confirmed_at, approved_at, rejected_at, testflight_invited_at, testflight_error, play_group_added_at, play_group_error')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) setMsg({ ok: false, text: 'Liste indisponible : ' + error.message });
    else setRows((data || []) as TesterRow[]);
  }, []);

  useEffect(() => {
    load();
    supabase?.functions.invoke('beta-approve', { body: { action: 'check' } }).then(({ data, error }) => {
      setConfig(error ? { configured: false, error: 'Vérification TestFlight impossible.' } : data);
    });
    supabase?.functions.invoke('beta-approve', { body: { action: 'check-android' } }).then(({ data, error }) => {
      setAndroidConfig(error ? { configured: false, error: 'Vérification Google Play impossible.' } : data);
    });
  }, [load]);

  const act = async (r: TesterRow, action: 'approve' | 'reject') => {
    if (!supabase) return;
    if (action === 'reject' && !window.confirm(`Écarter la demande de ${r.email} ? Aucun email ne lui sera envoyé.`)) return;
    setBusyId(r.id);
    setMsg(null);
    const { data, error } = await supabase.functions.invoke('beta-approve', { body: { action, id: r.id } });
    setBusyId(null);
    if (error) setMsg({ ok: false, text: await functionError(error) });
    else if (action === 'reject') setMsg({ ok: true, text: `Demande de ${r.email} écartée.` });
    else setMsg({ ok: true, text: `${r.email} ajouté au groupe « ${data.group} » : Apple lui envoie l’invitation TestFlight.${data.mailed ? '' : ' (Mode d’emploi non envoyé : email indisponible.)'}` });
    load();
  };

  const pendingCount = (rows || []).filter(isPending).length;
  const shown = (rows || []).filter((r) => (filter === 'pending' ? isPending(r) : filter === 'invited' ? isInvited(r) : true));
  const filters: [Filter, string][] = [['pending', `À valider (${pendingCount})`], ['invited', 'Invités'], ['all', 'Tous']];

  return (
    <div className="space-y-3 mb-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-extrabold">Bêta-testeurs</h2>
          <button type="button" onClick={load} aria-label="Actualiser" className="w-11 h-11 -m-2 flex items-center justify-center text-slate-500 cursor-pointer">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          iPhone : validez une demande, la personne est ajoutée à votre groupe TestFlight et Apple lui envoie l’invitation.
          Android : la personne est ajoutée automatiquement aux testeurs Google Play dès qu’elle confirme son adresse.
        </p>
        {config && (
          <p className={`text-xs mt-2 leading-relaxed ${config.configured ? 'text-emerald-700' : 'text-rose-600'}`} role="status">
            {config.configured ? `TestFlight connecté — groupe « ${config.group} ».` : config.error}
          </p>
        )}
        {androidConfig && (
          <p className={`text-xs mt-1 leading-relaxed ${androidConfig.configured ? 'text-emerald-700' : 'text-rose-600'}`} role="status">
            {androidConfig.configured ? `Google Play connecté — groupe ${androidConfig.group}.` : androidConfig.error}
          </p>
        )}
      </div>

      <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-full text-xs font-bold">
        {filters.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`flex-1 min-h-11 rounded-full whitespace-nowrap transition cursor-pointer ${filter === key ? 'bg-[#00D664] text-[#0F172A]' : 'text-slate-500'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {msg && <p className={`text-sm ${msg.ok ? 'text-emerald-700' : 'text-rose-600'}`} role="status">{msg.text}</p>}

      {rows === null ? (
        <p className="text-sm text-slate-500">Chargement…</p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">{filter === 'pending' ? 'Aucune demande en attente.' : 'Personne pour le moment.'}</p>
      ) : (
        <ul className="space-y-2">
          {shown.map((r) => {
            const st = status(r);
            const busy = busyId === r.id;
            return (
              <li key={r.id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{r.first_name || r.email}</p>
                    {r.first_name && <p className="text-xs text-slate-500 truncate">{r.email}</p>}
                  </div>
                  <span className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {r.role === 'coach' ? 'Coach · ' : ''}{r.platform ? PLATFORM[r.platform] : 'Non précisé'}
                  </span>
                </div>
                <p className={`text-xs mt-2 font-semibold ${st.tone}`}>
                  {st.text} <span className="font-normal text-slate-400 tabular-nums">· inscrit le {day(r.created_at)}</span>
                </p>
                {r.testflight_error && !r.testflight_invited_at && <p className="text-xs text-rose-600 mt-1">Dernier essai : {r.testflight_error}</p>}
                {r.play_group_error && !r.play_group_added_at && <p className="text-xs text-rose-600 mt-1">Dernier essai : {r.play_group_error}</p>}
                {r.confirmed_at && !r.testflight_invited_at && r.platform !== 'android' && (
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => act(r, 'approve')}
                      className="flex-1 h-11 rounded-full bg-[#00D664] text-[#0F172A] text-sm font-bold flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Valider
                    </button>
                    {!r.rejected_at && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => act(r, 'reject')}
                        className="h-11 px-4 rounded-full border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <X className="w-4 h-4" /> Écarter
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
