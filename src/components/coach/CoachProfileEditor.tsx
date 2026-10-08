import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
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
  Sparkles
} from 'lucide-react';
import { CoachingFormat, VerificationDoc } from '../../types';

export const CoachProfileEditor: React.FC = () => {
  const { 
    currentUser, 
    coaches, 
    updateCoachProfile, 
    submitVerificationDoc,
    goBack 
  } = useApp();
  
  const coach = coaches.find(c => c.userId === currentUser?.id) || coaches[0];

  const [title, setTitle] = useState(coach?.title || '');
  const [bio, setBio] = useState(coach?.bio || '');
  const [hourlyRate, setHourlyRate] = useState(coach?.hourlyRate || 80);
  const [city, setCity] = useState(coach?.city || 'Paris');
  const [postalCode, setPostalCode] = useState(coach?.postalCode || '75008');
  const [address, setAddress] = useState(coach?.address || '');
  const [radiusKm, setRadiusKm] = useState(coach?.interventionRadiusKm || 15);
  const [interventionZone, setInterventionZone] = useState(
    coach?.interventionZone || 'Paris intra-muros et 15 km aux alentours'
  );
  
  const [experienceYears, setExperienceYears] = useState(coach?.experienceYears || 5);
  const [specialties, setSpecialties] = useState<string[]>(coach?.specialties || []);
  const [newSpecialty, setNewSpecialty] = useState('');
  const [certifications, setCertifications] = useState<string[]>(coach?.certifications || []);
  const [newCert, setNewCert] = useState('');
  const [videoLink, setVideoLink] = useState(coach?.videoLink || '');

  // Formats & format prices
  const [formats, setFormats] = useState<CoachingFormat[]>(
    coach?.formats || ['online', 'coach_location', 'home']
  );
  const [homePrice, setHomePrice] = useState(coach?.formatPrices?.home || hourlyRate + 10);
  const [onlinePrice, setOnlinePrice] = useState(coach?.formatPrices?.online || hourlyRate - 10);
  const [gymPrice, setGymPrice] = useState(coach?.formatPrices?.partner_gym || hourlyRate);

  // Document upload state
  const [docType, setDocType] = useState<'diploma' | 'identity' | 'insurance' | 'kbis' | 'cert'>('diploma');
  const [docTitle, setDocTitle] = useState('');
  const [feedback, setFeedback] = useState('');

  const toggleFormat = (fmt: CoachingFormat) => {
    setFormats(prev => 
      prev.includes(fmt) ? prev.filter(f => f !== fmt) : [...prev, fmt]
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!coach) return;

    updateCoachProfile(coach.id, {
      title,
      bio,
      hourlyRate: Number(hourlyRate),
      city,
      postalCode,
      address,
      interventionRadiusKm: Number(radiusKm),
      interventionZone,
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

    setFeedback('Profil professionnel mis à jour avec succès !');
    setTimeout(() => setFeedback(''), 3000);
  };

  const handleUploadDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim()) return;

    submitVerificationDoc(coach.id, docType, docTitle.trim());
    setDocTitle('');
    setFeedback(`Document "${docTitle}" envoyé pour validation avec succès !`);
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

        <h1 className="text-base font-extrabold text-[#0F172A]">Édition du Profil Pro</h1>

        <div className="w-10" />
      </div>

      {feedback && (
        <div className="mb-4 p-3.5 bg-[#00D664]/15 border border-[#00D664]/30 text-[#008A3E] text-xs font-bold rounded-2xl flex items-center gap-2 shadow-xs">
          <Check className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {/* Titre & Bio */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
            Présentation & Vidéo
          </span>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Titre professionnel</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex. Coach Haute Performance & Préparation Physique"
              className="w-full px-3.5 py-2 bg-slate-50 text-xs text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:border-[#00D664]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Biographie détaillée</label>
            <textarea
              rows={4}
              required
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 text-xs text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:border-[#00D664] resize-none leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Lien Visio par défaut / Vidéo</label>
            <input
              type="text"
              value={videoLink}
              onChange={(e) => setVideoLink(e.target.value)}
              placeholder="https://zoom.us/j/votre-salle-live"
              className="w-full px-3.5 py-2 bg-slate-50 text-xs text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:border-[#00D664]"
            />
          </div>
        </div>

        {/* Formats de coaching & Tarifs */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
            Formats de Séance Proposés
          </span>

          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'online', label: 'En ligne (Visio)', icon: '💻' },
              { id: 'home', label: 'À domicile', icon: '🏠' },
              { id: 'coach_location', label: 'Chez le coach', icon: '📍' },
              { id: 'partner_gym', label: 'En salle partenaire', icon: '🏋️' },
              { id: 'outdoor', label: 'En extérieur / Parc', icon: '🌳' },
              { id: 'corporate', label: 'En entreprise', icon: '🏢' }
            ].map((f) => {
              const isSelected = formats.includes(f.id as CoachingFormat);
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggleFormat(f.id as CoachingFormat)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-[#00D664]/15 border-[#00D664] text-[#008A3E]'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span>{f.icon}</span>
                  <span className="truncate">{f.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tarif de base (€/h)</label>
              <input
                type="number"
                min={20}
                max={500}
                required
                value={hourlyRate}
                onChange={(e) => setHourlyRate(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 text-xs text-slate-900 rounded-xl border border-slate-300 font-bold focus:outline-none focus:border-[#00D664]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tarif Domicile (€/h)</label>
              <input
                type="number"
                min={20}
                max={500}
                value={homePrice}
                onChange={(e) => setHomePrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 text-xs text-slate-900 rounded-xl border border-slate-300 font-bold focus:outline-none focus:border-[#00D664]"
              />
            </div>
          </div>
        </div>

        {/* Zone d'intervention & Géolocalisation */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
            Zone d'intervention & Déplacement
          </span>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ville principale</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Paris, Poitiers..."
                className="w-full px-3 py-2 bg-slate-50 text-xs text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:border-[#00D664]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Code Postal</label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="75008"
                className="w-full px-3 py-2 bg-slate-50 text-xs text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:border-[#00D664]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">Rayon de déplacement</label>
              <span className="text-xs font-black text-[#008A3E]">{radiusKm} km</span>
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
            <label className="block text-xs font-bold text-slate-700 mb-1">Description de zone affichée</label>
            <input
              type="text"
              value={interventionZone}
              onChange={(e) => setInterventionZone(e.target.value)}
              placeholder="ex. Poitiers et 15 km aux alentours"
              className="w-full px-3 py-2 bg-slate-50 text-xs text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:border-[#00D664]"
            />
          </div>
        </div>

        {/* Spécialités */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
            Spécialités & Disciplines
          </span>

          <div className="flex flex-wrap gap-1.5">
            {specialties.map((spec) => (
              <span
                key={spec}
                className="px-2.5 py-1 rounded-lg bg-[#00D664]/10 text-[#008A3E] text-xs font-bold flex items-center gap-1 border border-[#00D664]/20"
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
              className="flex-1 px-3 py-2 bg-slate-50 text-xs text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:border-[#00D664]"
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

        {/* Save Button */}
        <button
          type="submit"
          className="w-full py-3.5 bg-[#00D664] hover:bg-[#00B050] text-[#0F172A] font-black rounded-2xl text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          <Save className="w-4 h-4" />
          <span>Enregistrer mon profil professionnel</span>
        </button>
      </form>

      {/* Diplomas & Official Verification Module */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3 mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-[#00B050]" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Documents & Badge Vérifié ✓
            </h3>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            coach?.verificationStatus === 'verified'
              ? 'bg-emerald-100 text-[#008A3E]'
              : 'bg-amber-100 text-amber-800'
          }`}>
            {coach?.verificationStatus === 'verified' ? 'Statut Vérifié ✓' : 'Validation en cours'}
          </span>
        </div>

        {/* List of submitted docs */}
        <div className="space-y-2">
          {coach?.verificationDocs && coach.verificationDocs.length > 0 ? (
            coach.verificationDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-extrabold text-[#0F172A] block">{doc.title}</span>
                  <span className="text-[10px] text-slate-400 capitalize">{doc.type}</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  doc.status === 'approved'
                    ? 'bg-emerald-100 text-[#008A3E]'
                    : doc.status === 'rejected'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {doc.status === 'approved' ? 'Validé ✓' : doc.status === 'rejected' ? 'Rejeté' : 'En attente'}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 text-center py-2">
              Aucun document justificatif téléversé pour le moment.
            </p>
          )}
        </div>

        {/* Add New Document Form */}
        <form onSubmit={handleUploadDoc} className="space-y-2 pt-2 border-t border-slate-100">
          <div className="grid grid-cols-3 gap-2">
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as any)}
              className="col-span-1 p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#00D664]"
            >
              <option value="diploma">Diplôme STAPS / BPJEPS</option>
              <option value="insurance">Assurance RC Pro</option>
              <option value="identity">Pièce d'identité</option>
              <option value="kbis">KBIS / Statut</option>
              <option value="cert">Certificat complémentaire</option>
            </select>

            <input
              type="text"
              required
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder="Intitulé officiel du document..."
              className="col-span-2 p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#00D664]"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-[#00B050]" />
            <span>Soumettre pour validation</span>
          </button>
        </form>
      </div>
    </div>
  );
};
