import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { ChevronLeft, TrendingUp, TrendingDown, Scale, Percent, Plus, Trash2, Calendar } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStore, { THEMES } from '../../store/useStore';
import Animated, { FadeIn } from 'react-native-reanimated';
import SimpleLineChart from '../../components/common/SimpleLineChart';
import PreciseButton from '../../components/common/PreciseButton';
import * as Haptics from 'expo-haptics';

export default function BodyMetricsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme, bodyMetrics, logBodyMetric, deleteBodyMetric } = useStore();
  const colors = THEMES[theme] || THEMES.midnight;

  const [showLogModal, setShowLogModal] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [bodyFatInput, setBodyFatInput] = useState('');
  const [saving, setSaving] = useState(false);

  const sorted = useMemo(() => [...(bodyMetrics || [])].sort((a, b) => new Date(a.date) - new Date(b.date)), [bodyMetrics]);

  const chartData = useMemo(() => sorted
    .filter(m => m.weight != null)
    .map(m => ({
      date: new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      weight: m.weight
    })), [sorted]);

  const current = sorted[sorted.length - 1] || null;
  const previous = sorted[sorted.length - 2] || null;
  const trend = current && previous && previous.weight ? current.weight - previous.weight : null;

  const handleOpenLog = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWeightInput(current?.weight ? String(current.weight) : '');
    setBodyFatInput(current?.body_fat ? String(current.body_fat) : '');
    setShowLogModal(true);
  };

  const handleSaveLog = async () => {
    const w = parseFloat(weightInput);
    if (!w) {
      Alert.alert("Peso Requerido", "Ingresa un peso válido.");
      return;
    }
    const bf = bodyFatInput ? parseFloat(bodyFatInput) : null;
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await logBodyMetric(today, w, bf, null);
      setShowLogModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      Alert.alert("Error", "No se pudo registrar el peso.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (entry) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Eliminar Registro",
      `¿Eliminar el registro del ${new Date(entry.date).toLocaleDateString()}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteBodyMetric(entry.id);
            } catch (err) {
              Alert.alert("Error", "No se pudo eliminar el registro.");
            }
          }
        }
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View className="px-5 py-4 border-b flex-row items-center justify-between" style={{ borderColor: colors.border }}>
        <View className="flex-row items-center gap-x-4">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: colors.card }}>
            <ChevronLeft color="white" size={20} />
          </TouchableOpacity>
          <View>
            <Text className="text-white text-xl font-black">Progreso Corporal</Text>
            <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest">Historial de Peso</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={handleOpenLog}
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: colors.accent }}
        >
          <Plus size={20} color={colors.accentText} strokeWidth={3} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Stats Cards */}
        <View className="flex-row gap-x-3 mb-8">
          <View className="flex-1 p-4 rounded-3xl border items-center" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <Scale size={16} color={colors.accent} className="mb-2" />
            <Text className="text-white text-lg font-black">{current?.weight ?? '--'}kg</Text>
            <Text className="text-slate-500 text-[8px] font-bold uppercase tracking-tighter">Peso Actual</Text>
          </View>
          <View className="flex-1 p-4 rounded-3xl border items-center" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            {trend == null ? (
              <TrendingUp size={16} color="#64748b" className="mb-2" />
            ) : trend > 0 ? (
              <TrendingUp size={16} color="#ef4444" className="mb-2" />
            ) : (
              <TrendingDown size={16} color="#10b981" className="mb-2" />
            )}
            <Text className="text-white text-lg font-black">{trend == null ? '--' : `${trend > 0 ? '+' : ''}${trend.toFixed(1)}kg`}</Text>
            <Text className="text-slate-500 text-[8px] font-bold uppercase tracking-tighter">Desde Último</Text>
          </View>
          <View className="flex-1 p-4 rounded-3xl border items-center" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <Percent size={16} color="#8b5cf6" className="mb-2" />
            <Text className="text-white text-lg font-black">{current?.body_fat ?? '--'}%</Text>
            <Text className="text-slate-500 text-[8px] font-bold uppercase tracking-tighter">Grasa Corp.</Text>
          </View>
        </View>

        {chartData.length < 2 ? (
          <View className="border border-dashed rounded-3xl p-10 items-center mb-8" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <Calendar size={48} color="#475569" opacity={0.3} className="mb-4" />
            <Text className="text-slate-500 text-center text-sm font-medium">Registra al menos 2 pesos para ver tu tendencia.</Text>
          </View>
        ) : (
          <Animated.View entering={FadeIn.delay(100)} className="p-6 rounded-[32px] border mb-8" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <Text className="text-white font-black text-base mb-6">Tendencia de Peso</Text>
            <SimpleLineChart data={chartData} color={colors.accent} dataKey="weight" />
          </Animated.View>
        )}

        {/* History List */}
        <View className="gap-y-3">
          <Text style={{ color: colors.accent }} className="text-xs font-black uppercase tracking-widest mb-1">Registros</Text>
          {sorted.length === 0 ? (
            <Text className="text-slate-500 text-xs text-center py-6">Aún no registraste ningún peso.</Text>
          ) : (
            [...sorted].reverse().map(entry => (
              <View
                key={entry.id}
                className="p-4 rounded-2xl border flex-row items-center justify-between"
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
              >
                <View>
                  <Text className="text-white font-bold text-sm">{new Date(entry.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
                  <Text className="text-slate-500 text-xs mt-0.5">
                    {entry.weight}kg{entry.body_fat ? ` · ${entry.body_fat}% grasa` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDelete(entry)}
                  className="w-8 h-8 rounded-lg bg-red-950/20 items-center justify-center border border-red-900/10"
                >
                  <Trash2 size={14} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Log Weight Modal */}
      <Modal visible={showLogModal} transparent animationType="fade">
        <View className="flex-1 bg-black/80 items-center justify-center p-6">
          <View className="p-6 rounded-3xl w-full max-w-sm border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <Text className="text-white font-black text-xl mb-4">Registrar Peso de Hoy</Text>

            <Text className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-2">Peso (kg)</Text>
            <TextInput
              value={weightInput}
              onChangeText={setWeightInput}
              keyboardType="numeric"
              placeholder="75.5"
              placeholderTextColor="#475569"
              className="h-14 border rounded-2xl px-4 text-white font-bold text-base mb-4"
              style={{ backgroundColor: colors.bg, borderColor: colors.border }}
            />

            <Text className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-2">% Grasa Corporal (opcional)</Text>
            <TextInput
              value={bodyFatInput}
              onChangeText={setBodyFatInput}
              keyboardType="numeric"
              placeholder="18"
              placeholderTextColor="#475569"
              className="h-14 border rounded-2xl px-4 text-white font-bold text-base mb-6"
              style={{ backgroundColor: colors.bg, borderColor: colors.border }}
            />

            <View className="flex-row gap-x-3">
              <TouchableOpacity
                onPress={() => setShowLogModal(false)}
                className="flex-1 py-3.5 rounded-2xl items-center justify-center border"
                style={{ backgroundColor: colors.bg, borderColor: colors.border }}
              >
                <Text className="text-slate-400 font-bold text-xs uppercase tracking-wider">Cancelar</Text>
              </TouchableOpacity>
              <PreciseButton onPress={handleSaveLog} disabled={saving} loading={saving} className="flex-1">
                <Text style={{ color: colors.accentText }} className="font-bold text-xs uppercase tracking-wider">Guardar</Text>
              </PreciseButton>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
