/**
 * src/constants/Muscles.js
 * Fuente de verdad única para constantes de grupos musculares,
 * tiempos de recuperación y traducciones en gym-tracker-native.
 */

export const PRIMARY_GROUPS = {
  CHEST: 'Chest',
  BACK: 'Back',
  LEGS: 'Legs',
  SHOULDERS: 'Shoulders',
  ARMS: 'Arms',
  CORE: 'Core'
};

// Tiempos de recuperación en horas integrados al dominio central
export const RECOVERY_TIMES = {
  [PRIMARY_GROUPS.CHEST]: 48,
  [PRIMARY_GROUPS.BACK]: 48,
  [PRIMARY_GROUPS.LEGS]: 72,
  [PRIMARY_GROUPS.SHOULDERS]: 36,
  'Biceps': 24,
  'Triceps': 24,
  [PRIMARY_GROUPS.CORE]: 24,
  'Abs': 24,
  'Glutes': 48,
  'Default': 48
};

// Mapeo completo de sub-músculos a su grupo principal para visualizaciones agregadas (ej: Heatmap)
export const SUB_TO_PRIMARY_MAPPING = {
  [PRIMARY_GROUPS.CHEST]: PRIMARY_GROUPS.CHEST,
  [PRIMARY_GROUPS.BACK]: PRIMARY_GROUPS.BACK,
  [PRIMARY_GROUPS.LEGS]: PRIMARY_GROUPS.LEGS,
  [PRIMARY_GROUPS.SHOULDERS]: PRIMARY_GROUPS.SHOULDERS,
  [PRIMARY_GROUPS.ARMS]: PRIMARY_GROUPS.ARMS,
  [PRIMARY_GROUPS.CORE]: PRIMARY_GROUPS.CORE,

  // Sub-músculos específicos
  'Biceps': PRIMARY_GROUPS.ARMS,
  'Triceps': PRIMARY_GROUPS.ARMS,
  'Forearms': PRIMARY_GROUPS.ARMS,
  'Glutes': PRIMARY_GROUPS.LEGS,
  'Quads': PRIMARY_GROUPS.LEGS,
  'Hamstrings': PRIMARY_GROUPS.LEGS,
  'Calves': PRIMARY_GROUPS.LEGS,
  'Abs': PRIMARY_GROUPS.CORE,
  'Obliques': PRIMARY_GROUPS.CORE
};

// Mapeo de términos de entrada (inglés, español, acrónimos, sinónimos sin acentos)
export const MUSCLE_MAPPING = {
  // Chest
  'chest': PRIMARY_GROUPS.CHEST,
  'pecho': PRIMARY_GROUPS.CHEST,
  'pectoral': PRIMARY_GROUPS.CHEST,
  'pectorales': PRIMARY_GROUPS.CHEST,

  // Back
  'back': PRIMARY_GROUPS.BACK,
  'espalda': PRIMARY_GROUPS.BACK,
  'dorsal': PRIMARY_GROUPS.BACK,
  'dorsales': PRIMARY_GROUPS.BACK,

  // Legs & Sub-muscles
  'legs': PRIMARY_GROUPS.LEGS,
  'pierna': PRIMARY_GROUPS.LEGS,
  'piernas': PRIMARY_GROUPS.LEGS,
  'quads': 'Quads',
  'cuadriceps': 'Quads',
  'hamstrings': 'Hamstrings',
  'femoral': 'Hamstrings',
  'glutes': 'Glutes',
  'gluteo': 'Glutes',
  'gluteos': 'Glutes',
  'calves': 'Calves',
  'gemelos': 'Calves',
  'pantorrilla': 'Calves',

  // Shoulders
  'shoulders': PRIMARY_GROUPS.SHOULDERS,
  'hombro': PRIMARY_GROUPS.SHOULDERS,
  'hombros': PRIMARY_GROUPS.SHOULDERS,
  'deltoides': PRIMARY_GROUPS.SHOULDERS,

  // Arms & Sub-muscles
  'arms': PRIMARY_GROUPS.ARMS,
  'brazo': PRIMARY_GROUPS.ARMS,
  'brazos': PRIMARY_GROUPS.ARMS,
  'biceps': 'Biceps',
  'bicep': 'Biceps',
  'triceps': 'Triceps',
  'tricep': 'Triceps',
  'forearms': 'Forearms',
  'antebrazo': 'Forearms',

  // Core & Sub-muscles
  'core': PRIMARY_GROUPS.CORE,
  'abs': 'Abs',
  'abdomen': PRIMARY_GROUPS.CORE,
  'abdominales': 'Abs',
  'obliques': 'Obliques'
};

// Traducciones oficiales al español para la interfaz
export const TRANSLATIONS = {
  [PRIMARY_GROUPS.CHEST]: 'Pecho',
  [PRIMARY_GROUPS.BACK]: 'Espalda',
  [PRIMARY_GROUPS.LEGS]: 'Piernas',
  [PRIMARY_GROUPS.SHOULDERS]: 'Hombros',
  [PRIMARY_GROUPS.ARMS]: 'Brazos',
  [PRIMARY_GROUPS.CORE]: 'Abdomen',

  // Sub-músculos
  'Biceps': 'Bíceps',
  'Triceps': 'Tríceps',
  'Forearms': 'Antebrazos',
  'Glutes': 'Glúteos',
  'Quads': 'Cuádriceps',
  'Hamstrings': 'Femorales',
  'Calves': 'Gemelos',
  'Abs': 'Abdominales',
  'Obliques': 'Oblicuos',

  'UNKNOWN': 'Desconocido'
};

/**
 * Normaliza cualquier cadena de entrada a la clave de dominio oficial en inglés.
 * Retorna 'UNKNOWN' e imprime una advertencia en la consola si el músculo no es reconocido.
 */
export const normalizeMuscleGroup = (input) => {
  if (!input) return 'UNKNOWN';
  const clean = input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Eliminar acentos
  
  const key = MUSCLE_MAPPING[clean];
  if (!key) {
    console.warn(`[Muscles Warning] Músculo o alias desconocido detectado: "${input}"`);
    return 'UNKNOWN';
  }
  return key;
};

/**
 * Traduce cualquier cadena de entrada de grupo muscular al español oficial.
 */
export const translateMuscleGroup = (input) => {
  const key = normalizeMuscleGroup(input);
  return TRANSLATIONS[key] || 'Desconocido';
};

/**
 * Obtiene la lista de sub-músculos que pertenecen a un grupo primario específico.
 */
export const getSubMusclesForGroup = (primaryGroup) => {
  const normPrimary = normalizeMuscleGroup(primaryGroup);
  if (normPrimary === 'UNKNOWN') return [];
  
  return Object.entries(SUB_TO_PRIMARY_MAPPING)
    .filter(([_, parent]) => parent === normPrimary)
    .map(([child]) => child);
};
