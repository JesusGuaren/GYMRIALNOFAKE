import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, Dimensions, Vibration } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withDelay, 
  withRepeat, 
  withSequence,
  withTiming,
  Easing
} from 'react-native-reanimated';
import { Trophy, Star } from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Componente para una sola partícula de confeti
const ConfettiParticle = ({ delay, color, startX }) => {
  const y = useSharedValue(-20);
  const x = useSharedValue(startX);
  const rotation = useSharedValue(0);
  const scale = useSharedValue(Math.random() * 0.6 + 0.4);

  useEffect(() => {
    // Caída libre del confeti con oscilación horizontal
    y.value = withDelay(
      delay,
      withTiming(SCREEN_HEIGHT + 50, {
        duration: Math.random() * 2000 + 2500,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      })
    );

    x.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(startX - 40, { duration: 600, easing: Easing.linear }),
          withTiming(startX + 40, { duration: 600, easing: Easing.linear })
        ),
        -1,
        true
      )
    );

    rotation.value = withDelay(
      delay,
      withRepeat(
        withTiming(360, { duration: Math.random() * 1000 + 1000, easing: Easing.linear }),
        -1,
        false
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: y.value },
        { translateX: x.value },
        { rotate: `${rotation.value}deg` },
        { scale: scale.value }
      ],
    };
  });

  return (
    <Animated.View 
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          width: 12,
          height: 12,
          borderRadius: Math.random() > 0.5 ? 6 : 2,
          backgroundColor: color,
        },
        animatedStyle
      ]}
    />
  );
};

export default function AchievementUnlockModal({ visible, achievements = [], onClose, colors }) {

  // Vibración táctil premium
  useEffect(() => {
    if (visible) {
      if (Vibration.vibrate) {
        // Patrón de vibración: pausa, vibra corto, pausa, vibra largo
        Vibration.vibrate([0, 100, 80, 300]);
      }
    }
  }, [visible]);

  // Animaciones para los elementos del modal
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const textTranslateY = useSharedValue(50);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 12 });
      opacity.value = withTiming(1, { duration: 300 });
      textTranslateY.value = withSpring(0, { damping: 15 });
    } else {
      scale.value = 0;
      opacity.value = 0;
      textTranslateY.value = 50;
    }
  }, [visible]);

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value
  }));

  const textStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: textTranslateY.value }]
  }));

  // Generar confeti de colores neón una sola vez o cuando cambie la visibilidad
  const confettiParticles = React.useMemo(() => {
    const confettiColors = ['#a855f7', '#3b82f6', '#10b981', '#fbbf24', '#f43f5e', '#00ff9d'];
    return Array.from({ length: 45 }).map((_, i) => ({
      id: i,
      delay: Math.random() * 800,
      color: confettiColors[i % confettiColors.length],
      startX: Math.random() * SCREEN_WIDTH
    }));
  }, [visible]);

  if (achievements.length === 0) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <View className="flex-1 justify-center items-center px-6" style={{ backgroundColor: 'rgba(2, 6, 23, 0.85)' }}>
        {/* Renderizado de confeti detrás del cartel */}
        {confettiParticles.map(p => (
          <ConfettiParticle key={p.id} delay={p.delay} color={p.color} startX={p.startX} />
        ))}

        <Animated.View 
          style={[{ 
            width: '100%', 
            maxWidth: 340, 
            backgroundColor: colors.card, 
            borderColor: colors.accent,
            borderWidth: 2,
            borderRadius: 36,
            padding: 30,
            alignItems: 'center',
            shadowColor: colors.accent,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.5,
            shadowRadius: 20,
            elevation: 15
          }, modalStyle]}
        >
          {/* Corona/Brillo Neón */}
          <View className="w-24 h-24 rounded-full items-center justify-center mb-6" style={{ backgroundColor: `${colors.accent}15`, borderColor: `${colors.accent}40`, borderWidth: 2 }}>
            <Trophy size={48} color={colors.accent} />
          </View>

          <Animated.View style={[{ alignItems: 'center', width: '100%' }, textStyle]}>
            <Text className="text-emerald-400 text-xs font-black tracking-widest uppercase mb-1">¡LOGRO DESBLOQUEADO!</Text>
            
            {/* Lista de logros obtenidos en esta ronda */}
            <View className="w-full gap-y-4 my-4">
              {achievements.map((ach) => (
                <View key={ach.id} className="items-center bg-slate-950/40 p-4 rounded-2xl border border-slate-900">
                  <Text className="text-3xl mb-2">{ach.icon}</Text>
                  <Text className="text-white text-xl font-black text-center">{ach.name}</Text>
                  <Text className="text-slate-400 text-xs text-center mt-1 px-2">{ach.description}</Text>
                  
                  {/* Recompensa XP */}
                  <View className="flex-row items-center gap-x-1 mt-3 bg-purple-500/10 border border-purple-500/30 px-3 py-1 rounded-full">
                    <Star size={12} color="#a855f7" fill="#a855f7" />
                    <Text className="text-purple-400 font-bold text-xs">+{ach.xpReward} XP</Text>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity
              onPress={onClose}
              className="w-full h-14 rounded-2xl items-center justify-center mt-4 shadow-lg"
              style={{ backgroundColor: colors.accent }}
            >
              <Text style={{ color: colors.accentText }} className="font-extrabold text-base tracking-wider">¡BRUTAL, MANO!</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}
