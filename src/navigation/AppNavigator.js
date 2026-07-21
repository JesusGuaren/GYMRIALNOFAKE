import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LayoutDashboard, BookOpen, Calendar, TrendingUp } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStore, { THEMES } from '../store/useStore';

// Screens
import LoginScreen from '../screens/auth/LoginScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import DashboardScreen from '../screens/main/DashboardScreen';
import WorkoutSetupScreen from '../screens/main/WorkoutSetupScreen';
import ActiveWorkoutScreen from '../screens/main/ActiveWorkoutScreen';
import WorkoutSummaryScreen from '../screens/main/WorkoutSummaryScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import RankingsScreen from '../screens/main/RankingsScreen';
import AchievementsScreen from '../screens/main/AchievementsScreen';
import WorkoutLoggerScreen from '../screens/main/WorkoutLoggerScreen';
import AnalysisScreen from '../screens/main/AnalysisScreen';
import ExerciseProgressScreen from '../screens/main/ExerciseProgressScreen';
import CalendarScreen from '../screens/main/CalendarScreen';
import RoutineManagerScreen from '../screens/main/RoutineManagerScreen';
import RoutineEditScreen from '../screens/main/RoutineEditScreen';
import ProgramManagerScreen from '../screens/main/ProgramManagerScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

import AIRoutineScreen from '../screens/main/AIRoutineScreen';
import CoachScreen from '../screens/main/CoachScreen';

function TabNavigator() {
  const insets = useSafeAreaInsets();
  const theme = useStore(state => state.theme);
  const colors = THEMES[theme] || THEMES.midnight;
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 60 + (insets.bottom > 0 ? insets.bottom - 4 : 0),
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: '#64748b',
      }}
    >
      <Tab.Screen 
        name="Resumen" 
        component={DashboardScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
        }}
      />
      <Tab.Screen 
        name="Bitácora" 
        component={WorkoutLoggerScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />,
        }}
      />
      <Tab.Screen 
        name="Calendario" 
        component={CalendarScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
        }}
      />
      <Tab.Screen 
        name="Análisis" 
        component={AnalysisScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <TrendingUp color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator({ user }) {
  const isResettingPassword = useStore(state => state.isResettingPassword);
  const theme = useStore(state => state.theme);
  const colors = THEMES[theme] || THEMES.midnight;

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      {!user ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </>
      ) : isResettingPassword ? (
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen name="WorkoutSetup" component={WorkoutSetupScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Rankings" component={RankingsScreen} />
          <Stack.Screen name="Achievements" component={AchievementsScreen} />
          <Stack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} />
          <Stack.Screen name="WorkoutSummary" component={WorkoutSummaryScreen} />
          <Stack.Screen name="ExerciseProgress" component={ExerciseProgressScreen} />
          <Stack.Screen name="AIRoutine" component={AIRoutineScreen} />
          <Stack.Screen name="RoutineManager" component={RoutineManagerScreen} />
          <Stack.Screen name="RoutineEdit" component={RoutineEditScreen} />
          <Stack.Screen name="ProgramManager" component={ProgramManagerScreen} />
          <Stack.Screen 
            name="Coach" 
            component={CoachScreen} 
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom'
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
