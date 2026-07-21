import { calculate1RM } from '../lib/rankingSystem';
import { normalizeMuscleGroup, translateMuscleGroup } from '../constants/Muscles';

/**
 * Servicio de Logros y Gamificación para Elite Gym Tracker (v2.0)
 */

export const calculateStreak = (workouts) => {
  if (!workouts || workouts.length === 0) return 0;

  // Obtener fechas únicas ordenadas descendente
  const dates = [...new Set(workouts.map(w => w.workout_date))].sort((a, b) => new Date(b) - new Date(a));
  
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Si no ha entrenado hoy ni ayer, la racha es 0
  if (dates[0] !== today && dates[0] !== yesterday) return 0;

  let streak = 0;
  let currentDate = new Date(dates[0]);

  for (let i = 0; i < dates.length; i++) {
    const workoutDate = new Date(dates[i]);
    const diffTime = Math.abs(currentDate - workoutDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) {
      streak++;
      currentDate = workoutDate;
    } else {
      break;
    }
  }

  return streak;
};

const calculateWorkoutVolume = (workout) => {
  return workout.workout_entries?.reduce((acc, e) => acc + (e.weight * e.reps), 0) || 0;
};

const getTotalVolume = (workouts) => {
  return workouts.reduce((acc, w) => acc + calculateWorkoutVolume(w), 0);
};

const calculateTotalMuscleVolume = (workouts, targetMuscle) => {
  let total = 0;
  workouts.forEach(w => {
    w.workout_entries?.forEach(e => {
      const rawMuscle = e.exercises?.muscle_group;
      if (rawMuscle && normalizeMuscleGroup(rawMuscle) === targetMuscle) {
        total += e.weight * e.reps;
      }
    });
  });
  return total;
};

const checkMaxRMExact = (workouts, validExerciseNames, requiredMuscleGroup, excludeKeywords = []) => {
  let maxRM = 0;
  workouts.forEach(w => {
    w.workout_entries?.forEach(e => {
      const name = e.exercises?.name?.toLowerCase() || '';
      const rawMuscle = e.exercises?.muscle_group;

      const isCorrectMuscle = requiredMuscleGroup === 'ANY' || (rawMuscle && normalizeMuscleGroup(rawMuscle) === requiredMuscleGroup);
      const isCorrectExercise = validExerciseNames.some(val => name.includes(val.toLowerCase()));
      const isExcludedVariant = excludeKeywords.some(kw => name.includes(kw));

      if (isCorrectMuscle && isCorrectExercise && !isExcludedVariant) {
        const rm = calculate1RM(e.weight, e.reps);
        if (rm > maxRM) maxRM = rm;
      }
    });
  });
  return maxRM;
};

const checkTimeWorkout = (workouts, startHour, endHour) => {
  return workouts.some(w => {
    const dateObj = new Date(w.created_at || w.workout_date);
    const hour = dateObj.getHours();
    return hour >= startHour && hour < endHour;
  });
};

const checkTriplePR = (workouts) => {
  return workouts.some(workout => {
    let prCount = 0;
    const date = new Date(workout.workout_date);
    
    const entries = workout.workout_entries || [];
    if (entries.length < 3) return false;

    entries.forEach(entry => {
      const exId = entry.exercise_id;
      const currentPerf = entry.weight * entry.reps;
      
      let bestPreviousPerf = 0;
      workouts.forEach(w => {
        if (new Date(w.workout_date) < date) {
          w.workout_entries?.forEach(e => {
            if (e.exercise_id === exId) {
              const perf = e.weight * e.reps;
              if (perf > bestPreviousPerf) bestPreviousPerf = perf;
            }
          });
        }
      });

      if (bestPreviousPerf > 0 && currentPerf > bestPreviousPerf) {
        prCount++;
      }
    });

    return prCount >= 3;
  });
};

const generateAchievements = () => {
  let all = [];

  // 1. STREAKS
  const streaks = [3, 7, 14, 21, 30, 60, 90, 180, 365];
  const streakTitles = ['Guerrero Constante', 'Disciplina de Hierro', 'Consistencia de Leyenda', 'Hábito Inquebrantable', 'Mes Perfecto', 'Dos Meses a Fuego', 'Trimestre Épico', 'Medio Año Imparable', 'Un Año Sin Excusas'];
  const streakXp = [150, 300, 500, 750, 1000, 1500, 2000, 3500, 5000];
  streaks.forEach((d, i) => {
    all.push({
      id: `streak_${d}`, name: streakTitles[i], description: `Entrena ${d} días seguidos sin fallar.`,
      icon: '🔥', xpReward: streakXp[i], target: d, unit: 'días', getCurrent: calculateStreak,
      requirement: (w) => calculateStreak(w) >= d
    });
  });

  // 2. TOTAL WORKOUTS
  const totalW = [1, 10, 25, 50, 100, 250, 500, 750, 1000];
  const totalTitles = ['Primer Paso', 'Novato Comprometido', 'Habitual', 'Atleta Frecuente', 'Centurión', 'Veterano', 'Leyenda del Gym', 'Semidiós del Acero', 'Dios del Olimpo'];
  const totalXp = [100, 200, 400, 800, 1500, 3000, 5000, 7500, 10000];
  totalW.forEach((t, i) => {
    all.push({
      id: `total_w_${t}`, name: totalTitles[i], description: `Completa ${t} entrenamientos en total.`,
      icon: '🏆', xpReward: totalXp[i], target: t, unit: 'entrenamientos', getCurrent: (w) => w.length,
      requirement: (w) => w.length >= t
    });
  });

  // 3. LIFETIME VOLUME
  const vols = [10000, 50000, 100000, 250000, 500000, 1000000, 2500000, 5000000, 10000000];
  const volTitles = ['Levantador Casual', 'Motor en Marcha', 'Cien Mil Kilos', 'Cuarto de Millón', 'Medio Millón', 'El Millonario', 'Máquina de Carga', 'Fuerza Colosal', 'Atlas Moderno'];
  const volXp = [200, 500, 1000, 2000, 3500, 5000, 8000, 12000, 20000];
  vols.forEach((v, i) => {
    all.push({
      id: `life_vol_${v}`, name: volTitles[i], description: `Mueve un total acumulado de ${v.toLocaleString('en-US')} kg en tu vida.`,
      icon: '🌋', xpReward: volXp[i], target: v, unit: 'kg', getCurrent: getTotalVolume,
      requirement: (w) => getTotalVolume(w) >= v
    });
  });

  // 3.5. SINGLE WORKOUT VOLUME
  const singleVols = [1000, 5000, 10000, 20000, 50000];
  const singleVolTitles = ['Carga Ligera', 'Hércules Moderno', 'Volumen Colosal', 'Carga Bestial', 'Titan del Gimnasio'];
  const singleVolXp = [100, 250, 500, 1000, 2500];
  const getMaxSingleWorkoutVolume = (w) => w.reduce((max, workout) => Math.max(max, calculateWorkoutVolume(workout)), 0);
  singleVols.forEach((v, i) => {
    all.push({
      id: `single_vol_${v}`, name: singleVolTitles[i], description: `Mueve más de ${v.toLocaleString('en-US')} kg en una sola sesión.`,
      icon: '🏋️', xpReward: singleVolXp[i], target: v, unit: 'kg (sesión)', getCurrent: getMaxSingleWorkoutVolume,
      requirement: (w) => getMaxSingleWorkoutVolume(w) >= v
    });
  });

  // 4. MUSCLE MASTERY (6 muscles x 10 levels = 60 logros)
  const muscles = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];
  const muscleEmojis = {'Chest':'🛡️', 'Back':'🦅', 'Legs':'🦵', 'Shoulders':'🏔️', 'Arms':'💪', 'Core':'🍫'};
  const muscleTiers = [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000, 2000000];

  muscles.forEach(m => {
    const spanishName = translateMuscleGroup(m);
    muscleTiers.forEach((vol, lvl) => {
      all.push({
        id: `mastery_${m}_lvl${lvl+1}`, name: `Maestría de ${spanishName} Nivel ${lvl+1}`,
        description: `Acumula ${vol.toLocaleString('en-US')} kg movidos en ejercicios de ${spanishName}.`,
        icon: muscleEmojis[m], xpReward: 100 + (lvl * 150), target: vol, unit: 'kg', getCurrent: (w) => calculateTotalMuscleVolume(w, m),
        requirement: (w) => calculateTotalMuscleVolume(w, m) >= vol
      });
    });
  });

  // 5. 1RM MILESTONES (Strict Validation)
  const lifts = [
    { id: 'bench', name: 'Bench Press', muscle: 'Chest', validNames: ['bench press', 'press de banca', 'chest press'], excludeKeywords: ['close', 'tricep', 'cerrado', 'incline', 'decline', 'inclinado', 'declinado'], targets: [60, 80, 100, 120, 140, 160], icon: '👑', xpScale: 200 },
    { id: 'squat', name: 'Sentadilla', muscle: 'Legs', validNames: ['squat', 'sentadilla'], excludeKeywords: ['split', 'bulgar'], targets: [80, 100, 140, 180, 220, 260], icon: '🦵', xpScale: 200 },
    { id: 'deadlift', name: 'Peso Muerto', muscle: 'Back', validNames: ['deadlift', 'peso muerto'], excludeKeywords: ['romanian', 'rumano', 'stiff', 'sumo'], targets: [100, 140, 180, 220, 260, 300], icon: '🦍', xpScale: 250 },
    { id: 'ohp', name: 'Press Militar', muscle: 'Shoulders', validNames: ['overhead press', 'press militar', 'military press'], excludeKeywords: ['dumbbell', 'mancuerna', 'arnold'], targets: [40, 60, 80, 100, 120], icon: '🏔️', xpScale: 250 },
  ];

  lifts.forEach(lift => {
    const getCurrentRM = (w) => checkMaxRMExact(w, lift.validNames, lift.muscle, lift.excludeKeywords);
    lift.targets.forEach((kg, lvl) => {
      all.push({
        id: `1rm_${lift.id}_${kg}`, name: `Rey del ${lift.name} ${kg}kg`,
        description: `Alcanza un 1RM estimado de ${kg}kg en ${lift.name}.`,
        icon: lift.icon, xpReward: lift.xpScale * (lvl + 1), target: kg, unit: 'kg (1RM)', getCurrent: getCurrentRM,
        requirement: (w) => getCurrentRM(w) >= kg
      });
    });
  });

  // 6. SPECIALS
  all.push({
    id: 'triple_pr', name: 'Cazador de Récords', description: 'Consigue 3 o más récords (PR) en una sola sesión.',
    icon: '⚡', xpReward: 400, requirement: (w) => checkTriplePR(w)
  });
  all.push({
    id: 'early_bird', name: 'Madrugador', description: 'Completa un entrenamiento antes de las 8:00 AM.',
    icon: '🌅', xpReward: 150, requirement: (w) => checkTimeWorkout(w, 0, 8)
  });
  all.push({
    id: 'night_warrior', name: 'Guerrero Nocturno', description: 'Completa un entrenamiento después de las 9:00 PM.',
    icon: '🌌', xpReward: 150, requirement: (w) => checkTimeWorkout(w, 21, 24)
  });

  return all;
};

export const ACHIEVEMENTS = generateAchievements();

export const getEarnedAchievements = (workouts) => {
  return ACHIEVEMENTS.filter(a => a.requirement(workouts));
};

export const calculateUserXP = (workouts) => {
  if (!workouts) return 0;
  
  const earned = getEarnedAchievements(workouts);
  const achievementsXP = earned.reduce((acc, curr) => acc + (curr.xpReward || 0), 0);

  let workoutsXP = 0;
  workouts.forEach(w => {
    workoutsXP += 50; 
    const setQuantity = w.workout_entries?.length || 0;
    workoutsXP += setQuantity * 5; 
  });

  return achievementsXP + workoutsXP;
};

export const getLevelInfo = (xp) => {
  let level = 1;
  while (level * level * 100 <= xp) {
    level++;
  }
  level = level - 1; 

  const currentLevelMinXP = level * level * 100;
  const nextLevelMinXP = (level + 1) * (level + 1) * 100;
  
  const xpInLevel = xp - currentLevelMinXP;
  const xpNeededForNext = nextLevelMinXP - currentLevelMinXP;
  
  let rankTitle = 'Novato';
  if (level >= 100) rankTitle = 'Titán Inmortal';
  else if (level >= 90) rankTitle = 'Dios del Olimpo';
  else if (level >= 75) rankTitle = 'Semidiós';
  else if (level >= 60) rankTitle = 'Leyenda Viva';
  else if (level >= 50) rankTitle = 'Atleta Élite';
  else if (level >= 40) rankTitle = 'Guerrero Spartan';
  else if (level >= 30) rankTitle = 'Veterano';
  else if (level >= 20) rankTitle = 'Avanzado';
  else if (level >= 10) rankTitle = 'Aficionado Duro';
  else if (level >= 5) rankTitle = 'Principiante';

  return {
    level: level === 0 ? 1 : level,
    rankTitle,
    xpInLevel: level === 0 ? xp : xpInLevel,
    xpNeededForNext: level === 0 ? 100 : xpNeededForNext,
    progress: level === 0 ? (xp / 100) : (xpInLevel / xpNeededForNext)
  };
};
