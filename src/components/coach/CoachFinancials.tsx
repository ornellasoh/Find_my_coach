import React, { useEffect, useState } from 'react';
import { isSupabaseEnabled } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';
import { ScreenHeader, formatEuro, formatDateFr } from '../ui/fmc';
import { 
  ArrowLeft, 
  Wallet, 
  ArrowDownLeft, 
  CheckCircle2, 
  Clock, 
  Building, 
  CreditCard, 
  Download, 
  Sparkles, 
  ShieldCheck,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { fetchStripeStatus, openCoachStripe, type StripeAccountStatus } from '../../lib/payments';

export const CoachFinancials: React.FC = () => {
  const { 
    currentUser, 
    coaches, 
    payouts, 
    requestPayout, 
    goBack,
    isOnline
  } = useApp();

  const coachProfile = coaches.find(c => c.userId === currentUser?.id) || (isSupabaseEnabled ? undefined : coaches[0]);
  const coachPayouts = payouts.filter(p => p.coachId === coachProfile?.id);

  const totalEarnedNet = coachPayouts
    .filter(p => p.status === 'paid')
    .reduce((acc, p) => acc + p.netAmount, 0);

  const pendingNet = coachPayouts
    .filter(p => p.status === 'pending')
    .reduce((acc, p) => acc + p.netAmount, 0);

  const availableForPayout = totalEarnedNet;

  const [payoutRequested, setPayoutRequested] = useState(false);

  // Paiements Stripe Connect (mode en ligne)
  const [stripeStatus, setStripeStatus] = useState<StripeAccountStatus | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState('');
  const refreshStripe = () => {
    if (isOnline && coachProfile) fetchStripeStatus(coachProfile.id).then(setStripeStatus);
  };
  useEffect(refreshStripe, [isOnline, coachProfile?.id]);
  const handleStripe = async () => {
    setStripeError('');
    setStripeLoading(true);
    try {
      await openCoachStripe(() => {
        setStripeLoading(false);
        refreshStripe();
      });
    } catch (err) {
      setStripeError((err as Error).message);
      setStripeLoading(false);
    }
  };
  const [iban, setIban] = useState('FR76 3000 4000 5000 6000 7000 890');
  const [isEditingIban, setIsEditingIban] = useState(false);

  const handlePayout = () => {
    requestPayout(coachProfile.id, availableForPayout);
    setPayoutRequested(true);
    setTimeout(() => setPayoutRequested(false), 5000);
  };

  return (
    <div className="min-h-screen bg-fmc-bg dark:bg-[#0B0F19] text-fmc-navy dark:text-slate-100 pb-32 max-w-md mx-auto px-5 pt-4">
      <ScreenHeader title="Revenus et versements" onBack={goBack} />

      {/* Encaissements Stripe */}
      {isOnline && (
        <div className={`rounded-3xl p-5 mb-4 border ${stripeStatus?.charges_enabled ? 'bg-white border-slate-200' : 'bg-fmc-green/10 border-[#00D664]/40'}`}>
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#1C1C1C] text-[#00D664] flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-fmc-navy">
                {stripeStatus?.charges_enabled
                  ? 'Paiements activés'
                  : stripeStatus?.details_submitted
                  ? 'Vérification Stripe en cours'
                  : 'Activez vos paiements'}
              </h2>
              <p className="text-sm text-slate-600 mt-1 leading-snug">
                {stripeStatus?.charges_enabled
                  ? 'Vos séances payées sont versées automatiquement sur votre compte bancaire (commission Find My Coach déduite).'
                  : 'Renseignez votre identité et votre IBAN via Stripe pour recevoir l’argent de vos séances. 5 minutes, sécurisé.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleStripe}
            disabled={stripeLoading}
            className="w-full h-12 mt-4 rounded-full bg-fmc-green text-fmc-navy font-bold text-sm disabled:opacity-50 cursor-pointer"
          >
            {stripeLoading ? 'Ouverture de Stripe…' : stripeStatus?.details_submitted ? 'Mon tableau de bord Stripe' : 'Activer les paiements avec Stripe'}
          </button>
          {stripeError && <p className="text-sm text-rose-500 mt-2">{stripeError}</p>}
        </div>
      )}

      {/* Main Balance Card */}
      <div className="bg-[#0F172A] text-white rounded-3xl p-5 shadow-lg mb-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-fmc-green/10 rounded-full blur-2xl pointer-events-none" />
        
        <span className="text-xs font-bold text-slate-400 block">
          {isOnline ? 'Revenus nets des séances effectuées' : 'Solde disponible au virement'}
        </span>
        <div className="text-3xl font-bold text-white mt-1 mb-3">
          {formatEuro(availableForPayout)}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800 text-xs">
          <div>
            <span className="text-slate-400 block">En attente (séances à venir)</span>
            <span className="text-amber-400 font-bold">{formatEuro(pendingNet)}</span>
          </div>
          <div>
            <span className="text-slate-400 block">{isOnline ? 'Total des séances effectuées' : 'Total versé à ce jour'}</span>
            <span className="text-[#00FD83] font-bold">{formatEuro(totalEarnedNet)}</span>
          </div>
        </div>

        {/* Virement manuel : mode démo uniquement (en ligne, Stripe reverse automatiquement) */}
        {!isOnline && (
        <button
          onClick={handlePayout}
          disabled={payoutRequested || availableForPayout <= 0}
          className={`w-full mt-4 py-3 rounded-2xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md ${
            payoutRequested
              ? 'bg-[#00B050] text-fmc-navy'
              : 'bg-fmc-green text-fmc-navy'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
          <span>{payoutRequested ? 'Demande de virement envoyée' : 'Demander le virement SEPA'}</span>
        </button>
        )}
      </div>

      {/* Commission Transparency Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-fmc-line/80 dark:border-slate-800 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-4 h-4 text-[#00B050]" />
          <h2 className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">
            Modèle de rémunération transparent
          </h2>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed mb-3">
          Vous percevez <strong className="text-[#008A3E]">85% du tarif brut</strong> de chaque séance. La commission de 15 % couvre le paiement sécurisé, les frais bancaires et le fonctionnement de la plateforme. Les virements sont faits automatiquement par Stripe sur le compte bancaire que vous avez renseigné.
        </p>

        <div className="bg-slate-50 rounded-xl p-2.5 flex items-center justify-between text-xs border border-slate-200/80 font-bold">
          <span className="text-slate-600">Exemple, séance à 85 € :</span>
          <span className="text-[#008A3E]">Net perçu = 72,25 €</span>
        </div>
      </div>

      {!isOnline && (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-fmc-line/80 dark:border-slate-800 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-slate-700" />
            <h2 className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">
              Compte bancaire de versement
            </h2>
          </div>
          <button
            onClick={() => setIsEditingIban(!isEditingIban)}
            className="text-xs font-bold text-[#008A3E] hover:underline cursor-pointer"
          >
            {isEditingIban ? 'Valider' : 'Modifier'}
          </button>
        </div>

        {isEditingIban ? (
          <input
            type="text"
            value={iban}
            onChange={(e) => setIban(e.target.value)}
            className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#00D664]"
          />
        ) : (
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span className="font-mono text-xs text-slate-700 font-bold">{iban}</span>
            <span className="text-[10px] bg-emerald-100 text-[#008A3E] px-2 py-0.5 rounded-md font-bold">
              Actif
            </span>
          </div>
        )}
      </div>
      )}

      {/* Transaction History */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-fmc-line/80 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-fmc-navy">Historique des transactions</h2>
          <span className="text-xs text-slate-400 font-bold">{coachPayouts.length} lignes</span>
        </div>

        {coachPayouts.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">Aucune transaction enregistrée.</p>
        ) : (
          <div className="space-y-2.5">
            {coachPayouts.map((t) => (
              <div
                key={t.id}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-fmc-navy">{t.clientName}</h4>
                  <p className="text-[11px] text-slate-500 font-medium">{t.sessionTitle}</p>
                  <span className="text-[10px] text-slate-400">{formatDateFr(t.date)}</span>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-fmc-navy">+{formatEuro(t.netAmount)}</div>
                  <span
                    className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                      t.status === 'paid'
                        ? 'bg-emerald-100 text-[#008A3E]'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {t.status === 'paid' ? (isOnline ? 'Séance effectuée' : 'Versé') : 'Séance à venir'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
