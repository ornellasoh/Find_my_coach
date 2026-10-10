import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  UserRole, 
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
  VerificationDoc,
  ChatPartner,
  ChatMessage,
  WorkoutProgram,
  WorkoutSessionDay,
  WorkoutExercise
} from '../types';
import { 
  INITIAL_USERS, 
  INITIAL_CATEGORIES, 
  INITIAL_COACHES, 
  INITIAL_AVAILABILITIES, 
  INITIAL_BOOKINGS, 
  INITIAL_REVIEWS, 
  INITIAL_FAVORITES, 
  INITIAL_NOTIFICATIONS, 
  INITIAL_GOALS, 
  INITIAL_PROGRESS_ENTRIES,
  INITIAL_SESSION_TYPES,
  INITIAL_PAYOUTS,
  INITIAL_COACH_CLIENTS,
  INITIAL_WORKOUT_PROGRAMS,
  getFormattedDate
} from '../data/mockData';
import { findCityByName } from '../utils/geo';
import { supabase, isSupabaseEnabled, authErrorFr } from '../lib/supabase';
import { fetchProfile, fetchSnapshot, saveProfile, useRemoteSync } from '../lib/remote';

export type ThemeMode = 'light' | 'dark' | 'system';

export type AppScreen = 
  | 'onboarding'
  | 'auth'
  | 'home'
  | 'search'
  | 'coach_profile'
  | 'booking_calendar'
  | 'checkout'
  | 'confirmation'
  | 'bookings'
  | 'progress'
  | 'workout_programs'
  | 'profile'
  | 'coach_dashboard'
  | 'coach_availabilities'
  | 'coach_profile_edit'
  | 'coach_bookings'
  | 'coach_clients'
  | 'coach_financials'
  | 'coach_ai_agent'
  | 'admin_dashboard';

export interface BookingDraft {
  coach: CoachProfile;
  selectedDate: string;
  selectedSlot: AvailabilitySlot;
  sessionType: SessionType;
  basePrice: number;
  serviceFee: number;
  taxes: number;
  total: number;
  notes?: string;
  clientAddress?: string;
}

export interface RegisterExtra {
  password?: string;
  city?: string;
  category?: string;
  phone?: string;
}

export interface AuthResult {
  error?: string;
  /** inscription faite mais email à confirmer avant connexion */
  needsConfirmation?: boolean;
  info?: string;
}

const uniqueId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/** Fiche coach par défaut pour un nouveau compte coach. */
const buildNewCoachProfile = (user: User, category?: string): CoachProfile => {
  const city = user.city || 'Paris';
  return {
    // identifiant stable : une seule fiche coach par compte
    id: isSupabaseEnabled ? `coach-${user.id}` : uniqueId('coach'),
    userId: user.id,
    name: user.name,
    title: 'Nouveau Coach Certifié',
    bio: 'Bienvenue sur mon profil Find My Coach. Je personnalise mes séances selon vos objectifs de performance et santé.',
    photo: user.avatar,
    rating: 5.0,
    reviewCount: 0,
    experienceYears: 2,
    hourlyRate: 70,
    isElite: false,
    isAvailable: true,
    location: `${city} & En ligne`,
    city,
    latitude: user.latitude ?? 48.8566,
    longitude: user.longitude ?? 2.3522,
    interventionRadiusKm: 15,
    interventionZone: `${city} et alentours (15 km)`,
    formats: ['online', 'coach_location', 'home'],
    isOnlineCoaching: true,
    isInPersonCoaching: true,
    verificationStatus: 'pending',
    specialties: category ? [category] : ['Fitness', 'Motivation', 'Mobilité'],
    category: category || 'Sport & Fitness',
    languages: ['Français'],
    certifications: [],
    isProfileComplete: false,
    isActive: true,
  };
};

interface AppContextType {
  // Navigation & Screen
  currentScreen: AppScreen;
  navigateTo: (screen: AppScreen, extraParams?: { coachId?: string; bookingDraft?: BookingDraft; bookingId?: string }) => void;
  goBack: () => void;
  screenHistory: AppScreen[];
  
  // Auth & Users
  currentUser: User | null;
  currentRole: UserRole | 'guest';
  loginAs: (role: UserRole, user?: User) => void;
  logout: () => void;
  registerUser: (name: string, email: string, role: UserRole, extra?: RegisterExtra) => Promise<AuthResult>;
  loginWithPassword: (email: string, password: string) => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  /** true pendant la restauration de session Supabase au démarrage */
  authLoading: boolean;
  /** true si l'app est connectée à Supabase (sinon : mode démo local) */
  isOnline: boolean;
  updateUserProfile: (updates: Partial<User>) => void;
  
  // Coaches
  coaches: CoachProfile[];
  selectedCoach: CoachProfile | null;
  setSelectedCoach: (coach: CoachProfile | null) => void;
  selectCoachForBooking: (coach: CoachProfile) => void;
  getCoachById: (id: string) => CoachProfile | undefined;
  updateCoachProfile: (coachId: string, updates: Partial<CoachProfile>) => void;
  updateCoachPhoto: (coachId: string, photo: string) => void;
  toggleCoachActiveStatus: (coachId: string) => void;
  submitVerificationDoc: (coachId: string, type: 'diploma' | 'identity' | 'insurance' | 'kbis' | 'cert', title: string) => void;
  reviewVerificationDoc: (coachId: string, docId: string, status: 'approved' | 'rejected', feedback?: string) => void;
  
  // Categories & Search filters
  categories: Category[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string | null;
  setSelectedCategory: (cat: string | null) => void;
  
  // Availabilities
  availabilities: AvailabilitySlot[];
  getCoachAvailabilities: (coachId: string, date?: string) => AvailabilitySlot[];
  addAvailabilitySlot: (coachId: string, date: string, startTime: string, endTime: string) => void;
  removeAvailabilitySlot: (slotId: string) => void;
  generateBatchWeeklySlots: (coachId: string, days: number[], timeSlots: { start: string; end: string }[]) => void;
  
  // Booking flow
  sessionTypes: SessionType[];
  bookingDraft: BookingDraft | null;
  setBookingDraft: (draft: BookingDraft | null) => void;
  latestConfirmedBooking: Booking | null;
  bookings: Booking[];
  createBooking: (draft: BookingDraft, paymentMethod: string) => Booking;
  /** Mode en ligne : enregistre la réservation « en attente de paiement » avant Stripe. */
  createPendingBooking: (draft: BookingDraft) => Promise<Booking>;
  /** Met à jour une réservation depuis le serveur et affiche la confirmation si elle est payée. */
  applyServerBooking: (booking: Booking) => void;
  cancelBooking: (bookingId: string) => Promise<{ refunded: boolean; amount?: number }>;
  completeBooking: (bookingId: string) => void;
  
  // Reviews
  reviews: Review[];
  addReview: (bookingId: string, rating: number, comment: string) => void;
  getCoachReviews: (coachId: string) => Review[];
  toggleReviewVisibility: (reviewId: string) => void;
  
  // Favorites
  favorites: Favorite[];
  toggleFavorite: (coachId: string) => void;
  isFavorite: (coachId: string) => boolean;
  
  // Notifications
  notifications: Notification[];
  unreadNotificationsCount: number;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  
  // Goals & Progress
  goals: Goal[];
  progressEntries: ProgressEntry[];
  updateGoalProgress: (goalId: string, newCurrentValue: number) => void;
  
  // Financials & Payouts (Coach Pro)
  payouts: PayoutTransaction[];
  requestPayout: (coachId: string, amount: number) => void;
  
  // CRM / Coach Clients
  coachClients: CoachClientSummary[];
  addClientNote: (clientId: string, note: string, tag?: string) => void;

  // System / Demo reset
  resetAllData: () => void;
  isNotificationDrawerOpen: boolean;
  setIsNotificationDrawerOpen: (open: boolean) => void;
  reviewModalBooking: Booking | null;
  setReviewModalBooking: (booking: Booking | null) => void;
  
  // Apple Live Interactive Modules
  activeVideoBooking: Booking | null;
  setActiveVideoBooking: (booking: Booking | null) => void;
  activeChatPartner: ChatPartner | null;
  setActiveChatPartner: (partner: ChatPartner | null) => void;
  startChatWithCoach: (coach: CoachProfile) => void;
  startChatWithClient: (client: CoachClientSummary) => void;

  // Apple Theme & Dark Mode
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;

  // Workout Programs & Exercise Sheets
  workoutPrograms: WorkoutProgram[];
  toggleExerciseCompleted: (programId: string, sessionId: string, exerciseId: string) => void;
  toggleSessionCompleted: (programId: string, sessionId: string) => void;
  addWorkoutProgram: (program: WorkoutProgram) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const ONBOARDED_KEY = 'fmc_onboarded_v2';

const STORAGE_KEYS = {
  USERS: 'fmc_users_v2',
  CURRENT_USER: 'fmc_current_user_v2',
  COACHES: 'fmc_coaches_v2',
  AVAILABILITIES: 'fmc_availabilities_v2',
  BOOKINGS: 'fmc_bookings_v2',
  REVIEWS: 'fmc_reviews_v2',
  FAVORITES: 'fmc_favorites_v2',
  NOTIFICATIONS: 'fmc_notifications_v2',
  GOALS: 'fmc_goals_v2',
  PAYOUTS: 'fmc_payouts_v2',
  COACH_CLIENTS: 'fmc_coach_clients_v2',
  WORKOUT_PROGRAMS: 'fmc_workout_programs_v2',
  THEME_DARK: 'fmc_theme_dark_v2',
  THEME_MODE: 'fmc_theme_mode'
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Apparence : clair, sombre ou automatique (suit le réglage du téléphone)
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    try {
      const mode = localStorage.getItem(STORAGE_KEYS.THEME_MODE);
      if (mode === 'light' || mode === 'dark' || mode === 'system') return mode;
      const legacy = localStorage.getItem(STORAGE_KEYS.THEME_DARK);
      if (legacy !== null) return JSON.parse(legacy) ? 'dark' : 'light';
    } catch { /* stockage indisponible */ }
    return 'system';
  });
  const [systemDark, setSystemDark] = useState<boolean>(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  const isDarkMode = themeMode === 'dark' || (themeMode === 'system' && systemDark);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    try { localStorage.setItem(STORAGE_KEYS.THEME_MODE, mode); } catch { /* ignore */ }
  };
  const toggleDarkMode = () => setThemeMode(isDarkMode ? 'light' : 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  // Persistent or seed state
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  // Premier lancement : on affiche l'écran d'accueil (inscription client / coach)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (isSupabaseEnabled) return null; // restauré depuis la session Supabase
    if (!localStorage.getItem(ONBOARDED_KEY)) return null;
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return saved ? JSON.parse(saved) : null;
  });

  const [coaches, setCoaches] = useState<CoachProfile[]>(() => {
    if (isSupabaseEnabled) return [];
    const saved = localStorage.getItem(STORAGE_KEYS.COACHES);
    return saved ? JSON.parse(saved) : INITIAL_COACHES;
  });

  const [availabilities, setAvailabilities] = useState<AvailabilitySlot[]>(() => {
    if (isSupabaseEnabled) return [];
    const saved = localStorage.getItem(STORAGE_KEYS.AVAILABILITIES);
    return saved ? JSON.parse(saved) : INITIAL_AVAILABILITIES;
  });

  const [bookings, setBookings] = useState<Booking[]>(() => {
    if (isSupabaseEnabled) return [];
    const saved = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
    return saved ? JSON.parse(saved) : INITIAL_BOOKINGS;
  });

  const [reviews, setReviews] = useState<Review[]>(() => {
    if (isSupabaseEnabled) return [];
    const saved = localStorage.getItem(STORAGE_KEYS.REVIEWS);
    return saved ? JSON.parse(saved) : INITIAL_REVIEWS;
  });

  const [favorites, setFavorites] = useState<Favorite[]>(() => {
    if (isSupabaseEnabled) return [];
    const saved = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    return saved ? JSON.parse(saved) : INITIAL_FAVORITES;
  });

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    if (isSupabaseEnabled) return [];
    const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  const [goals, setGoals] = useState<Goal[]>(() => {
    if (isSupabaseEnabled) return [];
    const saved = localStorage.getItem(STORAGE_KEYS.GOALS);
    return saved ? JSON.parse(saved) : INITIAL_GOALS;
  });

  const [payouts, setPayouts] = useState<PayoutTransaction[]>(() => {
    if (isSupabaseEnabled) return [];
    const saved = localStorage.getItem(STORAGE_KEYS.PAYOUTS);
    return saved ? JSON.parse(saved) : INITIAL_PAYOUTS;
  });

  const [coachClients, setCoachClients] = useState<CoachClientSummary[]>(() => {
    if (isSupabaseEnabled) return [];
    const saved = localStorage.getItem(STORAGE_KEYS.COACH_CLIENTS);
    return saved ? JSON.parse(saved) : INITIAL_COACH_CLIENTS;
  });

  const [workoutPrograms, setWorkoutPrograms] = useState<WorkoutProgram[]>(() => {
    if (isSupabaseEnabled) return [];
    const saved = localStorage.getItem(STORAGE_KEYS.WORKOUT_PROGRAMS);
    return saved ? JSON.parse(saved) : INITIAL_WORKOUT_PROGRAMS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.WORKOUT_PROGRAMS, JSON.stringify(workoutPrograms));
  }, [workoutPrograms]);

  const toggleExerciseCompleted = (programId: string, sessionId: string, exerciseId: string) => {
    setWorkoutPrograms((prev) =>
      prev.map((prog) => {
        if (prog.id !== programId) return prog;
        return {
          ...prog,
          sessions: prog.sessions.map((sess) => {
            if (sess.id !== sessionId) return sess;
            const updatedExercises = sess.exercises.map((ex) => {
              if (ex.id !== exerciseId) return ex;
              return { ...ex, completed: !ex.completed };
            });
            const allDone = updatedExercises.every((e) => e.completed);
            return {
              ...sess,
              exercises: updatedExercises,
              isCompleted: allDone,
              completedAt: allDone ? new Date().toISOString().split('T')[0] : sess.completedAt
            };
          })
        };
      })
    );
  };

  const toggleSessionCompleted = (programId: string, sessionId: string) => {
    setWorkoutPrograms((prev) =>
      prev.map((prog) => {
        if (prog.id !== programId) return prog;
        return {
          ...prog,
          sessions: prog.sessions.map((sess) => {
            if (sess.id !== sessionId) return sess;
            const willBeCompleted = !sess.isCompleted;
            return {
              ...sess,
              isCompleted: willBeCompleted,
              completedAt: willBeCompleted ? new Date().toISOString().split('T')[0] : undefined,
              exercises: sess.exercises.map((e) => ({ ...e, completed: willBeCompleted }))
            };
          })
        };
      })
    );
  };

  const addWorkoutProgram = (program: WorkoutProgram) => {
    setWorkoutPrograms((prev) => [program, ...prev]);
    addNotification({
      userId: program.clientId,
      type: 'system',
      title: 'Nouveau programme assigné ! 💪',
      message: `${program.coachName} vous a préparé le programme "${program.title}".`
    });
  };

  const [progressEntries] = useState<ProgressEntry[]>(INITIAL_PROGRESS_ENTRIES);
  const categories = INITIAL_CATEGORIES;
  const sessionTypes = INITIAL_SESSION_TYPES;

  // Active navigation state
  const homeScreenFor = (u: User | null): AppScreen =>
    !u ? 'onboarding' : u.role === 'coach' ? 'coach_dashboard' : u.role === 'admin' ? 'admin_dashboard' : 'home';
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(() => homeScreenFor(currentUser));
  const [screenHistory, setScreenHistory] = useState<AppScreen[]>(() => [homeScreenFor(currentUser)]);
  const [selectedCoach, setSelectedCoach] = useState<CoachProfile | null>(INITIAL_COACHES[0]);
  const [bookingDraft, setBookingDraft] = useState<BookingDraft | null>(null);
  const [latestConfirmedBooking, setLatestConfirmedBooking] = useState<Booking | null>(null);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // UI Drawers & Modals
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [reviewModalBooking, setReviewModalBooking] = useState<Booking | null>(null);
  const [activeVideoBooking, setActiveVideoBooking] = useState<Booking | null>(null);
  const [activeChatPartner, setActiveChatPartner] = useState<ChatPartner | null>(null);

  const startChatWithCoach = (coach: CoachProfile) => {
    setActiveChatPartner({
      id: coach.id,
      name: coach.name,
      avatar: coach.photo,
      userId: coach.userId,
      role: 'coach',
      title: coach.title,
      city: coach.city
    });
  };

  const startChatWithClient = (clientSummary: CoachClientSummary) => {
    setActiveChatPartner({
      id: clientSummary.clientId,
      userId: clientSummary.clientId,
      name: clientSummary.clientName,
      avatar: clientSummary.clientAvatar,
      role: 'client',
      title: `Client • ${clientSummary.totalSessions} séance(s)`
    });
  };

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COACHES, JSON.stringify(coaches));
  }, [coaches]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AVAILABILITIES, JSON.stringify(availabilities));
  }, [availabilities]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews));
  }, [reviews]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PAYOUTS, JSON.stringify(payouts));
  }, [payouts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COACH_CLIENTS, JSON.stringify(coachClients));
  }, [coachClients]);

  // Recalculate coach ratings whenever reviews update
  useEffect(() => {
    setCoaches((prevCoaches) =>
      prevCoaches.map((coach) => {
        const coachReviews = reviews.filter((r) => r.coachId === coach.id && !r.isHidden);
        if (coachReviews.length === 0) return coach;
        const sum = coachReviews.reduce((acc, r) => acc + r.rating, 0);
        const avg = parseFloat((sum / coachReviews.length).toFixed(1));
        return {
          ...coach,
          rating: avg,
          reviewCount: coachReviews.length
        };
      })
    );
  }, [reviews]);

  // Helper to select coach and keep it synchronized
  const selectCoachForBooking = (coach: CoachProfile) => {
    setSelectedCoach(coach);
  };

  // Screen navigation helper
  const navigateTo = (
    screen: AppScreen, 
    extraParams?: { coachId?: string; bookingDraft?: BookingDraft; bookingId?: string }
  ) => {
    if (extraParams?.coachId) {
      const c = coaches.find(item => item.id === extraParams.coachId);
      if (c) setSelectedCoach(c);
    }
    if (extraParams?.bookingDraft) {
      setBookingDraft(extraParams.bookingDraft);
    }
    
    setScreenHistory((prev) => [...prev, screen]);
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    if (screenHistory.length > 1) {
      const newHistory = [...screenHistory];
      newHistory.pop();
      const prevScreen = newHistory[newHistory.length - 1];
      setScreenHistory(newHistory);
      setCurrentScreen(prevScreen);
    } else {
      // Fallback
      if (currentUser?.role === 'coach') {
        setCurrentScreen('coach_dashboard');
      } else if (currentUser?.role === 'admin') {
        setCurrentScreen('admin_dashboard');
      } else {
        setCurrentScreen('home');
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Auth methods
  const loginAs = (role: UserRole, userOverride?: User) => {
    localStorage.setItem(ONBOARDED_KEY, '1');
    window.scrollTo(0, 0);
    if (isSupabaseEnabled) {
      // Mode connecté : pas de changement de compte, seulement d'espace
      if (!currentUser) return;
      if (role === 'coach' && currentUser.role === 'client') {
        becomeCoach();
        return;
      }
      if (role === 'admin' && currentUser.role !== 'admin') return;
      const screen: AppScreen = role === 'coach' ? 'coach_dashboard' : role === 'admin' ? 'admin_dashboard' : 'home';
      setCurrentScreen(screen);
      setScreenHistory([screen]);
      return;
    }
    if (userOverride) {
      setCurrentUser(userOverride);
    } else {
      const targetUser = users.find((u) => u.role === role) || INITIAL_USERS.find((u) => u.role === role);
      if (targetUser) {
        setCurrentUser(targetUser);
      }
    }

    if (role === 'coach') {
      setCurrentScreen('coach_dashboard');
      setScreenHistory(['coach_dashboard']);
    } else if (role === 'admin') {
      setCurrentScreen('admin_dashboard');
      setScreenHistory(['admin_dashboard']);
    } else {
      setCurrentScreen('home');
      setScreenHistory(['home']);
    }
  };

  const logout = () => {
    if (supabase) {
      import('../lib/push').then(({ unregisterPush }) => unregisterPush()).finally(() => supabase!.auth.signOut()); // l'écouteur de session remet l'app à zéro
      return;
    }
    setCurrentUser(null);
    setCurrentScreen('onboarding');
    setScreenHistory(['onboarding']);
  };

  const registerUser = async (
    name: string,
    email: string,
    role: UserRole,
    extra?: RegisterExtra
  ): Promise<AuthResult> => {
    localStorage.setItem(ONBOARDED_KEY, '1');
    window.scrollTo(0, 0);
    const cityPreset = findCityByName(extra?.city || 'Paris') || findCityByName('Paris');
    const city = extra?.city?.trim() || 'Paris';
    const lat = cityPreset?.latitude ?? 48.8566;
    const lng = cityPreset?.longitude ?? 2.3522;

    if (supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: extra?.password || '',
        options: {
          data: { name, role, city, phone: extra?.phone, category: extra?.category, latitude: lat, longitude: lng },
        },
      });
      if (error) return { error: authErrorFr(error.message) };
      if (!data.session) {
        return {
          needsConfirmation: true,
          info: `Un email de confirmation a été envoyé à ${email}. Cliquez sur le lien puis connectez-vous.`,
        };
      }
      return {}; // la session déclenche le chargement du compte
    }
    const newUser: User = {
      id: `user-${Date.now()}`,
      name,
      email,
      role,
      avatar: role === 'coach' 
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
      createdAt: new Date().toISOString(),
      status: 'active',
      phone: extra?.phone,
      city,
      latitude: lat,
      longitude: lng,
      memberSince: new Date().getFullYear().toString()
    };

    setUsers((prev) => [...prev, newUser]);
    setCurrentUser(newUser);

    if (role === 'coach') {
      // Create empty profile
      const newCoach: CoachProfile = {
        id: `coach-${Date.now()}`,
        userId: newUser.id,
        name: newUser.name,
        title: 'Nouveau Coach Certifié',
        bio: 'Bienvenue sur mon profil Find My Coach. Je personnalise mes séances selon vos objectifs de performance et santé.',
        photo: newUser.avatar,
        rating: 5.0,
        reviewCount: 0,
        experienceYears: 2,
        hourlyRate: 70,
        isElite: false,
        isAvailable: true,
        location: `${city} & En ligne`,
        city,
        latitude: lat,
        longitude: lng,
        interventionRadiusKm: 15,
        interventionZone: `${city} et alentours (15 km)`,
        formats: ['online', 'coach_location', 'home'],
        isOnlineCoaching: true,
        isInPersonCoaching: true,
        verificationStatus: 'pending',
        specialties: extra?.category ? [extra.category] : ['Fitness', 'Motivation', 'Mobilité'],
        category: extra?.category || 'Sport & Fitness',
        languages: ['Français'],
        certifications: ['BPJEPS AF'],
        isProfileComplete: false,
        isActive: true
      };
      setCoaches((prev) => [...prev, newCoach]);
      setSelectedCoach(newCoach);
      setCurrentScreen('coach_profile_edit');
      setScreenHistory(['coach_dashboard', 'coach_profile_edit']);
    } else {
      setCurrentScreen('home');
      setScreenHistory(['home']);
    }

    addNotification({
      userId: newUser.id,
      type: 'system',
      title: 'Bienvenue sur Find My Coach !',
      message: 'Votre compte est prêt. Explorez les meilleurs coachs certifiés.'
    });
    return {};
  };

  const loginWithPassword = async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'Connexion indisponible en mode démo.' };
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? { error: authErrorFr(error.message) } : {};
  };

  const resetPassword = async (email: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'Indisponible en mode démo.' };
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    return error
      ? { error: authErrorFr(error.message) }
      : { info: `Si un compte existe pour ${email}, un email de réinitialisation vient d'être envoyé.` };
  };

  const updateUserProfile = (updates: Partial<User>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates };
    setCurrentUser(updated);
    if (isSupabaseEnabled) saveProfile(updated);
    setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? updated : u)));
  };

  // Coach helpers
  const getCoachById = (id: string) => coaches.find((c) => c.id === id);

  const updateCoachProfile = (coachId: string, updates: Partial<CoachProfile>) => {
    setCoaches((prev) =>
      prev.map((c) => (c.id === coachId ? { ...c, ...updates, isProfileComplete: true } : c))
    );
    if (selectedCoach && selectedCoach.id === coachId) {
      setSelectedCoach((prev) => (prev ? { ...prev, ...updates } : null));
    }
  };

  /** Change la photo du coach (fiche publique + photo de profil) sans toucher au reste. */
  const updateCoachPhoto = (coachId: string, photo: string) => {
    setCoaches((prev) => prev.map((c) => (c.id === coachId ? { ...c, photo } : c)));
    setSelectedCoach((prev) => (prev && prev.id === coachId ? { ...prev, photo } : prev));
    if (currentUser) {
      const updated: User = { ...currentUser, avatar: photo };
      setCurrentUser(updated);
      if (syncOn) saveProfile(updated);
    }
  };

  const toggleCoachActiveStatus = (coachId: string) => {
    setCoaches((prev) =>
      prev.map((c) => (c.id === coachId ? { ...c, isActive: !c.isActive } : c))
    );
  };

  const submitVerificationDoc = (
    coachId: string, 
    type: 'diploma' | 'identity' | 'insurance' | 'kbis' | 'cert', 
    title: string
  ) => {
    const newDoc: VerificationDoc = {
      id: `doc-${Date.now()}`,
      coachId,
      type,
      title,
      status: 'pending',
      submittedAt: new Date().toISOString()
    };

    setCoaches(prev => prev.map(c => {
      if (c.id === coachId) {
        const existingDocs = c.verificationDocs || [];
        return {
          ...c,
          verificationDocs: [...existingDocs, newDoc],
          verificationStatus: c.verificationStatus === 'verified' ? 'verified' : 'pending'
        };
      }
      return c;
    }));

    addNotification({
      userId: currentUser?.id || 'admin',
      type: 'system',
      title: 'Document soumis avec succès 📄',
      message: `Votre document "${title}" a été transmis pour validation sous 24h.`
    });
  };

  const reviewVerificationDoc = (
    coachId: string, 
    docId: string, 
    status: 'approved' | 'rejected', 
    feedback?: string
  ) => {
    setCoaches(prev => prev.map(c => {
      if (c.id === coachId) {
        const updatedDocs = (c.verificationDocs || []).map(d => 
          d.id === docId ? { ...d, status, verifiedAt: new Date().toISOString(), adminFeedback: feedback } : d
        );
        const allApproved = updatedDocs.length > 0 && updatedDocs.every(d => d.status === 'approved');
        return {
          ...c,
          verificationDocs: updatedDocs,
          verificationStatus: allApproved ? 'verified' : (status === 'rejected' ? 'unverified' : 'pending')
        };
      }
      return c;
    }));
  };

  // Availabilities
  const getCoachAvailabilities = (coachId: string, date?: string) => {
    return availabilities.filter(
      (slot) => slot.coachId === coachId && (!date || slot.date === date)
    );
  };

  const addAvailabilitySlot = (coachId: string, date: string, startTime: string, endTime: string) => {
    const newSlot: AvailabilitySlot = {
      id: `slot-${coachId}-${date}-${startTime.replace(':', '')}-${Date.now()}`,
      coachId,
      date,
      startTime,
      endTime,
      isBooked: false
    };
    setAvailabilities((prev) => [...prev, newSlot]);
  };

  const removeAvailabilitySlot = (slotId: string) => {
    setAvailabilities((prev) => prev.filter((s) => s.id !== slotId));
  };

  const generateBatchWeeklySlots = (
    coachId: string, 
    days: number[], 
    timeSlots: { start: string; end: string }[]
  ) => {
    const newSlots: AvailabilitySlot[] = [];
    for (let dayOffset = 0; dayOffset <= 21; dayOffset++) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + dayOffset);
      const dayOfWeek = targetDate.getDay();

      if (days.includes(dayOfWeek)) {
        const yyyy = targetDate.getFullYear();
        const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
        const dd = String(targetDate.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        timeSlots.forEach((t) => {
          const slotId = `slot-${coachId}-${dateStr}-${t.start.replace(':', '')}`;
          const alreadyExists = availabilities.some(a => a.coachId === coachId && a.date === dateStr && a.startTime === t.start);
          if (!alreadyExists) {
            newSlots.push({
              id: slotId,
              coachId,
              date: dateStr,
              startTime: t.start,
              endTime: t.end,
              isBooked: false
            });
          }
        });
      }
    }

    if (newSlots.length > 0) {
      setAvailabilities(prev => [...prev, ...newSlots]);
      addNotification({
        userId: currentUser?.id || 'coach',
        type: 'system',
        title: 'Planning synchronisé 🗓️',
        message: `${newSlots.length} créneaux récurrents ont été générés pour les 3 prochaines semaines.`
      });
    }
  };

  // Bookings
  const createBooking = (draft: BookingDraft, paymentMethod: string): Booking => {
    const bookingId = uniqueId('bk');
    const newBooking: Booking = {
      id: bookingId,
      clientId: currentUser?.id || 'guest-client',
      clientName: currentUser?.name || 'Alex Rivers',
      clientAvatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
      clientEmail: currentUser?.email || 'alex.rivers@gmail.com',
      coachId: draft.coach.id,
      coachName: draft.coach.name,
      coachTitle: draft.coach.title,
      coachPhoto: draft.coach.photo,
      availabilityId: draft.selectedSlot.id,
      date: draft.selectedDate,
      startTime: draft.selectedSlot.startTime,
      endTime: draft.selectedSlot.endTime,
      sessionType: draft.sessionType,
      format: draft.sessionType.format || 'online',
      price: draft.basePrice,
      serviceFee: draft.serviceFee,
      taxes: draft.taxes,
      total: draft.total,
      paymentStatus: 'paid',
      bookingStatus: 'confirmed',
      paymentMethod,
      meetingLink: `https://zoom.us/j/findmycoach-${draft.coach.id.replace('coach-', '')}-${Date.now().toString().slice(-6)}`,
      notes: draft.notes,
      clientAddress: draft.clientAddress,
      createdAt: new Date().toISOString(),
      hasReview: false
    };

    // 1. Add booking
    setBookings((prev) => [newBooking, ...prev]);
    setLatestConfirmedBooking(newBooking);

    // 2. Lock the availability slot to prevent double-booking
    setAvailabilities((prev) =>
      prev.map((slot) =>
        slot.id === draft.selectedSlot.id
          ? { ...slot, isBooked: true, bookingId }
          : slot
      )
    );

    // 3. Create coach payout transaction (85% net payout, 15% platform fee)
    const commission = Math.round(draft.basePrice * 0.15 * 100) / 100;
    const netPayout = Math.round((draft.basePrice - commission) * 100) / 100;
    const newPayout: PayoutTransaction = {
      id: `pay-${Date.now()}`,
      bookingId,
      coachId: draft.coach.id,
      clientName: newBooking.clientName,
      sessionTitle: `${draft.sessionType.name} (1h)`,
      date: draft.selectedDate,
      grossAmount: draft.basePrice,
      commissionAmount: commission,
      netAmount: netPayout,
      status: 'pending'
    };
    setPayouts(prev => [newPayout, ...prev]);

    // 4. Update or add Coach Client CRM record
    setCoachClients(prev => {
      const existing = prev.find(cc => cc.clientId === newBooking.clientId);
      if (existing) {
        return prev.map(cc => cc.clientId === newBooking.clientId ? {
          ...cc,
          totalSessions: cc.totalSessions + 1,
          nextSessionDate: newBooking.date,
          status: 'active'
        } : cc);
      } else {
        return [{
          id: `cc-${Date.now()}`,
          clientId: newBooking.clientId,
          clientName: newBooking.clientName,
          clientAvatar: newBooking.clientAvatar,
          clientEmail: newBooking.clientEmail,
          totalSessions: 1,
          nextSessionDate: newBooking.date,
          notes: draft.notes || 'Nouveau client Find My Coach',
          tags: ['Nouveau client'],
          status: 'active'
        }, ...prev];
      }
    });

    // 5. Trigger in-app notifications
    addNotification({
      userId: newBooking.clientId,
      type: 'booking_confirmed',
      title: 'Réservation confirmée ✅',
      message: `Votre séance de ${draft.sessionType.name} avec ${draft.coach.name} est confirmée pour le ${draft.selectedDate} à ${draft.selectedSlot.startTime}.`,
      relatedBookingId: bookingId
    });

    addNotification({
      userId: draft.coach.userId,
      type: 'new_booking',
      title: 'Nouvelle réservation reçue ! 🎉',
      message: `${newBooking.clientName} a réservé une session (${draft.sessionType.name}) le ${draft.selectedDate} à ${draft.selectedSlot.startTime}.`,
      relatedBookingId: bookingId
    });

    return newBooking;
  };

  const cancelBooking = async (bookingId: string): Promise<{ refunded: boolean; amount?: number }> => {
    const b = bookings.find((item) => item.id === bookingId);
    if (!b) return { refunded: false };

    // En ligne : le serveur annule et rembourse via Stripe (les erreurs remontent à l'écran)
    if (syncOn) {
      const { cancelBookingRemote, fetchBooking } = await import('../lib/payments');
      const result = await cancelBookingRemote(bookingId);
      const fresh = await fetchBooking<Booking>(bookingId);
      const updated: Booking = fresh ?? { ...b, bookingStatus: 'cancelled', paymentStatus: result.refunded ? 'refunded' : b.paymentStatus };
      setBookings((prev) => {
        const next = prev.map((x) => (x.id === bookingId ? updated : x));
        bookingsSync.setBaseline(next);
        return next;
      });
      if (b.availabilityId) {
        setAvailabilities((prev) =>
          prev.map((slot) => (slot.id === b.availabilityId ? { ...slot, isBooked: false, bookingId: undefined } : slot))
        );
      }
      setPayouts((prev) => prev.filter((p) => p.bookingId !== bookingId));
      return result;
    }

    setBookings((prev) =>
      prev.map((item) =>
        item.id === bookingId
          ? { ...item, bookingStatus: 'cancelled', paymentStatus: 'refunded' }
          : item
      )
    );

    // Free the availability slot
    if (b.availabilityId) {
      setAvailabilities((prev) =>
        prev.map((slot) =>
          slot.id === b.availabilityId
            ? { ...slot, isBooked: false, bookingId: undefined }
            : slot
        )
      );
    }

    // Cancel payout
    setPayouts(prev => prev.filter(p => p.bookingId !== bookingId));

    addNotification({
      userId: b.clientId,
      type: 'booking_cancelled',
      title: 'Réservation annulée',
      message: `Votre réservation avec ${b.coachName} a été annulée.`,
      relatedBookingId: bookingId
    });
    return { refunded: true, amount: b.total };
  };

  const completeBooking = (bookingId: string) => {
    setBookings((prev) =>
      prev.map((item) =>
        item.id === bookingId ? { ...item, bookingStatus: 'completed' } : item
      )
    );

    // Validate payout
    setPayouts(prev => prev.map(p => 
      p.bookingId === bookingId 
        ? { ...p, status: 'paid', paidAt: new Date().toISOString() } 
        : p
    ));

    const b = bookings.find(item => item.id === bookingId);
    if (b) {
      // Prompt client for review
      setReviewModalBooking(b);
    }
  };

  // Financials
  const requestPayout = (coachId: string, amount: number) => {
    addNotification({
      userId: currentUser?.id || 'coach',
      type: 'payment_received',
      title: 'Virement bancaire initié 💶',
      message: `Votre demande de virement SEPA de ${amount.toFixed(2)} € a été transmise à votre banque.`
    });
  };

  // CRM
  const addClientNote = (clientId: string, note: string, tag?: string) => {
    setCoachClients(prev => prev.map(cc => {
      if (cc.clientId === clientId) {
        return {
          ...cc,
          notes: note,
          tags: tag ? [...(cc.tags || []).filter(t => t !== tag), tag] : cc.tags
        };
      }
      return cc;
    }));
  };

  // Reviews
  const addReview = (bookingId: string, rating: number, comment: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    const newReview: Review = {
      id: `rev-${Date.now()}`,
      bookingId,
      clientId: booking.clientId,
      clientName: booking.clientName,
      clientAvatar: booking.clientAvatar,
      coachId: booking.coachId,
      rating,
      comment,
      createdAt: 'À l\'instant'
    };

    setReviews((prev) => [newReview, ...prev]);

    // Mark booking as reviewed
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, hasReview: true } : b))
    );

    // Notify Coach
    const coach = coaches.find((c) => c.id === booking.coachId);
    if (coach) {
      addNotification({
        userId: coach.userId,
        type: 'new_review',
        title: 'Nouvel avis client reçu ! ⭐',
        message: `${booking.clientName} vous a attribué une note de ${rating}/5 : "${comment.slice(0, 40)}..."`,
        relatedBookingId: bookingId
      });
    }
  };

  const getCoachReviews = (coachId: string) => {
    return reviews.filter((r) => r.coachId === coachId && !r.isHidden);
  };

  const toggleReviewVisibility = (reviewId: string) => {
    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, isHidden: !r.isHidden } : r))
    );
  };

  // Favorites
  const toggleFavorite = (coachId: string) => {
    if (!currentUser) return;
    const exists = favorites.some((f) => f.userId === currentUser.id && f.coachId === coachId);
    if (exists) {
      setFavorites((prev) => prev.filter((f) => !(f.userId === currentUser.id && f.coachId === coachId)));
    } else {
      setFavorites((prev) => [
        ...prev,
        { id: `fav-${Date.now()}`, userId: currentUser.id, coachId, createdAt: new Date().toISOString() }
      ]);
    }
  };

  const isFavorite = (coachId: string) => {
    if (!currentUser) return false;
    return favorites.some((f) => f.userId === currentUser.id && f.coachId === coachId);
  };

  // Notifications
  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    if (!currentUser) return;
    setNotifications((prev) =>
      prev.map((n) => (n.userId === currentUser.id ? { ...n, read: true } : n))
    );
  };

  const addNotification = (item: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
    const newNotif: Notification = {
      ...item,
      id: uniqueId('notif'),
      read: false,
      createdAt: 'À l\'instant'
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const unreadNotificationsCount = currentUser
    ? notifications.filter((n) => n.userId === currentUser.id && !n.read).length
    : 0;

  // Goals
  const updateGoalProgress = (goalId: string, newCurrentValue: number) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id === goalId) {
          const pct = Math.min(100, Math.round((newCurrentValue / g.targetValue) * 100));
          return {
            ...g,
            currentValue: newCurrentValue,
            percentage: pct,
            status: pct >= 100 ? 'completed' : 'active'
          };
        }
        return g;
      })
    );
  };

  // Reset demo
  const resetAllData = () => {
    localStorage.clear();
    setUsers(INITIAL_USERS);
    setCurrentUser(INITIAL_USERS[0]);
    setCoaches(INITIAL_COACHES);
    setAvailabilities(INITIAL_AVAILABILITIES);
    setBookings(INITIAL_BOOKINGS);
    setReviews(INITIAL_REVIEWS);
    setFavorites(INITIAL_FAVORITES);
    setNotifications(INITIAL_NOTIFICATIONS);
    setGoals(INITIAL_GOALS);
    setPayouts(INITIAL_PAYOUTS);
    setCoachClients(INITIAL_COACH_CLIENTS);
    setCurrentScreen('home');
    setScreenHistory(['home']);
    setSelectedCoach(INITIAL_COACHES[0]);
    setBookingDraft(null);
  };

  // Pont pour l'app native (bouton retour Android) et les tests : window.__fmc
  useEffect(() => {
    (window as any).__fmc = { navigateTo, goBack, canGoBack: screenHistory.length > 1 };
  });

  // =====================================================================
  // Supabase : session, chargement des données et synchronisation
  // =====================================================================
  const [authLoading, setAuthLoading] = useState<boolean>(isSupabaseEnabled);
  const [remoteReady, setRemoteReady] = useState(false);
  const loadedUserRef = React.useRef<string | null>(null);

  const uid = currentUser?.id;
  const isAdminUser = currentUser?.role === 'admin';
  const myCoachIds = coaches.filter((c) => c.userId === uid).map((c) => c.id);
  const syncOn = isSupabaseEnabled && remoteReady && !!uid;

  const coachesSync = useRemoteSync<CoachProfile>('coaches', coaches, syncOn, (c) => c.userId === uid || isAdminUser);
  const availSync = useRemoteSync<AvailabilitySlot>('availabilities', availabilities, syncOn, (a) => myCoachIds.includes(a.coachId));
  const bookingsSync = useRemoteSync<Booking>('bookings', bookings, syncOn, (b) => b.clientId === uid || myCoachIds.includes(b.coachId) || isAdminUser);
  const reviewsSync = useRemoteSync<Review>('reviews', reviews, syncOn, (r) => r.clientId === uid || isAdminUser);
  const favoritesSync = useRemoteSync<Favorite>('favorites', favorites, syncOn, (f) => f.userId === uid);
  const notificationsSync = useRemoteSync<Notification>('notifications', notifications, syncOn, (n, isNew) => isNew || n.userId === uid);
  const goalsSync = useRemoteSync<Goal>('goals', goals, syncOn, (g) => g.userId === uid);
  const programsSync = useRemoteSync<WorkoutProgram>('workout_programs', workoutPrograms, syncOn, (p) => p.clientId === uid || myCoachIds.includes(p.coachId));
  const allSyncs = [coachesSync, availSync, bookingsSync, reviewsSync, favoritesSync, notificationsSync, goalsSync, programsSync];

  const clearAppData = () => {
    allSyncs.forEach((s) => s.reset());
    setRemoteReady(false);
    setCoaches([]);
    setAvailabilities([]);
    setBookings([]);
    setReviews([]);
    setFavorites([]);
    setNotifications([]);
    setGoals([]);
    setWorkoutPrograms([]);
    setPayouts([]);
    setCoachClients([]);
  };

  /** Charge les données du compte depuis Supabase et prépare l'écran d'arrivée. */
  const loadRemoteData = async (user: User) => {
    const snap = await fetchSnapshot();

    // Coach sans fiche (nouveau compte) : on crée sa fiche par défaut
    let coachesList = snap.coaches;
    let createdCoach: CoachProfile | null = null;
    if (user.role === 'coach' && !coachesList.some((c) => c.userId === user.id)) {
      createdCoach = buildNewCoachProfile(user, (user as User & { category?: string }).category);
      coachesList = [...coachesList, createdCoach];
    }

    // Créneaux : ceux de la base + créneaux générés pour les coachs de démonstration
    const demoIds = new Set(INITIAL_COACHES.map((c) => c.id));
    const visibleDemo = new Set(coachesList.filter((c) => demoIds.has(c.id)).map((c) => c.id));
    const booked = new Set(snap.bookedSlotIds);
    const slots = [...snap.availabilities, ...INITIAL_AVAILABILITIES.filter((a) => visibleDemo.has(a.coachId))].map((a) =>
      booked.has(a.id) ? { ...a, isBooked: true } : { ...a, isBooked: false }
    );

    // Données dérivées pour l'espace coach
    const myIds = coachesList.filter((c) => c.userId === user.id).map((c) => c.id);
    const coachBookings = snap.bookings.filter((b) => myIds.includes(b.coachId));
    const derivedPayouts: PayoutTransaction[] = coachBookings
      .filter((b) => b.bookingStatus === 'completed' || b.bookingStatus === 'confirmed')
      .map((b) => {
        const commission = Math.round(b.price * 0.15 * 100) / 100;
        return {
          id: `pay-${b.id}`,
          bookingId: b.id,
          coachId: b.coachId,
          clientName: b.clientName,
          sessionTitle: b.sessionType.name,
          date: b.date,
          grossAmount: b.price,
          commissionAmount: commission,
          netAmount: Math.round((b.price - commission) * 100) / 100,
          status: 'pending' as const,
        };
      });
    const clientsMap = new Map<string, CoachClientSummary>();
    coachBookings
      .filter((b) => b.bookingStatus !== 'cancelled')
      .forEach((b) => {
        const cur = clientsMap.get(b.clientId);
        clientsMap.set(b.clientId, {
          id: `cc-${b.clientId}`,
          clientId: b.clientId,
          clientName: b.clientName,
          clientAvatar: b.clientAvatar,
          clientEmail: b.clientEmail,
          clientPhone: b.clientPhone,
          totalSessions: (cur?.totalSessions || 0) + 1,
          lastSessionDate: b.bookingStatus === 'completed' ? b.date : cur?.lastSessionDate,
          nextSessionDate: b.bookingStatus === 'confirmed' ? b.date : cur?.nextSessionDate,
          notes: cur?.notes || b.notes,
          tags: cur?.tags || [],
          status: b.bookingStatus === 'confirmed' ? 'active' : cur?.status || 'completed',
        });
      });

    // Référence de synchro AVANT la mise à jour de l'état (pour ne rien renvoyer au serveur)
    coachesSync.setBaseline(snap.coaches);
    availSync.setBaseline(slots);
    bookingsSync.setBaseline(snap.bookings);
    reviewsSync.setBaseline(snap.reviews);
    favoritesSync.setBaseline(snap.favorites);
    notificationsSync.setBaseline(snap.notifications);
    goalsSync.setBaseline(snap.goals);
    programsSync.setBaseline(snap.workoutPrograms);

    setCoaches(coachesList);
    setAvailabilities(slots);
    setBookings(snap.bookings);
    setReviews(snap.reviews);
    setFavorites(snap.favorites);
    setNotifications(snap.notifications);
    setGoals(snap.goals);
    setWorkoutPrograms(snap.workoutPrograms);
    setPayouts(derivedPayouts);
    setCoachClients([...clientsMap.values()]);
    setRemoteReady(true);

    // Mail de bienvenue (envoyé une seule fois par le serveur, ignoré ensuite)
    supabase?.functions.invoke('send-welcome').catch(() => {});

    // Notifications push sur le téléphone (si activées)
    import('../lib/push').then(({ registerPush }) =>
      registerPush(user.id, (data) => {
        if (data.type === 'message') setCurrentScreen(user.role === 'coach' ? 'coach_clients' : 'bookings');
        else if (data.bookingId) {
          setCurrentScreen(user.role === 'coach' ? 'coach_bookings' : 'bookings');
        } else setIsNotificationDrawerOpen(true);
      })
    );

    // Paiements restés « en attente » : on revérifie auprès de Stripe
    const myPending = snap.bookings.filter((b) => b.clientId === user.id && b.bookingStatus === 'pending');
    if (myPending.length) {
      import('../lib/payments').then(async ({ verifyPayment, fetchBooking }) => {
        for (const p of myPending) {
          if ((await verifyPayment(p.id)) !== 'confirmed') continue;
          const fresh = await fetchBooking<Booking>(p.id);
          if (!fresh) continue;
          setBookings((prev) => {
            const next = prev.map((x) => (x.id === fresh.id ? fresh : x));
            bookingsSync.setBaseline(next);
            return next;
          });
        }
      });
    }

    const myCoach = coachesList.find((c) => c.userId === user.id);
    if (myCoach) setSelectedCoach(myCoach);
    else if (coachesList[0]) setSelectedCoach(coachesList[0]);

    const landing: AppScreen =
      user.role === 'coach' ? (myCoach && !myCoach.isProfileComplete ? 'coach_profile_edit' : 'coach_dashboard')
      : user.role === 'admin' ? 'admin_dashboard'
      : 'home';
    setCurrentScreen(landing);
    setScreenHistory(user.role === 'coach' && landing === 'coach_profile_edit' ? ['coach_dashboard', landing] : [landing]);
  };

  // Écoute de la session (démarrage, connexion, déconnexion)
  useEffect(() => {
    if (!supabase) return;
    const handleSession = async (authUserId: string | null) => {
      if (!authUserId) {
        loadedUserRef.current = null;
        clearAppData();
        setCurrentUser(null);
        setCurrentScreen('onboarding');
        setScreenHistory(['onboarding']);
        setAuthLoading(false);
        return;
      }
      if (loadedUserRef.current === authUserId) return;
      loadedUserRef.current = authUserId;
      setAuthLoading(true);
      try {
        let profile = await fetchProfile(authUserId);
        if (!profile) {
          // le profil est créé par un trigger : on laisse un court délai après l'inscription
          await new Promise((r) => setTimeout(r, 1200));
          profile = await fetchProfile(authUserId);
        }
        if (!profile) throw new Error('Profil introuvable');
        setCurrentUser(profile);
        await loadRemoteData(profile);
      } catch (err) {
        console.error('[supabase] chargement du compte impossible', err);
        loadedUserRef.current = null;
        setCurrentUser(null);
        setCurrentScreen('onboarding');
        setScreenHistory(['onboarding']);
      } finally {
        setAuthLoading(false);
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        // différé : ne pas appeler Supabase directement dans ce callback
        setTimeout(() => handleSession(session?.user?.id ?? null), 0);
      }
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Notifications en temps réel
  useEffect(() => {
    if (!supabase || !syncOn || !uid) return;
    const channel = supabase
      .channel(`notifications-${uid}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` },
        (payload) => {
          const n = (payload.new as { data: Notification }).data;
          setNotifications((prev) => {
            if (prev.some((p) => p.id === n.id)) return prev;
            notificationsSync.setBaseline([n, ...prev]);
            return [n, ...prev];
          });
        }
      )
      .subscribe();
    return () => {
      supabase?.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncOn, uid]);

  const createPendingBooking = async (draft: BookingDraft): Promise<Booking> => {
    if (!supabase || !currentUser) throw new Error('Connexion requise');
    if (draft.coach.userId === currentUser.id) throw new Error('Vous ne pouvez pas réserver une séance avec vous-même.');
    const id = uniqueId('bk');
    const b: Booking = {
      id,
      clientId: currentUser.id,
      clientName: currentUser.name,
      clientAvatar: currentUser.avatar,
      clientEmail: currentUser.email,
      clientPhone: currentUser.phone,
      coachId: draft.coach.id,
      coachName: draft.coach.name,
      coachTitle: draft.coach.title,
      coachPhoto: draft.coach.photo,
      availabilityId: draft.selectedSlot.id,
      date: draft.selectedDate,
      startTime: draft.selectedSlot.startTime,
      endTime: draft.selectedSlot.endTime,
      sessionType: draft.sessionType,
      format: draft.sessionType.format || 'online',
      price: draft.basePrice,
      serviceFee: draft.serviceFee,
      taxes: draft.taxes,
      total: draft.total,
      paymentStatus: 'pending',
      bookingStatus: 'pending',
      paymentMethod: 'Carte bancaire (Stripe)',
      notes: draft.notes,
      clientAddress: draft.clientAddress,
      createdAt: new Date().toISOString(),
      hasReview: false,
    };
    const { error } = await supabase.from('bookings').insert({
      id: b.id,
      client_id: b.clientId,
      coach_id: b.coachId,
      availability_id: b.availabilityId,
      status: 'pending',
      date: b.date,
      data: b,
    });
    if (error) throw new Error(error.message.includes('duplicate') ? 'Ce créneau vient d’être réservé.' : error.message);
    setBookings((prev) => {
      const next = [b, ...prev];
      bookingsSync.setBaseline(next);
      return next;
    });
    return b;
  };

  const applyServerBooking = (booking: Booking) => {
    setBookings((prev) => {
      const next = prev.some((x) => x.id === booking.id) ? prev.map((x) => (x.id === booking.id ? booking : x)) : [booking, ...prev];
      bookingsSync.setBaseline(next);
      return next;
    });
    if (booking.paymentStatus === 'paid') {
      setAvailabilities((prev) => prev.map((s) => (s.id === booking.availabilityId ? { ...s, isBooked: true, bookingId: booking.id } : s)));
      setLatestConfirmedBooking(booking);
      setCurrentScreen('confirmation');
      setScreenHistory(['home', 'confirmation']);
    }
  };

  // Retour de Stripe sur le web (?payment=success&booking=…)
  useEffect(() => {
    if (!syncOn) return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get('payment');
    const bookingId = params.get('booking');
    if (!status || !bookingId) return;
    window.history.replaceState({}, '', window.location.pathname);
    if (status !== 'success') {
      setCurrentScreen('bookings');
      setScreenHistory(['home', 'bookings']);
      return;
    }
    import('../lib/payments').then(({ waitForPayment }) =>
      waitForPayment<Booking>(bookingId).then((b) => {
        if (b) applyServerBooking(b);
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncOn]);

  /** Un client connecté devient coach (crée sa fiche coach). */
  const becomeCoach = () => {
    if (!currentUser) return;
    const updated: User = { ...currentUser, role: 'coach' };
    setCurrentUser(updated);
    saveProfile(updated);
    const existing = coaches.find((c) => c.userId === updated.id);
    const coach = existing || buildNewCoachProfile(updated);
    if (!existing) setCoaches((prev) => [...prev, coach]);
    setSelectedCoach(coach);
    setCurrentScreen('coach_profile_edit');
    setScreenHistory(['coach_dashboard', 'coach_profile_edit']);
  };

  const currentRole: UserRole | 'guest' = currentUser ? currentUser.role : 'guest';

  return (
    <AppContext.Provider
      value={{
        currentScreen,
        navigateTo,
        goBack,
        screenHistory,
        currentUser,
        currentRole,
        loginAs,
        logout,
        registerUser,
        createPendingBooking,
        applyServerBooking,
        loginWithPassword,
        resetPassword,
        authLoading,
        isOnline: isSupabaseEnabled,
        updateUserProfile,
        coaches,
        selectedCoach,
        setSelectedCoach,
        selectCoachForBooking,
        getCoachById,
        updateCoachProfile,
        updateCoachPhoto,
        toggleCoachActiveStatus,
        submitVerificationDoc,
        reviewVerificationDoc,
        categories,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        availabilities,
        getCoachAvailabilities,
        addAvailabilitySlot,
        removeAvailabilitySlot,
        generateBatchWeeklySlots,
        sessionTypes,
        bookingDraft,
        setBookingDraft,
        latestConfirmedBooking,
        bookings,
        createBooking,
        cancelBooking,
        completeBooking,
        reviews,
        addReview,
        getCoachReviews,
        toggleReviewVisibility,
        favorites,
        toggleFavorite,
        isFavorite,
        notifications,
        unreadNotificationsCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        addNotification,
        goals,
        progressEntries,
        updateGoalProgress,
        payouts,
        requestPayout,
        coachClients,
        addClientNote,
        resetAllData,
        isNotificationDrawerOpen,
        setIsNotificationDrawerOpen,
        reviewModalBooking,
        setReviewModalBooking,
        activeVideoBooking,
        setActiveVideoBooking,
        activeChatPartner,
        setActiveChatPartner,
        startChatWithCoach,
        startChatWithClient,
        isDarkMode,
        toggleDarkMode,
        themeMode,
        setThemeMode,
        workoutPrograms,
        toggleExerciseCompleted,
        toggleSessionCompleted,
        addWorkoutProgram
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
