import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Calendar, 
  Clock, 
  Check, 
  AlertCircle,
  Sparkles,
  Zap,
  Repeat,
  Sun,
  Moon,
  Ban
} from 'lucide-react';
import { getFormattedDate } from '../../data/mockData';

const DAYS_OF_WEEK = [
  { id: 1, label: 'Lun', name: 'Lundi' },
  { id: 2, label: 'Mar', name: 'Mardi' },
  { id: 3, label: 'Mer', name: 'Mercredi' },
  { id: 4, label: 'Jeu', name: 'Jeudi' },
  { id: 5, label: 'Ven', name: 'Vendredi' },
  { id: 6, label: 'Sam', name: 'Samedi' },
  { id: 0, label: 'Dim', name: 'Dimanche' }
];

export const CoachAvailabilityManager: React.FC = () => {
  const { 
    currentUser, 
    coaches, 
    availabilities, 
    addAvailabilitySlot, 
    removeAvailabilitySlot, 
    generateBatchWeeklySlots,
    goBack 
  } = useApp();

  const coach = coaches.find(c => c.userId === currentUser?.id) || coaches[0];
  const coachSlots = availabilities.filter(a => a.coachId === coach?.id);

  // New single slot form state
  const [slotDate, setSlotDate] = useState<string>(getFormattedDate(1));
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('10:00');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');

  // Batch generator state
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Lun-Ven
  const [slotPresets, setSlotPresets] = useState<{ start: string; end: string }[]>([
    { start: '09:00', end: '10:00' },
    { start: '10:30', end: '11:30' },
    { start: '14:00', end: '15:00' },
    { start: '16:00', end: '17:00' }
  ]);

  const toggleDaySelection = (dayId: number) => {
    setSelectedDays(prev => 
      prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]
    );
  };

  const handleRunBatchGenerator = () => {
    if (selectedDays.length === 0 || slotPresets.length === 0) return;
    generateBatchWeeklySlots(coach.id, selectedDays, slotPresets);
    setFeedbackMsg(`Créneaux récurrents générés avec succès pour les 3 prochaines semaines !`);
    setTimeout(() => setFeedbackMsg(''), 3000);
    setShowBatchModal(false);
  };

  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotDate || !startTime || !endTime) return;

    addAvailabilitySlot(coach.id, slotDate, startTime, endTime);
    setFeedbackMsg(`Créneau ${startTime} - ${endTime} ajouté avec succès !`);
    setTimeout(() => setFeedbackMsg(''), 2500);
    setShowAddForm(false);
  };

  // Group slots by date
  const groupedSlots = coachSlots.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, typeof coachSlots>);

  const sortedDates = Object.keys(groupedSlots).sort();

  return (
    <div className="min-h-screen bg-[#F6F9FA] text-[#0F172A] pb-28 max-w-md mx-auto px-4 pt-3">
      {/* Header */}
      <div className="flex items-center justify-between py-2 mb-3">
        <button
          onClick={goBack}
          className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs hover:bg-slate-50 transition cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h1 className="text-base font-extrabold text-[#0F172A]">Planning & Créneaux</h1>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-10 h-10 rounded-full bg-[#00D664] text-[#0F172A] font-extrabold flex items-center justify-center shadow-xs hover:bg-[#00B050] transition cursor-pointer"
          title="Ajouter un créneau"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      {feedbackMsg && (
        <div className="mb-4 p-3 bg-[#00D664]/15 border border-[#00D664]/30 text-[#008A3E] text-xs font-bold rounded-2xl flex items-center gap-2 shadow-xs">
          <Check className="w-4 h-4" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Fast Recurring Generator Card */}
      <div className="bg-linear-to-br from-[#0F172A] to-[#1E293B] text-white rounded-3xl p-4 shadow-md mb-4 flex items-center justify-between border border-slate-800">
        <div>
          <div className="flex items-center gap-1.5 text-[#00FD83] text-xs font-black uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Automatisation planning</span>
          </div>
          <h2 className="text-sm font-black text-white">Créneaux récurrents 3 semaines</h2>
          <p className="text-[11px] text-slate-300 mt-0.5">
            Générez vos plages récurrentes en 1 clic
          </p>
        </div>

        <button
          onClick={() => setShowBatchModal(true)}
          className="px-3.5 py-2 bg-[#00D664] hover:bg-[#00B050] text-[#0F172A] font-black rounded-xl text-xs flex items-center gap-1 shadow-xs transition cursor-pointer"
        >
          <Repeat className="w-3.5 h-3.5" />
          <span>Configurer</span>
        </button>
      </div>

      {/* Batch Setup Modal */}
      {showBatchModal && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xl mb-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-extrabold text-[#0F172A]">
              Configuration des créneaux types
            </h3>
            <button
              onClick={() => setShowBatchModal(false)}
              className="text-xs text-slate-400 hover:text-slate-700 font-semibold cursor-pointer"
            >
              Fermer
            </button>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
              Jours actifs chaque semaine
            </label>
            <div className="flex gap-1.5 justify-between">
              {DAYS_OF_WEEK.map((d) => {
                const isSelected = selectedDays.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleDaySelection(d.id)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#00D664] text-[#0F172A] shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
              Heures de séances par jour
            </label>
            <div className="grid grid-cols-2 gap-2">
              {slotPresets.map((slot, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between"
                >
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#00B050]" />
                    {slot.start} - {slot.end}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleRunBatchGenerator}
            className="w-full py-3 bg-[#00D664] hover:bg-[#00B050] text-[#0F172A] font-black rounded-2xl text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Zap className="w-4 h-4 stroke-[2.5]" />
            <span>Générer le planning sur 3 semaines</span>
          </button>
        </div>
      )}

      {/* Add Single Slot Drawer/Card */}
      {showAddForm && (
        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-md mb-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-extrabold text-[#0F172A]">Ajouter un créneau ponctuel</h3>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-xs text-slate-400 hover:text-slate-700 font-semibold cursor-pointer"
            >
              Fermer
            </button>
          </div>

          <form onSubmit={handleAddSlot} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Date de la séance</label>
              <input
                type="date"
                required
                value={slotDate}
                onChange={(e) => setSlotDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 text-slate-900 border border-slate-300 rounded-xl font-medium focus:outline-none focus:border-[#00D664]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Heure début</label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 text-slate-900 border border-slate-300 rounded-xl font-medium focus:outline-none focus:border-[#00D664]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Heure fin</label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 text-slate-900 border border-slate-300 rounded-xl font-medium focus:outline-none focus:border-[#00D664]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-[#00D664] hover:bg-[#00B050] text-[#0F172A] font-extrabold rounded-xl text-xs transition shadow-xs cursor-pointer"
            >
              Enregistrer ce créneau
            </button>
          </form>
        </div>
      )}

      {/* Slots List by Date */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
            Créneaux ouverts ({coachSlots.length})
          </span>
          <span className="text-xs font-bold text-[#008A3E]">
            {coachSlots.filter(s => !s.isBooked).length} réservables
          </span>
        </div>

        {sortedDates.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-xs">
            <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="font-extrabold text-[#0F172A] text-sm">Aucun créneau configuré</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Générez vos créneaux en un clic avec l'outil d'automatisation ou ajoutez-les manuellement.
            </p>
            <button
              onClick={() => setShowBatchModal(true)}
              className="px-4 py-2 bg-[#00D664] text-[#0F172A] font-extrabold text-xs rounded-xl shadow-xs hover:bg-[#00B050] cursor-pointer"
            >
              Lancer l'automatisation
            </button>
          </div>
        ) : (
          sortedDates.map((dateStr) => {
            const slots = groupedSlots[dateStr];
            return (
              <div key={dateStr} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#008A3E]" />
                    <h3 className="font-extrabold text-[#0F172A] text-sm">{dateStr}</h3>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {slots.filter(s => !s.isBooked).length} libre(s)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {slots.map((slot) => (
                    <div
                      key={slot.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                        slot.isBooked
                          ? 'bg-amber-50 border-amber-200 text-amber-900 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div>
                        <span className="font-bold block">{slot.startTime} - {slot.endTime}</span>
                        <span className="text-[10px] font-semibold opacity-80">
                          {slot.isBooked ? '🔴 Réservé' : '🟢 Libre'}
                        </span>
                      </div>

                      {!slot.isBooked && (
                        <button
                          onClick={() => removeAvailabilitySlot(slot.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                          title="Supprimer ce créneau"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
