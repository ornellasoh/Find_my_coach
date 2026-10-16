import React, { useEffect, useMemo, useState } from 'react';
import { Avatar } from '../ui/Avatar';
import {
  AlertTriangle,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  History,
  Loader2,
  MapPin,
  MessageSquare,
  RotateCcw,
  Video,
  XCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { addToCalendar } from '../../utils/calendar';
import type { BookingIssue, IssueCategory, RescheduleRequest, SessionReport } from '../../types';
import { Card, Screen, ScreenHeader, formatDateFr, formatEuro } from '../ui/fmc';
import { SessionAccess, isOnlineBooking, useSessionDetails } from './SessionAccess';
import {
  ISSUE_LABELS,
  ISSUE_STATUS_LABELS,
  fetchMyIssues,
  fetchReport,
  fetchReschedules,
  proposeReschedule,
  reportIssue,
  respondReschedule,
  saveReport,
} from '../../lib/sessions';

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'En attente de paiement', cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30' },
  confirmed: { label: 'Confirmée', cls: 'bg-fmc-green/15 text-fmc-green-ink border-fmc-green/30' },
  completed: { label: 'Effectuée', cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30' },
  cancelled: { label: 'Annulée', cls: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30' },
  rejected: { label: 'Refusée', cls: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30' },
};

const FORMAT_LABEL: Record<string, string> = {
  online: 'En visio',
  home: 'À domicile',
  coach_location: 'Chez le coach',
  outdoor: 'En extérieur',
  corporate: 'En entreprise',
  partner_gym: 'En salle partenaire',
};

const sessionStart = (date: string, time: string) => new Date(`${date}T${time || '00:00'}:00`);
const hoursBefore = (date: string, time: string) => (sessionStart(date, time).getTime() - Date.now()) / 3_600_000;

/** Règle de report v1 : identique à l'annulation gratuite (24 h avant la séance), vérifiée par le serveur. */
const RESCHEDULE_MIN_HOURS = 24;

const Section: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <Card className="p-4 mb-3">
    <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
      {icon}
      {title}
    </h2>
    {children}
  </Card>
);

const Btn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'primary' | 'soft' | 'danger' | 'dark' }> = ({
  tone = 'soft',
  className = '',
  children,
  ...props
}) => (
  <button
    type="button"
    {...props}
    className={`min-h-11 px-4 rounded-full text-sm font-bold inline-flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer ${
      tone === 'primary'
        ? 'bg-fmc-green text-fmc-navy'
        : tone === 'danger'
        ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10'
        : tone === 'dark'
        ? 'bg-fmc-dark text-white'
        : 'bg-slate-100 dark:bg-slate-800 text-fmc-navy dark:text-white'
    } ${className}`}
  >
    {children}
  </button>
);

export const BookingDetail: React.FC = () => {
  const {
    bookings,
    selectedBookingId,
    currentUser,
    coaches,
    availabilities,
    goBack,
    navigateTo,
    cancelBooking,
    completeBooking,
    startChatWithCoach,
    startChatWithClient,
    setReviewModalBooking,
    refreshBookings,
    patchBookingLocal,
    applyServerBooking,
    isOnline,
  } = useApp();

  const booking = bookings.find((b) => b.id === selectedBookingId) ?? null;
  const { details, setDetails, loading, error } = useSessionDetails(booking);
  const [reschedules, setReschedules] = useState<RescheduleRequest[]>([]);
  const [report, setReport] = useState<SessionReport | null>(null);
  const [issues, setIssues] = useState<BookingIssue[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);
  const [panel, setPanel] = useState<null | 'reschedule' | 'issue' | 'report'>(null);
  const [newSlotId, setNewSlotId] = useState('');
  const [message, setMessage] = useState('');
  const [issueCat, setIssueCat] = useState<IssueCategory>('technical');
  const [issueText, setIssueText] = useState('');
  const [summary, setSummary] = useState('');
  const [nextActions, setNextActions] = useState('');

  const isClient = !!booking && currentUser?.id === booking.clientId;
  const isCoach = !!booking && !isClient;

  const loadExtras = async () => {
    if (!booking) return;
    try {
      const [r, rep, iss] = await Promise.all([
        fetchReschedules([booking.id]),
        booking.bookingStatus === 'completed' ? fetchReport(booking.id) : Promise.resolve(null),
        fetchMyIssues(booking.id).catch(() => [] as BookingIssue[]),
      ]);
      setReschedules(r);
      setReport(rep);
      setIssues(iss);
      if (rep) {
        setSummary(rep.summary);
        setNextActions(rep.nextActions ?? '');
      }
    } catch {
      /* les sections restent vides ; l'erreur réseau est signalée lors d'une action */
    }
  };

  useEffect(() => {
    loadExtras();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking?.id, booking?.bookingStatus, booking?.date, booking?.startTime]);

  const freeSlots = useMemo(() => {
    if (!booking) return [];
    const today = new Date().toISOString().slice(0, 10);
    return availabilities
      .filter((s) => s.coachId === booking.coachId && !s.isBooked && s.id !== booking.availabilityId && s.date >= today)
      .filter((s) => hoursBefore(s.date, s.startTime) > 2)
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
      .slice(0, 40);
  }, [availabilities, booking]);

  if (!booking) {
    return (
      <Screen>
        <ScreenHeader title="Réservation" onBack={goBack} />
        <Card className="p-6 text-center">
          <p className="font-semibold">Réservation introuvable</p>
          <p className="text-sm text-slate-500 mt-1">Elle a peut-être été annulée ou n'est plus accessible.</p>
          <div className="mt-4">
            <Btn tone="primary" onClick={() => navigateTo(currentUser?.role === 'coach' ? 'coach_bookings' : 'bookings')}>
              Mes réservations
            </Btn>
          </div>
        </Card>
      </Screen>
    );
  }

  const coach = coaches.find((c) => c.id === booking.coachId);
  const status = STATUS[booking.bookingStatus] ?? STATUS.pending;
  const online = isOnlineBooking(booking);
  const pendingRequest = reschedules.find((r) => r.status === 'pending');
  const history = reschedules.filter((r) => r.status !== 'pending');
  const hBefore = hoursBefore(booking.date, booking.startTime);
  const canReschedule = booking.bookingStatus === 'confirmed' && !pendingRequest && (isCoach || hBefore >= RESCHEDULE_MIN_HOURS);
  const started = hBefore <= 0;

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setFlash(null);
    try {
      await fn();
    } catch (e) {
      setFlash({ ok: false, text: e instanceof Error ? e.message : 'Action impossible.' });
    } finally {
      setBusy(null);
    }
  };

  const openChat = () => {
    if (isClient && coach) startChatWithCoach(coach);
    else
      startChatWithClient({
        id: `cc-${booking.clientId}`,
        clientId: booking.clientId,
        clientName: booking.clientName,
        clientAvatar: booking.clientAvatar,
        clientEmail: booking.clientEmail,
        totalSessions: 1,
        status: 'active',
      });
  };

  const submitReschedule = () =>
    run('reschedule', async () => {
      const slot = freeSlots.find((s) => s.id === newSlotId);
      if (!slot) throw new Error('Choisissez un nouveau créneau.');
      const r = await proposeReschedule(booking.id, slot, message.trim(), {
        userId: currentUser?.id ?? '',
        role: isClient ? 'client' : 'coach',
        oldDate: booking.date,
        oldStart: booking.startTime,
        oldEnd: booking.endTime,
      });
      setReschedules((prev) => [r, ...prev]);
      setPanel(null);
      setNewSlotId('');
      setMessage('');
      setFlash({ ok: true, text: 'Demande envoyée. L’horaire actuel reste valable tant que l’autre personne n’a pas accepté.' });
    });

  const answer = (r: RescheduleRequest, action: 'accept' | 'decline' | 'cancel') =>
    run(`resp-${action}`, async () => {
      const updated = await respondReschedule(r.id, action);
      setReschedules((prev) => prev.map((x) => (x.id === r.id ? updated : x)));
      if (action === 'accept') {
        if (isOnline) await refreshBookings();
        else
          patchBookingLocal(booking.id, {
            date: r.newDate,
            startTime: r.newStart,
            endTime: r.newEnd ?? booking.endTime,
            availabilityId: r.newAvailabilityId,
            rescheduledAt: new Date().toISOString(),
          });
        setFlash({ ok: true, text: `Séance déplacée au ${formatDateFr(r.newDate)} à ${r.newStart}. Les rappels ont été mis à jour.` });
      } else {
        setFlash({ ok: true, text: action === 'decline' ? 'Report refusé : l’horaire initial est maintenu.' : 'Demande retirée.' });
      }
    });

  const doCancel = () =>
    run('cancel', async () => {
      const msg =
        booking.bookingStatus === 'pending'
          ? 'Abandonner cette réservation non payée ?'
          : isClient
          ? 'Annuler cette séance ? Remboursement intégral jusqu’à 24 h avant la séance.'
          : 'Annuler cette séance ? Votre client sera remboursé intégralement.';
      if (!window.confirm(msg)) return;
      const res = await cancelBooking(booking.id);
      setFlash({
        ok: true,
        text: res.refunded ? `Séance annulée. Remboursement de ${formatEuro(res.amount ?? 0)} en cours (5 à 10 jours).` : 'Séance annulée.',
      });
    });

  const resumePayment = () =>
    run('pay', async () => {
      const { startCheckout, waitForPayment } = await import('../../lib/payments');
      await startCheckout(booking.id, undefined, async () => {
        const b = await waitForPayment<typeof booking>(booking.id, 5);
        if (b?.paymentStatus === 'paid') applyServerBooking(b);
        else setFlash({ ok: false, text: 'Paiement non finalisé. Aucun montant n’a été débité.' });
      });
    });

  const submitIssue = () =>
    run('issue', async () => {
      const i = await reportIssue(booking.id, currentUser?.id ?? '', issueCat, issueText.trim());
      setIssues((prev) => [i, ...prev]);
      setPanel(null);
      setIssueText('');
      setFlash({ ok: true, text: 'Signalement envoyé à l’équipe Find My Coach. Nous revenons vers vous rapidement.' });
    });

  const submitReport = () =>
    run('report', async () => {
      if (!summary.trim()) throw new Error('Écrivez quelques lignes sur la séance.');
      const r = await saveReport(booking.id, summary.trim(), nextActions.trim());
      setReport(r);
      setPanel(null);
      setFlash({ ok: true, text: report ? 'Compte rendu mis à jour.' : 'Compte rendu partagé avec votre client.' });
    });

  const partnerName = isClient ? booking.coachName : booking.clientName;
  const partnerPhoto = isClient ? booking.coachPhoto : booking.clientAvatar;

  return (
    <Screen>
      <ScreenHeader title="Détail de la réservation" onBack={goBack} />

      {flash && (
        <div
          role="status"
          className={`mb-3 p-3 rounded-2xl text-sm font-semibold border ${
            flash.ok ? 'bg-fmc-green/10 border-fmc-green/30 text-fmc-green-ink' : 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-500/10 dark:border-rose-500/30'
          }`}
        >
          {flash.text}
        </div>
      )}

      {/* Résumé */}
      <Card className="p-4 mb-3">
        <div className="flex items-start gap-3">
          <Avatar src={partnerPhoto} name={partnerName} className="w-14 h-14 rounded-2xl" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{partnerName}</p>
            <p className="text-sm text-slate-500 truncate">{isClient ? booking.coachTitle : 'Client'}</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${status.cls}`}>{status.label}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <p className="flex items-center gap-1.5"><CalendarClock className="w-4 h-4 text-fmc-green-ink" /> {formatDateFr(booking.date, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <p className="flex items-center gap-1.5 tabular-nums"><Clock className="w-4 h-4 text-fmc-green-ink" /> {booking.startTime} – {booking.endTime}</p>
          <p className="flex items-center gap-1.5 col-span-2">
            {online ? <Video className="w-4 h-4 text-fmc-green-ink" /> : <MapPin className="w-4 h-4 text-fmc-green-ink" />}
            {booking.sessionType?.name} • {FORMAT_LABEL[booking.format] ?? booking.format}
          </p>
        </div>
        {booking.rescheduledAt && (
          <p className="mt-2 text-xs text-slate-500 flex items-center gap-1"><RotateCcw className="w-3.5 h-3.5" /> Séance déplacée</p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {booking.bookingStatus !== 'cancelled' && (
            <Btn onClick={openChat}><MessageSquare className="w-4 h-4" /> Conversation</Btn>
          )}
          {booking.bookingStatus === 'confirmed' && (
            <Btn
              onClick={() => addToCalendar(booking, details, isClient ? 'client' : 'coach').catch((e) => setFlash({ ok: false, text: (e as Error).message }))}
            >
              <CalendarPlus className="w-4 h-4" /> Ajouter au calendrier
            </Btn>
          )}
          {isClient && (booking.bookingStatus === 'completed' || booking.bookingStatus === 'cancelled') && coach && (
            <Btn tone="primary" onClick={() => navigateTo('booking_calendar', { coachId: coach.id })}>
              <RotateCcw className="w-4 h-4" /> Réserver à nouveau
            </Btn>
          )}
        </div>
      </Card>

      {/* En attente de paiement */}
      {booking.bookingStatus === 'pending' && isClient && (
        <Section title="Paiement" icon={<CreditCard className="w-4 h-4 text-amber-600" />}>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
            Le paiement n'a pas été finalisé. Le créneau n'est réservé que 30 minutes après le début du paiement.
          </p>
          <div className="flex flex-wrap gap-2">
            {isOnline && (
              <Btn tone="primary" disabled={busy === 'pay'} onClick={resumePayment}>
                {busy === 'pay' && <Loader2 className="w-4 h-4 animate-spin" />} Finaliser le paiement
              </Btn>
            )}
            <Btn tone="danger" disabled={busy === 'cancel'} onClick={doCancel}>Abandonner</Btn>
          </div>
        </Section>
      )}

      {/* Demande de report en attente */}
      {pendingRequest && booking.bookingStatus === 'confirmed' && (
        <Section title="Demande de report" icon={<CalendarClock className="w-4 h-4 text-amber-600" />}>
          <p className="text-sm">
            {pendingRequest.requestedBy === currentUser?.id ? 'Vous proposez' : `${partnerName} propose`} de déplacer la séance au{' '}
            <strong>{formatDateFr(pendingRequest.newDate, { weekday: 'long', day: 'numeric', month: 'long' })} à {pendingRequest.newStart}</strong>.
          </p>
          {pendingRequest.message && <p className="text-sm text-slate-500 mt-1 italic">« {pendingRequest.message} »</p>}
          <p className="text-xs text-slate-500 mt-2">L'horaire actuel reste valable tant que la demande n'est pas acceptée. Même séance, même prix.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {pendingRequest.requestedBy === currentUser?.id ? (
              <Btn disabled={!!busy} onClick={() => answer(pendingRequest, 'cancel')}>Retirer ma demande</Btn>
            ) : (
              <>
                <Btn tone="primary" disabled={!!busy} onClick={() => answer(pendingRequest, 'accept')}>
                  {busy === 'resp-accept' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Accepter
                </Btn>
                <Btn tone="danger" disabled={!!busy} onClick={() => answer(pendingRequest, 'decline')}>Refuser</Btn>
              </>
            )}
          </div>
        </Section>
      )}

      {/* Accès à la séance */}
      {booking.bookingStatus !== 'cancelled' && booking.bookingStatus !== 'rejected' && (
        <Section title={online ? 'Accès à la visio' : 'Lieu et préparation'} icon={online ? <Video className="w-4 h-4 text-fmc-green-ink" /> : <MapPin className="w-4 h-4 text-fmc-green-ink" />}>
          <SessionAccess
            booking={booking}
            isCoach={isCoach}
            details={details}
            loading={loading}
            error={error}
            onSaved={setDetails}
          />
        </Section>
      )}

      {/* Compte rendu */}
      {booking.bookingStatus === 'completed' && (
        <Section title="Compte rendu de séance" icon={<FileText className="w-4 h-4 text-fmc-green-ink" />}>
          {panel === 'report' && isCoach ? (
            <div className="space-y-3">
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={4}
                maxLength={3000}
                placeholder="Ce qui a été travaillé, points forts, points à améliorer…"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-fmc-line dark:border-slate-700 text-[15px] focus:outline-none focus:ring-2 focus:ring-fmc-green/50"
              />
              <textarea
                value={nextActions}
                onChange={(e) => setNextActions(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Prochaines actions (exercices à faire, objectifs d'ici la prochaine séance)…"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-fmc-line dark:border-slate-700 text-[15px] focus:outline-none focus:ring-2 focus:ring-fmc-green/50"
              />
              <div className="flex gap-2">
                <Btn onClick={() => setPanel(null)}>Annuler</Btn>
                <Btn tone="primary" disabled={busy === 'report'} onClick={submitReport}>
                  {busy === 'report' && <Loader2 className="w-4 h-4 animate-spin" />} {report ? 'Mettre à jour' : 'Partager avec le client'}
                </Btn>
              </div>
            </div>
          ) : report ? (
            <div className="space-y-2">
              <p className="text-sm whitespace-pre-line">{report.summary}</p>
              {report.nextActions && (
                <div className="rounded-2xl bg-fmc-green/10 p-3">
                  <p className="text-[13px] font-semibold text-[#007A3D] dark:text-fmc-green mb-1">Prochaines actions</p>
                  <p className="text-sm whitespace-pre-line">{report.nextActions}</p>
                </div>
              )}
              {isCoach && <Btn onClick={() => setPanel('report')}>Modifier</Btn>}
            </div>
          ) : isCoach ? (
            <>
              <p className="text-sm text-slate-500 mb-3">Partagez un court bilan et les prochaines actions avec votre client.</p>
              <Btn tone="primary" onClick={() => setPanel('report')}><FileText className="w-4 h-4" /> Rédiger le compte rendu</Btn>
            </>
          ) : (
            <p className="text-sm text-slate-500">Votre coach n'a pas encore partagé de compte rendu.</p>
          )}
          {isClient && !booking.hasReview && (
            <div className="mt-3">
              <Btn onClick={() => setReviewModalBooking(booking)}>Laisser un avis</Btn>
            </div>
          )}
        </Section>
      )}

      {/* Report de séance */}
      {booking.bookingStatus === 'confirmed' && !pendingRequest && (
        <Section title="Changer d'horaire" icon={<CalendarClock className="w-4 h-4 text-fmc-green-ink" />}>
          {panel === 'reschedule' ? (
            <div className="space-y-3">
              {freeSlots.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Aucun autre créneau libre pour l'instant.{isCoach ? ' Ajoutez des disponibilités puis revenez ici.' : ' Écrivez au coach via la conversation.'}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {freeSlots.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setNewSlotId(s.id)}
                      className={`min-h-12 rounded-2xl border text-sm font-semibold px-2 cursor-pointer ${
                        newSlotId === s.id ? 'border-fmc-green bg-fmc-green/10' : 'border-fmc-line dark:border-slate-700'
                      }`}
                    >
                      {formatDateFr(s.date)} • {s.startTime}
                    </button>
                  ))}
                </div>
              )}
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={500}
                placeholder="Message (facultatif)"
                className="w-full h-12 px-3 rounded-xl bg-white dark:bg-slate-900 border border-fmc-line dark:border-slate-700 text-[15px] focus:outline-none focus:ring-2 focus:ring-fmc-green/50"
              />
              <p className="text-xs text-slate-500">
                Même coach, même type de séance, même prix — aucun nouveau paiement. {isClient ? 'Le coach' : 'Votre client'} doit accepter.
              </p>
              <div className="flex gap-2">
                <Btn onClick={() => setPanel(null)}>Annuler</Btn>
                <Btn tone="primary" disabled={!newSlotId || busy === 'reschedule'} onClick={submitReschedule}>
                  {busy === 'reschedule' && <Loader2 className="w-4 h-4 animate-spin" />} Proposer ce créneau
                </Btn>
              </div>
            </div>
          ) : canReschedule ? (
            <Btn onClick={() => setPanel('reschedule')}><CalendarClock className="w-4 h-4" /> Proposer un autre créneau</Btn>
          ) : (
            <p className="text-sm text-slate-500">
              Le report en ligne est possible jusqu'à {RESCHEDULE_MIN_HOURS} h avant la séance. Contactez {partnerName} via la conversation.
            </p>
          )}
        </Section>
      )}

      {/* Historique des reports */}
      {history.length > 0 && (
        <Section title="Historique" icon={<History className="w-4 h-4 text-slate-500" />}>
          <ul className="space-y-2">
            {history.map((r) => (
              <li key={r.id} className="text-sm">
                <span className="font-semibold">
                  {r.status === 'accepted' ? 'Déplacée' : r.status === 'declined' ? 'Report refusé' : 'Demande retirée'}
                </span>{' '}
                — du {formatDateFr(r.oldDate)} {r.oldStart} au {formatDateFr(r.newDate)} {r.newStart}
                <span className="block text-xs text-slate-500">
                  Demandé par {r.requesterRole === 'client' ? 'le client' : 'le coach'} le {new Date(r.createdAt).toLocaleDateString('fr-FR')}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Détail du prix */}
      <Section title="Paiement" icon={<CreditCard className="w-4 h-4 text-slate-500" />}>
        <dl className="text-sm space-y-1.5">
          <div className="flex justify-between"><dt>Séance</dt><dd className="tabular-nums">{formatEuro(booking.price)}</dd></div>
          {!!booking.travelFee && <div className="flex justify-between"><dt>Frais de déplacement</dt><dd className="tabular-nums">{formatEuro(booking.travelFee)}</dd></div>}
          <div className="flex justify-between"><dt>Frais de service</dt><dd className="tabular-nums">{formatEuro(booking.serviceFee)}</dd></div>
          <div className="flex justify-between"><dt>Taxes</dt><dd className="tabular-nums">{formatEuro(booking.taxes)}</dd></div>
          <div className="flex justify-between font-bold pt-1.5 border-t border-fmc-line dark:border-slate-800"><dt>Total</dt><dd className="tabular-nums">{formatEuro(booking.total)}</dd></div>
        </dl>
        <p className="text-xs text-slate-500 mt-2">
          {booking.paymentStatus === 'refunded' ? 'Remboursé.' : booking.paymentStatus === 'paid' ? `Payé — ${booking.paymentMethod ?? 'carte bancaire'}.` : 'Non payé.'}
        </p>
      </Section>

      {/* Signalements */}
      {booking.bookingStatus !== 'pending' && (
        <Section title="Un problème ?" icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}>
          {issues.length > 0 && (
            <ul className="mb-3 space-y-1.5">
              {issues.map((i) => (
                <li key={i.id} className="text-sm flex justify-between gap-2">
                  <span>{ISSUE_LABELS[i.category]}</span>
                  <span className="text-xs font-semibold text-slate-500">{ISSUE_STATUS_LABELS[i.status]}</span>
                </li>
              ))}
            </ul>
          )}
          {panel === 'issue' ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(ISSUE_LABELS) as IssueCategory[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setIssueCat(k)}
                    className={`min-h-11 px-3 rounded-full text-sm font-semibold border cursor-pointer ${
                      issueCat === k ? 'border-fmc-green bg-fmc-green/10' : 'border-fmc-line dark:border-slate-700'
                    }`}
                  >
                    {ISSUE_LABELS[k]}
                  </button>
                ))}
              </div>
              <textarea
                value={issueText}
                onChange={(e) => setIssueText(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Décrivez ce qui s'est passé…"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-fmc-line dark:border-slate-700 text-[15px] focus:outline-none focus:ring-2 focus:ring-fmc-green/50"
              />
              <div className="flex gap-2">
                <Btn onClick={() => setPanel(null)}>Annuler</Btn>
                <Btn tone="dark" disabled={busy === 'issue'} onClick={submitIssue}>
                  {busy === 'issue' && <Loader2 className="w-4 h-4 animate-spin" />} Envoyer le signalement
                </Btn>
              </div>
            </div>
          ) : (
            <Btn onClick={() => setPanel('issue')}><AlertTriangle className="w-4 h-4" /> Signaler un problème</Btn>
          )}
        </Section>
      )}

      {/* Actions de fin */}
      <div className="flex flex-wrap gap-2 mt-2">
        {isCoach && booking.bookingStatus === 'confirmed' && (
          <Btn
            tone="primary"
            disabled={!started}
            title={started ? undefined : 'Disponible une fois la séance commencée'}
            onClick={() => {
              if (window.confirm('Confirmer que la séance a bien eu lieu ?')) {
                completeBooking(booking.id);
                setFlash({ ok: true, text: 'Séance marquée comme effectuée. Vous pouvez rédiger le compte rendu.' });
              }
            }}
          >
            <CheckCircle2 className="w-4 h-4" /> Marquer comme effectuée
          </Btn>
        )}
        {booking.bookingStatus === 'confirmed' && (
          <Btn tone="danger" disabled={busy === 'cancel'} onClick={doCancel}>
            {busy === 'cancel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} Annuler la séance
          </Btn>
        )}
      </div>
      {isCoach && booking.bookingStatus === 'confirmed' && !started && (
        <p className="text-xs text-slate-500 mt-2">« Marquer comme effectuée » sera disponible à l'heure de la séance. Rien n'est validé automatiquement.</p>
      )}
    </Screen>
  );
};
