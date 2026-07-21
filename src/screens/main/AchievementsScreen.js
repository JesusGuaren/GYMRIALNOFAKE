import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronLeft, Trophy, Medal, Star, Lock } from 'lucide-react-native';
import useStore, { THEMES } from '../../store/useStore';
import { ACHIEVEMENTS, getEarnedAchievements } from '../../services/AchievementService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

export default function AchievementsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { workouts, theme } = useStore();
  const colors = THEMES[theme] || THEMES.midnight;
  
  const earned = getEarnedAchievements(workouts);
  const earnedIds = new Set(earned.map(a => a.id));

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
      <View className="p-8 items-center mb-10 rounded-3xl border" style={{ backgroundColor: colors.card, borderColor: colors.accent }}>
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

      <View className="gap-y-4">
        {ACHIEVEMENTS.map((achievement, idx) => {
          const isEarned = earnedIds.has(achievement.id);
          
          return (
            <Animated.View 
              entering={FadeIn.delay(idx * 100)}
              key={achievement.id} 
              className="p-5 rounded-3xl border flex-row items-center gap-x-4"
              style={{ 
                opacity: isEarned ? 1 : 0.4,
                backgroundColor: isEarned ? `${colors.accent}10` : colors.card,
                borderColor: isEarned ? `${colors.accent}40` : colors.border
              }}
            >
              <View className="w-16 h-16 items-center justify-center rounded-2xl" style={{ backgroundColor: isEarned ? `${colors.accent}30` : '#00000040' }}>
                {isEarned ? (
                  <Text className="text-3xl">{achievement.icon}</Text>
                ) : (
                  <Lock size={24} color="#64748b" />
                )}
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-x-2">
                  <Text className="text-white font-bold text-base">{achievement.name}</Text>
                  {isEarned && <Medal size={14} color="#eab308" />}
                </View>
                <Text className="text-slate-500 text-xs mt-1 leading-relaxed">
                  {achievement.description}
                </Text>
                {!isEarned && achievement.target && (() => {
                  const current = achievement.getCurrent(workouts || []);
                  const pct = Math.min(100, (current / achievement.target) * 100);
                  return (
                    <View className="mt-2.5">
                      <View className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: colors.bg }}>
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
                  <Star size={20} color={colors.accent} fill={colors.accent} />
                </View>
              )}
            </Animated.View>
          );
        })}
      </View>
    </ScrollView>
  );
}
