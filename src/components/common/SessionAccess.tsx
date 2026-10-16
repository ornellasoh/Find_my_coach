import React, { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardList, ExternalLink, Link2, Loader2, Navigation, Pencil, Video } from 'lucide-react';
import type { Booking, SessionDetails } from '../../types';
import { fetchSessionDetails, saveSessionDetails } from '../../lib/sessions';
import { isSupabaseEnabled } from '../../lib/supabase';
import { directionsUrl, meetingProvider, openExternal, validateMeetingUrl } from '../../utils/meeting';

export const isOnlineBooking = (b: Booking) => b.format === 'online' || b.sessionType?.format === 'online' || b.sessionType?.mode === 'video';

/** Charge les détails privés d'une séance (lien, consignes, lieu exact). */
export function useSessionDetails(booking: Booking | null) {
  const [details, setDetails] = useState<SessionDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = booking?.id;
  const visible = booking && (booking.bookingStatus === 'confirmed' || booking.bookingStatus === 'completed');

  const reload = async () => {
    if (!id || !visible) {
      setDetails(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const map = await fetchSessionDetails([id]);
      setDetails(map[id] ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, visible]);

  return { details, setDetails, loading, error, reload };
}

/**
 * Accès à la séance : bouton « Rejoindre la séance » (lien externe), consignes de préparation,
 * lieu exact + itinéraire. Le coach ajoute / modifie le lien et les consignes.
 * Ouvrir le lien ne marque jamais la séance comme effectuée.
 */
export const SessionAccess: React.FC<{
  booking: Booking;
  isCoach: boolean;
  details: SessionDetails | null;
  loading: boolean;
  error: string | null;
  onSaved: (d: SessionDetails) => void;
  compact?: boolean;
}> = ({ booking, isCoach, details, loading, error, onSaved, compact }) => {
  const online = isOnlineBooking(booking);
  const confirmed = booking.bookingStatus === 'confirmed';
  const canSee = booking.bookingStatus === 'confirmed' || booking.bookingStatus === 'completed';
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState('');
  const [prep, setPrep] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    setUrl(details?.meetingUrl ?? '');
    setPrep(details?.prepInstructions ?? '');
  }, [details?.meetingUrl, details?.prepInstructions]);

  if (!canSee) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {booking.bookingStatus === 'pending'
          ? 'Le lien, le lieu exact et les consignes seront visibles une fois le paiement confirmé.'
          : 'Cette séance est annulée : le lien et le lieu ne sont plus accessibles.'}
      </p>
    );
  }

  const submit = async () => {
    setFormError(null);
    setSavedMsg(null);
    let clean: string | null = null;
    if (url.trim()) {
      const v = validateMeetingUrl(url);
      if ('error' in v) {
        setFormError(v.error);
        return;
      }
      clean = v.url;
    } else if (online) {
      setFormError('Ajoutez le lien de la visio pour que votre client puisse rejoindre la séance.');
      return;
    }
    if (prep.length > 2000) {
      setFormError('Consignes trop longues (2000 caractères maximum).');
      return;
    }
    setSaving(true);
    try {
      const d = await saveSessionDetails(booking.id, clean, prep.trim() || null);
      onSaved({ ...d, sessionAddress: d.sessionAddress ?? details?.sessionAddress ?? null });
      setEditing(false);
      setSavedMsg(isSupabaseEnabled && clean && clean !== details?.meetingUrl ? 'Enregistré — votre client a été prévenu.' : 'Enregistré.');
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  const link = details?.meetingUrl;
  const address = details?.sessionAddress;

  return (
    <div className="space-y-3">
      {loading && (
        <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</p>
      )}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      {/* Visio */}
      {online && !loading && (
        <div className="space-y-2">
          {link ? (
            <>
              <button
                type="button"
                onClick={() => openExternal(link)}
                className="w-full min-h-12 rounded-full bg-fmc-green hover:bg-[#00C85D] text-fmc-navy font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition cursor-pointer"
              >
                <Video className="w-5 h-5" /> Rejoindre la séance
                <ExternalLink className="w-4 h-4 opacity-70" />
              </button>
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                {meetingProvider(link)} s'ouvre dans votre navigateur ou dans l'application installée.
              </p>
            </>
          ) : isCoach ? (
            confirmed && !editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="w-full min-h-12 rounded-full border-2 border-dashed border-fmc-green text-fmc-green-ink font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Link2 className="w-5 h-5" /> Ajouter le lien
              </button>
            )
          ) : (
            <p className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3 text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2">
              <Link2 className="w-4 h-4 mt-0.5 shrink-0 text-fmc-green-ink" />
              Le coach ajoutera le lien avant la séance. Vous serez prévenu dès qu'il sera disponible.
            </p>
          )}
        </div>
      )}

      {/* Lieu exact (séance en présentiel) */}
      {!online && !loading && (
        address ? (
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
            <p className="text-xs font-semibold text-slate-500 mb-1">Lieu de la séance</p>
            <p className="text-sm font-semibold">{address}</p>
            <button
              type="button"
              onClick={() => openExternal(directionsUrl(address))}
              className="mt-2 min-h-11 px-4 rounded-full bg-fmc-dark text-white text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
            >
              <Navigation className="w-4 h-4" /> Itinéraire
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {booking.location ? `Zone : ${booking.location}. ` : ''}
            Le lieu exact sera précisé par le coach via la messagerie.
          </p>
        )
      )}

      {/* Consignes */}
      {!editing && details?.prepInstructions && (
        <div className="rounded-2xl bg-fmc-green/10 p-3">
          <p className="text-xs font-semibold text-fmc-green-ink mb-1 flex items-center gap-1.5">
            <ClipboardList className="w-3.5 h-3.5" /> Pour préparer la séance
          </p>
          <p className="text-sm whitespace-pre-line">{details.prepInstructions}</p>
        </div>
      )}

      {savedMsg && (
        <p className="text-sm text-fmc-green-ink flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> {savedMsg}</p>
      )}

      {/* Formulaire du coach */}
      {isCoach && confirmed && (editing ? (
        <div className="rounded-2xl border border-fmc-line dark:border-slate-700 p-3 space-y-3">
          {online && (
            <label className="block">
              <span className="text-sm font-semibold">Lien de la visio</span>
              <input
                type="url"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://meet.google.com/…  ou  https://zoom.us/j/…"
                className="mt-1 w-full h-12 px-3 rounded-xl bg-white dark:bg-slate-900 border border-fmc-line dark:border-slate-700 text-[15px] focus:outline-none focus:ring-2 focus:ring-fmc-green/50"
              />
              <span className="text-xs text-slate-500">Google Meet, Zoom, Teams ou autre — adresse https:// uniquement.</span>
            </label>
          )}
          <label className="block">
            <span className="text-sm font-semibold">Consignes de préparation</span>
            <textarea
              value={prep}
              onChange={(e) => setPrep(e.target.value)}
              rows={compact ? 3 : 4}
              maxLength={2000}
              placeholder="Matériel (tapis, élastiques…), tenue, espace nécessaire…"
              className="mt-1 w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-fmc-line dark:border-slate-700 text-[15px] focus:outline-none focus:ring-2 focus:ring-fmc-green/50"
            />
          </label>
          {formError && <p className="text-sm text-rose-600">{formError}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setEditing(false); setFormError(null); setUrl(details?.meetingUrl ?? ''); setPrep(details?.prepInstructions ?? ''); }}
              className="flex-1 min-h-11 rounded-full bg-slate-100 dark:bg-slate-800 font-semibold cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={submit}
              className="flex-1 min-h-11 rounded-full bg-fmc-green text-fmc-navy font-bold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Enregistrer
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="min-h-11 px-4 rounded-full bg-slate-100 dark:bg-slate-800 text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
        >
          <Pencil className="w-4 h-4" /> {online ? (link ? 'Modifier le lien et les consignes' : 'Ajouter des consignes') : 'Modifier les consignes'}
        </button>
      ))}
    </div>
  );
};
