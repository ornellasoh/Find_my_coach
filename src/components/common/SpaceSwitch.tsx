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

/** Confirmation avant qu'un client devienne coach (une seule fois, définitif). */
export const BecomeCoachSheet: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { becomeCoach } = useApp();
  const points = [
    'Vous gardez votre compte client : vos réservations, vos messages et vos packs restent là.',
    "Vous passez de l'espace coach à l'espace client en un geste, depuis votre profil.",
    'Vous complétez ensuite votre profil pro (présentation, tarifs, créneaux) avant d’apparaître dans la recherche.',
  ];
  return (
    <Sheet
      onClose={onClose}
      title="Devenir coach"
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
            Créer mon profil coach
          </button>
          <button type="button" onClick={onClose} className="apple-press h-11 rounded-full text-sm font-semibold text-slate-500 cursor-pointer">
            Pas maintenant
          </button>
        </div>
      }
    >
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
      <p className="text-[13px] text-slate-500 mt-4">
        Ce choix est définitif : un compte coach ne redevient pas un simple compte client. Pour arrêter votre activité de coach plus tard, écrivez à l’équipe.
      </p>
    </Sheet>
  );
};
