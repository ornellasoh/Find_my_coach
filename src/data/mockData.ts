import { 
  User, 
  CoachProfile, 
  Category, 
  AvailabilitySlot, 
  SessionType, 
  Booking, 
  Review, 
  Favorite, 
  Notification, 
  Goal, 
  ProgressEntry, 
  PayoutTransaction, 
  CoachClientSummary, 
  CoachingFormat,
  WorkoutProgram
} from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'user-client-1',
    email: 'alex.rivers@gmail.com',
    name: 'Alex Rivers',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    role: 'client',
    phone: '+33 6 12 34 56 78',
    createdAt: '2026-01-15T10:00:00.000Z',
    status: 'active',
    isPremium: true,
    memberSince: '2026',
    city: 'Paris',
    postalCode: '75011',
    address: '14 Rue de Charonne, 75011 Paris',
    latitude: 48.8534,
    longitude: 2.3789,
    bio: 'Passionné de sport, athlète amateur et entrepreneur. Objectif : préparation marathon et renforcement musculaire.'
  },
  {
    id: 'user-coach-1',
    email: 'marcus.thorne@findmycoach.fr',
    name: 'Marcus Thorne',
    avatar: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=400&auto=format&fit=crop&q=80',
    role: 'coach',
    phone: '+33 6 98 76 54 32',
    createdAt: '2025-04-10T09:00:00.000Z',
    status: 'active',
    isPremium: true,
    memberSince: '2025',
    city: 'Paris',
    postalCode: '75008',
    latitude: 48.8738,
    longitude: 2.3085,
    bio: 'Coach de Haute Performance & Préparateur Physique Pro certifié STAPS.'
  },
  {
    id: 'user-admin-1',
    email: 'admin@findmycoach.fr',
    name: 'Sarah Admin',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
    role: 'admin',
    createdAt: '2025-01-01T08:00:00.000Z',
    status: 'active'
  }
];

export const INITIAL_CATEGORIES: Category[] = [
  { 
    id: 'cat-sport', 
    name: 'Sport & Fitness', 
    slug: 'sport', 
    icon: 'Dumbbell', 
    count: 32,
    description: 'Renforcement, cardio, cross-training, sports de combat et running.',
    subcategories: ['Fitness', 'Musculation', 'Running', 'Boxe', 'Préparation physique', 'Cross-training', 'Pilates']
  },
  { 
    id: 'cat-nutrition', 
    name: 'Nutrition & Diététique', 
    slug: 'nutrition', 
    icon: 'Utensils', 
    count: 18,
    description: 'Perte de poids, prise de masse, rééquilibrage et nutrition sportive.',
    subcategories: ['Nutrition sportive', 'Perte de poids', 'Rééquilibrage alimentaire', 'Micronutrition']
  },
  { 
    id: 'cat-bien-etre', 
    name: 'Bien-être & Posture', 
    slug: 'bien-etre', 
    icon: 'HeartPulse', 
    count: 22,
    description: 'Yoga, respiration, mobilité, gestion du stress et récupération.',
    subcategories: ['Yoga Vinyasa', 'Méditation', 'Breathwork', 'Gestion du stress', 'Mobilité articulaire']
  },
  { 
    id: 'cat-business', 
    name: 'Business & Leadership', 
    slug: 'business', 
    icon: 'Briefcase', 
    count: 14,
    description: 'Entrepreneuriat, négociation, prise de décision et leadership exécutif.',
    subcategories: ['Entrepreneuriat', 'Leadership', 'Vente & Négociation', 'Stratégie']
  },
  { 
    id: 'cat-mindset', 
    name: 'Mindset & Discipline', 
    slug: 'mindset', 
    icon: 'Brain', 
    count: 16,
    description: 'Discipline, confiance en soi, gestion émotionnelle et focus.',
    subcategories: ['Confiance en soi', 'Discipline mentale', 'Organisation & Focus', 'Productivité']
  },
  { 
    id: 'cat-carriere', 
    name: 'Carrière & Évolution', 
    slug: 'carriere', 
    icon: 'TrendingUp', 
    count: 12,
    description: 'Reconversion pro, négociation de salaire et entretiens de haut niveau.',
    subcategories: ['Recherche d’emploi', 'Préparation Entretien', 'Reconversion pro', 'Prise de parole']
  }
];

export const INITIAL_COACHES: CoachProfile[] = [
  {
    id: 'coach-1',
    userId: 'user-coach-1',
    name: 'Marcus Thorne',
    title: 'Coach Haute Performance & Force Athlétique',
    bio: "Spécialisé dans l'entraînement athlétique de haute performance et le conditionnement métabolique. J'aide les personnes motivées à franchir leurs paliers grâce à une programmation basée sur la science du mouvement et des techniques d'intensité de niveau élite. Que vous prépariez une compétition ou une remise en forme exigeante, nous atteindrons vos objectifs ensemble.",
    photo: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=800&auto=format&fit=crop&q=80',
    coverPhoto: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&auto=format&fit=crop&q=80',
    rating: 4.9,
    reviewCount: 128,
    experienceYears: 8,
    hourlyRate: 85,
    isElite: true,
    isAvailable: true,
    
    // Geolocation & Formats
    location: 'Paris & Île-de-France',
    city: 'Paris',
    postalCode: '75008',
    address: 'Studio Élite, 12 Rue du Faubourg Saint-Honoré, 75008 Paris',
    latitude: 48.8698,
    longitude: 2.3185,
    interventionRadiusKm: 20,
    interventionZone: 'Paris intra-muros et banlieue ouest (20 km)',
    formats: ['online', 'home', 'partner_gym', 'outdoor', 'coach_location'],
    formatPrices: {
      online: 75,
      home: 95,
      partner_gym: 85,
      outdoor: 80,
      coach_location: 85
    },
    isOnlineCoaching: true,
    isInPersonCoaching: true,

    // Verification & Certifications
    verificationStatus: 'verified',
    verificationDocs: [
      {
        id: 'doc-1',
        coachId: 'coach-1',
        type: 'diploma',
        title: 'Master STAPS Préparation Physique et Mentale',
        status: 'approved',
        submittedAt: '2025-04-10T10:00:00Z',
        verifiedAt: '2025-04-11T14:00:00Z'
      },
      {
        id: 'doc-2',
        coachId: 'coach-1',
        type: 'cert',
        title: 'CSCS (Certified Strength and Conditioning Specialist)',
        status: 'approved',
        submittedAt: '2025-04-10T10:00:00Z',
        verifiedAt: '2025-04-11T14:00:00Z'
      },
      {
        id: 'doc-3',
        coachId: 'coach-1',
        type: 'insurance',
        title: 'Assurance RC Professionnelle Sport - Allianz',
        status: 'approved',
        submittedAt: '2025-04-10T10:00:00Z',
        verifiedAt: '2025-04-11T14:00:00Z'
      }
    ],

    // Packs
    packs: [
      { id: 'pack-1', name: 'Séance Unitaire', sessionsCount: 1, discountPercent: 0, pricePerSession: 85, totalPrice: 85 },
      { id: 'pack-5', name: 'Pack Élan (5 séances)', sessionsCount: 5, discountPercent: 10, pricePerSession: 76.5, totalPrice: 382.5, popular: true },
      { id: 'pack-10', name: 'Pack Transformation (10 séances)', sessionsCount: 10, discountPercent: 18, pricePerSession: 69.7, totalPrice: 697 }
    ],

    specialties: ['Force', 'HIIT', 'Perte de Poids', 'Conditionnement', 'Préparation physique'],
    category: 'Sport & Fitness',
    languages: ['Français', 'Anglais'],
    certifications: ['Master STAPS Préparation Physique', 'CSCS Certified', 'Precision Nutrition L2'],
    nextAvailabilitySummary: 'Demain dès 09:00',
    videoLink: 'https://zoom.us/j/findmycoach-marcus-alex-live',
    galleryPhotos: [
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&auto=format&fit=crop&q=80'
    ],
    isProfileComplete: true,
    isActive: true
  },
  {
    id: 'coach-2',
    userId: 'user-coach-2',
    name: 'Sarah Jenkins',
    title: 'Pleine Conscience & Nutrition Santé',
    bio: 'Naturopathe diplômée et professeure de Yoga certifiée. J’accompagne les personnes stressées ou en transition vers un équilibre corporel durable, une alimentation saine sans privation et une sérénité mentale profonde.',
    photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&auto=format&fit=crop&q=80',
    coverPhoto: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&auto=format&fit=crop&q=80',
    rating: 4.8,
    reviewCount: 94,
    experienceYears: 6,
    hourlyRate: 70,
    isElite: false,
    isAvailable: true,
    location: 'Poitiers & En ligne',
    city: 'Poitiers',
    postalCode: '86000',
    latitude: 46.5802,
    longitude: 0.3404,
    interventionRadiusKm: 15,
    interventionZone: 'Poitiers et 15 km aux alentours',
    formats: ['online', 'home', 'coach_location'],
    formatPrices: {
      online: 65,
      home: 75,
      coach_location: 70
    },
    isOnlineCoaching: true,
    isInPersonCoaching: true,
    verificationStatus: 'verified',
    verificationDocs: [
      {
        id: 'doc-s1',
        coachId: 'coach-2',
        type: 'diploma',
        title: 'Diplôme Universitaire Nutrition & Santé',
        status: 'approved',
        submittedAt: '2025-05-12T10:00:00Z',
        verifiedAt: '2025-05-13T11:00:00Z'
      }
    ],
    packs: [
      { id: 'pack-s1', name: 'Bilan Nutritionnel (1h)', sessionsCount: 1, discountPercent: 0, pricePerSession: 70, totalPrice: 70 },
      { id: 'pack-s5', name: 'Suivi 5 Semaines', sessionsCount: 5, discountPercent: 12, pricePerSession: 61.6, totalPrice: 308, popular: true }
    ],
    specialties: ['Nutrition', 'Yoga', 'Mindset', 'Perte de Poids', 'Gestion du Stress'],
    category: 'Nutrition & Diététique',
    languages: ['Français', 'Anglais', 'Espagnol'],
    certifications: ['Diplôme Universitaire Nutrition', 'Yoga Alliance RYT 500'],
    nextAvailabilitySummary: 'Aujourd\'hui dès 14:30',
    isProfileComplete: true,
    isActive: true
  },
  {
    id: 'coach-3',
    userId: 'user-coach-3',
    name: 'Alex Rivera',
    title: 'Force Athlétique & CrossFit',
    bio: 'Ancien gymnaste de haut niveau et coach CrossFit L3. Mon approche repose sur la mécanique gestuelle irréprochable, le gainage fondamental et la puissance explosive pour bâtir un corps résistant et sans blessure.',
    photo: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80',
    coverPhoto: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1200&auto=format&fit=crop&q=80',
    rating: 4.9,
    reviewCount: 86,
    experienceYears: 5,
    hourlyRate: 80,
    isElite: true,
    isAvailable: true,
    location: 'Bordeaux & En ligne',
    city: 'Bordeaux',
    postalCode: '33000',
    latitude: 44.8378,
    longitude: -0.5792,
    interventionRadiusKm: 25,
    interventionZone: 'Bordeaux Métropole et Bassin d’Arcachon',
    formats: ['partner_gym', 'outdoor', 'home', 'online'],
    formatPrices: {
      online: 70,
      home: 90,
      partner_gym: 80,
      outdoor: 75
    },
    isOnlineCoaching: true,
    isInPersonCoaching: true,
    verificationStatus: 'verified',
    specialties: ['Force', 'CrossFit', 'Mobilité', 'Gainage', 'Conditionnement'],
    category: 'Sport & Fitness',
    languages: ['Français'],
    certifications: ['BPJEPS AF Mention Haltérophilie', 'CrossFit Level 3 Trainer'],
    nextAvailabilitySummary: 'Demain dès 10:30',
    isProfileComplete: true,
    isActive: true
  },
  {
    id: 'coach-4',
    userId: 'user-coach-4',
    name: 'Elena Rodriguez',
    title: 'Yoga Vinyasa, Yin & Breathwork',
    bio: 'Spécialiste Vinyasa Flow, Yin Yoga et régulation du système nerveux. Mes séances ciblent la souplesse profonde, le renforcement postural et la clarté mentale absolue pour performer au quotidien sans burn-out.',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&auto=format&fit=crop&q=80',
    coverPhoto: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=1200&auto=format&fit=crop&q=80',
    rating: 5.0,
    reviewCount: 112,
    experienceYears: 7,
    hourlyRate: 110,
    isElite: true,
    isAvailable: true,
    location: 'Lyon & En ligne',
    city: 'Lyon',
    postalCode: '69001',
    latitude: 45.7640,
    longitude: 4.8357,
    interventionRadiusKm: 15,
    interventionZone: 'Lyon Centre et Grand Lyon',
    formats: ['online', 'coach_location', 'home', 'outdoor'],
    formatPrices: {
      online: 90,
      coach_location: 110,
      home: 125,
      outdoor: 100
    },
    isOnlineCoaching: true,
    isInPersonCoaching: true,
    verificationStatus: 'verified',
    specialties: ['Yoga', 'Méditation', 'Breathwork', 'Bien-être', 'Mobilité'],
    category: 'Bien-être & Posture',
    languages: ['Français', 'Espagnol', 'Anglais'],
    certifications: ['E-RYT 500 Yoga Alliance', 'Pranayama Master Coach'],
    nextAvailabilitySummary: 'Vendredi dès 09:00',
    isProfileComplete: true,
    isActive: true
  },
  {
    id: 'coach-5',
    userId: 'user-coach-5',
    name: 'David Chen',
    title: 'Musculation, Force & Diète Sportive',
    bio: 'Préparateur physique pour athlètes et pratiquants exigeants. Optimisation de la surcharge progressive, volume d’entraînement périodisé et diététique ciblée pour des gains musculaires rapides et sains.',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80',
    coverPhoto: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=1200&auto=format&fit=crop&q=80',
    rating: 4.8,
    reviewCount: 64,
    experienceYears: 9,
    hourlyRate: 65,
    isElite: false,
    isAvailable: true,
    location: 'Lille & En ligne',
    city: 'Lille',
    postalCode: '59000',
    latitude: 50.6292,
    longitude: 3.0573,
    interventionRadiusKm: 20,
    interventionZone: 'Lille Métropole et périphérie',
    formats: ['partner_gym', 'home', 'online'],
    isOnlineCoaching: true,
    isInPersonCoaching: true,
    verificationStatus: 'verified',
    specialties: ['Hypertrophie', 'Force', 'Diète Sportive', 'Musculation'],
    category: 'Sport & Fitness',
    languages: ['Français', 'Mandarin'],
    certifications: ['Diplôme FFFMR', 'Certified Strength Coach'],
    nextAvailabilitySummary: 'Samedi dès 10:00',
    isProfileComplete: true,
    isActive: true
  },
  {
    id: 'coach-6',
    userId: 'user-coach-6',
    name: 'Mike Ross',
    title: 'Executive Coach & Leadership Stratégique',
    bio: 'Ex-cadre dirigeant et executive coach certifié HEC. J’accompagne les fondateurs, directeurs et managers dans la prise de décision stratégique, la résilience mentale et la prise de parole percutante.',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&auto=format&fit=crop&q=80',
    coverPhoto: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80',
    rating: 4.9,
    reviewCount: 78,
    experienceYears: 11,
    hourlyRate: 140,
    isElite: true,
    isAvailable: true,
    location: 'Paris & En ligne',
    city: 'Paris',
    postalCode: '75016',
    latitude: 48.8606,
    longitude: 2.2789,
    interventionRadiusKm: 30,
    interventionZone: 'Paris & La Défense (Sièges d’entreprise)',
    formats: ['online', 'corporate', 'coach_location'],
    formatPrices: {
      online: 140,
      corporate: 180,
      coach_location: 150
    },
    isOnlineCoaching: true,
    isInPersonCoaching: true,
    verificationStatus: 'verified',
    specialties: ['Leadership', 'Carrière', 'Mindset', 'Gestion du Stress', 'Négociation'],
    category: 'Business & Leadership',
    languages: ['Français', 'Anglais'],
    certifications: ['Executive Coaching HEC Paris', 'ICF Master Certified Coach (MCC)'],
    nextAvailabilitySummary: 'Lundi dès 11:00',
    isProfileComplete: true,
    isActive: true
  },
  {
    id: 'coach-7',
    userId: 'user-coach-7',
    name: 'Thomas Vasseur',
    title: 'Préparateur Mental & Focus sous Pression',
    bio: 'Préparateur mental de sportifs de haut niveau et d’entrepreneurs. Développez une discipline inébranlable, surmontez le doute et apprenez à performer sous pression maximale.',
    photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&auto=format&fit=crop&q=80',
    coverPhoto: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=1200&auto=format&fit=crop&q=80',
    rating: 4.9,
    reviewCount: 52,
    experienceYears: 7,
    hourlyRate: 95,
    isElite: true,
    isAvailable: true,
    location: 'En ligne / Visio',
    city: 'Paris',
    latitude: 48.8566,
    longitude: 2.3522,
    interventionRadiusKm: 0,
    interventionZone: '100% En ligne / Visio mondiale',
    formats: ['online'],
    isOnlineCoaching: true,
    isInPersonCoaching: false,
    verificationStatus: 'verified',
    specialties: ['Mindset', 'Gestion du Stress', 'Motivation', 'Discipline mentale', 'Focus'],
    category: 'Mindset & Discipline',
    languages: ['Français', 'Anglais'],
    certifications: ['Master Psychologie de la Performance', 'Certificat Préparation Mentale INSEP'],
    nextAvailabilitySummary: 'Demain dès 14:00',
    isProfileComplete: true,
    isActive: true
  },
  {
    id: 'coach-8',
    userId: 'user-coach-8',
    name: 'Clara Martin',
    title: 'Coach Carrière & Transition Professionnelle',
    bio: 'Consultante RH et coach certifiée en reconversion professionnelle. Je vous aide à définir votre feuille de route professionnelle, négocier votre rémunération et réussir vos entretiens clés.',
    photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=800&auto=format&fit=crop&q=80',
    coverPhoto: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&auto=format&fit=crop&q=80',
    rating: 4.8,
    reviewCount: 41,
    experienceYears: 6,
    hourlyRate: 90,
    isElite: false,
    isAvailable: true,
    location: 'Nantes & En ligne',
    city: 'Nantes',
    postalCode: '44000',
    latitude: 47.2184,
    longitude: -1.5536,
    interventionRadiusKm: 20,
    interventionZone: 'Nantes et agglomération nantaise',
    formats: ['online', 'coach_location', 'corporate'],
    formatPrices: {
      online: 85,
      coach_location: 95,
      corporate: 120
    },
    isOnlineCoaching: true,
    isInPersonCoaching: true,
    verificationStatus: 'verified',
    specialties: ['Carrière', 'Leadership', 'Mindset', 'Entrepreneuriat', 'Prise de parole'],
    category: 'Carrière & Évolution',
    languages: ['Français'],
    certifications: ['Certification RNCP Coach Professionnel', 'Praticienne MBTI'],
    nextAvailabilitySummary: 'Jeudi dès 10:00',
    isProfileComplete: true,
    isActive: true
  }
];

export const INITIAL_SESSION_TYPES: SessionType[] = [
  {
    id: 'session-video',
    name: 'Consultation Visio HD',
    durationMinutes: 60,
    mode: 'video',
    format: 'online',
    description: 'Séance 100% personnalisée en visio haute définition avec analyse en direct',
    platform: 'Visio FindMyCoach (Lien sécurisé)',
    priceMultiplier: 1.0
  },
  {
    id: 'session-home',
    name: 'Séance à Domicile',
    durationMinutes: 60,
    mode: 'in_person',
    format: 'home',
    description: 'Le coach se déplace directement à votre domicile avec son matériel',
    platform: 'À votre adresse privée',
    priceMultiplier: 1.15
  },
  {
    id: 'session-partner-gym',
    name: 'Séance en Salle / Studio',
    durationMinutes: 60,
    mode: 'in_person',
    format: 'partner_gym',
    description: 'Coaching dans un club ou studio partenaire équipé haut de gamme',
    platform: 'Studio Privé / Salle Partenaire',
    priceMultiplier: 1.0
  },
  {
    id: 'session-outdoor',
    name: 'Séance en Extérieur',
    durationMinutes: 60,
    mode: 'in_person',
    format: 'outdoor',
    description: 'Séance en plein air (parcs, quais, stades) avec équipement fonctionnel',
    platform: 'Espace Extérieur Convenu',
    priceMultiplier: 0.95
  }
];

// Helper to generate dynamic dates formatted YYYY-MM-DD
export const getFormattedDate = (daysFromToday: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const generateInitialAvailabilities = (): AvailabilitySlot[] => {
  const slots: AvailabilitySlot[] = [];
  const times = [
    { start: '09:00', end: '10:00' },
    { start: '10:30', end: '11:30' },
    { start: '13:00', end: '14:00' },
    { start: '14:30', end: '15:30' },
    { start: '16:00', end: '17:00' },
    { start: '17:30', end: '18:30' }
  ];
  
  const coachIds = [
    'coach-1', 
    'coach-2', 
    'coach-3', 
    'coach-4', 
    'coach-5', 
    'coach-6', 
    'coach-7', 
    'coach-8'
  ];

  // Generate slots for the next 14 days
  for (let day = 0; day <= 14; day++) {
    const dateStr = getFormattedDate(day);
    coachIds.forEach((coachId) => {
      times.forEach((t) => {
        // Reserve a slot for the demo upcoming booking for Marcus Thorne
        const isMarcusDemoSlot = coachId === 'coach-1' && day === 1 && t.start === '10:30';
        
        slots.push({
          id: `slot-${coachId}-${dateStr}-${t.start.replace(':', '')}`,
          coachId,
          date: dateStr,
          startTime: t.start,
          endTime: t.end,
          isBooked: isMarcusDemoSlot,
          bookingId: isMarcusDemoSlot ? 'booking-upcoming-1' : undefined
        });
      });
    });
  }

  return slots;
};

export const INITIAL_AVAILABILITIES: AvailabilitySlot[] = generateInitialAvailabilities();

export const INITIAL_BOOKINGS: Booking[] = [
  {
    id: 'booking-past-1',
    clientId: 'user-client-1',
    clientName: 'Alex Rivers',
    clientAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    clientEmail: 'alex.rivers@gmail.com',
    clientPhone: '+33 6 12 34 56 78',
    coachId: 'coach-1',
    coachName: 'Marcus Thorne',
    coachTitle: 'Coach Haute Performance & Force Athlétique',
    coachPhoto: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=400&auto=format&fit=crop&q=80',
    availabilityId: 'slot-coach-1-past-1',
    date: getFormattedDate(-7),
    startTime: '10:00',
    endTime: '11:00',
    sessionType: INITIAL_SESSION_TYPES[0],
    format: 'online',
    price: 85,
    serviceFee: 5,
    taxes: 0,
    total: 90,
    paymentStatus: 'paid',
    bookingStatus: 'completed',
    paymentMethod: 'Mastercard •••• 8842',
    meetingLink: 'https://zoom.us/j/findmycoach-marcus-alex-1',
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    hasReview: true
  },
  {
    id: 'booking-past-2',
    clientId: 'user-client-1',
    clientName: 'Alex Rivers',
    clientAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    clientEmail: 'alex.rivers@gmail.com',
    clientPhone: '+33 6 12 34 56 78',
    coachId: 'coach-2',
    coachName: 'Sarah Jenkins',
    coachTitle: 'Pleine Conscience & Nutrition Santé',
    coachPhoto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
    availabilityId: 'slot-coach-2-past-2',
    date: getFormattedDate(-12),
    startTime: '14:30',
    endTime: '15:30',
    sessionType: INITIAL_SESSION_TYPES[0],
    format: 'online',
    price: 70,
    serviceFee: 5,
    taxes: 0,
    total: 75,
    paymentStatus: 'paid',
    bookingStatus: 'completed',
    paymentMethod: 'Apple Pay',
    meetingLink: 'https://zoom.us/j/findmycoach-sarah-alex-2',
    createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
    hasReview: true
  },
  {
    id: 'booking-upcoming-1',
    clientId: 'user-client-1',
    clientName: 'Alex Rivers',
    clientAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    clientEmail: 'alex.rivers@gmail.com',
    clientPhone: '+33 6 12 34 56 78',
    coachId: 'coach-1',
    coachName: 'Marcus Thorne',
    coachTitle: 'Coach Haute Performance & Force Athlétique',
    coachPhoto: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=400&auto=format&fit=crop&q=80',
    availabilityId: `slot-coach-1-${getFormattedDate(1)}-1030`,
    date: getFormattedDate(1),
    startTime: '10:30',
    endTime: '11:30',
    sessionType: INITIAL_SESSION_TYPES[0],
    format: 'online',
    price: 85,
    serviceFee: 5,
    taxes: 0,
    total: 90,
    paymentStatus: 'paid',
    bookingStatus: 'confirmed',
    paymentMethod: 'Mastercard •••• 8842',
    meetingLink: 'https://zoom.us/j/findmycoach-marcus-alex-live',
    location: 'Visio HD Find My Coach',
    createdAt: new Date().toISOString(),
    hasReview: false
  },
  {
    id: 'booking-upcoming-coach-demo2',
    clientId: 'user-client-2',
    clientName: 'Camille Laurent',
    clientAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
    clientEmail: 'camille.laurent@gmail.com',
    clientPhone: '+33 6 55 44 33 22',
    coachId: 'coach-1',
    coachName: 'Marcus Thorne',
    coachTitle: 'Coach Haute Performance & Force Athlétique',
    coachPhoto: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=400&auto=format&fit=crop&q=80',
    availabilityId: `slot-coach-1-${getFormattedDate(0)}-1430`,
    date: getFormattedDate(0),
    startTime: '14:30',
    endTime: '15:30',
    sessionType: INITIAL_SESSION_TYPES[1],
    format: 'home',
    price: 95,
    serviceFee: 5,
    taxes: 0,
    total: 100,
    paymentStatus: 'paid',
    bookingStatus: 'confirmed',
    paymentMethod: 'Visa •••• 1290',
    location: 'À Domicile',
    clientAddress: '28 Avenue Montaigne, 75008 Paris',
    createdAt: new Date().toISOString(),
    hasReview: false
  }
];

export const INITIAL_REVIEWS: Review[] = [
  {
    id: 'rev-1',
    bookingId: 'booking-past-1',
    clientId: 'user-client-1',
    clientName: 'Alex Rivers',
    clientAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    coachId: 'coach-1',
    rating: 5.0,
    comment: "Marcus est exceptionnel. Son analyse de la posture et sa programmation personnalisée ont transformé ma force et mon endurance. Je recommande les yeux fermés !",
    createdAt: 'Il y a 3 jours',
    categoryTag: 'Sport & Fitness'
  },
  {
    id: 'rev-2',
    bookingId: 'booking-demo-2',
    clientId: 'user-client-2',
    clientName: 'Camille Laurent',
    clientAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    coachId: 'coach-1',
    rating: 4.8,
    comment: "Excellente séance de conditionnement métabolique. Pédagogie claire, intensité calibrée avec soin.",
    createdAt: 'Il y a 1 semaine',
    categoryTag: 'Sport & Fitness'
  },
  {
    id: 'rev-3',
    bookingId: 'booking-past-2',
    clientId: 'user-client-1',
    clientName: 'Alex Rivers',
    clientAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    coachId: 'coach-2',
    rating: 5.0,
    comment: "Un accompagnement nutritionnel ultra pragmatique et bienveillant. Fini les régimes yoyo !",
    createdAt: 'Il y a 12 jours',
    categoryTag: 'Nutrition & Diététique'
  }
];

export const INITIAL_FAVORITES: Favorite[] = [
  {
    id: 'fav-1',
    userId: 'user-client-1',
    coachId: 'coach-1',
    createdAt: '2026-02-01T10:00:00.000Z'
  },
  {
    id: 'fav-2',
    userId: 'user-client-1',
    coachId: 'coach-2',
    createdAt: '2026-02-05T14:00:00.000Z'
  }
];

export const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    userId: 'user-client-1',
    type: 'booking_confirmed',
    title: 'Réservation confirmée ✅',
    message: 'Votre séance avec Marcus Thorne est confirmée pour demain à 10:30.',
    relatedBookingId: 'booking-upcoming-1',
    read: false,
    createdAt: 'Il y a 10 minutes'
  },
  {
    id: 'notif-2',
    userId: 'user-coach-1',
    type: 'new_booking',
    title: 'Nouvelle réservation ! 🎉',
    message: 'Alex Rivers vient de réserver une séance demain à 10:30.',
    relatedBookingId: 'booking-upcoming-1',
    read: false,
    createdAt: 'Il y a 15 minutes'
  },
  {
    id: 'notif-3',
    userId: 'user-coach-1',
    type: 'payment_received',
    title: 'Paiement disponible 💶',
    message: 'Votre versement de 72,25 € (séance Alex Rivers) est validé.',
    read: false,
    createdAt: 'Il y a 2 heures'
  }
];

export const INITIAL_GOALS: Goal[] = [
  {
    id: 'goal-1',
    userId: 'user-client-1',
    title: 'Fréquence d’entraînement',
    targetValue: 4,
    currentValue: 3,
    unit: 'séances/semaine',
    percentage: 75,
    status: 'active',
    category: 'Sport'
  },
  {
    id: 'goal-2',
    userId: 'user-client-1',
    title: 'Poids cible & Sèche',
    targetValue: 74,
    currentValue: 76.5,
    unit: 'kg',
    percentage: 60,
    status: 'active',
    category: 'Nutrition'
  }
];

export const INITIAL_PROGRESS_ENTRIES: ProgressEntry[] = [
  { id: 'prog-1', userId: 'user-client-1', metric: 'Séances complétées', value: 14, unit: 'séances', date: '2026-02-18', source: 'Find My Coach' },
  { id: 'prog-2', userId: 'user-client-1', metric: 'Heures de coaching', value: 16, unit: 'heures', date: '2026-02-18', source: 'Find My Coach' },
  { id: 'prog-3', userId: 'user-client-1', metric: 'Score régularité', value: 92, unit: '%', date: '2026-02-18', source: 'Algorithme Pro' }
];

export const INITIAL_PAYOUTS: PayoutTransaction[] = [
  {
    id: 'pay-1',
    bookingId: 'booking-past-1',
    coachId: 'coach-1',
    clientName: 'Alex Rivers',
    sessionTitle: 'Coaching Force & Performance (1h)',
    date: getFormattedDate(-7),
    grossAmount: 85,
    commissionAmount: 12.75, // 15%
    netAmount: 72.25,
    status: 'paid',
    paidAt: getFormattedDate(-5)
  },
  {
    id: 'pay-2',
    bookingId: 'booking-past-camille',
    coachId: 'coach-1',
    clientName: 'Camille Laurent',
    sessionTitle: 'Conditionnement Métabolique (1h)',
    date: getFormattedDate(-4),
    grossAmount: 95,
    commissionAmount: 14.25,
    netAmount: 80.75,
    status: 'paid',
    paidAt: getFormattedDate(-2)
  },
  {
    id: 'pay-3',
    bookingId: 'booking-upcoming-1',
    coachId: 'coach-1',
    clientName: 'Alex Rivers',
    sessionTitle: 'Coaching Haute Intensité (1h)',
    date: getFormattedDate(1),
    grossAmount: 85,
    commissionAmount: 12.75,
    netAmount: 72.25,
    status: 'pending'
  }
];

export const INITIAL_COACH_CLIENTS: CoachClientSummary[] = [
  {
    id: 'cc-1',
    clientId: 'user-client-1',
    clientName: 'Alex Rivers',
    clientAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    clientEmail: 'alex.rivers@gmail.com',
    clientPhone: '+33 6 12 34 56 78',
    totalSessions: 6,
    lastSessionDate: getFormattedDate(-7),
    nextSessionDate: getFormattedDate(1),
    notes: 'Objectif marathon de Paris + renforcement des ischio-jambiers. Très assidu et rigoureux.',
    tags: ['Athlète', 'Haute intensité', 'Client fidèle'],
    status: 'active'
  },
  {
    id: 'cc-2',
    clientId: 'user-client-2',
    clientName: 'Camille Laurent',
    clientAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    clientEmail: 'camille.laurent@gmail.com',
    clientPhone: '+33 6 55 44 33 22',
    totalSessions: 4,
    lastSessionDate: getFormattedDate(-4),
    nextSessionDate: getFormattedDate(0),
    notes: 'Séance à domicile. Travail postural et gainage profond suite à douleurs lombaires.',
    tags: ['À domicile', 'Posture'],
    status: 'active'
  },
  {
    id: 'cc-3',
    clientId: 'user-client-3',
    clientName: 'Julien Mercier',
    clientAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    clientEmail: 'julien.m@entreprise.fr',
    clientPhone: '+33 6 88 99 00 11',
    totalSessions: 10,
    lastSessionDate: getFormattedDate(-15),
    notes: 'Pack 10 séances complété avec succès (-4kg, gain de force nette). En attente de renouvellement.',
    tags: ['Pack 10', 'Transformation'],
    status: 'completed'
  }
];

export const INITIAL_WORKOUT_PROGRAMS: WorkoutProgram[] = [
  {
    id: 'prog-1',
    coachId: 'coach-1',
    coachName: 'Marcus Thorne',
    coachAvatar: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=400&auto=format&fit=crop&q=80',
    clientId: 'user-client-1',
    clientName: 'Alex Rivers',
    title: 'Programme Puissance & VMA Marathon',
    objective: 'Renforcement musculaire & Endurance spécifique',
    difficulty: 'Avancé',
    durationWeeks: 4,
    assignedAt: getFormattedDate(-3),
    status: 'active',
    notes: 'À réaliser 2 à 3 fois par semaine en complément des sorties longues.',
    sessions: [
      {
        id: 'sess-1',
        dayNumber: 1,
        title: 'Séance 1 : Renforcement Bas du Corps & Fessiers',
        description: 'Prévention des blessures de course et puissance de foulée.',
        durationMinutes: 45,
        isCompleted: true,
        completedAt: getFormattedDate(-2),
        exercises: [
          {
            id: 'ex-1',
            name: 'Squat Gobelet Kettlebell',
            sets: 4,
            reps: '12 reps @ 16kg',
            restSeconds: 60,
            notes: 'Descente contrôlée en 3 secondes, poussée explosive.',
            targetMuscle: 'Quadriceps & Fessiers',
            completed: true
          },
          {
            id: 'ex-2',
            name: 'Fentes Bulgares avec Haltères',
            sets: 3,
            reps: '10 reps / jambe',
            restSeconds: 75,
            notes: 'Buste légèrement incliné vers l’avant pour cibler le grand fessier.',
            targetMuscle: 'Fessiers & Ischios',
            completed: true
          },
          {
            id: 'ex-3',
            name: 'Pont fessier unilatéral au sol',
            sets: 3,
            reps: '15 reps / jambe',
            restSeconds: 45,
            notes: 'Marquer 1 sec de contraction en haut du mouvement.',
            targetMuscle: 'Chaîne postérieure',
            completed: true
          },
          {
            id: 'ex-4',
            name: 'Montées sur pointes de pieds (Mollets)',
            sets: 4,
            reps: '20 reps',
            restSeconds: 30,
            notes: 'Étirement maximal en bas, contraction forte en haut.',
            targetMuscle: 'Mollets & Tendon d’Achille',
            completed: true
          }
        ]
      },
      {
        id: 'sess-2',
        dayNumber: 2,
        title: 'Séance 2 : Gainage Dynamique & Stabilité du Tronc',
        description: 'Maintien de la posture et efficacité du transfert d’énergie.',
        durationMinutes: 35,
        isCompleted: false,
        exercises: [
          {
            id: 'ex-5',
            name: 'Planche commando alternée',
            sets: 4,
            reps: '45 secondes',
            restSeconds: 45,
            notes: 'Bassin fixe sans rotation latérale.',
            targetMuscle: 'Abdominaux & Épaules',
            completed: false
          },
          {
            id: 'ex-6',
            name: 'Dead Bug avec bande élastique',
            sets: 3,
            reps: '12 reps / côté',
            restSeconds: 45,
            notes: 'Bas du dos fermement plaqué contre le sol.',
            targetMuscle: 'Transverse profond',
            completed: false
          },
          {
            id: 'ex-7',
            name: 'Gainage latéral avec élévation de jambe',
            sets: 3,
            reps: '30 sec / côté',
            restSeconds: 45,
            notes: 'Corps aligné cheville-genou-hanche-épaule.',
            targetMuscle: 'Obliques & Moyen fessier',
            completed: false
          },
          {
            id: 'ex-8',
            name: 'Hollow Body Hold',
            sets: 4,
            reps: '30 secondes',
            restSeconds: 60,
            notes: 'Respiration fluide et contrôlée.',
            targetMuscle: 'Sangle abdominale',
            completed: false
          }
        ]
      },
      {
        id: 'sess-3',
        dayNumber: 3,
        title: 'Séance 3 : Mobilité Articulaire & Récupération Active',
        description: 'Décompression vertébrale et étirements des chaînes myotendineuses.',
        durationMinutes: 30,
        isCompleted: false,
        exercises: [
          {
            id: 'ex-9',
            name: 'World’s Greatest Stretch',
            sets: 3,
            reps: '6 répétitions lentes / côté',
            restSeconds: 30,
            notes: 'Ouvrir la cage thoracique vers le plafond.',
            targetMuscle: 'Fléchisseurs & Thoracique',
            completed: false
          },
          {
            id: 'ex-10',
            name: 'Pigeon Pose dynamique',
            sets: 3,
            reps: '45 secondes / côté',
            restSeconds: 30,
            notes: 'Respirations profondes par le nez.',
            targetMuscle: 'Fessiers profonds & Piriforme',
            completed: false
          },
          {
            id: 'ex-11',
            name: 'Cat-Cow avec travail scapulaire',
            sets: 3,
            reps: '10 cycles lents',
            restSeconds: 20,
            notes: 'Mobiliser vertèbre par vertèbre.',
            targetMuscle: 'Colonne & Érecteurs du rachis',
            completed: false
          }
        ]
      }
    ]
  }
];
