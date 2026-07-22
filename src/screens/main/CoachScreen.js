import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform, 
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bot, Send, ChevronLeft, Trash2, Sparkles, TrendingUp, Flame, Apple, Dumbbell } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import useStore, { THEMES } from '../../store/useStore';
import { queryCoach } from '../../services/EliteCoachService';
import { getMuscleRecoveryStates } from '../../services/CoachingService';
import { translateMuscleGroup } from '../../constants/Muscles';
import ContextualTooltip from '../../components/common/ContextualTooltip';

/**
 * Formateador nativo ultra ligero para Markdown simple en React Native.
 * Soporta **negritas** y listas con viñetas (- o •)
 */
const renderFormattedText = (text, colors) => {
  if (!text) return null;

  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    const trimmed = line.trim();
    if (!trimmed) return <View key={lineIdx} className="h-2" />;

    // Detectar si es viñeta
    const isBullet = trimmed.startsWith('-') || trimmed.startsWith('•');
    let content = line;
    if (isBullet) {
      content = trimmed.replace(/^[-•]\s*/, '');
    }

    // Procesar negritas '**'
    const parts = content.split('**');
    const textComponents = parts.map((part, partIdx) => {
      const isBold = partIdx % 2 !== 0;
      return (
        <Text 
          key={partIdx} 
          className={isBold ? "font-outfit-bold text-white text-xs" : "font-inter-medium text-slate-300 text-xs"}
          style={isBold ? { fontWeight: 'bold' } : undefined}
        >
          {part}
        </Text>
      );
    });

    if (isBullet) {
      return (
        <View key={lineIdx} className="flex-row items-start mb-1.5 pl-3">
          <Text style={{ color: colors.accent }} className="mr-2 font-outfit-bold text-xs">•</Text>
          <Text className="flex-1 text-slate-300 text-xs font-inter-medium leading-relaxed">
            {textComponents}
          </Text>
        </View>
      );
    }

    return (
      <Text key={lineIdx} className="text-slate-300 text-xs font-inter-medium leading-relaxed mb-2">
        {textComponents}
      </Text>
    );
  });
};

export default function CoachScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { 
    workouts, 
    routines, 
    programs, 
    currentActiveWorkout, 
    userProfile, 
    theme,
    coachChatMessages,
    setCoachChatMessages,
    addCoachChatMessage,
    completedTutorials,
    markTutorialCompleted
  } = useStore();

  const colors = THEMES[theme] || THEMES.midnight;

  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef();

  // Músculo inicial pasado por navegación (ej: al tocar el BodyMap)
  const initialMuscle = route.params?.initialMuscle;

  // 1. Generar Saludo Dinámico Inicial (si no hay historial previo)
  useEffect(() => {
    if (!coachChatMessages || coachChatMessages.length === 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      const todayWorkout = (workouts || []).find(w => w.workout_date === todayStr);
      
      let welcomeText = '';

      if (todayWorkout) {
        welcomeText = `¡Excelente sesión completada hoy, Atleta! 🦾 Tus fibras musculares están en reconstrucción activa.\n\nRecuerda consumir suficiente proteína y descansar bien. ¿En qué te puedo ayudar hoy?`;
      } else {
        // Comprobar días inactivos
        const lastW = (workouts || [])[0];
        const diffDays = lastW 
          ? Math.floor((new Date() - new Date(lastW.workout_date)) / (1000 * 60 * 60 * 24)) 
          : 0;

        if (diffDays > 3) {
          welcomeText = `¡Hola, Atleta! Veo que llevas **${diffDays} días** sin registrar entrenamientos en tu bitácora.\n\nHoy es un gran momento para retomar y evitar el desentrenamiento. ¿Te gustaría que organicemos tu rutina para hoy o evaluemos tu nivel de fatiga?`;
        } else {
          // Chequear rutina sugerida hoy
          const activeProgram = (programs || []).find(p => p.is_active);
          let recommendedRoutine = null;
          if (workouts.length > 0 && lastW) {
            const programRoutines = (routines || []).filter(r => r.program_id === activeProgram?.id);
            const targetList = programRoutines.length > 0 ? programRoutines : (routines || []);
            if (targetList.length > 0) {
              const lastIdx = targetList.findIndex(r => r.name.toLowerCase() === lastW.name?.toLowerCase());
              recommendedRoutine = (lastIdx === -1 || lastIdx === targetList.length - 1) ? targetList[0] : targetList[lastIdx + 1];
            }
          }

          if (recommendedRoutine) {
            welcomeText = `¡Hola! Hoy te sugiero realizar la rutina **"${recommendedRoutine.name}"** de tu programa **${activeProgram?.name || 'entrenamiento'}**.\n\n¿Preparado para entrenar hoy? Cuéntame si tienes alguna duda técnica o quieres evaluar pesos.`;
          } else {
            welcomeText = `¡Hola, Atleta! 🦾 Soy tu **Elite Coach** inteligente. Tengo acceso a tu bitácora, historial y macronutrientes recomendados.\n\n¿En qué te puedo ayudar hoy? Pregúntame sobre tu fatiga muscular, récords o calculadora de 1RM.`;
          }
        }
      }

      setCoachChatMessages([
        { 
          id: 'welcome', 
          sender: 'bot', 
          text: welcomeText 
        }
      ]);
    }
  }, [coachChatMessages, workouts, routines, programs]);

  // 2. Ejecutar consulta de músculo inicial si viene de parámetros
  useEffect(() => {
    if (initialMuscle) {
      const espName = translateMuscleGroup(initialMuscle);
      sendQuery(`Cuéntame sobre mi ${espName}`);
      // Limpiar parámetros para evitar re-ejecución al rotar pantalla o refrescar
      navigation.setParams({ initialMuscle: null });
    }
  }, [initialMuscle]);

  // 3. Generar Chips Rápidos Dinámicos en base al contexto
  const dynamicChips = useMemo(() => {
    const list = [];

    // Chip de entrenamiento activo
    if (currentActiveWorkout) {
      list.push({
        id: 'active_workout',
        label: '⚡ Rutina activa',
        query: `¿Qué me recomiendas hacer en mi rutina activa actual "${currentActiveWorkout.name}"?`,
        icon: Dumbbell
      });
    }

    // Chip de fatiga muscular (buscar músculo más cansado)
    const recoveryStates = getMuscleRecoveryStates(workouts || []);
    let fatigueMuscle = null;
    let minPercent = 100;
    
    const musclesToCheck = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];
    musclesToCheck.forEach(m => {
      if (recoveryStates[m] && recoveryStates[m].percent < minPercent) {
        minPercent = recoveryStates[m].percent;
        fatigueMuscle = m;
      }
    });

    if (fatigueMuscle && minPercent < 70) {
      const espFatigueName = translateMuscleGroup(fatigueMuscle);
      list.push({
        id: 'muscle_fatigue',
        label: `🔥 Fatiga: ${espFatigueName}`,
        query: `¿Cómo está la recuperación de mi ${espFatigueName} y cuándo puedo entrenarlo?`,
        icon: Flame
      });
    }

    // Chip de macros (si tiene perfil cargado)
    if (userProfile?.body_weight) {
      list.push({
        id: 'macros',
        label: '🍎 Mis Macros',
        query: '¿Cuáles son mis calorías y macronutrientes recomendados hoy?',
        icon: Apple
      });
    }

    // Chips genéricos útiles
    list.push({
      id: 'records',
      label: '🏆 Mis Récords',
      query: '¿Cuáles son mis mejores récords de fuerza y estimación de 1RM?',
      icon: TrendingUp
    });
    list.push({
      id: '1rm_calc',
      label: '⚡ Calcular 1RM',
      query: 'Ayúdame a calcular mi 1RM estimado',
      icon: Sparkles
    });

    return list.slice(0, 4); // Mostrar máximo 4 de forma muy elegante
  }, [workouts, currentActiveWorkout, userProfile]);

  // Auto-scroll al final del chat
  const scrollToBottom = () => {
    if (flatListRef.current) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [coachChatMessages, isTyping]);

  // Función para procesar y enviar mensaje
  const sendQuery = async (queryText) => {
    if (!queryText.trim()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const userMsg = { id: Date.now().toString(), sender: 'user', text: queryText };
    // Guardar mensaje en Zustand localmente
    addCoachChatMessage(userMsg);
    setInputVal('');
    setIsTyping(true);

    try {
      const history = coachChatMessages || [];
      const result = await queryCoach(queryText, history, {
        workouts,
        routines,
        programs,
        userProfile,
        currentActiveWorkout
      });
      
      const botMsg = { 
        id: (Date.now() + 1).toString(), 
        sender: 'bot', 
        text: result.respuesta 
      };
      addCoachChatMessage(botMsg);
    } catch (err) {
      const botMsg = { 
        id: (Date.now() + 1).toString(), 
        sender: 'bot', 
        text: 'Lo siento, Atleta. Ocurrió un error al contactar al Coach en la nube.' 
      };
      addCoachChatMessage(botMsg);
    } finally {
      setIsTyping(false);
    }
  };

  // Nueva Conversación (Vaciar historial)
  const handleNewConversation = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setCoachChatMessages([]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} className="flex-1">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 + insets.top : 0}
        style={{ flex: 1 }}
      >
        {/* Cabecera Premium con Safe Area superior */}
        <View
          className="px-5 border-b flex-row justify-between items-center"
          style={{
            backgroundColor: colors.card + '99',
            borderBottomColor: `${colors.border}40`,
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: 16
          }}
        >
          <View className="flex-row items-center gap-x-3.5">
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.goBack();
              }}
              className="p-1 rounded-lg border"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <ChevronLeft size={20} color="#f8fafc" />
            </TouchableOpacity>
            
            <View className="flex-row items-center gap-x-2.5">
              <View 
                className="w-9 h-9 rounded-xl items-center justify-center"
                style={{ backgroundColor: `${colors.accent}15` }}
              >
                <Bot size={18} color={colors.accent} />
              </View>
              <View>
                <Text className="text-white font-outfit-bold text-sm leading-tight">Elite Coach</Text>
                <View className="flex-row items-center gap-x-1.5 mt-0.5">
                  <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <Text className="text-slate-500 font-inter-semibold text-[8px] uppercase tracking-widest">En Línea</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Nueva conversación */}
          <TouchableOpacity
            onPress={handleNewConversation}
            className="flex-row items-center gap-x-1 px-3 py-1.5 rounded-xl border"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <Trash2 size={12} color="#f43f5e" />
            <Text className="text-[9px] font-outfit-bold text-rose-500 uppercase tracking-wider">Reiniciar</Text>
          </TouchableOpacity>
        </View>

        {/* Listado de Mensajes */}
        <FlatList
          ref={flatListRef}
          data={coachChatMessages}
          keyExtractor={(item) => item.id}
          className="flex-1 px-5 pt-4"
          contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
          onScrollToIndexFailed={() => {}}
          renderItem={({ item }) => {
            const isUser = item.sender === 'user';
            return (
              <View className={`mb-4 flex-row ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                  <View
                    className="w-6 h-6 rounded-lg items-center justify-center mr-2.5 mt-1 border"
                    style={{ backgroundColor: colors.card, borderColor: colors.border }}
                  >
                    <Bot size={11} color={colors.accent} />
                  </View>
                )}
                
                <View 
                  style={{ 
                    backgroundColor: isUser ? colors.accent : colors.card,
                    borderColor: isUser ? 'transparent' : colors.border,
                    borderWidth: isUser ? 0 : 1,
                    maxWidth: '82%' 
                  }} 
                  className={`px-4 py-3 rounded-[20px] ${isUser ? 'rounded-tr-none' : 'rounded-tl-none'}`}
                >
                  {isUser ? (
                    <Text className="text-white text-xs font-inter-medium leading-relaxed">
                      {item.text}
                    </Text>
                  ) : (
                    renderFormattedText(item.text, colors)
                  )}
                </View>
              </View>
            );
          }}
          ListFooterComponent={
            isTyping ? (
              <View className="flex-row justify-start mb-4">
                <View
                  className="w-6 h-6 rounded-lg items-center justify-center mr-2.5 mt-1 border"
                  style={{ backgroundColor: colors.card, borderColor: colors.border }}
                >
                  <Bot size={11} color={colors.accent} />
                </View>
                <View
                  style={{ backgroundColor: colors.card, borderColor: colors.border }}
                  className="px-4 py-3 rounded-[20px] rounded-tl-none border flex-row items-center gap-x-2"
                >
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Text className="text-slate-400 text-xs italic font-inter-medium">Elite Coach está pensando...</Text>
                </View>
              </View>
            ) : null
          }
        />

        {/* Acciones Rápidas Dinámicas */}
        {coachChatMessages && coachChatMessages.length < 3 && !isTyping && (
          <View className="px-5 pb-3">
            <FlatList
              horizontal
              data={dynamicChips}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
              renderItem={({ item }) => {
                const IconComp = item.icon;
                return (
                  <TouchableOpacity
                    onPress={() => sendQuery(item.query)}
                    className="flex-row items-center gap-x-1.5 px-3 py-2 rounded-full border"
                    style={{ backgroundColor: colors.card, borderColor: colors.border }}
                  >
                    {IconComp && <IconComp size={10} color={colors.accent} />}
                    <Text className="text-white text-[10px] font-outfit-bold">{item.label}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}

        {/* Cuadro de Entrada de Texto Fijo con Safe Area inferior */}
        <View
          className="p-4 border-t flex-row items-center gap-x-3"
          style={{
            backgroundColor: colors.card + '99',
            borderTopColor: `${colors.border}30`,
            paddingBottom: Math.max(insets.bottom, 16)
          }}
        >
          <TextInput
            value={inputVal}
            onChangeText={setInputVal}
            placeholder="Pregunta sobre tu fatiga, marcas, nutrición..."
            placeholderTextColor="#475569"
            onSubmitEditing={() => sendQuery(inputVal)}
            className="flex-1 rounded-2xl h-12 px-4 text-white text-xs font-inter-medium border"
            style={{ color: 'white', backgroundColor: colors.card, borderColor: colors.border }}
          />
          <TouchableOpacity
            onPress={() => sendQuery(inputVal)}
            className="w-12 h-12 rounded-2xl items-center justify-center"
            style={{ backgroundColor: colors.accent }}
          >
            <Send size={15} color={colors.accentText} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <ContextualTooltip
        visible={completedTutorials ? !completedTutorials.coach : true}
        title="Tu Coach Inteligente"
        description="Elite Coach es tu asistente de IA. Pregúntale sobre fatiga muscular, sugerencias de rutinas, recetas o estimaciones de tu progreso físico."
        stepText="Paso 4 / 4"
        onNext={() => markTutorialCompleted('coach')}
        onDismiss={() => markTutorialCompleted('coach')}
      />
    </View>
  );
}
