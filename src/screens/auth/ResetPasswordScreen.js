import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../lib/supabase';
import { Lock, Sparkles } from 'lucide-react-native';
import useStore from '../../store/useStore';
import PreciseInput from '../../components/common/PreciseInput';
import PreciseButton from '../../components/common/PreciseButton';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setIsResettingPassword = useStore(state => state.setIsResettingPassword);

  async function handleResetPassword() {
    if (!password || !confirmPassword) {
      Alert.alert('Error', 'Por favor ingresa y confirma tu nueva contraseña');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        Alert.alert('Error al restablecer', error.message);
      } else {
        Alert.alert(
          'Contraseña Restablecida',
          'Tu contraseña ha sido actualizada con éxito. Inicia sesión con tus nuevas credenciales.',
          [
            { 
              text: 'Aceptar', 
              onPress: async () => {
                await supabase.auth.signOut();
                setIsResettingPassword(false);
              } 
            }
          ]
        );
      }
    } catch (err) {
      Alert.alert('Error', 'Ocurrió un error inesperado al actualizar tu contraseña.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-slate-950"
    >
      <StatusBar style="light" />
      <View className="flex-1 justify-center px-8">
        {/* Header Section */}
        <View className="items-center mb-10">
          <View className="w-16 h-16 bg-blue-600/20 rounded-full items-center justify-center mb-4 border border-blue-500/30">
            <Lock size={32} color="#3b82f6" strokeWidth={1.5} />
          </View>
          <Text className="text-3xl font-extrabold text-white text-center tracking-tight">Nueva Contraseña</Text>
          <Text className="text-slate-400 text-sm text-center mt-2 px-4 leading-relaxed">
            Ingresa tu nueva contraseña para acceder de nuevo a tu cuenta de Elite Gym Tracker.
          </Text>
        </View>

        {/* Inputs */}
        <View className="gap-y-4">
          <PreciseInput
            value={password}
            onChangeText={setPassword}
            placeholder="Nueva contraseña"
            icon={Lock}
            secureTextEntry
            autoCapitalize="none"
          />

          <PreciseInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirmar contraseña"
            icon={Lock}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        {/* Action Button */}
        <PreciseButton
          onPress={handleResetPassword}
          disabled={loading}
          loading={loading}
          className="w-full mt-8"
        >
          <Text className="text-white text-base font-outfit-bold uppercase tracking-wider">
            Guardar Contraseña
          </Text>
        </PreciseButton>
      </View>
    </KeyboardAvoidingView>
  );
}
