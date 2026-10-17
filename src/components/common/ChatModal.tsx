import React, { useState, useEffect, useRef } from 'react';
import { Avatar } from '../ui/Avatar';
import { useApp } from '../../context/AppContext';
import { ArrowUp, ChevronLeft, Flag, MoreHorizontal, UserX } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Sheet } from '../ui/fmc';
import { ReportSheet } from './ReportSheet';
import { blockUser, fetchMyBlocks, unblockUser } from '../../lib/moderation';
import { ChatPartner, ChatMessage } from '../../types';
import { supabase } from '../../lib/supabase';

interface MessageRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  text: string;
  read: boolean;
  created_at: string;
}

/** Message affiché : « sending » tant que le serveur n'a pas répondu, « failed » si l'envoi a échoué. */
type UiMessage = ChatMessage & { status?: 'sending' | 'failed' };

// Un, deux ou trois émojis seuls : affichés en grand, sans bulle (comme dans Messages)
const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}|[\u{1F3FB}-\u{1F3FF}])*\s*){1,3}$/u;

interface ChatModalProps {
  partner: ChatPartner | null;
  onClose: () => void;
}

const INITIAL_DEMO_MESSAGES: Record<string, ChatMessage[]> = {
  default: [
    {
      id: 'm1',
      senderId: 'partner',
      senderName: 'Coach',
      senderAvatar: '',
      recipientId: 'user',
      text: 'Bonjour Alex ! Avez-vous une question concernant notre prochaine séance ?',
      createdAt: '10:14',
      isRead: true
    },
    {
      id: 'm2',
      senderId: 'user',
      senderName: 'Alex',
      senderAvatar: '',
      recipientId: 'partner',
      text: 'Bonjour ! Oui, dois-je apporter des élastiques ou vous avez tout le nécessaire ?',
      createdAt: '10:18',
      isRead: true
    },
    {
      id: 'm3',
      senderId: 'partner',
      senderName: 'Coach',
      senderAvatar: '',
      recipientId: 'user',
      text: 'J’apporte tout le matériel professionnel (élastiques, kettlebells, tapis). Prévoyez juste votre tenue et une bouteille d’eau ! 💪',
      createdAt: '10:20',
      isRead: true
    }
  ]
};

export const ChatModal: React.FC<ChatModalProps> = ({ partner, onClose }) => {
  const { currentUser, navigateTo, isOnline } = useApp();
  const partnerUserId = partner?.userId || partner?.id || '';
  // Messagerie réelle si connecté à Supabase et que l'interlocuteur a un compte
  const isRealAccountId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(partnerUserId);
  const live = isOnline && !!supabase && !!currentUser && isRealAccountId;
  // En ligne, un profil de démonstration n'a pas de vrai compte : pas de messagerie simulée
  const unavailable = isOnline && !live;
  const [loadError, setLoadError] = useState('');
  // Signaler / bloquer (règle 1.2 d'Apple)
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    if (!live) return;
    fetchMyBlocks().then((ids) => setBlocked(ids.includes(partnerUserId)));
  }, [live, partnerUserId]);
  const toggleBlock = async () => {
    if (!currentUser) return;
    try {
      if (blocked) await unblockUser(currentUser.id, partnerUserId);
      else await blockUser(currentUser.id, partnerUserId);
      setBlocked(!blocked);
    } catch (e) {
      setSendError((e as Error).message);
    }
    setMenuOpen(false);
  };

  const [messages, setMessages] = useState<UiMessage[]>(() => {
    if (live || (isOnline && !!supabase)) return [];
    const key = `fmc_chat_${partner?.id || 'default'}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : INITIAL_DEMO_MESSAGES.default;
  });
  const [inputText, setInputText] = useState('');
  const [sendError, setSendError] = useState('');
  const [partnerTyping, setPartnerTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const firstScroll = useRef(true);
  const typingChannel = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null);
  const lastTypingSent = useRef(0);

  // Toujours en bas : sans animation à l'ouverture, en douceur ensuite
  useEffect(() => {
    if (!messages.length && !partnerTyping) return;
    messagesEndRef.current?.scrollIntoView({ behavior: firstScroll.current ? 'auto' : 'smooth' });
    firstScroll.current = false;
  }, [messages, partnerTyping]);

  // Mode démo : historique local
  useEffect(() => {
    if (partner && !live) {
      const key = `fmc_chat_${partner.id}`;
      localStorage.setItem(key, JSON.stringify(messages.filter((m) => !m.status)));
    }
  }, [messages, partner, live]);

  // Mode en ligne : chargement + temps réel
  useEffect(() => {
    if (!live || !supabase || !currentUser) return;
    const me = currentUser.id;
    const toMsg = (r: MessageRow): ChatMessage => ({
      id: r.id,
      senderId: r.sender_id,
      senderName: r.sender_id === me ? currentUser.name : partner?.name || '',
      senderAvatar: r.sender_id === me ? currentUser.avatar : partner?.avatar || '',
      recipientId: r.recipient_id,
      text: r.text,
      createdAt: r.created_at,
      isRead: r.read,
    });

    supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${me},recipient_id.eq.${partnerUserId}),and(sender_id.eq.${partnerUserId},recipient_id.eq.${me})`)
      .order('created_at', { ascending: true })
      .limit(200)
      .then(({ data, error }) => {
        if (error) {
          setLoadError('Impossible de charger la conversation. Vérifiez votre connexion puis rouvrez-la.');
          return;
        }
        setLoadError('');
        // On garde les messages en cours d'envoi tapés pendant le chargement
        setMessages((prev) => [...((data || []) as MessageRow[]).map(toMsg), ...prev.filter((m) => m.status)]);
        supabase!.from('messages').update({ read: true }).eq('recipient_id', me).eq('sender_id', partnerUserId).eq('read', false).then(() => {});
      });

    const channel = supabase
      .channel(`chat-${me}-${partnerUserId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${me}` }, (payload) => {
        const row = payload.new as MessageRow;
        if (row.sender_id !== partnerUserId) return;
        setPartnerTyping(false);
        setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, toMsg(row)]));
        // Conversation ouverte : le message est lu tout de suite
        supabase!.from('messages').update({ read: true }).eq('id', row.id).then(() => {});
      })
      // « Lu » en direct quand l'autre personne ouvre la conversation
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `sender_id=eq.${me}` }, (payload) => {
        const row = payload.new as MessageRow;
        if (row.recipient_id !== partnerUserId || !row.read) return;
        setMessages((prev) => prev.map((m) => (m.id === row.id ? { ...m, isRead: true } : m)));
      })
      .subscribe();

    // « En train d'écrire… » : simple signal entre les deux téléphones, rien n'est enregistré
    let typingTimer: ReturnType<typeof setTimeout> | undefined;
    const typing = supabase
      .channel(`typing-${[me, partnerUserId].sort().join('-')}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload?.from !== partnerUserId) return;
        setPartnerTyping(true);
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => setPartnerTyping(false), 4000);
      })
      .subscribe();
    typingChannel.current = typing;
    return () => {
      clearTimeout(typingTimer);
      typingChannel.current = null;
      supabase?.removeChannel(channel);
      supabase?.removeChannel(typing);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, partnerUserId, currentUser?.id]);

  if (!partner) return null;

  const notifyTyping = () => {
    if (!typingChannel.current || !currentUser || Date.now() - lastTypingSent.current < 2000) return;
    lastTypingSent.current = Date.now();
    typingChannel.current.send({ type: 'broadcast', event: 'typing', payload: { from: currentUser.id } }).catch(() => {});
  };

  // Envoi en ligne : le message apparaît tout de suite, puis passe à « Envoyé » (ou « Non envoyé », à toucher pour réessayer)
  const deliver = async (tempId: string, text: string) => {
    if (!supabase || !currentUser) return;
    const { data, error } = await supabase
      .from('messages')
      .insert({ sender_id: currentUser.id, recipient_id: partnerUserId, text })
      .select()
      .single();
    if (error || !data) {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m)));
      // Propos injurieux (filtre du serveur) ou conversation bloquée par l'un des deux
      if (error?.message?.includes('injurieux')) setSendError(error.message);
      else if (error?.code === '42501' || /row-level security/i.test(error?.message ?? '')) setSendError('Message non distribué : vous ne pouvez plus écrire à cette personne.');
      return;
    }
    const row = data as MessageRow;
    setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, id: row.id, createdAt: row.created_at, status: undefined } : m)));
  };
  const retry = (m: UiMessage) => {
    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, status: 'sending' } : x)));
    deliver(m.id, m.text);
  };

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;
    setSendError('');
    if (unavailable) {
      setSendError('Messagerie indisponible avec ce profil.');
      return;
    }
    if (!textToSend) {
      setInputText('');
      if (inputRef.current) inputRef.current.style.height = 'auto';
    }

    if (live && supabase && currentUser) {
      const tempId = `tmp-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: tempId,
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderAvatar: currentUser.avatar,
          recipientId: partnerUserId,
          text: text.trim(),
          createdAt: new Date().toISOString(),
          isRead: false,
          status: 'sending',
        },
      ]);
      deliver(tempId, text.trim());
      return;
    }

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: currentUser?.id || 'user',
      senderName: currentUser?.name || 'Moi',
      senderAvatar: currentUser?.avatar || '',
      recipientId: partner.id,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      isRead: true
    };

    setMessages((prev) => [...prev, newMsg]);

    // Mode démo : réponse simulée du coach
    setTimeout(() => {
      const replies = [
        'Parfait, c’est bien noté ! À très vite.',
        'Super, je prépare notre plan d’entraînement adapté.',
        'Bien reçu ! N’hésite pas si tu as la moindre question avant notre rendez-vous.',
        'Entendu, hâte de démarrer la séance avec toi ! 🚀'
      ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      const botMsg: ChatMessage = {
        id: `msg-reply-${Date.now()}`,
        senderId: partner.id,
        senderName: partner.name,
        senderAvatar: partner.avatar,
        recipientId: currentUser?.id || 'user',
        text: randomReply,
        createdAt: new Date().toISOString(),
        isRead: true
      };
      setMessages((prev) => [...prev, botMsg]);
    }, 1200);
  };

  const timeOf = (v: string) => {
    const t = Date.parse(v);
    return Number.isNaN(t) ? v : new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };
  const dayOf = (v: string) => {
    const t = Date.parse(v);
    if (Number.isNaN(t)) return '';
    const d = new Date(t);
    const today = new Date();
    const yesterday = new Date(Date.now() - 86_400_000);
    if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
    if (d.toDateString() === yesterday.toDateString()) return 'Hier';
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  };
  const myId = currentUser?.id || 'user';
  const isMine = (m: UiMessage) => m.senderId === myId || m.senderId === 'user';
  const lastMineIndex = messages.reduce((acc, m, i) => (isMine(m) ? i : acc), -1);
  const statusOf = (m: UiMessage) => (m.status === 'sending' ? 'Envoi…' : m.isRead ? 'Lu' : 'Envoyé');

  return (
    <motion.div
      id="apple-chat-modal"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 34, stiffness: 340 }}
      className="fixed inset-0 z-50 bg-fmc-bg dark:bg-[#0B0F19] text-fmc-navy dark:text-slate-100 flex flex-col max-w-md mx-auto overflow-hidden"
    >
      {/* En-tête simple : retour, photo, nom */}
      <header className="flex items-center gap-3 px-3 pt-[calc(0.75rem+var(--sat,0px))] pb-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/70 dark:border-slate-800">
        <button
          id="btn-close-chat"
          onClick={onClose}
          aria-label="Retour aux messages"
          className="w-11 h-11 -ml-1 rounded-full flex items-center justify-center text-fmc-navy dark:text-slate-100 cursor-pointer active:scale-95"
        >
          <ChevronLeft className="w-7 h-7" />
        </button>
        <Avatar src={partner.avatar} name={partner.name} className="w-10 h-10 rounded-full" />
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-tight truncate">{partner.name}</h2>
          <p className="text-xs text-slate-500 truncate" aria-live="polite">{partnerTyping ? 'En train d’écrire…' : partner.title}</p>
        </div>
        {live && (
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Signaler ou bloquer"
            className="ml-auto w-11 h-11 rounded-full flex items-center justify-center text-fmc-navy dark:text-slate-100 cursor-pointer active:scale-95"
          >
            <MoreHorizontal className="w-6 h-6" />
          </button>
        )}
      </header>

      {/* Fil de la conversation */}
      <div className="flex-1 overflow-y-auto px-4 py-4 no-scrollbar">
        {unavailable && (
          <p className="text-center text-sm text-slate-500 px-4 py-10">
            Ce profil est un exemple de démonstration : la messagerie n'est pas disponible.
          </p>
        )}
        {loadError && <p className="text-center text-sm text-rose-600 px-4 py-4">{loadError}</p>}
        {live && !loadError && messages.length === 0 && (
          <div className="text-center px-6 py-14">
            <Avatar src={partner.avatar} name={partner.name} className="w-16 h-16 rounded-full mx-auto" />
            <p className="font-semibold mt-3">{partner.name}</p>
            <p className="text-sm text-slate-500 mt-1">Écrivez votre premier message : il recevra une notification.</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const mine = isMine(msg);
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const day = dayOf(msg.createdAt);
          const newDay = day && (!prev || dayOf(prev.createdAt) !== day);
          const grouped = !newDay && prev && isMine(prev) === mine;
          const lastOfGroup = !next || isMine(next) !== mine || dayOf(next.createdAt) !== day;
          const emojiOnly = EMOJI_ONLY.test(msg.text.trim());
          const failed = msg.status === 'failed';
          return (
            <React.Fragment key={msg.id}>
              {newDay && (
                <p className="text-center text-xs text-slate-400 font-medium my-4 first:mt-0">{day}</p>
              )}
              <div className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'} ${grouped ? 'mt-0.5' : 'mt-3'}`}>
                {/* Photo de l'interlocuteur au bas de chaque série de messages */}
                {!mine && (lastOfGroup
                  ? <Avatar src={partner.avatar} name={partner.name} className="w-7 h-7 rounded-full shrink-0" />
                  : <span className="w-7 shrink-0" aria-hidden="true" />)}
                <div
                  onClick={failed ? () => retry(msg) : undefined}
                  role={failed ? 'button' : undefined}
                  className={`max-w-[75%] whitespace-pre-wrap break-words ${
                    emojiOnly
                      ? 'text-5xl leading-tight py-1'
                      : `px-3.5 py-2 text-base leading-snug rounded-[20px] ${
                          mine
                            ? `bg-fmc-green text-fmc-navy ${lastOfGroup ? 'rounded-br-md' : ''}`
                            : `bg-white dark:bg-slate-800 text-fmc-navy dark:text-slate-100 ${lastOfGroup ? 'rounded-bl-md' : ''}`
                        }`
                  } ${msg.status === 'sending' ? 'opacity-60' : ''} ${failed ? 'opacity-60 cursor-pointer' : ''}`}
                >
                  {msg.text}
                </div>
              </div>
              {failed ? (
                <button type="button" onClick={() => retry(msg)} className="block ml-auto text-xs font-medium text-rose-600 mt-1 px-1 py-2 cursor-pointer">
                  Non envoyé · Toucher pour réessayer
                </button>
              ) : lastOfGroup && (
                <p className={`text-[11px] text-slate-400 mt-1 tabular-nums ${mine ? 'text-right px-1' : 'pl-10'}`}>
                  {timeOf(msg.createdAt)}
                  {mine && i === lastMineIndex && live ? ` · ${statusOf(msg)}` : ''}
                </p>
              )}
            </React.Fragment>
          );
        })}
        {partnerTyping && (
          <div className="flex items-end gap-2 mt-3" aria-hidden="true">
            <Avatar src={partner.avatar} name={partner.name} className="w-7 h-7 rounded-full shrink-0" />
            <div className="px-4 py-3.5 rounded-[20px] rounded-bl-md bg-white dark:bg-slate-800 flex gap-1">
              {[0, 1, 2].map((d) => (
                <span key={d} className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${d * 150}ms` }} />
              ))}
            </div>
          </div>
        )}
        {sendError && <p className="text-center text-xs font-medium text-rose-500 mt-3">{sendError}</p>}
        <div ref={messagesEndRef} />
      </div>

      {blocked && (
        <div className="px-4 py-3 bg-rose-50 dark:bg-rose-500/10 text-sm text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3">
          <span>Vous avez bloqué {partner.name.split(' ')[0]}. Vous ne recevez plus ses messages.</span>
          <button type="button" onClick={toggleBlock} className="min-h-11 px-2 font-bold underline cursor-pointer shrink-0">Débloquer</button>
        </div>
      )}

      {/* Zone de saisie */}
      <div className="px-3 pt-2 pb-[calc(0.75rem+var(--sab,0px))] bg-white/95 dark:bg-slate-900/95 border-t border-slate-200/70 dark:border-slate-800 flex items-end gap-2">
        <textarea
          ref={inputRef}
          rows={1}
          value={inputText}
          enterKeyHint="send"
          onChange={(e) => {
            setInputText(e.target.value);
            notifyTyping();
            e.target.style.height = 'auto';
            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={blocked ? 'Conversation bloquée' : 'Message'}
          disabled={blocked}
          aria-label="Votre message"
          className="flex-1 resize-none bg-slate-100 dark:bg-slate-800 rounded-[22px] px-4 py-2.5 text-base leading-snug placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-fmc-green/40 max-h-[120px]"
        />
        <button
          onMouseDown={(e) => e.preventDefault() /* garde le clavier ouvert */}
          onClick={() => { handleSend(); inputRef.current?.focus(); }}
          disabled={!inputText.trim()}
          aria-label="Envoyer"
          className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center bg-fmc-green text-fmc-navy disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 transition active:scale-90 cursor-pointer disabled:cursor-not-allowed"
        >
          <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <Sheet onClose={() => setMenuOpen(false)} label="Options de la conversation">
            <div className="space-y-2 pb-2">
              <button
                type="button"
                onClick={() => { setMenuOpen(false); setReportOpen(true); }}
                className="apple-press w-full min-h-14 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800 text-left font-semibold flex items-center gap-3 cursor-pointer"
              >
                <Flag className="w-5 h-5 text-rose-600" /> Signaler la conversation
              </button>
              <button
                type="button"
                onClick={toggleBlock}
                className="apple-press w-full min-h-14 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800 text-left font-semibold text-rose-600 flex items-center gap-3 cursor-pointer"
              >
                <UserX className="w-5 h-5" /> {blocked ? `Débloquer ${partner.name.split(' ')[0]}` : `Bloquer ${partner.name.split(' ')[0]}`}
              </button>
              {!blocked && (
                <p className="text-xs text-slate-500 px-1 pt-1">
                  Une personne bloquée ne peut plus vous écrire ni réserver avec vous. Elle n’est pas prévenue.
                </p>
              )}
            </div>
          </Sheet>
        )}
        {reportOpen && (
          <ReportSheet
            type="conversation"
            targetId={partnerUserId}
            subject="cette conversation"
            onClose={() => setReportOpen(false)}
            afterAction={blocked ? undefined : { label: `Bloquer aussi ${partner.name.split(' ')[0]}`, run: toggleBlock }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
