import { NumberInput } from '../ui/NumberInput';
import { zoneDescription } from '../../utils/coachTrust';
import React, { useEffect, useRef, useState } from 'react';
import { isSupabaseEnabled } from '../../lib/supabase';
import { realPhoto } from '../../utils/initials';
import { Avatar } from '../ui/Avatar';
import { uploadProfilePhoto } from '../../lib/photos';
import { ThemePicker } from '../common/ThemePicker';
import { DeleteAccount } from '../common/DeleteAccount';
import { useApp } from '../../context/AppContext';
import { ScreenHeader } from '../ui/fmc';
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  X, 
  Check, 
  ShieldCheck, 
  DollarSign, 
  MapPin, 
  Camera,
  Globe,
  Upload,
  FileCheck2,
  AlertCircle,
  Video,
  Layers,
  Sparkles,
  Home,
  Dumbbell,
  Trees,
  Building2,
  Wallet,
  ChevronRight
} from 'lucide-react';
import { CoachingFormat, CoachLevel } from '../../types';
import { CoachDocumentsPanel } from './CoachDocumentsPanel';
import { ShareProfileCard } from './ShareProfileCard';
import { fetchMyPrivateAddress } from '../../lib/sessions';
import { searchPlaces } from '../../utils/geo';
import { profileChecklist } from '../../utils/coachTrust';
import { AUDIENCE_OPTIONS, LEVEL_LABELS, OBJECTIVE_OPTIONS } from '../../utils/searchFilters';

export const CoachProfileEditor: React.FC = () => {
  const { 
    currentUser, 
    coaches, 
    updateCoachProfile, 
    updateCoachPhoto,
    availabilities,
    goBack,
    navigateTo,
    logout,
    loginAs
  } = useApp();
  
  const coach = coaches.find(c => c.userId === currentUser?.id) || (isSupabaseEnabled ? undefined : coaches[0]);

  const [title, setTitle] = useState(coach?.title || '');
  const [bio, setBio] = useState(coach?.bio || '');
  const [hourlyRate, setHourlyRate] = useState<number>(coach?.hourlyRate || 0);
  const [city, setCity] = useState(coach?.city || 'Paris');
  const [postalCode, setPostalCode] = useState(coach?.postalCode || '');
  const [address, setAddress] = useState(coach?.address || '');
  const [radiusKm, setRadiusKm] = useState(coach?.interventionRadiusKm || 15);
  
  const [experienceYears, setExperienceYears] = useState(coach?.experienceYears ?? 0);
  const [specialties, setSpecialties] = useState<string[]>(coach?.specialties || []);
  const [newSpecialty, setNewSpecialty] = useState('');
  const [certifications, setCertifications] = useState<string[]>(coach?.certifications || []);
  const [newCert, setNewCert] = useState('');
  const [videoLink, setVideoLink] = useState(coach?.videoLink || '');
  const [methods, setMethods] = useState(coach?.methods || '');
  const [objectives, setObjectives] = useState<string[]>(coach?.objectives || []);
  const [levels, setLevels] = useState<CoachLevel[]>(coach?.levels || []);
  const [audiences, setAudiences] = useState<string[]>(coach?.audiences || []);
  const [sessionIncludes, setSessionIncludes] = useState(coach?.sessionIncludes || '');
  const [prepInstructions, setPrepInstructions] = useState(coach?.prepInstructions || '');
  const [travelFee, setTravelFee] = useState<number>(coach?.travelFee ?? 0);
  const [docCount, setDocCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Adresse exacte : stockée à part (privée), jamais sur la fiche publique
  useEffect(() => {
    if (!coach) return;
    fetchMyPrivateAddress(coach.id).then((a) => { if (a) setAddress(a); }).catch(() => {});
  }, [coach?.id]);

  const toggleIn = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  // Formats & format prices
  const [formats, setFormats] = useState<CoachingFormat[]>(
    coach?.formats || ['online', 'coach_location', 'home']
  );
  const [homePrice, setHomePrice] = useState<number>(coach?.formatPrices?.home || 0);
  const [onlinePrice, setOnlinePrice] = useState<number>(coach?.formatPrices?.online || 0);
  const [gymPrice, setGymPrice] = useState<number>(coach?.formatPrices?.partner_gym || 0);

  // Document upload state
  const [feedback, setFeedback] = useState('');

  // Photo de profil
  const photoInput = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !coach || !currentUser) return;
    setPhotoBusy(true);
    setPhotoError('');
    try {
      const url = await uploadProfilePhoto(file, currentUser.id);
      updateCoachPhoto(coach.id, url);
      setFeedback('Photo de profil mise à jour');
      setTimeout(() => setFeedback(''), 3000);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "L'envoi de la photo a échoué.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const toggleFormat = (fmt: CoachingFormat) => {
    setFormats(prev => 
      prev.includes(fmt) ? prev.filter(f => f !== fmt) : [...prev, fmt]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coach) return;
    setSaveError('');
    if (!(hourlyRate >= 20 && hourlyRate <= 500)) {
      setSaveError('Indiquez un tarif de base entre 20 € et 500 € de l’heure.');
      return;
    }
    if (homePrice && !(homePrice >= 20 && homePrice <= 500)) {
      setSaveError('Le tarif à domicile doit être entre 20 € et 500 € de l’heure (ou laissé vide).');
      return;
    }
    setSaving(true);

    // Position publique = centre de la commune (zone approximative), à partir du code postal ou de la ville
    let coords: { latitude: number; longitude: number } | null = null;
    try {
      const [place] = await searchPlaces(/^\d{5}$/.test(postalCode.trim()) ? postalCode.trim() : city.trim());
      if (place) coords = { latitude: place.latitude, longitude: place.longitude };
    } catch { /* hors connexion : on garde la position actuelle */ }
    if (!coords && (city.trim() !== coach.city)) {
      setSaveError("Ville introuvable : vérifiez l'orthographe ou le code postal.");
      setSaving(false);
      return;
    }

    updateCoachProfile(coach.id, {
      ...(coords ?? {}),
      methods: methods.trim(),
      objectives,
      levels,
      audiences,
      sessionIncludes: sessionIncludes.trim(),
      prepInstructions: prepInstructions.trim(),
      travelFee: formats.includes('home') ? Math.min(100, Math.max(0, Number(travelFee) || 0)) : 0,
      title,
      bio,
      hourlyRate: Number(hourlyRate),
      city,
      postalCode,
      address,
      interventionRadiusKm: Number(radiusKm),
      interventionZone: zoneDescription({ city, interventionRadiusKm: radiusKm, formats }),
      experienceYears: Number(experienceYears),
      specialties,
      certifications,
      formats,
      formatPrices: {
        online: Number(onlinePrice),
        home: Number(homePrice),
        partner_gym: Number(gymPrice),
        coach_location: Number(hourlyRate)
      },
      videoLink,
      isOnlineCoaching: formats.includes('online'),
      isInPersonCoaching: formats.some(f => f !== 'online')
    });

    setSaving(false);
    setFeedback('Profil professionnel mis à jour avec succès !');
    setTimeout(() => setFeedback(''), 3000);
  };



  const addSpecialty = () => {
    if (newSpecialty.trim() && !specialties.includes(newSpecialty.trim())) {
      setSpecialties([...specialties, newSpecialty.trim()]);
      setNewSpecialty('');
    }
  };

  const removeSpecialty = (item: string) => {
    setSpecialties(specialties.filter(s => s !== item));
  };

  const addCert = () => {
    if (newCert.trim() && !certifications.includes(newCert.trim())) {
      setCertifications([...certifications, newCert.trim()]);
      setNewCert('');
    }
  };

  const removeCert = (item: string) => {
    setCertifications(certifications.filter(c => c !== item));
  };


  const pill = (active: boolean) =>
    `min-h-10 px-3 rounded-full text-xs font-bold border transition cursor-pointer ${active ? 'bg-fmc-green/15 border-[#00D664] text-[#008A3E]' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`;

  const checklist = coach
    ? profileChecklist(
        { ...coach, bio, methods, objectives, levels, audiences, sessionIncludes, formats, hourlyRate: Number(hourlyRate), city, interventionRadiusKm: Number(radiusKm), specialties },
        docCount > 0 || (coach.verificationStatus === 'verified'),
        availabilities.some((a) => a.coachId === coach.id && !a.isBooked && a.date >= new Date().toISOString().slice(0, 10)),
      )
    : [];
  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <div className="min-h-screen bg-fmc-bg dark:bg-[#0B0F19] text-fmc-navy dark:text-slate-100 pb-32 max-w-md mx-auto px-5 pt-4">
      <ScreenHeader title="Mon profil pro" onBack={goBack} />

      {/* Revenus : déplacés ici depuis la barre d'onglets (5 onglets au plus) */}
      <button
        type="button"
        id="btn-open-financials"
        onClick={() => navigateTo('coach_financials')}
        className="apple-press w-full mb-4 p-3.5 rounded-3xl bg-white dark:bg-slate-900 border border-fmc-line/80 dark:border-slate-800 flex items-center gap-3 text-left cursor-pointer"
      >
        <span className="w-11 h-11 rounded-2xl bg-[#E6FBEF] dark:bg-fmc-green/15 text-[#007A3D] dark:text-fmc-green flex items-center justify-center shrink-0">
          <Wallet className="w-5 h-5" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] font-semibold">Revenus et versements</span>
          <span className="block text-[13px] text-slate-500">Paiements Stripe, historique des séances</span>
        </span>
        <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
      </button>

      {feedback && (
        <div className="mb-4 p-3.5 bg-fmc-green/15 border border-[#00D664]/30 text-[#008A3E] text-xs font-bold rounded-2xl flex items-center gap-2 shadow-xs">
          <Check className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}

      <ShareProfileCard coach={coach} />

      {/* Profil à compléter */}
      {checklist.length > 0 && doneCount < checklist.length && (
        <details className="mb-4 bg-white dark:bg-slate-900 rounded-3xl p-4 border border-fmc-line/80 dark:border-slate-800" open={doneCount < 6}>
          <summary className="cursor-pointer text-sm font-bold flex items-center justify-between">
            <span>Profil complété à {Math.round((doneCount / checklist.length) * 100)} %</span>
            <span className="text-xs text-slate-500">{doneCount}/{checklist.length}</span>
          </summary>
          <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div className="h-full bg-fmc-green" style={{ width: `${(doneCount / checklist.length) * 100}%` }} />
          </div>
          <ul className="mt-3 space-y-1.5">
            {checklist.map((c) => (
              <li key={c.key} className={`text-xs flex items-center gap-2 ${c.done ? 'text-slate-400 line-through' : 'font-semibold'}`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center ${c.done ? 'bg-fmc-green text-white' : 'border border-slate-300'}`}>
                  {c.done && <Check className="w-3 h-3" />}
                </span>
                {c.label}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-slate-500 mt-2">Un profil complet inspire confiance et apparaît mieux dans les recherches.</p>
        </details>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {/* Photo de profil */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-fmc-line/80 dark:border-slate-800 flex items-center gap-4">
          <button
            type="button"
            onClick={() => photoInput.current?.click()}
            disabled={photoBusy}
            className="relative w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 cursor-pointer"
            aria-label="Changer la photo"
          >
            <Avatar src={coach?.photo} name={coach?.name || currentUser?.name} className="w-full h-full" />
            {photoBusy && (
              <span className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              </span>
            )}
          </button>
          <div className="flex-1 min-w-0">
            <span className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 block">Photo de profil</span>
            <p className="text-xs text-slate-500 mt-0.5 leading-snug">Visible par les clients sur votre fiche. Une photo nette de votre visage inspire confiance.</p>
            <button
              id="btn-change-photo"
              type="button"
              onClick={() => photoInput.current?.click()}
              disabled={photoBusy}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-fmc-green text-fmc-navy text-xs font-bold cursor-pointer disabled:opacity-60"
            >
              <Camera className="w-3.5 h-3.5" />
              {photoBusy ? 'Envoi…' : realPhoto(coach?.photo) ? 'Changer la photo' : 'Ajouter une photo'}
            </button>
            {photoError && <p className="text-[11px] text-rose-500 font-semibold mt-1.5">{photoError}</p>}
          </div>
          <input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
        </div>

        {/* Titre & Bio */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-fmc-line/80 dark:border-slate-800 space-y-3">
          <span className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 block">
            Présentation & Vidéo
          </span>

          <div>
            <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Titre professionnel</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex. Coach Haute Performance & Préparation Physique"
              className="w-full min-h-11 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-[15px] rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-fmc-green/50"
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Biographie détaillée</label>
            <textarea
              rows={4}
              required
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full min-h-11 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-[15px] rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-fmc-green/50 resize-none leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Vidéo de présentation (lien YouTube, Vimeo…)</label>
            <input
              type="text"
              value={videoLink}
              onChange={(e) => setVideoLink(e.target.value)}
              placeholder="https://youtube.com/…"
              className="w-full min-h-11 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-[15px] rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-fmc-green/50"
            />
          </div>
        </div>

        {/* Formats de coaching & Tarifs */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-fmc-line/80 dark:border-slate-800 space-y-3">
          <span className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 block">
            Formats de Séance Proposés
          </span>

          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'online', label: 'En ligne (visio)', icon: Video },
              { id: 'home', label: 'À domicile', icon: Home },
              { id: 'coach_location', label: 'Chez le coach', icon: MapPin },
              { id: 'partner_gym', label: 'En salle partenaire', icon: Dumbbell },
              { id: 'outdoor', label: 'En extérieur', icon: Trees },
              { id: 'corporate', label: 'En entreprise', icon: Building2 }
            ].map((f) => {
              const isSelected = formats.includes(f.id as CoachingFormat);
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggleFormat(f.id as CoachingFormat)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-fmc-green/15 border-[#00D664] text-[#008A3E]'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <f.icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{f.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Tarif de base (€/h)</label>
              <NumberInput
                min={20}
                max={500}
                required
                value={hourlyRate}
                onValueChange={setHourlyRate}
                placeholder="ex. 60"
                className="w-full min-h-11 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-[15px] rounded-xl border border-slate-300 dark:border-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-fmc-green/50"
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Tarif Domicile (€/h)</label>
              <NumberInput
                min={20}
                max={500}
                value={homePrice}
                onValueChange={setHomePrice}
                placeholder="ex. 60"
                className="w-full min-h-11 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-[15px] rounded-xl border border-slate-300 dark:border-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-fmc-green/50"
              />
            </div>
          </div>
        </div>

        {/* Zone d'intervention & Géolocalisation */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-fmc-line/80 dark:border-slate-800 space-y-3">
          <span className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 block">
            Zone d'intervention & Déplacement
          </span>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Ville principale</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Paris, Poitiers..."
                className="w-full min-h-11 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-[15px] rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-fmc-green/50"
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Code Postal</label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="75008"
                className="w-full min-h-11 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-[15px] rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-fmc-green/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Adresse exacte (studio, salle) — privée</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              autoComplete="street-address"
              placeholder="Communiquée uniquement aux clients d'une séance confirmée"
              className="w-full min-h-11 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-[15px] rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-fmc-green/50"
            />
            <p className="text-[11px] text-slate-500 mt-1">Votre fiche publique n'affiche que la ville et une zone approximative.</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">Rayon de déplacement</label>
              <span className="text-xs font-bold text-[#008A3E]">{radiusKm} km</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="5"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="w-full accent-[#00D664] h-2 bg-slate-200 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <span className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Zone affichée sur votre fiche</span>
            <p className="px-3 py-2 bg-slate-50 dark:bg-slate-800 text-xs rounded-xl border border-slate-200 dark:border-slate-700">
              {zoneDescription({ city, interventionRadiusKm: radiusKm, formats }) || 'Indiquez votre ville'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Rédigée automatiquement à partir de votre ville, du rayon et des formats choisis.</p>
          </div>
        </div>

        {/* Spécialités */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-fmc-line/80 dark:border-slate-800 space-y-3">
          <span className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 block">
            Spécialités & Disciplines
          </span>

          <div className="flex flex-wrap gap-1.5">
            {specialties.map((spec) => (
              <span
                key={spec}
                className="px-2.5 py-1 rounded-lg bg-fmc-green/10 text-[#008A3E] text-xs font-bold flex items-center gap-1 border border-[#00D664]/20"
              >
                {spec}
                <button type="button" onClick={() => removeSpecialty(spec)} className="text-slate-400 hover:text-rose-600 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newSpecialty}
              onChange={(e) => setNewSpecialty(e.target.value)}
              placeholder="Ajouter une discipline..."
              className="flex-1 min-h-11 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-[15px] rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-fmc-green/50"
            />
            <button
              type="button"
              onClick={addSpecialty}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer transition"
            >
              Ajouter
            </button>
          </div>
        </div>

        {/* Méthode, objectifs, niveaux, publics */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-fmc-line/80 dark:border-slate-800 space-y-3">
          <span className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 block">Méthode & publics</span>
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Votre méthode de travail</label>
            <textarea
              rows={4}
              value={methods}
              onChange={(e) => setMethods(e.target.value)}
              maxLength={2000}
              placeholder="Bilan de départ, déroulé d'une séance, suivi entre les séances…"
              className="w-full min-h-11 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-[15px] rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-fmc-green/50 resize-none"
            />
          </div>
          <div>
            <p className="text-xs font-bold mb-1.5">Objectifs accompagnés</p>
            <div className="flex flex-wrap gap-1.5">
              {OBJECTIVE_OPTIONS.map((o) => (
                <button key={o} type="button" onClick={() => setObjectives(toggleIn(objectives, o))} className={pill(objectives.includes(o))}>{o}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold mb-1.5">Niveaux acceptés</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(LEVEL_LABELS) as CoachLevel[]).map((l) => (
                <button key={l} type="button" onClick={() => setLevels(toggleIn(levels, l))} className={pill(levels.includes(l))}>{LEVEL_LABELS[l]}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold mb-1.5">Publics</p>
            <div className="flex flex-wrap gap-1.5">
              {AUDIENCE_OPTIONS.map((a) => (
                <button key={a} type="button" onClick={() => setAudiences(toggleIn(audiences, a))} className={pill(audiences.includes(a))}>{a}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Contenu de la séance, consignes, frais de déplacement */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-fmc-line/80 dark:border-slate-800 space-y-3">
          <span className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 block">Séance & préparation</span>
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Ce que comprend une séance (affiché avant paiement)</label>
            <textarea
              rows={2}
              value={sessionIncludes}
              onChange={(e) => setSessionIncludes(e.target.value)}
              maxLength={500}
              placeholder="ex. 60 min de coaching, matériel fourni, bilan en fin de séance"
              className="w-full min-h-11 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-[15px] rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-fmc-green/50 resize-none"
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Consignes par défaut pour vos clients</label>
            <textarea
              rows={2}
              value={prepInstructions}
              onChange={(e) => setPrepInstructions(e.target.value)}
              maxLength={2000}
              placeholder="Tenue de sport, tapis, bouteille d'eau, 2 m² dégagés…"
              className="w-full min-h-11 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-[15px] rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-fmc-green/50 resize-none"
            />
            <p className="text-[11px] text-slate-500 mt-1">Copiées dans chaque séance confirmée ; modifiables séance par séance avec le lien de visio.</p>
          </div>
          {formats.includes('home') && (
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Frais de déplacement à domicile (€)</label>
              <NumberInput
                min={0}
                max={100}
                step={0.5}
                value={travelFee}
                onValueChange={setTravelFee}
                placeholder="0"
                className="w-full min-h-11 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-[15px] rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-fmc-green/50"
              />
              <p className="text-[11px] text-slate-500 mt-1">Ajoutés au prix des séances à domicile et affichés avant le paiement. Sans commission Find My Coach : ils vous sont reversés, moins les frais bancaires Stripe correspondants (1,5 %).</p>
            </div>
          )}
        </div>

        {/* Save Button */}
        {saveError && <p className="text-sm text-rose-600 font-semibold">{saveError}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 bg-fmc-green text-fmc-navy font-bold rounded-2xl text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer apple-press"
        >
          <Save className="w-4 h-4" />
          <span>Enregistrer mon profil professionnel</span>
        </button>
      </form>

      {/* Justificatifs (stockage privé) */}
      {coach && currentUser && <CoachDocumentsPanel coach={coach} ownerId={currentUser.id} onCountChange={setDocCount} />}

      {/* Compte */}
      <div className="mt-6 space-y-2">
        <ThemePicker className="mb-2" />
        <button
          type="button"
          onClick={() => loginAs('client')}
          className="w-full h-12 rounded-full border border-slate-200 bg-white text-slate-700 font-semibold text-sm cursor-pointer"
        >
          Explorer l'app comme un client
        </button>
        <button
          id="btn-logout-pro"
          type="button"
          onClick={logout}
          className="w-full h-12 rounded-full border border-rose-300 text-rose-500 font-semibold text-sm cursor-pointer"
        >
          Se déconnecter
        </button>
        <DeleteAccount />
      </div>
    </div>
  );
};
