import React from 'react';
import { ChevronLeft, Star } from 'lucide-react';

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
      'w-11 h-11 shrink-0 rounded-2xl bg-white dark:bg-slate-900 text-fmc-navy dark:text-white flex items-center justify-center shadow-[0_1px_3px_rgba(15,23,42,0.06)] active:scale-95 transition cursor-pointer',
      className,
    )}
  >
    {children}
  </button>
);

export const ScreenHeader: React.FC<{
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}> = ({ title, onBack, right }) => (
  <header className="flex items-center justify-between gap-3 mb-6">
    {onBack ? (
      <IconButton onClick={onBack} aria-label="Retour">
        <ChevronLeft className="w-6 h-6" strokeWidth={2.2} />
      </IconButton>
    ) : (
      <span className="w-11" />
    )}
    <h1 className="flex-1 text-center text-lg font-semibold tracking-tight truncate">{title}</h1>
    {right ?? <span className="w-11" />}
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
      'bg-white dark:bg-slate-900 rounded-[28px] border transition',
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
      'w-full h-14 rounded-full font-bold text-[15px] text-fmc-navy flex items-center justify-center gap-2.5 transition active:scale-[0.98] cursor-pointer',
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

/** Barre d'action collée en bas de l'écran (au-dessus de la barre d'accueil iPhone). */
export const StickyAction: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 px-5 pt-3 pb-[calc(1rem+var(--sab))] bg-linear-to-t from-fmc-bg via-fmc-bg/95 to-fmc-bg/0 dark:from-[#0B0F19] dark:via-[#0B0F19]/95">
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
    <h2 className={cx('text-lg font-semibold tracking-tight', accent ? 'text-fmc-green-ink' : '')}>{title}</h2>
    {action && (
      <button
        type="button"
        onClick={onAction}
        className="text-sm font-semibold text-fmc-green-ink hover:text-fmc-green-dark cursor-pointer"
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
      'h-11 px-4 rounded-2xl text-sm font-semibold shrink-0 flex items-center gap-2 transition cursor-pointer whitespace-nowrap',
      active
        ? 'bg-fmc-green text-white shadow-[0_6px_16px_rgba(0,214,100,0.25)]'
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

export const Rating: React.FC<{ value: number; className?: string }> = ({ value, className }) => (
  <span className={cx('inline-flex items-center gap-1 text-sm font-semibold tabular-nums', className)}>
    <Star className="w-4 h-4 fill-fmc-green text-fmc-green" />
    {value.toFixed(1)}
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
