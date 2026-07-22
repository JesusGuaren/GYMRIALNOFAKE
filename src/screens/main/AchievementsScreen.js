import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronLeft, ChevronDown, Trophy, Medal, Star, Lock } from 'lucide-react-native';
import useStore, { THEMES } from '../../store/useStore';
import { ACHIEVEMENTS, getEarnedAchievements } from '../../services/AchievementService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';

export default function AchievementsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { workouts, theme } = useStore();
  const colors = THEMES[theme] || THEMES.midnight;

  const [expandedCategories, setExpandedCategories] = useState(() => new Set());

  const earned = getEarnedAchievements(workouts);
  const earnedIds = new Set(earned.map(a => a.id));

  // Agrupa manteniendo el orden en que aparecen en ACHIEVEMENTS (Racha, Constancia,
  // Volumen, Maestría por músculo, 1RM por levantamiento, Especiales) en vez de
  // una sola lista plana de 120+ ítems.
  const categories = useMemo(() => {
    const groups = {};
    ACHIEVEMENTS.forEach(a => {
      const cat = a.category || 'Otros';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(a);
    });
    return Object.entries(groups).map(([name, items]) => ({
      name,
      items,
      earnedCount: items.filter(a => earnedIds.has(a.id)).length
    }));
  }, [workouts]);

  const toggleCategory = (name) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

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
          <Text className="text-2xl font-black text-white">MURO DE FAMA</Text>
          <Text className="text-slate-500 text-[10px] tracking-widest font-bold">LOGROS Y MEDALLAS</Text>
        </View>
      </View>

      {/* Stats Summary */}
      <View className="p-8 items-center mb-8 rounded-3xl border" style={{ backgroundColor: colors.card, borderColor: colors.accent }}>
        <Text className="text-slate-400 text-sm font-bold mb-2">Logros Desbloqueados</Text>
        <View className="flex-row items-baseline">
          <Text className="text-white text-5xl font-black">{earned.length}</Text>
          <Text className="text-slate-500 text-lg ml-2 font-bold">/ {ACHIEVEMENTS.length}</Text>
        </View>
        <View className="w-full h-2 rounded-full mt-5 overflow-hidden" style={{ backgroundColor: colors.bg }}>
          <View
            className="h-full"
            style={{
              width: `${(earned.length / ACHIEVEMENTS.length) * 100}%`,
              backgroundColor: colors.accent
            }}
          />
        </View>
      </View>

      <View className="gap-y-3">
        {categories.map(cat => {
          const isExpanded = expandedCategories.has(cat.name);
          const isComplete = cat.earnedCount === cat.items.length;

          return (
            <View key={cat.name} className="rounded-3xl border overflow-hidden" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
              <TouchableOpacity
                onPress={() => toggleCategory(cat.name)}
                className="p-5 flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-x-3 flex-1">
                  <View className="w-10 h-10 rounded-2xl items-center justify-center" style={{ backgroundColor: isComplete ? `${colors.accent}30` : colors.bg }}>
                    {isComplete ? <Medal size={18} color={colors.accent} /> : <Trophy size={18} color="#64748b" />}
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-bold text-sm">{cat.name}</Text>
                    <Text className="text-slate-500 text-[10px] font-bold mt-0.5">{cat.earnedCount} / {cat.items.length} desbloqueados</Text>
                  </View>
                </View>
                <ChevronDown
                  size={18}
                  color="#64748b"
                  style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}
                />
              </TouchableOpacity>

              {isExpanded && (
                <View className="px-4 pb-4 gap-y-3">
                  {cat.items.map((achievement, idx) => {
                    const isEarned = earnedIds.has(achievement.id);

                    return (
                      <Animated.View
                        entering={FadeIn.delay(idx * 60)}
                        key={achievement.id}
                        className="p-4 rounded-2xl border flex-row items-center gap-x-4"
                        style={{
                          opacity: isEarned ? 1 : 0.4,
                          backgroundColor: isEarned ? `${colors.accent}10` : colors.bg,
                          borderColor: isEarned ? `${colors.accent}40` : colors.border
                        }}
                      >
                        <View className="w-14 h-14 items-center justify-center rounded-2xl" style={{ backgroundColor: isEarned ? `${colors.accent}30` : '#00000040' }}>
                          {isEarned ? (
                            <Text className="text-2xl">{achievement.icon}</Text>
                          ) : (
                            <Lock size={20} color="#64748b" />
                          )}
                        </View>
                        <View className="flex-1">
                          <View className="flex-row items-center gap-x-2">
                            <Text className="text-white font-bold text-sm">{achievement.name}</Text>
                            {isEarned && <Medal size={12} color="#eab308" />}
                          </View>
                          <Text className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                            {achievement.description}
                          </Text>
                          {!isEarned && achievement.target && (() => {
                            const current = achievement.getCurrent(workouts || []);
                            const pct = Math.min(100, (current / achievement.target) * 100);
                            return (
                              <View className="mt-2.5">
                                <View className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: colors.card }}>
                                  <View className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: colors.accent }} />
                                </View>
                                <Text className="text-slate-500 text-[10px] mt-1 font-bold">
                                  {Math.min(current, achievement.target).toLocaleString('en-US')} / {achievement.target.toLocaleString('en-US')} {achievement.unit}
                                </Text>
                              </View>
                            );
                          })()}
                        </View>
                        {isEarned && (
                          <View>
                            <Star size={18} color={colors.accent} fill={colors.accent} />
                          </View>
                        )}
                      </Animated.View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
