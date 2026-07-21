/**
 * VolumeService.js
 * Motor determinístico para el análisis de volumen de entrenamiento.
 */

export const VOLUME_RANGES = {
  MAINTENANCE: { min: 0, max: 9, label: 'Mantenimiento / Bajo estímulo', color: '#94a3b8' }, // Slate-400
  OPTIMAL: { min: 10, max: 20, label: 'Volumen Óptimo (Hipertrofia)', color: '#34d399' }, // Emerald-400
  HIGH: { min: 21, max: 25, label: 'Volumen Alto', color: '#fbbf24' }, // Amber-400
  EXCESSIVE: { min: 26, max: Infinity, label: 'Exceso de Volumen (Riesgo)', color: '#f87171' } // Red-400
};

// Mapeo de contribución muscular (1.0 = primario, 0.5 = secundario)
// Esto permite que un Press de Banca cuente para Pecho y Tríceps.
export const MUSCLE_CONTRIBUTIONS = {
  'Chest': { 'Chest': 1.0, 'Triceps': 0.5, 'Shoulders': 0.5 },
  'Back': { 'Back': 1.0, 'Biceps': 0.5, 'Shoulders': 0.3 },
  'Shoulders': { 'Shoulders': 1.0, 'Triceps': 0.3 },
  'Legs': { 'Legs': 1.0, 'Core': 0.3 },
  'Arms': { 'Arms': 1.0 }, // Generalmente bíceps/tríceps se categorizan más específico
  'Biceps': { 'Biceps': 1.0 },
  'Triceps': { 'Triceps': 1.0 },
  'Core': { 'Core': 1.0 }
};

import { normalizeMuscleGroup } from '../constants/Muscles';

/**
 * Calcula el volumen total por grupo muscular a partir de una lista de ejercicios.
 * Cada ejercicio debe tener un array de sets con { weight, reps }.
 */
export const calculateVolumeProfile = (exercises) => {
  const profile = {};

  exercises.forEach(ex => {
    const rawMuscle = ex.muscle_group || 'Other';
    const primaryMuscle = normalizeMuscleGroup(rawMuscle);
    const contributions = MUSCLE_CONTRIBUTIONS[primaryMuscle] || { [primaryMuscle]: 1.0 };
    const numSets = ex.sets?.length || 0;

    Object.entries(contributions).forEach(([muscle, factor]) => {
      if (!profile[muscle]) {
        profile[muscle] = {
          sets: 0,
          tonnage: 0,
          label: ''
        };
      }
      
      profile[muscle].sets += (numSets * factor);
      
      // Cálculo de tonelaje (Volumen total levantado)
      const exTonnage = ex.sets?.reduce((acc, set) => acc + (Number(set.weight) * Number(set.reps)), 0) || 0;
      profile[muscle].tonnage += (exTonnage * factor);
    });
  });

  // Asignar etiquetas de rango
  Object.keys(profile).forEach(muscle => {
    const sets = profile[muscle].sets;
    let range = VOLUME_RANGES.MAINTENANCE;

    if (sets >= VOLUME_RANGES.OPTIMAL.min && sets <= VOLUME_RANGES.OPTIMAL.max) range = VOLUME_RANGES.OPTIMAL;
    else if (sets >= VOLUME_RANGES.HIGH.min && sets <= VOLUME_RANGES.HIGH.max) range = VOLUME_RANGES.HIGH;
    else if (sets >= VOLUME_RANGES.EXCESSIVE.min) range = VOLUME_RANGES.EXCESSIVE;

    profile[muscle].status = range;
  });

  return profile;
};

/**
 * Compara dos perfiles de volumen y devuelve la variación.
 */
export const compareVolumes = (current, previous) => {
  const comparison = {};
  const allMuscles = new Set([...Object.keys(current), ...Object.keys(previous)]);

  allMuscles.forEach(muscle => {
    const cur = current[muscle] || { tonnage: 0, sets: 0 };
    const prev = previous[muscle] || { tonnage: 0, sets: 0 };

    comparison[muscle] = {
      tonnageDiff: cur.tonnage - prev.tonnage,
      tonnagePct: prev.tonnage > 0 ? ((cur.tonnage - prev.tonnage) / prev.tonnage) * 100 : 100,
      setsDiff: cur.sets - prev.sets
    };
  });

  return comparison;
};
