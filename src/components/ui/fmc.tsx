import React from 'react';
import { ChevronLeft, Star, X } from 'lucide-react';
import { motion } from 'motion/react';

/**
 * Composants d'interface Find My Coach (charte 2026).
 * Fond #F6F9FA, cartes blanches très arrondies, CTA vert #00D664 en pilule, police Plus Jakarta Sans.
 */

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export const Screen: React.FC<{ children: React.ReactNode; className?: string; withNav?: boolean }> = ({
  children,
  className,
  withNav = true,
}) => (
  <div
    className={cx(
      'min-h-screen bg-fmc-bg dark:bg-[#0B0F19] text-fmc-navy dark:text-slate-100 max-w-md mx-auto px-5 pt-4',
      withNav ? 'pb-32' : 'pb-10',
      className,
    )}
  >
    {children}
  </div>
);

export const IconButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }
> = ({ children, className, ...props }) => (
  <button
    type="button"
    {...props}
    className={cx(
      'apple-press w-11 h-11 shrink-0 rounded-full text-fmc-navy dark:text-white flex items-center justify-center cursor-pointer',
      className,
    )}
  >
    {children}
  </button>
);

/**
 * En-tête d'écran façon iOS : collé en haut, matière translucide (le contenu défile dessous),
 * chevron de retour sans bulle, titre centré 17 pt gras.
 */
export const ScreenHeader: React.FC<{
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}> = ({ title, onBack, right }) => (
  <header className="fmc-header-glass sticky top-0 z-20 -mx-5 -mt-4 mb-4 h-14 px-2 flex items-center justify-between gap-2">
    {onBack ? (
      <button type="button" onClick={onBack} aria-label="Retour" className="apple-press w-11 h-11 shrink-0 rounded-full flex items-center justify-center cursor-pointer">
        <ChevronLeft className="w-7 h-7" strokeWidth={2.2} />
      </button>
    ) : (
      <span className="w-11 shrink-0" />
    )}
    <h1 className="flex-1 text-center text-[17px] font-bold truncate">{title}</h1>
    <span className="min-w-11 shrink-0 flex justify-end">{right}</span>
  </header>
);

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement> & { selected?: boolean }> = ({
  children,
  className,
  selected,
  ...props
}) => (
  <div
    {...props}
    className={cx(
      'bg-white dark:bg-slate-900 rounded-3xl border transition-colors',
      props.onClick && 'apple-press cursor-pointer',
      selected
        ? 'border-fmc-green shadow-[0_4px_20px_rgba(0,214,100,0.15)]'
        : 'border-fmc-line/80 dark:border-slate-800',
      className,
    )}
  >
    {children}
  </div>
);

export const PrimaryButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: React.ReactNode; gradient?: boolean }
> = ({ children, icon, gradient, className, ...props }) => (
  <button
    type="button"
    {...props}
    className={cx(
      'apple-press w-full h-[52px] rounded-full font-bold text-[15px] text-fmc-navy flex items-center justify-center gap-2.5 cursor-pointer',
      'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
      gradient
        ? 'bg-linear-to-r from-[#00FD83] via-fmc-green to-[#009E55] shadow-[0_10px_30px_rgba(0,214,100,0.30)]'
        : 'bg-fmc-green hover:bg-[#00C85D] shadow-[0_10px_30px_rgba(0,214,100,0.25)]',
      className,
    )}
  >
    {icon}
    {children}
  </button>
);

/** Barre d'action collée en bas de l'écran (au-dessus de la barre d'accueil iPhone), en matière translucide. */
export const StickyAction: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="fmc-header-glass fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 px-5 pt-3 pb-[calc(1rem+var(--sab))] border-t border-fmc-line/70 dark:border-slate-800">
    {children}
  </div>
);

export const SectionHeader: React.FC<{
  title: string;
  action?: string;
  onAction?: () => void;
  className?: string;
  accent?: boolean;
}> = ({ title, action, onAction, className, accent }) => (
  <div className={cx('flex items-center justify-between mb-3', className)}>
    <h2 className={cx('text-[20px] leading-[25px] font-bold', accent && 'text-fmc-navy dark:text-white')}>{title}</h2>
    {action && (
      <button
        type="button"
        onClick={onAction}
        className="min-h-11 -my-2 px-1 text-[15px] font-semibold text-[#007A3D] dark:text-fmc-green cursor-pointer"
      >
        {action}
      </button>
    )}
  </div>
);

export const Chip: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; icon?: React.ReactNode }
> = ({ active, icon, children, className, ...props }) => (
  <button
    type="button"
    {...props}
    className={cx(
      'apple-press h-11 px-4 rounded-full text-sm font-semibold shrink-0 flex items-center gap-2 cursor-pointer whitespace-nowrap',
      active
        ? 'bg-fmc-navy text-white dark:bg-white dark:text-fmc-navy'
        : 'bg-white dark:bg-slate-900 text-fmc-navy dark:text-slate-200 border border-fmc-line dark:border-slate-800',
      className,
    )}
  >
    {icon}
    {children}
  </button>
);

export const SearchField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { icon: React.ReactNode }> = ({
  icon,
  className,
  ...props
}) => (
  <label className={cx('relative block', className)}>
    <span className="absolute inset-y-0 left-4 flex items-center text-fmc-navy dark:text-slate-300 pointer-events-none">
      {icon}
    </span>
    <input
      type="search"
      {...props}
      className="w-full h-12 pl-11 pr-4 bg-white dark:bg-slate-900 rounded-2xl text-[15px] text-fmc-navy dark:text-white placeholder:text-slate-400 shadow-[0_1px_3px_rgba(15,23,42,0.05)] focus:outline-none focus:ring-2 focus:ring-fmc-green/50 transition"
    />
  </label>
);

/** Note d'un coach ; « Nouveau » quand `count` vaut 0 (aucun avis publié). */
export const Rating: React.FC<{ value: number; count?: number; className?: string }> = ({ value, count, className }) => (
  <span className={cx('inline-flex items-center gap-1 text-sm font-semibold tabular-nums', className)}>
    <Star className="w-4 h-4 fill-amber-400 text-amber-400" aria-hidden="true" />
    {count === 0 ? 'Nouveau' : value.toFixed(1).replace('.', ',')}
  </span>
);

/** Tuile d'icône carrée (listes de réglages, moyens de paiement…). */
export const IconTile: React.FC<{ children: React.ReactNode; tone?: 'soft' | 'dark' | 'outline'; className?: string }> = ({
  children,
  tone = 'soft',
  className,
}) => (
  <span
    className={cx(
      'w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center',
      tone === 'soft' && 'bg-fmc-bg dark:bg-slate-800 text-fmc-green-ink',
      tone === 'dark' && 'bg-fmc-dark text-fmc-green',
      tone === 'outline' && 'bg-slate-50 dark:bg-slate-800 border border-fmc-line dark:border-slate-700 text-fmc-navy dark:text-white',
      className,
    )}
  >
    {children}
  </span>
);

export const formatEuro = (n: number, decimals = true) =>
  n.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  });

/** "2026-10-09" → "ven. 9 oct." (laisse les autres formats inchangés). */
export const formatDateFr = (value: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', opts);
};

/**
 * Feuille du bas façon iOS : monte avec un ressort sans rebond, fond assombri derrière,
 * se ferme par la croix, en touchant le fond, ou en la glissant vers le bas
 * (la vitesse compte : un petit geste sec suffit). On ne la saisit que par le haut et le bas,
 * pour que le contenu reste défilable.
 */
export const Sheet: React.FC<{
  onClose: () => void;
  title?: string;
  /** Nom lu par les lecteurs d'écran quand il n'y a pas de titre visible */
  label?: string;
  /** Action à gauche de l'en-tête (ex. « Effacer ») */
  leading?: React.ReactNode;
  children: React.ReactNode;
  /** Barre d'action collée en bas */
  footer?: React.ReactNode;
  className?: string;
}> = ({ onClose, title, label, leading, children, footer, className }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2 }}
    className="fixed inset-0 z-[60] bg-black/40 flex items-end justify-center"
    onClick={onClose}
  >
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.05, bottom: 0.8 }}
      onDragEnd={(_, info) => {
        if (info.offset.y > 120 || info.velocity.y > 600) onClose();
      }}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label={title ?? label}
      className={cx('w-full max-w-md bg-white dark:bg-slate-900 text-fmc-navy dark:text-slate-100 rounded-t-[28px] max-h-[92vh] flex flex-col', className)}
    >
      <div className="pt-2 flex justify-center cursor-grab" aria-hidden="true">
        <span className="w-9 h-[5px] rounded-full bg-slate-300 dark:bg-slate-600" />
      </div>
      <div className="h-14 px-2 flex items-center justify-between shrink-0">
        <span className="min-w-11 flex">{leading}</span>
        {title && <h2 className="text-[17px] font-bold truncate px-2">{title}</h2>}
        <button type="button" onClick={onClose} aria-label="Fermer" className="apple-press w-11 h-11 rounded-full flex items-center justify-center cursor-pointer">
          <span className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <X className="w-4 h-4" strokeWidth={2.5} />
          </span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4" onPointerDownCapture={(e) => e.stopPropagation()}>
        {children}
      </div>
      {footer && (
        <div className="border-t border-fmc-line dark:border-slate-800 px-5 pt-3 pb-[calc(1rem+var(--sab))] shrink-0">{footer}</div>
      )}
      {!footer && <div className="pb-[var(--sab)] shrink-0" />}
    </motion.div>
  </motion.div>
);
