export type UserRole = 'client' | 'coach' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string;
  role: UserRole;
  phone?: string;
  createdAt: string;
  status: 'active' | 'inactive';
  bio?: string;
  isPremium?: boolean;
  memberSince?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
}

export type CoachingFormat = 
  | 'online'          // En ligne / Visio
  | 'coach_location' // Chez le coach / Studio privé
  | 'home'           // À domicile
  | 'outdoor'        // En extérieur / Parcs
  | 'corporate'      // En entreprise
  | 'partner_gym';   // En salle / structure partenaire

export type VerificationStatus = 'unverified' | 'pending' | 'verified';

export interface VerificationDoc {
  id: string;
  coachId: string;
  type: 'diploma' | 'identity' | 'insurance' | 'kbis' | 'cert';
  title: string;
  fileUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  verifiedAt?: string;
  adminFeedback?: string;
}

export type PackInstallments = 1 | 3 | 5;

/** Pack de séances proposé par le coach (fiche coach). Le prix payé est `totalPrice`, en 1, 3 ou 5 fois. */
export interface SessionPack {
  id: string;
  name: string;
  sessionsCount: number;
  totalPrice: number;              // en €, ce que paie le client pour tout le pack
  validityMonths?: number;         // durée pour utiliser les séances (6 mois par défaut)
  format?: CoachingFormat | 'any'; // type de séance couvert ('any' : tous)
  installments?: PackInstallments[]; // paiements proposés (1 = en une fois)
  active?: boolean;                // false : masqué aux clients
  description?: string;
  // Anciens champs des profils de démonstration
  discountPercent?: number;
  pricePerSession?: number;
  popular?: boolean;
}

/** Pack acheté, avec ses séances restantes et ses échéances (fonction fmc_pack_balances). */
export interface PackBalance {
  id: string;
  clientId: string;
  clientName: string;
  coachId: string;
  coachName: string;
  pack: { id: string; name: string; sessionsCount: number; totalPrice: number; format?: CoachingFormat | 'any'; validityMonths: number };
  sessionsTotal: number;
  sessionsUsed: number;
  installments: PackInstallments;
  installmentsPaid: number;
  installmentAmount: number; // €
  amountTotal: number;       // €
  applicationFee: number;    // €
  status: 'active' | 'past_due' | 'unpaid' | 'cancelled' | 'expired';
  activatedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface WeeklyScheduleDay {
  dayOfWeek: number; // 0 = Dimanche, 1 = Lundi, ..., 6 = Samedi
  dayName: string;
  isEnabled: boolean;
  slots: { start: string; end: string }[];
}

export interface CoachProfile {
  /** Identifiant court et lisible du lien public (findmycoach.io/coach/<slug>) */
  slug?: string;
  id: string;
  userId: string;
  name: string;
  title: string;
  bio: string;
  photo: string;
  coverPhoto?: string;
  rating: number;
  reviewCount: number;
  experienceYears: number;
  hourlyRate: number; // in EUR
  isElite: boolean;
  isAvailable: boolean;
  
  // Geolocation & Address
  location: string;
  city: string;
  postalCode?: string;
  address?: string;
  latitude: number;
  longitude: number;
  interventionRadiusKm: number; // e.g. 15 km
  interventionZone: string; // e.g. "Poitiers et 15 km aux alentours"
  
  // Coaching Formats
  formats: CoachingFormat[];
  formatPrices?: Partial<Record<CoachingFormat, number>>;
  isOnlineCoaching: boolean;
  isInPersonCoaching: boolean;
  
  // Packages
  packs?: SessionPack[];
  
  // Verification
  verificationStatus: VerificationStatus;
  verificationDocs?: VerificationDoc[];
  
  // Categorization & Skills
  specialties: string[];
  category: string;
  languages: string[];
  certifications: string[];
  
  // Media & Video
  videoLink?: string;
  galleryPhotos?: string[];
  
  // Availabilities
  nextAvailabilitySummary?: string;
  recurringSchedule?: WeeklyScheduleDay[];
  blockedDates?: string[]; // YYYY-MM-DD
  
  // Présentation détaillée (v1)
  methods?: string;              // méthode de travail, déroulé type d'une séance
  objectives?: string[];         // ex. « Perte de poids », « Remise en forme »
  levels?: CoachLevel[];         // niveaux acceptés
  audiences?: string[];          // publics : adultes, seniors, femmes enceintes…
  sessionIncludes?: string;      // ce que comprend une séance (matériel fourni, bilan, suivi…)
  prepInstructions?: string;     // consignes par défaut (tenue, matériel, espace), copiées à la confirmation
  travelFee?: number;            // frais de déplacement (séance à domicile), en €

  isProfileComplete: boolean;
  isActive: boolean;
}

export type CoachLevel = 'debutant' | 'intermediaire' | 'avance';

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color?: string;
  count?: number;
  description?: string;
  subcategories?: string[];
}

export interface AvailabilitySlot {
  id: string;
  coachId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm (e.g. "09:00")
  endTime: string; // HH:mm (e.g. "10:00")
  isBooked: boolean;
  bookingId?: string;
  format?: CoachingFormat;
}

export interface SessionType {
  id: string;
  name: string;
  durationMinutes: number;
  mode: 'video' | 'in_person' | 'call';
  format?: CoachingFormat;
  description: string;
  platform?: string; // e.g. "Visio HD FindMyCoach", "À Domicile", "En Salle Partenaire"
  priceMultiplier?: number;
}

export type PaymentStatus = 'paid' | 'unpaid' | 'pending' | 'refunded' | 'failed';
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rejected';

export interface Booking {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatar: string;
  clientEmail: string;
  clientPhone?: string;
  coachId: string;
  coachName: string;
  coachTitle: string;
  coachPhoto: string;
  availabilityId: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  sessionType: SessionType;
  format: CoachingFormat;
  price: number; // Base price
  serviceFee: number;
  taxes: number;
  total: number;
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;
  paymentMethod?: string;
  meetingLink?: string;
  location?: string;
  clientAddress?: string;
  notes?: string;
  createdAt: string;
  hasReview?: boolean;
  travelFee?: number;
  rescheduledAt?: string;
  rescheduleCount?: number;
  cancelReason?: string;
}

/** Détails privés d'une séance confirmée (visibles uniquement par le client et le coach). */
export interface SessionDetails {
  bookingId: string;
  meetingUrl: string | null;
  prepInstructions: string | null;
  sessionAddress: string | null;
  updatedAt?: string;
}

export type RescheduleStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface RescheduleRequest {
  id: string;
  bookingId: string;
  requestedBy: string;
  requesterRole: 'client' | 'coach';
  oldDate: string;
  oldStart: string;
  oldEnd?: string | null;
  newDate: string;
  newStart: string;
  newEnd?: string | null;
  newAvailabilityId: string;
  message?: string | null;
  status: RescheduleStatus;
  createdAt: string;
  respondedAt?: string | null;
}

export interface SessionReport {
  bookingId: string;
  summary: string;
  nextActions?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export type IssueCategory = 'no_show' | 'technical' | 'behaviour' | 'other';
export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'dismissed';

export interface BookingIssue {
  id: string;
  bookingId: string;
  reporterId: string;
  reporterRole: 'client' | 'coach';
  category: IssueCategory;
  description?: string | null;
  status: IssueStatus;
  adminNote?: string | null;
  createdAt: string;
}

export interface CoachDocument {
  id: string;
  coachId: string;
  type: VerificationDoc['type'];
  title: string;
  filePath?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  adminFeedback?: string | null;
  submittedAt: string;
}

export interface Review {
  id: string;
  bookingId: string;
  clientId: string;
  clientName: string;
  clientAvatar: string;
  coachId: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
  isHidden?: boolean;
  categoryTag?: string;
  coachReply?: string | null; // réponse publique du coach (une seule), lue depuis la colonne coach_reply
  coachReplyAt?: string | null;
}

export interface Favorite {
  id: string;
  userId: string;
  coachId: string;
  createdAt: string;
}

export type NotificationType = 
  | 'booking_confirmed' 
  | 'booking_cancelled' 
  | 'session_reminder' 
  | 'new_review' 
  | 'new_booking' 
  | 'payment_received'
  | 'verification_approved'
  | 'verification_rejected'
  | 'session_link'
  | 'reschedule_request'
  | 'reschedule_accepted'
  | 'reschedule_declined'
  | 'session_report'
  | 'review_request'
  | 'review_reminder'
  | 'review_reply'
  | 'pack_purchased'
  | 'pack_sold'
  | 'pack_payment'
  | 'pack_payment_failed'
  | 'content_report'
  | 'report_handled'
  | 'reminder'
  | 'reminder_soon'
  | 'system';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedBookingId?: string;
  /** Lien d'action (ex. régler une échéance de pack sur Stripe) */
  actionUrl?: string;
  actionLabel?: string;
  read: boolean;
  createdAt: string;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  percentage: number;
  status: 'active' | 'completed';
  category: string;
}

export interface ProgressEntry {
  id: string;
  userId: string;
  metric: string;
  value: number;
  unit: string;
  date: string;
  source: string;
}

export interface PayoutTransaction {
  id: string;
  bookingId: string;
  coachId: string;
  clientName: string;
  sessionTitle: string;
  date: string;
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
  status: 'paid' | 'pending';
  paidAt?: string;
}

export interface CoachClientSummary {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatar: string;
  clientEmail: string;
  clientPhone?: string;
  totalSessions: number;
  lastSessionDate?: string;
  nextSessionDate?: string;
  notes?: string;
  tags?: string[];
  status: 'active' | 'completed' | 'new';
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  recipientId: string;
  text: string;
  createdAt: string;
  isRead: boolean;
}

export interface ChatPartner {
  id: string;
  /** identifiant du compte (profil) de l'interlocuteur, pour la messagerie en ligne */
  userId?: string;
  name: string;
  avatar: string;
  role: string;
  title?: string;
  city?: string;
}
