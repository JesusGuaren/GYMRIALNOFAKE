import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, Modal, Image } from 'react-native';
import { ChevronLeft, Save, Plus, Trash2, ArrowUp, ArrowDown, X, Info, Dumbbell, Sparkles, Link2, Unlink } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStore, { THEMES } from '../../store/useStore';
import * as Haptics from 'expo-haptics';
import { translateMuscleGroup, normalizeMuscleGroup } from '../../constants/Muscles';
import CreateExerciseModal from '../../components/common/CreateExerciseModal';

const MUSCLE_IMAGES = {
  'Chest': require('../../../assets/chest_bg.png'),
  'Back': require('../../../assets/back_bg.png'),
  'Legs': require('../../../assets/legs_bg.png'),
  'Arms': require('../../../assets/arms_bg.png'),
  'Shoulders': require('../../../assets/shoulders_bg.png'),
  'Core': require('../../../assets/core_bg.png'),
};

export default function RoutineEditScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { theme, routines, exercises: exercisesDb, saveRoutine, updateRoutine } = useStore();
  const colors = THEMES[theme] || THEMES.midnight;

  const routineId = route.params?.routineId;
  const isEditMode = !!routineId;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState([]);
  const [showSelector, setShowSelector] = useState(false);
  const [showCreateExercise, setShowCreateExercise] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Cargar datos si estamos en modo edición
  useEffect(() => {
    if (isEditMode) {
      const routine = routines.find(r => r.id === routineId);
      if (routine) {
        setName(routine.name);
        setDescription(routine.description || '');
        const loadedExercises = routine.routine_exercises?.map((re, idx) => ({
          id: re.id || Date.now() + idx + Math.random(),
          exercise_id: re.exercise_id,
          name: re.exercises?.name || '',
          muscle_group: re.exercises?.muscle_group || 'Arms',
          default_sets: re.default_sets || 3,
          default_reps: re.default_reps || 10,
          supersetId: re.superset_id || null
        })) || [];
        setExercises(loadedExercises);
      }
    }
  }, [routineId]);

  const handleFieldChange = (setter, val) => {
    setter(val);
    setHasChanges(true);
  };

  const handleSelectExercise = (ex) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExercises([...exercises, {
      id: Date.now() + Math.random(),
      exercise_id: ex.id,
      name: ex.name,
      muscle_group: ex.muscle_group,
      default_sets: 3,
      default_reps: 10,
      supersetId: null
    }]);
    setHasChanges(true);
    setShowSelector(false);
    setSearchTerm('');
  };

  const handleRemoveExercise = (idx) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Quitar Ejercicio",
      "¿Deseas quitar este ejercicio de la rutina?",
      [
        { text: "No", style: "cancel" },
        { 
          text: "Sí, Quitar", 
          style: "destructive", 
          onPress: () => {
            const updated = [...exercises];
            updated.splice(idx, 1);
            setExercises(updated);
            setHasChanges(true);
          } 
        }
      ]
    );
  };

  const updateExerciseParam = (idx, field, value) => {
    const updated = [...exercises];
    updated[idx][field] = parseInt(value) || 0;
    setExercises(updated);
    setHasChanges(true);
  };

  const moveExercise = (idx, direction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= exercises.length) return;

    const updated = [...exercises];
    // Reordenar rompe la adyacencia que define una superserie, así que
    // se desvincula en vez de dejar un supersetId "huérfano" e inconsistente.
    if (updated[idx].supersetId) updated[idx] = { ...updated[idx], supersetId: null };
    if (updated[targetIdx].supersetId) updated[targetIdx] = { ...updated[targetIdx], supersetId: null };

    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;

    setExercises(updated);
    setHasChanges(true);
  };

  // Vincula/desvincula el ejercicio en idx con el siguiente (idx + 1) como superserie.
  // Solo soporta parejas: un ejercicio no puede pertenecer a 2 superseries a la vez.
  const toggleSuperset = (idx) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = [...exercises];
    const a = updated[idx];
    const b = updated[idx + 1];
    if (!b) return;

    if (a.supersetId && a.supersetId === b.supersetId) {
      updated[idx] = { ...a, supersetId: null };
      updated[idx + 1] = { ...b, supersetId: null };
    } else if (!a.supersetId && !b.supersetId) {
      const supersetId = `ss_${Date.now()}`;
      updated[idx] = { ...a, supersetId };
      updated[idx + 1] = { ...b, supersetId };
    } else {
      return; // Uno de los dos ya pertenece a otra superserie
    }

    setExercises(updated);
    setHasChanges(true);
  };

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(
        "Descartar cambios",
        "¿Deseas salir sin guardar los cambios realizados?",
        [
          { text: "No", style: "cancel" },
          { text: "Sí, Salir", style: "destructive", onPress: () => navigation.goBack() }
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Nombre Requerido", "Por favor ingresa un nombre para la rutina.");
      return;
    }

    if (exercises.length === 0) {
      Alert.alert("Rutina Vacía", "Por favor añade al menos un ejercicio a la rutina.");
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      if (isEditMode) {
        await updateRoutine(routineId, name, description, exercises);
      } else {
        await saveRoutine(name, description, exercises);
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", "No se pudo guardar la rutina.");
    }
  };

  const filteredExercises = exercisesDb.filter(ex => 
    ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ex.muscle_group?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-6 py-4 border-b flex-row justify-between items-center" style={{ borderColor: colors.border }}>
        <TouchableOpacity
          onPress={handleCancel}
          className="px-4 py-2 border rounded-xl"
          style={{ borderColor: colors.border }}
        >
          <Text className="text-slate-400 font-bold text-xs uppercase">Cancelar</Text>
        </TouchableOpacity>

        <Text className="text-white text-lg font-black">
          {isEditMode ? 'Editar Rutina' : 'Crear Rutina'}
        </Text>

        <TouchableOpacity
          onPress={handleSave}
          className="px-4 py-2 rounded-xl flex-row items-center gap-x-1"
          style={{ backgroundColor: colors.accent }}
        >
          <Save size={14} color={colors.accentText} />
          <Text style={{ color: colors.accentText }} className="font-bold text-xs uppercase">Guardar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Form Inputs */}
        <View className="gap-y-4 mb-6">
          <View>
            <Text className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-2">Nombre de la Rutina</Text>
            <TextInput
              value={name}
              onChangeText={(val) => handleFieldChange(setName, val)}
              placeholder="Ej. Día de Empuje"
              placeholderTextColor="#475569"
              className="h-14 border rounded-2xl px-4 text-white font-bold text-base"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            />
          </View>

          <View>
            <Text className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-2">Descripción</Text>
            <TextInput
              value={description}
              onChangeText={(val) => handleFieldChange(setDescription, val)}
              placeholder="Ej. Enfoque en pectoral superior y tríceps"
              placeholderTextColor="#475569"
              className="h-14 border rounded-2xl px-4 text-white text-sm"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            />
          </View>
        </View>

        {/* Exercises List */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text style={{ color: colors.accent }} className="text-xs font-black uppercase tracking-widest">Ejercicios seleccionados</Text>
            <Text className="text-slate-500 text-xs font-bold">{exercises.length} en lista</Text>
          </View>

          {exercises.length === 0 ? (
            <View className="p-8 rounded-3xl border border-dashed items-center justify-center py-12" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
              <Dumbbell size={32} color="#475569" />
              <Text className="text-slate-500 text-xs text-center mt-3">No has seleccionado ejercicios aún.</Text>
            </View>
          ) : (
            <View className="gap-y-4">
              {exercises.map((ex, idx) => {
                const nextEx = exercises[idx + 1];
                const isPairedWithNext = !!ex.supersetId && nextEx?.supersetId === ex.supersetId;
                const isPairedWithPrev = idx > 0 && exercises[idx - 1].supersetId === ex.supersetId && !!ex.supersetId;
                const canLinkNext = nextEx && !ex.supersetId && !nextEx.supersetId;

                return (
                <React.Fragment key={ex.id}>
                <View
                  className="border p-4 rounded-2xl"
                  style={{
                    backgroundColor: colors.card,
                    borderColor: ex.supersetId ? '#a855f766' : colors.border,
                    borderLeftWidth: ex.supersetId ? 3 : 1,
                    borderLeftColor: ex.supersetId ? '#a855f7' : colors.border
                  }}
                >
                  {ex.supersetId && (
                    <View className="flex-row items-center gap-x-1.5 mb-3 self-start px-2 py-1 rounded-lg bg-purple-500/10">
                      <Link2 size={10} color="#a855f7" />
                      <Text className="text-purple-400 text-[9px] font-black uppercase tracking-wider">
                        Superserie {isPairedWithPrev ? '· Parte 2' : '· Parte 1'}
                      </Text>
                    </View>
                  )}
                  <View className="flex-row justify-between items-center mb-3">
                    <View className="flex-1 pr-4">
                      <Text className="text-white font-bold text-base">{ex.name}</Text>
                      <Text className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mt-0.5">
                        {translateMuscleGroup(ex.muscle_group)}
                      </Text>
                    </View>

                    {/* Reordenar / Eliminar */}
                    <View className="flex-row gap-x-2 items-center">
                      <TouchableOpacity
                        onPress={() => moveExercise(idx, 'up')}
                        disabled={idx === 0}
                        className="w-7 h-7 rounded items-center justify-center border"
                        style={{ backgroundColor: colors.bg, borderColor: colors.border, opacity: idx === 0 ? 0.3 : 1 }}
                      >
                        <ArrowUp size={12} color="#94a3b8" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => moveExercise(idx, 'down')}
                        disabled={idx === exercises.length - 1}
                        className="w-7 h-7 rounded items-center justify-center border"
                        style={{ backgroundColor: colors.bg, borderColor: colors.border, opacity: idx === exercises.length - 1 ? 0.3 : 1 }}
                      >
                        <ArrowDown size={12} color="#94a3b8" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleRemoveExercise(idx)}
                        className="w-7 h-7 rounded bg-red-950/20 items-center justify-center border border-red-900/10"
                      >
                        <Trash2 size={12} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Sets and Reps Config */}
                  <View className="flex-row gap-x-4">
                    <View className="flex-1">
                      <Text className="text-slate-500 text-[9px] uppercase font-bold tracking-wider mb-1">Series Predeterminadas</Text>
                      <TextInput
                        value={String(ex.default_sets)}
                        onChangeText={(val) => updateExerciseParam(idx, 'default_sets', val)}
                        keyboardType="numeric"
                        className="h-10 rounded-xl text-center text-white font-bold"
                        style={{ backgroundColor: colors.bg }}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-slate-500 text-[9px] uppercase font-bold tracking-wider mb-1">Repeticiones Promedio</Text>
                      <TextInput
                        value={String(ex.default_reps)}
                        onChangeText={(val) => updateExerciseParam(idx, 'default_reps', val)}
                        keyboardType="numeric"
                        className="h-10 rounded-xl text-center text-white font-bold"
                        style={{ backgroundColor: colors.bg }}
                      />
                    </View>
                  </View>
                </View>

                {(isPairedWithNext || canLinkNext) && (
                  <TouchableOpacity
                    onPress={() => toggleSuperset(idx)}
                    className="self-center -my-2 flex-row items-center gap-x-1.5 px-3 py-1.5 rounded-full border z-10"
                    style={{
                      backgroundColor: isPairedWithNext ? '#a855f71A' : colors.bg,
                      borderColor: isPairedWithNext ? '#a855f74D' : colors.border
                    }}
                  >
                    {isPairedWithNext ? (
                      <>
                        <Unlink size={11} color="#a855f7" />
                        <Text className="text-purple-400 text-[9px] font-black uppercase tracking-wider">Desvincular</Text>
                      </>
                    ) : (
                      <>
                        <Link2 size={11} color="#64748b" />
                        <Text className="text-slate-500 text-[9px] font-black uppercase tracking-wider">Vincular como superserie</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
                </React.Fragment>
                );
              })}
            </View>
          )}

          {/* Add Exercise CTA */}
          <TouchableOpacity
            onPress={() => setShowSelector(true)}
            className="mt-6 py-4 rounded-2xl border border-dashed flex-row justify-center items-center gap-x-2"
            style={{ borderColor: colors.accent + '4D', backgroundColor: colors.accent + '0D' }}
          >
            <Plus size={16} color={colors.accent} strokeWidth={2.5} />
            <Text style={{ color: colors.accent }} className="font-bold text-xs uppercase tracking-wider">Añadir Ejercicio</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Exercise Selector Modal */}
      <Modal visible={showSelector} animationType="slide" transparent>
        <View className="flex-1" style={{ paddingTop: insets.top, backgroundColor: colors.bg }}>
          <View className="px-5 py-6 border-b flex-row justify-between items-center" style={{ borderColor: colors.border }}>
            <Text className="text-white text-2xl font-black">Seleccionar Ejercicio</Text>
            <TouchableOpacity onPress={() => setShowSelector(false)} className="p-2 rounded-full" style={{ backgroundColor: colors.card }}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <View className="px-5 py-4 gap-y-3">
            <View className="rounded-2xl px-4 flex-row items-center border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
              <TextInput
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholder="Buscar por ejercicio o músculo..."
                placeholderTextColor="#64748b"
                className="flex-1 h-12 text-white font-bold"
              />
            </View>
            <TouchableOpacity
              onPress={() => setShowCreateExercise(true)}
              className="rounded-2xl px-4 h-12 flex-row items-center justify-center gap-x-2 border border-dashed"
              style={{ borderColor: colors.accent + '4D', backgroundColor: colors.accent + '0D' }}
            >
              <Plus size={16} color={colors.accent} strokeWidth={2.5} />
              <Text style={{ color: colors.accent }} className="font-bold text-xs uppercase tracking-wider">Crear Ejercicio Nuevo</Text>
            </TouchableOpacity>
          </View>
          <ScrollView className="flex-1 px-5">
            <View className="flex-row flex-wrap justify-between">
              {filteredExercises.map(ex => (
                <TouchableOpacity
                  key={ex.id}
                  onPress={() => handleSelectExercise(ex)}
                  className="w-[48%] h-32 border rounded-2xl mb-4 overflow-hidden relative"
                  style={{ backgroundColor: colors.card, borderColor: colors.border }}
                >
                  <Image
                    source={MUSCLE_IMAGES[ex.muscle_group] || { uri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200&auto=format&fit=crop' }}
                    className="absolute inset-0 w-full h-full opacity-35"
                    resizeMode="cover"
                  />
                  <View className="absolute inset-0" style={{ backgroundColor: colors.bg + '33' }} />
                  <View className="p-4 justify-between h-full">
                    <View className="flex-row justify-between items-start">
                      <View className="px-2 py-0.5 rounded-md" style={{ backgroundColor: colors.accent }}>
                        <Text style={{ color: colors.accentText }} className="text-[8px] font-black uppercase">{ex.muscle_group}</Text>
                      </View>
                      {!!ex.user_id && (
                        <View className="px-2 py-0.5 rounded-md bg-purple-500/80">
                          <Text className="text-white text-[8px] font-black uppercase">Tuyo</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-white font-bold text-xs" numberOfLines={2}>{ex.name}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>

      <CreateExerciseModal
        visible={showCreateExercise}
        onClose={() => setShowCreateExercise(false)}
        initialName={searchTerm}
        onCreated={(newEx) => {
          handleSelectExercise(newEx);
          setSearchTerm('');
        }}
      />
    </View>
  );
}
