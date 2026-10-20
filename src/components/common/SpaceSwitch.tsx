import React from 'react';
import { motion } from 'motion/react';
import { Briefcase, Check, User } from 'lucide-react';
import { useApp, type AppSpace } from '../../context/AppContext';
import { Sheet } from '../ui/fmc';

/**
 * Bascule « Espace client / Espace coach », en haut des deux écrans Profil.
 * Affichée seulement pour un compte coach : il réserve d'autres coachs dans son espace client et revient en un geste.
 */
export const SpaceSwitch: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { currentUser, activeSpace, switchSpace } = useApp();
  if (currentUser?.role !== 'coach') return null;

  const options: { space: AppSpace; label: string; icon: React.ReactNode }[] = [
    { space: 'client', label: 'Espace client', icon: <User className="w-4 h-4" /> },
    { space: 'coach', label: 'Espace coach', icon: <Briefcase className="w-4 h-4" /> },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Espace affiché"
      className={`relative grid grid-cols-2 p-1 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-fmc-line/80 dark:border-slate-800 ${className}`}
    >
      {options.map((o) => {
        const active = activeSpace === o.space;
        return (
          <button
            key={o.space}
            id={`btn-space-${o.space}`}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => !active && switchSpace(o.space)}
            className={`apple-press relative h-11 rounded-full text-[14px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              active ? 'text-fmc-navy' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {active && (
              <motion.span
                layoutId="space-switch-pill"
                transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                className="absolute inset-0 rounded-full bg-fmc-green shadow-sm"
                aria-hidden="true"
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {o.icon}
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

/** Confirmation avant d'ajouter (ou de réactiver) le profil coach. Le compte reste client. */
export const BecomeCoachSheet: React.FC<{ onClose: () => void; reactivate?: boolean }> = ({ onClose, reactivate }) => {
  const { becomeCoach } = useApp();
  const points = reactivate
    ? [
        'Votre profil coach redevient visible dans la recherche, avec vos tarifs et vos créneaux.',
        'Vous restez client : vos réservations, vos messages et vos packs ne bougent pas.',
        'Vous pourrez le remettre en pause à tout moment.',
      ]
    : [
        'Vous restez client : vos réservations, vos messages et vos packs ne bougent pas.',
        "Vous passez de l'espace client à l'espace coach en un geste, depuis votre profil.",
        'Vous complétez votre profil pro (présentation, tarifs, créneaux) avant d’apparaître dans la recherche.',
        'Vous pouvez mettre votre profil coach en pause à tout moment, et le réactiver plus tard.',
      ];
  const action = reactivate ? 'Réactiver mon profil coach' : 'Créer mon profil coach';
  return (
    <Sheet
      onClose={onClose}
      title={reactivate ? 'Réactiver mon profil coach' : 'Devenir coach'}
      footer={
        <div className="grid gap-2">
          <button
            id="btn-confirm-become-coach"
            type="button"
            onClick={() => {
              onClose();
              becomeCoach();
            }}
            className="apple-press h-12 rounded-full bg-fmc-green text-fmc-navy font-bold cursor-pointer"
          >
            {action}
          </button>
          <button type="button" onClick={onClose} className="apple-press h-11 rounded-full text-sm font-semibold text-slate-500 cursor-pointer">
            Pas maintenant
          </button>
        </div>
      }
    >
      <CheckList points={points} />
      {!reactivate && <p className="text-[13px] text-slate-500 mt-4">Un compte n’a qu’un seul profil coach.</p>}
    </Sheet>
  );
};

/** Mise en pause du profil coach : masqué de la recherche, le compte redevient simple client. */
export const PauseCoachSheet: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { pauseCoachProfile, bookings, coaches, currentUser } = useApp();
  const myCoachId = coaches.find((c) => c.userId === currentUser?.id)?.id;
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = bookings.filter(
    (b) => b.coachId === myCoachId && ['pending', 'confirmed'].includes(b.bookingStatus) && b.date >= today,
  ).length;
  const blocked = upcoming > 0;
  return (
    <Sheet
      onClose={onClose}
      title="Mettre mon profil coach en pause"
      footer={
        <div className="grid gap-2">
          <button
            id="btn-confirm-pause-coach"
            type="button"
            disabled={blocked}
            onClick={() => {
              onClose();
              pauseCoachProfile();
            }}
            className="apple-press h-12 rounded-full bg-fmc-navy dark:bg-white text-white dark:text-fmc-navy font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Mettre en pause
          </button>
          <button type="button" onClick={onClose} className="apple-press h-11 rounded-full text-sm font-semibold text-slate-500 cursor-pointer">
            Annuler
          </button>
        </div>
      }
    >
      {blocked ? (
        <p className="text-[15px] leading-snug rounded-2xl bg-amber-50 dark:bg-amber-400/15 text-[#92400E] dark:text-amber-200 p-3">
          Vous avez {upcoming} séance{upcoming > 1 ? 's' : ''} à venir en tant que coach. {upcoming > 1 ? 'Assurez-les ou annulez-les' : 'Assurez-la ou annulez-la'} avant de mettre votre profil en pause.
        </p>
      ) : (
        <CheckList
          points={[
            'Votre profil coach n’apparaît plus dans la recherche et personne ne peut vous réserver.',
            'Votre compte redevient un compte client : vous réservez, écrivez et suivez vos séances comme avant.',
            'Votre présentation, vos tarifs, vos clients et vos revenus sont gardés.',
            'Vous le réactivez quand vous voulez, depuis votre profil.',
          ]}
        />
      )}
    </Sheet>
  );
};

const CheckList: React.FC<{ points: string[] }> = ({ points }) => (
  <ul className="space-y-3">
    {points.map((p) => (
      <li key={p} className="flex gap-3 text-[15px] leading-snug">
        <span className="w-6 h-6 rounded-full bg-fmc-green/15 text-fmc-green-ink dark:text-fmc-green flex items-center justify-center shrink-0 mt-0.5">
          <Check className="w-3.5 h-3.5" strokeWidth={3} />
        </span>
        {p}
      </li>
    ))}
  </ul>
);
