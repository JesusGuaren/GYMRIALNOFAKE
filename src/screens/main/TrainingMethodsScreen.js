import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { ChevronLeft, ChevronDown, BookMarked, Sparkles, ShieldAlert, Target, ExternalLink } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStore, { THEMES } from '../../store/useStore';
import { TRAINING_METHODS } from '../../constants/TrainingMethods';
import Animated, { FadeIn } from 'react-native-reanimated';

export default function TrainingMethodsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const theme = useStore(state => state.theme);
  const colors = THEMES[theme] || THEMES.midnight;

  const [expandedId, setExpandedId] = useState(null);

  const toggleMethod = (id) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, paddingBottom: 60 }}
    >
      <View className="flex-row items-center gap-x-4 mb-6">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-full border items-center justify-center"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <ChevronLeft color="white" size={24} />
        </TouchableOpacity>
        <View>
          <Text className="text-2xl font-black text-white">MÉTODOS DE ENTRENAMIENTO</Text>
          <Text className="text-slate-500 text-[10px] tracking-widest font-bold">SISTEMAS Y FILOSOFÍAS DE PROGRAMACIÓN</Text>
        </View>
      </View>

      <View className="p-4 rounded-2xl border mb-6 flex-row items-start gap-x-3" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <BookMarked size={16} color={colors.accent} style={{ marginTop: 2 }} />
        <Text className="text-slate-400 text-xs leading-relaxed flex-1">
          Una biblioteca de referencia sobre distintos sistemas de entrenamiento de fuerza e hipertrofia. Los marcados como{' '}
          <Text style={{ color: colors.accent, fontWeight: '900' }}>aplicables en el Creador IA</Text> se pueden usar para
          armar el ejercicio principal de una rutina generada; el resto son solo para entender cómo funcionan.
        </Text>
      </View>

      <View className="gap-y-3">
        {TRAINING_METHODS.map(method => {
          const isExpanded = expandedId === method.id;
          const isApplicable = !!method.generatorProfile;

          return (
            <View key={method.id} className="rounded-3xl border overflow-hidden" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
              <TouchableOpacity
                onPress={() => toggleMethod(method.id)}
                className="p-5 flex-row items-center justify-between"
              >
                <View className="flex-1 pr-4">
                  <View className="flex-row items-center gap-x-2 flex-wrap mb-1.5">
                    <Text className="text-white font-black text-base">{method.name}</Text>
                    {isApplicable && (
                      <View className="flex-row items-center gap-x-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: `${colors.accent}20` }}>
                        <Sparkles size={9} color={colors.accent} />
                        <Text style={{ color: colors.accent }} className="text-[8px] font-black uppercase tracking-wider">Creador IA</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-slate-500 text-xs leading-relaxed">{method.tagline}</Text>
                </View>
                <ChevronDown
                  size={18}
                  color="#64748b"
                  style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}
                />
              </TouchableOpacity>

              {isExpanded && (
                <Animated.View entering={FadeIn} className="px-5 pb-5 gap-y-4">
                  <View className="h-px" style={{ backgroundColor: colors.border }} />

                  <View>
                    <Text style={{ color: colors.accent }} className="text-[10px] font-black uppercase tracking-widest mb-1">Origen</Text>
                    <Text className="text-slate-400 text-xs leading-relaxed">
                      <Text className="text-white font-bold">{method.creator}. </Text>
                      {method.origin}
                    </Text>
                  </View>

                  <View>
                    <Text style={{ color: colors.accent }} className="text-[10px] font-black uppercase tracking-widest mb-2">Cómo funciona</Text>
                    <View className="gap-y-2">
                      {method.howItWorks.map((point, idx) => (
                        <View key={idx} className="flex-row gap-x-2">
                          <Text className="text-slate-600 font-black">{'•'}</Text>
                          <Text className="text-slate-400 text-xs leading-relaxed flex-1">{point}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View className="flex-row gap-x-3">
                    <View className="flex-1 p-3 rounded-xl" style={{ backgroundColor: colors.bg }}>
                      <View className="flex-row items-center gap-x-1.5 mb-1">
                        <Target size={11} color="#10b981" />
                        <Text className="text-emerald-500 text-[9px] font-black uppercase tracking-wider">Ideal para</Text>
                      </View>
                      <Text className="text-slate-400 text-[11px] leading-relaxed">{method.bestFor}</Text>
                    </View>
                  </View>

                  {method.cautions && (
                    <View className="p-3 rounded-xl flex-row gap-x-2" style={{ backgroundColor: '#f43f5e10' }}>
                      <ShieldAlert size={13} color="#f43f5e" style={{ marginTop: 1 }} />
                      <Text className="text-rose-400 text-[11px] leading-relaxed flex-1">{method.cautions}</Text>
                    </View>
                  )}

                  {isApplicable ? (
                    <View className="p-3 rounded-xl border" style={{ backgroundColor: `${colors.accent}0D`, borderColor: `${colors.accent}30` }}>
                      <Text style={{ color: colors.accent }} className="text-[10px] font-black uppercase tracking-wider mb-1">
                        Aplicable en el Creador IA
                      </Text>
                      <Text className="text-slate-400 text-[11px] leading-relaxed">
                        Elegí este método en el paso 1 del Creador IA para que ajuste automáticamente el ejercicio principal de tu rutina.
                      </Text>
                    </View>
                  ) : (
                    <View className="p-3 rounded-xl border border-dashed" style={{ borderColor: colors.border }}>
                      <Text className="text-slate-500 text-[11px] leading-relaxed">
                        Solo referencia: es un esquema de periodización semanal/diaria, no se puede reducir a un solo ejercicio de una rutina generada automáticamente. Podés preguntarle a Elite Coach cómo aplicarlo a tu caso.
                      </Text>
                    </View>
                  )}

                  {method.sources.length > 0 && (
                    <View className="gap-y-1.5">
                      <Text className="text-slate-600 text-[9px] font-black uppercase tracking-widest">Fuentes</Text>
                      {method.sources.map((src, idx) => (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => Linking.openURL(src.url)}
                          className="flex-row items-center gap-x-1.5"
                        >
                          <ExternalLink size={10} color="#64748b" />
                          <Text className="text-slate-500 text-[10px] underline">{src.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </Animated.View>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
