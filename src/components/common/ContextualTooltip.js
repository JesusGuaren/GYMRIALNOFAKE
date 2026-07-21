import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { X, Sparkles, ChevronRight } from 'lucide-react-native';
import useStore, { THEMES } from '../../store/useStore';

export default function ContextualTooltip({ visible, title, description, stepText, onNext, onDismiss }) {
  const theme = useStore(state => state.theme);
  const colors = THEMES[theme] || THEMES.midnight;

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/70 justify-center items-center px-8">
        <Animated.View
          entering={ZoomIn.duration(250)}
          className="p-6 rounded-[28px] w-full max-w-sm shadow-2xl border"
          style={{ backgroundColor: colors.card, borderColor: `${colors.accent}40` }}
        >
          {/* Header */}
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center gap-x-2">
              <Sparkles size={16} color={colors.accent} />
              <Text style={{ color: colors.accent }} className="font-black text-[9px] uppercase tracking-widest">Guía Contextual</Text>
            </View>
            <TouchableOpacity onPress={onDismiss} className="p-1.5 rounded-full" style={{ backgroundColor: colors.bg }}>
              <X size={12} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <Text className="text-white text-lg font-black mb-2">{title}</Text>
          <Text className="text-slate-400 text-sm leading-relaxed mb-6 font-medium">{description}</Text>

          {/* Footer Actions */}
          <View className="flex-row justify-between items-center">
            {stepText ? (
              <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest">{stepText}</Text>
            ) : <View />}

            <TouchableOpacity
              onPress={onNext}
              className="px-5 py-3 rounded-2xl flex-row items-center gap-x-1.5 shadow-lg"
              style={{ backgroundColor: colors.accent }}
            >
              <Text style={{ color: colors.accentText }} className="font-bold text-xs uppercase">Entendido</Text>
              <ChevronRight size={14} color={colors.accentText} strokeWidth={3} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
