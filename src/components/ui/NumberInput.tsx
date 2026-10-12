import React, { useEffect, useState } from 'react';

/**
 * Champ numérique qui se laisse vider pendant la saisie (pas de « 0 » collé devant le chiffre tapé).
 * Une valeur nulle s'affiche vide avec l'indication (placeholder).
 */
export const NumberInput: React.FC<
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
    value: number | null | undefined;
    onValueChange: (n: number) => void;
  }
> = ({ value, onValueChange, onBlur, ...rest }) => {
  const toText = (v: number | null | undefined) => (v === null || v === undefined || v === 0 || Number.isNaN(v) ? '' : String(v));
  const [text, setText] = useState(toText(value));
  // Valeur modifiée ailleurs (chargement de la fiche…)
  useEffect(() => {
    if (Number(text.replace(',', '.') || 0) !== (value ?? 0)) setText(toText(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        const t = e.target.value.replace(/[^0-9.,]/g, '');
        setText(t);
        const n = Number(t.replace(',', '.'));
        onValueChange(Number.isFinite(n) ? n : 0);
      }}
      onBlur={(e) => {
        setText(toText(value));
        onBlur?.(e);
      }}
    />
  );
};
