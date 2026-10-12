import React, { useCallback, useEffect, useState } from 'react';
import { MessageSquare, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { Avatar } from '../ui/Avatar';
import { Card, Screen, ScreenHeader } from '../ui/fmc';

interface Conversation {
  partner_id: string;
  partner_name: string;
  partner_avatar: string | null;
  partner_role: string | null;
  last_text: string;
  last_at: string;
  last_from_me: boolean;
  unread: number;
}

const when = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const diffDays = (now.getTime() - d.getTime()) / 86_400_000;
  if (diffDays < 7) return d.toLocaleDateString('fr-FR', { weekday: 'short' });
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
};

/** Boîte de réception : toutes les conversations du compte, directement dans l'app. */
export const MessagesInbox: React.FC = () => {
  const { currentUser, isOnline, setActiveChatPartner, activeChatPartner, goBack, navigateTo } = useApp();
  const [items, setItems] = useState<Conversation[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!isOnline || !supabase || !currentUser) {
      setItems([]);
      return;
    }
    setError('');
    const { data, error: err } = await supabase.rpc('my_conversations');
    if (err) {
      setError('Impossible de charger vos messages. Vérifiez votre connexion.');
      return;
    }
    setItems((data || []) as Conversation[]);
  }, [isOnline, currentUser?.id]);

  // Chargement, puis à la fermeture d'une conversation (messages lus) et à chaque nouveau message
  useEffect(() => {
    if (!activeChatPartner) load();
  }, [load, activeChatPartner]);
  useEffect(() => {
    if (!isOnline || !supabase || !currentUser) return;
    const ch = supabase
      .channel(`inbox-${currentUser.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${currentUser.id}` }, () => load())
      .subscribe();
    return () => {
      supabase?.removeChannel(ch);
    };
  }, [isOnline, currentUser?.id, load]);

  const open = (c: Conversation) =>
    setActiveChatPartner({
      id: c.partner_id,
      userId: c.partner_id,
      name: c.partner_name,
      avatar: c.partner_avatar || '',
      role: c.partner_role || 'client',
      title: c.partner_role === 'coach' ? 'Coach' : 'Client',
    });

  return (
    <Screen>
      <ScreenHeader title="Messages" onBack={goBack} right={
        <button type="button" onClick={load} aria-label="Actualiser" className="w-11 h-11 flex items-center justify-center text-slate-500 cursor-pointer">
          <RefreshCw className="w-5 h-5" />
        </button>
      } />

      {error && (
        <Card className="p-4 mb-4 text-sm text-rose-600" role="alert">
          {error}{' '}
          <button type="button" onClick={load} className="underline font-semibold cursor-pointer">Réessayer</button>
        </Card>
      )}

      {items === null && !error && <p className="text-sm text-slate-500 text-center py-10">Chargement…</p>}

      {items && items.length === 0 && !error && (
        <div className="text-center py-14 px-6">
          <span className="w-16 h-16 mx-auto rounded-full bg-fmc-green/15 text-fmc-green-ink dark:text-fmc-green flex items-center justify-center">
            <MessageSquare className="w-7 h-7" />
          </span>
          <p className="font-semibold mt-4">Aucune conversation pour l'instant</p>
          <p className="text-sm text-slate-500 mt-1">
            {currentUser?.role === 'coach'
              ? 'Les messages de vos clients apparaîtront ici.'
              : 'Écrivez à un coach depuis sa fiche : la conversation apparaîtra ici.'}
          </p>
          {currentUser?.role !== 'coach' && (
            <button type="button" onClick={() => navigateTo('search')} className="mt-5 h-11 px-5 rounded-full bg-fmc-green text-fmc-navy font-semibold text-sm cursor-pointer">
              Trouver un coach
            </button>
          )}
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="space-y-2.5">
          {items.map((c) => (
            <li key={c.partner_id}>
              <Card onClick={() => open(c)} className="p-3.5 flex items-center gap-3 cursor-pointer active:scale-[0.99]">
                <Avatar src={c.partner_avatar} name={c.partner_name} className="w-12 h-12 rounded-full" />
                <span className="flex-1 min-w-0">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={`truncate ${c.unread ? 'font-bold' : 'font-semibold'}`}>{c.partner_name}</span>
                    <span className="text-xs text-slate-500 shrink-0 tabular-nums">{when(c.last_at)}</span>
                  </span>
                  <span className="flex items-center justify-between gap-2 mt-0.5">
                    <span className={`text-sm truncate ${c.unread ? 'text-fmc-navy dark:text-slate-100 font-medium' : 'text-slate-500'}`}>
                      {c.last_from_me ? 'Vous : ' : ''}{c.last_text}
                    </span>
                    {c.unread > 0 && (
                      <span className="min-w-5 h-5 px-1.5 rounded-full bg-fmc-green text-fmc-navy text-[11px] font-bold flex items-center justify-center tabular-nums shrink-0">
                        {c.unread}
                      </span>
                    )}
                  </span>
                </span>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
};
