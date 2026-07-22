import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { HelpCircle } from 'lucide-react-native';
import useStore, { THEMES } from '../../store/useStore';

// Ícono de ayuda persistente y reutilizable para jerga técnica (RPE, 1RM, etc).
// A diferencia de un tutorial de una sola vez, esto queda siempre disponible
// para volver a consultarlo cuando el usuario lo necesite.
export default function InfoHint({ title, description, size = 11, iconColor = '#64748b' }) {
  const theme = useStore(state => state.theme);
  const colors = THEMES[theme] || THEMES.midnight;
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <HelpCircle size={size} color={iconColor} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity activeOpacity={1} onPress={() => setOpen(false)} className="flex-1 bg-black/70 items-center justify-center p-8">
          <View className="p-5 rounded-2xl border w-full max-w-xs" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <Text className="text-white font-bold text-sm mb-1.5">{title}</Text>
            <Text className="text-slate-400 text-xs leading-relaxed">{description}</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
