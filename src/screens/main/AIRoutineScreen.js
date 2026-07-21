import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, Alert, ActivityIndicator } from 'react-native';
import { ChevronLeft, Calendar, Sparkles, ChevronRight, Zap, Target, BookOpen } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStore, { THEMES } from '../../store/useStore';
import { generateAIRoutine, getMuscleSpanish } from '../../services/AIRoutineGenerator';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';

export default function AIRoutineScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme, exercises: exercisesDb, saveProgram } = useStore();
  const colors = THEMES[theme] || THEMES.midnight;

  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);

  // Estados del Wizard
  const [goal, setGoal] = useState('Hypertrophy'); // Strength, Hypertrophy, Fat Loss
  const [level, setLevel] = useState('Intermediate'); // Beginner, Intermediate, Advanced
  const [daysPerWeek, setDaysPerWeek] = useState(3); // 2 to 6
  const [equipment, setEquipment] = useState(['barbell', 'dumbbell', 'cables']); // barbell, dumbbell, cables, bodyweight, machine
  const [focusMuscles, setFocusMuscles] = useState([]); // Array of muscles
  const [generatedProgram, setGeneratedProgram] = useState(null);

  // Músculos disponibles para enfocar
  const AVAILABLE_MUSCLES = ['Chest', 'Back', 'Legs', 'Shoulders', 'Biceps', 'Triceps', 'Core'];

  const toggleEquipment = (eq) => {
    if (equipment.includes(eq)) {
      setEquipment(equipment.filter(e => e !== eq));
    } else {
      setEquipment([...equipment, eq]);
    }
  };

  const toggleMuscleFocus = (muscle) => {
    if (focusMuscles.includes(muscle)) {
      setFocusMuscles(focusMuscles.filter(m => m !== muscle));
    } else {
      if (focusMuscles.length >= 2) {
        Alert.alert('Límite de Enfoque', 'Puedes elegir un máximo de 2 grupos musculares para enfocar.');
        return;
      }
      setFocusMuscles([...focusMuscles, muscle]);
    }
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      try {
        const program = generateAIRoutine({
          goal,
          level,
          daysPerWeek,
          equipment,
          focusMuscles,
          exercisesDb
        });
        setGeneratedProgram(program);
        setStep(5); // Ir al paso de Preview
      } catch (err) {
        console.error(err);
        Alert.alert('Error', 'Hubo un inconveniente al generar tu rutina inteligente.');
      } finally {
        setIsGenerating(false);
      }
    }, 1000); // Pequeño lag artificial de carga elegante
  };

  const handleSaveProgram = async () => {
    if (!generatedProgram) return;
    
    setIsGenerating(true);
    try {
      // Mapear los días generados al formato esperado por saveProgram del store
      const formattedDays = generatedProgram.days.map(day => ({
        name: day.name,
        exercises: day.exercises.map(ex => ({
          exercise_id: ex.exercise_id,
          name: ex.name,
          muscle_group: ex.muscle_group,
          default_sets: ex.sets_count,
          default_reps: parseInt(ex.reps_range) || 10
        }))
      }));

      await saveProgram(
        generatedProgram.name,
        generatedProgram.description,
        formattedDays
      );
      
      navigation.navigate('MainTabs', { screen: 'Resumen' });
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'No se pudo guardar el programa.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg }}>
      {/* Header Fijo */}
      <View
        className="flex-row items-center justify-between px-6 pb-4 border-b"
        style={{ paddingTop: Math.max(insets.top, 20), borderColor: colors.border }}
      >
        <TouchableOpacity
          onPress={() => {
            if (step > 1 && step < 5) setStep(step - 1);
            else if (step === 5) setStep(4);
            else navigation.goBack();
          }}
          className="w-10 h-10 rounded-full items-center justify-center border"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <ChevronLeft color="#e2e8f0" size={24} />
        </TouchableOpacity>
        
        <Text className="text-lg font-black text-white">Creador IA 🧠</Text>
        
        {step < 5 ? (
          <Text className="text-slate-500 font-bold text-xs uppercase tracking-wider">
            {step} / 4
          </Text>
        ) : (
          <Sparkles color={colors.accent} size={20} />
        )}
      </View>

      {/* Cuerpo Principal del Wizard */}
      <ScrollView 
        contentContainerStyle={{ 
          paddingHorizontal: 24, 
          paddingTop: 20, 
          paddingBottom: 170 // Generoso padding bottom para evitar recortes en pantallas chicas
        }} 
        className="flex-1"
        showsVerticalScrollIndicator={false}
      >
        {step === 1 && (
          <Animated.View entering={FadeIn} className="gap-y-6">
            <View className="mb-2">
              <Text className="text-white text-2xl font-black mb-2">Define tu objetivo</Text>
              <Text className="text-slate-400 text-sm leading-relaxed font-medium">El motor de IA adaptará el rango de repeticiones y la intensidad según tus metas físicas.</Text>
            </View>

            {/* Selector de Objetivos */}
            <View className="gap-y-3">
              {[
                { id: 'Hypertrophy', label: 'Crecimiento Muscular', desc: 'Enfoque en ganancia de masa muscular e hipertrofia estética.', icon: '💪', color: '#10b981' },
                { id: 'Strength', label: 'Fuerza Máxima', desc: 'Enfoque en series pesadas y levantamientos primarios olímpicos.', icon: '🏋️', color: '#a855f7' },
                { id: 'Fat Loss', label: 'Resistencia & Definición', desc: 'Series de altas repeticiones con descansos cortos para acelerar el metabolismo.', icon: '🔥', color: '#f43f5e' }
              ].map(opt => (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setGoal(opt.id)}
                  className="p-5 rounded-2xl border-2 flex-row gap-x-4 items-center"
                  style={{ backgroundColor: colors.card, borderColor: goal === opt.id ? opt.color : 'transparent', opacity: goal === opt.id ? 1 : 0.6 }}
                >
                  <Text className="text-3xl">{opt.icon}</Text>
                  <View className="flex-1">
                    <Text className="text-white font-extrabold text-base mb-1">{opt.label}</Text>
                    <Text className="text-slate-400 text-xs leading-normal font-medium">{opt.desc}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Selector de Nivel */}
            <View className="mt-4">
              <Text className="text-white font-bold text-base mb-3">Nivel de experiencia</Text>
              <View className="flex-row gap-x-2">
                {[
                  { id: 'Beginner', name: 'NOVATO' },
                  { id: 'Intermediate', name: 'INTERMEDIO' },
                  { id: 'Advanced', name: 'AVANZADO' }
                ].map(lvl => (
                  <TouchableOpacity
                    key={lvl.id}
                    onPress={() => setLevel(lvl.id)}
                    className="flex-1 py-4 rounded-xl border items-center justify-center"
                    style={level === lvl.id ? { backgroundColor: colors.accent, borderColor: colors.accent } : { backgroundColor: colors.card, borderColor: colors.border }}
                  >
                    <Text className="text-[10px] font-black tracking-wider" style={{ color: level === lvl.id ? colors.accentText : '#94a3b8' }}>
                      {lvl.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Animated.View>
        )}

        {step === 2 && (
          <Animated.View entering={FadeIn} className="gap-y-6">
            <View className="mb-2">
              <Text className="text-white text-2xl font-black mb-2">Disponibilidad semanal</Text>
              <Text className="text-slate-400 text-sm leading-relaxed font-medium">Selecciona cuántos días puedes entrenar. La IA configurará el split óptimo de frecuencia.</Text>
            </View>

            <View className="flex-row flex-wrap gap-2.5">
              {[2, 3, 4, 5, 6].map(num => (
                <TouchableOpacity
                  key={num}
                  onPress={() => setDaysPerWeek(num)}
                  className="flex-1 min-w-[70px] p-5 rounded-2xl border-2 items-center justify-center"
                  style={{ backgroundColor: colors.card, borderColor: daysPerWeek === num ? colors.accent : 'transparent', opacity: daysPerWeek === num ? 1 : 0.6 }}
                >
                  <Text className="text-white text-2xl font-black mb-0.5">{num}</Text>
                  <Text className="text-slate-500 text-[9px] uppercase font-black tracking-wider">Días</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Split Preview */}
            <View className="p-5 rounded-2xl border mt-4 flex-row items-center gap-x-4" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
              <View className="w-12 h-12 rounded-xl bg-purple-500/10 items-center justify-center border border-purple-500/20">
                <Calendar color="#a855f7" size={24} />
              </View>
              <View className="flex-1">
                <Text className="text-slate-400 text-[10px] font-extrabold uppercase tracking-widest mb-1">Split Sugerido por IA</Text>
                <Text className="text-white font-extrabold text-base mb-1">
                  {daysPerWeek === 2 && 'Upper / Lower (Torso/Piernas)'}
                  {daysPerWeek === 3 && 'Push / Pull / Legs (Empuje/Tirón/Pierna)'}
                  {daysPerWeek === 4 && 'Torso / Piernas x2 (Frecuencia 2)'}
                  {daysPerWeek === 5 && 'Arnold Split Modificado (5 Días)'}
                  {daysPerWeek === 6 && 'Push / Pull / Legs x2 (Elite)'}
                </Text>
                <Text className="text-slate-500 text-xs leading-normal font-medium">
                  {daysPerWeek === 3 ? 'La división más equilibrada del fitness clásico.' : 'Una excelente distribución para asegurar óptima hipertrofia y descanso.'}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {step === 3 && (
          <Animated.View entering={FadeIn} className="gap-y-6">
            <View className="mb-2">
              <Text className="text-white text-2xl font-black mb-2">Equipamiento disponible</Text>
              <Text className="text-slate-400 text-sm leading-relaxed font-medium">Selecciona qué herramientas tienes a la mano. La IA adaptará los ejercicios dinámicamente.</Text>
            </View>

            <View className="gap-y-3">
              {[
                { id: 'barbell', name: 'Barra Olímpica & Discos', icon: '🏋️' },
                { id: 'dumbbell', name: 'Mancuernas', icon: '💪' },
                { id: 'cables', name: 'Poleas / Cables', icon: '⛓️' },
                { id: 'machine', name: 'Máquinas del Gym', icon: '🤖' },
                { id: 'bodyweight', name: 'Peso Corporal (Calistenia)', icon: '🤸' }
              ].map(eq => {
                const active = equipment.includes(eq.id);
                return (
                  <TouchableOpacity
                    key={eq.id}
                    onPress={() => toggleEquipment(eq.id)}
                    className="p-4 rounded-xl border flex-row justify-between items-center"
                    style={active ? { backgroundColor: colors.card, borderColor: colors.accent } : { backgroundColor: colors.card, borderColor: colors.border, opacity: 0.6 }}
                  >
                    <View className="flex-row items-center gap-x-3">
                      <Text className="text-xl">{eq.icon}</Text>
                      <Text className="text-white font-bold text-sm">{eq.name}</Text>
                    </View>
                    <View className="w-6 h-6 rounded-full border items-center justify-center" style={active ? { backgroundColor: colors.accent, borderColor: colors.accent } : { borderColor: '#334155' }}>
                      {active && <Text style={{ color: colors.accentText }} className="text-[10px] font-black font-medium">✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        )}

        {step === 4 && (
          <Animated.View entering={FadeIn} className="gap-y-6">
            <View className="mb-2">
              <Text className="text-white text-2xl font-black mb-2">Enfoque muscular (Opcional)</Text>
              <Text className="text-slate-400 text-sm leading-relaxed font-medium font-medium">¿Hay algún grupo muscular al que quieras darle prioridad hoy? (Elige máximo 2).</Text>
            </View>

            {/* Ajustamos las tarjetas a un Grid más compacto y responsivo */}
            <View className="flex-row flex-wrap gap-2.5 justify-between">
              {AVAILABLE_MUSCLES.map(muscle => {
                const isSelected = focusMuscles.includes(muscle);
                return (
                  <TouchableOpacity
                    key={muscle}
                    onPress={() => toggleMuscleFocus(muscle)}
                    className="p-3 rounded-2xl border-2 items-center justify-center"
                    style={{
                      backgroundColor: colors.card,
                      opacity: isSelected ? 1 : 0.6,
                      borderColor: isSelected ? '#a855f7' : 'transparent',
                      width: '47%', // 2 columnas perfectas con espacio entre ellas
                      aspectRatio: 1.15
                    }}
                  >
                    <Text className={`text-2xl mb-1 ${isSelected ? 'opacity-100' : 'opacity-60'}`}>
                      {muscle === 'Chest' && '🍒'}
                      {muscle === 'Back' && '🦅'}
                      {muscle === 'Legs' && '🦵'}
                      {muscle === 'Shoulders' && '🛡️'}
                      {muscle === 'Biceps' && '💪'}
                      {muscle === 'Triceps' && '⚡'}
                      {muscle === 'Core' && '🧱'}
                    </Text>
                    <Text className="text-white font-extrabold text-xs mb-0.5">{getMuscleSpanish(muscle)}</Text>
                    <Text className="text-[9px] text-slate-500 uppercase tracking-widest font-black">
                      {isSelected ? 'Prioridad' : 'Normal'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        )}

        {step === 5 && generatedProgram && (
          <Animated.View entering={SlideInRight} className="gap-y-6">
            <View className="p-6 rounded-3xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
              <Sparkles color="#a855f7" size={32} className="mb-4" />
              <Text className="text-white text-2xl font-black mb-2">{generatedProgram.name}</Text>
              <Text className="text-slate-400 text-xs leading-relaxed font-medium">{generatedProgram.description}</Text>
            </View>

            <Text className="text-slate-400 text-xs uppercase font-extrabold tracking-widest mt-2">Días del Programa</Text>

            <View className="gap-y-4">
              {generatedProgram.days.map((day, idx) => (
                <View key={idx} className="p-5 rounded-2xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                  <Text className="text-white font-extrabold text-base mb-3 border-b pb-2" style={{ borderColor: colors.border }}>{day.name}</Text>
                  <View className="gap-y-4">
                    {day.exercises.map((ex, exIdx) => (
                      <View key={exIdx} className="flex-row justify-between items-start">
                        <View className="flex-1 pr-4">
                          <Text className="text-white font-extrabold text-sm mb-1">{ex.name}</Text>
                          <Text className="text-slate-400 text-[10px] leading-relaxed italic font-medium">{ex.notes}</Text>
                        </View>
                        <View className="items-end">
                          <Text className="text-purple-400 font-black text-xs">{ex.sets_count} series</Text>
                          <Text className="text-slate-500 text-[10px] font-bold mt-0.5">{ex.reps_range} reps</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* 
        Barra Fija Inferior con Botones de Acción.
        Poblado con un generoso padding bottom y zIndex elevado.
      */}
      <View
        className="px-6 pb-6 pt-4 border-t flex-row gap-x-4 justify-between absolute bottom-0 left-0 right-0"
        style={{
          backgroundColor: colors.bg,
          borderColor: colors.border,
          paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 24) : Math.max(insets.bottom + 16, 24),
          height: Platform.OS === 'ios' ? 90 + insets.bottom : 90 + insets.bottom,
          zIndex: 100
        }}
      >
        {step < 5 ? (
          <>
            {step > 1 && (
              <TouchableOpacity
                onPress={() => setStep(step - 1)}
                className="flex-1 py-4 rounded-xl items-center justify-center border"
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
              >
                <Text className="text-slate-300 font-bold">Atrás</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => {
                if (step === 4) {
                  handleGenerate();
                } else {
                  setStep(step + 1);
                }
              }}
              disabled={isGenerating}
              className="flex-1 py-4 rounded-xl flex-row items-center justify-center gap-x-2 shadow-lg"
              style={{ backgroundColor: colors.accent, shadowColor: colors.accent, flex: step === 1 ? 1 : 2 }}
            >
              {isGenerating ? (
                <ActivityIndicator color={colors.accentText} size="small" />
              ) : (
                <>
                  <Text style={{ color: colors.accentText }} className="font-extrabold">
                    {step === 4 ? 'Generar Rutina 🧠' : 'Siguiente'}
                  </Text>
                  <ChevronRight color={colors.accentText} size={16} />
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              onPress={() => setStep(1)}
              className="flex-1 py-4 rounded-xl items-center justify-center border"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <Text className="text-slate-300 font-bold">Reconfigurar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSaveProgram}
              disabled={isGenerating}
              className="flex-1 py-4 bg-emerald-600 rounded-xl flex-row items-center justify-center gap-x-2 shadow-lg shadow-emerald-500/20"
              style={{ flex: 2 }}
            >
              {isGenerating ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <BookOpen color="white" size={18} />
                  <Text className="text-white font-extrabold">Guardar Programa 💾</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}
