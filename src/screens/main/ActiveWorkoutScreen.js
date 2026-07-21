import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, Modal, Image, Linking } from 'react-native';
import { Check, X, RotateCcw, Target, Trophy, Clock, Sparkles, Plus, Dumbbell, AlertCircle, Info, ChevronRight, Play, HelpCircle, Zap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStore from '../../store/useStore';
import { calculate1RM } from '../../lib/rankingSystem';
import { evaluateLiveSet, getMuscleRecoveryStates, getAdvancedSuggestion } from '../../services/CoachingService';
import { getEarnedAchievements } from '../../services/AchievementService';
import Animated, { FadeIn } from 'react-native-reanimated';
import { isBarbellExercise } from '../../services/PlateCalculatorService';
import PlateCalculatorModal from '../../components/PlateCalculatorModal';
import { THEMES } from '../../store/useStore';
import { normalizeMuscleGroup, translateMuscleGroup, SUB_TO_PRIMARY_MAPPING } from '../../constants/Muscles';

export default function ActiveWorkoutScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const currentWorkout = useStore(state => state.currentActiveWorkout);
  const setGlobalTimer = useStore(state => state.setGlobalTimer);
  const globalTimerSeconds = useStore(state => state.globalTimerSeconds);
  const saveWorkoutEntry = useStore(state => state.saveWorkoutEntry);
  const updateWorkout = useStore(state => state.updateWorkout);
  const workouts = useStore(state => state.workouts);
  const userProfile = useStore(state => state.userProfile);
  const exercises_db = useStore(state => state.exercises);
  const clearCurrentActiveWorkout = useStore(state => state.clearCurrentActiveWorkout);

  const isEditing = !!currentWorkout?.isEditing;
  const editingWorkoutId = currentWorkout?.id;

  const [exercises, setExercises] = useState(currentWorkout?.exercises || []);
  const [workoutName, setWorkoutName] = useState(currentWorkout?.name || 'Entrenamiento');
  const [date] = useState(currentWorkout?.date || new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [showSelector, setShowSelector] = useState(false);
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0);
  const [liveAlerts, setLiveAlerts] = useState({});
  const [showStatusHelp, setShowStatusHelp] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(null);
  
  // Estados para la Calculadora de Discos Contextual
  const [showPlateCalc, setShowPlateCalc] = useState(false);
  const [plateWeight, setPlateWeight] = useState(0);
  const [plateExName, setPlateExName] = useState('');
  const [theme] = useState(useStore(state => state.theme));
  const colors = THEMES[theme] || THEMES.midnight;
  const [focusedField, setFocusedField] = useState(null);

  const MUSCLE_IMAGES = {
    'Chest': require('../../../assets/chest_bg.png'),
    'Back': require('../../../assets/back_bg.png'),
    'Legs': require('../../../assets/legs_bg.png'),
    'Arms': require('../../../assets/arms_bg.png'),
    'Shoulders': require('../../../assets/shoulders_bg.png'),
    'Core': require('../../../assets/core_bg.png'),
  };

  const filteredExercises = exercises_db.filter(ex => 
    ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ex.muscle_group?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (!currentWorkout) {
      navigation.replace('MainTabs');
    }
  }, [currentWorkout]);

  // Sincroniza el progreso local de vuelta al store (y por lo tanto a AsyncStorage)
  // para no perder series ingresadas si la app se cierra a mitad de sesión.
  useEffect(() => {
    if (currentWorkout) {
      useStore.getState().setCurrentActiveWorkout({ ...currentWorkout, exercises, name: workoutName });
    }
  }, [exercises, workoutName]);

  const updateSet = (exIdx, setIdx, field, value) => {
    const newExs = [...exercises];
    newExs[exIdx].sets[setIdx][field] = field === 'type' ? value : parseFloat(value) || 0;
    setExercises(newExs);
  };

  const addSet = (exIdx) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newExs = [...exercises];
    const lastSet = newExs[exIdx].sets[newExs[exIdx].sets.length - 1];
    newExs[exIdx].sets.push({ 
      weight: lastSet?.weight || 0, 
      reps: lastSet?.reps || 0, 
      rpe: lastSet?.rpe || 8, 
      type: 'Normal', 
      isCompleted: false 
    });
    setExercises(newExs);
  };

  const toggleSetComplete = (exIdx, setIdx) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newExs = [...exercises];
    const set = newExs[exIdx].sets[setIdx];
    const ex = newExs[exIdx];
    
    set.isCompleted = !set.isCompleted;
    setExercises(newExs);

    if (set.isCompleted) {
      let baseTime = 90;
      const normalizedMg = normalizeMuscleGroup(ex.muscle_group);
      if (['Legs', 'Back', 'Chest'].includes(normalizedMg)) {
        baseTime = 120;
      } else {
        baseTime = 60;
      }
      setGlobalTimer(baseTime);

      // Feedback de Coaching
      const lastSession = workouts
        .filter(w => w.workout_entries?.some(e => e.exercise_id === ex.exercise_id))
        .sort((a, b) => new Date(b.workout_date) - new Date(a.workout_date))[0];
      
      const lastBestSet = lastSession?.workout_entries
        ?.filter(e => e.exercise_id === ex.exercise_id)
        ?.sort((a, b) => (b.weight * b.reps) - (a.weight * a.reps))[0];

      const feedback = evaluateLiveSet(set.weight, set.reps, set.rpe, set.type);
      if (feedback) {
        const alertKey = `${exIdx}_${setIdx}`;
        setLiveAlerts(prev => ({ ...prev, [alertKey]: feedback }));
      }
    }
  };

  const handleSelectExercise = (ex) => {
    const newEx = {
      id: Date.now(),
      exercise_id: ex.id,
      name: ex.name,
      muscle_group: ex.muscle_group || 'Arms',
      sets: [{ weight: 0, reps: 0, rpe: 8, type: 'Normal', isCompleted: false }]
    };
    setExercises([...exercises, newEx]);
    setShowSelector(false);
    setCurrentExerciseIdx(exercises.length);
  };

  const cancelWorkout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Cancelar Entrenamiento",
      "¿Estás seguro de que deseas cancelar la sesión activa? Todo el progreso actual se perderá.",
      [
        { text: "No", style: "cancel" },
        { 
          text: "Sí, Cancelar", 
          style: "destructive", 
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            clearCurrentActiveWorkout();
            setGlobalTimer(null);
            navigation.replace('MainTabs');
          }
        }
      ]
    );
  };

  const finishWorkout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (exercises.length === 0) {
      useStore.getState().clearCurrentActiveWorkout();
      navigation.replace('MainTabs');
      return;
    }

    Alert.alert(
      isEditing ? "Actualizar Entrenamiento" : "Finalizar Entrenamiento",
      isEditing ? "¿Deseas guardar los cambios de esta sesión?" : "¿Deseas guardar los cambios y terminar la sesión?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Guardar",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setIsSaving(true);
            const flatEntries = [];
            exercises.forEach(ex => {
              ex.sets.forEach(s => {
                if (s.isCompleted) {
                  flatEntries.push({
                    exercise_id: ex.exercise_id,
                    weight: s.weight,
                    reps: s.reps,
                    rpe: s.rpe,
                    set_type: s.type
                  });
                }
              });
            });

            try {
              if (isEditing) {
                await updateWorkout(editingWorkoutId, date, workoutName, flatEntries);
                useStore.getState().clearCurrentActiveWorkout();
                useStore.getState().setGlobalTimer(null);
                setIsSaving(false);
                Alert.alert("Guardado", "Entrenamiento actualizado correctamente.");
                navigation.replace('MainTabs');
                return;
              }

              // Calcular logros previos ANTES de guardar las nuevas entries
              const prevEarned = getEarnedAchievements(workouts);
              const prevEarnedIds = prevEarned.map(a => a.id);

              const savedWorkoutId = await saveWorkoutEntry(date, workoutName, flatEntries);
              useStore.getState().clearCurrentActiveWorkout();
              useStore.getState().setGlobalTimer(null);
              setIsSaving(false);

              // PR Detection simple
              const prDetected = flatEntries.some(entry => {
                const exId = entry.exercise_id;
                const lastBest = workouts
                  .filter(w => !w.name?.endsWith(String.fromCharCode(0x200B)))
                  .flatMap(w => w.workout_entries || [])
                  .filter(e => e.exercise_id === exId)
                  .sort((a, b) => (b.weight * b.reps) - (a.weight * a.reps))[0];
                return !lastBest || (entry.weight * entry.reps > lastBest.weight * lastBest.reps);
              });

              navigation.replace('WorkoutSummary', {
                workoutId: savedWorkoutId,
                workoutName,
                date,
                flatEntries,
                exercises,
                prDetected: prDetected,
                prevEarnedIds
              });
            } catch (error) {
              console.error("Error saving workout:", error);
              setIsSaving(false);
              Alert.alert("Error", "No se pudo guardar el entrenamiento. Inténtalo de nuevo.");
            }
          }
        }
      ]
    );
  };

  const currentEx = exercises[currentExerciseIdx];

  return (
    <View className="flex-1" style={{ paddingTop: insets.top, backgroundColor: colors.bg }}>
      {/* Header */}
      <View className="px-5 py-4 border-b flex-row justify-between items-center" style={{ borderColor: colors.border, backgroundColor: colors.card + '80' }}>
        <View className="flex-1 mr-4">
          <Text style={{ color: colors.accent }} className="text-[10px] font-bold uppercase tracking-widest">{isEditing ? 'Editando Sesión' : 'Sesión Activa'}</Text>
          <Text className="text-white text-lg font-bold" numberOfLines={1}>{workoutName}</Text>
        </View>
        <View className="flex-row items-center gap-x-2">
          <TouchableOpacity
            onPress={cancelWorkout}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl border"
            style={{ borderColor: colors.border, backgroundColor: colors.card }}
          >
            <Text className="text-slate-400 font-bold text-xs">Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={finishWorkout}
            disabled={isSaving}
            className="bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl"
          >
            <Text className="text-red-400 font-bold text-xs">Finalizar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Exercise Navigation */}
      <View className="border-b" style={{ borderColor: colors.border, backgroundColor: colors.bg }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-5 py-3">
          {exercises.map((ex, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => setCurrentExerciseIdx(idx)}
              className="mr-2 px-4 py-2 rounded-xl"
              style={{ backgroundColor: currentExerciseIdx === idx ? colors.accent : colors.card }}
            >
              <Text className="font-bold text-xs" style={{ color: currentExerciseIdx === idx ? colors.accentText : '#94a3b8' }}>
                {ex.name}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={() => setShowSelector(true)}
            className="p-2 rounded-xl border border-dashed"
            style={{ backgroundColor: colors.accent + '1A', borderColor: colors.accent + '4D' }}
          >
            <Plus size={18} color={colors.accent} />
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Main Content */}
      <ScrollView className="flex-1 px-5 pt-6">
        {!currentEx ? (
          <View className="flex-1 items-center justify-center pt-20">
            <Dumbbell size={64} color="#64748b" style={{ opacity: 0.2 }} />
            <Text className="text-slate-500 mt-4">Aún no hay ejercicios.</Text>
            <TouchableOpacity
              onPress={() => setShowSelector(true)}
              className="mt-6 px-6 py-3 rounded-2xl"
              style={{ backgroundColor: colors.accent }}
            >
              <Text style={{ color: colors.accentText }} className="font-bold">+ Añadir Ejercicio</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <View className="flex-row justify-between items-start mb-6">
              <View className="flex-1 pr-4">
                <View className="flex-row items-center gap-x-2 flex-wrap">
                  <Text className="text-white text-3xl font-extrabold">{currentEx.name}</Text>
                  <TouchableOpacity onPress={() => setShowHelpModal(currentEx)} className="p-1">
                    <HelpCircle size={20} color="#475569" />
                  </TouchableOpacity>
                </View>
                <Text className="text-slate-500 font-medium text-sm mt-1">{currentEx.muscle_group}</Text>
              </View>
              {globalTimerSeconds !== null && (
                <View className="bg-purple-600 px-4 py-2 rounded-2xl flex-row items-center gap-x-2 shadow-lg shadow-purple-600/30">
                  <Clock size={16} color="white" />
                  <Text className="text-white font-bold">
                    {Math.floor(globalTimerSeconds / 60)}:{String(globalTimerSeconds % 60).padStart(2, '0')}
                  </Text>
                </View>
              )}
            </View>

            {/* Coaching Alerts */}
            <View className="gap-y-3 mb-6">
               {(() => {
                 const recoveryStates = getMuscleRecoveryStates(workouts, userProfile);
                 const normalizedMg = normalizeMuscleGroup(currentEx.muscle_group);
                 const muscleState = recoveryStates[normalizedMg];
                 const isFatigued = muscleState && muscleState.percent < 30;
                 const suggestion = getAdvancedSuggestion(currentEx.exercise_id, workouts, exercises);
 
                 return (
                   <>
                     <View 
                       className="p-3 rounded-2xl border flex-row items-center gap-x-3"
                       style={{ 
                         backgroundColor: isFatigued ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.05)',
                         borderColor: isFatigued ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.1)'
                       }}
                     >
                       <Zap size={18} color={muscleState?.color || '#64748b'} />
                       <Text 
                         className="text-xs flex-1"
                         style={{ color: muscleState?.color || '#64748b' }}
                       >
                         Recuperación {translateMuscleGroup(currentEx.muscle_group)}: <Text className="font-black">{muscleState?.percent || 100}%</Text>
                         {isFatigued ? ' ⚠️ Cuidado con la intensidad.' : ' ✅ Óptimo para entrenar.'}
                       </Text>
                     </View>
                    {suggestion && (
                      <View
                        className="p-3 rounded-2xl border flex-row items-center gap-x-3"
                        style={{ backgroundColor: colors.accent + '0D', borderColor: colors.accent + '1A' }}
                      >
                        <Sparkles size={18} color={colors.accent} />
                        <Text className="text-slate-300 text-xs flex-1">{suggestion.text} 🔥</Text>
                      </View>
                    )}
                  </>
                );
              })()}
            </View>

            {/* Sets Table Header */}
            <View className="flex-row items-center mb-3 px-2">
              <Text className="w-10 text-center text-[10px] text-slate-500 font-bold uppercase">Set</Text>
              <Text className="flex-1 text-center text-[10px] text-slate-500 font-bold uppercase">Kg</Text>
              <Text className="flex-1 text-center text-[10px] text-slate-500 font-bold uppercase">Reps</Text>
              <Text className="flex-1 text-center text-[10px] text-slate-500 font-bold uppercase">RPE</Text>
              <TouchableOpacity
                onPress={() => setShowStatusHelp(!showStatusHelp)}
                className="w-12 items-center"
              >
                <HelpCircle size={14} color={showStatusHelp ? colors.accent : "#64748b"} />
              </TouchableOpacity>
            </View>

            {showStatusHelp && (
              <Animated.View entering={FadeIn} className="p-4 rounded-2xl border mb-6" style={{ backgroundColor: colors.accent + '0D', borderColor: colors.accent + '33' }}>
                <View className="flex-row gap-x-2 mb-2">
                  <Text className="text-emerald-500 font-bold text-xs">✅ Verde:</Text>
                  <Text className="text-slate-400 text-xs flex-1">Serie completada. Se guardó y el cronómetro empezó.</Text>
                </View>
                <View className="flex-row gap-x-2">
                  <Text className="text-slate-500 font-bold text-xs">🔘 Gris:</Text>
                  <Text className="text-slate-400 text-xs flex-1">Pendiente. Toca el check al terminar la serie.</Text>
                </View>
              </Animated.View>
            )}

            {/* Sets List */}
            <View className="gap-y-3">
              {currentEx.sets.map((set, setIdx) => (
                <View key={setIdx}>
                  <View
                    className={`flex-row items-center p-3 rounded-2xl border ${set.isCompleted ? 'bg-emerald-500/5 border-emerald-500/20' : ''}`}
                    style={set.isCompleted ? { opacity: 0.7 } : { backgroundColor: colors.card, borderColor: colors.border }}
                  >
                    <Text className="w-10 text-center font-bold text-slate-500">{setIdx + 1}</Text>
                    <View className="flex-1 relative mx-1">
                      <TextInput
                        keyboardType="numeric"
                        value={set.weight ? String(set.weight) : ''}
                        onChangeText={(val) => updateSet(currentExerciseIdx, setIdx, 'weight', val)}
                        placeholder="0"
                        placeholderTextColor="#334155"
                        onFocus={() => setFocusedField(`${setIdx}_weight`)}
                        onBlur={() => setFocusedField(null)}
                        className="w-full text-white text-center font-bold h-12 rounded-xl pr-8 border"
                        style={
                          focusedField === `${setIdx}_weight`
                            ? { borderColor: colors.accent, backgroundColor: colors.accent + '26' }
                            : { borderColor: colors.border, backgroundColor: colors.bg }
                        }
                      />
                      {isBarbellExercise(currentEx.name || currentEx.exercises?.name) && (
                        <TouchableOpacity
                          onPress={() => {
                            setPlateWeight(set.weight || 0);
                            setPlateExName(currentEx.name || currentEx.exercises?.name);
                            setShowPlateCalc(true);
                          }}
                          className="absolute right-2 top-2 w-8 h-8 rounded-lg items-center justify-center border"
                          style={{ backgroundColor: colors.accent + '1A', borderColor: colors.accent + '33' }}
                        >
                          <Dumbbell size={12} color={colors.accent} />
                        </TouchableOpacity>
                      )}
                    </View>
                    <TextInput
                      keyboardType="numeric"
                      value={set.reps ? String(set.reps) : ''}
                      onChangeText={(val) => updateSet(currentExerciseIdx, setIdx, 'reps', val)}
                      placeholder="0"
                      placeholderTextColor="#334155"
                      onFocus={() => setFocusedField(`${setIdx}_reps`)}
                      onBlur={() => setFocusedField(null)}
                      className="flex-1 text-white text-center font-bold h-12 rounded-xl mx-1 border"
                      style={
                        focusedField === `${setIdx}_reps`
                          ? { borderColor: colors.accent, backgroundColor: colors.accent + '26' }
                          : { borderColor: colors.border, backgroundColor: colors.bg }
                      }
                    />
                    <TextInput
                      keyboardType="numeric"
                      value={set.rpe ? String(set.rpe) : ''}
                      onChangeText={(val) => updateSet(currentExerciseIdx, setIdx, 'rpe', val)}
                      placeholder="8"
                      placeholderTextColor="#334155"
                      onFocus={() => setFocusedField(`${setIdx}_rpe`)}
                      onBlur={() => setFocusedField(null)}
                      className="flex-1 text-white text-center font-bold h-12 rounded-xl mx-1 border"
                      style={
                        focusedField === `${setIdx}_rpe`
                          ? { borderColor: colors.accent, backgroundColor: colors.accent + '26' }
                          : { borderColor: colors.border, backgroundColor: colors.bg }
                      }
                    />
                    <TouchableOpacity
                      onPress={() => toggleSetComplete(currentExerciseIdx, setIdx)}
                      className={`w-10 h-10 rounded-xl items-center justify-center ${set.isCompleted ? 'bg-emerald-500' : 'bg-slate-800'}`}
                    >
                      <Check size={20} color={set.isCompleted ? '#020617' : '#64748b'} />
                    </TouchableOpacity>
                  </View>

                  {liveAlerts[`${currentExerciseIdx}_${setIdx}`] && (
                    <View className="border-x border-b rounded-b-2xl p-2 mx-1 mt-[-4px] flex-row items-center gap-x-2" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                      {liveAlerts[`${currentExerciseIdx}_${setIdx}`].type === 'increase' ? (
                        <Trophy size={14} color="#10b981" />
                      ) : liveAlerts[`${currentExerciseIdx}_${setIdx}`].type === 'decrease' ? (
                        <AlertCircle size={14} color="#ef4444" />
                      ) : (
                        <Info size={14} color="#fbbf24" />
                      )}
                      <Text 
                        className="text-[10px] flex-1"
                        style={{ color: liveAlerts[`${currentExerciseIdx}_${setIdx}`].color || '#64748b' }}
                      >
                        {liveAlerts[`${currentExerciseIdx}_${setIdx}`].text}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => addSet(currentExerciseIdx)}
              className="mt-6 p-4 rounded-2xl border border-dashed flex-row justify-center items-center gap-x-2"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <Plus size={18} color="#64748b" />
              <Text className="text-slate-400 font-bold">Añadir Serie</Text>
            </TouchableOpacity>
          </View>
        )}
        <View className="h-20" />
      </ScrollView>

      {/* Footer Navigation */}
      {exercises.length > 1 && (
        <View className="px-5 py-6 border-t flex-row justify-between items-center" style={{ backgroundColor: colors.bg, borderColor: colors.border, paddingBottom: insets.bottom + 10 }}>
          <TouchableOpacity
            onPress={() => setCurrentExerciseIdx(prev => Math.max(0, prev - 1))}
            disabled={currentExerciseIdx === 0}
            className="flex-row items-center gap-x-1"
          >
            <ChevronRight size={20} color={currentExerciseIdx === 0 ? 'transparent' : '#64748b'} style={{ transform: [{ rotate: '180deg' }] }} />
            <Text className={`font-bold ${currentExerciseIdx === 0 ? 'text-transparent' : 'text-slate-400'}`}>Anterior</Text>
          </TouchableOpacity>
          <Text className="text-slate-500 text-xs font-bold">{currentExerciseIdx + 1} de {exercises.length}</Text>
          <TouchableOpacity
            onPress={() => setCurrentExerciseIdx(prev => Math.min(exercises.length - 1, prev + 1))}
            disabled={currentExerciseIdx === exercises.length - 1}
            className="flex-row items-center gap-x-1"
          >
            <Text className="font-bold" style={{ color: currentExerciseIdx === exercises.length - 1 ? 'transparent' : colors.accent }}>Siguiente</Text>
            <ChevronRight size={20} color={currentExerciseIdx === exercises.length - 1 ? 'transparent' : colors.accent} />
          </TouchableOpacity>
        </View>
      )}

      {/* Exercise Selector Modal */}
      <Modal visible={showSelector} animationType="slide" transparent>
        <View className="flex-1" style={{ paddingTop: insets.top, backgroundColor: colors.bg }}>
          <View className="px-5 py-4 border-b flex-row justify-between items-center" style={{ borderColor: colors.border, backgroundColor: colors.bg }}>
            <View>
              <Text className="text-white text-2xl font-black">Elige tu Arma</Text>
              <Text className="text-slate-500 text-xs">Selecciona para añadir a la rutina</Text>
            </View>
            <TouchableOpacity onPress={() => setShowSelector(false)} className="p-2 rounded-full" style={{ backgroundColor: colors.card }}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View className="px-5 py-4">
             <View className="rounded-2xl px-4 flex-row items-center border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
               <TextInput
                 value={searchTerm}
                 onChangeText={setSearchTerm}
                 placeholder="Buscar ejercicio..."
                 placeholderTextColor="#64748b"
                 className="flex-1 h-12 text-white font-medium"
               />
             </View>
          </View>

          <ScrollView className="flex-1 px-5">
            <View className="flex-row flex-wrap justify-between">
              {filteredExercises.map(ex => (
                <TouchableOpacity
                  key={ex.id}
                  onPress={() => {
                    handleSelectExercise(ex);
                    setSearchTerm('');
                  }}
                  className="w-[48%] h-32 rounded-2xl border mb-4 overflow-hidden relative"
                  style={{ backgroundColor: colors.card, borderColor: colors.border }}
                >
                   <Image
                     source={MUSCLE_IMAGES[SUB_TO_PRIMARY_MAPPING[normalizeMuscleGroup(ex.muscle_group)]] || { uri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200&auto=format&fit=crop' }}
                     className="absolute inset-0 w-full h-full opacity-40"
                     resizeMode="cover"
                   />
                   <View className="absolute inset-0" style={{ backgroundColor: colors.bg + '66' }} />

                   <View className="p-3 justify-between h-full">
                     <View className="self-start px-2 py-0.5 rounded-md shadow-sm" style={{ backgroundColor: colors.accent }}>
                       <Text style={{ color: colors.accentText }} className="text-[8px] font-black uppercase tracking-tighter">{translateMuscleGroup(ex.muscle_group)}</Text>
                     </View>
                    <View>
                      <Text className="text-white font-bold text-sm leading-tight">{ex.name}</Text>
                      <View className="self-end p-1 rounded-full mt-1" style={{ backgroundColor: colors.accent + '33' }}>
                        <Plus size={12} color={colors.accent} />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <View className="h-10" />
          </ScrollView>
        </View>
      </Modal>

      {/* Exercise Help Modal */}
      <Modal visible={!!showHelpModal} transparent animationType="fade">
        <View className="flex-1 bg-black/80 items-center justify-center p-6">
           <View className="border p-8 rounded-[40px] w-full items-center" style={{ backgroundColor: colors.card, borderColor: colors.accent + '4D' }}>
              <View className="w-20 h-20 rounded-full items-center justify-center mb-6" style={{ backgroundColor: colors.accent + '33' }}>
                 <Dumbbell size={40} color={colors.accent} />
              </View>
              <Text className="text-white text-2xl font-black text-center mb-2">{showHelpModal?.name}</Text>
               <Text style={{ color: colors.accent }} className="font-bold uppercase tracking-widest text-[10px] mb-6">{translateMuscleGroup(showHelpModal?.muscle_group)}</Text>

               <Text className="text-slate-400 text-center text-sm leading-6 mb-8">
                 Este ejercicio se enfoca en la hipertrofia de {translateMuscleGroup(showHelpModal?.muscle_group).toLowerCase()}.
                 Mantén una técnica controlada y un rango de movimiento completo para máximos resultados.
               </Text>

              <TouchableOpacity
                onPress={() => Linking.openURL(`https://www.youtube.com/results?search_query=como+hacer+${showHelpModal?.name}`)}
                className="w-full py-4 rounded-2xl flex-row items-center justify-center gap-x-3 mb-3 shadow-lg"
                style={{ backgroundColor: colors.accent }}
              >
                <Play size={20} color={colors.accentText} strokeWidth={3} />
                <Text style={{ color: colors.accentText }} className="font-black uppercase tracking-widest">Ver Ejecución</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setShowHelpModal(null)} className="w-full py-4 border rounded-2xl items-center" style={{ borderColor: colors.border }}>
                <Text className="text-slate-500 font-bold">Cerrar</Text>
              </TouchableOpacity>
           </View>
        </View>
      </Modal>

      <PlateCalculatorModal
        visible={showPlateCalc}
        onClose={() => setShowPlateCalc(false)}
        totalWeight={plateWeight}
        exerciseName={plateExName}
        colors={colors}
      />
    </View>
  );
}
