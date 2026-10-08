import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ArrowLeft, 
  ShieldCheck, 
  CreditCard, 
  Lock, 
  Calendar, 
  Clock, 
  Video, 
  MapPin,
  Tag, 
  Check, 
  AlertCircle,
  Sparkles,
  Smartphone,
  CheckCircle2,
  CalendarCheck,
  PlusCircle,
  Wallet
} from 'lucide-react';
import { Card, IconTile, PrimaryButton, ScreenHeader, StickyAction, formatDateFr, formatEuro } from '../ui/fmc';

type PaymentMethodId = 'card' | 'apple_pay' | 'google_pay';

export const CheckoutPayment: React.FC = () => {
  const { bookingDraft, goBack, navigateTo, createBooking, currentUser } = useApp();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>('card');
  const [showCardForm, setShowCardForm] = useState(false);
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/26');
  const [cardCvc, setCardCvc] = useState('888');
  const [cardHolder, setCardHolder] = useState(currentUser?.name || 'Alex Dupont');
  const [promoCode, setPromoCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!bookingDraft) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#F6F9FA]">
        <AlertCircle className="w-12 h-12 text-amber-500 mb-2" />
        <h2 className="text-lg font-bold text-slate-800">Aucune réservation en cours</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">Veuillez choisir un coach et un créneau horaire.</p>
        <button
          onClick={() => navigateTo('home')}
          className="h-12 px-6 bg-fmc-green text-fmc-navy font-bold text-sm rounded-full"
        >
          Retour à l'accueil
        </button>
      </div>
    );
  }

  const { coach, selectedDate, selectedSlot, sessionType, basePrice, serviceFee, taxes } = bookingDraft;
  const subtotal = basePrice + serviceFee + taxes;
  const finalTotal = Math.max(0, Number((subtotal - appliedDiscount).toFixed(2)));

  const handleApplyPromo = () => {
    setPromoError('');
    setPromoSuccess('');
    const code = promoCode.trim().toUpperCase();
    if (code === 'FMC10') {
      setAppliedDiscount(10);
      setPromoSuccess('Code FMC10 appliqué : −10,00 €');
    } else if (code === 'WELCOME20') {
      const disc = Number((basePrice * 0.2).toFixed(2));
      setAppliedDiscount(disc);
      setPromoSuccess(`Code WELCOME20 appliqué : −${formatEuro(disc)}`);
    } else {
      setPromoError('Code invalide. Essayez "FMC10" ou "WELCOME20"');
    }
  };

  const handleProcessPayment = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    setIsProcessing(true);

    setTimeout(() => {
      const updatedDraft = {
        ...bookingDraft,
        total: finalTotal
      };
      const confirmedBooking = createBooking(
        updatedDraft, 
        paymentMethod === 'card'
          ? `Carte bancaire (•••• ${cardNumber.replace(/\D/g, '').slice(-4) || '4242'})`
          : paymentMethod === 'apple_pay'
          ? 'Apple Pay'
          : 'Google Pay'
      );
      setIsProcessing(false);
      navigateTo('confirmation', { bookingId: confirmedBooking.id });
    }, 1000);
  };

  const methods: { id: PaymentMethodId; title: string; subtitle: string; icon: React.ReactNode }[] = [
    { id: 'card', title: 'Carte bancaire', subtitle: `•••• ${cardNumber.replace(/\D/g, '').slice(-4) || '4242'}`, icon: <CreditCard className="w-5 h-5" /> },
    { id: 'apple_pay', title: 'Apple Pay', subtitle: 'Paiement express', icon: <Wallet className="w-5 h-5" /> },
    { id: 'google_pay', title: 'Google Pay', subtitle: 'Rapide et sécurisé', icon: <Smartphone className="w-5 h-5" /> },
  ];

  const inputCls =
    'w-full h-12 px-4 bg-fmc-bg dark:bg-slate-800 rounded-2xl text-[15px] focus:outline-none focus:ring-2 focus:ring-fmc-green/50';

  return (
    <div className="min-h-screen bg-fmc-bg dark:bg-[#0B0F19] text-fmc-navy dark:text-slate-100 pb-36 max-w-md mx-auto px-5 pt-4">
      <ScreenHeader title="Paiement" onBack={goBack} />

      {/* Séance */}
      <Card className="p-5 flex items-center gap-4 mb-8">
        <img src={coach.photo} alt={coach.name} className="w-[70px] h-[70px] rounded-[20px] object-cover bg-slate-100 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-fmc-green-ink truncate">{sessionType.name}</p>
          <h2 className="text-lg font-semibold leading-tight truncate mt-0.5">Coach {coach.name}</h2>
          <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1 tabular-nums">
            <CalendarCheck className="w-4 h-4 shrink-0" />
            {formatDateFr(selectedDate, { day: 'numeric', month: 'short', year: 'numeric' })} • {selectedSlot.startTime}
          </p>
        </div>
      </Card>

      {/* Moyens de paiement */}
      <h2 className="text-base font-semibold mb-3">Mode de paiement</h2>
      <div className="space-y-3">
        {methods.map((m) => {
          const isSelected = paymentMethod === m.id;
          return (
            <Card
              key={m.id}
              id={`pay-method-${m.id}`}
              selected={isSelected}
              onClick={() => setPaymentMethod(m.id)}
              className="p-4 flex items-center gap-4 cursor-pointer"
            >
              <IconTile tone="outline">{m.icon}</IconTile>
              <span className="flex-1 min-w-0">
                <span className="font-semibold block">{m.title}</span>
                <span className="text-sm text-slate-500 block tabular-nums">{m.subtitle}</span>
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

      {paymentMethod === 'card' && (
        <>
          <button
            type="button"
            onClick={() => setShowCardForm((v) => !v)}
            className="w-full h-12 mt-2 text-sm font-semibold text-fmc-green-ink flex items-center justify-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-5 h-5" />
            {showCardForm ? 'Masquer la carte' : 'Ajouter / modifier la carte'}
          </button>
          {showCardForm && (
            <Card className="p-4 space-y-3 mb-2">
              <input id="input-card-holder" aria-label="Titulaire" value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} placeholder="Titulaire de la carte" className={inputCls} />
              <input id="input-card-number" aria-label="Numéro de carte" inputMode="numeric" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="Numéro de carte" className={inputCls} />
              <div className="grid grid-cols-2 gap-3">
                <input id="input-card-expiry" aria-label="Expiration" value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} placeholder="MM/AA" className={inputCls} />
                <input id="input-card-cvc" aria-label="CVC" inputMode="numeric" value={cardCvc} onChange={(e) => setCardCvc(e.target.value)} placeholder="CVC" className={inputCls} />
              </div>
            </Card>
          )}
        </>
      )}

      {/* Code promo */}
      <div className="flex items-center gap-2 mt-4 mb-1">
        <div className="relative flex-1">
          <Tag className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            id="input-promo-code"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="Code promo"
            className="w-full h-12 pl-10 pr-4 bg-white dark:bg-slate-900 rounded-2xl border border-fmc-line/80 dark:border-slate-800 text-[15px] uppercase placeholder:normal-case focus:outline-none focus:ring-2 focus:ring-fmc-green/50"
          />
        </div>
        <button
          type="button"
          onClick={handleApplyPromo}
          className="h-12 px-5 rounded-2xl bg-fmc-dark text-white text-sm font-semibold cursor-pointer active:scale-95 transition"
        >
          Appliquer
        </button>
      </div>
      {promoSuccess && <p className="text-sm text-fmc-green-ink font-medium mt-1">{promoSuccess}</p>}
      {promoError && <p className="text-sm text-rose-500 font-medium mt-1">{promoError}</p>}

      {/* Résumé */}
      <Card className="p-6 mt-6">
        <h2 className="text-base font-semibold mb-5">Résumé de la réservation</h2>
        <dl className="space-y-3.5 text-[15px]">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Tarif de la séance ({sessionType.durationMinutes} min)</dt>
            <dd className="tabular-nums">{formatEuro(basePrice)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Frais de service</dt>
            <dd className="tabular-nums">{formatEuro(serviceFee)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Taxes</dt>
            <dd className="tabular-nums">{formatEuro(taxes)}</dd>
          </div>
          {appliedDiscount > 0 && (
            <div className="flex justify-between gap-4 text-fmc-green-ink font-medium">
              <dt>Remise</dt>
              <dd className="tabular-nums">−{formatEuro(appliedDiscount)}</dd>
            </div>
          )}
        </dl>
        <div className="h-px bg-fmc-line dark:bg-slate-800 my-6" />
        <div className="flex items-center justify-between">
          <span className="text-xl font-semibold">Montant total</span>
          <span className="text-2xl font-bold text-fmc-green-ink tabular-nums">{formatEuro(finalTotal)}</span>
        </div>
      </Card>

      <p className="text-xs text-slate-500 text-center mt-4 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-4 h-4 text-fmc-green-ink" />
        Paiement sécurisé · Annulation gratuite jusqu'à 24 h avant
      </p>

      <StickyAction>
        <PrimaryButton
          id="btn-process-payment"
          gradient
          disabled={isProcessing}
          onClick={handleProcessPayment}
          icon={<Lock className="w-5 h-5" />}
        >
          {isProcessing ? 'Validation du paiement…' : `Payer maintenant • ${formatEuro(finalTotal)}`}
        </PrimaryButton>
      </StickyAction>
    </div>
  );
};
