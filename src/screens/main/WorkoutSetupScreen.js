import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Plus, BookOpen, ChevronLeft, Dumbbell, Sparkles } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStore, { THEMES } from '../../store/useStore';

export default function WorkoutSetupScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const routines = useStore(state => state.routines);
  const setCurrentActiveWorkout = useStore(state => state.setCurrentActiveWorkout);
  const theme = useStore(state => state.theme);
  const colors = THEMES[theme] || THEMES.midnight;
  const date = route?.params?.date || new Date().toISOString().split('T')[0];

  const startFreeWorkout = () => {
    setCurrentActiveWorkout({
      name: 'Entrenamiento Libre',
      date,
      exercises: []
    });
    navigation.navigate('ActiveWorkout');
  };

  const loadRoutine = (routine) => {
    const exercises = routine.routine_exercises.map(re => ({
      id: Date.now() + Math.random(),
      exercise_id: re.exercise_id,
      name: re.exercises.name,
      muscle_group: re.exercises.muscle_group || 'Arms',
      sets: [{ weight: 0, reps: 0, rpe: 8, type: 'Normal', isCompleted: false }]
    }));

    setCurrentActiveWorkout({
      name: routine.name,
      date,
      exercises: exercises
    });
    navigation.navigate('ActiveWorkout');
  };

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: Math.max(insets.top, 20),
        paddingBottom: 40
      }}
    >
      {/* Header */}
      <View className="flex-row items-center mb-8 mt-2">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-full items-center justify-center mr-4 border"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <ChevronLeft color="#e2e8f0" size={24} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-white">Nuevo Entrenamiento</Text>
      </View>

      {/* Hero Section */}
      <View className="items-center mb-10">
        <View className="w-20 h-20 bg-emerald-500/10 rounded-full items-center justify-center mb-5 border border-emerald-500/20">
          <Dumbbell size={40} color="#10b981" />
        </View>
        <Text className="text-white text-2xl font-bold mb-2">¿Qué entrenamos hoy?</Text>
        <Text className="text-slate-400 text-center">Selecciona cómo quieres empezar tu sesión.</Text>
      </View>

      {/* Options */}
      <View className="gap-y-4">
        {/* Generar con IA */}
        <TouchableOpacity 
          onPress={() => navigation.navigate('AIRoutine')}
          className="p-5 rounded-2xl bg-purple-500/10 border-2 border-purple-500/40 flex-row items-center shadow-xl shadow-purple-500/10"
        >
          <View className="bg-purple-500 p-3 rounded-xl mr-4">
            <Sparkles size={24} color="white" />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-x-2">
              <Text className="text-white font-extrabold text-lg mb-0.5">Crear Rutina con IA</Text>
              <View className="bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-500/30">
                <Text className="text-purple-400 font-extrabold text-[9px]">RECOMENDADO</Text>
              </View>
            </View>
            <Text className="text-slate-400 text-xs leading-relaxed">Genera un plan de entrenamiento inteligente y adaptado 100% a tus metas.</Text>
          </View>
        </TouchableOpacity>

        {/* Free Workout */}
        <TouchableOpacity
          onPress={startFreeWorkout}
          className="p-5 rounded-2xl border flex-row items-center"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <View className="p-3 rounded-xl mr-4" style={{ backgroundColor: colors.bg }}>
            <Plus size={24} color="#e2e8f0" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-bold text-lg mb-1">Entrenamiento Libre</Text>
            <Text className="text-slate-400 text-xs leading-snug">Empieza una sesión vacía y añade ejercicios sobre la marcha.</Text>
          </View>
        </TouchableOpacity>

        <View className="mt-6">
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center gap-x-2">
              <BookOpen size={16} color="#64748b" />
              <Text className="text-slate-400 text-xs uppercase tracking-widest font-bold">Tus Rutinas Guardadas</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('RoutineManager')}>
              <Text className="text-xs font-bold uppercase" style={{ color: colors.accent }}>Gestionar</Text>
            </TouchableOpacity>
          </View>

          {routines.length === 0 ? (
            <View className="p-8 rounded-2xl border items-center justify-center" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
              <Text className="text-slate-400 text-center mb-4">Aún no tienes rutinas guardadas.</Text>
              <TouchableOpacity 
                onPress={() => navigation.navigate('RoutineManager')}
                className="border border-purple-500/50 px-4 py-2 rounded-lg"
              >
                <Text className="text-purple-400 font-bold">Ir al Gestor de Rutinas</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="gap-y-3">
              {[...routines].sort((a, b) => a.name.localeCompare(b.name)).map(r => (
                <TouchableOpacity 
                  key={r.id} 
                  onPress={() => loadRoutine(r)}
                  className="p-4 rounded-2xl flex-row items-center justify-between border"
                  style={{ backgroundColor: colors.card, borderColor: colors.border }}
                >
                  <View className="flex-row items-center flex-1 pr-4">
                    <View className="bg-purple-500/10 p-2.5 rounded-xl mr-3">
                      <Sparkles size={20} color="#a855f7" />
                    </View>
                    <View>
                      <Text className="text-white font-bold text-base mb-1">{r.name}</Text>
                      <Text className="text-slate-500 text-xs">
                        {r.routine_exercises?.length || 0} ejercicios
                      </Text>
                    </View>
                  </View>
                  <ChevronLeft size={20} color="#64748b" style={{ transform: [{ rotate: '180deg' }] }} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
