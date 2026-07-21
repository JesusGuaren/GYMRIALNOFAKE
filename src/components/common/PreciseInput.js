import React, { useState } from 'react';
import { View, TextInput } from 'react-native';
import useStore, { THEMES } from '../../store/useStore';

export default function PreciseInput({
  value,
  onChangeText,
  placeholder,
  icon: Icon,
  className = '',
  style = {},
  secureTextEntry = false,
  keyboardType = 'default',
  ...props
}) {
  const theme = useStore(state => state.theme);
  const colors = THEMES[theme] || THEMES.midnight;
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View
      className={`flex-row items-center rounded-2xl px-4 h-14 border ${className}`}
      style={[
        {
          backgroundColor: '#020617', // Slate 950 sólido para mantener la estética opaca
          borderColor: isFocused ? colors.accent : colors.border,
          borderWidth: 1.5,
        },
        style
      ]}
    >
      {Icon && (
        <View className="mr-3">
          <Icon size={20} color={isFocused ? colors.accent : '#64748b'} />
        </View>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#475569"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="flex-1 text-white font-inter text-base h-full py-0"
        style={{
          textAlignVertical: 'center',
        }}
        {...props}
      />
    </View>
  );
}
