export const RANKS = [
  { name: 'Carbón', id: 'coal', icon: '/ranks/coal.png', minRatio: 0, color: '#4a4a4a' },
  { name: 'Hierro', id: 'iron', icon: '/ranks/iron.png', minRatio: 0.3, color: '#9ca3af' },
  { name: 'Bronce', id: 'bronze', icon: '/ranks/bronze.png', minRatio: 0.5, color: '#b45309' },
  { name: 'Plata', id: 'silver', icon: '/ranks/silver.png', minRatio: 0.8, color: '#94a3b8' },
  { name: 'Oro', id: 'gold', icon: '/ranks/gold.png', minRatio: 1.2, color: '#eab308' },
  { name: 'Platino', id: 'platinum', icon: '/ranks/platinum.png', minRatio: 1.6, color: '#06b6d4' },
  { name: 'Diamante', id: 'diamond', icon: '/ranks/diamond.png', minRatio: 2.0, color: '#8b5cf6' }
];

export const getRankByWeight = (oneRepMax, muscleGroup, exerciseName = '') => {
  if (!oneRepMax || oneRepMax <= 0) return RANKS[0];

  // Si el ejercicio es con mancuernas (peso por mano), el esfuerzo total es el doble
  const nameLower = (exerciseName || '').toLowerCase();
  const isDumbbell = nameLower.includes('dumbbell') || nameLower.includes('mancuerna') || nameLower.includes('curl') || nameLower.includes('raises') || nameLower.includes('fly');
  const effectiveWeight = isDumbbell ? (oneRepMax * 2) : oneRepMax;

  // Base multiplier per muscle group relative to average strength.
  // We use 75kg as a standard baseline divisor for normalization.
  // Higher multiplier = easier to get a high rank with lower weight.
  const groupMultipliers = {
    'Legs': 0.6,      // Legs are strong (e.g. 150kg * 0.6 = 90 / 75 = 1.2 => Oro)
    'Chest': 1.0,     // Chest is baseline (e.g. 100kg * 1.0 = 100 / 75 = 1.33 => Oro)
    'Back': 1.0,      
    'Shoulders': 1.5, // Shoulders are weaker (e.g. 60kg * 1.5 = 90 / 75 = 1.2 => Oro)
    'Arms': 2.5       // Arms are weakest (e.g. 40kg * 2.5 = 100 / 75 = 1.33 => Oro)
  };

  const multiplier = groupMultipliers[muscleGroup] || 1.0;
  const normalizedRatio = (effectiveWeight * multiplier) / 75;

  let currentRank = RANKS[0];
  for (let rank of RANKS) {
    if (normalizedRatio >= rank.minRatio) {
      currentRank = rank;
    }
  }
  
  return currentRank;
};

/**
 * Calcula el 1RM estimado usando la fórmula de Brzycki para 1-10 reps,
 * y Epley para más de 10 reps.
 */
export const calculate1RM = (weight, reps) => {
  if (!weight || !reps) return 0;
  if (reps === 1) return weight;
  
  if (reps <= 10) {
    // Fórmula de Brzycki
    return Math.round(weight / (1.0278 - (0.0278 * reps)));
  } else {
    // Fórmula de Epley
    return Math.round(weight * (1 + (reps / 30)));
  }
};
