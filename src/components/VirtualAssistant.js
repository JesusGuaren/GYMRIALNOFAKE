import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet } from 'react-native';
import { Bot, Sparkles, Trophy, Flame, X, Send, Zap, Award, Target, MessageSquare } from 'lucide-react-native';
import useStore, { THEMES } from '../store/useStore';
import { queryCoach } from '../services/EliteCoachService';
import Animated, { FadeIn, SlideInDown, Layout } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function VirtualAssistant() {
  const { workouts, routines, programs, userProfile, currentActiveWorkout, theme } = useStore();
  const colors = THEMES[theme] || THEMES.midnight;
  
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      sender: 'bot', 
      text: '¡Hola, Atleta! 🦾 Soy tu Asistente Coach Inteligente. Tengo acceso en tiempo real a tu racha, fatiga muscular, objetivos e historial de marcas.\n\n¿En qué te puedo ayudar hoy? Pregúntame sobre qué entrenar, consejos de fatiga, análisis de marcas o calculadora de 1RM.' 
    }
  ]);

  const scrollViewRef = useRef();

  const today = new Date().toISOString().split('T')[0];
  const todayWorkouts = (workouts || []).filter(w => w.workout_date === today);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isTyping]);

  const handleSend = (textToSend) => {
    const text = textToSend || inputValue;
    if (!text.trim()) return;

    // Add user message
    const userMsg = { id: Date.now(), sender: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Llamar al servicio del LLM
    setTimeout(async () => {
      try {
        const result = await queryCoach(text, messages, {
          workouts,
          routines,
          programs,
          userProfile,
          currentActiveWorkout
        });
        const botMsg = { id: Date.now() + 1, sender: 'bot', text: result.respuesta };
        setMessages(prev => [...prev, botMsg]);
      } catch (err) {
        const botMsg = { id: Date.now() + 1, sender: 'bot', text: 'Disculpa, Atleta. Hubo un error de conexión al consultar con el Coach.' };
        setMessages(prev => [...prev, botMsg]);
      } finally {
        setIsTyping(false);
      }
    }, 500);
  };

  const quickReplies = [
    { label: '📊 ¿Qué entreno hoy?', query: '¿Qué entreno hoy?' },
    { label: '🔥 Estado de fatiga', query: 'Estado de fatiga' },
    { label: '🏆 Mis Récords', query: 'Ver mis récords' },
    { label: '👑 Mi Rango', query: '¿Cuál es mi rango?' },
    { label: '⚡ Calcular 1RM', query: 'Calculadora de 1RM' },
    { label: '💡 Consejo del Coach', query: 'Dame un consejo' }
  ];

  return (
    <View className="mb-6">
      {!isOpen ? (
        <TouchableOpacity 
          onPress={() => setIsOpen(true)}
          className="w-full p-4 rounded-2xl border flex-row items-center justify-between"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <View className="flex-row items-center flex-1 mr-4">
            <View className="bg-purple-500/20 p-3 rounded-xl mr-4">
              <Bot size={24} color={colors.accent} />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-x-2">
                <Text className="text-white font-black text-base">Asistente Coach IA</Text>
                <Sparkles size={14} color="#fbbf24" />
              </View>
              <Text className="text-slate-400 text-xs mt-0.5" numberOfLines={1}>
                {todayWorkouts.length > 0 ? '¡Buen trabajo hoy! Toca para chatear o ver el resumen' : '¿En qué músculo nos enfocamos hoy? Chatea conmigo.'}
              </Text>
            </View>
          </View>
          <MessageSquare size={16} color="#64748b" />
        </TouchableOpacity>
      ) : (
        <Animated.View 
          entering={FadeIn} 
          className="p-5 rounded-3xl border relative"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          {/* Header */}
          <View className="flex-row justify-between items-center pb-3 border-b border-slate-800/80 mb-3">
            <View className="flex-row items-center gap-x-3">
              <View className="bg-purple-600/20 p-2 rounded-xl">
                <Bot size={20} color={colors.accent} />
              </View>
              <View>
                <Text className="text-white font-extrabold text-sm">Asistente Coach</Text>
                <View className="flex-row items-center gap-x-1">
                  <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <Text className="text-slate-500 text-[10px] font-bold">CEREBRO LOCAL CONECTADO</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity 
              onPress={() => setIsOpen(false)}
              className="bg-slate-800/40 p-2 rounded-full"
            >
              <X size={16} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Chat Messages Area */}
          <ScrollView 
            ref={scrollViewRef}
            style={{ height: 280 }}
            className="bg-slate-950/40 rounded-2xl p-3 mb-3 border border-slate-900/30"
          >
            {messages.map((msg) => (
              <View 
                key={msg.id} 
                className={`mb-3 flex-row ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <View 
                  style={{ 
                    backgroundColor: msg.sender === 'user' ? colors.accent : '#1e293b',
                    maxWidth: '85%' 
                  }} 
                  className={`p-3 rounded-2xl ${msg.sender === 'user' ? 'rounded-tr-none' : 'rounded-tl-none'}`}
                >
                  <Text className="text-white text-xs leading-5">
                    {msg.text}
                  </Text>
                </View>
              </View>
            ))}

            {isTyping && (
              <View className="flex-row justify-start mb-3">
                <View className="bg-slate-800 p-3 rounded-2xl rounded-tl-none">
                  <Text className="text-slate-400 text-xs italic">Escribiendo consejo...</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Quick Replies Chips */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            className="mb-3 flex-row gap-x-2"
          >
            {quickReplies.map((reply) => (
              <TouchableOpacity
                key={reply.query}
                onPress={() => handleSend(reply.query)}
                className="bg-slate-800/50 border border-slate-700/30 px-3 py-1.5 rounded-full mr-2"
              >
                <Text className="text-slate-300 font-bold text-[10px]">{reply.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Input Area */}
          <View className="flex-row items-center gap-x-2">
            <TextInput
              value={inputValue}
              onChangeText={setInputValue}
              placeholder="Pregúntame algo..."
              placeholderTextColor="#475569"
              className="flex-1 bg-slate-950/60 rounded-2xl h-11 px-4 text-white text-xs font-bold border border-slate-900"
            />
            <TouchableOpacity
              onPress={() => handleSend()}
              className="w-11 h-11 rounded-2xl items-center justify-center bg-blue-600 shadow-md shadow-blue-600/30"
            >
              <Send size={16} color="white" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
}
