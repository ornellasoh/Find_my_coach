import React from 'react';
import { Moon, Smartphone, Sun } from 'lucide-react';
import { useApp, type ThemeMode } from '../../context/AppContext';

const OPTIONS: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Clair', icon: <Sun className="w-4 h-4" /> },
  { value: 'dark', label: 'Sombre', icon: <Moon className="w-4 h-4" /> },
  { value: 'system', label: 'Auto', icon: <Smartphone className="w-4 h-4" /> },
];

/** Choix de l'apparence : clair, sombre ou automatique (comme le téléphone). */
export const ThemePicker: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { themeMode, setThemeMode } = useApp();
  return (
    <div className={`rounded-3xl bg-white dark:bg-[#151B27] border border-slate-200 dark:border-slate-700/60 p-4 ${className}`}>
      <div className="flex items-baseline justify-between mb-3">
        <span className="font-semibold text-[#0F172A] dark:text-slate-100">Apparence</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {themeMode === 'system' ? 'Suit le réglage du téléphone' : themeMode === 'dark' ? 'Mode sombre' : 'Mode clair'}
        </span>
      </div>
      <div role="radiogroup" aria-label="Apparence" className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-[#0B0F19]">
        {OPTIONS.map((o) => {
          const active = themeMode === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              id={`theme-${o.value}`}
              onClick={() => setThemeMode(o.value)}
              className={`h-11 rounded-xl flex items-center justify-center gap-1.5 text-sm font-semibold transition cursor-pointer ${
                active
                  ? 'bg-white dark:bg-[#263042] text-[#0F172A] dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {o.icon}
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
