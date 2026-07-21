import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Modal } from 'react-native';
import { ChevronLeft, Edit2, Trash2, CheckCircle2, Layers, Sparkles } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStore, { THEMES } from '../../store/useStore';
import * as Haptics from 'expo-haptics';
import PreciseInput from '../../components/common/PreciseInput';
import PreciseButton from '../../components/common/PreciseButton';

export default function ProgramManagerScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme, programs, setActiveProgram, deleteProgram, renameProgram } = useStore();
  const colors = THEMES[theme] || THEMES.midnight;

  const [editingProgram, setEditingProgram] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleActivate = async (program) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await setActiveProgram(program.id);
    } catch (err) {
      Alert.alert("Error", "No se pudo activar el programa.");
    }
  };

  const handleOpenEdit = (program) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingProgram(program);
    setEditName(program.name || '');
    setEditDescription(program.description || '');
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      Alert.alert("Error", "El nombre del programa no puede estar vacío.");
      return;
    }
    setSaving(true);
    try {
      await renameProgram(editingProgram.id, editName.trim(), editDescription.trim());
      setEditingProgram(null);
    } catch (err) {
      Alert.alert("Error", "No se pudo renombrar el programa.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = (program) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Eliminar Programa",
      `¿Estás completamente seguro de que deseas eliminar "${program.name}"? Se eliminarán también todas sus rutinas asociadas. Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteProgram(program.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (err) {
              Alert.alert("Error", "No se pudo eliminar el programa.");
            }
          }
        }
      ]
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-6 py-4 border-b flex-row items-center" style={{ borderColor: colors.border }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-full items-center justify-center mr-4 border"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <ChevronLeft color="#e2e8f0" size={24} />
        </TouchableOpacity>
        <View>
          <Text className="text-white text-2xl font-black">Programas</Text>
          <Text className="text-slate-500 text-xs">Activa, renombra o elimina tus programas</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 100 }}>
        {(!programs || programs.length === 0) ? (
          <View className="p-8 rounded-3xl border border-dashed items-center justify-center py-10" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <View className="w-14 h-14 rounded-full items-center justify-center mb-4 border" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
              <Layers size={24} color="#64748b" />
            </View>
            <Text className="text-white font-bold text-sm text-center">Aún no tienes programas</Text>
            <Text className="text-slate-500 text-xs text-center mt-1 px-4">
              Un programa agrupa varias rutinas (días) bajo un mismo split de entrenamiento. Créalo con el Creador IA.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('AIRoutine')}
              className="mt-5 px-5 py-2.5 rounded-xl flex-row items-center gap-x-2"
              style={{ backgroundColor: colors.accent }}
            >
              <Sparkles size={16} color={colors.accentText} strokeWidth={2.5} />
              <Text style={{ color: colors.accentText }} className="font-bold text-xs uppercase">Crear con IA</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="gap-y-4">
            {programs.map(p => {
              const isActive = !!p.is_active;
              const dayCount = p.routines?.length || 0;
              return (
                <View
                  key={p.id}
                  className="p-5 rounded-3xl border"
                  style={{
                    backgroundColor: isActive ? `${colors.accent}10` : colors.card,
                    borderColor: isActive ? `${colors.accent}40` : colors.border
                  }}
                >
                  <View className="flex-row justify-between items-start mb-4">
                    <View className="flex-1 mr-4">
                      <View className="flex-row items-center gap-x-2">
                        <Text className="text-white font-bold text-lg">{p.name}</Text>
                        {isActive && <CheckCircle2 size={16} color={colors.accent} />}
                      </View>
                      {p.description && (
                        <Text className="text-slate-400 text-xs mt-1" numberOfLines={2}>
                          {p.description}
                        </Text>
                      )}
                      <View className="flex-row items-center gap-x-2 mt-3">
                        {isActive && (
                          <View className="px-2 py-0.5 rounded border" style={{ backgroundColor: `${colors.accent}1A`, borderColor: `${colors.accent}33` }}>
                            <Text style={{ color: colors.accent }} className="text-[10px] font-extrabold uppercase">Activo</Text>
                          </View>
                        )}
                        <View className="px-2 py-0.5 rounded border" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                          <Text className="text-slate-400 text-[10px] font-extrabold uppercase">
                            {dayCount} {dayCount === 1 ? 'Día' : 'Días'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View className="flex-row gap-x-2">
                      <TouchableOpacity
                        onPress={() => handleOpenEdit(p)}
                        className="w-8 h-8 rounded-lg items-center justify-center border"
                        style={{ backgroundColor: colors.bg, borderColor: colors.border }}
                      >
                        <Edit2 size={14} color="#64748b" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleConfirmDelete(p)}
                        className="w-8 h-8 bg-red-950/20 border border-red-900/20 rounded-lg items-center justify-center"
                      >
                        <Trash2 size={14} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {!isActive && (
                    <TouchableOpacity
                      onPress={() => handleActivate(p)}
                      className="w-full py-3 rounded-2xl flex-row items-center justify-center gap-x-2 shadow-md border"
                      style={{ backgroundColor: colors.bg, borderColor: colors.border }}
                    >
                      <CheckCircle2 size={14} color={colors.accent} />
                      <Text style={{ color: colors.accent }} className="font-bold text-xs uppercase tracking-wider">
                        Activar Programa
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Rename Modal */}
      <Modal visible={!!editingProgram} transparent animationType="fade">
        <View className="flex-1 bg-black/80 items-center justify-center p-6">
          <View className="p-6 rounded-3xl w-full max-w-sm border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <Text className="text-white font-black text-xl mb-4">Renombrar Programa</Text>

            <View className="gap-y-3 mb-5">
              <PreciseInput
                value={editName}
                onChangeText={setEditName}
                placeholder="Nombre del programa"
              />
              <PreciseInput
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Descripción (opcional)"
              />
            </View>

            <View className="flex-row gap-x-3">
              <TouchableOpacity
                onPress={() => setEditingProgram(null)}
                className="flex-1 py-3.5 rounded-2xl items-center justify-center border"
                style={{ backgroundColor: colors.bg, borderColor: colors.border }}
              >
                <Text className="text-slate-400 font-bold text-xs uppercase tracking-wider">Cancelar</Text>
              </TouchableOpacity>
              <PreciseButton
                onPress={handleSaveEdit}
                disabled={saving}
                loading={saving}
                className="flex-1"
              >
                <Text style={{ color: colors.accentText }} className="font-bold text-xs uppercase tracking-wider">Guardar</Text>
              </PreciseButton>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
