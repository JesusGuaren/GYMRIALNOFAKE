import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Bot, MessageSquare } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import MuscleHeatmapNative from './MuscleHeatmapNative';
import { getMuscleRecoveryStates } from '../services/CoachingService';
import { 
  normalizeMuscleGroup, 
  translateMuscleGroup, 
  getSubMusclesForGroup,
  SUB_TO_PRIMARY_MAPPING 
} from '../constants/Muscles';

const getContextualAdvice = (muscle, status, weeklySets, progressMemory = null) => {
  const espName = translateMuscleGroup(muscle);

  if (status === 'Sobreentrenado') {
    return `${espName} sobrecargado (${weeklySets} series). Evita empujes/tirones pesados hoy. Foco en recuperación.`;
  }
  if (status === 'Fatigado') {
    return `${espName} fatigado. Hoy dale descanso activo. Prioriza otros grupos.`;
  }
  if (status === 'Recuperación parcial') {
    if (progressMemory) {
      return `${espName} en recuperación parcial. Último: ${progressMemory.exerciseName} ${progressMemory.weight}kg x${progressMemory.reps}. Entrena ligero.`;
    }
    return `${espName} recuperándose. Entrena hoy con intensidad moderada (RPE 7-8).`;
  }

  if (progressMemory) {
    const suggestedWeight = progressMemory.weight + (progressMemory.reps >= 8 ? 2.5 : 0);
    if (progressMemory.reps >= 8) {
      return `${espName} recuperado. Último: ${progressMemory.weight}kg x${progressMemory.reps}. Hoy estás listo para progresar a ${suggestedWeight}kg.`;
    } else {
      return `${espName} recuperado. Último: ${progressMemory.weight}kg x${progressMemory.reps}. Hoy busca más reps con ${progressMemory.weight}kg.`;
    }
  }
  return `${espName} al 100% y listo para entrenar. ¡A por un nuevo récord!`;
};

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

export const InteractiveBodySection = React.memo(function InteractiveBodySection({ 
  workouts, 
  colors, 
  navigation, 
  todayWorkout, 
  activeProgram, 
  programs,
  recommendedRoutine,
  selectedMuscle,
  setSelectedMuscle
}) {
  console.log(`[Render Debug] InteractiveBodySection rendering... selectedMuscle: ${selectedMuscle}`);

  const handleSelectMuscle = (muscle) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMuscle(prev => prev === muscle ? null : muscle);
  };

  // PROACTIVE COACH ADVICE GENERATOR
  const proactiveCoachAdvice = useMemo(() => {
    if (workouts.length === 0) {
      return "onboarding"; // handled specifically in UI
    }

    // 1. Completed today check
    if (todayWorkout) {
      const todayMuscles = new Set();
      todayWorkout.workout_entries?.forEach(e => {
        const mg = e.exercises?.muscle_group;
        if (mg) {
          todayMuscles.add(translateMuscleGroup(mg));
        }
      });
      const mList = Array.from(todayMuscles).join(', ');
      return `Sesión de ${mList || 'fuerza'} completada hoy. Fibras en reconstrucción. Descansa y recupera.`;
    }

    // 2. Neglected muscles (> 7 days)
    const activeWorkouts = workouts.filter(w => !w.name?.endsWith('\u200B'));
    const muscleLastTrained = {};
    activeWorkouts.slice(0, 15).forEach(w => {
      const workoutDate = new Date(w.workout_date);
      w.workout_entries?.forEach(e => {
        const muscle = e.exercises?.muscle_group;
        if (muscle) {
          const normMuscle = normalizeMuscleGroup(muscle);
          if (normMuscle !== 'UNKNOWN') {
            if (!muscleLastTrained[normMuscle] || workoutDate > muscleLastTrained[normMuscle]) {
              muscleLastTrained[normMuscle] = workoutDate;
            }
          }
        }
      });
    });

    const now = new Date();
    let neglectedMuscle = null;
    let neglectedDays = 0;
    
    for (const [m, lastDate] of Object.entries(muscleLastTrained)) {
      const diff = (now - lastDate) / (1000 * 60 * 60 * 24);
      if (diff > 7 && diff > neglectedDays) {
        neglectedMuscle = translateMuscleGroup(m);
        neglectedDays = Math.floor(diff);
      }
    }

    if (neglectedMuscle) {
      return `Llevas ${neglectedDays} días sin entrenar ${neglectedMuscle}. Hoy dale prioridad.`;
    }

    // 3. Desentrenamiento check (> 4 days inactive)
    if (activeWorkouts.length > 0) {
      const lastWorkout = activeWorkouts[0];
      const diffDays = Math.floor((now - new Date(lastWorkout.workout_date)) / (1000 * 60 * 60 * 24));
      if (diffDays > 4) {
        return `Llevas ${diffDays} días sin entrenar. Retoma hoy para mantener adaptaciones de fuerza.`;
      }
    }

    // 4. Monthly/Weekly Tonnage Progress check
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thisWeekWorkouts = activeWorkouts.filter(w => new Date(w.workout_date) >= oneWeekAgo);
    const lastWeekWorkouts = activeWorkouts.filter(w => new Date(w.workout_date) >= twoWeeksAgo && new Date(w.workout_date) < oneWeekAgo);
    const getVol = (list) => list.reduce((acc, w) => acc + (w.workout_entries?.reduce((a, e) => a + (e.weight * e.reps), 0) || 0), 0);
    const vol1 = getVol(thisWeekWorkouts);
    const vol2 = getVol(lastWeekWorkouts);
    if (vol2 > 0 && vol1 > 0) {
      const diff = Math.round(((vol1 - vol2) / vol2) * 100);
      if (diff > 0) {
        return `Volumen semanal arriba un ${diff}%. Gran progresión de tonelaje.`;
      }
    }

    // 5. Recommended routine suggestion
    if (recommendedRoutine) {
      return `Toca hoy: "${recommendedRoutine.name}". Listo para entrenar.`;
    }

    return "Cuerpo listo para entrenar. Toca un músculo en el BodyMap para ver su fatiga.";
  }, [workouts, todayWorkout, recommendedRoutine]);

  const selectedMuscleData = useMemo(() => {
    if (!selectedMuscle) return null;
    
    const espName = translateMuscleGroup(selectedMuscle);

    // Obtener recuperación agregada
    const percent = getGroupRecovery(selectedMuscle, workouts);

    // Estado fisiológico
    let physState = 'Listo';
    let physColor = '#10b981'; // Verde
    if (percent < 50) {
      physState = 'Fatigado';
      physColor = '#ef4444'; // Rojo
    } else if (percent < 100) {
      physState = 'Recuperación parcial';
      physColor = '#fb923c'; // Ámbar
    }

    // Calcular sets semanales
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
          if (normalizedMg !== 'UNKNOWN' && SUB_TO_PRIMARY_MAPPING[normalizedMg] === selectedMuscle) {
            weeklySets += 1;
          }
        });
      }
    });

    if (weeklySets > 20) {
      physState = 'Sobreentrenado';
      physColor = '#ef4444';
    }

    // Último entrenamiento específico
    let lastWorkoutInfo = 'Sin registros';
    let progressMemory = null;
    const activeWorkouts = workouts.filter(w => !w.name?.endsWith('\u200B'));
    
    let foundWorkout = null;
    let foundEntry = null;
    for (const w of activeWorkouts) {
      const entry = w.workout_entries?.find(e => {
        const mg = e.exercises?.muscle_group;
        if (!mg) return false;
        const normalizedMg = normalizeMuscleGroup(mg);
        return normalizedMg !== 'UNKNOWN' && SUB_TO_PRIMARY_MAPPING[normalizedMg] === selectedMuscle;
      });
      if (entry) {
        foundWorkout = w;
        foundEntry = entry;
        break;
      }
    }

    if (foundWorkout && foundEntry) {
      const dateLabel = new Date(foundWorkout.workout_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      lastWorkoutInfo = `${dateLabel} • ${foundEntry.exercises?.name || 'Ejerc.'} (${foundEntry.weight}kg x ${foundEntry.reps})`;
      
      progressMemory = {
        exerciseName: foundEntry.exercises?.name || 'ejercicio',
        weight: foundEntry.weight,
        reps: foundEntry.reps,
        date: dateLabel
      };
    }

    const coachAdvice = getContextualAdvice(selectedMuscle, physState, weeklySets, progressMemory);

    return {
      name: espName,
      physState,
      physColor,
      recoveryPercent: percent,
      lastWorkoutInfo,
      weeklySets,
      coachAdvice
    };
  }, [selectedMuscle, workouts]);

  return (
    <>
      <MuscleHeatmapNative 
        workouts={workouts} 
        colors={colors} 
        selectedMuscle={selectedMuscle}
        onSelectMuscle={handleSelectMuscle}
      />

      {selectedMuscleData ? (
        <View 
          className="p-5 rounded-[24px] border mb-6"
          style={{ 
            backgroundColor: colors.card, 
            borderColor: colors.border,
            borderLeftWidth: 4,
            borderLeftColor: selectedMuscleData.physColor 
          }}
        >
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center gap-x-2">
              <View 
                className="w-7 h-7 rounded-lg items-center justify-center"
                style={{ backgroundColor: `${selectedMuscleData.physColor}15` }}
              >
                <Bot size={15} color={selectedMuscleData.physColor} />
              </View>
              <View>
                <Text className="text-white font-outfit-bold text-xs uppercase tracking-wider">{selectedMuscleData.name}</Text>
                <Text className="text-[8px] font-inter-semibold text-slate-500 uppercase tracking-widest">Fisiología muscular</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setSelectedMuscle(null)}>
              <Text style={{ color: colors.accent }} className="text-[9px] font-inter-bold uppercase tracking-wider">
                Cerrar
              </Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center justify-between mb-3 bg-slate-950/40 p-2.5 rounded-xl border border-slate-900">
            <View className="items-center flex-1">
              <Text className="text-[8px] font-inter-semibold text-slate-500 uppercase tracking-widest">Estado</Text>
              <Text style={{ color: selectedMuscleData.physColor }} className="text-[11px] font-outfit-bold uppercase mt-0.5">
                {selectedMuscleData.physState}
              </Text>
            </View>
            <View className="w-[1px] h-6 bg-slate-800/60" />
            <View className="items-center flex-1">
              <Text className="text-[8px] font-inter-semibold text-slate-500 uppercase tracking-widest">Recuperación</Text>
              <Text className="text-white font-outfit-bold text-[11px] mt-0.5">
                {selectedMuscleData.recoveryPercent}%
              </Text>
            </View>
            <View className="w-[1px] h-6 bg-slate-800/60" />
            <View className="items-center flex-1">
              <Text className="text-[8px] font-inter-semibold text-slate-500 uppercase tracking-widest">Sets Semanal</Text>
              <Text className="text-white font-outfit-bold text-[11px] mt-0.5">
                {selectedMuscleData.weeklySets}
              </Text>
            </View>
          </View>

          <Text className="text-slate-300 text-xs font-inter-medium leading-relaxed mb-4">
            {selectedMuscleData.coachAdvice}
          </Text>

          <View className="flex-row gap-x-3">
            <TouchableOpacity 
              onPress={() => navigation.navigate('Análisis')}
              className="flex-1 h-10 border rounded-xl items-center justify-center"
              style={{ backgroundColor: 'transparent', borderColor: colors.border }}
            >
              <Text style={{ color: colors.accent }} className="font-outfit-bold text-[10px] tracking-wider uppercase">
                Ver Análisis
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                navigation.navigate('Coach', { initialMuscle: selectedMuscle });
              }}
              className="flex-1 h-10 rounded-xl items-center justify-center"
              style={{ backgroundColor: colors.accent }}
            >
              <Text style={{ color: colors.accentText }} className="font-outfit-bold text-[10px] tracking-wider uppercase">
                Consultar Coach
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View 
          className="p-5 rounded-[24px] border mb-6 relative overflow-hidden"
          style={{ 
            backgroundColor: colors.card, 
            borderColor: colors.border,
            borderLeftWidth: 4,
            borderLeftColor: colors.accent 
          }}
        >
          {proactiveCoachAdvice === "onboarding" ? (
            <View className="gap-y-3">
              <View className="flex-row items-center gap-x-2.5 mb-1">
                <View 
                  className="w-7 h-7 rounded-lg items-center justify-center"
                  style={{ backgroundColor: `${colors.accent}15` }}
                >
                  <Bot size={15} color={colors.accent} />
                </View>
                <View>
                  <Text className="text-white font-outfit-bold text-xs uppercase tracking-wider">Elite Coach</Text>
                  <Text className="text-[8px] font-inter-semibold text-slate-500 uppercase tracking-widest">Guía de Inicio</Text>
                </View>
              </View>
              <View className="gap-y-2">
                <View className="flex-row items-start gap-x-2.5">
                  <Text className="text-slate-400 font-inter-medium text-xs leading-relaxed flex-1">
                    <Text className="text-white font-outfit-bold">1. Explora el BodyMap:</Text> Toca cualquier músculo para evaluar fatiga.
                  </Text>
                </View>
                <View className="flex-row items-start gap-x-2.5">
                  <Text className="text-slate-400 font-inter-medium text-xs leading-relaxed flex-1">
                    <Text className="text-white font-outfit-bold">2. Elige Rutina:</Text> Selecciona una del programa o inicia sesión libre.
                  </Text>
                </View>
                <View className="flex-row items-start gap-x-2.5">
                  <Text className="text-slate-400 font-inter-medium text-xs leading-relaxed flex-1">
                    <Text className="text-white font-outfit-bold">3. Registra Series:</Text> Al guardar con RPE medimos tu fatiga real.
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <>
              <View className="flex-row items-center gap-x-2.5 mb-3">
                <View 
                  className="w-7 h-7 rounded-lg items-center justify-center relative"
                  style={{ backgroundColor: `${colors.accent}15` }}
                >
                  <Bot size={15} color={colors.accent} />
                  <View 
                    className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-emerald-500 border border-slate-950"
                  />
                </View>
                <View>
                  <Text className="text-white font-outfit-bold text-xs uppercase tracking-wider">Elite Coach</Text>
                  <Text className="text-[8px] font-inter-semibold text-slate-500 uppercase tracking-widest">Consejo Contextual</Text>
                </View>
              </View>
              <Text className="text-slate-300 font-inter-medium text-xs leading-relaxed mb-3">
                {proactiveCoachAdvice}
              </Text>
            </>
          )}

          <TouchableOpacity 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation.navigate('Coach');
            }}
            className="flex-row items-center justify-center gap-x-2 mt-2 pt-3 border-t border-slate-800/40"
            style={{ borderTopColor: `${colors.border}15` }}
          >
            <MessageSquare size={12} color={colors.accent} />
            <Text style={{ color: colors.accent }} className="font-outfit-bold text-[10px] tracking-wider uppercase">
              Conversar con Elite Coach
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
});

export default InteractiveBodySection;
