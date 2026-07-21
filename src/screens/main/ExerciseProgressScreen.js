import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { ChevronLeft, TrendingUp, Target, Activity, Calendar } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polyline, Circle, Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import useStore, { THEMES } from '../../store/useStore';
import Animated, { FadeIn } from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const CHART_HEIGHT = 200;
const CHART_PADDING = 40;

const SimpleLineChart = ({ data, color, dataKey }) => {
  if (!data || data.length < 2) return null;

  const maxVal = Math.max(...data.map(d => d[dataKey]));
  const minVal = Math.min(...data.map(d => d[dataKey]));
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => {
    const x = CHART_PADDING + (i * (width - CHART_PADDING * 2) / (data.length - 1));
    const y = CHART_HEIGHT - CHART_PADDING - ((d[dataKey] - minVal) * (CHART_HEIGHT - CHART_PADDING * 2) / range);
    return { x, y };
  });

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');
  
  // Create area path
  const areaPath = `M ${points[0].x} ${CHART_HEIGHT - CHART_PADDING} ` + 
                   points.map(p => `L ${p.x} ${p.y}`).join(' ') + 
                   ` L ${points[points.length-1].x} ${CHART_HEIGHT - CHART_PADDING} Z`;

  return (
    <View style={{ height: CHART_HEIGHT, width: '100%' }}>
      <Svg height={CHART_HEIGHT} width={width - 40}>
        <Defs>
          <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.3" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#grad)" />
        <Polyline
          points={polylinePoints}
          fill="none"
          stroke={color}
          strokeWidth="3"
        />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r="4" fill={color} stroke="#020617" strokeWidth="2" />
        ))}
      </Svg>
      <View className="flex-row justify-between px-2 mt-2">
         <Text className="text-slate-500 text-[8px] font-bold">{data[0].date}</Text>
         <Text className="text-slate-500 text-[8px] font-bold">{data[data.length-1].date}</Text>
      </View>
    </View>
  );
};

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
      const rms = session.entries.map(e => e.weight * (1 + (e.reps / 30)));
      const maxRM = Math.round(Math.max(...rms));
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
      <View className="px-5 py-4 border-b border-slate-900 flex-row items-center gap-x-4">
        <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 rounded-full bg-slate-900 items-center justify-center">
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
           <View className="flex-1 bg-slate-900 p-4 rounded-3xl border border-slate-800 items-center">
              <Target size={16} color="#3b82f6" className="mb-2" />
              <Text className="text-white text-lg font-black">{currentStats.rm1}k</Text>
              <Text className="text-slate-500 text-[8px] font-bold uppercase tracking-tighter">1RM Est.</Text>
           </View>
           <View className="flex-1 bg-slate-900 p-4 rounded-3xl border border-slate-800 items-center">
              <TrendingUp size={16} color="#8b5cf6" className="mb-2" />
              <Text className="text-white text-lg font-black">{currentStats.weight}k</Text>
              <Text className="text-slate-500 text-[8px] font-bold uppercase tracking-tighter">Max Peso</Text>
           </View>
           <View className="flex-1 bg-slate-900 p-4 rounded-3xl border border-slate-800 items-center">
              <Activity size={16} color="#10b981" className="mb-2" />
              <Text className="text-white text-lg font-black">{currentStats.volume > 1000 ? (currentStats.volume/1000).toFixed(1)+'k' : currentStats.volume}</Text>
              <Text className="text-slate-500 text-[8px] font-bold uppercase tracking-tighter">Volumen</Text>
           </View>
        </View>

        {chartData.length < 2 ? (
          <View className="bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl p-10 items-center">
             <Calendar size={48} color="#475569" opacity={0.3} className="mb-4" />
             <Text className="text-slate-500 text-center text-sm font-medium">Necesitas al menos 2 sesiones para generar gráficas.</Text>
          </View>
        ) : (
          <View className="gap-y-8">
            <Animated.View entering={FadeIn.delay(100)} className="bg-slate-900 p-6 rounded-[32px] border border-slate-800">
               <View className="flex-row justify-between items-center mb-6">
                 <Text className="text-white font-black text-base">Fuerza Estimada (1RM)</Text>
                 <View className="flex-row items-center gap-x-1">
                    <Text style={{ color: getTrend(currentStats.rm1, prevStats.rm1) >= 0 ? '#10b981' : '#ef4444' }} className="text-xs font-black">
                      {getTrend(currentStats.rm1, prevStats.rm1)}%
                    </Text>
                 </View>
               </View>
               <SimpleLineChart data={chartData} color="#3b82f6" dataKey="rm1" />
            </Animated.View>

            <Animated.View entering={FadeIn.delay(300)} className="bg-slate-900 p-6 rounded-[32px] border border-slate-800">
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
