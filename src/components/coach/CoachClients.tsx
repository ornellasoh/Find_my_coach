import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ArrowLeft, 
  Users, 
  Search, 
  Phone, 
  Mail, 
  MessageSquare, 
  Calendar, 
  Clock, 
  Tag, 
  Plus, 
  Check, 
  X, 
  Edit3,
  ChevronRight,
  FileText,
  Dumbbell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CoachClientSummary } from '../../types';
import { CreateProgramModal } from './CreateProgramModal';

export const CoachClients: React.FC = () => {
  const { 
    coachClients, 
    addClientNote, 
    bookings, 
    currentUser, 
    coaches, 
    goBack,
    startChatWithClient
  } = useApp();

  const coachProfile = coaches.find(c => c.userId === currentUser?.id) || coaches[0];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<CoachClientSummary | null>(null);
  const [editingNote, setEditingNote] = useState('');
  const [newTag, setNewTag] = useState('');
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);

  const filteredClients = coachClients.filter(c => 
    c.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.clientEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleOpenClient = (client: CoachClientSummary) => {
    setSelectedClient(client);
    setEditingNote(client.notes || '');
  };

  const handleSaveNote = () => {
    if (!selectedClient) return;
    addClientNote(selectedClient.clientId, editingNote);
    setSelectedClient(prev => prev ? { ...prev, notes: editingNote } : null);
  };

  const handleAddTag = () => {
    if (!selectedClient || !newTag.trim()) return;
    addClientNote(selectedClient.clientId, selectedClient.notes || '', newTag.trim());
    setSelectedClient(prev => prev ? {
      ...prev,
      tags: [...(prev.tags || []), newTag.trim()]
    } : null);
    setNewTag('');
  };

  // Client past bookings
  const clientBookings = selectedClient 
    ? bookings.filter(b => b.clientId === selectedClient.clientId && b.coachId === coachProfile.id)
    : [];

  return (
    <div className="min-h-screen bg-[#F6F9FA] text-[#0F172A] pb-28 max-w-md mx-auto px-4 pt-3">
      {/* Top Header */}
      <div className="flex items-center justify-between py-2 mb-3">
        <button
          onClick={goBack}
          className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs hover:bg-slate-50 transition cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h1 className="text-base font-extrabold text-[#0F172A]">Fiches Clients & Suivi</h1>

        <div className="w-10" />
      </div>

      {/* Search Input */}
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher un client ou un tag..."
          className="w-full pl-10 pr-4 py-2.5 bg-white text-sm text-slate-900 rounded-2xl border border-slate-200 shadow-xs focus:outline-none focus:border-[#00D664]"
        />
      </div>

      {/* Clients List */}
      <div className="space-y-3">
        {filteredClients.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-slate-200 text-slate-400">
            Aucun client ne correspond à la recherche.
          </div>
        ) : (
          filteredClients.map((client) => (
            <div
              key={client.id}
              onClick={() => handleOpenClient(client)}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-[#00D664] transition cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <img
                  src={client.clientAvatar}
                  alt={client.clientName}
                  className="w-12 h-12 rounded-2xl object-cover border border-slate-200"
                />
                <div>
                  <h3 className="font-extrabold text-sm text-[#0F172A]">{client.clientName}</h3>
                  <p className="text-[11px] text-slate-500">{client.clientEmail}</p>

                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold bg-emerald-50 text-[#008A3E] px-2 py-0.2 rounded-md">
                      {client.totalSessions} séance{client.totalSessions > 1 ? 's' : ''}
                    </span>
                    {client.tags && client.tags[0] && (
                      <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-md">
                        {client.tags[0]}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <ChevronRight className="w-5 h-5 text-slate-300" />
            </div>
          ))
        )}
      </div>

      {/* Client Detail Sheet / Modal */}
      <AnimatePresence>
        {selectedClient && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl max-h-[88vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedClient.clientAvatar}
                    alt={selectedClient.clientName}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-[#00D664]/40"
                  />
                  <div>
                    <h2 className="text-base font-black text-[#0F172A]">{selectedClient.clientName}</h2>
                    <p className="text-xs text-slate-500">{selectedClient.clientEmail}</p>
                    <span className="text-[11px] font-bold text-[#008A3E]">
                      {selectedClient.totalSessions} séances complétées
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedClient(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Contact Buttons */}
              <div className="grid grid-cols-3 gap-2 py-3 border-b border-slate-100">
                <button
                  onClick={() => {
                    startChatWithClient(selectedClient);
                    setSelectedClient(null);
                  }}
                  className="py-2.5 bg-[#00D664]/15 hover:bg-[#00D664]/25 text-[#008A3E] rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition border border-[#00D664]/30 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat FMC</span>
                </button>

                {selectedClient.clientPhone ? (
                  <a
                    href={`tel:${selectedClient.clientPhone}`}
                    className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#00B050]" />
                    <span>Appel</span>
                  </a>
                ) : (
                  <button
                    disabled
                    className="py-2.5 bg-slate-50 text-slate-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Mobile</span>
                  </button>
                )}

                <a
                  href={`mailto:${selectedClient.clientEmail}`}
                  className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  <span>Email</span>
                </a>
              </div>

              {/* Assign Workout Program Button */}
              <div className="py-3 border-b border-slate-100">
                <button
                  onClick={() => setIsProgramModalOpen(true)}
                  className="w-full py-2.5 bg-[#00D664] hover:bg-[#00B050] text-[#0F172A] rounded-xl text-xs font-black flex items-center justify-center gap-2 transition shadow-xs cursor-pointer active:scale-95"
                >
                  <Dumbbell className="w-4 h-4 stroke-[2.5]" />
                  <span>Créer & Assigner un Programme</span>
                </button>
              </div>

              {/* Client Tags */}
              <div className="py-3 border-b border-slate-100">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-1.5">
                  Tags & Objectifs
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedClient.tags?.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-emerald-50 text-[#008A3E] font-bold rounded-lg text-xs border border-emerald-200/60"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Ajouter un tag (ex: Marathon, Genou fragile)..."
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#00D664]"
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-3 py-1.5 bg-[#00D664] text-[#0F172A] font-bold rounded-xl text-xs hover:bg-[#00B050] transition cursor-pointer"
                  >
                    Ajouter
                  </button>
                </div>
              </div>

              {/* Private Coach Notes */}
              <div className="py-3 border-b border-slate-100">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Notes privées de coaching
                  </label>
                  <span className="text-[10px] text-slate-400">Visible uniquement par vous</span>
                </div>
                <textarea
                  rows={3}
                  value={editingNote}
                  onChange={(e) => setEditingNote(e.target.value)}
                  placeholder="Notes sur la progression, blessures, charges d'entraînement..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#00D664]"
                />
                <button
                  onClick={handleSaveNote}
                  className="mt-2 w-full py-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Enregistrer les notes
                </button>
              </div>

              {/* Booking History with this client */}
              <div className="py-3">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
                  Historique des séances ({clientBookings.length})
                </h3>
                {clientBookings.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-2">
                    Aucune séance passée enregistrée.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {clientBookings.map((b) => (
                      <div
                        key={b.id}
                        className="p-2.5 bg-slate-50 rounded-xl text-xs flex items-center justify-between border border-slate-200"
                      >
                        <div>
                          <span className="font-bold text-[#0F172A] block">{b.sessionType.name}</span>
                          <span className="text-[10px] text-slate-500">{b.date} • {b.startTime}</span>
                        </div>
                        <span className="font-black text-[#008A3E]">+{b.price} €</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Program Modal */}
      {isProgramModalOpen && selectedClient && (
        <CreateProgramModal
          client={selectedClient}
          onClose={() => setIsProgramModalOpen(false)}
        />
      )}
    </div>
  );
};
