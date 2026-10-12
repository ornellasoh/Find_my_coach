import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { APP_ICONS, CAMPAIGN_PRESETS, refreshCampaign, saveCampaign, uploadCampaignImage, type Campaign } from '../../lib/campaign';
import { supabase, isSupabaseEnabled } from '../../lib/supabase';

const input = 'w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 text-sm rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-[#00D664]';

/** Campagne marketing (Octobre Rose, Noël…) : bannière, photo, logo et icône de l'app, sans mise à jour. */
export const AdminCampaign: React.FC = () => {
  const [c, setC] = useState<Campaign>({ active: false });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      if (isSupabaseEnabled && supabase) {
        const { data } = await supabase.from('app_settings').select('value').eq('key', 'campaign').maybeSingle();
        if (data?.value) setC(data.value as Campaign);
      }
      setLoading(false);
    })();
  }, []);

  const set = (patch: Partial<Campaign>) => setC((prev) => ({ ...prev, ...patch }));

  const onFile = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    setMsg(null);
    try {
      set({ imageUrl: await uploadCampaignImage(f) });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const save = async (next: Campaign) => {
    setBusy(true);
    setMsg(null);
    try {
      await saveCampaign(next);
      setC(next);
      await refreshCampaign();
      setMsg({ ok: true, text: next.active ? 'Campagne en ligne : visible par tous à la prochaine ouverture de l’app.' : 'Campagne arrêtée : retour au logo et à l’icône habituels.' });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="text-sm text-slate-500 py-6 text-center">Chargement…</p>;

  return (
    <div className="space-y-4 mb-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold">Campagne marketing</h2>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${c.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
            {c.active ? 'En ligne' : 'Arrêtée'}
          </span>
        </div>
        <p className="text-xs text-slate-500">Choisissez un modèle ou personnalisez : bannière sur l’accueil, logo et icône de l’app.</p>
        <div className="flex gap-2 flex-wrap">
          {CAMPAIGN_PRESETS.map((p) => (
            <button key={p.id} type="button" onClick={() => setC({ ...p.campaign, imageUrl: c.imageUrl })}
              className="h-9 px-4 rounded-full border border-slate-300 dark:border-slate-600 text-xs font-bold cursor-pointer">
              {p.label}
            </button>
          ))}
        </div>

        <label className="block text-xs font-bold">Titre
          <input className={`${input} mt-1`} value={c.title ?? ''} maxLength={60} onChange={(e) => set({ title: e.target.value })} placeholder="Octobre Rose 🎗️" />
        </label>
        <label className="block text-xs font-bold">Message
          <textarea className={`${input} mt-1`} rows={3} value={c.message ?? ''} maxLength={240} onChange={(e) => set({ message: e.target.value })} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-bold">Couleur
            <input type="color" className="mt-1 w-full h-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent cursor-pointer" value={c.color || '#00D664'} onChange={(e) => set({ color: e.target.value })} />
          </label>
          <label className="block text-xs font-bold">Lien (facultatif)
            <input className={`${input} mt-1`} value={c.linkUrl ?? ''} onChange={(e) => set({ linkUrl: e.target.value.trim() || undefined })} placeholder="https://…" />
          </label>
        </div>

        <div>
          <span className="block text-xs font-bold mb-1">Photo de la bannière</span>
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => fileRef.current?.click()}
              className="h-10 px-4 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />} {c.imageUrl ? 'Changer la photo' : 'Ajouter une photo'}
            </button>
            {c.imageUrl && (
              <button type="button" onClick={() => set({ imageUrl: undefined })} className="h-10 px-3 rounded-full text-rose-600 text-xs font-bold flex items-center gap-1 cursor-pointer">
                <Trash2 className="w-4 h-4" /> Retirer
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-bold">Logo dans l’app
            <select className={`${input} mt-1`} value={c.logo ?? 'default'} onChange={(e) => set({ logo: e.target.value as Campaign['logo'] })}>
              {APP_ICONS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
            </select>
          </label>
          <label className="block text-xs font-bold">Icône du téléphone
            <select className={`${input} mt-1`} value={c.icon ?? 'default'} onChange={(e) => set({ icon: e.target.value as Campaign['icon'] })}>
              {APP_ICONS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
            </select>
          </label>
        </div>
        <p className="text-[11px] text-slate-500">L’icône du téléphone change à l’ouverture de l’app (sur iPhone, un petit message d’Apple le confirme). Les icônes disponibles sont celles livrées dans l’app : pour une nouvelle icône, il faut une mise à jour.</p>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-bold">Début (facultatif)
            <input type="date" className={`${input} mt-1`} value={c.startsOn ?? ''} onChange={(e) => set({ startsOn: e.target.value || undefined })} />
          </label>
          <label className="block text-xs font-bold">Fin (facultatif)
            <input type="date" className={`${input} mt-1`} value={c.endsOn ?? ''} onChange={(e) => set({ endsOn: e.target.value || undefined })} />
          </label>
        </div>
      </div>

      <div>
        <span className="block text-xs font-bold text-slate-500 mb-2">Aperçu</span>
        <PreviewBanner c={c} />
      </div>

      {msg && <p className={`text-sm ${msg.ok ? 'text-emerald-700' : 'text-rose-600'}`} role="status">{msg.text}</p>}

      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={() => save({ ...c, active: true })}
          className="flex-1 h-12 rounded-full bg-[#00D664] text-[#0F172A] font-bold text-sm cursor-pointer disabled:opacity-50">
          {c.active ? 'Mettre à jour la campagne' : 'Lancer la campagne'}
        </button>
        {c.active && (
          <button type="button" disabled={busy} onClick={() => save({ ...c, active: false })}
            className="h-12 px-5 rounded-full border border-rose-300 text-rose-600 font-bold text-sm cursor-pointer disabled:opacity-50">
            Arrêter
          </button>
        )}
      </div>
    </div>
  );
};

/** Aperçu local (n'utilise pas la campagne en ligne). */
const PreviewBanner: React.FC<{ c: Campaign }> = ({ c }) => (
  <div className="relative overflow-hidden rounded-3xl text-white" style={{ background: c.color || '#00D664' }}>
    {c.imageUrl && <img src={c.imageUrl} alt="" className="w-full max-h-48 object-cover" />}
    <div className="p-4">
      <p className="text-lg font-bold leading-tight">{c.title || 'Titre de la campagne'}</p>
      {c.message && <p className="text-sm mt-1 leading-snug text-white/90">{c.message}</p>}
    </div>
  </div>
);

