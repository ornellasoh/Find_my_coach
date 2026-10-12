import { isSupabaseEnabled } from './supabase';

/**
 * Agent IA du coach : nécessite le serveur IA (server.ts) accessible via VITE_API_URL.
 * Sans serveur, l'écran produisait des réponses « de secours » simulées : il est donc masqué
 * dans l'app connectée tant que le serveur n'est pas déployé. Toujours visible en mode démo.
 */
export const AI_AGENT_ENABLED = !isSupabaseEnabled || !!(import.meta.env.VITE_API_URL as string | undefined);
