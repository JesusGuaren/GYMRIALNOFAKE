import { getMuscleRecoveryStates } from './CoachingService';
import { calculate1RM, getRankByWeight } from '../lib/rankingSystem';
import { 
  normalizeMuscleGroup, 
  translateMuscleGroup, 
  getSubMusclesForGroup,
  SUB_TO_PRIMARY_MAPPING,
  TRANSLATIONS as MUSCLE_TRANSLATIONS 
} from '../constants/Muscles';

const MUSCLES = [
  { key: 'Chest', synonyms: ['pecho', 'pechos', 'pectoral', 'pectorales', 'chest', 'pecto'] },
  { key: 'Back', synonyms: ['espalda', 'dorsal', 'dorsales', 'espadla', 'esplada', 'back'] },
  { key: 'Legs', synonyms: ['pierna', 'piernas', 'cuadriceps', 'femoral', 'gluteo', 'gluteos', 'gemelos', 'pantorrilla', 'legs'] },
  { key: 'Shoulders', synonyms: ['hombro', 'hombros', 'deltoides', 'shoulders', 'homrbo'] },
  { key: 'Arms', synonyms: ['brazo', 'brazos', 'biceps', 'triceps', 'antebrazo', 'arms'] },
  { key: 'Core', synonyms: ['abdomen', 'abdominales', 'abs', 'core'] }
];

const EXERCISES_KEYWORDS = [
  { key: 'Bench Press', synonyms: ['bench', 'banca', 'press banca', 'press de banca'] },
  { key: 'Squat', synonyms: ['squat', 'sentadilla', 'sentadillas'] },
  { key: 'Deadlift', synonyms: ['deadlift', 'peso muerto'] }
];

const INTENT_RULES = [
  {
    intent: 'workout_today',
    keywords: ['que entreno hoy', 'que entrenar hoy', 'toca hoy', 'rutina hoy', 'entreno hoy', 'rutina de hoy']
  },
  {
    intent: 'muscle_recovery',
    keywords: ['recuperacion', 'fatiga', 'musculo', 'dolor', 'agujetas', 'pecho', 'espalda', 'piernas', 'hombros', 'brazos', 'abdomen', 'biceps', 'triceps', 'como esta mi', 'puedo entrenar']
  },
  {
    intent: 'plateau_analysis',
    keywords: ['estancado', 'no progreso', 'meseta', 'estancamiento', 'no subo', 'mismo peso']
  },
  {
    intent: 'volume_summary',
    keywords: ['cuanto peso movi', 'volumen', 'tonelaje', 'toneladas', 'cuanto levante']
  },
  {
    intent: 'workout_history',
    keywords: ['cuando entrene', 'ultimo entrenamiento', 'ultima vez', 'historial']
  },
  {
    intent: 'progress_analysis',
    keywords: ['rango', 'nivel', 'logros', 'rank', 'estatus', 'hipertrofia', 'mejorar']
  },
  {
    intent: 'calculate_1rm',
    keywords: ['calcula', '1rm', 'calcular', 'formula', 'epley']
  },
  {
    intent: 'recommendation',
    keywords: ['consejo', 'motivacion', 'frase', 'tip', 'ayuda']
  }
];

const NON_FITNESS_KEYWORDS = ['chiste', 'capital', 'francia', 'clima', 'tiempo', 'dolar', 'politica', 'receta', 'cocinar', 'futbol', 'pelicula', 'musica'];

// 1. Normalización de texto
export const normalizeText = (text) => {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar acentos
    .replace(/[¿\?¡\!,\.;:\(\)\[\]"']/g, "") // quitar puntuación
    .replace(/\s+/g, " ") // colapsar espacios dobles
    .trim();
};

// 2. Extracción de Entidades
const extractEntities = (normalizedText) => {
  const entities = {
    muscle: null,
    exercise: null,
    hasFatigue: false,
    hasProgress: false
  };

  // Músculos
  const words = normalizedText.split(" ");
  for (const word of words) {
    for (const m of MUSCLES) {
      if (m.synonyms.includes(word)) {
        entities.muscle = m.key;
        break;
      }
    }
    if (entities.muscle) break;
  }
  if (!entities.muscle) {
    for (const m of MUSCLES) {
      for (const syn of m.synonyms) {
        if (normalizedText.includes(syn)) {
          entities.muscle = m.key;
          break;
        }
      }
      if (entities.muscle) break;
    }
  }

  // Ejercicios
  for (const ex of EXERCISES_KEYWORDS) {
    for (const syn of ex.synonyms) {
      if (normalizedText.includes(syn)) {
        entities.exercise = ex.key;
        break;
      }
    }
    if (entities.exercise) break;
  }

  // Fatiga
  const fatigueKeywords = ['cansado', 'reventado', 'destruido', 'muerto', 'fatiga', 'dolor', 'agujetas', 'dormi poco', 'sueño', 'sueno', 'dormi mal', 'desvelado', 'fatigado'];
  entities.hasFatigue = fatigueKeywords.some(k => normalizedText.includes(k));

  // Progreso
  const progressKeywords = ['progresar', 'subir', 'levantar', 'estancado', 'meseta', 'fuerza', 'hipertrofia', 'mejorar', 'pr', 'record', 'marca'];
  entities.hasProgress = progressKeywords.some(k => normalizedText.includes(k));

  return entities;
};

// 3. Obtención de Recuperación de Músculos (Reutilizado localmente)
const getGroupRecovery = (group, workouts) => {
  const recoveryStates = getMuscleRecoveryStates(workouts);
  const normalizedGroup = normalizeMuscleGroup(group);
  const subMuscles = getSubMusclesForGroup(normalizedGroup);
  
  let minPercent = 100;
  subMuscles.forEach(sm => {
    if (recoveryStates[sm]) {
      if (recoveryStates[sm].percent < minPercent) {
        minPercent = recoveryStates[sm].percent;
      }
    }
  });

  return minPercent;
};

// 4. Consejo contextual ultra-corto
const getContextualAdvice = (muscle, status, weeklySets, progressMemory = null) => {
  const mName = MUSCLE_TRANSLATIONS[muscle] || muscle;

  if (status === 'Sobreentrenado') {
    return `${mName} sobrecargado (${weeklySets} series). Evita empujes/tirones pesados hoy. Foco en recuperación.`;
  }
  if (status === 'Fatigado') {
    return `${mName} fatigado. Hoy dale descanso activo. Prioriza otros grupos.`;
  }
  if (status === 'Recuperación parcial') {
    if (progressMemory) {
      return `${mName} en recuperación parcial. Último: ${progressMemory.exerciseName} ${progressMemory.weight}kg x${progressMemory.reps}. Entrena ligero.`;
    }
    return `${mName} recuperándose. Entrena hoy con intensidad moderada (RPE 7-8).`;
  }

  if (progressMemory) {
    const suggestedWeight = progressMemory.weight + (progressMemory.reps >= 8 ? 2.5 : 0);
    if (progressMemory.reps >= 8) {
      return `${mName} recuperado. Último: ${progressMemory.weight}kg x${progressMemory.reps}. Hoy estás listo para progresar a ${suggestedWeight}kg.`;
    } else {
      return `${mName} recuperado. Último: ${progressMemory.weight}kg x${progressMemory.reps}. Hoy busca más reps con ${progressMemory.weight}kg.`;
    }
  }
  return `${mName} al 100% y listo para entrenar. ¡A por un nuevo récord!`;
};

// 5. Resolución de una intención
const resolveIntent = (intent, normalizedText, entities, workouts, routines, programs, recommendedRoutine, context) => {
  switch (intent) {
    case 'workout_today': {
      const activeProgram = (programs || []).find(p => p.is_active);
      if (recommendedRoutine) {
        return `Hoy toca: "${recommendedRoutine.name}"${activeProgram ? ` (del programa ${activeProgram.name})` : ''}. ¡Listo para entrenar!`;
      }
      return "No tienes rutinas sugeridas hoy. Elige una rutina libre o carga una plantilla desde la Bitácora.";
    }

    case 'muscle_recovery': {
      const targetMuscle = entities.muscle || context.lastMuscle;
      if (!targetMuscle) {
        return "Por favor especifica qué músculo quieres evaluar (pecho, espalda, piernas, etc.).";
      }
      context.lastMuscle = targetMuscle; // Registrar en contexto

      const percent = getGroupRecovery(targetMuscle, workouts);
      let physState = 'Listo';
      if (percent < 50) physState = 'Fatigado';
      else if (percent < 100) physState = 'Recuperación parcial';

      // Calcular volumen semanal
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      let weeklySets = 0;
      workouts.forEach(w => {
        const wDate = new Date(w.workout_date);
        if (wDate >= sevenDaysAgo && !w.name?.endsWith('\u200B')) {
          w.workout_entries?.forEach(e => {
            const mg = e.exercises?.muscle_group;
            if (!mg) return;
            const normalizedMg = normalizeMuscleGroup(mg);
            if (normalizedMg !== 'UNKNOWN' && SUB_TO_PRIMARY_MAPPING[normalizedMg] === targetMuscle) {
              weeklySets++;
            }
          });
        }
      });

      // Último levantamiento
      let progressMemory = null;
      const activeWorkouts = workouts.filter(w => !w.name?.endsWith('\u200B'));
      let foundEntry = null;
      let foundWorkout = null;
      for (const w of activeWorkouts) {
        const entry = w.workout_entries?.find(e => {
          const mg = e.exercises?.muscle_group;
          if (!mg) return false;
          const normalizedMg = normalizeMuscleGroup(mg);
          return normalizedMg !== 'UNKNOWN' && SUB_TO_PRIMARY_MAPPING[normalizedMg] === targetMuscle;
        });
        if (entry) {
          foundWorkout = w;
          foundEntry = entry;
          break;
        }
      }
      if (foundWorkout && foundEntry) {
        progressMemory = {
          exerciseName: foundEntry.exercises?.name || 'ejercicio',
          weight: foundEntry.weight,
          reps: foundEntry.reps,
          date: new Date(foundWorkout.workout_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        };
      }

      const advice = getContextualAdvice(targetMuscle, physState, weeklySets, progressMemory);
      const nameEsp = MUSCLE_TRANSLATIONS[targetMuscle] || targetMuscle;
      return `${nameEsp}: ${percent}% recup. (${physState}). ${weeklySets} sets/sem. ${advice}`;
    }

    case 'plateau_analysis': {
      const exerciseName = entities.exercise || 'Press de Banca';
      const sets = [];
      workouts.forEach(w => {
        w.workout_entries?.forEach(e => {
          const name = e.exercises?.name?.toLowerCase() || '';
          if (name.includes(exerciseName.toLowerCase())) {
            sets.push({ date: w.workout_date, weight: e.weight, reps: e.reps });
          }
        });
      });

      const bestSetsByDate = {};
      sets.forEach(s => {
        const rm = calculate1RM(s.weight, s.reps);
        if (!bestSetsByDate[s.date] || rm > bestSetsByDate[s.date]) {
          bestSetsByDate[s.date] = rm;
        }
      });
      const sortedRMs = Object.entries(bestSetsByDate)
        .sort((a, b) => new Date(b[0]) - new Date(a[0]))
        .map(x => x[1]);
      
      if (sortedRMs.length >= 3) {
        const last3 = sortedRMs.slice(0, 3);
        const isStagnant = last3[0] <= last3[1] && last3[1] <= last3[2];
        if (isStagnant) {
          return `Meseta detectada en ${exerciseName}. Llevas 3 sesiones sin progresar. Sugiero bajar el peso un 10% y mejorar la ejecución.`;
        }
      }
      return `Sin estancamiento evidente en ${exerciseName}. Continúa aplicando sobrecarga progresiva y prioriza tu recuperación.`;
    }

    case 'volume_summary': {
      const totalVolumeKg = workouts.reduce((acc, w) => acc + (w.workout_entries?.reduce((a, e) => a + ((e.weight || 0) * (e.reps || 0)), 0) || 0), 0);
      const tonnageStr = `${(totalVolumeKg / 1000).toFixed(1)} t`;
      return `Volumen histórico total: ${tonnageStr} movidos en ${workouts.length} entrenamientos registrados.`;
    }

    case 'workout_history': {
      const targetMuscle = entities.muscle || context.lastMuscle;
      if (targetMuscle) {
        const nameEsp = MUSCLE_TRANSLATIONS[targetMuscle] || targetMuscle;
        const activeWorkouts = workouts.filter(w => !w.name?.endsWith('\u200B'));
        let lastDate = null;
        for (const w of activeWorkouts) {
          const hasMuscle = w.workout_entries?.some(e => {
            const mg = e.exercises?.muscle_group;
            if (!mg) return false;
            const normalizedMg = normalizeMuscleGroup(mg);
            return normalizedMg !== 'UNKNOWN' && SUB_TO_PRIMARY_MAPPING[normalizedMg] === targetMuscle;
          });
          if (hasMuscle) {
            lastDate = new Date(w.workout_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
            break;
          }
        }
        if (lastDate) {
          return `Último entrenamiento de ${nameEsp}: el ${lastDate}.`;
        }
        return `No tengo registros de entrenamiento para el grupo ${nameEsp} en tu bitácora.`;
      }
      
      if (workouts.length > 0) {
        const lastW = workouts[0];
        const dateLabel = new Date(lastW.workout_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
        return `Tu último entrenamiento fue "${lastW.name}" el ${dateLabel}.`;
      }
      return "Aún no tienes entrenamientos registrados en tu bitácora.";
    }

    case 'progress_analysis': {
      const { calculateUserXP, getLevelInfo: getLvl } = require('./AchievementService');
      const xp = calculateUserXP(workouts);
      const levelInfo = getLvl(xp);

      let bestRankRatio = -1;
      let rank = getRankByWeight(0, 'Arms'); 
      workouts.forEach(w => {
        w.workout_entries?.forEach(e => {
          const mg = e.exercises?.muscle_group || 'Arms';
          const exName = e.exercises?.name || '';
          const rm = calculate1RM(e.weight, e.reps);
          const r = getRankByWeight(rm, mg, exName);
          if (r.minRatio > bestRankRatio) {
            bestRankRatio = r.minRatio;
            rank = r;
          }
        });
      });
      return `Nivel actual: ${levelInfo.level} (${Math.round(levelInfo.progress * 100)}% al sig.). Rango de fuerza: ${rank.name}.`;
    }

    case 'calculate_1rm': {
      const numbers = normalizedText.match(/\d+(\.\d+)?/g);
      if (numbers && numbers.length >= 2) {
        const weight = parseFloat(numbers[0]);
        const reps = parseInt(numbers[1]);
        if (weight > 0 && reps > 0) {
          const rm = Math.round(weight * (1 + reps / 30));
          return `Tu 1RM estimado es ${rm}kg (Epley: ${weight}kg x${reps}).`;
        }
      }
      return "Calculadora de 1RM: dime peso y reps. Ej: 'calcula 1rm 80kg 6 reps'.";
    }

    case 'recommendation': {
      const quotes = [
        "La consistencia le gana al talento. ¡Entrena hoy!",
        "Supera tu versión anterior por 1kg o por 1 repetición.",
        "No busques motivación, busca disciplina. Levanta ese peso.",
        "El descanso es parte del entrenamiento. Si estás fatigado, descansa."
      ];
      return quotes[Math.floor(Math.random() * quotes.length)];
    }

    default:
      return null;
  }
};

// 6. Procesa el mensaje conversacional completo
export const processEngineMessage = (text, workouts, routines, programs, recommendedRoutine = null, context = {}) => {
  const normalizedText = normalizeText(text);
  const entities = extractEntities(normalizedText);

  // Filtro estricto de dominio no fitness/no deportivo
  const containsFitnessWord = ['pecho', 'espalda', 'pierna', 'hombro', 'brazo', 'abdomen', 'abs', 'gym', 'entren', 'entreno', 'entrenar', 'rutina', 'fuerza', '1rm', 'pr', 'marca', 'reps', 'rpe', 'peso', 'kg', 'logros', 'rango', 'volumen', 'tonelaje', 'recuperacion', 'fatiga', 'dormi', 'sueño', 'sueno'].some(w => normalizedText.includes(w));
  const containsNonFitnessWord = NON_FITNESS_KEYWORDS.some(w => normalizedText.includes(w));
  
  if (containsNonFitnessWord || (!containsFitnessWord && !/\d+/.test(normalizedText))) {
    return {
      reply: "Hola. Como tu Elite Coach, mi única función es asistir en tu programación de fuerza, fatiga muscular, marcas y rutinas.",
      context
    };
  }

  // Calcular confianzas para las intenciones
  const scores = {};
  for (const rule of INTENT_RULES) {
    let matches = 0;
    for (const keyword of rule.keywords) {
      if (normalizedText.includes(keyword)) {
        matches += 1;
      }
    }
    
    let score = matches > 0 ? (matches / rule.keywords.length) * 0.5 + 0.5 : 0;
    
    // Boosts basados en entidades
    if (rule.intent === 'muscle_recovery' && entities.muscle) {
      score = Math.max(score, 0.9);
    }
    if (rule.intent === 'plateau_analysis' && normalizedText.includes('estancado')) {
      score = Math.max(score, 0.9);
    }
    if (rule.intent === 'calculate_1rm' && (normalizedText.includes('1rm') || /\d+\s*(kg|rep)/.test(normalizedText))) {
      score = Math.max(score, 0.85);
    }
    if (rule.intent === 'volume_summary' && (normalizedText.includes('volumen') || normalizedText.includes('tonelaje'))) {
      score = Math.max(score, 0.9);
    }
    if (rule.intent === 'workout_history' && normalizedText.includes('cuando')) {
      score = Math.max(score, 0.85);
    }
    
    scores[rule.intent] = score;
  }

  // Filtrar intenciones con confianza suficiente
  const activeIntents = Object.entries(scores)
    .filter(([_, score]) => score >= 0.6)
    .map(([intent]) => intent);

  const updatedContext = { ...context };

  // Fallback a contexto si es ambiguo pero hay entidades de apoyo
  if (activeIntents.length === 0) {
    if (context.lastIntent && (entities.muscle || entities.exercise)) {
      activeIntents.push(context.lastIntent);
    } else {
      return {
        reply: "No estoy del todo seguro de lo que deseas consultar, Atleta. ¿Te refieres a tu fatiga muscular, marcas o sugerencias de entrenamiento?",
        context: updatedContext
      };
    }
  }

  // Resolver intenciones (admite múltiples intenciones combinadas)
  const replies = [];
  activeIntents.forEach(intent => {
    updatedContext.lastIntent = intent;
    const res = resolveIntent(intent, normalizedText, entities, workouts, routines, programs, recommendedRoutine, updatedContext);
    if (res) replies.push(res);
  });

  // Si hay alguna queja de sueño/fatiga en entidades y no se ha cubierto
  if (entities.hasFatigue && !activeIntents.includes('muscle_recovery')) {
    replies.push("Al notar fatiga alta o pocas horas de sueño, sugiero recortar el volumen a la mitad o tomar descanso activo hoy.");
  }

  const reply = replies.length > 0 ? replies.join(" y además, ") : "Entendido, Atleta. Continuemos el entrenamiento.";

  return {
    reply,
    context: updatedContext
  };
};
