import { supabase } from '../lib/supabase';
import { calculateStreak, calculateUserXP, getLevelInfo } from './AchievementService';
import { getMuscleRecoveryStates } from './CoachingService';
import { getBestRankEver } from '../lib/rankingSystem';
import { calculateBMR, calculateTDEE, getAdjustedCalories, calculateMacros } from './NutritionService';
import { processEngineMessage } from './EliteCoachEngine';

/**
 * @typedef {Object} StateContext
 * @property {Array} [workouts=[]] - Historial completo de entrenamientos del atleta.
 * @property {Array} [routines=[]] - Listado de rutinas personalizadas del atleta.
 * @property {Array} [programs=[]] - Listado de planes de entrenamiento estructurados.
 * @property {Object} [userProfile={}] - Perfil físico del atleta (edad, peso, altura, objetivo, nivel).
 * @property {Object|null} [currentActiveWorkout=null] - Sesión de entrenamiento activa actualmente, si la hay.
 */

// Caché efímero para prevenir solicitudes duplicadas rápidas
let localCache = {
  lastMessage: '',
  lastResponse: null,
  timestamp: 0
};

/**
 * Recopila y consolida el contexto completo del atleta a partir del estado provisto.
 * 
 * @param {StateContext} stateContext - Contexto de datos de estado del atleta.
 */
const buildUserContext = (stateContext = {}) => {
  const {
    workouts = [],
    routines = [],
    programs = [],
    userProfile = {},
    currentActiveWorkout = null
  } = stateContext;

  // 1. Racha y Nivel de XP
  const racha = calculateStreak(workouts);
  const xp = calculateUserXP(workouts);
  const levelInfo = getLevelInfo(xp);

  // 2. Determinar el mejor Rango de Fuerza (PR)
  const rankName = getBestRankEver(workouts).name;

  // 3. Fisiología y Tiempos de Recuperación
  const recoveryStates = getMuscleRecoveryStates(workouts);
  const compactRecovery = {};
  Object.keys(recoveryStates).forEach(muscle => {
    const data = recoveryStates[muscle];
    compactRecovery[muscle] = {
      percent: data.percent,
      status: data.percent < 50 ? 'Fatigado' : data.percent < 100 ? 'Recuperación parcial' : 'Listo',
      hoursSinceLastWorkout: data.hoursSince
    };
  });

  // 4. Nutrición y Macros
  let nutritionData = null;
  const weight = Number(userProfile.body_weight);
  const height = Number(userProfile.height);
  const age = Number(userProfile.age);
  const gender = userProfile.gender;
  
  if (weight && height && age && gender) {
    const bmr = calculateBMR(weight, height, age, gender);
    const tdee = calculateTDEE(bmr, userProfile.activity_level || 'moderate');
    const calories = getAdjustedCalories(tdee, userProfile.goal || 'Hypertrophy');
    const macros = calculateMacros(weight, calories);
    nutritionData = {
      calorias_objetivo: calories,
      proteinas: macros ? `${macros.protein.min}g - ${macros.protein.max}g` : 'N/A',
      grasas: macros ? `${macros.fat.min}g - ${macros.fat.max}g` : 'N/A',
      carbohidratos: macros ? `${macros.carbs.min}g - ${macros.carbs.max}g` : 'N/A'
    };
  }

  // 5. Entrenamiento Activo Actual
  let activeWorkoutInfo = null;
  if (currentActiveWorkout) {
    activeWorkoutInfo = {
      nombre_rutina: currentActiveWorkout.name,
      cantidad_ejercicios: currentActiveWorkout.workout_entries?.length || 0,
      ejercicios: currentActiveWorkout.workout_entries?.map(e => ({
        ejercicio: e.exercise_name || 'Ejercicio',
        sets: e.sets?.length || 0
      })) || []
    };
  }

  // 6. Programa Activo y Rutina Recomendada
  const activeProgram = (programs || []).find(p => p.is_active);
  let recommendedRoutine = null;
  if (workouts.length > 0) {
    const lastWorkout = workouts.find(w => !w.name?.endsWith('\u200B'));
    if (lastWorkout) {
      const programRoutines = (routines || []).filter(r => r.program_id === activeProgram?.id);
      const targetList = programRoutines.length > 0 ? programRoutines : (routines || []);
      if (targetList.length > 0) {
        const lastIdx = targetList.findIndex(r => r.name.toLowerCase() === lastWorkout.name?.toLowerCase());
        recommendedRoutine = (lastIdx === -1 || lastIdx === targetList.length - 1) ? targetList[0] : targetList[lastIdx + 1];
      }
    }
  }

  return {
    atleta: {
      nombre: "Atleta",
      nivel_xp: levelInfo.level,
      racha_actual_dias: racha,
      rango_fuerza_pr: rankName,
      objetivo: userProfile.goal || 'No definido',
      experiencia: userProfile.experience_level || 'No definida',
      peso_kg: userProfile.body_weight || 'No registrado',
      altura_cm: userProfile.height || 'No registrado'
    },
    entrenamiento_activo: activeWorkoutInfo,
    programa_activo: activeProgram ? { nombre: activeProgram.name, rutina_sugerida: recommendedRoutine?.name || 'N/A' } : null,
    fisiologia_actual: {
      recuperacion_muscular: compactRecovery
    },
    nutricion_diaria: nutritionData
  };
};

/**
 * Consulta al Elite Coach enviando la consulta al LLM a través de una Supabase Edge Function.
 * Incorpora un Fallback Offline local basado en reglas si la llamada de red falla.
 *
 * @param {string} message - Mensaje o pregunta enviada por el usuario.
 * @param {Array} history - Historial corto de la conversación (arreglo de objetos { id, sender, text }).
 * @param {StateContext} stateContext - Contexto de datos de estado del atleta.
 * @returns {Promise<object>} - { respuesta, confidence, category, used_context }
 */
export const queryCoach = async (message, history = [], stateContext = {}) => {
  const normalizedMsg = message.trim();
  const now = Date.now();

  // 1. Verificar caché (dentro de los últimos 60 segundos)
  if (localCache.lastMessage === normalizedMsg && (now - localCache.timestamp) < 60000 && localCache.lastResponse) {
    console.log("[EliteCoachService] Retornando respuesta desde caché local.");
    return localCache.lastResponse;
  }

  const {
    workouts = [],
    routines = [],
    programs = []
  } = stateContext;

  // Obtener rutina recomendada para el fallback local
  let recommendedRoutine = null;
  const activeProgram = (programs || []).find(p => p.is_active);
  if (workouts.length > 0) {
    const lastWorkout = workouts.find(w => !w.name?.endsWith('\u200B'));
    if (lastWorkout) {
      const programRoutines = (routines || []).filter(r => r.program_id === activeProgram?.id);
      const targetList = programRoutines.length > 0 ? programRoutines : (routines || []);
      if (targetList.length > 0) {
        const lastIdx = targetList.findIndex(r => r.name.toLowerCase() === lastWorkout.name?.toLowerCase());
        recommendedRoutine = (lastIdx === -1 || lastIdx === targetList.length - 1) ? targetList[0] : targetList[lastIdx + 1];
      }
    }
  }

  // 2. Recopilar el contexto en tiempo real
  const userContext = buildUserContext(stateContext);
  console.log("[EliteCoachService] Contexto del Atleta compilado:", JSON.stringify(userContext, null, 2));

  // 3. Crear controlador de aborto para el Timeout de 5 segundos
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    console.log("[EliteCoachService] Invocando Edge Function de Supabase 'elite-coach'...");
    
    const { data, error } = await supabase.functions.invoke('elite-coach', {
      body: {
        message: normalizedMsg,
        context: userContext,
        history: history.slice(-5) // Mantener sólo los últimos 5 mensajes para optimización
      },
      headers: {
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (error) {
      throw new Error(error.message || "Fallo en la invocación de la Edge Function.");
    }

    if (!data || !data.respuesta) {
      throw new Error("Respuesta inválida del servidor.");
    }

    console.log("[EliteCoachService] Respuesta del LLM (Groq) recibida con éxito:", data);

    const result = {
      respuesta: data.respuesta,
      confidence: data.confidence || 1.0,
      category: data.category || 'general_coaching',
      used_context: !!data.used_context
    };

    // Actualizar caché
    localCache = {
      lastMessage: normalizedMsg,
      lastResponse: result,
      timestamp: now
    };

    return result;

  } catch (err) {
    clearTimeout(timeoutId);
    console.warn(`[EliteCoachService] Error/Timeout en servicio LLM online: ${err.message}. Activando Fallback offline local.`);

    // 4. Fallback Offline utilizando EliteCoachEngine local
    // Mapeamos el contexto para mantener el lastMuscle de la conversación si es posible
    const lastInteraction = history.slice(-1)[0];
    const engineContext = {
      lastMuscle: lastInteraction?.text?.toLowerCase()?.includes('pecho') ? 'Chest' :
                  lastInteraction?.text?.toLowerCase()?.includes('espalda') ? 'Back' :
                  lastInteraction?.text?.toLowerCase()?.includes('pierna') ? 'Legs' : undefined
    };

    const offlineResult = processEngineMessage(
      normalizedMsg,
      workouts,
      routines,
      programs,
      recommendedRoutine,
      engineContext
    );

    return {
      respuesta: `(Consejo offline) ${offlineResult.reply}`,
      confidence: 0.6,
      category: 'general_coaching',
      used_context: false
    };
  }
};
