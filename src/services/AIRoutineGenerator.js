/**
 * AIRoutineGenerator.js
 * Algoritmo avanzado de generación de rutinas adaptativas basadas en la ciencia del deporte,
 * patrones de movimiento cinéticos, especialización de volumen y técnicas de intensidad.
 */

// Categorización ultra-específica de ejercicios con nombres en español estándar de Latinoamérica
const BIO_EXERCISES = {
  // Patrones de Empuje (Pecho / Hombro Anterior / Tríceps)
  'Push_Horizontal': [
    { name: 'Press de Banca', equipment: 'barbell', stability: 'low', minLevel: 'Intermediate' },
    { name: 'Press Plano con Mancuernas', equipment: 'dumbbell', stability: 'medium', minLevel: 'Beginner' },
    { name: 'Prensa de Pecho en Máquina', equipment: 'machine', stability: 'high', minLevel: 'Beginner' },
    { name: 'Flexiones de Pecho (Lagartijas)', equipment: 'bodyweight', stability: 'medium', minLevel: 'Beginner' }
  ],
  'Push_Vertical': [
    { name: 'Press Militar con Barra', equipment: 'barbell', stability: 'low', minLevel: 'Intermediate' },
    { name: 'Press de Hombro con Mancuernas', equipment: 'dumbbell', stability: 'medium', minLevel: 'Beginner' },
    { name: 'Prensa de Hombro en Máquina', equipment: 'machine', stability: 'high', minLevel: 'Beginner' }
  ],
  'Push_Accessory': [
    { name: 'Press Inclinado con Mancuernas', equipment: 'dumbbell', stability: 'medium', minLevel: 'Beginner' },
    { name: 'Cruces de Polea para Pecho', equipment: 'cables', stability: 'high', minLevel: 'Beginner' },
    { name: 'Aperturas con Mancuernas', equipment: 'dumbbell', stability: 'medium', minLevel: 'Beginner' },
    { name: 'Pec Deck', equipment: 'machine', stability: 'high', minLevel: 'Beginner' }
  ],

  // Patrones de Tracción (Espalda / Hombro Posterior / Bíceps)
  'Pull_Horizontal': [
    { name: 'Remo con Barra', equipment: 'barbell', stability: 'low', minLevel: 'Intermediate' },
    { name: 'Remo con Mancuerna', equipment: 'dumbbell', stability: 'medium', minLevel: 'Beginner' },
    { name: 'Remo en Polea Sentado', equipment: 'cables', stability: 'high', minLevel: 'Beginner' },
    { name: 'Remo Apoyado en Banco con Mancuernas', equipment: 'dumbbell', stability: 'high', minLevel: 'Beginner' }
  ],
  'Pull_Vertical': [
    { name: 'Dominadas', equipment: 'bodyweight', stability: 'low', minLevel: 'Intermediate' },
    { name: 'Jalón al Pecho', equipment: 'cables', stability: 'high', minLevel: 'Beginner' },
    { name: 'Dominadas Australianas', equipment: 'bodyweight', stability: 'medium', minLevel: 'Beginner' }
  ],
  'Pull_Accessory': [
    { name: 'Face Pulls', equipment: 'cables', stability: 'high', minLevel: 'Beginner' },
    { name: 'Vuelos Posteriores con Mancuernas', equipment: 'dumbbell', stability: 'medium', minLevel: 'Beginner' },
    { name: 'Extensiones de Espalda (Lumbares)', equipment: 'bodyweight', stability: 'high', minLevel: 'Beginner' }
  ],

  // Patrones de Pierna (Cuádriceps / Femorales / Glúteos)
  'Leg_KneeDominant': [
    { name: 'Sentadilla con Barra', equipment: 'barbell', stability: 'low', minLevel: 'Intermediate' },
    { name: 'Prensa de Piernas', equipment: 'machine', stability: 'high', minLevel: 'Beginner' },
    { name: 'Sentadilla Goblet con Mancuerna', equipment: 'dumbbell', stability: 'medium', minLevel: 'Beginner' },
    { name: 'Sentadilla Hack', equipment: 'machine', stability: 'high', minLevel: 'Intermediate' }
  ],
  'Leg_HipDominant': [
    { name: 'Peso Muerto con Barra', equipment: 'barbell', stability: 'low', minLevel: 'Advanced' },
    { name: 'Peso Muerto Rumano con Barra', equipment: 'barbell', stability: 'low', minLevel: 'Intermediate' },
    { name: 'Peso Muerto Rumano con Mancuernas', equipment: 'dumbbell', stability: 'medium', minLevel: 'Beginner' },
    { name: 'Sentadilla Búlgara con Mancuernas', equipment: 'dumbbell', stability: 'low', minLevel: 'Advanced' },
    { name: 'Hip Thrust con Barra', equipment: 'barbell', stability: 'medium', minLevel: 'Beginner' }
  ],
  'Leg_Accessory': [
    { name: 'Extensiones de Cuádriceps', equipment: 'machine', stability: 'high', minLevel: 'Beginner' },
    { name: 'Curl de Pierna Acostado', equipment: 'machine', stability: 'high', minLevel: 'Beginner' },
    { name: 'Zancadas con Mancuernas', equipment: 'dumbbell', stability: 'medium', minLevel: 'Beginner' },
    { name: 'Elevación de Talones (Pantorrillas)', equipment: 'dumbbell', stability: 'high', minLevel: 'Beginner' },
    { name: 'Máquina de Abductores', equipment: 'machine', stability: 'high', minLevel: 'Beginner' }
  ],

  // Aislamiento de Brazos y Hombro Lateral
  'Lateral_Shoulder': [
    { name: 'Elevaciones Laterales con Mancuernas', equipment: 'dumbbell', stability: 'medium', minLevel: 'Beginner' },
    { name: 'Elevaciones Laterales en Polea', equipment: 'cables', stability: 'high', minLevel: 'Intermediate' }
  ],
  'Arm_Bicep': [
    { name: 'Curl de Bíceps con Mancuernas', equipment: 'dumbbell', stability: 'medium', minLevel: 'Beginner' },
    { name: 'Curl de Bíceps con Barra', equipment: 'barbell', stability: 'medium', minLevel: 'Intermediate' },
    { name: 'Curl de Bíceps Tipo Martillo', equipment: 'dumbbell', stability: 'medium', minLevel: 'Beginner' },
    { name: 'Curl de Bíceps en Polea', equipment: 'cables', stability: 'high', minLevel: 'Beginner' }
  ],
  'Arm_Tricep': [
    { name: 'Extensión de Tríceps en Polea', equipment: 'cables', stability: 'high', minLevel: 'Beginner' },
    { name: 'Rompecráneos con Barra (Skull Crushers)', equipment: 'barbell', stability: 'low', minLevel: 'Intermediate' },
    { name: 'Copa de Tríceps con Mancuerna', equipment: 'dumbbell', stability: 'medium', minLevel: 'Beginner' }
  ],

  // Core
  'Core_Main': [
    { name: 'Elevación de Rodillas Suspendido', equipment: 'bodyweight', stability: 'medium', minLevel: 'Intermediate' },
    { name: 'Plancha Abdominal', equipment: 'bodyweight', stability: 'high', minLevel: 'Beginner' },
    { name: 'Abdominales Crunches', equipment: 'bodyweight', stability: 'high', minLevel: 'Beginner' },
    { name: 'Leñador en Polea (Woodchopper)', equipment: 'cables', stability: 'high', minLevel: 'Intermediate' }
  ]
};

import { normalizeMuscleGroup, translateMuscleGroup } from '../constants/Muscles';

export const getMuscleSpanish = (key) => {
  if (key === 'Core') return 'Abdomen / Core';
  return translateMuscleGroup(key);
};

const EXERCISE_TRANSLATIONS = {
  'bench press': 'press de banca',
  'barbell squat': 'sentadilla con barra',
  'squat': 'sentadilla con barra',
  'deadlift': 'peso muerto con barra',
  'romanian deadlift': 'peso muerto rumano con barra',
  'pull-ups': 'dominadas',
  'lat pulldown': 'jalón al pecho',
  'barbell row': 'remo con barra',
  'dumbbell row': 'remo con mancuerna',
  'overhead press': 'press militar con barra',
  'dumbbell shoulder press': 'press de hombro con mancuernas',
  'lateral raises': 'elevaciones laterales con mancuernas',
  'triceps pushdown': 'extensión de tríceps en polea',
  'plank': 'plancha abdominal',
  'crunches': 'abdominales crunches',
  'bicep curl': 'curl de bíceps',
  'hammer curl': 'curl de bíceps tipo martillo',
  'dips': 'fondos en paralelas',
  'leg press': 'prensa de piernas',
  'leg extensions': 'extensiones de cuádriceps',
  'leg curls': 'curl de pierna acostado',
  'calf raises': 'elevación de talones (pantorrillas)',
  'abductor machine': 'máquina de abductores'
};

const PROGRAM_STRUCTURES = {
  2: {
    name: 'Upper / Lower (Torso / Piernas)',
    days: [
      {
        name: 'Día 1: Torso Completo',
        patterns: ['Push_Horizontal', 'Pull_Vertical', 'Push_Vertical', 'Pull_Horizontal', 'Arm_Bicep', 'Arm_Tricep']
      },
      {
        name: 'Día 2: Piernas & Core',
        patterns: ['Leg_KneeDominant', 'Leg_HipDominant', 'Leg_Accessory', 'Leg_Accessory', 'Core_Main']
      }
    ]
  },
  3: {
    name: 'Push / Pull / Legs (Empuje / Tracción / Pierna)',
    days: [
      {
        name: 'Día 1: Empuje (Pecho, Hombro, Tríceps)',
        patterns: ['Push_Horizontal', 'Push_Vertical', 'Push_Accessory', 'Lateral_Shoulder', 'Arm_Tricep']
      },
      {
        name: 'Día 2: Tracción (Espalda, Bíceps, Core)',
        patterns: ['Pull_Horizontal', 'Pull_Vertical', 'Pull_Accessory', 'Arm_Bicep', 'Core_Main']
      },
      {
        name: 'Día 3: Piernas Completas',
        patterns: ['Leg_KneeDominant', 'Leg_HipDominant', 'Leg_Accessory', 'Leg_Accessory', 'Core_Main']
      }
    ]
  },
  4: {
    name: 'Torso / Piernas x2 (Frecuencia 2)',
    days: [
      {
        name: 'Día 1: Torso - Fuerza',
        patterns: ['Push_Horizontal', 'Pull_Vertical', 'Push_Vertical', 'Pull_Horizontal']
      },
      {
        name: 'Día 2: Piernas - Fuerza',
        patterns: ['Leg_KneeDominant', 'Leg_HipDominant', 'Leg_Accessory', 'Core_Main']
      },
      {
        name: 'Día 3: Torso - Hipertrofia',
        patterns: ['Push_Accessory', 'Pull_Vertical', 'Lateral_Shoulder', 'Arm_Bicep', 'Arm_Tricep']
      },
      {
        name: 'Día 4: Piernas - Volumen',
        patterns: ['Leg_KneeDominant', 'Leg_HipDominant', 'Leg_Accessory', 'Leg_Accessory', 'Core_Main']
      }
    ]
  },
  5: {
    name: 'Arnold Split Modificado (5 Días)',
    days: [
      {
        name: 'Día 1: Pecho & Espalda',
        patterns: ['Push_Horizontal', 'Pull_Vertical', 'Push_Accessory', 'Pull_Horizontal', 'Pull_Accessory']
      },
      {
        name: 'Día 2: Hombros & Brazos',
        patterns: ['Push_Vertical', 'Lateral_Shoulder', 'Arm_Bicep', 'Arm_Tricep', 'Arm_Bicep', 'Arm_Tricep']
      },
      {
        name: 'Día 3: Piernas & Core',
        patterns: ['Leg_KneeDominant', 'Leg_HipDominant', 'Leg_Accessory', 'Leg_Accessory', 'Core_Main']
      },
      {
        name: 'Día 4: Torso Completo',
        patterns: ['Push_Horizontal', 'Pull_Vertical', 'Lateral_Shoulder', 'Pull_Horizontal']
      },
      {
        name: 'Día 5: Piernas & Brazos',
        patterns: ['Leg_KneeDominant', 'Leg_HipDominant', 'Arm_Bicep', 'Arm_Tricep', 'Core_Main']
      }
    ]
  },
  6: {
    name: 'Push / Pull / Legs x2 (Frecuencia 2 Elite)',
    days: [
      {
        name: 'Día 1: Empuje A',
        patterns: ['Push_Horizontal', 'Push_Vertical', 'Push_Accessory', 'Lateral_Shoulder', 'Arm_Tricep']
      },
      {
        name: 'Día 2: Tracción A',
        patterns: ['Pull_Horizontal', 'Pull_Vertical', 'Pull_Accessory', 'Arm_Bicep']
      },
      {
        name: 'Día 3: Piernas A',
        patterns: ['Leg_KneeDominant', 'Leg_HipDominant', 'Leg_Accessory', 'Leg_Accessory', 'Core_Main']
      },
      {
        name: 'Día 4: Empuje B',
        patterns: ['Push_Horizontal', 'Push_Vertical', 'Push_Accessory', 'Lateral_Shoulder', 'Arm_Tricep']
      },
      {
        name: 'Día 5: Tracción B',
        patterns: ['Pull_Horizontal', 'Pull_Vertical', 'Pull_Accessory', 'Arm_Bicep']
      },
      {
        name: 'Día 6: Piernas B',
        patterns: ['Leg_KneeDominant', 'Leg_HipDominant', 'Leg_Accessory', 'Leg_Accessory', 'Core_Main']
      }
    ]
  }
};

/**
 * Genera rutinas lógicas con nombres estandarizados en español y mapeo inteligente flexible a Supabase.
 */
export const generateAIRoutine = ({ goal, level, daysPerWeek, equipment = [], focusMuscles = [], exercisesDb = [] }) => {
  const structure = PROGRAM_STRUCTURES[daysPerWeek] || PROGRAM_STRUCTURES[3];
  const generatedDays = [];

  const findExerciseInDb = (exerciseName, patternKey) => {
    let normalizedTarget = exerciseName.toLowerCase();
    
    let found = exercisesDb.find(e => e.name.toLowerCase() === normalizedTarget);

    if (!found) {
      const translatedKey = Object.entries(EXERCISE_TRANSLATIONS).find(
        ([eng, esp]) => esp === normalizedTarget || eng === normalizedTarget
      );
      if (translatedKey) {
        const engName = translatedKey[0];
        const espName = translatedKey[1];
        found = exercisesDb.find(e => {
          const dbName = e.name.toLowerCase();
          return dbName === engName || dbName === espName || dbName.includes(engName) || dbName.includes(espName);
        });
      }
    }

    if (!found) {
      found = exercisesDb.find(e => e.name.toLowerCase().includes(normalizedTarget) || normalizedTarget.includes(e.name.toLowerCase()));
    }
    
    if (!found) {
      let fallbackGroup = 'Legs';
      if (patternKey.startsWith('Push') || patternKey.startsWith('Lateral')) fallbackGroup = 'Shoulders';
      if (patternKey.includes('Horizontal') && patternKey.startsWith('Push')) fallbackGroup = 'Chest';
      if (patternKey.startsWith('Pull')) fallbackGroup = 'Back';
      if (patternKey.includes('Bicep') || patternKey.includes('Tricep')) fallbackGroup = 'Arms';
      if (patternKey.startsWith('Core')) fallbackGroup = 'Core';

      found = exercisesDb.find(e => normalizeMuscleGroup(e.muscle_group) === normalizeMuscleGroup(fallbackGroup));
    }

    if (!found && exercisesDb.length > 0) {
      found = exercisesDb[0];
    }
    
    return found;
  };

  // Recorrer cada día
  structure.days.forEach((day) => {
    let dayExercises = [];
    const usedExerciseNames = new Set();

    // 1. ANÁLISIS DE ENFOQUE MUSCULAR DE ALTA INTENSIDAD (ESPECIALIZACIÓN)
    // Verificar si en este día se entrenan los grupos prioritarios seleccionados.
    // Mapeamos los patrones del día a sus grupos musculares reales para detectar coincidencias.
    const dayMuscles = new Set();
    day.patterns.forEach(pat => {
      if (pat.startsWith('Push_Horizontal')) dayMuscles.add('Chest');
      if (pat.startsWith('Pull')) dayMuscles.add('Back');
      if (pat.startsWith('Leg')) dayMuscles.add('Legs');
      if (pat.startsWith('Push_Vertical') || pat.startsWith('Lateral')) dayMuscles.add('Shoulders');
      if (pat.startsWith('Arm_Bicep')) dayMuscles.add('Biceps');
      if (pat.startsWith('Arm_Tricep')) dayMuscles.add('Triceps');
      if (pat.startsWith('Core')) dayMuscles.add('Core');
    });

    const activeFocusMuscles = focusMuscles.filter(m => dayMuscles.has(m));
    const hasActiveFocus = activeFocusMuscles.length > 0;

    // Detectar si tenemos enfoque de agonista-antagonista perfecto (Ej: Pecho y Espalda, o Bíceps y Tríceps)
    const isAntagonistFocus = 
      (focusMuscles.includes('Chest') && focusMuscles.includes('Back') && dayMuscles.has('Chest') && dayMuscles.has('Back')) ||
      (focusMuscles.includes('Biceps') && focusMuscles.includes('Triceps') && dayMuscles.has('Biceps') && dayMuscles.has('Triceps'));

    // 2. GENERACIÓN POR PATRÓN CON SOBRECARGA E INYECCIÓN DE VOLUMEN
    day.patterns.forEach((pattern) => {
      const candidates = BIO_EXERCISES[pattern] || [];
      
      let filtered = candidates.filter(ex => {
        if (level === 'Beginner') return ex.minLevel === 'Beginner';
        if (level === 'Intermediate') return ex.minLevel === 'Beginner' || ex.minLevel === 'Intermediate';
        return true;
      });

      if (equipment.length > 0) {
        filtered = filtered.filter(ex => equipment.includes(ex.equipment) || ex.equipment === 'bodyweight');
      }

      if (filtered.length === 0) {
        filtered = candidates.filter(ex => ex.minLevel === 'Beginner' || ex.minLevel === 'Intermediate');
      }

      // DETERMINAR SI ESTE PATRÓN CORRESPONDE A UN GRUPO CON ENFOQUE
      let patternMuscle = 'Other';
      if (pattern.startsWith('Push_Horizontal')) patternMuscle = 'Chest';
      else if (pattern.startsWith('Pull')) patternMuscle = 'Back';
      else if (pattern.startsWith('Leg')) patternMuscle = 'Legs';
      else if (pattern.startsWith('Push_Vertical') || pattern.startsWith('Lateral')) patternMuscle = 'Shoulders';
      else if (pattern.startsWith('Arm_Bicep')) patternMuscle = 'Biceps';
      else if (pattern.startsWith('Arm_Tricep')) patternMuscle = 'Triceps';
      else if (pattern.startsWith('Core')) patternMuscle = 'Core';

      const hasFocusOnThisPattern = focusMuscles.includes(patternMuscle);

      // Si tiene enfoque en este patrón, tomaremos HASTA 2 ejercicios en lugar de 1
      const numExercisesToTake = hasFocusOnThisPattern ? 2 : 1;

      for (let i = 0; i < numExercisesToTake; i++) {
        let selectedEx = filtered.find(ex => !usedExerciseNames.has(ex.name));
        if (!selectedEx && filtered.length > 0) {
          selectedEx = filtered[0];
        }

        if (selectedEx) {
          usedExerciseNames.add(selectedEx.name);
          const dbEx = findExerciseInDb(selectedEx.name, pattern);
          
          if (dbEx) {
            let sets = 3;
            let reps = '8-12';
            let notes = '';

            const isHeavyCompound = pattern.includes('Horizontal') || pattern.includes('Vertical') || pattern.includes('KneeDominant') || pattern.includes('HipDominant');

            if (goal === 'Strength') {
              if (isHeavyCompound) {
                sets = level === 'Advanced' ? 5 : level === 'Intermediate' ? 4 : 3;
                reps = '4-6';
                notes = `Fuerza Máxima: Carga pesada (~85% 1RM). Descanso completo de 3 min.`;
              } else {
                sets = 3;
                reps = '10-12';
                notes = `Accesorio de fuerza: Foco en estabilidad y control de bajada.`;
              }
            } else if (goal === 'Hypertrophy') {
              sets = hasFocusOnThisPattern ? 4 : 3;
              reps = level === 'Beginner' ? '10-12' : '8-10';
              notes = isHeavyCompound 
                ? `Tensión Mecánica: RPE 8. Controlar la bajada en 3 segundos.`
                : `Estrés Metabólico: RPE 9. Busca una contracción explosiva.`;
            } else {
              sets = 3;
              reps = '12-15';
              notes = `Resistencia: Descansos breves de 45-60s. Mantén tensión constante.`;
            }

            // APLICAR TÉCNICAS DE INTENSIDAD EXTREMA SI TIENE ENFOQUE
            if (hasFocusOnThisPattern) {
              sets += 1;
              if (i === 1) { // El segundo ejercicio inyectado de especialización recibe dropsets
                notes = `🔥 Especialización: ¡Añade una serie Drop Set final al fallo muscular!`;
              } else {
                notes = `⭐ Enfoque Prioritario: Técnica ultra controlada. RPE 9-10 (Cerca al fallo).`;
              }
            }

            dayExercises.push({
              id: Date.now() + Math.random(),
              exercise_id: dbEx.id,
              name: selectedEx.name,
              muscle_group: dbEx.muscle_group || 'Legs',
              sets_count: sets,
              reps_range: reps,
              notes: notes,
              pattern_type: pattern // Guardar para lógica de superseries
            });
          }
        }
      }
    });

    // 3. ESTRUCTURACIÓN DE SUPERSERIES (SUPERSETS) ANTAGONISTAS REALES
    // Si elegimos especialización de Antagonistas (Pecho/Espalda o Bíceps/Tríceps),
    // emparejamos los ejercicios alternados de ambos grupos musculares para formar superseries.
    if (isAntagonistFocus) {
      const groupA = [];
      const groupB = [];
      const otherExercises = [];

      // Separar los ejercicios
      dayExercises.forEach(ex => {
        if (ex.muscle_group === focusMuscles[0]) groupA.push(ex);
        else if (ex.muscle_group === focusMuscles[1]) groupB.push(ex);
        else otherExercises.push(ex);
      });

      const superSets = [];
      const maxLength = Math.max(groupA.length, groupB.length);

      // Agruparlos en parejas alternadas con notas de Superserie
      for (let i = 0; i < maxLength; i++) {
        const exA = groupA[i];
        const exB = groupB[i];

        if (exA && exB) {
          exA.notes = `⚡ [SUPERSERIE - BLOQUE ${i + 1}] Realizar inmediatamente antes de cambiar a ${exB.name}.`;
          exB.notes = `⚡ [SUPERSERIE - BLOQUE ${i + 1}] Completar sin descanso luego de terminar ${exA.name}.`;
          superSets.push(exA);
          superSets.push(exB);
        } else {
          if (exA) superSets.push(exA);
          if (exB) superSets.push(exB);
        }
      }

      // Juntar todo de nuevo (primero las superseries de alta intensidad, luego los accesorios)
      dayExercises = [...superSets, ...otherExercises];
    } else {
      // Si no es antagonista, reordenar los ejercicios del día de forma regular:
      // Si hay ejercicios de un grupo prioritario (focusMuscles), los colocamos al inicio de la sesión.
      dayExercises.sort((a, b) => {
        const aPrio = focusMuscles.includes(a.muscle_group) ? 1 : 0;
        const bPrio = focusMuscles.includes(b.muscle_group) ? 1 : 0;
        return bPrio - aPrio;
      });
    }

    generatedDays.push({
      name: day.name,
      exercises: dayExercises
    });
  });

  const getGoalName = () => {
    if (goal === 'Strength') return 'Fuerza Élite';
    if (goal === 'Hypertrophy') return 'Hipertrofia Estética';
    return 'Resistencia & Definición';
  };

  return {
    name: `IA: ${structure.name} (${getGoalName()})`,
    description: `Programa personalizado de nivel ${
      level === 'Beginner' ? 'Novato' : level === 'Intermediate' ? 'Intermedio' : 'Avanzado'
    }. Foco muscular prioritario: ${
      focusMuscles.length > 0 ? focusMuscles.map(m => getMuscleSpanish(m)).join(', ') : 'Desarrollo Equilibrado'
    }.`,
    days: generatedDays
  };
};
