import 'react-native-reanimated';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { supabase } from './src/lib/supabase';
import useStore from './src/store/useStore';
import { View, Text, ActivityIndicator, LogBox } from 'react-native';

import { useFonts } from 'expo-font';
import { Outfit_400Regular, Outfit_500Medium, Outfit_700Bold, Outfit_900Black } from '@expo-google-fonts/outfit';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';

import * as Linking from 'expo-linking';

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'AuthApiError: Invalid Refresh Token: Refresh Token Not Found'
]);
import GlobalRestTimer from './src/components/RestTimer';
import { registerForPushNotificationsAsync } from './src/services/NotificationService';

// Import NativeWind styles
import "./global.css"; 

const parseUrlParams = (url) => {
  if (!url) return {};
  const queryString = url.includes('#') ? url.split('#')[1] : url.split('?')[1];
  if (!queryString) return {};

  const params = {};
  const pairs = queryString.split('&');
  for (const pair of pairs) {
    const [key, value] = pair.split('=');
    if (key && value) {
      params[key] = decodeURIComponent(value);
    }
  }
  return params;
};

export default function App() {
  const { setUser, setSessionChecked, sessionChecked, user, fetchExercises, fetchWorkouts } = useStore();

  const [fontsLoaded] = useFonts({
    'Outfit-Regular': Outfit_400Regular,
    'Outfit-Medium': Outfit_500Medium,
    'Outfit-Bold': Outfit_700Bold,
    'Outfit-Black': Outfit_900Black,
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    // Check active session
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.warn('Supabase session recovery error, signing out to clear cache:', error.message);
          supabase.auth.signOut().then(() => {
            setUser(null);
            setSessionChecked(true);
          });
        } else {
          setUser(session?.user ?? null);
          setSessionChecked(true);
        }
      })
      .catch((err) => {
        console.warn('Supabase getSession exception, clearing storage:', err);
        supabase.auth.signOut().then(() => {
          setUser(null);
          setSessionChecked(true);
        });
      });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // Deep Linking Listener
    const handleDeepLink = async (event) => {
      const url = event.url;
      if (!url) return;

      console.log('--- DEEP LINK INTERCEPTADO ---', url);
      const params = parseUrlParams(url);
      const { access_token, refresh_token, token_hash, type, code } = params;

      // Caso 1: Supabase redirigió con tokens completos (implicit flow)
      if (access_token && refresh_token) {
        try {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) {
            console.error('Error setSession deep link:', error.message);
            return;
          }
          if (type === 'recovery') {
            useStore.getState().setIsResettingPassword(true);
          }
        } catch (e) {
          console.error('Error procesando deep link (setSession):', e.message ?? e);
        }
        return;
      }

      // Caso 2: PKCE flow — Supabase retornó un ?code=...
      if (code) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('Error exchangeCodeForSession deep link:', error.message);
            return;
          }
          console.log('Deep link PKCE session establecida:', data?.session?.user?.email);
        } catch (e) {
          console.error('Error procesando deep link (exchangeCode):', e.message ?? e);
        }
        return;
      }

      // Caso 3: OTP token_hash (formato Supabase email OTP)
      if (token_hash && type) {
        try {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash,
            type,
          });
          if (error) {
            console.error('Error verifyOtp deep link:', error.message);
            return;
          }
          if (type === 'recovery') {
            useStore.getState().setIsResettingPassword(true);
          }
          console.log('Deep link OTP verificado:', data?.user?.email);
        } catch (e) {
          console.error('Error procesando deep link (verifyOtp):', e.message ?? e);
        }
      }
    };

    const linkSub = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    // Solicitar permisos para notificaciones locales
    registerForPushNotificationsAsync();

    return () => {
      subscription.unsubscribe();
      linkSub.remove();
    };
  }, []);

  useEffect(() => {
    if (user) {
      fetchExercises();
      fetchWorkouts();
      useStore.getState().fetchRoutines();
      useStore.getState().fetchUserProfile();
      useStore.getState().fetchPrograms();

      // Restaurar cronómetro si estaba activo
      const timerEndTime = useStore.getState().timerEndTime;
      if (timerEndTime) {
        const remaining = Math.max(0, Math.round((timerEndTime - Date.now()) / 1000));
        if (remaining > 0) {
          useStore.getState().setGlobalTimer(remaining, true);
        } else {
          useStore.getState().setGlobalTimer(null);
        }
      }
    }
  }, [user]);

  if (!sessionChecked || !fontsLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-blue-500 font-bold text-lg font-outfit-bold">Cargando Elite Tracker...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AppNavigator user={user} />
      </NavigationContainer>
      <GlobalRestTimer />
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
