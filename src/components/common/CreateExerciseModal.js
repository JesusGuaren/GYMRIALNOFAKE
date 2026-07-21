import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert } from 'react-native';
import { Dumbbell } from 'lucide-react-native';
import useStore, { THEMES } from '../../store/useStore';
import { PRIMARY_GROUPS } from '../../constants/Muscles';
import { translateMuscleGroup } from '../../constants/Muscles';
import PreciseInput from './PreciseInput';
import PreciseButton from './PreciseButton';

// Modal reutilizable para crear un ejercicio propio (fuera del catálogo semillado).
// Usado desde los 3 selectores de ejercicio (Rutinas, Bitácora, Sesión Activa).
export default function CreateExerciseModal({ visible, onClose, initialName = '', onCreated }) {
  const theme = useStore(state => state.theme);
  const colors = THEMES[theme] || THEMES.midnight;
  const createCustomExercise = useStore(state => state.createCustomExercise);

  const [name, setName] = useState(initialName);
  const [muscleGroup, setMuscleGroup] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) setName(initialName);
  }, [visible, initialName]);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert("Nombre Requerido", "Ingresa un nombre para el ejercicio.");
      return;
    }
    if (!muscleGroup) {
      Alert.alert("Grupo Muscular Requerido", "Selecciona qué músculo trabaja este ejercicio.");
      return;
    }

    setSaving(true);
    try {
      const newExercise = await createCustomExercise(name.trim(), muscleGroup);
      setName('');
      setMuscleGroup(null);
      onCreated?.(newExercise);
      onClose();
    } catch (err) {
      Alert.alert("Error", "No se pudo crear el ejercicio.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/80 items-center justify-center p-6">
        <View className="p-6 rounded-3xl w-full max-w-sm border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <View className="flex-row items-center gap-x-2 mb-4">
            <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: `${colors.accent}1A` }}>
              <Dumbbell size={18} color={colors.accent} />
            </View>
            <Text className="text-white font-black text-lg">Crear Ejercicio</Text>
          </View>

          <Text className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-2">Nombre</Text>
          <PreciseInput
            value={name}
            onChangeText={setName}
            placeholder="Ej. Press en Máquina Hammer"
            className="mb-4"
          />

          <Text className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-2">Grupo Muscular</Text>
          <View className="flex-row flex-wrap gap-2 mb-6">
            {Object.values(PRIMARY_GROUPS).map(mg => (
              <TouchableOpacity
                key={mg}
                onPress={() => setMuscleGroup(mg)}
                className="px-3 py-2 rounded-xl border"
                style={{
                  backgroundColor: muscleGroup === mg ? colors.accent : colors.bg,
                  borderColor: muscleGroup === mg ? colors.accent : colors.border
                }}
              >
                <Text
                  className="text-[10px] font-bold uppercase"
                  style={{ color: muscleGroup === mg ? colors.accentText : '#94a3b8' }}
                >
                  {translateMuscleGroup(mg)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View className="flex-row gap-x-3">
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 py-3.5 rounded-2xl items-center justify-center border"
              style={{ backgroundColor: colors.bg, borderColor: colors.border }}
            >
              <Text className="text-slate-400 font-bold text-xs uppercase tracking-wider">Cancelar</Text>
            </TouchableOpacity>
            <PreciseButton onPress={handleCreate} disabled={saving} loading={saving} className="flex-1">
              <Text style={{ color: colors.accentText }} className="font-bold text-xs uppercase tracking-wider">Crear</Text>
            </PreciseButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}
