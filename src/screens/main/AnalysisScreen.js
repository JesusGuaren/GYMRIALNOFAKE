import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Dimensions, Image, Modal } from 'react-native';
import { TrendingUp, Award, Calendar, AlertCircle, CheckCircle, ChevronRight, Activity, ArrowUpRight, ArrowDownRight, Search, Zap, BarChart3, Clock, Target, Trophy, HelpCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, G, Text as SvgText, Path, Defs, LinearGradient, Stop, Polyline } from 'react-native-svg';
import useStore, { THEMES } from '../../store/useStore';
import { calculateVolumeProfile, compareVolumes } from '../../services/VolumeService';
import { analyzeRoutine } from '../../services/RoutineIntelligence';
import { getMuscleRecoveryStates } from '../../services/CoachingService';
import { getRankByWeight, calculate1RM } from '../../lib/rankingSystem';
import Animated, { FadeIn, FadeInDown, Layout } from 'react-native-reanimated';
import { normalizeMuscleGroup, translateMuscleGroup } from '../../constants/Muscles';
import ContextualTooltip from '../../components/common/ContextualTooltip';

const { width } = Dimensions.get('window');

const MUSCLE_COLORS = {
  'Chest': '#3b82f6',
  'Back': '#10b981',
  'Legs': '#f59e0b',
  'Shoulders': '#ec4899',
  'Arms': '#8b5cf6',
  'Core': '#f43f5e',
  'UNKNOWN': '#64748b'
};

const getMuscleColor = (muscle) => {
  const norm = normalizeMuscleGroup(muscle);
  return MUSCLE_COLORS[norm] || '#64748b';
};

// Datos simulados premium para el Modo Demo
const demoTonnageHistory = [
  { label: 'Hace 4 sem', tonnage: 8200 },
  { label: 'Hace 3 sem', tonnage: 9500 },
  { label: 'Hace 2 sem', tonnage: 11200 },
  { label: 'Hace 1 sem', tonnage: 10400 },
  { label: 'Sem Act', tonnage: 13500 },
];

const demoMuscleVolume = {
  'Chest': 14200,
  'Back': 12500,
  'Legs': 18400,
  'Shoulders': 9200,
  'Arms': 6800,
  'Core': 3200
};

// COMPONENTE: Gráfico de Tonelaje Semanal SVG
const WeeklyTonnageChart = ({ data, color }) => {
  const chartWidth = width - 48; // se adapta responsive al contenedor
  const chartHeight = 150;
  const paddingX = 40;
  const paddingY = 25;

  if (!data || data.length === 0) return null;

  const maxVal = Math.max(...data.map(d => d.tonnage), 1000);
  const minVal = 0;
  const range = maxVal - minVal;

  const points = data.map((d, i) => {
    const x = paddingX + (i * (chartWidth - paddingX * 2) / (data.length - 1));
    const y = chartHeight - paddingY - (d.tonnage * (chartHeight - paddingY * 2) / range);
    return { x, y, val: d.tonnage, label: d.label };
  });

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');
  const areaPath = points.length > 0 
    ? `M ${points[0].x} ${chartHeight - paddingY} ` + 
      points.map(p => `L ${p.x} ${p.y}`).join(' ') + 
      ` L ${points[points.length-1].x} ${chartHeight - paddingY} Z`
    : '';

  return (
    <View style={{ height: chartHeight, width: '100%', alignItems: 'center' }}>
      <Svg height={chartHeight} width={chartWidth}>
        <Defs>
          <LinearGradient id="tonnageGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.35" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        
        {/* Líneas de cuadrícula horizontal */}
        {[0, 0.5, 1].map((ratio, index) => {
          const y = paddingY + ratio * (chartHeight - paddingY * 2);
          const gridVal = Math.round(maxVal - ratio * range);
          return (
            <G key={index}>
              <Path 
                d={`M ${paddingX} ${y} L ${chartWidth - paddingX} ${y}`} 
                stroke="#334155" 
                strokeWidth="1" 
                strokeDasharray="4 4" 
                opacity="0.25"
              />
              <SvgText 
                x={paddingX - 8} 
                y={y + 3} 
                fill="#475569" 
                fontSize="8" 
                fontWeight="bold" 
                textAnchor="end"
              >
                {gridVal >= 1000 ? `${(gridVal/1000).toFixed(0)}k` : gridVal}
              </SvgText>
            </G>
          );
        })}

        {/* Área degradada debajo de la línea */}
        {points.length > 0 && <Path d={areaPath} fill="url(#tonnageGrad)" />}
        
        {/* Línea principal */}
        <Polyline
          points={polylinePoints}
          fill="none"
          stroke={color}
          strokeWidth="3.5"
        />
        
        {/* Nodos y etiquetas */}
        {points.map((p, i) => (
          <G key={i}>
            <Circle cx={p.x} cy={p.y} r="7" fill={color} fillOpacity="0.15" />
            <Circle cx={p.x} cy={p.y} r="3.5" fill={color} stroke="#020617" strokeWidth="2" />
            
            {/* Valor encima del nodo */}
            <SvgText 
              x={p.x} 
              y={p.y - 10} 
              fill="#e2e8f0" 
              fontSize="9" 
              fontWeight="bold" 
              textAnchor="middle"
            >
              {p.val > 0 ? (p.val >= 1000 ? `${(p.val/1000).toFixed(1)}k` : p.val) : '0'}
            </SvgText>

            {/* Etiqueta del eje X */}
            <SvgText 
              x={p.x} 
              y={chartHeight - 4} 
              fill="#64748b" 
              fontSize="9" 
              fontWeight="bold" 
              textAnchor="middle"
            >
              {p.label}
            </SvgText>
          </G>
        ))}
      </Svg>
    </View>
  );
};

// COMPONENTE: Gráfico de Dona de Volumen Muscular SVG
const MuscleVolumeDonutChart = ({ data }) => {
  const chartSize = 150;
  const radius = 52;
  const strokeWidth = 12;
  const center = chartSize / 2;
  const circumference = 2 * Math.PI * radius;

  const totalVolume = Object.values(data).reduce((acc, v) => acc + v, 0);

  if (totalVolume === 0) {
    return (
      <View className="items-center py-6">
        <Text className="text-slate-500 text-xs">Registra volumen para ver el gráfico.</Text>
      </View>
    );
  }

  const sortedData = Object.entries(data)
    .map(([muscle, volume]) => ({
      muscle,
      volume,
      percent: (volume / totalVolume) * 100,
      color: getMuscleColor(muscle)
    }))
    .sort((a, b) => b.volume - a.volume);

  // Pre-compute arc offsets to avoid mutation during render
  const arcs = [];
  let runningPercent = 0;
  for (const item of sortedData) {
    arcs.push({
      ...item,
      startAngle: (runningPercent / 100) * 360,
      dashOffset: circumference - (circumference * item.percent) / 100
    });
    runningPercent += item.percent;
  }

  return (
    <View className="flex-row items-center justify-between gap-x-4">
      {/* Gráfico Circular Dona */}
      <View style={{ width: chartSize, height: chartSize, justifyContent: 'center', alignItems: 'center' }}>
        <Svg width={chartSize} height={chartSize}>
          {/* Círculo base de fondo */}
          <Circle 
            cx={center} 
            cy={center} 
            r={radius} 
            fill="none" 
            stroke="#1e293b" 
            strokeWidth={strokeWidth} 
            opacity={0.3}
          />
          {arcs.map((arc, index) => (
            <G key={index} transform={`rotate(${arc.startAngle - 90} ${center} ${center})`}>
              <Circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={arc.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={arc.dashOffset}
                strokeLinecap="round"
              />
            </G>
          ))}
        </Svg>
        {/* Panel de Texto Central */}
        <View className="absolute items-center">
          <Text className="text-slate-500 text-[8px] font-bold uppercase tracking-widest">VOL TOTAL</Text>
          <Text className="text-white text-base font-black mt-0.5">
            {totalVolume >= 1000 ? `${(totalVolume/1000).toFixed(0)}k` : totalVolume}
          </Text>
          <Text className="text-slate-500 text-[8px] font-bold">kg</Text>
        </View>
      </View>

      {/* Panel de Leyenda */}
      <View className="flex-1 gap-y-2">
        {sortedData.slice(0, 5).map((item, index) => (
          <View key={index} className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-x-2">
              <View style={{ backgroundColor: item.color }} className="w-2.5 h-2.5 rounded-full" />
              <Text className="text-slate-300 text-xs font-bold">{translateMuscleGroup(item.muscle)}</Text>
            </View>
            <View className="items-end">
              <Text className="text-white text-xs font-black">{item.percent.toFixed(0)}%</Text>
              <Text className="text-[8px] text-slate-500 font-bold">{item.volume.toLocaleString()} kg</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

export default function AnalysisScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { workouts, theme, exercises: exercises_db, completedTutorials, markTutorialCompleted } = useStore();
  const colors = THEMES[theme] || THEMES.midnight;

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [viewMode, setViewMode] = useState('weekly'); // 'weekly' | 'historical'
  const [useDemoData, setUseDemoData] = useState(false);
  const [helpTopic, setHelpTopic] = useState(null);

  const stats = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Filter workouts
    const currentWeekWorkouts = workouts.filter(w => new Date(w.workout_date) >= oneWeekAgo);
    const lastWeekWorkouts = workouts.filter(w => new Date(w.workout_date) >= twoWeeksAgo && new Date(w.workout_date) < oneWeekAgo);
    const thirtyDayWorkouts = workouts.filter(w => new Date(w.workout_date) >= thirtyDaysAgo);

    // Current Week Exercises
    const currentExercises = currentWeekWorkouts.flatMap(w => {
      const exMap = {};
      w.workout_entries?.forEach(e => {
        if (!exMap[e.exercise_id]) exMap[e.exercise_id] = { exercise_id: e.exercise_id, name: e.exercises?.name, muscle_group: e.exercises?.muscle_group, sets: [] };
        exMap[e.exercise_id].sets.push(e);
      });
      return Object.values(exMap);
    });

    const lastExercises = lastWeekWorkouts.flatMap(w => {
      const exMap = {};
      w.workout_entries?.forEach(e => {
        if (!exMap[e.exercise_id]) exMap[e.exercise_id] = { muscle_group: e.exercises?.muscle_group, sets: [] };
        exMap[e.exercise_id].sets.push(e);
      });
      return Object.values(exMap);
    });

    // Monthly Muscle Volume
    const monthlyMuscleVolume = {};
    thirtyDayWorkouts.forEach(w => {
      w.workout_entries?.forEach(e => {
        const mg = e.exercises?.muscle_group || 'Other';
        const normMg = normalizeMuscleGroup(mg);
        monthlyMuscleVolume[normMg] = (monthlyMuscleVolume[normMg] || 0) + (e.weight * e.reps);
      });
    });

    // Calcular Historial de Tonelaje de las últimas 5 semanas
    const tonnageHistory = [];
    for (let i = 4; i >= 0; i--) {
      const start = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const end = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const weekWorkouts = workouts.filter(w => {
        const d = new Date(w.workout_date);
        return d >= start && d < end;
      });
      let tonnage = 0;
      weekWorkouts.forEach(w => {
        w.workout_entries?.forEach(e => {
          tonnage += (e.weight || 0) * (e.reps || 0);
        });
      });
      tonnageHistory.push({
        label: i === 0 ? 'Sem Act' : `Hace ${i} s`,
        tonnage: tonnage
      });
    }

    const currentProfile = calculateVolumeProfile(currentExercises);
    const lastProfile = calculateVolumeProfile(lastExercises);
    const comparison = compareVolumes(currentProfile, lastProfile);
    const analysis = analyzeRoutine(currentExercises);

    return {
      current: {
        sessions: currentWeekWorkouts.length,
        tonnage: Object.values(currentProfile).reduce((acc, d) => acc + d.tonnage, 0),
        sets: currentExercises.reduce((acc, ex) => acc + ex.sets.length, 0),
        profile: currentProfile
      },
      last: {
        tonnage: Object.values(lastProfile).reduce((acc, d) => acc + d.tonnage, 0)
      },
      comparison,
      analysis,
      recovery: getMuscleRecoveryStates(workouts),
      monthlyVolume: monthlyMuscleVolume,
      tonnageHistory
    };
  }, [workouts]);

  const tonnageDiffPct = stats.last.tonnage > 0 
    ? ((stats.current.tonnage - stats.last.tonnage) / stats.last.tonnage) * 100 
    : 100;

  const handleSearch = (text) => {
    setSearchTerm(text);
    if (text.length > 1) {
      const found = exercises_db.filter(ex => ex.name.toLowerCase().includes(text.toLowerCase())).slice(0, 5);
      setSearchResults(found);
    } else {
      setSearchResults([]);
    }
  };

  const renderWeeklyView = () => {
    const isTonnageHistoryEmpty = stats.tonnageHistory.every(h => h.tonnage === 0);
    const activeTonnageData = useDemoData || isTonnageHistoryEmpty ? demoTonnageHistory : stats.tonnageHistory;
    
    // Calcular porcentaje de cambio semanal en base a datos reales/demo
    let displayTonnageDiff = tonnageDiffPct;
    if (useDemoData || isTonnageHistoryEmpty) {
      const prevVal = demoTonnageHistory[demoTonnageHistory.length - 2].tonnage;
      const currVal = demoTonnageHistory[demoTonnageHistory.length - 1].tonnage;
      displayTonnageDiff = ((currVal - prevVal) / prevVal) * 100;
    }

    return (
      <Animated.View entering={FadeIn} layout={Layout.springify()} className="gap-y-8">
        {/* High Level Cards */}
        <View className="flex-row gap-x-4">
          <View className="flex-1 bg-slate-900 border border-emerald-500/20 p-5 rounded-3xl">
            <View className="flex-row justify-between items-center mb-3">
              <Activity size={20} color="#10b981" />
              <View className="flex-row items-center gap-x-1">
                {displayTonnageDiff >= 0 ? <ArrowUpRight size={12} color="#10b981" /> : <ArrowDownRight size={12} color="#ef4444" />}
                <Text style={{ color: displayTonnageDiff >= 0 ? '#10b981' : '#ef4444' }} className="text-[10px] font-black">
                  {Math.abs(displayTonnageDiff).toFixed(1)}%
                </Text>
              </View>
            </View>
            <Text className="text-white text-2xl font-black">
              {useDemoData || isTonnageHistoryEmpty 
                ? demoTonnageHistory[demoTonnageHistory.length - 1].tonnage.toLocaleString() 
                : stats.current.tonnage.toLocaleString()} kg
            </Text>
            <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Tonelaje</Text>
          </View>

          <View className="flex-1 bg-slate-900 border border-purple-500/20 p-5 rounded-3xl">
            <View className="flex-row justify-between items-center mb-3">
              <Award size={20} color="#8b5cf6" />
              <Text className="text-slate-500 text-[10px] font-bold">{useDemoData || isTonnageHistoryEmpty ? 4 : stats.current.sessions} sesiones</Text>
            </View>
            <Text className="text-white text-2xl font-black">{useDemoData || isTonnageHistoryEmpty ? 32 : stats.current.sets}</Text>
            <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Series</Text>
          </View>
        </View>

        {/* Gráfico de Evolución de Tonelaje Semanal */}
        <View className="bg-slate-900 border border-slate-800 p-5 rounded-[32px]">
          <View className="flex-row justify-between items-center mb-5">
            <View>
              <View className="flex-row items-center gap-x-1.5">
                <Text className="text-white font-black text-base">Desempeño de Fuerza</Text>
                <TouchableOpacity onPress={() => setHelpTopic('tonnage')}>
                  <HelpCircle size={14} color="#64748b" />
                </TouchableOpacity>
              </View>
              <Text className="text-slate-500 text-[10px] font-bold">Tonelaje levantado por semana</Text>
            </View>
            <View className="w-8 h-8 rounded-full bg-slate-950 items-center justify-center border border-slate-850">
              <TrendingUp size={16} color={colors.accent} />
            </View>
          </View>
          <WeeklyTonnageChart data={activeTonnageData} color={colors.accent} />
        </View>

      {/* Elite Coach Insights */}
      <View className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
        <View className="flex-row items-center gap-x-2 mb-6">
          <CheckCircle size={18} color="#10b981" />
          <Text className="text-white font-black text-lg">Virtual Coach Insights</Text>
          <TouchableOpacity onPress={() => setHelpTopic('insights')}>
            <HelpCircle size={14} color="#64748b" />
          </TouchableOpacity>
        </View>
        <View className="gap-y-4">
          {stats.analysis.warnings.length === 0 && stats.analysis.insights.length === 0 && (
            <Text className="text-slate-500 text-center py-4 text-xs">Registra volumen para generar consejos.</Text>
          )}
          {stats.analysis.warnings.map((w, i) => (
            <View key={i} className="bg-red-500/5 p-4 rounded-2xl border border-red-500/10 flex-row gap-x-3">
              <AlertCircle size={16} color="#ef4444" style={{ marginTop: 2 }} />
              <Text className="text-red-200/70 text-xs flex-1 leading-5">{w}</Text>
            </View>
          ))}
          {stats.analysis.insights.map((ins, i) => (
            <View key={i} className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10 flex-row gap-x-3">
              <TrendingUp size={16} color="#10b981" style={{ marginTop: 2 }} />
              <Text className="text-emerald-200/70 text-xs flex-1 leading-5">{ins}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Muscle Recovery */}
      <View>
        <View className="flex-row items-center gap-x-2 mb-5">
          <Zap size={18} color="#fbbf24" />
          <Text className="text-white font-black text-lg">Salud y Recuperación</Text>
        </View>
        <View className="flex-row flex-wrap justify-between gap-y-3">
          {Object.entries(stats.recovery).map(([muscle, data]) => (
            <View key={muscle} style={{ width: '48%' }} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-white text-[11px] font-black uppercase">{translateMuscleGroup(muscle)}</Text>
                <Text style={{ color: data.color }} className="text-[10px] font-black">{data.percent}%</Text>
              </View>
              <View className="w-full h-1 bg-slate-950 rounded-full overflow-hidden mb-2">
                <View style={{ width: `${data.percent}%`, backgroundColor: data.color }} className="h-full" />
              </View>
              <Text className="text-slate-500 text-[8px] font-bold">
                {data.status === 'Ready' ? 'Recuperado' : `${data.hoursLeft}h restantes`}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Distribution */}
      <View className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
        <View className="flex-row items-center gap-x-2 mb-6">
          <Text className="text-white font-black text-lg">Distribución de Series</Text>
          <TouchableOpacity onPress={() => setHelpTopic('volume')}>
            <HelpCircle size={14} color="#64748b" />
          </TouchableOpacity>
        </View>
        <View className="gap-y-6">
          {Object.entries(stats.current.profile).map(([muscle, data]) => {
            const comp = stats.comparison[muscle] || { tonnagePct: 0 };
            return (
              <View key={muscle}>
                <View className="flex-row justify-between items-end mb-2">
                  <View>
                    <Text className="text-white font-bold text-sm">{translateMuscleGroup(muscle)}</Text>
                    <Text className="text-slate-500 text-[10px] font-bold">{data.sets.toFixed(1)} series registradas</Text>
                  </View>
                  <View className="items-end">
                    <Text style={{ color: comp.tonnagePct >= 0 ? '#10b981' : '#ef4444' }} className="text-[10px] font-black">
                      {comp.tonnagePct >= 0 ? '+' : ''}{Math.min(comp.tonnagePct, 999).toFixed(0)}% vol
                    </Text>
                    <Text style={{ color: data.status.color }} className="text-[8px] font-bold uppercase mt-0.5">{data.status.label}</Text>
                  </View>
                </View>
                <View className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                  <View style={{ width: `${Math.min((data.sets / 20) * 100, 100)}%`, backgroundColor: data.status.color }} className="h-full" />
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </Animated.View>
    );
  };

  const renderHistoricalView = () => (
    <Animated.View entering={FadeIn} layout={Layout.springify()} className="gap-y-8">
      {/* Search Bar */}
      <View className="bg-slate-900 border border-blue-500/20 p-6 rounded-[32px] relative" style={{ zIndex: 100 }}>
        <View className="flex-row items-center gap-x-2 mb-4">
          <Text className="text-white font-black text-lg">Progresión Técnica</Text>
          <TouchableOpacity onPress={() => setHelpTopic('tech')}>
            <HelpCircle size={14} color="#64748b" />
          </TouchableOpacity>
        </View>
        <View className="bg-slate-950 border border-slate-800 rounded-2xl flex-row items-center px-4 mb-2">
           <Search size={18} color="#64748b" />
           <TextInput 
             value={searchTerm}
             onChangeText={handleSearch}
             placeholder="Busca un ejercicio..."
             placeholderTextColor="#475569"
             className="flex-1 h-12 text-white font-bold ml-2"
           />
        </View>
        <Text className="text-slate-500 text-[10px] ml-2">Analiza tu evolución de fuerza y volumen histórico.</Text>
        
        {searchResults.length > 0 && (
          <View className="absolute top-[110%] left-6 right-6 bg-slate-950 border border-blue-500 rounded-2xl overflow-hidden shadow-2xl z-50">
            {searchResults.map(ex => (
              <TouchableOpacity 
                key={ex.id}
                onPress={() => {
                  setSearchTerm('');
                  setSearchResults([]);
                  navigation.navigate('ExerciseProgress', { id: ex.id });
                }}
                className="p-4 border-b border-slate-900 flex-row justify-between items-center"
              >
                <Text className="text-white font-bold text-sm">{ex.name}</Text>
                <ChevronRight size={16} color="#3b82f6" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Global Rank Status */}
      <View className="bg-slate-900 border border-slate-800 p-6 rounded-[32px] flex-row items-center justify-between">
         <View className="flex-1">
            <Text className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Estatus Actual</Text>
            <Text className="text-white font-black text-xl">Rango {(() => {
               let bestRankRatio = -1;
               let rank = { name: 'Novato' }; 
               workouts.forEach(w => w.workout_entries?.forEach(e => {
                 const rm = calculate1RM(e.weight, e.reps);
                 const normMg = normalizeMuscleGroup(e.exercises?.muscle_group || 'Arms');
                 const r = getRankByWeight(rm, normMg, e.exercises?.name || '');
                 if (r.minRatio > bestRankRatio) { bestRankRatio = r.minRatio; rank = r; }
               }));
               return rank.name;
            })()}</Text>
         </View>
         <View className="w-12 h-12 rounded-full bg-slate-950 items-center justify-center border border-slate-800">
            <Trophy size={24} color="#fbbf24" />
         </View>
      </View>

      {/* 30 Day Muscle Volume - Donut Chart SVG */}
      <View className="bg-slate-900 border border-slate-800 p-6 rounded-[32px]">
         <View className="flex-row justify-between items-center mb-6">
            <View>
               <View className="flex-row items-center gap-x-1.5">
                  <Text className="text-white font-black text-base">Distribución Muscular</Text>
                  <TouchableOpacity onPress={() => setHelpTopic('distribution')}>
                     <HelpCircle size={14} color="#64748b" />
                  </TouchableOpacity>
               </View>
               <Text className="text-slate-500 text-[10px] font-bold">Volumen total por músculo (30d)</Text>
            </View>
            <View className="w-8 h-8 rounded-full bg-slate-950 items-center justify-center border border-slate-850">
               <BarChart3 size={16} color="#8b5cf6" />
            </View>
         </View>
         <MuscleVolumeDonutChart 
           data={useDemoData || Object.keys(stats.monthlyVolume).length === 0 ? demoMuscleVolume : stats.monthlyVolume} 
         />
      </View>

      {/* All Time Records Mini List */}
      <View className="bg-slate-900/50 border border-slate-800 p-6 rounded-[32px]">
         <Text className="text-white font-black text-base mb-6">Mejores Marcas (PR)</Text>
         <View className="gap-y-4">
           {(() => {
             const bests = {};
             workouts.forEach(w => w.workout_entries?.forEach(e => {
               const name = e.exercises?.name;
               const rm = calculate1RM(e.weight, e.reps);
               if (!bests[name] || rm > bests[name].rm) bests[name] = { rm, muscle: e.exercises?.muscle_group };
             }));
             return Object.entries(bests).sort((a,b) => b[1].rm - a[1].rm).slice(0, 5).map(([name, data]) => (
               <View key={name} className="flex-row justify-between items-center bg-slate-950/50 p-3 rounded-2xl">
                 <View>
                   <Text className="text-white font-bold text-xs">{name}</Text>
                   <Text className="text-slate-500 text-[8px] uppercase font-black">{translateMuscleGroup(data.muscle)}</Text>
                 </View>
                 <Text className="text-blue-500 font-black">{data.rm}kg</Text>
               </View>
             ));
           })()}
         </View>
      </View>
    </Animated.View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      {/* Mode Switcher */}
      <View className="px-5 pt-4 pb-2 flex-row gap-x-2">
         <TouchableOpacity 
           onPress={() => setViewMode('weekly')}
           className={`flex-1 py-3 rounded-2xl items-center ${viewMode === 'weekly' ? 'bg-blue-600' : 'bg-slate-900'}`}
         >
           <Text className={`font-black text-xs ${viewMode === 'weekly' ? 'text-white' : 'text-slate-500'}`}>SEMANAL</Text>
         </TouchableOpacity>
         <TouchableOpacity 
           onPress={() => setViewMode('historical')}
           className={`flex-1 py-3 rounded-2xl items-center ${viewMode === 'historical' ? 'bg-purple-600' : 'bg-slate-900'}`}
         >
           <Text className={`font-black text-xs ${viewMode === 'historical' ? 'text-white' : 'text-slate-500'}`}>HISTÓRICO</Text>
         </TouchableOpacity>
      </View>

      <ScrollView 
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 20 }}
      >
        <View className="mb-6">
          <Text className="text-white text-3xl font-black mb-1">
            {viewMode === 'weekly' ? 'Dashboard Elite' : 'Progresión'}
          </Text>
          <Text className="text-slate-500 text-sm">
            {viewMode === 'weekly' ? 'Tu rendimiento en los últimos 7 días.' : 'Tu evolución a lo largo del tiempo.'}
          </Text>
        </View>

        {workouts.length === 0 && !useDemoData ? (
          <View className="bg-slate-900/40 border border-slate-800 p-6 rounded-[32px] items-center justify-center py-10 mb-6 mt-4">
            <View className="w-12 h-12 rounded-full bg-slate-950 items-center justify-center mb-4 border border-slate-850">
              <TrendingUp size={20} color="#3b82f6" />
            </View>
            <Text className="text-white font-black text-sm text-center">Gráficos y Tendencias Vacíos</Text>
            <Text className="text-slate-400 text-xs text-center mt-1 px-4 leading-relaxed font-medium">
              Necesitamos al menos un entrenamiento registrado para calcular tu volumen muscular, tonelaje acumulado y fatiga.
            </Text>
            <View className="flex-row gap-x-3 mt-6 w-full">
              <TouchableOpacity 
                onPress={() => setUseDemoData(true)}
                className="flex-1 py-3 bg-blue-600/10 border border-blue-500/20 rounded-2xl items-center justify-center"
              >
                <Text className="text-blue-400 font-bold text-xs uppercase">Ver Demo</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => navigation.navigate('WorkoutSetup')}
                className="flex-1 py-3 bg-blue-600 rounded-2xl items-center justify-center shadow-lg shadow-blue-600/10"
              >
                <Text className="text-white font-bold text-xs uppercase">Comenzar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {/* Banner de Modo Demostración */}
            {((viewMode === 'weekly' && stats.tonnageHistory.every(h => h.tonnage === 0)) || 
              (viewMode === 'historical' && Object.keys(stats.monthlyVolume).length === 0)) && (
              <TouchableOpacity 
                onPress={() => setUseDemoData(prev => !prev)}
                className={`mb-6 p-4 rounded-2xl flex-row justify-between items-center border ${
                  useDemoData ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-blue-500/10 border-blue-500/20'
                }`}
              >
                <View className="flex-1 mr-4">
                  <Text className="text-white text-xs font-black">
                    {useDemoData ? '🌟 Modo Demostración Activo' : '📊 ¿Aún no registras entrenamientos?'}
                  </Text>
                  <Text className="text-slate-400 text-[10px] leading-4 mt-0.5">
                    {useDemoData 
                      ? 'Mostrando analíticas simuladas. Presiona aquí para ver tu cuenta vacía.' 
                      : 'Toca aquí para previsualizar los espectaculares gráficos con datos de demostración.'}
                  </Text>
                </View>
                <View className={`px-3 py-1.5 rounded-xl ${useDemoData ? 'bg-emerald-500' : 'bg-blue-600'}`}>
                  <Text className="text-white text-[9px] font-black uppercase">
                    {useDemoData ? 'Ver Vacío' : 'Ver Demo'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {viewMode === 'weekly' ? renderWeeklyView() : renderHistoricalView()}
          </>
        )}
      </ScrollView>

      <ContextualTooltip
        visible={completedTutorials ? !completedTutorials.analysis : true}
        title="Análisis de Progreso"
        description="Aquí puedes ver la distribución de tu volumen por grupo muscular, tu tonelaje semanal acumulado e identificar desbalances en tu entrenamiento."
        stepText="Paso 3 / 4"
        onNext={() => markTutorialCompleted('analysis')}
        onDismiss={() => markTutorialCompleted('analysis')}
      />

      {/* Help Modal */}
      <Modal visible={!!helpTopic} transparent animationType="fade">
        <View className="flex-1 bg-black/80 justify-end">
          <View className="bg-slate-900 border-t border-slate-800 p-6 rounded-t-[32px]">
            <View className="items-center mb-6">
              <View className="w-10 h-1 bg-slate-700 rounded-full mb-3" />
              <Text className="text-white text-lg font-black">
                {helpTopic === 'tonnage' && 'Tonelaje Semanal'}
                {helpTopic === 'insights' && 'Coach IA Insights'}
                {helpTopic === 'volume' && 'Volumen de Series'}
                {helpTopic === 'tech' && 'Progresión Técnica (1RM)'}
                {helpTopic === 'distribution' && 'Distribución Muscular'}
              </Text>
              <Text className="text-slate-400 text-xs">Explicación didáctica</Text>
            </View>

            <View className="bg-slate-950 p-5 rounded-2xl border border-slate-850 mb-6">
              <Text className="text-slate-300 text-sm leading-relaxed font-medium">
                {helpTopic === 'tonnage' && 'El tonelaje representa el peso total levantado en tus entrenamientos (Series x Repeticiones x Peso). Es una de las mejores métricas para cuantificar la carga de trabajo acumulada y verificar si estás logrando una sobrecarga progresiva para ganar fuerza e hipertrofia.'}
                {helpTopic === 'insights' && 'Virtual Coach analiza tus datos en tiempo real para recomendarte días de descanso, advertirte si estás sobreentrenando un grupo muscular (frecuencia/volumen excesivo) o sugerirte enfocar zonas retrasadas.'}
                {helpTopic === 'volume' && 'Mide la cantidad de series de trabajo efectivas semanales por grupo muscular. En fisiología del ejercicio, realizar de 10 a 20 series por grupo muscular a la semana se considera el rango óptimo para maximizar la hipertrofia sin caer en sobreentrenamiento.'}
                {helpTopic === 'tech' && 'Rastrea tu Una Repetición Máxima (1RM) estimada en base a tus series efectivas de trabajo. Te permite ver si estás progresando en fuerza real a lo largo de los meses sin necesidad de arriesgarte con cargas máximas absolutas.'}
                {helpTopic === 'distribution' && 'Muestra en qué porcentaje distribuyes tu volumen total entre los diferentes grupos musculares. Es ideal para asegurar que tu rutina coincide con tus prioridades personales y evitar asimetrías estéticas o de fuerza.'}
              </Text>
            </View>

            <TouchableOpacity 
              onPress={() => setHelpTopic(null)} 
              className="py-4 bg-blue-600 rounded-2xl items-center shadow-lg shadow-blue-600/20"
            >
              <Text className="text-white font-bold text-xs uppercase">Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
