import React from 'react';
import { View } from 'react-native';
import useStore, { THEMES } from '../../store/useStore';

export default function SolidCard({ children, className = '', style = {}, ...props }) {
  const theme = useStore(state => state.theme);
  const colors = THEMES[theme] || THEMES.midnight;

  return (
    <View
      className={`rounded-[24px] border p-5 ${className}`}
      style={[
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        style
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
