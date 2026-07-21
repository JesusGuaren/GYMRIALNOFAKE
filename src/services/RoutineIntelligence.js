/**
 * RoutineIntelligence.js
 * Generador de insights y detección de desbalances musculares.
 */

import { calculateVolumeProfile } from './VolumeService';

export const analyzeRoutine = (exercises) => {
  const profile = calculateVolumeProfile(exercises);
  const insights = [];
  const warnings = [];

  // 1. Detección de volumen excesivo
  Object.entries(profile).forEach(([muscle, data]) => {
    if (data.status.label.includes('Exceso')) {
      warnings.push(`⚠️ Exceso de volumen en **${muscle}** (${data.sets} series). Esto puede llevar a sobreentrenamiento.`);
    }
  });

  // 2. Detección de desbalances (Push vs Pull)
  const pushSets = (profile['Chest']?.sets || 0) + (profile['Shoulders']?.sets || 0);
  const pullSets = profile['Back']?.sets || 0;

  if (pushSets > pullSets * 1.5 && pushSets > 5) {
    warnings.push("⚖️ **Desbalance detectado**: Tienes mucho más trabajo de Empuje (Pecho/Hombro) que de Tracción (Espalda). Considera añadir más remos o dominadas.");
  }

  // 3. Recomendaciones de hipertrofia
  const hypertrophyMuscles = Object.entries(profile)
    .filter(([_, data]) => data.sets >= 10 && data.sets <= 20)
    .map(([muscle]) => muscle);

  if (hypertrophyMuscles.length > 0) {
    insights.push(`💪 Volumen óptimo para hipertrofia en: ${hypertrophyMuscles.join(', ')}.`);
  }

  // 4. Mantenimiento
  const maintenanceMuscles = Object.entries(profile)
    .filter(([_, data]) => data.sets > 0 && data.sets < 10)
    .map(([muscle]) => muscle);

  if (maintenanceMuscles.length > 0) {
    insights.push(`📍 Volumen de mantenimiento en: ${maintenanceMuscles.join(', ')}.`);
  }

  return {
    profile,
    insights,
    warnings,
    summary: {
      totalSets: exercises.reduce((acc, ex) => acc + (ex.sets?.length || 0), 0),
      totalTonnage: Object.values(profile).reduce((acc, d) => acc + d.tonnage, 0)
    }
  };
};
