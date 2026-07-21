import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, Alert, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../lib/supabase';
import { Mail, ChevronLeft, Dumbbell, Sparkles } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import PreciseInput from '../../components/common/PreciseInput';
import PreciseButton from '../../components/common/PreciseButton';
import useStore, { THEMES } from '../../store/useStore';

export default function ForgotPasswordScreen({ navigation }) {
  const theme = useStore(state => state.theme);
  const colors = THEMES[theme] || THEMES.midnight;
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleResetRequest() {
    if (!email) {
      Alert.alert('Error', 'Por favor ingresa tu correo electrónico');
      return;
    }

    setLoading(true);
    try {
      // El redirectUri debe usar el deep linking scheme 'gymtracker://'
      // En desarrollo Expo, se suele redirigir a la URL del emulador, pero 'gymtracker://' es el deep link registrado.
      const redirectUrl = Linking.createURL('recovery', { scheme: 'gymtracker' });
      console.log('Redirect URI para restauración:', redirectUrl);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert(
          'Correo enviado',
          'Hemos enviado un enlace de recuperación a tu correo electrónico. Por favor revisa tu bandeja de entrada y spam.',
          [{ text: 'Entendido', onPress: () => navigation.goBack() }]
        );
      }
    } catch (err) {
      Alert.alert('Error', 'Ocurrió un error inesperado al procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
      style={{ backgroundColor: colors.bg }}
    >
      <StatusBar style="light" />

      {/* Header Navigation */}
      <View className="absolute top-12 left-6 z-10">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-full items-center justify-center border"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <ChevronLeft color="#e2e8f0" size={24} />
        </TouchableOpacity>
      </View>

      <View className="flex-1 justify-center px-8">
        {/* Header Section */}
        <View className="items-center mb-10">
          <View
            className="w-16 h-16 rounded-full items-center justify-center mb-4 border"
            style={{ backgroundColor: `${colors.accent}33`, borderColor: `${colors.accent}4D` }}
          >
            <Sparkles size={32} color={colors.accent} strokeWidth={1.5} />
          </View>
          <Text className="text-3xl font-extrabold text-white text-center tracking-tight">Recuperar Cuenta</Text>
          <Text className="text-slate-400 text-sm text-center mt-2 px-4 leading-relaxed">
            Ingresa tu correo registrado y te enviaremos un enlace para restablecer tu contraseña.
          </Text>
        </View>

        {/* Input */}
        <View className="gap-y-4">
          <PreciseInput
            value={email}
            onChangeText={setEmail}
            placeholder="Correo electrónico"
            icon={Mail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        {/* Action Button */}
        <PreciseButton
          onPress={handleResetRequest}
          disabled={loading}
          loading={loading}
          className="w-full mt-6"
        >
          <Text className="text-base font-outfit-bold uppercase tracking-wider" style={{ color: colors.accentText }}>
            Enviar Enlace
          </Text>
        </PreciseButton>
      </View>
    </KeyboardAvoidingView>
  );
}
