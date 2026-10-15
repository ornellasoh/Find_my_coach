import React from 'react';
import { Repeat, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { isSupabaseEnabled } from '../../lib/supabase';
import { Avatar } from '../ui/Avatar';
import { Card, IconTile, Screen, ScreenHeader, SectionHeader, formatEuro } from '../ui/fmc';
import { useApp } from '../../context/AppContext';

/** Part du coach sur le tarif d'une séance (commission Find My Coach de 15 %). */
const COACH_SHARE = 0.85;
const MONTHS = 6;

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/** Statistiques du coach : revenus des derniers mois, fidélisation et clients réguliers. */
export const CoachStats: React.FC = () => {
  const { currentUser, coaches, bookings, goBack } = useApp();
  const coach = coaches.find((c) => c.userId === currentUser?.id) || (isSupabaseEnabled ? undefined : coaches[0]);

  // Seules les séances effectuées comptent (ni annulées, ni à venir)
  const done = bookings.filter((b) => b.coachId === coach?.id && b.bookingStatus === 'completed');
  const net = (price: number) => price * COACH_SHARE;

  // Revenus nets des 6 derniers mois, du plus ancien au mois en cours
  const now = new Date();
  const months = Array.from({ length: MONTHS }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (MONTHS - 1 - i), 1);
    return { key: monthKey(d), label: d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''), total: 0, count: 0 };
  });
  for (const b of done) {
    const m = months.find((x) => x.key === b.date.slice(0, 7));
    if (m) {
      m.total += net(b.price);
      m.count += 1;
    }
  }
  const max = Math.max(...months.map((m) => m.total), 1);
  const current = months[MONTHS - 1];
  const previous = months[MONTHS - 2];
  const trend = previous.total > 0 ? Math.round(((current.total - previous.total) / previous.total) * 100) : null;

  // Clients : séances effectuées et revenus par client
  const byClient = new Map<string, { id: string; name: string; avatar: string; count: number; total: number }>();
  for (const b of done) {
    const c = byClient.get(b.clientId) ?? { id: b.clientId, name: b.clientName, avatar: b.clientAvatar, count: 0, total: 0 };
    c.count += 1;
    c.total += net(b.price);
    byClient.set(b.clientId, c);
  }
  const clients = [...byClient.values()];
  const regulars = clients.filter((c) => c.count >= 2);
  const loyalty = clients.length ? Math.round((regulars.length / clients.length) * 100) : 0;
  const totalNet = done.reduce((sum, b) => sum + net(b.price), 0);
  const average = done.length ? totalNet / done.length : 0;
  const top = [...clients].sort((a, b) => b.count - a.count || b.total - a.total).slice(0, 3);

  const tiles = [
    { label: 'Séances effectuées', value: String(done.length) },
    { label: 'Clients', value: String(clients.length) },
    { label: 'Clients réguliers', value: String(regulars.length), hint: '2 séances ou plus' },
    { label: 'Revenu moyen', value: formatEuro(average, false), hint: 'par séance' },
  ];

  return (
    <Screen>
      <ScreenHeader title="Statistiques" onBack={goBack} />

      {/* Revenus du mois et des 6 derniers mois */}
      <Card className="p-5 mb-4">
        <p className="text-sm text-slate-500">Revenus nets ce mois-ci</p>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-3xl font-bold tabular-nums">{formatEuro(current.total, false)}</span>
          {trend !== null && (
            <span className={`text-sm font-semibold flex items-center gap-1 ${trend >= 0 ? 'text-fmc-green-ink dark:text-fmc-green' : 'text-rose-500'}`}>
              {trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="tabular-nums">{trend >= 0 ? '+' : ''}{trend} %</span>
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          {current.count} séance{current.count > 1 ? 's' : ''} · commission de 15 % déduite
        </p>

        <div className="flex items-end gap-2 h-32 mt-5" role="img" aria-label={`Revenus nets des ${MONTHS} derniers mois`}>
          {months.map((m, i) => (
            <div key={m.key} className="flex-1 h-full flex flex-col items-center justify-end gap-1.5" title={`${m.label} : ${formatEuro(m.total, false)}`}>
              <div
                className={`w-full max-w-9 rounded-t-md ${i === MONTHS - 1 ? 'bg-fmc-green' : 'bg-fmc-green/35'}`}
                style={{ height: `${Math.max((m.total / max) * 100, m.total > 0 ? 4 : 1.5)}%` }}
              />
              <span className={`text-[11px] ${i === MONTHS - 1 ? 'font-semibold' : 'text-slate-500'}`}>{m.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* L'essentiel depuis le début */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {tiles.map((t) => (
          <Card key={t.label} className="p-4">
            <span className="block text-2xl font-bold tabular-nums">{t.value}</span>
            <span className="block text-sm text-slate-600 dark:text-slate-300 mt-0.5">{t.label}</span>
            {t.hint && <span className="block text-xs text-slate-500">{t.hint}</span>}
          </Card>
        ))}
      </div>

      {/* Fidélisation */}
      <Card className="p-4 mb-6 flex items-center gap-3">
        <IconTile><Repeat className="w-5 h-5" /></IconTile>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[15px] font-semibold">Fidélisation</span>
            <span className="text-lg font-bold tabular-nums">{loyalty} %</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 mt-2 overflow-hidden" role="progressbar" aria-valuenow={loyalty} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-fmc-green" style={{ width: `${loyalty}%` }} />
          </div>
          <p className="text-xs text-slate-500 mt-2">Part de vos clients revenus pour au moins une deuxième séance.</p>
        </div>
      </Card>

      {/* Meilleurs clients */}
      <section>
        <SectionHeader title="Vos clients les plus fidèles" />
        {top.length === 0 ? (
          <Card className="p-5 text-center">
            <Users className="w-6 h-6 mx-auto text-slate-400" />
            <p className="text-sm text-slate-500 mt-2">Vos statistiques apparaîtront après vos premières séances effectuées.</p>
          </Card>
        ) : (
          <Card className="divide-y divide-fmc-line/80 dark:divide-slate-800">
            {top.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-4">
                <Avatar src={c.avatar} name={c.name} className="w-10 h-10 rounded-full" />
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] font-semibold truncate">{c.name}</span>
                  <span className="block text-sm text-slate-500 tabular-nums">
                    {c.count} séance{c.count > 1 ? 's' : ''}
                  </span>
                </span>
                <span className="text-[15px] font-semibold tabular-nums">{formatEuro(c.total, false)}</span>
              </div>
            ))}
          </Card>
        )}
      </section>
    </Screen>
  );
};
