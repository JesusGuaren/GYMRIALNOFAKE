import { RECOVERY_TIMES, normalizeMuscleGroup } from '../constants/Muscles';

export const getAdvancedSuggestion = (exId, workouts, currentExercises = []) => {
  let allPreviousEntries = [];
  const today = new Date().toISOString().split('T')[0];
  
  workouts.forEach(w => {
    if (w.workout_date !== today) {
      const sets = w.workout_entries?.filter(e => e.exercise_id === exId) || [];
      if (sets.length > 0) {
        let bestSet = sets[0];
        sets.forEach(s => {
          if (s.weight > bestSet.weight) bestSet = s;
          else if (s.weight === bestSet.weight && s.reps > bestSet.reps) bestSet = s;
        });
        allPreviousEntries.push({ date: w.workout_date, bestSet });
      }
    }
  });

  if (allPreviousEntries.length === 0) return { text: "Primera vez con este ejercicio. ¡Establece una base sólida! 💪", color: "#3b82f6" };

  allPreviousEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
  const lastSession = allPreviousEntries[0].bestSet;
  const history = allPreviousEntries.slice(0, 4);

  if (history.length >= 3) {
    const weights = history.map(h => h.bestSet.weight);
    const isStagnant = weights.every(w => w <= weights[weights.length - 1]);
    
    if (isStagnant) {
      return {
        text: "🚨 Meseta detectada: Llevas 3 sesiones sin subir peso. Sugerencia: Baja un 10% el peso y enfócate en técnica perfecta o cambia el rango de reps.",
        color: "#f87171",
        isPlateau: true
      };
    }
  }

  const currentEx = currentExercises.find(e => e.exercise_id === exId);
  let currentBestWeight = 0;
  if (currentEx) {
    currentEx.sets.forEach(s => {
      if (s.weight > currentBestWeight) currentBestWeight = s.weight;
    });
  }

  const suggestedWeight = lastSession.reps >= 8 ? lastSession.weight + 2.5 : lastSession.weight;

  if (currentBestWeight > lastSession.weight) {
    return {
      text: `¡NUEVO RÉCORD! 🏆 Superaste los ${lastSession.weight}kg anteriores. ¡Sigue así!`,
      color: "#10b981"
    };
  }

  if (lastSession.reps >= 9) {
    return { 
      text: `Última vez: ${lastSession.weight}kg x ${lastSession.reps}. Sugerencia: Sube a ${suggestedWeight}kg 🚀`,
      color: "#3b82f6"
    };
  } else if (lastSession.reps >= 6) {
    return { 
      text: `Última vez: ${lastSession.weight}kg x ${lastSession.reps}. Sugerencia: Mantén ${lastSession.weight}kg y busca 10 reps 🔥`,
      color: "#fbbf24"
    };
  } else {
    return { 
      text: `Sesión pesada: ${lastSession.weight}kg x ${lastSession.reps}. Mantén peso y mejora la ejecución.`,
      color: "#a78bfa"
    };
  }
};

// Series (en orden) de la sesión previa más reciente que incluyó este ejercicio
// (excluye el día de hoy, para no mezclarse con la sesión que se está armando).
export const getLastExerciseSets = (exId, workouts) => {
  const today = new Date().toISOString().split('T')[0];
  const previous = (workouts || [])
    .filter(w => w.workout_date !== today && w.workout_entries?.some(e => e.exercise_id === exId))
    .sort((a, b) => new Date(b.workout_date) - new Date(a.workout_date))[0];

  if (!previous) return [];

  return previous.workout_entries
    .filter(e => e.exercise_id === exId)
    .sort((a, b) => (a.set_number || 0) - (b.set_number || 0))
    .map(e => ({ weight: e.weight, reps: e.reps, rpe: e.rpe || 8 }));
};

// Arma `count` series precargadas con lo que se hizo la última vez (en vez de
// arrancar siempre en 0), repitiendo la última serie conocida si se piden más
// series de las que hay historial. Si nunca se hizo el ejercicio, arranca en 0.
export const buildPrefilledSets = (lastSets, count, fallbackReps = 0) => {
  if (!lastSets || lastSets.length === 0) {
    return Array.from({ length: count }, () => ({ weight: 0, reps: fallbackReps, rpe: 8, type: 'Normal' }));
  }
  return Array.from({ length: count }, (_, i) => {
    const src = lastSets[i] || lastSets[lastSets.length - 1];
    return { weight: src.weight, reps: src.reps, rpe: src.rpe || 8, type: 'Normal' };
  });
};

export const evaluateLiveSet = (weight, reps, rpe, type = 'Normal') => {
  if (type === 'Warmup' || !weight || weight <= 0 || !reps || reps <= 0 || !rpe) return null;

  const r = parseFloat(rpe);
  const w = parseFloat(weight);

  if (r <= 6 && reps >= 6) {
    return {
      type: 'increase',
      text: `RPE ${r}: Muy fácil. Sube a ${w + 2.5}kg para la próxima serie.`,
      color: '#00ff9d'
    };
  }
  
  if (r >= 9.5 && reps < 6) {
    return {
      type: 'decrease',
      text: `RPE ${r}: Al fallo. Baja a ${w >= 5 ? w - 2.5 : w}kg para el volumen técnico.`,
      color: '#f87171'
    };
  }

  if (r >= 7.5 && r <= 8.5) {
    return {
      type: 'maintain',
      text: `RPE ${r}: Intensidad óptima (Sweet Spot). Mantén este peso.`,
      color: '#fbbf24'
    };
  }

  return null;
};

export const getGlobalMotivation = (workouts, profile) => {
  if (workouts.length === 0) return "¡Bienvenido! El primer paso es el más difícil. ¡Dale con todo hoy!";
  
  const lastWorkout = workouts[0];
  const today = new Date().toISOString().split('T')[0];
  
  if (lastWorkout.workout_date === today) {
    return "¡Entrenamiento de hoy completado! El descanso es donde ocurre el crecimiento. 🛌";
  }

  const diffDays = Math.floor((new Date() - new Date(lastWorkout.workout_date)) / (1000 * 60 * 60 * 24));
  
  if (diffDays > 4) {
    return "¡Te extrañamos en el gym! 🏃‍♂️ Volver hoy es mejor que volver mañana.";
  }

  if (diffDays <= 1) {
    return "¡Manteniendo el momentum! Estás en racha. ¿Qué toca destruir hoy? 💪";
  }

  return "Listo para otra sesión. La consistencia le gana al talento siempre.";
};

export const getWeeklyInsight = (workouts) => {
  const activeWorkouts = workouts.filter(w => !w.name?.endsWith('\u200B'));
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const thisWeekWorkouts = activeWorkouts.filter(w => new Date(w.workout_date) >= oneWeekAgo);
  const lastWeekWorkouts = activeWorkouts.filter(w => new Date(w.workout_date) >= twoWeeksAgo && new Date(w.workout_date) < oneWeekAgo);

  const getVol = (list) => list.reduce((acc, w) => acc + (w.workout_entries?.reduce((a, e) => a + (e.weight * e.reps), 0) || 0), 0);

  const vol1 = getVol(thisWeekWorkouts);
  const vol2 = getVol(lastWeekWorkouts);

  if (vol1 > vol2 && vol2 > 0) {
    const diff = Math.round(((vol1 - vol2) / vol2) * 100);
    return `📈 Progreso Semanal: Has aumentado tu volumen un ${diff}% respecto a la semana pasada. ¡Bien ahí!`;
  }

  return null;
};

export const getMuscleReminder = (workouts) => {
  const activeWorkouts = workouts.filter(w => !w.name?.endsWith('\u200B'));
  if (activeWorkouts.length === 0) return null;

  const muscleHistory = {};
  activeWorkouts.slice(0, 10).forEach(w => {
    w.workout_entries?.forEach(e => {
      const muscle = e.exercises?.muscle_group || 'Otros';
      if (!muscleHistory[muscle]) muscleHistory[muscle] = new Date(w.workout_date);
    });
  });

  const now = new Date();
  const neglected = Object.entries(muscleHistory).find(([muscle, lastDate]) => {
    const diff = (now - lastDate) / (1000 * 60 * 60 * 24);
    return diff > 7;
  });

  if (neglected) {
    return `👀 Ojo ahí: Llevas más de una semana sin entrenar ${neglected[0]}. ¿Toca hoy?`;
  }

  return null;
};

export const getMuscleRecoveryStates = (workouts) => {
  const activeWorkouts = workouts.filter(w => !w.name?.endsWith('\u200B'));
  const muscleLastTrained = {};
  activeWorkouts.slice(0, 20).forEach(w => {
    const workoutDate = new Date(w.workout_date);
    w.workout_entries?.forEach(e => {
      const rawMuscle = e.exercises?.muscle_group;
      if (!rawMuscle) return;
      const muscle = normalizeMuscleGroup(rawMuscle);
      if (muscle === 'UNKNOWN') return;
      if (!muscleLastTrained[muscle] || workoutDate > muscleLastTrained[muscle]) {
        muscleLastTrained[muscle] = workoutDate;
      }
    });
  });

  const now = new Date();
  const recoveryStates = {};
  Object.entries(muscleLastTrained).forEach(([muscle, lastDate]) => {
    const hoursSince = (now - lastDate) / (1000 * 60 * 60);
    const requiredHours = RECOVERY_TIMES[muscle] || RECOVERY_TIMES['Default'];
    let percent = Math.min((hoursSince / requiredHours) * 100, 100);
    recoveryStates[muscle] = {
      percent: Math.round(percent),
      hoursLeft: Math.max(0, Math.round(requiredHours - hoursSince)),
      status: percent >= 100 ? 'Ready' : percent > 50 ? 'Recovering' : 'Fatigued',
      color: percent >= 100 ? '#00ff9d' : percent > 50 ? '#fbbf24' : '#ef4444'
    };
  });
  return recoveryStates;
};
