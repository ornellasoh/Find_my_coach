export interface GenerateProgramParams {
  clientName: string;
  clientId: string;
  objective: string;
  level: 'Débutant' | 'Intermédiaire' | 'Avancé';
  frequency: number; // sessions per week
  equipment: string;
  injuriesOrNotes?: string;
}

export interface GeneratedProgramResult {
  title: string;
  objective: string;
  difficulty: 'Débutant' | 'Intermédiaire' | 'Avancé';
  durationWeeks: number;
  notes: string;
  sessions: {
    title: string;
    description: string;
    durationMinutes: number;
    exercises: {
      name: string;
      sets: number;
      reps: string;
      restSeconds: number;
      notes: string;
      targetMuscle: string;
    }[];
  }[];
}

export interface MacroCalculationParams {
  clientName: string;
  gender: 'homme' | 'femme';
  age: number;
  weightKg: number;
  heightCm: number;
  activityLevel: 'sedentaire' | 'leger' | 'modere' | 'intense' | 'tres_intense';
  goal: 'perte_gras' | 'maintien' | 'prise_masse' | 'recomposition';
}

export interface MacroCalculationResult {
  tmb: number; // BMR
  dej: number; // TDEE
  targetCalories: number;
  proteinsGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  proteinsPercent: number;
  carbsPercent: number;
  fatsPercent: number;
  waterLiters: number;
  summary: string;
  mealPlanAdvice: string;
}

// URL du serveur IA : vide sur le web (même domaine), URL complète dans l'app mobile (VITE_API_URL)
const API_BASE_URL = ((import.meta as any).env?.VITE_API_URL || '').replace(/\/$/, '');

// Call server-side Gemini endpoint with graceful fallback
export async function queryCoachAI(prompt: string, systemInstruction?: string): Promise<string> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/coach-ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, systemInstruction })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.content && !data.fallback) {
        return data.content;
      }
    }
  } catch (err) {
    console.warn('API call to /api/coach-ai failed or timed out, using fallback engine.', err);
  }

  // Smart fallback response generator
  return generateFallbackChatResponse(prompt);
}

// Generate structured workout program
export async function generateAIWorkoutProgram(params: GenerateProgramParams): Promise<GeneratedProgramResult> {
  const prompt = `Agis en tant que préparateur physique d'élite. Conçois un programme d'entraînement complet pour :
- Client : ${params.clientName}
- Objectif : ${params.objective}
- Niveau : ${params.level}
- Fréquence : ${params.frequency} séances par semaine
- Équipement disponible : ${params.equipment}
- Contraintes ou blessures : ${params.injuriesOrNotes || 'Aucune'}

Fournis une réponse professionnelle détaillée avec les exercices, séries, répétitions, temps de repos et consignes.`;

  const systemInstruction = `Tu es le Directeur Technique et Préparateur Physique en chef de FindMyCoach. Tu conçois des programmes d'entraînement sur-mesure scientifiquement fondés avec une périodisation rigoureuse.`;

  try {
    const res = await fetch(`${API_BASE_URL}/api/coach-ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, systemInstruction })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.content && !data.fallback) {
        // Return structured result based on params with AI summary
        return buildStructuredProgramFromAI(params, data.content);
      }
    }
  } catch (err) {
    console.warn('Fallback to local sports science engine for program generation.', err);
  }

  return generateFallbackStructuredProgram(params);
}

function buildStructuredProgramFromAI(params: GenerateProgramParams, aiText: string): GeneratedProgramResult {
  const base = generateFallbackStructuredProgram(params);
  base.notes = aiText.slice(0, 350) + '...';
  return base;
}

export function generateFallbackStructuredProgram(params: GenerateProgramParams): GeneratedProgramResult {
  const isLoss = params.objective.toLowerCase().includes('perte') || params.objective.toLowerCase().includes('sèche');
  const isStrength = params.objective.toLowerCase().includes('force') || params.objective.toLowerCase().includes('masse');
  
  const programTitle = isLoss 
    ? `Programme Shred & Métabolisme — ${params.clientName}`
    : isStrength 
    ? `Cycle Hypertrophie & Puissance — ${params.clientName}`
    : `Programme Équilibre & Performance — ${params.clientName}`;

  const sessions = [];

  if (params.frequency >= 1) {
    sessions.push({
      title: 'Séance 1 : Force Fondamentale & Chaîne Postérieure',
      description: 'Développement de la force socle, activation fessiers, ischios et dos.',
      durationMinutes: 50,
      exercises: [
        {
          name: isStrength ? 'Goblet Squat ou Squat Barre' : 'Squat au poids de corps avec tempo 3-1-1',
          sets: 4,
          reps: isStrength ? '8-10 reps' : '15-20 reps',
          restSeconds: isStrength ? 90 : 45,
          notes: 'Garder la colonne neutre, genoux alignés sur les pointes de pieds.',
          targetMuscle: 'Quadriceps & Fessiers'
        },
        {
          name: 'Soulevé de terre roumain (RDL) aux haltères',
          sets: 3,
          reps: '10-12 reps',
          restSeconds: 60,
          notes: 'Charnière de hanche contrôlée, étirement des ischio-jambiers.',
          targetMuscle: 'Ischio-jambiers & Grand fessier'
        },
        {
          name: 'Développé couché ou pompes strictes',
          sets: 3,
          reps: '10-12 reps',
          restSeconds: 60,
          notes: 'Coudes à 45 degrés du buste, omoplates rétractées.',
          targetMuscle: 'Pectoraux & Triceps'
        },
        {
          name: 'Tirage horizontal ou Rowing bûcheron',
          sets: 3,
          reps: '12 reps / côté',
          restSeconds: 45,
          notes: 'Initier le mouvement avec l’omoplate, pause de 1s en contraction.',
          targetMuscle: 'Grand dorsal & Trapèzes moyens'
        },
        {
          name: 'Planche dynamique avec tapotement d’épaules',
          sets: 3,
          reps: '40 secondes',
          restSeconds: 30,
          notes: 'Bassin parfaitement immobile, rétroversion pelvienne.',
          targetMuscle: 'Ceinture abdominale profonde'
        }
      ]
    });
  }

  if (params.frequency >= 2) {
    sessions.push({
      title: 'Séance 2 : Haut du Corps, Posture & Gainage',
      description: 'Renforcement du tronc, ouverture scapulaire et renforcement des épaules.',
      durationMinutes: 45,
      exercises: [
        {
          name: 'Développé militaire aux haltères debout',
          sets: 4,
          reps: '10 reps',
          restSeconds: 60,
          notes: 'Verrouiller les fessiers et le ventre pour protéger le bas du dos.',
          targetMuscle: 'Deltoïdes & Trapèzes'
        },
        {
          name: 'Face Pulls ou Tirage élastique oiseau',
          sets: 3,
          reps: '15 reps',
          restSeconds: 45,
          notes: 'Excellent pour corriger les épaules enroulées vers l’avant.',
          targetMuscle: 'Deltoïde postérieur & Coiffe des rotateurs'
        },
        {
          name: 'Fentes marchées ou Fentes arrière',
          sets: 3,
          reps: '12 reps par jambe',
          restSeconds: 60,
          notes: 'Genou avant à 90°, buste droit.',
          targetMuscle: 'Quadriceps & Stabilisateurs de hanche'
        },
        {
          name: 'Dead Bug (Insecte mort contrôlé)',
          sets: 3,
          reps: '12 alternances lentes',
          restSeconds: 30,
          notes: 'Lombaires constamment plaquées au sol.',
          targetMuscle: 'Transverse & Fléchisseurs de hanche'
        }
      ]
    });
  }

  if (params.frequency >= 3) {
    sessions.push({
      title: 'Séance 3 : Conditionnement Métabolique & Athlétique',
      description: 'Accélération du débit cardiaque, travail d’endurance musculaire en circuit.',
      durationMinutes: 45,
      exercises: [
        {
          name: 'Kettlebell Swings ou Thrusts dynamiques',
          sets: 4,
          reps: '15 reps',
          restSeconds: 45,
          notes: 'Extension de hanche explosive, ne pas lever avec les bras.',
          targetMuscle: 'Chaîne postérieure & Cardiorespiratoire'
        },
        {
          name: 'Box Jumps ou Step-ups rythmés',
          sets: 3,
          reps: '10 reps',
          restSeconds: 45,
          notes: 'Amortir la réception en douceur.',
          targetMuscle: 'Mollets, Ischios & Puissance'
        },
        {
          name: 'Burpees adaptés (sans pompe ou avec saut)',
          sets: 3,
          reps: '45 secondes d’effort',
          restSeconds: 45,
          notes: 'Rythme régulier sans s’effondrer.',
          targetMuscle: 'Corps entier'
        },
        {
          name: 'Mountain Climbers tempo lent',
          sets: 3,
          reps: '30 secondes',
          restSeconds: 30,
          notes: 'Genoux proches du sol, épaules au-dessus des poignets.',
          targetMuscle: 'Gainage dynamique'
        }
      ]
    });
  }

  return {
    title: programTitle,
    objective: params.objective,
    difficulty: params.level,
    durationWeeks: 4,
    notes: `Programme calibré pour ${params.clientName} (${params.level}). Périodisation sur 4 semaines avec surcharge progressive recommandée dès la semaine 3.`,
    sessions
  };
}

// Calculate macros & metabolism
export function calculateClientMacros(params: MacroCalculationParams): MacroCalculationResult {
  // Harris-Benedict revised
  let tmb = 0;
  if (params.gender === 'homme') {
    tmb = 88.362 + (13.397 * params.weightKg) + (4.799 * params.heightCm) - (5.677 * params.age);
  } else {
    tmb = 447.593 + (9.247 * params.weightKg) + (3.098 * params.heightCm) - (4.330 * params.age);
  }

  const activityMultipliers = {
    sedentaire: 1.2,
    leger: 1.375,
    modere: 1.55,
    intense: 1.725,
    tres_intense: 1.9
  };

  const dej = Math.round(tmb * (activityMultipliers[params.activityLevel] || 1.4));

  let calorieAdjustment = 0;
  if (params.goal === 'perte_gras') calorieAdjustment = -350; // Déficit contrôlé
  if (params.goal === 'prise_masse') calorieAdjustment = +300; // Surplus propre
  if (params.goal === 'recomposition') calorieAdjustment = -150;

  const targetCalories = Math.max(1200, dej + calorieAdjustment);

  // Protein targets based on goal
  let proteinRatio = 1.8; // g/kg
  if (params.goal === 'prise_masse') proteinRatio = 2.0;
  if (params.goal === 'perte_gras') proteinRatio = 2.1; // Protéger la masse maigre en déficit

  const proteinsGrams = Math.round(params.weightKg * proteinRatio);
  const proteinCalories = proteinsGrams * 4;

  // Fats: 0.9 to 1.0 g per kg of body weight
  const fatsGrams = Math.round(params.weightKg * 0.95);
  const fatCalories = fatsGrams * 9;

  // Carbs: rest of calories
  const remainingCalories = Math.max(200, targetCalories - (proteinCalories + fatCalories));
  const carbsGrams = Math.round(remainingCalories / 4);

  const proteinsPercent = Math.round((proteinCalories / targetCalories) * 100);
  const fatsPercent = Math.round((fatCalories / targetCalories) * 100);
  const carbsPercent = Math.round(100 - (proteinsPercent + fatsPercent));

  const waterLiters = Number(((params.weightKg * 0.035) + (params.activityLevel === 'intense' ? 0.75 : 0.4)).toFixed(1));

  let summary = `Pour ${params.clientName}, avec un métabolisme de base (TMB) calculé à ${Math.round(tmb)} kcal et une dépense journalière (DEJ) de ${dej} kcal : objectif fixé à ${targetCalories} kcal/jour.`;

  let mealPlanAdvice = `• Protéines : ${proteinsGrams}g/j réparties en 3 à 4 prises (ex: 30-40g par repas) pour maximiser la synthèse protéique.\n• Glucides : ${carbsGrams}g/j à privilégier autour de la séance (pré et post-training) pour recharger le glycogène musculaire.\n• Lipides : ${fatsGrams}g/j de sources de qualité (huile d'olive, avocat, poissons gras, oléagineux) pour soutenir le système hormonal.\n• Eau : minimum ${waterLiters} litres par jour.`;

  return {
    tmb: Math.round(tmb),
    dej,
    targetCalories,
    proteinsGrams,
    carbsGrams,
    fatsGrams,
    proteinsPercent,
    carbsPercent,
    fatsPercent,
    waterLiters,
    summary,
    mealPlanAdvice
  };
}

// Generate pre-crafted motivational & follow-up messages
export function generateClientMessage(
  type: 'congrats' | 'followup' | 'soreness' | 'monthly_review',
  clientName: string,
  tone: 'chaleureux' | 'motivant' | 'technique'
): string {
  switch (type) {
    case 'congrats':
      if (tone === 'motivant') {
        return `Bravo pour ta séance aujourd’hui ${clientName} ! 🔥 Tu as fait preuve d'une intensité remarquable, notamment sur les dernières séries. Continue sur cette dynamique, c'est exactement cette rigueur qui crée les résultats durables ! Repose-toi bien ce soir et pense à ton hydratation.`;
      }
      return `Superbe séance aujourd’hui ${clientName} ! J'ai adoré ton engagement et la propreté de tes mouvements. Prends bien le temps de faire le plein de bons nutriments ce soir. Hâte de te retrouver pour la prochaine étape ! 👏`;

    case 'followup':
      return `Hello ${clientName} ! 👋 J'espère que ta semaine se passe bien. Je jetais un œil à ton planning et je n'ai pas vu ta prochaine réservation. Tout se passe bien de ton côté ? Dis-moi si tu as des contraintes d'horaires spécifiques, je peux te bloquer un créneau adapté pour garder le rythme !`;

    case 'soreness':
      return `Bonjour ${clientName}, c’est tout à fait normal d'avoir des courbatures après le travail musculaire qu'on a fourni ! 💡 Pour accélérer ta récupération : bois au moins 2,5L d'eau, fais 15 minutes de marche légère pour relancer la circulation sanguine, et n'hésite pas à faire des étirements doux ou une douche chaude. On adaptera le début de la prochaine séance si besoin !`;

    case 'monthly_review':
      return `Félicitations pour ce premier mois d'entraînement ensemble ${clientName} ! 📈 Le bilan est très positif : régularité exemplaire, nette progression sur ta technique et une endurance qui commence à payer. On passe au palier supérieur dès la semaine prochaine avec de nouveaux ajustements !`;
  }
}

function generateFallbackChatResponse(query: string): string {
  const q = query.toLowerCase();

  if (q.includes('dos') || q.includes('lombaire') || q.includes('mal')) {
    return `En cas d'inconfort lombaire chez un client, voici la conduite recommandée :
1. **Éviter temporairement les compressions axiales directes** (Squat lourd sur les épaules, soulevé de terre conventionnel).
2. **Favoriser les mouvements unilatéraux** : Squat bulgare, fentes arrière, fentes marchées (moins de charge sur le rachis, excellent travail des fessiers stabilisateurs).
3. **Renforcer le caisson abdominal profond** : Dead bug, Bird dog (chien de chasse), planche latérale avec rétroversion pelvienne.
4. **Vérifier la mobilité de hanche** : Souvent, un manque de mobilité de la hanche oblige le bas du dos à compenser.`;
  }

  if (q.includes('nutrition') || q.includes('repas') || q.includes('proteine')) {
    return `Recommandations nutritionnelles fondées sur la science du sport :
• **Apport en protéines** : Pour la préservation ou le gain musculaire, viser entre 1.6 et 2.2g de protéines par kilo de poids corporel.
• **Fenêtre anabolique** : Ce qui compte avant tout est l'apport global sur 24h, avec une répartition idéale de 3 à 4 repas contenant 25-40g de protéines de haute valeur biologique (riches en leucine).
• **Hydratation** : Perdre 2% de son poids en eau réduit les performances athlétiques de 10 à 20%. Recommandez 35ml d'eau par kg de poids corporel + 500ml par heure d'effort.`;
  }

  if (q.includes('hiit') || q.includes('cardio') || q.includes('circuit')) {
    return `Protocole HIIT Express 30 minutes haute efficacité :
• **Échauffement (6 min)** : Mobilité articulaire cheville/hanches + montées de genoux progressives.
• **Corps de séance (20 min) - Format EMOM 4 tours** :
  - Minute 1 : 15 Kettlebell swings ou Thrusts
  - Minute 2 : 12 Burpees sans pompe
  - Minute 3 : 20 Fentes sautées alternées
  - Minute 4 : 45s Planche dynamique
  - Minute 5 : 60s Repos complet
• **Retour au calme (4 min)** : Respiration diaphragmatique lente 4-7-8 pour abaisser le rythme cardiaque.`;
  }

  return `En tant qu'assistant de coaching FindMyCoach, voici mon analyse sportive :
• **Périodisation** : Pour optimiser l'adhérence du client, privilégiez des blocs de 4 semaines avec une semaine de deload (décharge de 30% du volume) toutes les 5 à 6 semaines.
• **Surcharge progressive** : Avant d'augmenter la charge en kg, cherchez d'abord à améliorer la propreté du tempo (ex: descente en 3 secondes), puis le nombre de répétitions.
• **Psychologie & Adhérence** : Un programme à 80% d'efficacité que le client suit avec enthousiasme surpasse toujours un programme théorique parfait abandonné après 2 semaines.

Souhaitez-vous que je génère un programme d'entraînement complet, un calcul de macronutriments, ou un message de suivi ?`;
}
