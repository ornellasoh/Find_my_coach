import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, ShieldCheck, UserPlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';

interface AdminRow { user_id: string; email: string; name: string | null; granted_at: string; note: string | null }

/** Équipe d'administration : qui a accès au tableau admin. Ajout par email d'un compte existant. */
export const AdminTeam: React.FC = () => {
  const { currentUser } = useApp();
  const [rows, setRows] = useState<AdminRow[] | null>(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.rpc('admin_list');
    if (error) setMsg({ ok: false, text: 'Liste indisponible : ' + error.message });
    else setRows((data || []) as AdminRow[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !email.trim()) return;
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.rpc('admin_grant', { p_email: email.trim(), p_note: `ajouté par ${currentUser?.name ?? 'un admin'}` });
    setBusy(false);
    if (error) {
      setMsg({ ok: false, text: error.message.includes('Aucun compte') ? 'Aucun compte confirmé avec cet email : la personne doit d’abord créer son compte dans l’app et confirmer son email.' : error.message });
      return;
    }
    setMsg({ ok: true, text: `${email.trim()} a maintenant accès à l’administration (après s’être reconnecté·e).` });
    setEmail('');
    load();
  };

  const remove = async (r: AdminRow) => {
    if (!supabase || !window.confirm(`Retirer l’accès administrateur de ${r.email} ?`)) return;
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.rpc('admin_revoke', { p_user_id: r.user_id });
    setBusy(false);
    if (error) setMsg({ ok: false, text: error.message });
    else { setMsg({ ok: true, text: `Accès retiré pour ${r.email}.` }); load(); }
  };

  return (
    <div className="space-y-4 mb-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
        <h2 className="text-sm font-extrabold mb-1">Équipe d’administration</h2>
        <p className="text-xs text-slate-500 mb-3">Ces comptes voient l’administration (coachs, vérifications, signalements, campagnes, statistiques).</p>
        {rows === null ? (
          <p className="text-sm text-slate-500">Chargement…</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.user_id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                <ShieldCheck className="w-4 h-4 text-[#00B050] shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold truncate">{r.name || r.email}</span>
                  <span className="block text-xs text-slate-500 truncate">{r.email}</span>
                </span>
                {r.user_id !== currentUser?.id && (
                  <button type="button" disabled={busy} onClick={() => remove(r)} className="text-xs font-bold text-rose-600 cursor-pointer disabled:opacity-50">
                    Retirer
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={add} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-2">
        <label className="block text-xs font-bold" htmlFor="admin-email">Ajouter un administrateur</label>
        <input id="admin-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email du compte dans l’app"
          className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 text-sm rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-[#00D664]" />
        <button type="submit" disabled={busy || !email.trim()} className="w-full h-11 rounded-full bg-[#00D664] text-[#0F172A] text-sm font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Donner l’accès
        </button>
        <p className="text-[11px] text-slate-500">La personne doit déjà avoir un compte confirmé. Le dernier administrateur ne peut pas être retiré.</p>
      </form>

      {msg && <p className={`text-sm ${msg.ok ? 'text-emerald-700' : 'text-rose-600'}`} role="status">{msg.text}</p>}
    </div>
  );
};
