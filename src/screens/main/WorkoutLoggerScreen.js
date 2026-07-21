import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, Modal, StyleSheet, Image, Linking } from 'react-native';
import { Plus, Check, X, RotateCcw, Target, Trophy, Clock, Sparkles, Save, BookOpen, Trash2, TrendingUp, ChevronUp, ChevronDown, Info, Link as LinkIcon, Dumbbell, AlertCircle, HelpCircle, Play, Settings2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStore, { THEMES } from '../../store/useStore';
import { calculate1RM, getRankByWeight } from '../../lib/rankingSystem';
import { getAdvancedSuggestion, getMuscleRecoveryStates, evaluateLiveSet } from '../../services/CoachingService';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { isBarbellExercise } from '../../services/PlateCalculatorService';
import PlateCalculatorModal from '../../components/PlateCalculatorModal';
import { normalizeMuscleGroup, translateMuscleGroup, SUB_TO_PRIMARY_MAPPING } from '../../constants/Muscles';
import ContextualTooltip from '../../components/common/ContextualTooltip';

const MUSCLE_IMAGES = {
  'Chest': require('../../../assets/chest_bg.png'),
  'Back': require('../../../assets/back_bg.png'),
  'Legs': require('../../../assets/legs_bg.png'),
  'Arms': require('../../../assets/arms_bg.png'),
  'Shoulders': require('../../../assets/shoulders_bg.png'),
  'Core': require('../../../assets/core_bg.png'),
};

export default function WorkoutLoggerScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { theme, workouts, routines, saveWorkoutEntry, saveRoutine, deleteRoutine, exercises: exercises_db, completedTutorials, markTutorialCompleted } = useStore();
  const colors = THEMES[theme] || THEMES.midnight;

  const [workoutName, setWorkoutName] = useState('Nueva Entrada');
  const [date] = useState(new Date().toISOString().split('T')[0]);
  const [exercises, setExercises] = useState([]);
  const [showSelector, setShowSelector] = useState(false);
  const [showAddActions, setShowAddActions] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showTypeHelp, setShowTypeHelp] = useState(false);
  const [liveAlerts, setLiveAlerts] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (route.params?.routineToLoad) {
      const routine = route.params.routineToLoad;
      const loaded = routine.routine_exercises?.map((re, idx) => ({
        id: Date.now() + idx + Math.random(),
        exercise_id: re.exercise_id,
        name: re.exercises?.name || re.name || '',
        muscle_group: normalizeMuscleGroup(re.exercises?.muscle_group || re.muscle_group),
        supersetId: re.superset_id || null,
        sets: Array.from({ length: re.default_sets || 3 }, () => ({
          weight: 0,
          reps: re.default_reps || 10,
          rpe: 8,
          type: 'Normal'
        }))
      })) || [];
      setExercises(loaded);
      setWorkoutName(routine.name);
      navigation.setParams({ routineToLoad: null });
    }
  }, [route.params?.routineToLoad]);

  // Estados para la Calculadora de Discos Contextual
  const [showPlateCalc, setShowPlateCalc] = useState(false);
  const [plateWeight, setPlateWeight] = useState(0);
  const [plateExName, setPlateExName] = useState('');

  const recoveryStates = useMemo(() => getMuscleRecoveryStates(workouts), [workouts]);

  const handleSelectExercise = (ex) => {
    setExercises([...exercises, {
      id: Date.now(),
      exercise_id: ex.id,
      name: ex.name,
      muscle_group: normalizeMuscleGroup(ex.muscle_group),
      sets: [{ weight: 0, reps: 0, rpe: 8, type: 'Normal' }]
    }]);
    setShowSelector(false);
    setSearchTerm('');
  };

  const handleCreateRoutineFromCurrent = () => {
    if (exercises.length === 0) return;
    Alert.prompt(
      "Guardar como Rutina",
      "Dale un nombre a esta rutina para usarla después:",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Guardar", 
          onPress: async (name) => {
            if (!name) return;
            await saveRoutine(name, "Rutina guardada desde bitácora", exercises);
            Alert.alert("Éxito", "Rutina guardada en 'Gestionar Rutinas'");
          }
        }
      ]
    );
  };

  const updateSet = (exIdx, setIdx, field, value) => {
    const newExs = [...exercises];
    newExs[exIdx].sets[setIdx][field] = field === 'type' ? value : parseFloat(value) || 0;
    setExercises(newExs);

    if (field === 'rpe' || field === 'weight' || field === 'reps') {
      const set = newExs[exIdx].sets[setIdx];
      const suggestion = evaluateLiveSet(set.weight, set.reps, set.rpe, set.type);
      const alertKey = `${exIdx}_${setIdx}`;
      if (suggestion) setLiveAlerts(prev => ({ ...prev, [alertKey]: suggestion }));
      else setLiveAlerts(prev => { const n = {...prev}; delete n[alertKey]; return n; });
    }
  };

  const toggleSetType = (exIdx, setIdx) => {
    const types = ['Normal', 'Warmup', 'DropSet', 'AMRAP'];
    const currentType = exercises[exIdx].sets[setIdx].type || 'Normal';
    const nextType = types[(types.indexOf(currentType) + 1) % types.length];
    updateSet(exIdx, setIdx, 'type', nextType);
  };

  const handleDiscard = () => {
    Alert.alert(
      "Descartar Sesión",
      "¿Deseas vaciar la bitácora y descartar este entrenamiento?",
      [
        { text: "No", style: "cancel" },
        { 
          text: "Sí, Descartar", 
          style: "destructive",
          onPress: () => {
            setExercises([]);
            setWorkoutName('Nueva Entrada');
            setLiveAlerts({});
          } 
        }
      ]
    );
  };

  const handleSaveWorkout = async () => {
    if (exercises.length === 0) return;
    setIsSaving(true);
    const flatEntries = exercises.flatMap(ex => ex.sets.map(s => ({
      exercise_id: ex.exercise_id, weight: s.weight, reps: s.reps, rpe: s.rpe, set_type: s.type, superset_id: ex.supersetId || null
    })));

    try {
      // Guardar con marcador invisible \u200B para identificarlo como bitácora y no alterar el heatmap
      await saveWorkoutEntry(date, workoutName + '\u200B', flatEntries);
      Alert.alert("Éxito", "Entrenamiento guardado.");
      setExercises([]);
      setWorkoutName('Nueva Entrada');
      setLiveAlerts({});
      navigation.goBack();
    } catch (e) {
      Alert.alert("Error", "No se pudo guardar.");
    } finally { setIsSaving(false); }
  };

  // handleLoadRoutine removed and replaced by deep link / parameter loader in useEffect

  const filteredExercises = exercises_db.filter(ex => 
    ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ex.muscle_group?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-5 py-4 border-b flex-row justify-between items-center" style={{ borderColor: colors.border }}>
        <View className="flex-1 mr-4">
          <TextInput
            value={workoutName}
            onChangeText={setWorkoutName}
            className="text-white text-2xl font-black"
            placeholder="Nombre de sesión"
            placeholderTextColor="#475569"
          />
          <Text className="text-slate-500 font-bold text-xs uppercase tracking-widest">{date}</Text>
        </View>
        <View className="flex-row items-center gap-x-2">
          {exercises.length > 0 && (
            <>
              <TouchableOpacity onPress={handleDiscard} className="w-10 h-10 rounded-full items-center justify-center border border-red-500/30 bg-red-500/10">
                <Trash2 color="#ef4444" size={20} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveWorkout} disabled={isSaving} className="w-10 h-10 rounded-full items-center justify-center shadow-lg" style={{ backgroundColor: colors.accent }}>
                <Check color={colors.accentText} size={20} strokeWidth={3} />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 rounded-full items-center justify-center border" style={{ borderColor: colors.border }}>
            <X color="#64748b" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" contentContainerStyle={{ paddingBottom: 100 }}>
        {exercises.length === 0 ? (
          <View className="items-center justify-center py-16">
            <View className="w-20 h-20 rounded-full items-center justify-center mb-6 border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
              <BookOpen size={36} color={colors.accent} />
            </View>
            <Text className="text-white text-xl font-bold text-center">Registra tu Entrenamiento</Text>
            <Text className="text-slate-400 text-center mt-2 px-8 text-sm leading-relaxed">
              Registra tus levantamientos diarios para que nuestro motor de coaching evalúe tu progreso. Puedes iniciar una sesión libre o cargar un split personalizado.
            </Text>
            <View className="flex-row gap-x-4 mt-8 w-full px-4">
              <TouchableOpacity
                onPress={() => navigation.navigate('RoutineManager')}
                className="flex-1 p-4 rounded-2xl flex-row items-center justify-center gap-x-2 border"
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
              >
                <Settings2 size={18} color="#94a3b8" />
                <Text className="text-slate-300 font-bold">Mis Rutinas</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowAddActions(true)}
                className="flex-1 p-4 rounded-2xl flex-row items-center justify-center gap-x-2 shadow-lg"
                style={{ backgroundColor: colors.accent }}
              >
                <Plus size={18} color={colors.accentText} />
                <Text style={{ color: colors.accentText }} className="font-bold">Iniciar Sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View className="gap-y-6">
            {exercises.map((ex, exIdx) => {
              const sessionMax = Math.max(0, ...ex.sets.map(s => calculate1RM(s.weight, s.reps)));
              const normalizedMg = normalizeMuscleGroup(ex.muscle_group);
              const currentRank = getRankByWeight(sessionMax, normalizedMg, ex.name);
              const muscleState = recoveryStates[normalizedMg];
              const isFatigued = muscleState && muscleState.percent < 40;
              const prevEx = exercises[exIdx - 1];
              const nextEx = exercises[exIdx + 1];
              const inSuperset = !!ex.supersetId && ((prevEx && prevEx.supersetId === ex.supersetId) || (nextEx && nextEx.supersetId === ex.supersetId));

              return (
                <View
                  key={ex.id}
                  className="rounded-3xl p-5 border"
                  style={{
                    backgroundColor: colors.card,
                    borderColor: inSuperset ? '#a855f766' : colors.border,
                    borderLeftWidth: inSuperset ? 3 : 1,
                    borderLeftColor: inSuperset ? '#a855f7' : colors.border
                  }}
                >
                  {inSuperset && (
                    <View className="flex-row items-center gap-x-1.5 mb-3 self-start px-2 py-1 rounded-lg bg-purple-500/10">
                      <LinkIcon size={10} color="#a855f7" />
                      <Text className="text-purple-400 text-[9px] font-black uppercase tracking-wider">Superserie</Text>
                    </View>
                  )}
                  <View className="flex-row justify-between items-start mb-4">
                    <View className="flex-1 pr-4">
                      <View className="flex-row items-center gap-x-2">
                        <Text className="text-white text-xl font-black">{ex.name}</Text>
                        <TouchableOpacity onPress={() => setShowHelpModal(ex)}>
                           <HelpCircle size={14} color="#475569" />
                        </TouchableOpacity>
                      </View>
                      <View className="flex-row items-center mt-1 gap-x-2">
                        <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{translateMuscleGroup(ex.muscle_group)}</Text>
                        <View className="w-1 h-1 rounded-full bg-slate-700" />
                        <Text style={{ color: currentRank.color }} className="text-[10px] font-bold uppercase tracking-widest">{currentRank.name}</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                      Alert.alert(
                        "Quitar Ejercicio",
                        `¿Deseas quitar "${ex.name}" de este entrenamiento? Se perderán las series registradas para este ejercicio.`,
                        [
                          { text: "Cancelar", style: "cancel" },
                          { 
                            text: "Sí, Quitar", 
                            style: "destructive", 
                            onPress: () => {
                              const n = [...exercises];
                              n.splice(exIdx, 1);
                              setExercises(n);
                            }
                          }
                        ]
                      );
                    }}>
                      <Trash2 size={18} color="#ef4444" opacity={0.6} />
                    </TouchableOpacity>
                  </View>

                  {isFatigued && (
                    <View className="bg-red-500/10 p-3 rounded-xl border border-red-500/20 mb-4 flex-row items-center gap-x-2">
                      <AlertCircle size={14} color="#f87171" />
                      <Text className="text-red-400 text-[10px] font-medium flex-1">Músculo fatigado ({muscleState.percent}%).</Text>
                    </View>
                  )}

                  <View className="flex-row items-center mb-2 px-2">
                    <TouchableOpacity onPress={() => setShowTypeHelp(true)} className="w-10 flex-row items-center justify-center gap-x-1">
                      <Text className="text-[9px] text-slate-500 font-bold">SET</Text>
                      <Info size={10} color="#475569" />
                    </TouchableOpacity>
                    <Text className="flex-1 text-center text-[9px] text-slate-500 font-bold">KG</Text>
                    <Text className="flex-1 text-center text-[9px] text-slate-500 font-bold">REPS</Text>
                    <Text className="flex-1 text-center text-[9px] text-slate-500 font-bold">RPE</Text>
                    <View className="w-10" />
                  </View>

                  {showTypeHelp && (
                    <Animated.View entering={FadeIn} exiting={FadeOut} className="p-4 rounded-2xl mb-4 border" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                      <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-white font-bold text-xs">Tipos de Serie</Text>
                        <TouchableOpacity onPress={() => setShowTypeHelp(false)}><X size={14} color="#64748b" /></TouchableOpacity>
                      </View>
                      <View className="gap-y-2">
                        {['Normal', 'Warmup', 'DropSet', 'AMRAP'].map(t => (
                          <View key={t} className="flex-row items-center gap-x-2">
                            <View className="w-4 h-4 rounded-full border border-slate-500 items-center justify-center">
                              <Text className="text-[8px] font-bold text-slate-500">{t[0]}</Text>
                            </View>
                            <Text className="text-slate-400 text-[10px]"><Text className="text-white font-bold">{t}:</Text> {t === 'Warmup' ? 'Calentamiento.' : t === 'DropSet' ? 'Sin descanso.' : t === 'AMRAP' ? 'Al fallo.' : 'Trabajo estándar.'}</Text>
                          </View>
                        ))}
                      </View>
                    </Animated.View>
                  )}

                  <View className="gap-y-2">
                    {ex.sets.map((set, setIdx) => {
                      const typeColors = { 'Normal': '#94a3b8', 'Warmup': '#fbbf24', 'DropSet': '#ef4444', 'AMRAP': '#a855f7' };
                      const typeLabels = { 'Normal': setIdx + 1, 'Warmup': 'W', 'DropSet': 'D', 'AMRAP': 'A' };
                      const alert = liveAlerts[`${exIdx}_${setIdx}`];

                      return (
                        <View key={setIdx}>
                          <View className="flex-row items-center gap-x-2">
                            <TouchableOpacity onPress={() => toggleSetType(exIdx, setIdx)} style={{ borderColor: typeColors[set.type], backgroundColor: colors.bg }} className="w-10 h-10 rounded-full border items-center justify-center">
                              <Text style={{ color: typeColors[set.type] }} className="text-[10px] font-bold">{typeLabels[set.type]}</Text>
                            </TouchableOpacity>
                            <View className="flex-1 relative">
                              <TextInput
                                value={String(set.weight)}
                                onChangeText={(v) => updateSet(exIdx, setIdx, 'weight', v)}
                                keyboardType="numeric"
                                style={{ backgroundColor: colors.bg }}
                                className="w-full h-10 rounded-xl text-white text-center font-bold pr-7"
                              />
                               {isBarbellExercise(ex.name || ex.exercises?.name) && (
                                <TouchableOpacity
                                  onPress={() => {
                                    setPlateWeight(set.weight || 0);
                                    setPlateExName(ex.name || ex.exercises?.name);
                                    setShowPlateCalc(true);
                                  }}
                                  className="absolute right-1 top-1 w-8 h-8 rounded-lg items-center justify-center border"
                                  style={{ backgroundColor: colors.accent + '1A', borderColor: colors.accent + '33' }}
                                >
                                  <Dumbbell size={10} color={colors.accent} />
                                </TouchableOpacity>
                              )}
                            </View>
                            <TextInput value={String(set.reps)} onChangeText={(v) => updateSet(exIdx, setIdx, 'reps', v)} keyboardType="numeric" style={{ backgroundColor: colors.bg }} className="flex-1 h-10 rounded-xl text-white text-center font-bold" />
                            <TextInput value={String(set.rpe)} onChangeText={(v) => updateSet(exIdx, setIdx, 'rpe', v)} keyboardType="numeric" style={{ backgroundColor: colors.bg }} className="flex-1 h-10 rounded-xl text-white text-center font-bold" />
                            <TouchableOpacity 
                              onPress={() => {
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                Alert.alert(
                                  "Eliminar Serie",
                                  "¿Deseas quitar esta serie?",
                                  [
                                    { text: "Cancelar", style: "cancel" },
                                    {
                                      text: "Eliminar",
                                      style: "destructive",
                                      onPress: () => {
                                        const n = [...exercises];
                                        n[exIdx].sets.splice(setIdx, 1);
                                        if (n[exIdx].sets.length === 0) n.splice(exIdx, 1);
                                        setExercises(n);
                                      }
                                    }
                                  ]
                                );
                              }} 
                              className="w-10 h-10 items-center justify-center"
                            >
                               <Trash2 size={16} color="#475569" />
                            </TouchableOpacity>
                          </View>
                          {alert && (
                            <View className="ml-12 mt-1 flex-row items-center gap-x-1">
                               <Sparkles size={10} color={alert.color} />
                               <Text style={{ color: alert.color }} className="text-[9px] font-bold">{alert.text}</Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>

                  <TouchableOpacity onPress={() => { const n = [...exercises]; const last = n[exIdx].sets[n[exIdx].sets.length-1]; n[exIdx].sets.push({...last, type: 'Normal'}); setExercises(n); }} className="mt-4 py-3 rounded-2xl border border-dashed flex-row justify-center items-center gap-x-2" style={{ borderColor: colors.border }}>
                    <Plus size={14} color="#475569" />
                    <Text className="text-slate-500 font-bold text-xs">Añadir Serie</Text>
                  </TouchableOpacity>
                </View>
              );
            })}

            <View className="gap-y-3">
              <TouchableOpacity onPress={() => setShowSelector(true)} className="py-5 rounded-3xl border-2 border-dashed flex-row justify-center items-center gap-x-3" style={{ borderColor: colors.accent + '4D', backgroundColor: colors.accent + '0D' }}>
                <Plus size={20} color={colors.accent} strokeWidth={3} />
                <Text style={{ color: colors.accent }} className="font-black uppercase tracking-widest">Añadir Ejercicio</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleCreateRoutineFromCurrent} className="py-4 rounded-3xl border flex-row justify-center items-center gap-x-3" style={{ borderColor: colors.border, backgroundColor: colors.card }}>
                <Save size={18} color="#64748b" />
                <Text className="text-slate-400 font-bold">Guardar como Rutina</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Menu Modal "Añadir" */}
      <Modal visible={showAddActions} transparent animationType="fade">
        <View className="flex-1 bg-black/80 justify-end">
          <View className="p-6 rounded-t-[32px] border-t" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <View className="items-center mb-6">
              <View className="w-10 h-1 bg-slate-700 rounded-full mb-3" />
              <Text className="text-white text-lg font-black">Nuevo Entrenamiento</Text>
              <Text className="text-slate-400 text-xs">Selecciona cómo deseas empezar</Text>
            </View>

            <View className="gap-y-3 mb-6">
              {/* Option 1: Libre */}
              <TouchableOpacity 
                onPress={() => {
                  setShowAddActions(false);
                  setExercises([]);
                  setWorkoutName('Entrenamiento Libre');
                  setShowSelector(true);
                }}
                className="p-4 rounded-2xl flex-row items-center gap-x-4 border"
                style={{ backgroundColor: colors.bg, borderColor: colors.border }}
              >
                <View className="w-10 h-10 rounded-xl bg-blue-600/10 items-center justify-center border border-blue-500/20">
                  <Plus color="#3b82f6" size={20} />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-bold text-sm">Entrenamiento Libre</Text>
                  <Text className="text-slate-500 text-xs mt-0.5" numberOfLines={1}>Empieza una sesión vacía y añade ejercicios.</Text>
                </View>
              </TouchableOpacity>

              {/* Option 2: Cargar */}
              <TouchableOpacity 
                onPress={() => {
                  setShowAddActions(false);
                  navigation.navigate('RoutineManager');
                }}
                className="p-4 rounded-2xl flex-row items-center gap-x-4 border"
                style={{ backgroundColor: colors.bg, borderColor: colors.border }}
              >
                <View className="w-10 h-10 rounded-xl bg-purple-600/10 items-center justify-center border border-purple-500/20">
                  <BookOpen color="#a855f7" size={20} />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-bold text-sm">Cargar Rutina Guardada</Text>
                  <Text className="text-slate-500 text-xs mt-0.5" numberOfLines={1}>Entrena usando uno de tus splits o plantillas.</Text>
                </View>
              </TouchableOpacity>

              {/* Option 3: Crear */}
              <TouchableOpacity 
                onPress={() => {
                  setShowAddActions(false);
                  navigation.navigate('RoutineEdit');
                }}
                className="p-4 rounded-2xl flex-row items-center gap-x-4 border"
                style={{ backgroundColor: colors.bg, borderColor: colors.border }}
              >
                <View className="w-10 h-10 rounded-xl bg-emerald-600/10 items-center justify-center border border-emerald-500/20">
                  <Sparkles color="#10b981" size={20} />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-bold text-sm">Crear Nueva Rutina</Text>
                  <Text className="text-slate-500 text-xs mt-0.5" numberOfLines={1}>Planifica tus ejercicios y series para después.</Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setShowAddActions(false)}
              className="py-4 rounded-2xl items-center border"
              style={{ borderColor: colors.border }}
            >
              <Text className="text-slate-400 font-bold text-xs uppercase">Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Exercise Help Modal */}
      <Modal visible={!!showHelpModal} transparent animationType="fade">
        <View className="flex-1 bg-black/80 items-center justify-center p-6">
           <View className="p-8 rounded-[40px] w-full items-center border" style={{ backgroundColor: colors.card, borderColor: colors.accent + '4D' }}>
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

              <TouchableOpacity onPress={() => setShowHelpModal(null)} className="w-full py-4 rounded-2xl items-center border" style={{ borderColor: colors.border }}>
                <Text className="text-slate-500 font-bold">Cerrar</Text>
              </TouchableOpacity>
           </View>
        </View>
      </Modal>

      {/* Exercise Selector Modal */}
      <Modal visible={showSelector} animationType="slide" transparent>
        <View className="flex-1" style={{ paddingTop: insets.top, backgroundColor: colors.bg }}>
           <View className="px-5 py-6 border-b flex-row justify-between items-center" style={{ borderColor: colors.border }}>
             <Text className="text-white text-2xl font-black">Añadir</Text>
             <TouchableOpacity onPress={() => setShowSelector(false)} className="p-2 rounded-full" style={{ backgroundColor: colors.card }}><X size={24} color="#64748b" /></TouchableOpacity>
           </View>
           <View className="px-5 py-4">
             <View className="rounded-2xl px-4 flex-row items-center border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
               <TextInput value={searchTerm} onChangeText={setSearchTerm} placeholder="Buscar..." placeholderTextColor="#64748b" className="flex-1 h-12 text-white font-bold" />
             </View>
           </View>
           <ScrollView className="flex-1 px-5">
             <View className="flex-row flex-wrap justify-between">
               {filteredExercises.map(ex => (
                 <TouchableOpacity key={ex.id} onPress={() => handleSelectExercise(ex)} className="w-[48%] h-32 rounded-2xl mb-4 overflow-hidden relative border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                   <Image source={MUSCLE_IMAGES[ex.muscle_group] || { uri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200&auto=format&fit=crop' }} className="absolute inset-0 w-full h-full opacity-30" resizeMode="cover" />
                   <View className="absolute inset-0" style={{ backgroundColor: colors.bg + '33' }} />
                   <View className="p-4 justify-between h-full">
                     <View className="self-start px-2 py-0.5 rounded-md" style={{ backgroundColor: colors.accent }}><Text style={{ color: colors.accentText }} className="text-[8px] font-black uppercase">{ex.muscle_group}</Text></View>
                     <Text className="text-white font-bold text-xs" numberOfLines={2}>{ex.name}</Text>
                   </View>
                 </TouchableOpacity>
               ))}
             </View>
           </ScrollView>
        </View>
      </Modal>

      <PlateCalculatorModal
        visible={showPlateCalc}
        onClose={() => setShowPlateCalc(false)}
        totalWeight={plateWeight}
        exerciseName={plateExName}
        colors={colors}
      />

      <ContextualTooltip
        visible={completedTutorials ? !completedTutorials.logger : true}
        title="Bitácora de Fuerza"
        description="Aquí registras tus entrenamientos. Puedes iniciar una sesión vacía, cargar rutinas creadas por ti, o usar plantillas avanzadas."
        stepText="Paso 2 / 4"
        onNext={() => markTutorialCompleted('logger')}
        onDismiss={() => markTutorialCompleted('logger')}
      />
    </View>
  );
}
