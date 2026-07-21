import React, { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../lib/supabase';
import { Mail, Lock, Dumbbell } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Svg, { Path } from 'react-native-svg';
import PreciseInput from '../../components/common/PreciseInput';
import PreciseButton from '../../components/common/PreciseButton';
import useStore, { THEMES } from '../../store/useStore';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }) {
  const theme = useStore(state => state.theme);
  const colors = THEMES[theme] || THEMES.midnight;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  async function handleAuth() {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor ingresa tu correo y contraseña');
      return;
    }

    setLoading(true);
    let error = null;

    if (isLogin) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });
      error = signInError;
    } else {
      const redirectUrl = Linking.createURL('', { scheme: 'gymtracker' });
      console.log('Redirect URI para registro:', redirectUrl);
      const { error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: redirectUrl,
        }
      });
      error = signUpError;
      if (!error) {
        Alert.alert('Registro exitoso', 'Por favor revisa tu correo para verificar tu cuenta.');
      }
    }

    if (error) {
      Alert.alert('Error', error.message);
    }
    setLoading(false);
  }

  async function handleGoogleLogin() {
    setLoading(true);
    try {
      const redirectUri = Linking.createURL('');

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('No se pudo generar la URL de autenticación');

      // Abre el navegador del sistema. Cuando Google completa el OAuth,
      // Android intercepta el redirect gymtracker://?code=... y lo maneja
      // handleDeepLink en App.js, que llama a exchangeCodeForSession.
      await WebBrowser.openBrowserAsync(data.url);

      // El navegador se cerró (el usuario terminó o canceló el flujo).
      // Si completó, handleDeepLink ya habrá procesado el código de sesión.
      setLoading(false);
    } catch (error) {
      Alert.alert('Error de Autenticación', error.message || 'Ocurrió un error inesperado al iniciar sesión con Google.');
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
      <View className="flex-1 justify-center px-8">
        {/* Header Section */}
        <View className="items-center mb-12">
          <View
            className="w-20 h-20 rounded-full items-center justify-center mb-4 border"
            style={{ backgroundColor: `${colors.accent}33`, borderColor: `${colors.accent}4D` }}
          >
            <Dumbbell size={40} color={colors.accent} strokeWidth={1.5} />
          </View>
          <Text className="text-4xl font-extrabold text-white tracking-tight">ELITE</Text>
          <Text className="text-lg font-medium tracking-widest mt-1" style={{ color: colors.accent }}>GYM TRACKER</Text>
        </View>

        {/* Form Section */}
        <View className="gap-y-4">
          <PreciseInput
            value={email}
            onChangeText={setEmail}
            placeholder="Correo electrónico"
            icon={Mail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <PreciseInput
            value={password}
            onChangeText={setPassword}
            placeholder="Contraseña"
            icon={Lock}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        {/* Action Button */}
        <PreciseButton
          onPress={handleAuth}
          disabled={loading}
          loading={loading}
          className="w-full mt-8"
        >
          <Text className="text-base font-outfit-bold uppercase" style={{ color: colors.accentText }}>
            {isLogin ? 'Iniciar Sesión' : 'Registrarse'}
          </Text>
        </PreciseButton>

        {/* Divider */}
        <View className="flex-row items-center my-6">
          <View className="flex-1 h-[1px]" style={{ backgroundColor: colors.border }} />
          <Text className="text-slate-500 mx-4 text-xs font-bold uppercase tracking-widest">O</Text>
          <View className="flex-1 h-[1px]" style={{ backgroundColor: colors.border }} />
        </View>

        {/* Google Sign In Button */}
        <PreciseButton
          onPress={handleGoogleLogin}
          disabled={loading}
          variant="secondary"
          className="w-full"
        >
          <Svg width={20} height={20} viewBox="0 0 24 24">
            <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
            <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
          </Svg>
          <Text className="text-white text-base font-outfit-bold ml-3 uppercase">
            Continuar con Google
          </Text>
        </PreciseButton>

        {/* Toggle Mode & Forgot Password */}
        <View className="mt-6 gap-y-4">
          <View className="flex-row justify-center">
            <Text className="text-slate-400 text-base">
              {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
            </Text>
            <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
              <Text className="text-base font-bold" style={{ color: colors.accent }}>
                {isLogin ? 'Regístrate' : 'Inicia Sesión'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {isLogin && (
            <TouchableOpacity 
              onPress={() => navigation.navigate('ForgotPassword')}
              className="items-center py-2"
            >
              <Text className="text-slate-500 text-sm font-medium underline">
                ¿Olvidaste tu contraseña?
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
