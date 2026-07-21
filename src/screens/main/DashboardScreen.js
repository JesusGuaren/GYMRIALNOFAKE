import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Dumbbell, Flame, LogOut, User as UserIcon, ChevronRight, BookOpen, Sparkles, Bot, X, Send, Trophy, Zap, MessageSquare, Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import useStore, { THEMES } from '../../store/useStore';
import { getRankByWeight, calculate1RM } from '../../lib/rankingSystem';
import MuscleHeatmapNative from '../../components/MuscleHeatmapNative';
import SolidCard from '../../components/common/SolidCard';
import PreciseButton from '../../components/common/PreciseButton';
import { calculateStreak, getEarnedAchievements } from '../../services/AchievementService';
import InteractiveBodySection from '../../components/InteractiveBodySection';
import { normalizeMuscleGroup, translateMuscleGroup } from '../../constants/Muscles';
import ContextualTooltip from '../../components/common/ContextualTooltip';


export default function DashboardScreen({ navigation }) {
  const { workouts, logout, programs, currentActiveWorkout, theme, routines, completedTutorials, markTutorialCompleted } = useStore();
  const colors = THEMES[theme] || THEMES.midnight;

  console.log("[Render Debug] DashboardScreen rendering...");

  const [selectedMuscle, setSelectedMuscle] = useState(null);
  const mainScrollViewRef = useRef();

  const activeProgram = (programs || []).find(p => p.is_active);

  // 1. Comprobar si completó sesión hoy (Contexto diario)
  const todayWorkout = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return (workouts || []).find(w => w.workout_date === todayStr && !w.name?.endsWith('\u200B'));
  }, [workouts]);

  // 2. Recomendación sugerida de rutina (Siguiente en secuencia)
  const recommendedRoutine = useMemo(() => {
    if ((workouts || []).length === 0) return (routines || [])[0] || null;
    const lastWorkout = (workouts || []).find(w => !w.name?.endsWith('\u200B'));
    if (!lastWorkout) return (routines || [])[0] || null;

    const programRoutines = (routines || []).filter(r => r.program_id === activeProgram?.id);
    const targetList = programRoutines.length > 0 ? programRoutines : (routines || []);
    if (targetList.length === 0) return null;

    const lastIdx = targetList.findIndex(r => r.name.toLowerCase() === lastWorkout.name?.toLowerCase());
    if (lastIdx === -1 || lastIdx === targetList.length - 1) {
      return targetList[0];
    }
    return targetList[lastIdx + 1];
  }, [workouts, activeProgram, routines]);

  // 3. XP / Niveles
  const levelInfo = useMemo(() => {
    const { calculateUserXP, getLevelInfo: getLvl } = require('../../services/AchievementService');
    const xp = calculateUserXP(workouts);
    return getLvl(xp);
  }, [workouts]);

  const globalRank = useMemo(() => {
    let bestRankRatio = -1;
    let rank = getRankByWeight(0, 'Arms'); 
    workouts.forEach(w => {
      w.workout_entries?.forEach(e => {
        const rawMg = e.exercises?.muscle_group || 'Arms';
        const mg = normalizeMuscleGroup(rawMg);
        const exName = e.exercises?.name || '';
        const rm = calculate1RM(e.weight, e.reps);
        const r = getRankByWeight(rm, mg, exName);
        if (r.minRatio > bestRankRatio) {
          bestRankRatio = r.minRatio;
          rank = r;
        }
      });
    });
    return rank;
  }, [workouts]);

  // Total volume calculation
  const totalVolumeKg = useMemo(() => {
    return workouts.reduce((acc, w) => acc + (w.workout_entries?.reduce((a, e) => a + ((e.weight || 0) * (e.reps || 0)), 0) || 0), 0);
  }, [workouts]);

  const formatTonnageShort = (kg) => {
    if (!kg) return '0 t';
    return `${(kg / 1000).toFixed(1)} t`;
  };

  const getHeroData = () => {
    if (currentActiveWorkout) {
      return {
        label: 'ENTRENAMIENTO EN CURSO ⚡',
        labelColor: '#10b981',
        title: currentActiveWorkout.name || 'Entrenamiento Activo',
        description: 'Tienes una sesión de fuerza iniciada. Continúa para registrar tus marcas y evitar desentrenamiento.',
        btnText: 'CONTINUAR SESIÓN ACTIVA',
        variant: 'success'
      };
    }
    if (todayWorkout) {
      return {
        label: 'SESIÓN COMPLETADA HOY ✓',
        labelColor: colors.accent,
        title: todayWorkout.name,
        description: `Rutina de hoy registrada con éxito. Fibras musculares en reconstrucción activa.`,
        btnText: 'INICIAR SESIÓN ADICIONAL',
        variant: 'secondary'
      };
    }
    if (recommendedRoutine) {
      const routineMuscles = new Set();
      recommendedRoutine.routine_exercises?.forEach(re => {
        const mg = re.exercises?.muscle_group;
        if (mg) {
          routineMuscles.add(translateMuscleGroup(mg));
        }
      });
      const musclesStr = Array.from(routineMuscles).join(', ');
      return {
        label: 'PRÓXIMA RUTINA SUGERIDA 🔥',
        labelColor: colors.accent,
        title: recommendedRoutine.name,
        description: `Sesión enfocada en ${musclesStr || 'fuerza general'}. Diseñada para continuar tu progresión semanal.`,
        btnText: `ENTRENAR: ${recommendedRoutine.name.toUpperCase()}`,
        variant: 'primary'
      };
    }
    if (workouts.length === 0) {
      return {
        label: 'COMIENZA TU PROGRESO 🚀',
        labelColor: colors.accent,
        title: 'Tu primer entrenamiento',
        description: 'Registra tus series de trabajo con RPE para calcular tu fatiga y 1RM.',
        btnText: 'INICIAR TU PRIMERA SESIÓN',
        variant: 'primary'
      };
    }
    return {
      label: 'LISTO PARA EL GIMNASIO 🏋️',
      labelColor: colors.accent,
      title: 'Iniciar nueva sesión',
      description: 'Elige una de tus rutinas personalizadas o inicia un entrenamiento libre.',
      btnText: 'SELECCIONAR RUTINA',
      variant: 'primary'
    };
  };

  const hero = getHeroData();

  // Notification indicator based on neglected muscles or active workout
  const hasNotification = useMemo(() => {
    if (currentActiveWorkout) return true;
    
    const activeWorkouts = workouts.filter(w => !w.name?.endsWith('\u200B'));
    const muscleLastTrained = {};
    const now = new Date();
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
    
    for (const [_, lastDate] of Object.entries(muscleLastTrained)) {
      const diff = (now - lastDate) / (1000 * 60 * 60 * 24);
      if (diff > 7) return true;
    }
    return false;
  }, [workouts, currentActiveWorkout]);

  const handleHeaderCoachPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('Coach');
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg }}>
      <ScrollView 
        ref={mainScrollViewRef}
        className="flex-1" 
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 100 }}
      >
      {/* Header */}
      <View className="flex-row justify-between items-center mb-6">
        <TouchableOpacity 
          onPress={() => navigation.navigate('Profile')}
          className="flex-row items-center flex-1 mr-4"
        >
          <View 
            className="w-10 h-10 rounded-full border items-center justify-center mr-3"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <UserIcon color="#f8fafc" size={20} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-outfit-bold text-white leading-tight">Hola, Atleta</Text>
            <View className="flex-row items-center gap-x-2 mt-0.5">
              <Text className="text-[9px] font-inter-semibold text-slate-500 uppercase tracking-wider">
                NIVEL {levelInfo.level} • {globalRank.name}
              </Text>
            </View>
            {/* XP PROGRESS BAR */}
            <View className="flex-row items-center gap-x-2 mt-1.5 w-11/12">
              <View className="flex-grow h-1.5 rounded-full bg-slate-900 overflow-hidden border border-slate-800/40">
                <View 
                  className="h-full rounded-full" 
                  style={{ width: `${levelInfo.progress * 100}%`, backgroundColor: colors.accent }} 
                />
              </View>
              <Text className="text-[8px] font-inter-bold text-slate-400">
                {Math.round(levelInfo.progress * 100)}%
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Elite Coach Robot Button */}
        <TouchableOpacity 
          onPress={handleHeaderCoachPress} 
          className="w-10 h-10 rounded-xl border items-center justify-center mr-2 relative"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <Bot color={colors.accent} size={18} />
          {hasNotification && (
            <View 
              className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-950"
              style={{ shadowColor: '#10b981', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 3 }}
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={logout} 
          className="w-10 h-10 rounded-xl border items-center justify-center"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <LogOut color="#f43f5e" size={18} />
        </TouchableOpacity>
      </View>

      {/* Barra de Progreso y Estatus */}
      <View className="flex-row justify-between gap-x-3 mb-6">
        <View className="flex-1 p-3 rounded-2xl border flex-row items-center justify-center gap-x-2" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <Flame size={16} color="#f97316" />
          <View>
            <Text className="text-white font-outfit-bold text-[11px]">{calculateStreak(workouts)} días</Text>
            <Text className="text-[7px] font-inter-semibold text-slate-500 uppercase tracking-widest mt-0.5">RACHA</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          onPress={() => navigation.navigate('Achievements')}
          className="flex-1 p-3 rounded-2xl border flex-row items-center justify-center gap-x-2" 
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <Trophy size={16} color="#fbbf24" />
          <View>
            <Text className="text-white font-outfit-bold text-[11px]">{getEarnedAchievements(workouts).length} logros</Text>
            <Text className="text-[7px] font-inter-semibold text-slate-500 uppercase tracking-widest mt-0.5">LOGROS</Text>
          </View>
        </TouchableOpacity>

        <View className="flex-1 p-3 rounded-2xl border flex-row items-center justify-center gap-x-2" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <Zap size={16} color={colors.accent} />
          <View>
            <Text className="text-white font-outfit-bold text-[11px]">{formatTonnageShort(totalVolumeKg)}</Text>
            <Text className="text-[7px] font-inter-semibold text-slate-500 uppercase tracking-widest mt-0.5">VOLUMEN</Text>
          </View>
        </View>
      </View>

      {/* Hero Workout Card (Unified with Active Program) */}
      <View 
        className="p-5 rounded-[24px] border mb-6"
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
      >
        <View className="flex-row justify-between items-center mb-2">
          <Text 
            style={{ color: hero.labelColor }} 
            className="text-[9px] font-inter-bold uppercase tracking-widest"
          >
            {hero.label}
          </Text>
          {activeProgram && (
            <View className="flex-row items-center gap-x-1 bg-slate-900/60 px-2 py-0.5 rounded-full border border-slate-800/40">
              <BookOpen size={9} color={colors.accent} />
              <Text style={{ color: colors.accent }} className="text-[8px] font-inter-bold uppercase tracking-wider">
                {activeProgram.name}
              </Text>
            </View>
          )}
        </View>

        <Text className="text-xl font-outfit-bold text-white mb-1.5 leading-snug">
          {hero.title}
        </Text>
        <Text className="text-slate-400 text-xs font-inter-medium mb-4 leading-relaxed">
          {hero.description}
        </Text>

        <PreciseButton
          onPress={() => {
            if (currentActiveWorkout) {
              navigation.navigate('ActiveWorkout');
            } else {
              navigation.navigate('WorkoutSetup');
            }
          }}
          variant={hero.variant}
          className="w-full h-12 rounded-xl"
        >
          <Flame size={16} color={hero.variant === 'secondary' ? colors.accent : 'white'} className="mr-2" />
          <Text 
            style={{ color: hero.variant === 'secondary' ? colors.accent : 'white' }} 
            className="text-xs font-outfit-bold tracking-wider uppercase"
          >
            {hero.btnText}
          </Text>
        </PreciseButton>
      </View>

      {/* ¿Cómo está mi cuerpo? & ¿Qué recomienda Elite? (InteractiveBodySection) */}
      <InteractiveBodySection 
        workouts={workouts} 
        colors={colors} 
        navigation={navigation}
        todayWorkout={todayWorkout}
        activeProgram={activeProgram}
        programs={programs}
        recommendedRoutine={recommendedRoutine}
        selectedMuscle={selectedMuscle}
        setSelectedMuscle={setSelectedMuscle}
      />

      {/* Actividad Reciente (Compact summary card of the last session) */}
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-xs font-outfit-bold text-slate-500 uppercase tracking-widest">Actividad Reciente</Text>
      </View>

      {workouts.length > 0 ? (
        (() => {
          const w = workouts[0];
          const tonnage = w.workout_entries?.reduce((acc, e) => acc + ((e.weight || 0) * (e.reps || 0)), 0) || 0;
          const dateObj = new Date(w.workout_date);
          const dateLabel = dateObj.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }).toUpperCase();
          
          return (
            <TouchableOpacity 
              onPress={() => navigation.navigate('Bitácora')}
              activeOpacity={0.8}
              className="p-4 rounded-2xl border flex-row justify-between items-center mb-6"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <View className="flex-row items-center gap-x-4 flex-1">
                {/* Left date block */}
                <View className="items-center justify-center bg-slate-900 border border-slate-800/80 rounded-xl px-2.5 py-1.5">
                  <Text className="text-[8px] font-inter-bold text-slate-500 uppercase">Última</Text>
                  <Text style={{ color: colors.accent }} className="text-xs font-outfit-bold">{dateLabel}</Text>
                </View>
                
                {/* Info */}
                <View className="flex-1">
                  <Text className="font-outfit-bold text-white text-sm leading-snug">{w.name}</Text>
                  <Text className="text-slate-400 font-inter-medium text-[10px] mt-0.5">
                    {new Set(w.workout_entries?.map(e => e.exercise_id)).size || 0} ejerc. • {formatTonnageShort(tonnage)} movidos
                  </Text>
                </View>
              </View>

              {/* Right action link */}
              <View className="flex-row items-center gap-x-1">
                <Text style={{ color: colors.accent }} className="text-[10px] font-outfit-bold uppercase tracking-wider">Ver Bitácora</Text>
                <ChevronRight size={12} color={colors.accent} />
              </View>
            </TouchableOpacity>
          );
        })()
      ) : (
        <View className="bg-slate-900/40 border border-slate-800 p-6 rounded-[32px] items-center justify-center py-8 mt-2 mb-6">
          <View className="w-12 h-12 rounded-full bg-slate-950 items-center justify-center mb-4 border border-slate-850">
            <Trophy size={20} color="#64748b" />
          </View>
          <Text className="text-white font-black text-sm text-center">Sin entrenamientos registrados</Text>
          <Text className="text-slate-400 text-xs text-center mt-1 px-4 leading-relaxed font-medium">
            Completa tu primera sesión para comenzar a acumular XP, subir de nivel, ver tus gráficos de volumen y recibir consejos del Coach inteligente.
          </Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('WorkoutSetup')}
            className="mt-5 px-6 py-2.5 bg-blue-600 rounded-2xl flex-row items-center gap-x-1.5 shadow-lg shadow-blue-600/20"
          >
            <Plus size={16} color="white" strokeWidth={2.5} />
            <Text className="text-white font-bold text-xs uppercase">Iniciar Entrenamiento</Text>
          </TouchableOpacity>
        </View>
      )}
      </ScrollView>

      <ContextualTooltip
        visible={completedTutorials ? !completedTutorials.dashboard : true}
        title="Tu Dashboard"
        description="Aquí verás un resumen de tu nivel, tu historial de tonelaje y un mapa térmico interactivo que calcula la recuperación de tus fibras musculares en tiempo real."
        stepText="Paso 1 / 4"
        onNext={() => markTutorialCompleted('dashboard')}
        onDismiss={() => markTutorialCompleted('dashboard')}
      />
    </View>
  );
}

