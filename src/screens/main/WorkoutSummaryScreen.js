import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Share, Platform } from 'react-native';
import { Trophy, Dumbbell, Sparkles, ChevronRight, Share2, Flame, BookOpen } from 'lucide-react-native';
import useStore, { THEMES } from '../../store/useStore';
import Animated, { FadeIn, SlideInDown, BounceIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AchievementUnlockModal from '../../components/AchievementUnlockModal';
import { getEarnedAchievements } from '../../services/AchievementService';
import { scheduleInactivityNotification, scheduleMuscleRecoveryNotifications } from '../../services/NotificationService';

export default function WorkoutSummaryScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { workoutId, workoutName, date, flatEntries, prDetected, exercises, prevEarnedIds } = route.params || {};
  const saveRoutine = useStore(state => state.saveRoutine);
  const workouts = useStore(state => state.workouts);
  const globalTheme = useStore(state => state.theme);
  const colors = THEMES[globalTheme] || THEMES.midnight;

  const [volume, setVolume] = useState(0);
  const [isSavedAsRoutine, setIsSavedAsRoutine] = useState(false);
  
  // Estados para logros
  const [newAchievements, setNewAchievements] = useState([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!flatEntries) {
      navigation.replace('MainTabs');
      return;
    }

    const calcTotal = flatEntries.reduce((acc, curr) => acc + (curr.weight * curr.reps), 0);
    
    // Animar contador simple
    let currentVolume = 0;
    const interval = setInterval(() => {
      currentVolume += Math.ceil(calcTotal / 20);
      if (currentVolume >= calcTotal) {
        setVolume(calcTotal);
        clearInterval(interval);
      } else {
        setVolume(currentVolume);
      }
    }, 30);

    // Detección de nuevos logros unlocked en esta sesión
    if (workouts && workouts.length > 0 && prevEarnedIds) {
      // Obtener todos los logros incluyendo la sesión actual
      const currentEarned = getEarnedAchievements(workouts);
      
      // Filtrar los nuevos logros que no estaban en prevEarnedIds
      const prevSet = new Set(prevEarnedIds);
      const unlockedThisRound = currentEarned.filter(a => !prevSet.has(a.id));
      
      if (unlockedThisRound.length > 0) {
        setNewAchievements(unlockedThisRound);
        setShowModal(true);
      }
    }

    // Programar alertas locales de inactividad de forma segura (3 días a partir de hoy)
    scheduleInactivityNotification().catch(err => console.log('Error programando inactividad:', err));
    // Programar alertas locales de recuperación muscular basadas en estado de cansancio de forma segura
    scheduleMuscleRecoveryNotifications(workouts).catch(err => console.log('Error programando recuperación muscular:', err));

    return () => clearInterval(interval);
  }, [flatEntries, workouts]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `¡Acabo de levantar ${volume.toLocaleString()}kg en mi entrenamiento "${workoutName}" usando Elite Gym Tracker! 💪`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleSaveAsRoutine = async () => {
    await saveRoutine(workoutName, `Creada desde una sesión libre el ${date}`, exercises);
    setIsSavedAsRoutine(true);
  };

  if (!flatEntries) return null;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg }}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, paddingBottom: 40, alignItems: 'center' }}>
        
        <Animated.View entering={BounceIn.delay(200)} className="mb-10 items-center">
          <View className="w-24 h-24 rounded-full bg-blue-500/10 border-2 border-blue-500 items-center justify-center mb-6 shadow-2xl shadow-blue-500/50">
            {prDetected ? <Trophy size={48} color="#3b82f6" /> : <Flame size={48} color="#eab308" />}
          </View>
          <Text className="text-white text-3xl font-black text-center mb-2">¡Entrenamiento Completado!</Text>
          <Text className="text-slate-400 text-base">{workoutName}</Text>
        </Animated.View>

        <View className="flex-row gap-x-4 mb-10 w-full max-w-sm">
          <View className="flex-1 bg-slate-900 border-t-2 border-blue-500 rounded-2xl p-5 items-center">
            <Dumbbell size={24} color="#3b82f6" className="mb-3" />
            <Text className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">Volumen Total</Text>
            <View className="flex-row items-baseline">
              <Text className="text-white text-2xl font-black">{volume.toLocaleString()}</Text>
              <Text className="text-slate-500 text-sm ml-1 font-bold">kg</Text>
            </View>
          </View>

          <View className="flex-1 bg-slate-900 border-t-2 border-emerald-500 rounded-2xl p-5 items-center">
            <Sparkles size={24} color="#10b981" className="mb-3" />
            <Text className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">Series Totales</Text>
            <Text className="text-white text-2xl font-black">{flatEntries.length}</Text>
          </View>
        </View>

        {prDetected && (
          <Animated.View entering={FadeIn.delay(500)} className="w-full max-w-sm bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex-row items-center gap-x-4 mb-10">
            <View className="bg-emerald-500 w-10 h-10 rounded-full items-center justify-center">
              <Trophy size={20} color="#020617" />
            </View>
            <View className="flex-1">
              <Text className="text-emerald-400 font-bold">¡Nuevos Récords!</Text>
              <Text className="text-slate-400 text-xs">Has superado tus marcas históricas hoy.</Text>
            </View>
          </Animated.View>
        )}

        <View className="w-full max-w-sm gap-y-4">
          <TouchableOpacity 
            onPress={handleShare}
            className="w-full bg-slate-900 border border-slate-800 p-5 rounded-2xl flex-row justify-center items-center gap-x-3"
          >
            <Share2 size={20} color="white" />
            <Text className="text-white font-bold text-base">Compartir Logro</Text>
          </TouchableOpacity>

          {!isSavedAsRoutine ? (
            <TouchableOpacity 
              onPress={handleSaveAsRoutine}
              className="w-full bg-slate-900 border border-blue-500/50 p-5 rounded-2xl flex-row justify-center items-center gap-x-3"
            >
              <BookOpen size={20} color="#3b82f6" />
              <Text className="text-blue-500 font-bold text-base">Guardar como Rutina</Text>
            </TouchableOpacity>
          ) : (
            <View className="w-full p-4 items-center">
              <Text className="text-blue-500 font-bold">✅ ¡Añadida a tu Bitácora!</Text>
            </View>
          )}

          <TouchableOpacity 
            onPress={() => navigation.replace('MainTabs')}
            className="w-full bg-blue-600 p-5 rounded-2xl flex-row justify-center items-center gap-x-2 shadow-lg shadow-blue-600/30 mt-4"
          >
            <Text className="text-white font-bold text-lg text-center">Volver al Inicio</Text>
            <ChevronRight size={24} color="white" />
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Modal Premium de Logros */}
      <AchievementUnlockModal
        visible={showModal}
        achievements={newAchievements}
        onClose={() => setShowModal(false)}
        colors={colors}
      />
    </View>
  );
}
