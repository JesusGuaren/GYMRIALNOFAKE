import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, Modal, Image } from 'react-native';
import { ChevronLeft, Save, Plus, Trash2, ArrowUp, ArrowDown, X, Info, Dumbbell, Sparkles } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStore, { THEMES } from '../../store/useStore';
import * as Haptics from 'expo-haptics';
import { translateMuscleGroup, normalizeMuscleGroup } from '../../constants/Muscles';

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
          default_reps: re.default_reps || 10
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
      default_reps: 10
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
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;

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
      <View className="px-6 py-4 border-b border-slate-900 flex-row justify-between items-center">
        <TouchableOpacity 
          onPress={handleCancel}
          className="px-4 py-2 border border-slate-800 rounded-xl"
        >
          <Text className="text-slate-400 font-bold text-xs uppercase">Cancelar</Text>
        </TouchableOpacity>
        
        <Text className="text-white text-lg font-black">
          {isEditMode ? 'Editar Rutina' : 'Crear Rutina'}
        </Text>

        <TouchableOpacity 
          onPress={handleSave}
          className="px-4 py-2 bg-blue-600 rounded-xl flex-row items-center gap-x-1"
        >
          <Save size={14} color="white" />
          <Text className="text-white font-bold text-xs uppercase">Guardar</Text>
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
              className="h-14 bg-slate-900 border border-slate-800 rounded-2xl px-4 text-white font-bold text-base focus:border-blue-500"
            />
          </View>
          
          <View>
            <Text className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-2">Descripción</Text>
            <TextInput
              value={description}
              onChangeText={(val) => handleFieldChange(setDescription, val)}
              placeholder="Ej. Enfoque en pectoral superior y tríceps"
              placeholderTextColor="#475569"
              className="h-14 bg-slate-900 border border-slate-800 rounded-2xl px-4 text-white text-sm focus:border-blue-500"
            />
          </View>
        </View>

        {/* Exercises List */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-blue-500 text-xs font-black uppercase tracking-widest">Ejercicios seleccionados</Text>
            <Text className="text-slate-500 text-xs font-bold">{exercises.length} en lista</Text>
          </View>

          {exercises.length === 0 ? (
            <View className="bg-slate-900/30 p-8 rounded-3xl border border-dashed border-slate-800 items-center justify-center py-12">
              <Dumbbell size={32} color="#475569" />
              <Text className="text-slate-500 text-xs text-center mt-3">No has seleccionado ejercicios aún.</Text>
            </View>
          ) : (
            <View className="gap-y-4">
              {exercises.map((ex, idx) => (
                <View 
                  key={ex.id}
                  className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl"
                >
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
                        className={`w-7 h-7 rounded bg-slate-950 items-center justify-center border border-slate-800 ${idx === 0 ? 'opacity-30' : ''}`}
                      >
                        <ArrowUp size={12} color="#94a3b8" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => moveExercise(idx, 'down')}
                        disabled={idx === exercises.length - 1}
                        className={`w-7 h-7 rounded bg-slate-950 items-center justify-center border border-slate-800 ${idx === exercises.length - 1 ? 'opacity-30' : ''}`}
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
                        className="h-10 bg-slate-950 rounded-xl text-center text-white font-bold"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-slate-500 text-[9px] uppercase font-bold tracking-wider mb-1">Repeticiones Promedio</Text>
                      <TextInput
                        value={String(ex.default_reps)}
                        onChangeText={(val) => updateExerciseParam(idx, 'default_reps', val)}
                        keyboardType="numeric"
                        className="h-10 bg-slate-950 rounded-xl text-center text-white font-bold"
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Add Exercise CTA */}
          <TouchableOpacity 
            onPress={() => setShowSelector(true)}
            className="mt-6 py-4 rounded-2xl border border-dashed border-blue-600/30 bg-blue-600/5 flex-row justify-center items-center gap-x-2"
          >
            <Plus size={16} color="#3b82f6" strokeWidth={2.5} />
            <Text className="text-blue-500 font-bold text-xs uppercase tracking-wider">Añadir Ejercicio</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Exercise Selector Modal */}
      <Modal visible={showSelector} animationType="slide" transparent>
        <View className="flex-1 bg-slate-950" style={{ paddingTop: insets.top }}>
          <View className="px-5 py-6 border-b border-slate-900 flex-row justify-between items-center">
            <Text className="text-white text-2xl font-black">Seleccionar Ejercicio</Text>
            <TouchableOpacity onPress={() => setShowSelector(false)} className="bg-slate-900 p-2 rounded-full">
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <View className="px-5 py-4">
            <View className="bg-slate-900 rounded-2xl px-4 flex-row items-center border border-slate-800">
              <TextInput 
                value={searchTerm} 
                onChangeText={setSearchTerm} 
                placeholder="Buscar por ejercicio o músculo..." 
                placeholderTextColor="#64748b" 
                className="flex-1 h-12 text-white font-bold" 
              />
            </View>
          </View>
          <ScrollView className="flex-1 px-5">
            <View className="flex-row flex-wrap justify-between">
              {filteredExercises.map(ex => (
                <TouchableOpacity 
                  key={ex.id} 
                  onPress={() => handleSelectExercise(ex)} 
                  className="w-[48%] h-32 bg-slate-900 border border-slate-800 rounded-2xl mb-4 overflow-hidden relative"
                >
                  <Image 
                    source={MUSCLE_IMAGES[ex.muscle_group] || { uri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200&auto=format&fit=crop' }} 
                    className="absolute inset-0 w-full h-full opacity-35" 
                    resizeMode="cover" 
                  />
                  <View className="absolute inset-0 bg-slate-950/20" />
                  <View className="p-4 justify-between h-full">
                    <View className="bg-blue-600 self-start px-2 py-0.5 rounded-md">
                      <Text className="text-[8px] text-white font-black uppercase">{ex.muscle_group}</Text>
                    </View>
                    <Text className="text-white font-bold text-xs" numberOfLines={2}>{ex.name}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
