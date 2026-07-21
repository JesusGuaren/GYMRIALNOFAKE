/**
 * PlateCalculatorService.js
 * Servicio inteligente para el análisis contextual de ejercicios con barra
 * y cálculo dinámico de distribución de discos oficiales.
 */

// Palabras clave en español e inglés que denotan el uso de una barra
const BARBELL_KEYWORDS = [
  'barra',
  'barbell',
  'olimpica',
  'olímpica',
  'pre-olimpica',
  'pre-olímpica',
  'barra z',
  'z-bar',
  'bench press',
  'press de banca',
  'squat',
  'sentadilla con barra',
  'sentadilla hack',
  'deadlift',
  'peso muerto',
  'overhead press',
  'press militar',
  'rompecraneos',
  'rompecráneos',
  'skull crushers',
  'thruster'
];

// Mapeo específico de ejercicios de brazos o accesorios que usan barras cortas o barras Z (10 kg por defecto)
const LIGHT_BAR_EXERCISES = [
  'curl',
  'bicep',
  'bíceps',
  'tricep',
  'tríceps',
  'rompecraneos',
  'rompecráneos',
  'skull crushers',
  'barra z',
  'z-bar'
];

// Valores estándar de discos oficiales en kilogramos (ordenados de mayor a menor)
const STANDARD_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

/**
 * Detecta semánticamente si el ejercicio actual se realiza con barra.
 */
export const isBarbellExercise = (exerciseName) => {
  if (!exerciseName) return false;
  const nameLower = exerciseName.toLowerCase();
  
  // Exclusiones: Si dice "mancuerna", "polea", "maquina", "multipower" o "smith", no es barra libre pura
  if (
    nameLower.includes('mancuerna') || 
    nameLower.includes('dumbbell') || 
    nameLower.includes('polea') || 
    nameLower.includes('cable') ||
    nameLower.includes('maquina') ||
    nameLower.includes('máquina') ||
    nameLower.includes('smith') ||
    nameLower.includes('multipower')
  ) {
    return false;
  }

  // Verificar palabras clave
  return BARBELL_KEYWORDS.some(keyword => nameLower.includes(keyword));
};

/**
 * Retorna el peso sugerido de la barra según el tipo de ejercicio.
 */
export const getDefaultBarWeight = (exerciseName) => {
  if (!exerciseName) return 20;
  const nameLower = exerciseName.toLowerCase();

  // Si es un ejercicio de brazo o barra Z, sugerir 10 kg
  const isLightBar = LIGHT_BAR_EXERCISES.some(keyword => nameLower.includes(keyword));
  if (isLightBar) return 10;

  // Para sentadillas, peso muerto, press banca, etc., la barra estándar es de 20 kg
  return 20;
};

/**
 * Calcula la distribución óptima de discos oficiales por cada lado de la barra.
 */
export const calculatePlatesNeeded = (totalWeight, barWeight) => {
  const targetWeightPerSide = (totalWeight - barWeight) / 2;

  if (targetWeightPerSide <= 0) {
    return {
      success: false,
      error: totalWeight < barWeight ? 'El peso total es menor que el de la barra sola.' : 'El peso coincide exactamente con la barra vacía.',
      plates: []
    };
  }

  let remainingWeight = targetWeightPerSide;
  const platesResult = [];

  // Algoritmo codicioso para encontrar la combinación óptima de discos
  STANDARD_PLATES.forEach(plate => {
    const count = Math.floor(remainingWeight / plate);
    if (count > 0) {
      platesResult.push({
        weight: plate,
        qty: count
      });
      remainingWeight -= (plate * count);
    }
  });

  return {
    success: true,
    plates: platesResult,
    remaining: Math.round(remainingWeight * 100) / 100 // Peso remanente por precisión decimal
  };
};
