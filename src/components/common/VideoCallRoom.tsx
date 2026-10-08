import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  MessageSquare, 
  FileText, 
  Sparkles, 
  Clock, 
  ShieldCheck, 
  Maximize2, 
  Minimize2,
  CheckCircle2,
  Share2,
  Volume2,
  Settings,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Booking } from '../../types';

interface VideoCallRoomProps {
  booking: Booking | null;
  onClose: () => void;
}

export const VideoCallRoom: React.FC<VideoCallRoomProps> = ({ booking, onClose }) => {
  const { currentUser } = useApp();
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [showNotes, setShowNotes] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ id: string; sender: string; text: string; time: string }[]>([
    { id: '1', sender: 'Coach', text: 'Bienvenue dans votre séance ! Préparez votre tapis et une bouteille d’eau.', time: '10:01' }
  ]);
  const [newMsg, setNewMsg] = useState('');
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);

  useEffect(() => {
    if (!booking) return;
    const interval = setInterval(() => {
      setCallDurationSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [booking]);

  if (!booking) return null;

  const isCoach = currentUser?.role === 'coach';
  const partnerName = isCoach ? booking.clientName : booking.coachName;
  const partnerPhoto = isCoach ? booking.clientAvatar : booking.coachPhoto;
  const myPhoto = currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80';

  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    const msg = {
      id: Date.now().toString(),
      sender: currentUser?.name || 'Moi',
      text: newMsg.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages((prev) => [...prev, msg]);
    setNewMsg('');
  };

  return (
    <motion.div
      id="apple-video-call-modal"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between max-w-md mx-auto overflow-hidden shadow-2xl"
    >
      {/* Top Apple Glass Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-4 pb-3 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent backdrop-blur-xs">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 bg-[#00D664] rounded-full animate-pulse shadow-[0_0_8px_#00D664]" />
          <div>
            <h2 className="text-xs font-black tracking-tight text-white leading-tight">
              {partnerName}
            </h2>
            <p className="text-[10px] text-slate-300 font-medium">
              {booking.sessionType.name} • <span className="text-[#00D664] tabular-nums font-bold">{formatDuration(callDurationSeconds)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className={`p-2 rounded-full transition cursor-pointer ${
              showNotes ? 'bg-[#00D664] text-[#0F172A]' : 'bg-white/15 text-white hover:bg-white/25'
            }`}
            title="Notes de séance"
          >
            <FileText className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowChat(!showChat)}
            className={`p-2 rounded-full transition cursor-pointer relative ${
              showChat ? 'bg-[#00D664] text-[#0F172A]' : 'bg-white/15 text-white hover:bg-white/25'
            }`}
            title="Chat en direct"
          >
            <MessageSquare className="w-4 h-4" />
            {chatMessages.length > 0 && !showChat && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#00D664] rounded-full ring-2 ring-slate-950" />
            )}
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/15 hover:bg-white/25 text-white transition cursor-pointer ml-1"
            title="Réduire"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Video Surface */}
      <div className="relative flex-1 w-full h-full bg-slate-900 overflow-hidden flex items-center justify-center">
        {/* Remote Partner Feed */}
        <div className="relative w-full h-full">
          <img
            src={partnerPhoto}
            alt={partnerName}
            className="w-full h-full object-cover object-center filter brightness-95"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-black/30" />

          {/* Remote audio visualizer wave effect */}
          <div className="absolute bottom-24 left-4 flex items-center gap-1 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-200 border border-white/10">
            <Volume2 className="w-3 h-3 text-[#00D664] animate-pulse" />
            <span>HD Audio 48kHz</span>
          </div>
        </div>

        {/* Local PIP Video (Self view) */}
        <motion.div 
          drag
          dragConstraints={{ left: -140, right: 10, top: -260, bottom: 20 }}
          className="absolute top-20 right-4 w-28 h-40 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-slate-800 cursor-grab active:cursor-grabbing z-30"
        >
          {isVideoOn ? (
            <img
              src={myPhoto}
              alt="Moi"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-400 text-xs">
              <VideoOff className="w-6 h-6 mb-1 text-slate-500" />
              <span className="text-[10px]">Caméra off</span>
            </div>
          )}
          <div className="absolute bottom-1.5 left-2 text-[9px] font-bold bg-black/60 px-1.5 py-0.5 rounded text-white backdrop-blur-xs">
            Vous
          </div>
        </motion.div>

        {/* Side Drawers: Live Notes or Live Chat Overlay */}
        <AnimatePresence>
          {showNotes && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="absolute top-16 right-4 left-4 bottom-24 bg-slate-900/90 backdrop-blur-xl rounded-3xl p-4 border border-white/15 z-30 overflow-y-auto shadow-2xl text-left"
            >
              <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-[#00D664]">
                  <Sparkles className="w-4 h-4" />
                  <span>Programme & Consignes Séance</span>
                </div>
                <button onClick={() => setShowNotes(false)} className="text-slate-400 hover:text-white text-xs">
                  Fermer
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-200">
                <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                  <span className="text-[10px] font-bold uppercase text-[#00D664] block mb-1">
                    Échauffement dynamique (7 min)
                  </span>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    Mobilité des hanches, rotations articulaires et activation du tronc avec respiration rythmée.
                  </p>
                </div>

                <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                  <span className="text-[10px] font-bold uppercase text-amber-400 block mb-1">
                    Bloc Principal (35 min)
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-slate-300 text-xs">
                    <li>3 séries : Squats tempo lent (4x12)</li>
                    <li>3 séries : Fentes dynamiques & gainage hollow</li>
                    <li>Récupération active : 60 sec entre chaque tour</li>
                  </ul>
                </div>

                <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                  <span className="text-[10px] font-bold uppercase text-sky-400 block mb-1">
                    Retour au calme & Feedback (8 min)
                  </span>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    Étirements doux des fléchisseurs et debriefing des sensations.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {showChat && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="absolute top-16 right-4 left-4 bottom-24 bg-slate-900/95 backdrop-blur-xl rounded-3xl p-4 border border-white/15 z-30 flex flex-col justify-between shadow-2xl text-left"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                <span className="text-xs font-black text-white">Chat de la session</span>
                <button onClick={() => setShowChat(false)} className="text-slate-400 hover:text-white text-xs">
                  Fermer
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar mb-3">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className="bg-white/10 p-2.5 rounded-2xl text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[#00D664] text-[10px]">{msg.sender}</span>
                      <span className="text-slate-400 text-[9px]">{msg.time}</span>
                    </div>
                    <p className="text-slate-200 text-xs">{msg.text}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendMessage} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  placeholder="Écrire un message..."
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-[#00D664]"
                />
                <button
                  type="submit"
                  className="bg-[#00D664] text-[#0F172A] px-3 py-2 rounded-xl text-xs font-black hover:bg-[#00B050] transition cursor-pointer"
                >
                  Envoyer
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Apple Glass Controls Bar */}
      <div className="relative z-20 px-4 pb-6 pt-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-center justify-center gap-3.5">
        {/* Mic Toggle */}
        <button
          onClick={() => setIsMicOn(!isMicOn)}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition shadow-lg cursor-pointer ${
            isMicOn 
              ? 'bg-white/20 text-white hover:bg-white/30' 
              : 'bg-rose-500 text-white ring-2 ring-rose-300'
          }`}
          title={isMicOn ? 'Couper le micro' : 'Activer le micro'}
        >
          {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        {/* Video Camera Toggle */}
        <button
          onClick={() => setIsVideoOn(!isVideoOn)}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition shadow-lg cursor-pointer ${
            isVideoOn 
              ? 'bg-white/20 text-white hover:bg-white/30' 
              : 'bg-rose-500 text-white ring-2 ring-rose-300'
          }`}
          title={isVideoOn ? 'Couper la caméra' : 'Activer la caméra'}
        >
          {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        {/* End Call Button (Apple Red Capsule) */}
        <button
          onClick={onClose}
          className="px-6 h-12 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center gap-2 shadow-xl cursor-pointer active:scale-95 transition"
        >
          <PhoneOff className="w-5 h-5" />
          <span>Quitter</span>
        </button>
      </div>
    </motion.div>
  );
};
