import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useCampaign } from '../../lib/campaign';

/** Bannière de la campagne en cours (Octobre Rose, Noël…), définie depuis l'admin. */
export const CampaignBanner: React.FC<{ className?: string }> = ({ className = '' }) => {
  const c = useCampaign();
  const key = c ? `fmc_campaign_hidden_${c.name ?? ''}_${c.title ?? ''}` : '';
  const [hidden, setHidden] = useState(() => {
    try { return !!key && localStorage.getItem(key) === '1'; } catch { return false; }
  });
  if (!c || hidden || (!c.title && !c.message && !c.imageUrl)) return null;
  const color = c.color || '#00D664';
  const open = () => { if (c.linkUrl) window.open(c.linkUrl, '_blank'); };
  return (
    <div
      className={`relative overflow-hidden rounded-3xl text-white ${c.linkUrl ? 'cursor-pointer' : ''} ${className}`}
      style={{ background: color }}
      onClick={open}
      role={c.linkUrl ? 'link' : undefined}
    >
      {c.imageUrl && (
        <img src={c.imageUrl} alt="" className="w-full max-h-48 object-cover" />
      )}
      {(c.title || c.message) && (
        <div className="p-4 pr-12">
          {c.title && <p className="text-lg font-bold leading-tight">{c.title}</p>}
          {c.message && <p className="text-sm mt-1 leading-snug text-white/90">{c.message}</p>}
        </div>
      )}
      <button
        type="button"
        aria-label="Masquer"
        onClick={(e) => {
          e.stopPropagation();
          try { localStorage.setItem(key, '1'); } catch { /* ignore */ }
          setHidden(true);
        }}
        className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/25 text-white flex items-center justify-center cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
