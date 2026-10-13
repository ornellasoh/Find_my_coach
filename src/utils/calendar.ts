import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import type { Booking, SessionDetails } from '../types';
import { supabase } from '../lib/supabase';
import { openExternal } from './meeting';

/** Instant UTC d'une date + heure exprimées à l'heure de Paris (les séances sont toujours saisies ainsi). */
function parisToUtc(date: string, time: string): Date {
  const guess = Date.parse(`${date}T${time || '00:00'}:00Z`);
  const paris = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Paris',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(new Date(guess)).replace(' ', 'T');
  return new Date(guess - (Date.parse(`${paris}Z`) - guess));
}
/** 20261014T083000Z */
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');

interface CalendarEvent { uid: string; title: string; start: Date; end: Date; location: string; description: string }

function toEvent(b: Booking, details: SessionDetails | null | undefined, role: 'client' | 'coach'): CalendarEvent {
  const online = b.format === 'online' || b.sessionType?.format === 'online';
  const link = details?.meetingUrl || b.meetingLink || '';
  const place = online ? 'Visio' : details?.sessionAddress || b.location || '';
  return {
    uid: `${b.id}@findmycoach.io`,
    title: `Séance avec ${role === 'client' ? b.coachName : b.clientName}`,
    start: parisToUtc(b.date, b.startTime),
    end: parisToUtc(b.date, b.endTime),
    location: place,
    description: [b.sessionType?.name, link ? `Lien de la visio : ${link}` : '', 'Réservé avec Find My Coach'].filter(Boolean).join('\n'),
  };
}

/** Fichier .ics (rappel 1 h avant). */
export function buildIcs(e: CalendarEvent): string {
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Find My Coach//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${e.uid}`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(e.start)}`, `DTEND:${stamp(e.end)}`,
    `SUMMARY:${esc(e.title)}`, ...(e.location ? [`LOCATION:${esc(e.location)}`] : []), `DESCRIPTION:${esc(e.description)}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Séance dans 1 heure', 'TRIGGER:-PT1H', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Ajoute la séance au calendrier du téléphone.
 * - iPhone : feuille « Ajouter au calendrier » d'iOS (fichier .ics signé, servi par la fonction calendar-event).
 * - Android : Google Agenda, formulaire prérempli.
 * - Web : téléchargement du fichier .ics.
 */
export async function addToCalendar(b: Booking, details: SessionDetails | null | undefined, role: 'client' | 'coach'): Promise<void> {
  const event = toEvent(b, details, role);
  const platform = Capacitor.getPlatform();

  if (platform === 'ios' && supabase) {
    const { data, error } = await supabase.functions.invoke('calendar-event', { body: { booking_id: b.id } });
    if (error || !data?.url) throw new Error('Ajout au calendrier indisponible pour le moment.');
    await Browser.open({ url: data.url, presentationStyle: 'popover' });
    return;
  }

  if (platform === 'android') {
    const q = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      dates: `${stamp(event.start)}/${stamp(event.end)}`,
      details: event.description,
      ...(event.location ? { location: event.location } : {}),
    });
    await openExternal(`https://calendar.google.com/calendar/render?${q}`);
    return;
  }

  const url = URL.createObjectURL(new Blob([buildIcs(event)], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `seance-findmycoach-${b.date}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
