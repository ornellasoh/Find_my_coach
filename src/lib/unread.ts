import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

/**
 * Nombre de messages reçus et pas encore lus par le compte connecté (pastille de l'onglet Messages).
 * Mis à jour en direct : nouveau message reçu, ou conversation ouverte (messages marqués lus).
 */
export function useUnreadMessages(userId?: string | null): number {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    if (!supabase || !userId) {
      setCount(0);
      return;
    }
    const { count: n, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('read', false);
    if (!error) setCount(n ?? 0);
  }, [userId]);

  useEffect(() => {
    load();
    if (!supabase || !userId) return;
    const ch = supabase
      .channel(`unread-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `recipient_id=eq.${userId}` }, () => load())
      .subscribe();
    return () => {
      supabase?.removeChannel(ch);
    };
  }, [userId, load]);

  return count;
}
