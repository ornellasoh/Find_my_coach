import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
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

export const CoachFinancials: React.FC = () => {
  const { 
    currentUser, 
    coaches, 
    payouts, 
    requestPayout, 
    goBack 
  } = useApp();

  const coachProfile = coaches.find(c => c.userId === currentUser?.id) || coaches[0];
  const coachPayouts = payouts.filter(p => p.coachId === coachProfile?.id);

  const totalEarnedNet = coachPayouts
    .filter(p => p.status === 'paid')
    .reduce((acc, p) => acc + p.netAmount, 0);

  const pendingNet = coachPayouts
    .filter(p => p.status === 'pending')
    .reduce((acc, p) => acc + p.netAmount, 0);

  const availableForPayout = totalEarnedNet > 0 ? totalEarnedNet : 153.0; // demo available amount

  const [payoutRequested, setPayoutRequested] = useState(false);
  const [iban, setIban] = useState('FR76 3000 4000 5000 6000 7000 890');
  const [isEditingIban, setIsEditingIban] = useState(false);

  const handlePayout = () => {
    requestPayout(coachProfile.id, availableForPayout);
    setPayoutRequested(true);
    setTimeout(() => setPayoutRequested(false), 5000);
  };

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

        <h1 className="text-base font-extrabold text-[#0F172A]">Revenus & Versements</h1>

        <div className="w-10" />
      </div>

      {/* Main Balance Card */}
      <div className="bg-[#0F172A] text-white rounded-3xl p-5 shadow-lg mb-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00D664]/10 rounded-full blur-2xl pointer-events-none" />
        
        <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
          Solde Disponible au virement
        </span>
        <div className="text-3xl font-black text-white mt-1 mb-3">
          {availableForPayout.toFixed(2)} €
        </div>

        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800 text-xs">
          <div>
            <span className="text-slate-400 block">En attente (séances à venir)</span>
            <span className="text-amber-400 font-black">{pendingNet.toFixed(2)} €</span>
          </div>
          <div>
            <span className="text-slate-400 block">Total versé à ce jour</span>
            <span className="text-[#00FD83] font-black">{totalEarnedNet.toFixed(2)} €</span>
          </div>
        </div>

        {/* Payout Trigger CTA */}
        <button
          onClick={handlePayout}
          disabled={payoutRequested || availableForPayout <= 0}
          className={`w-full mt-4 py-3 rounded-2xl font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md ${
            payoutRequested
              ? 'bg-[#00B050] text-[#0F172A]'
              : 'bg-[#00D664] hover:bg-[#00B050] text-[#0F172A]'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
          <span>{payoutRequested ? 'Demande de virement envoyée ✅' : 'Demander le virement SEPA'}</span>
        </button>
      </div>

      {/* Commission Transparency Card */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs mb-4">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-4 h-4 text-[#00B050]" />
          <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
            Modèle de rémunération transparent
          </h2>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed mb-3">
          Vous percevez <strong className="text-[#008A3E]">85% du tarif brut</strong> de chaque séance. La commission de 15% couvre la garantie de paiement, l’assurance professionnelle Allianz, les frais bancaires et l’infrastructure visio HD.
        </p>

        <div className="bg-slate-50 rounded-xl p-2.5 flex items-center justify-between text-xs border border-slate-200/80 font-bold">
          <span className="text-slate-600">Sur une séance à 85 € :</span>
          <span className="text-[#008A3E]">Net perçu = 72,25 €</span>
        </div>
      </div>

      {/* Bank Account / IBAN Management */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-slate-700" />
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
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

      {/* Transaction History */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-[#0F172A]">Historique des transactions</h2>
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
                  <h4 className="text-xs font-extrabold text-[#0F172A]">{t.clientName}</h4>
                  <p className="text-[11px] text-slate-500 font-medium">{t.sessionTitle}</p>
                  <span className="text-[10px] text-slate-400">{t.date}</span>
                </div>

                <div className="text-right">
                  <div className="text-xs font-black text-[#0F172A]">+{t.netAmount.toFixed(2)} €</div>
                  <span
                    className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                      t.status === 'paid'
                        ? 'bg-emerald-100 text-[#008A3E]'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {t.status === 'paid' ? 'Versé ✓' : 'En attente'}
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
