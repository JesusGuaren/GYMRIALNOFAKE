import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import useStore, { THEMES } from '../../store/useStore';

export default function PreciseButton({
  children,
  title,
  onPress,
  className = '',
  textClassName = '',
  style = {},
  disabled = false,
  loading = false,
  variant = 'primary',
  ...props
}) {
  const theme = useStore(state => state.theme);
  const colors = THEMES[theme] || THEMES.midnight;

  // Determine background and text colors based on variant and active theme
  let bgStyle = {};
  let textStyle = { color: '#ffffff' };

  if (variant === 'primary') {
    bgStyle = { backgroundColor: colors.accent };
    textStyle = { color: colors.accentText };
  } else if (variant === 'secondary') {
    bgStyle = { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1.5 };
    textStyle = { color: colors.accent };
  } else if (variant === 'danger') {
    bgStyle = { backgroundColor: '#ef4444' };
  } else if (variant === 'success') {
    bgStyle = { backgroundColor: '#10b981' };
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      className={`h-14 rounded-2xl flex-row justify-center items-center px-6 ${className}`}
      style={[
        bgStyle,
        disabled && { opacity: 0.5 },
        style
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? colors.accent : variant === 'primary' ? colors.accentText : '#ffffff'} size="small" />
      ) : (typeof children === 'string' || title) ? (
        <Text
          className={`font-outfit-bold text-base tracking-wider text-center ${textClassName}`}
          style={textStyle}
        >
          {title || children}
        </Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}
