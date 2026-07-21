import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getMuscleRecoveryStates } from './CoachingService';
import { translateMuscleGroup } from '../constants/Muscles';

// Configurar cómo se deben comportar las notificaciones cuando la app está abierta (foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Solicita permisos para enviar notificaciones locales
 */
export const registerForPushNotificationsAsync = async () => {
  if (Platform.OS === 'web') return false;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permiso de notificaciones locales denegado');
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3b82f6',
    });
  }

  return true;
};

/**
 * Programa la notificación de inactividad de 3 días
 */
export const scheduleInactivityNotification = async () => {
  if (Platform.OS === 'web') return;

  // Cancelar cualquier recordatorio previo de inactividad
  const scheduled = await Notifications.getScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.content.data?.type === 'inactivity') {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  // Programar a las 72 horas (3 días * 24 horas * 60 min * 60 seg)
  const triggerSeconds = 3 * 24 * 60 * 60; 

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "¡El gym te extraña, campeón! 🏃‍♂️",
      body: "Llevas 3 días sin registrar entrenamiento. Volver hoy es mejor que volver mañana. ¡Toca activarse! 💪",
      data: { type: 'inactivity' },
      sound: true,
    },
    trigger: {
      seconds: Math.round(triggerSeconds),
    },
  });
};

/**
 * Escanea los estados de recuperación muscular y programa notificaciones
 * para cuando lleguen al 100% de recuperación
 */
export const scheduleMuscleRecoveryNotifications = async (workouts) => {
  if (Platform.OS === 'web' || !workouts || workouts.length === 0) return;

  // Obtener estados actuales de recuperación de músculos
  const recoveryStates = getMuscleRecoveryStates(workouts);
  
  // Limpiar notificaciones programadas previas de recuperación para evitar duplicados
  const scheduled = await Notifications.getScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.content.data?.type === 'muscle_recovery') {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  // Programar notificaciones para los músculos que no se han recuperado al 100% aún
  for (const [muscle, state] of Object.entries(recoveryStates)) {
    if (state.percent < 100 && state.hoursLeft > 0) {
      const triggerSeconds = state.hoursLeft * 60 * 60; // Convertir horas restantes a segundos
      
      // Asegurar un trigger válido mayor a 10 segundos
      if (triggerSeconds > 10) {
        const translated = translateMuscleGroup(muscle);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `¡Fibras listas! Músculo: ${translated} ⚡`,
            body: `Tu ${translated.toLowerCase()} se ha recuperado al 100%. ¡Listo para ser entrenado al máximo hoy! 🔥`,
            data: { type: 'muscle_recovery', muscle },
            sound: true,
          },
          trigger: {
            seconds: Math.round(triggerSeconds),
          },
        });
      }
    }
  }
};
