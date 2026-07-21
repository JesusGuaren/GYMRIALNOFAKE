import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { ChevronLeft, Plus, Trash2, Edit2, Play, Info, Sparkles, AlertTriangle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStore, { THEMES } from '../../store/useStore';
import * as Haptics from 'expo-haptics';

const DEFAULT_TEMPLATES = [
  { 
    id: 'ppl', 
    name: 'Push / Pull / Legs', 
    description: 'La división más popular para hipertrofia. Agrupa músculos que trabajan juntos.',
    pros: 'Frecuencia ideal, recuperación optimizada.',
    cons: 'Requiere 3-6 días de compromiso.',
  },
  { 
    id: 'ul', 
    name: 'Upper / Lower', 
    description: 'Excelente para frecuencia 2. Alterna torso completo con pierna.',
    pros: 'Gran balance, perfecto para fuerza.',
    cons: 'Sesiones de pierna muy demandantes.',
  },
  { 
    id: 'arnold', 
    name: 'Arnold Split', 
    description: 'El favorito de la era dorada. Antagonistas juntos para gran bombeo.',
    pros: 'Pump increíble, muy motivador.',
    cons: 'Poca frecuencia para piernas si no se ajusta.',
  },
  { 
    id: 'full', 
    name: 'Full Body', 
    description: 'Perfecto si tienes poco tiempo. Todo el cuerpo cada sesión.',
    pros: 'Máxima eficiencia, ideal para novatos.',
    cons: 'Difícil añadir mucho volumen específico.',
  }
];

export default function RoutineManagerScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme, routines, deleteRoutine } = useStore();
  const colors = THEMES[theme] || THEMES.midnight;

  const handleStartTraining = (routine) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Carga la rutina en Bitácora pasando parámetros
    navigation.navigate('MainTabs', {
      screen: 'Bitácora',
      params: { routineToLoad: routine }
    });
  };

  const handleConfirmDelete = (routineId, routineName) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Eliminar Rutina",
      `¿Estás completamente seguro de que deseas eliminar la rutina "${routineName}"? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Sí, Eliminar", 
          style: "destructive", 
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            try {
              await deleteRoutine(routineId);
              Alert.alert("Eliminado", "La rutina ha sido eliminada con éxito.");
            } catch (err) {
              Alert.alert("Error", "No se pudo eliminar la rutina.");
            }
          } 
        }
      ]
    );
  };

  const handleEditRoutine = (routineId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('RoutineEdit', { routineId });
  };

  const handleCreateRoutine = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('RoutineEdit');
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-6 py-4 border-b border-slate-900 flex-row justify-between items-center">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-full items-center justify-center mr-4"
          >
            <ChevronLeft color="#e2e8f0" size={24} />
          </TouchableOpacity>
          <View>
            <Text className="text-white text-2xl font-black">Gestionar Rutinas</Text>
            <Text className="text-slate-500 text-xs">Crea, edita y organiza tus entrenamientos</Text>
          </View>
        </View>
        <TouchableOpacity 
          onPress={handleCreateRoutine}
          className="w-10 h-10 bg-blue-600 rounded-full items-center justify-center shadow-lg shadow-blue-600/30"
        >
          <Plus color="white" size={20} strokeWidth={3} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Custom Routines */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-blue-500 text-xs font-black uppercase tracking-widest">Mis Rutinas</Text>
            <Text className="text-slate-500 text-xs font-bold">{routines.length} Creadas</Text>
          </View>

          {routines.length === 0 ? (
            <View className="bg-slate-900/40 p-8 rounded-3xl border border-dashed border-slate-800 items-center justify-center py-10">
              <View className="w-14 h-14 rounded-full bg-slate-950 items-center justify-center mb-4 border border-slate-800">
                <Sparkles size={24} color="#64748b" />
              </View>
              <Text className="text-white font-bold text-sm text-center">No tienes rutinas personalizadas</Text>
              <Text className="text-slate-500 text-xs text-center mt-1 px-4">
                Comienza creando una rutina desde cero para estructurar tus entrenamientos favoritos.
              </Text>
              <TouchableOpacity 
                onPress={handleCreateRoutine}
                className="mt-5 px-5 py-2.5 bg-blue-600 rounded-xl flex-row items-center gap-x-2"
              >
                <Plus size={16} color="white" strokeWidth={2.5} />
                <Text className="text-white font-bold text-xs uppercase">Crear Rutina</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="gap-y-4">
              {routines.map(r => (
                <View 
                  key={r.id} 
                  className="bg-slate-900/70 border border-slate-800 p-5 rounded-3xl"
                >
                  <View className="flex-row justify-between items-start mb-4">
                    <View className="flex-1 mr-4">
                      <Text className="text-white font-bold text-lg">{r.name}</Text>
                      <Text className="text-slate-400 text-xs mt-1" numberOfLines={2}>
                        {r.description || "Sin descripción disponible"}
                      </Text>
                      <View className="flex-row items-center gap-x-2 mt-3">
                        <View className="bg-blue-600/10 px-2 py-0.5 rounded border border-blue-500/20">
                          <Text className="text-[10px] text-blue-400 font-extrabold uppercase">
                            {r.routine_exercises?.length || 0} Ejercicios
                          </Text>
                        </View>
                      </View>
                    </View>
                    
                    {/* Acciones de Edición/Borrados Separadas */}
                    <View className="flex-row gap-x-2">
                      <TouchableOpacity 
                        onPress={() => handleEditRoutine(r.id)}
                        className="w-8 h-8 bg-slate-950 border border-slate-800 rounded-lg items-center justify-center"
                      >
                        <Edit2 size={14} color="#64748b" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => handleConfirmDelete(r.id, r.name)}
                        className="w-8 h-8 bg-red-950/20 border border-red-900/20 rounded-lg items-center justify-center"
                      >
                        <Trash2 size={14} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity 
                    onPress={() => handleStartTraining(r)}
                    className="w-full py-3 bg-blue-600 rounded-2xl flex-row items-center justify-center gap-x-2 shadow-md shadow-blue-600/10"
                  >
                    <Play size={14} color="white" fill="white" />
                    <Text className="text-white font-bold text-xs uppercase tracking-wider">
                      Entrenar con esta rutina
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Templates */}
        <View className="mb-6">
          <Text className="text-purple-500 text-xs font-black uppercase tracking-widest mb-4">Plantillas Elite</Text>
          <View className="gap-y-4">
            {DEFAULT_TEMPLATES.map(t => (
              <View 
                key={t.id} 
                className="bg-slate-900/40 border border-slate-800 p-5 rounded-3xl"
              >
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-1 mr-4">
                    <Text className="text-white font-bold text-base">{t.name}</Text>
                    <Text className="text-slate-400 text-xs mt-1 leading-relaxed">
                      {t.description}
                    </Text>
                  </View>
                  <View className="w-8 h-8 bg-purple-500/10 border border-purple-500/20 rounded-lg items-center justify-center">
                    <Info size={16} color="#a855f7" />
                  </View>
                </View>

                {/* En las plantillas, no mostramos editar/eliminar, solo iniciar entrenamiento */}
                <TouchableOpacity 
                  onPress={() => handleStartTraining({
                    name: t.name,
                    routine_exercises: [] // Se cargará dinámicamente o libre con el nombre
                  })}
                  className="w-full py-3 bg-purple-600/15 border border-purple-500/20 rounded-2xl flex-row items-center justify-center gap-x-2"
                >
                  <Play size={14} color="#c084fc" fill="#c084fc" />
                  <Text className="text-purple-300 font-bold text-xs uppercase tracking-wider">
                    Cargar Plantilla
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
