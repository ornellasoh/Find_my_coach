import React from 'react';

interface LogoIconProps {
  size?: number | string;
  className?: string;
  variant?: 'light' | 'dark' | 'mono-black' | 'mono-white';
}

/**
 * Find My Coach — Symbole officiel (fichier fourni par la charte, jamais redessiné).
 * Source : public/logo-symbol.png
 */
export const LogoIcon: React.FC<LogoIconProps> = ({
  size = 36,
  className = '',
  variant = 'light',
}) => {
  const mono = variant === 'mono-black' ? 'brightness-0' : variant === 'mono-white' ? 'brightness-0 invert' : '';
  return (
    <img
      src={`${import.meta.env.BASE_URL}logo-symbol.png`}
      alt="Find My Coach"
      draggable={false}
      style={{ height: size, width: 'auto' }}
      className={`inline-block shrink-0 select-none ${mono} ${className}`}
    />
  );
};

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  variant?: 'light' | 'dark' | 'green' | 'mono-black' | 'mono-white';
  className?: string;
  onClick?: () => void;
}

/**
 * Logotype complet Find My Coach avec titre "Find My Coach" et slogan officiel "Your Coach Anytime, Anywhere"
 */
export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showTagline = true,
  variant = 'light',
  className = '',
  onClick,
}) => {
  const iconSizes = {
    xs: 24,
    sm: 30,
    md: 38,
    lg: 48,
    xl: 60,
  };

  const titleSizes = {
    xs: 'text-sm',
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  const taglineSizes = {
    xs: 'text-[9px]',
    sm: 'text-[10px]',
    md: 'text-[11px]',
    lg: 'text-xs',
    xl: 'text-sm',
  };

  const isDark = variant === 'dark' || variant === 'green';

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <LogoIcon
        size={iconSizes[size]}
        variant={variant === 'dark' ? 'dark' : variant === 'green' ? 'dark' : 'light'}
      />

      <div className="flex flex-col justify-center">
        <span
          className={`font-black tracking-tight leading-tight font-sans ${titleSizes[size]} ${
            isDark ? 'text-white' : 'text-[#1D1D1D] dark:text-white'
          }`}
          style={{ letterSpacing: '-0.03em' }}
        >
          Find My Coach
        </span>

        {showTagline && (
          <span
            className={`font-medium tracking-normal leading-none mt-0.5 font-sans ${taglineSizes[size]} ${
              isDark ? 'text-slate-200' : 'text-[#565656] dark:text-slate-400'
            }`}
          >
            Your Coach Anytime, Anywhere
          </span>
        )}
      </div>
    </div>
  );
};
