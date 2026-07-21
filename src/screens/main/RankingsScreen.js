import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { ChevronLeft, Award, TrendingUp, Info } from 'lucide-react-native';
import useStore, { THEMES } from '../../store/useStore';
import { getRankByWeight, calculate1RM, RANKS } from '../../lib/rankingSystem';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { normalizeMuscleGroup, translateMuscleGroup } from '../../constants/Muscles';

export default function RankingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { workouts, exercises, theme } = useStore();
  const colors = THEMES[theme] || THEMES.midnight;

  const exerciseRankings = useMemo(() => {
    const rankings = {};
    workouts.forEach(w => {
      w.workout_entries?.forEach(e => {
        const exId = e.exercise_id;
        const exData = exercises.find(ex => ex.id === exId);
        if (!exData) return;
        const rm = calculate1RM(e.weight, e.reps);
        const normMuscle = normalizeMuscleGroup(exData.muscle_group);
        if (!rankings[exId] || rm > rankings[exId].bestRM) {
          rankings[exId] = {
            id: exId,
            name: exData.name,
            muscleGroup: normMuscle,
            bestRM: rm,
            rank: getRankByWeight(rm, normMuscle, exData.name)
          };
        }
      });
    });
    return Object.values(rankings).sort((a, b) => b.bestRM - a.bestRM);
  }, [workouts, exercises]);

  const muscleGroups = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms'];

  return (
    <ScrollView 
      className="flex-1" 
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, paddingBottom: 60 }}
    >
      <View className="flex-row items-center gap-x-4 mb-8">
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          className="w-10 h-10 rounded-full border items-center justify-center"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <ChevronLeft color="white" size={24} />
        </TouchableOpacity>
        <View>
          <Text className="text-2xl font-black text-white">SALÓN DE RANGO</Text>
          <Text className="text-slate-500 text-[10px] tracking-widest font-bold">TU NIVEL DE FUERZA</Text>
        </View>
      </View>

      {/* Ranks Legend */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-10 -mx-5 px-5">
        <View className="flex-row gap-x-3 pb-3">
          {RANKS.map(r => (
            <View 
              key={r.id} 
              className="items-center w-20 p-3 rounded-2xl border"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <Award size={20} color={r.color} />
              <Text style={{ color: r.color }} className="text-[9px] font-black mt-2 text-center">{r.name.toUpperCase()}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {muscleGroups.map((group) => {
        const groupExercises = exerciseRankings.filter(ex => ex.muscleGroup === group);
        if (groupExercises.length === 0) return null;

        return (
          <View key={group} className="mb-10">
            <View className="flex-row items-center gap-x-3 mb-6">
              <View className="w-8 h-8 rounded-lg items-center justify-center" style={{ backgroundColor: colors.accent }}>
                <Award size={16} color={colors.accentText} />
              </View>
              <Text className="text-lg font-black text-white">
                {translateMuscleGroup(group)}
              </Text>
              <View className="flex-1 h-[1px] ml-2" style={{ backgroundColor: colors.border }} />
            </View>
            
            <View className="gap-y-3">
              {groupExercises.map(ex => (
                <TouchableOpacity 
                  key={ex.id} 
                  className="p-4 rounded-2xl border flex-row justify-between items-center"
                  style={{ backgroundColor: colors.card, borderColor: colors.border, borderLeftWidth: 4, borderLeftColor: ex.rank.color }}
                >
                  <View className="flex-row items-center gap-x-4">
                    <View className="w-11 h-11 items-center justify-center rounded-xl" style={{ backgroundColor: colors.bg + '80' }}>
                       <Award size={24} color={ex.rank.color} />
                    </View>
                    <View>
                      <Text className="text-white font-bold text-base">{ex.name}</Text>
                      <View className="flex-row items-center gap-x-1 mt-1">
                        <Text className="text-slate-500 text-xs">1RM:</Text>
                        <Text className="text-white font-black text-sm">{ex.bestRM}kg</Text>
                      </View>
                    </View>
                  </View>

                  <View className="items-end">
                    <Text style={{ color: ex.rank.color }} className="text-[10px] font-black uppercase">{ex.rank.name}</Text>
                    <View className="flex-row items-center gap-x-1 mt-1">
                      <TrendingUp size={12} color={colors.accent} />
                      <Text style={{ color: colors.accent }} className="text-[9px] font-black">UP</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      })}

      {exerciseRankings.length === 0 && (
        <View className="items-center py-20 opacity-30">
          <Info size={48} color="#64748b" className="mb-4" />
          <Text className="text-slate-400 text-center">Registra entrenamientos para ver tu rango.</Text>
        </View>
      )}
    </ScrollView>
  );
}
