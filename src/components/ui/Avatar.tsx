import React, { useState } from 'react';
import { User as UserIcon } from 'lucide-react';
import { initialsOf, realPhoto } from '../../utils/initials';

/** Couleurs de fond (charte Find My Coach), choisies de façon stable à partir du nom. */
const TONES = [
  'bg-fmc-green text-fmc-navy',
  'bg-fmc-dark text-fmc-green',
  'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200',
  'bg-sky-100 text-sky-900 dark:bg-sky-500/20 dark:text-sky-200',
  'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200',
  'bg-violet-100 text-violet-900 dark:bg-violet-500/20 dark:text-violet-200',
];
const toneFor = (name: string) => {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
};

/**
 * Avatar unique de l'app : la photo choisie par la personne si elle existe,
 * sinon ses initiales (jamais de photo générique). Taille et forme via className.
 */
export const Avatar: React.FC<{
  src?: string | null;
  name?: string | null;
  className?: string;
  alt?: string;
}> = ({ src, name, className = 'w-10 h-10 rounded-full', alt }) => {
  const photo = realPhoto(src);
  const [failed, setFailed] = useState(false);
  const label = (name ?? '').trim();
  const initials = initialsOf(label);

  if (photo && !failed) {
    return (
      <img
        src={photo}
        alt={alt ?? label}
        onError={() => setFailed(true)}
        className={`object-cover bg-slate-100 dark:bg-slate-800 shrink-0 ${className}`}
      />
    );
  }
  return (
    <span
      role="img"
      aria-label={alt ?? (label || 'Profil')}
      className={`shrink-0 inline-flex items-center justify-center font-bold select-none overflow-hidden ${toneFor(label || '?')} ${className}`}
      style={{ containerType: 'size' }}
    >
      {initials ? (
        <span className={initials.length > 1 ? 'fmc-av-2' : 'fmc-av-1'} style={{ lineHeight: 1 }}>{initials}</span>
      ) : (
        <UserIcon className="fmc-av-icon" aria-hidden="true" />
      )}
    </span>
  );
};
