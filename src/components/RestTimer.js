import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Vibration, Platform } from 'react-native';
import { Play, Pause, X, Clock } from 'lucide-react-native';
import useStore, { THEMES } from '../store/useStore';
import Animated, { FadeIn, FadeOut, BounceIn } from 'react-native-reanimated';

export default function GlobalRestTimer() {
  const globalTimerSeconds = useStore(state => state.globalTimerSeconds);
  const setGlobalTimer = useStore(state => state.setGlobalTimer);
  const theme = useStore(state => state.theme);
  const colors = THEMES[theme] || THEMES.midnight;
  const [isActive, setIsActive] = useState(true);

  // Sync with global store changes
  useEffect(() => {
    if (globalTimerSeconds !== null && globalTimerSeconds > 0) {
      setIsActive(true);
    }
  }, [globalTimerSeconds]);

  useEffect(() => {
    let interval = null;
    if (isActive && globalTimerSeconds !== null && globalTimerSeconds > 0) {
      interval = setInterval(() => {
        setGlobalTimer(globalTimerSeconds - 1, true);
      }, 1000);
    } else if (globalTimerSeconds === 0) {
      setIsActive(false);
      Vibration.vibrate([200, 100, 200, 100, 500]);
    }
    return () => clearInterval(interval);
  }, [isActive, globalTimerSeconds, setGlobalTimer]);

  const formatTime = (seconds) => {
    if (seconds === null) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const addTime = (secs) => {
    if (globalTimerSeconds === null) return;
    setGlobalTimer(Math.max(0, globalTimerSeconds + secs));
    if (!isActive && globalTimerSeconds + secs > 0) setIsActive(true);
  };

  if (globalTimerSeconds === null) return null;

  return (
    <Animated.View 
      entering={FadeIn.duration(300)} 
      exiting={FadeOut.duration(200)}
      className="absolute bottom-24 right-5 border rounded-3xl p-5 shadow-2xl shadow-emerald-500/20"
      style={{ backgroundColor: colors.card, borderColor: '#10b98180', minWidth: 220, zIndex: 9999, elevation: 10 }}
    >
      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-row items-center gap-x-2">
          <Clock size={16} color="#10b981" />
          <Text className="text-emerald-500 font-bold text-xs uppercase tracking-widest">Descanso</Text>
        </View>
        <TouchableOpacity onPress={() => setGlobalTimer(null)}>
          <X size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      <Text className={`text-center text-4xl font-black mb-4 ${globalTimerSeconds === 0 ? 'text-purple-500' : 'text-white'}`} style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
        {formatTime(globalTimerSeconds)}
      </Text>

      <View className="flex-row justify-center items-center gap-x-4">
        <TouchableOpacity 
          onPress={() => addTime(-15)}
          className="rounded-xl px-3 py-2 border"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <Text className="text-white text-xs font-bold">-15s</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => setIsActive(!isActive)}
          className={`w-12 h-12 rounded-full items-center justify-center ${globalTimerSeconds === 0 ? 'bg-purple-600' : 'bg-emerald-500'}`}
        >
          {isActive ? <Pause size={24} color="#020617" fill="currentColor" /> : <Play size={24} color="#020617" fill="currentColor" />}
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => addTime(30)}
          className="rounded-xl px-3 py-2 border"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <Text className="text-white text-xs font-bold">+30s</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
