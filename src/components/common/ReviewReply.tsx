import React, { useState } from 'react';
import { Flag, MessageSquare } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { ReportSheet } from './ReportSheet';
import { useApp } from '../../context/AppContext';
import type { Review } from '../../types';

/** Réponse publique du coach sous un avis (affichage). */
export const CoachReplyBlock: React.FC<{ review: Review; coachName?: string }> = ({ review, coachName }) =>
  review.coachReply ? (
    <div className="mt-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 p-3.5">
      <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
        Réponse {coachName ? `de ${coachName.split(' ')[0]}` : 'du coach'}
        {review.coachReplyAt && (
          <span className="font-normal text-slate-500"> · {new Date(review.coachReplyAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span>
        )}
      </p>
      <p className="text-sm text-slate-600 dark:text-slate-300 leading-normal mt-1 whitespace-pre-line">{review.coachReply}</p>
    </div>
  ) : null;

/** Côté coach : la réponse si elle existe, sinon un bouton « Répondre » (une seule réponse possible). */
export const CoachReplyEditor: React.FC<{ review: Review }> = ({ review }) => {
  const { replyToReview } = useApp();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (review.coachReply) return <CoachReplyBlock review={review} />;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="apple-press mt-2.5 min-h-11 inline-flex items-center gap-1.5 text-sm font-semibold text-fmc-green-ink cursor-pointer"
      >
        <MessageSquare className="w-4 h-4" /> Répondre
      </button>
    );
  }

  const submit = async () => {
    setSaving(true);
    setError(null);
    const err = await replyToReview(review.id, text);
    setSaving(false);
    if (err) setError(err);
  };

  return (
    <div className="mt-3 space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={1000}
        rows={3}
        autoFocus
        aria-label="Votre réponse"
        placeholder="Merci pour votre retour…"
        className="w-full text-[15px] p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-fmc-green/50 resize-none placeholder:text-slate-500"
      />
      <p className="text-xs text-slate-500">Votre réponse sera visible sur votre profil. Vous ne pourrez répondre qu’une fois.</p>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); }}
          className="apple-press min-h-11 px-4 rounded-full text-sm font-bold bg-slate-100 dark:bg-slate-800 cursor-pointer"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={saving || !text.trim()}
          className="apple-press min-h-11 px-4 rounded-full text-sm font-bold bg-fmc-green text-fmc-navy disabled:opacity-50 cursor-pointer"
        >
          {saving ? 'Envoi…' : 'Publier la réponse'}
        </button>
      </div>
    </div>
  );
};

/** Lien discret « Signaler » sous un avis (personne connectée, sauf l'auteur de l'avis). */
export const ReportReviewLink: React.FC<{ review: Review }> = ({ review }) => {
  const { currentUser, isOnline } = useApp();
  const [open, setOpen] = useState(false);
  if (!isOnline || !currentUser || currentUser.id === review.clientId) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 min-h-11 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 cursor-pointer"
      >
        <Flag className="w-3.5 h-3.5" /> Signaler
      </button>
      <AnimatePresence>
        {open && <ReportSheet type="review" targetId={review.id} subject="cet avis" onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
};
