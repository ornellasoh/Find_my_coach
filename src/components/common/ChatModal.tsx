import React, { useState, useEffect, useRef } from 'react';
import { Avatar } from '../ui/Avatar';
import { useApp } from '../../context/AppContext';
import { ChevronLeft, Send } from 'lucide-react';
import { motion } from 'motion/react';
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

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (live || (isOnline && !!supabase)) return [];
    const key = `fmc_chat_${partner?.id || 'default'}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : INITIAL_DEMO_MESSAGES.default;
  });
  const [inputText, setInputText] = useState('');
  const [sendError, setSendError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mode démo : historique local
  useEffect(() => {
    if (partner && !live) {
      const key = `fmc_chat_${partner.id}`;
      localStorage.setItem(key, JSON.stringify(messages));
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
        setMessages(((data || []) as MessageRow[]).map(toMsg));
        supabase!.from('messages').update({ read: true }).eq('recipient_id', me).eq('sender_id', partnerUserId).eq('read', false).then(() => {});
      });

    const channel = supabase
      .channel(`chat-${me}-${partnerUserId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${me}` }, (payload) => {
        const row = payload.new as MessageRow;
        if (row.sender_id !== partnerUserId) return;
        setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, toMsg(row)]));
        // Conversation ouverte : le message est lu tout de suite
        supabase!.from('messages').update({ read: true }).eq('id', row.id).then(() => {});
      })
      .subscribe();
    return () => {
      supabase?.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, partnerUserId, currentUser?.id]);

  if (!partner) return null;

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;
    setSendError('');
    if (unavailable) {
      setSendError('Messagerie indisponible avec ce profil.');
      return;
    }

    if (live && supabase && currentUser) {
      if (!textToSend) setInputText('');
      const { data, error } = await supabase
        .from('messages')
        .insert({ sender_id: currentUser.id, recipient_id: partnerUserId, text: text.trim() })
        .select()
        .single();
      if (error) {
        setSendError("Message non envoyé. Vérifiez votre connexion.");
        return;
      }
      const row = data as MessageRow;
      setMessages((prev) => [
        ...prev,
        {
          id: row.id,
          senderId: row.sender_id,
          senderName: currentUser.name,
          senderAvatar: currentUser.avatar,
          recipientId: row.recipient_id,
          text: row.text,
          createdAt: row.created_at,
          isRead: false,
        },
      ]);
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
    if (!textToSend) setInputText('');

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
  const isMine = (m: ChatMessage) => m.senderId === myId || m.senderId === 'user';
  const lastMineIndex = messages.reduce((acc, m, i) => (isMine(m) ? i : acc), -1);

  return (
    <motion.div
      id="apple-chat-modal"
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 320 }}
      className="fixed inset-0 z-50 bg-fmc-bg dark:bg-[#0B0F19] text-fmc-navy dark:text-slate-100 flex flex-col max-w-md mx-auto overflow-hidden"
    >
      {/* En-tête simple : retour, photo, nom */}
      <header className="flex items-center gap-3 px-3 pt-[calc(0.75rem+var(--sat,0px))] pb-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/70 dark:border-slate-800">
        <button
          id="btn-close-chat"
          onClick={onClose}
          aria-label="Fermer la conversation"
          className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center text-fmc-navy dark:text-slate-100 cursor-pointer active:scale-95"
        >
          <ChevronLeft className="w-7 h-7" />
        </button>
        <Avatar src={partner.avatar} name={partner.name} className="w-10 h-10 rounded-full" />
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-tight truncate">{partner.name}</h2>
          {partner.title && <p className="text-xs text-slate-500 truncate">{partner.title}</p>}
        </div>
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
          const day = dayOf(msg.createdAt);
          const newDay = day && (!prev || dayOf(prev.createdAt) !== day);
          const grouped = !newDay && prev && isMine(prev) === mine;
          return (
            <React.Fragment key={msg.id}>
              {newDay && (
                <p className="text-center text-xs text-slate-400 font-medium my-4 first:mt-0">{day}</p>
              )}
              <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'} ${grouped ? 'mt-1' : 'mt-3'}`}>
                <div
                  className={`max-w-[78%] px-3.5 py-2 text-[15px] leading-snug whitespace-pre-wrap break-words rounded-[20px] ${
                    mine
                      ? 'bg-fmc-green text-fmc-navy rounded-br-md'
                      : 'bg-white dark:bg-slate-800 text-fmc-navy dark:text-slate-100 rounded-bl-md'
                  }`}
                >
                  {msg.text}
                </div>
                {(i === messages.length - 1 || !messages[i + 1] || isMine(messages[i + 1]) !== mine) && (
                  <span className="text-[11px] text-slate-400 mt-1 px-1 tabular-nums">
                    {timeOf(msg.createdAt)}
                    {mine && i === lastMineIndex && live ? (msg.isRead ? ' · Lu' : ' · Envoyé') : ''}
                  </span>
                )}
              </div>
            </React.Fragment>
          );
        })}
        {sendError && <p className="text-center text-xs font-medium text-rose-500 mt-3">{sendError}</p>}
        <div ref={messagesEndRef} />
      </div>

      {/* Zone de saisie */}
      <div className="px-3 pt-2 pb-[calc(0.75rem+var(--sab,0px))] bg-white/95 dark:bg-slate-900/95 border-t border-slate-200/70 dark:border-slate-800 flex items-end gap-2">
        <textarea
          rows={1}
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Message"
          aria-label="Votre message"
          className="flex-1 resize-none bg-slate-100 dark:bg-slate-800 rounded-[22px] px-4 py-2.5 text-base leading-snug placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-fmc-green/40 max-h-[120px]"
        />
        <button
          onClick={() => handleSend()}
          disabled={!inputText.trim()}
          aria-label="Envoyer"
          className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center bg-fmc-green text-fmc-navy disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 transition active:scale-90 cursor-pointer disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
};
