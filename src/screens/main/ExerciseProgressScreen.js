import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { ChevronLeft, TrendingUp, Target, Activity, Calendar } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStore, { THEMES } from '../../store/useStore';
import { calculate1RM } from '../../lib/rankingSystem';
import Animated, { FadeIn } from 'react-native-reanimated';
import SimpleLineChart from '../../components/common/SimpleLineChart';

export default function ExerciseProgressScreen({ route, navigation }) {
  const { id } = route.params;
  const insets = useSafeAreaInsets();
  const { workouts, theme, exercises } = useStore();
  const colors = THEMES[theme] || THEMES.midnight;

  const exercise = useMemo(() => exercises.find(ex => String(ex.id) === String(id)), [exercises, id]);

  const chartData = useMemo(() => {
    if (!exercise || !workouts.length) return [];
    const entries = [];
    workouts.forEach(w => {
      const exEntries = w.workout_entries?.filter(e => e.exercise_id === exercise.id) || [];
      if (exEntries.length > 0) entries.push({ date: w.workout_date, entries: exEntries });
    });
    entries.sort((a, b) => new Date(a.date) - new Date(b.date));

    return entries.map(session => {
      const weights = session.entries.map(e => e.weight);
      const maxWeight = Math.max(...weights);
      const rms = session.entries.map(e => calculate1RM(e.weight, e.reps));
      const maxRM = Math.max(...rms);
      const volume = session.entries.reduce((acc, e) => acc + (e.weight * e.reps), 0);
      return {
        date: new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        weight: maxWeight,
        rm1: maxRM,
        volume: volume
      };
    });
  }, [exercise, workouts]);

  if (!exercise) return null;

  const currentStats = chartData[chartData.length - 1] || { weight: 0, rm1: 0, volume: 0 };
  const prevStats = chartData[chartData.length - 2] || { weight: 0, rm1: 0, volume: 0 };

  const getTrend = (curr, prev) => {
    if (!prev || prev === 0) return 0;
    return (((curr - prev) / prev) * 100).toFixed(1);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View className="px-5 py-4 border-b flex-row items-center gap-x-4" style={{ borderColor: colors.border }}>
        <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: colors.card }}>
          <ChevronLeft color="white" size={20} />
        </TouchableOpacity>
        <View>
          <Text className="text-white text-xl font-black">{exercise.name}</Text>
          <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest">Análisis de Progresión</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Stats Cards */}
        <View className="flex-row gap-x-3 mb-8">
           <View className="flex-1 p-4 rounded-3xl border items-center" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
              <Target size={16} color={colors.accent} className="mb-2" />
              <Text className="text-white text-lg font-black">{currentStats.rm1}kg</Text>
              <Text className="text-slate-500 text-[8px] font-bold uppercase tracking-tighter">1RM Est.</Text>
           </View>
           <View className="flex-1 p-4 rounded-3xl border items-center" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
              <TrendingUp size={16} color="#8b5cf6" className="mb-2" />
              <Text className="text-white text-lg font-black">{currentStats.weight}kg</Text>
              <Text className="text-slate-500 text-[8px] font-bold uppercase tracking-tighter">Max Peso</Text>
           </View>
           <View className="flex-1 p-4 rounded-3xl border items-center" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
              <Activity size={16} color="#10b981" className="mb-2" />
              <Text className="text-white text-lg font-black">{currentStats.volume > 1000 ? (currentStats.volume/1000).toFixed(1)+'k' : currentStats.volume}</Text>
              <Text className="text-slate-500 text-[8px] font-bold uppercase tracking-tighter">Volumen</Text>
           </View>
        </View>

        {chartData.length < 2 ? (
          <View className="border border-dashed rounded-3xl p-10 items-center" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
             <Calendar size={48} color="#475569" opacity={0.3} className="mb-4" />
             <Text className="text-slate-500 text-center text-sm font-medium">Necesitas al menos 2 sesiones para generar gráficas.</Text>
          </View>
        ) : (
          <View className="gap-y-8">
            <Animated.View entering={FadeIn.delay(100)} className="p-6 rounded-[32px] border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
               <View className="flex-row justify-between items-center mb-6">
                 <Text className="text-white font-black text-base">Fuerza Estimada (1RM)</Text>
                 <View className="flex-row items-center gap-x-1">
                    <Text style={{ color: getTrend(currentStats.rm1, prevStats.rm1) >= 0 ? '#10b981' : '#ef4444' }} className="text-xs font-black">
                      {getTrend(currentStats.rm1, prevStats.rm1)}%
                    </Text>
                 </View>
               </View>
               <SimpleLineChart data={chartData} color={colors.accent} dataKey="rm1" />
            </Animated.View>

            <Animated.View entering={FadeIn.delay(300)} className="p-6 rounded-[32px] border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
               <View className="flex-row justify-between items-center mb-6">
                 <Text className="text-white font-black text-base">Carga de Trabajo (Volumen)</Text>
                 <View className="flex-row items-center gap-x-1">
                    <Text style={{ color: getTrend(currentStats.volume, prevStats.volume) >= 0 ? '#8b5cf6' : '#ef4444' }} className="text-xs font-black">
                      {getTrend(currentStats.volume, prevStats.volume)}%
                    </Text>
                 </View>
               </View>
               <SimpleLineChart data={chartData} color="#8b5cf6" dataKey="volume" />
            </Animated.View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
