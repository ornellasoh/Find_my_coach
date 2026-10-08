import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  Send, 
  CheckCheck, 
  Sparkles, 
  Paperclip, 
  Smile, 
  Phone, 
  Video, 
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { motion } from 'motion/react';
import { ChatPartner, ChatMessage } from '../../types';

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

const QUICK_SUGGESTIONS = [
  'Je serai ponctuel(le) ! ⏱️',
  'Avez-vous des conseils de repas pré-séance ? 🥗',
  'Merci pour le super coaching ! ⭐',
  'Je confirme l’adresse à domicile 🏠'
];

export const ChatModal: React.FC<ChatModalProps> = ({ partner, onClose }) => {
  const { currentUser, navigateTo } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const key = `fmc_chat_${partner?.id || 'default'}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : INITIAL_DEMO_MESSAGES.default;
  });
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (partner) {
      const key = `fmc_chat_${partner.id}`;
      localStorage.setItem(key, JSON.stringify(messages));
    }
  }, [messages, partner]);

  if (!partner) return null;

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: currentUser?.id || 'user',
      senderName: currentUser?.name || 'Moi',
      senderAvatar: currentUser?.avatar || '',
      recipientId: partner.id,
      text: text.trim(),
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isRead: true
    };

    setMessages((prev) => [...prev, newMsg]);
    if (!textToSend) setInputText('');

    // Simulated coach smart response after 1.2 seconds
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
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isRead: true
      };
      setMessages((prev) => [...prev, botMsg]);
    }, 1200);
  };

  return (
    <motion.div
      id="apple-chat-modal"
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="fixed inset-0 z-50 bg-[#F2F4F7] flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden"
    >
      {/* Top Header */}
      <div className="bg-white/90 backdrop-blur-xl border-b border-slate-200/80 px-4 py-3 flex items-center justify-between z-10 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={partner.avatar}
              alt={partner.name}
              className="w-10 h-10 rounded-full object-cover border border-slate-200"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#00D664] border-2 border-white rounded-full" />
          </div>

          <div>
            <div className="flex items-center gap-1">
              <h2 className="text-sm font-extrabold text-[#0F172A] leading-tight">
                {partner.name}
              </h2>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#008A3E]" />
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              {partner.title || 'En ligne actuellement'}
            </p>
          </div>
        </div>

        <button
          id="btn-close-chat"
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 no-scrollbar">
        <div className="flex justify-center my-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-200/60 px-3 py-0.5 rounded-full">
            Aujourd'hui
          </span>
        </div>

        {messages.map((msg) => {
          const isMe = msg.senderId === (currentUser?.id || 'user') || msg.senderId === 'user';
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                  isMe
                    ? 'bg-[#00D664] text-[#0F172A] font-semibold rounded-br-xs shadow-xs'
                    : 'bg-white text-slate-800 font-normal rounded-bl-xs border border-slate-200 shadow-xs'
                }`}
              >
                {msg.text}
              </div>

              <div className="flex items-center gap-1 mt-0.5 px-1 text-[10px] text-slate-400">
                <span>{msg.createdAt}</span>
                {isMe && <CheckCheck className="w-3 h-3 text-[#008A3E]" />}
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions Carousel */}
      <div className="bg-white/60 backdrop-blur-md px-3 py-2 border-t border-slate-200/60 overflow-x-auto no-scrollbar flex items-center gap-1.5">
        {QUICK_SUGGESTIONS.map((sug, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(sug)}
            className="px-3 py-1.5 bg-white text-slate-700 text-[11px] font-semibold rounded-full border border-slate-200 shadow-2xs hover:border-[#00D664] hover:text-[#008A3E] transition shrink-0 cursor-pointer active:scale-95"
          >
            {sug}
          </button>
        ))}
      </div>

      {/* Input Message Bar */}
      <div className="bg-white px-3 py-3 border-t border-slate-200 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Envoyer un message..."
          className="flex-1 bg-slate-100 border border-slate-200 rounded-full px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#00D664] focus:bg-white transition"
        />

        <button
          onClick={() => handleSend()}
          disabled={!inputText.trim()}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer ${
            inputText.trim()
              ? 'bg-[#00D664] text-[#0F172A] shadow-xs active:scale-90 hover:bg-[#00B050]'
              : 'bg-slate-100 text-slate-300 cursor-not-allowed'
          }`}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};
