import React, { useEffect, useMemo, useState } from 'react';
import { useApp, BookingDraft } from '../../context/AppContext';
import {
  ChevronLeft,
  ChevronRight,
  Video,
  MapPin,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
  Home as HomeIcon,
  Building,
  Phone,
  MoreHorizontal,
} from 'lucide-react';
import { SessionType, CoachProfile } from '../../types';
import { getFormattedDate } from '../../data/mockData';
import { Card, IconButton, PrimaryButton, Rating, ScreenHeader, StickyAction, formatEuro } from '../ui/fmc';

const WEEKDAYS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];
const DAY_MS = 86_400_000;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const sessionIcon = (st: SessionType) => {
  if (st.format === 'online' || st.mode === 'video') return <Video className="w-5 h-5" />;
  if (st.format === 'home') return <HomeIcon className="w-5 h-5" />;
  if (st.format === 'partner_gym') return <Building className="w-5 h-5" />;
  if (st.mode === 'call') return <Phone className="w-5 h-5" />;
  return <MapPin className="w-5 h-5" />;
};

export const BookingCalendar: React.FC = () => {
  const { selectedCoach, goBack } = useApp();

  if (!selectedCoach) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-fmc-bg">
        <p className="text-sm text-slate-500">Coach introuvable.</p>
        <button onClick={goBack} className="ml-2 text-fmc-green-ink font-semibold">Retour</button>
      </div>
    );
  }

  return <BookingCalendarContent coach={selectedCoach} />;
};

const BookingCalendarContent: React.FC<{ coach: CoachProfile }> = ({ coach }) => {
  const { goBack, navigateTo, getCoachAvailabilities, sessionTypes, currentUser } = useApp();

  const today = startOfDay(new Date());
  // Lundi de la semaine en cours
  const mondayOffset = (today.getDay() + 6) % 7;

  const [weekPage, setWeekPage] = useState(0); // pagination par 2 semaines
  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(1); // demain par défaut
  const selectedDateStr = getFormattedDate(selectedDayOffset);

  const daySlots = getCoachAvailabilities(coach.id, selectedDateStr);
  const availableSlots = daySlots.filter((s) => !s.isBooked);

  const [selectedSlotId, setSelectedSlotId] = useState<string>(availableSlots[0]?.id ?? '');
  const [selectedSessionType, setSelectedSessionType] = useState<SessionType>(sessionTypes[0]);
  const [clientAddress, setClientAddress] = useState<string>(currentUser?.address || '12 Rue de Rivoli, 75001 Paris');
  const [clientNotes, setClientNotes] = useState<string>('');

  // Quand le jour change, présélectionne le premier créneau libre
  useEffect(() => {
    if (!availableSlots.some((s) => s.id === selectedSlotId)) {
      setSelectedSlotId(availableSlots[0]?.id ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDateStr]);

  // Grille de 2 semaines (lundi → dimanche)
  const calendarDays = useMemo(() => {
    const firstOffset = -mondayOffset + weekPage * 14;
    return Array.from({ length: 14 }, (_, i) => {
      const offset = firstOffset + i;
      const date = new Date(today.getTime() + offset * DAY_MS);
      const isPast = offset < 0;
      const slots = isPast ? [] : getCoachAvailabilities(coach.id, getFormattedDate(offset)).filter((s) => !s.isBooked);
      return { offset, dayNumber: date.getDate(), isPast, hasSlots: slots.length > 0 };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekPage, coach.id]);

  const selectedDate = new Date(today.getTime() + selectedDayOffset * DAY_MS);
  const monthTitle = selectedDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  // Tarif selon le format choisi
  const baseRate =
    selectedSessionType.format === 'home' && coach.formatPrices?.home
      ? coach.formatPrices.home
      : selectedSessionType.format === 'online' && coach.formatPrices?.online
      ? coach.formatPrices.online
      : coach.hourlyRate * (selectedSessionType.priceMultiplier || 1.0);

  const serviceFee = 4.5;
  const taxes = Number((baseRate * 0.025).toFixed(2));
  const total = Number((baseRate + serviceFee + taxes).toFixed(2));

  const handleProceedToCheckout = () => {
    const chosenSlot =
      daySlots.find((s) => s.id === selectedSlotId && !s.isBooked) ?? availableSlots[0];
    if (!chosenSlot) return;

    const draft: BookingDraft = {
      coach,
      selectedDate: selectedDateStr,
      selectedSlot: chosenSlot,
      sessionType: selectedSessionType,
      basePrice: baseRate,
      serviceFee,
      taxes,
      total,
      notes: clientNotes.trim() ? clientNotes : undefined,
      clientAddress: selectedSessionType.format === 'home' ? clientAddress : undefined,
    };

    navigateTo('checkout', { bookingDraft: draft });
  };

  const goToPage = (page: number) => {
    const next = Math.max(0, page);
    setWeekPage(next);
    const firstSelectable = Math.max(1, -mondayOffset + next * 14);
    setSelectedDayOffset(firstSelectable);
  };

  return (
    <div className="min-h-screen bg-fmc-bg dark:bg-[#0B0F19] text-fmc-navy dark:text-slate-100 pb-36 max-w-md mx-auto px-5 pt-4">
      <ScreenHeader
        title="Choisir l'horaire"
        onBack={goBack}
        right={
          <IconButton aria-label="Profil du coach" onClick={() => navigateTo('coach_profile', { coachId: coach.id })}>
            <MoreHorizontal className="w-5 h-5" />
          </IconButton>
        }
      />

      {/* Coach */}
      <Card className="p-5 flex items-center gap-4 mb-8">
        <img src={coach.photo} alt={coach.name} className="w-14 h-14 rounded-full object-cover bg-slate-100 shrink-0" />
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-base truncate">{coach.name}</h2>
          <p className="text-sm text-slate-500 truncate">{coach.title}</p>
        </div>
        <Rating value={coach.rating} className="shrink-0" />
      </Card>

      {/* Calendrier */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold tracking-tight first-letter:uppercase">{monthTitle}</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => goToPage(weekPage - 1)}
            disabled={weekPage === 0}
            aria-label="Semaines précédentes"
            className="w-10 h-10 flex items-center justify-center text-slate-500 disabled:opacity-30 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => goToPage(weekPage + 1)}
            aria-label="Semaines suivantes"
            className="w-10 h-10 flex items-center justify-center text-fmc-navy dark:text-white cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-2 text-center mb-8">
        {WEEKDAYS.map((d) => (
          <span key={d} className="text-sm font-medium text-slate-500 pb-2">{d}</span>
        ))}
        {calendarDays.map((day) => {
          const isSelected = day.offset === selectedDayOffset;
          return (
            <div key={day.offset} className="flex justify-center">
              <button
                id={`calendar-day-${day.offset}`}
                disabled={day.isPast}
                onClick={() => setSelectedDayOffset(day.offset)}
                className={`w-11 h-11 rounded-full text-base tabular-nums transition cursor-pointer disabled:cursor-default ${
                  isSelected
                    ? 'bg-fmc-green text-fmc-navy font-bold shadow-[0_6px_18px_rgba(0,214,100,0.35)]'
                    : day.isPast
                    ? 'text-slate-300 dark:text-slate-700'
                    : day.hasSlots
                    ? 'text-fmc-navy dark:text-white font-medium'
                    : 'text-slate-400'
                }`}
              >
                {day.dayNumber}
              </button>
            </div>
          );
        })}
      </div>

      {/* Créneaux */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold tracking-tight">Créneaux disponibles</h2>
        <span className="text-sm font-semibold text-fmc-green-ink">
          {availableSlots.length} restant{availableSlots.length > 1 ? 's' : ''}
        </span>
      </div>

      {daySlots.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6 mb-6">
          Aucun créneau ce jour-là. Choisissez une autre date.
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-2.5 mb-10">
          {daySlots.map((slot) => {
            const isSelected = selectedSlotId === slot.id;
            return (
              <button
                key={slot.id}
                id={`slot-btn-${slot.id}`}
                disabled={slot.isBooked}
                onClick={() => setSelectedSlotId(slot.id)}
                className={`h-12 rounded-full text-[15px] font-semibold tabular-nums transition cursor-pointer ${
                  slot.isBooked
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 line-through cursor-not-allowed'
                    : isSelected
                    ? 'bg-fmc-green text-white'
                    : 'bg-white dark:bg-slate-900 border border-fmc-line dark:border-slate-700'
                }`}
              >
                {slot.startTime}
              </button>
            );
          })}
        </div>
      )}

      {/* Type de session */}
      <h2 className="text-xl font-semibold tracking-tight text-center mb-4">Type de session</h2>
      <div className="space-y-3 mb-6">
        {sessionTypes.map((st) => {
          const isSelected = selectedSessionType.id === st.id;
          return (
            <Card
              key={st.id}
              id={`session-type-${st.id}`}
              selected={isSelected}
              onClick={() => setSelectedSessionType(st)}
              className="p-4 flex items-center gap-4 cursor-pointer"
            >
              <span className="w-12 h-12 rounded-2xl bg-fmc-dark text-fmc-green flex items-center justify-center shrink-0">
                {sessionIcon(st)}
              </span>
              <span className="flex-1 min-w-0">
                <span className="font-semibold block">{st.name}</span>
                <span className="text-sm text-slate-500 block truncate">
                  {st.durationMinutes} min{st.platform ? ` • ${st.platform}` : ''}
                </span>
              </span>
              {isSelected ? (
                <CheckCircle2 className="w-6 h-6 text-white fill-fmc-green shrink-0" />
              ) : (
                <span className="w-6 h-6 rounded-full border-2 border-fmc-line dark:border-slate-700 shrink-0" />
              )}
            </Card>
          );
        })}
      </div>

      {selectedSessionType.format === 'home' && (
        <Card className="p-4 mb-6">
          <label className="text-sm font-semibold flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-fmc-green-ink" />
            Adresse de la séance
          </label>
          <input
            type="text"
            value={clientAddress}
            onChange={(e) => setClientAddress(e.target.value)}
            placeholder="Numéro, rue, code postal, ville…"
            className="w-full h-12 px-4 bg-fmc-bg dark:bg-slate-800 rounded-2xl text-[15px] focus:outline-none focus:ring-2 focus:ring-fmc-green/50"
          />
          <p className="text-xs text-slate-500 mt-2">
            {coach.name.split(' ')[0]} se déplace jusqu'à {coach.interventionRadiusKm || 15} km autour de {coach.city}.
          </p>
        </Card>
      )}

      <Card className="p-4">
        <label className="text-sm font-semibold flex items-center gap-2 mb-2">
          <MessageSquare className="w-4 h-4 text-fmc-green-ink" />
          Message pour {coach.name.split(' ')[0]} (optionnel)
        </label>
        <textarea
          rows={2}
          value={clientNotes}
          onChange={(e) => setClientNotes(e.target.value)}
          placeholder="Objectif, niveau, blessure à signaler…"
          className="w-full p-3 bg-fmc-bg dark:bg-slate-800 rounded-2xl text-[15px] resize-none focus:outline-none focus:ring-2 focus:ring-fmc-green/50 placeholder:text-slate-400"
        />
      </Card>

      <StickyAction>
        <PrimaryButton
          id="btn-confirm-calendar-booking"
          onClick={handleProceedToCheckout}
          disabled={availableSlots.length === 0}
          icon={<ArrowRight className="w-5 h-5" />}
        >
          Confirmer la réservation • {formatEuro(baseRate)}
        </PrimaryButton>
      </StickyAction>
    </div>
  );
};
