import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, Platform } from 'react-native';
import { User, Save, Target, Activity, Check, Palette, Calendar, Zap, HelpCircle, ChevronLeft, Info, Download, Upload, FileSpreadsheet, ChevronRight } from 'lucide-react-native';
import useStore, { THEMES } from '../../store/useStore';
import { calculateBMR, calculateTDEE, getAdjustedCalories, calculateMacros } from '../../services/NutritionService';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { convertWorkoutsToCSV, generateJSONBackup, importJSONBackupToSupabase } from '../../services/BackupService';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/supabase';
import SolidCard from '../../components/common/SolidCard';
import PreciseButton from '../../components/common/PreciseButton';
import PreciseInput from '../../components/common/PreciseInput';

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const user = useStore(state => state.user);
  const userProfile = useStore(state => state.userProfile);
  const updateUserProfile = useStore(state => state.updateUserProfile);
  const globalTheme = useStore(state => state.theme);
  const setGlobalTheme = useStore(state => state.setTheme);
  const { workouts, routines, fetchWorkouts, fetchRoutines, fetchUserProfile } = useStore();
  
  const colors = THEMES[globalTheme] || THEMES.midnight;

  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male');
  const [activityLevel, setActivityLevel] = useState('moderate');
  const [goal, setGoal] = useState('Hypertrophy');
  const [level, setLevel] = useState('Intermediate');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [isPhysicalCollapsed, setIsPhysicalCollapsed] = useState(true);
  const [isGoalsCollapsed, setIsGoalsCollapsed] = useState(true);
  const [isCustomizationCollapsed, setIsCustomizationCollapsed] = useState(true);
  const [isBackupCollapsed, setIsBackupCollapsed] = useState(true);

  useEffect(() => {
    if (userProfile) {
      setWeight(userProfile.body_weight ? String(userProfile.body_weight) : '');
      setHeight(userProfile.height ? String(userProfile.height) : '');
      setAge(userProfile.age ? String(userProfile.age) : '');
      setGender(userProfile.gender || 'male');
      setActivityLevel(userProfile.activity_level || 'moderate');
      setGoal(userProfile.goal || 'Hypertrophy');
      setLevel(userProfile.experience_level || 'Intermediate');
      if (userProfile.theme) setGlobalTheme(userProfile.theme);
    }
  }, [userProfile]);

  const nutrition = useMemo(() => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age);
    if (!w || !h || !a) return null;
    
    const bmr = calculateBMR(w, h, a, gender);
    const tdee = calculateTDEE(bmr, activityLevel);
    const targetCalories = getAdjustedCalories(tdee, goal);
    const macros = calculateMacros(w, targetCalories);

    return { tdee, targetCalories, macros };
  }, [weight, height, age, gender, activityLevel, goal]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateUserProfile({
        body_weight: weight ? parseFloat(weight) : null,
        height: height ? parseFloat(height) : null,
        age: age ? parseInt(age) : null,
        gender,
        activity_level: activityLevel,
        goal,
        experience_level: level
      });
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleThemeSelect = (themeId) => {
    setGlobalTheme(themeId);
    updateUserProfile({ theme: themeId }).catch((error) => {
      console.error('Error al guardar el tema:', error);
    });
  };

  const handleExportJSON = async () => {
    setIsExporting(true);
    try {
      const backupString = generateJSONBackup(userProfile, workouts, routines);
      const fileUri = `${FileSystem.documentDirectory}gym_tracker_respaldo.json`;
      
      await FileSystem.writeAsStringAsync(fileUri, backupString, {
        encoding: 'utf8'
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Exportar Respaldo de Entrenamientos (JSON)'
        });
      } else {
        Alert.alert('No Disponible', 'La opción de compartir no está disponible en este dispositivo.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Hubo un inconveniente al exportar la copia de seguridad.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const csvString = convertWorkoutsToCSV(workouts);
      if (!csvString) {
        Alert.alert('Sin Datos', 'Aún no registras ningún entrenamiento para exportar.');
        return;
      }
      
      const fileUri = `${FileSystem.documentDirectory}historial_entrenamientos.csv`;
      
      await FileSystem.writeAsStringAsync(fileUri, csvString, {
        encoding: 'utf8'
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Exportar Historial a Excel (CSV)'
        });
      } else {
        Alert.alert('No Disponible', 'La opción de compartir no está disponible en este dispositivo.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Hubo un inconveniente al exportar el archivo CSV.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportJSON = async () => {
    setIsImporting(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setIsImporting(false);
        return;
      }

      const fileUri = result.assets[0].uri;
      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: 'utf8'
      });

      const parsedData = JSON.parse(fileContent);

      Alert.alert(
        'Confirmar Importación',
        `¿Deseas restaurar esta copia de seguridad? Se importarán ${parsedData.workouts?.length || 0} entrenamientos y ${parsedData.routines?.length || 0} rutinas.`,
        [
          { text: 'Cancelar', style: 'cancel', onPress: () => setIsImporting(false) },
          {
            text: 'Importar',
            onPress: async () => {
              try {
                setIsImporting(true);
                const stats = await importJSONBackupToSupabase(parsedData, user.id, supabase);
                
                // Recargar el store global
                await fetchWorkouts();
                await fetchRoutines();
                await fetchUserProfile();

                Alert.alert(
                  '¡Respaldo Restaurado!',
                  `Se han sincronizado exitosamente ${stats.importedWorkouts} entrenamientos y ${stats.importedRoutines} rutinas con tu base de datos.`
                );
              } catch (err) {
                console.error(err);
                Alert.alert('Error al Importar', err.message);
              } finally {
                setIsImporting(false);
              }
            }
          }
        ]
      );
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'No se pudo leer o parsear el archivo de copia de seguridad.');
      setIsImporting(false);
    }
  };

  const macroExplanations = {
    protein: "Rango recomendado: 1.8g a 2.2g por kg. Esencial para el crecimiento muscular.",
    fat: "Rango recomendado: 0.7g a 1.0g por kg. Vital para la salud hormonal.",
    carbs: "El resto de tus calorías. Proporcionan energía para entrenar."
  };

  return (
    <ScrollView 
      className="flex-1" 
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: insets.top + 20, paddingBottom: 60 }}
    >
      {/* Header */}
      <View className="flex-row items-center mb-6">
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          className="w-10 h-10 border rounded-full items-center justify-center mr-4"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <ChevronLeft color="#e2e8f0" size={24} />
        </TouchableOpacity>
        <View>
          <Text className="text-2xl font-outfit-bold text-white">Mi Perfil</Text>
          <Text className="text-slate-500 text-xs font-inter-semibold mt-0.5">{user?.email}</Text>
        </View>
      </View>

      {/* Gamificación: XP y Nivel */}
      {(() => {
        const { calculateUserXP, getLevelInfo } = require('../../services/AchievementService');
        const xp = calculateUserXP(workouts);
        const { level: userLvl, rankTitle, xpInLevel, xpNeededForNext, progress } = getLevelInfo(xp);

        return (
          <SolidCard className="mb-6">
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center gap-x-2">
                <Zap size={20} color={colors.accent} fill={colors.accent} />
                <View>
                  <Text className="text-white font-outfit-bold text-lg">Tu Nivel de Atleta</Text>
                  <Text style={{ color: colors.accent }} className="font-inter-semibold text-xs mt-0.5">{rankTitle}</Text>
                </View>
              </View>
              <View 
                className="px-3 py-1 rounded-full border"
                style={{ backgroundColor: `${colors.accent}20`, borderColor: `${colors.accent}40` }}
              >
                <Text style={{ color: colors.accent }} className="text-xs font-outfit-bold uppercase tracking-wider">NIVEL {userLvl}</Text>
              </View>
            </View>

            <View className="flex-row justify-between items-baseline mb-2">
              <Text className="text-slate-500 text-xs font-inter-semibold uppercase tracking-wider">Experiencia (XP)</Text>
              <Text className="text-white font-outfit-bold text-sm">{xpInLevel} <Text className="text-slate-500 text-xs">/ {xpNeededForNext} XP</Text></Text>
            </View>

            <View className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
              <View 
                className="h-full rounded-full" 
                style={{ width: `${Math.round(progress * 100)}%`, backgroundColor: colors.accent }}
              />
            </View>
            <Text className="text-slate-500 text-[10px] text-right font-inter-medium mt-1">Faltan {xpNeededForNext - xpInLevel} XP para el siguiente nivel</Text>
          </SolidCard>
        );
      })()}

      <View className="gap-y-6">
        
        {/* Accordion 1: Datos Físicos */}
        <View 
          className="rounded-[24px] border overflow-hidden"
          style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }}
        >
          <TouchableOpacity 
            onPress={() => setIsPhysicalCollapsed(!isPhysicalCollapsed)}
            activeOpacity={0.8}
            className="p-5 flex-row justify-between items-center"
          >
            <View className="flex-row items-center gap-x-3">
              <Activity size={20} color={colors.accent} />
              <View>
                <Text className="text-white font-outfit-bold text-lg">Datos Físicos</Text>
                {isPhysicalCollapsed && (
                  <Text className="text-slate-500 text-xs font-inter-medium mt-1">
                    {weight || '--'} kg • {height || '--'} cm • {age || '--'} años • {gender === 'male' ? 'Masc' : 'Fem'}
                  </Text>
                )}
              </View>
            </View>
            <ChevronRight 
              size={20} 
              color="#64748b" 
              style={{ transform: [{ rotate: isPhysicalCollapsed ? '0deg' : '90deg' }] }}
            />
          </TouchableOpacity>

          {!isPhysicalCollapsed && (
            <View className="px-5 pb-5 gap-y-4">
              <View className="flex-row gap-x-4">
                <View className="flex-1">
                  <Text className="text-slate-500 text-[10px] uppercase font-inter-semibold tracking-wider mb-2">Peso (kg)</Text>
                  <PreciseInput 
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="numeric"
                    placeholder="75"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-500 text-[10px] uppercase font-inter-semibold tracking-wider mb-2">Altura (cm)</Text>
                  <PreciseInput 
                    value={height}
                    onChangeText={setHeight}
                    keyboardType="numeric"
                    placeholder="175"
                  />
                </View>
              </View>

              <View className="flex-row gap-x-4">
                <View className="flex-1">
                  <Text className="text-slate-500 text-[10px] uppercase font-inter-semibold tracking-wider mb-2">Edad</Text>
                  <PreciseInput 
                    value={age}
                    onChangeText={setAge}
                    keyboardType="numeric"
                    placeholder="25"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-500 text-[10px] uppercase font-inter-semibold tracking-wider mb-2">Género</Text>
                  <View className="flex-row gap-x-2 h-14">
                    <TouchableOpacity 
                      onPress={() => setGender('male')}
                      className={`flex-1 rounded-2xl border items-center justify-center ${gender === 'male' ? 'border-transparent' : ''}`}
                      style={{ 
                        backgroundColor: gender === 'male' ? colors.accent : '#020617', 
                        borderColor: gender === 'male' ? 'transparent' : colors.border,
                        borderWidth: gender === 'male' ? 0 : 1.5
                      }}
                    >
                      <Text className={`font-inter-semibold text-xs tracking-wider ${gender === 'male' ? 'text-white' : 'text-slate-500'}`}>MASCULINO</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => setGender('female')}
                      className={`flex-1 rounded-2xl border items-center justify-center ${gender === 'female' ? 'border-transparent' : ''}`}
                      style={{ 
                        backgroundColor: gender === 'female' ? colors.accent : '#020617', 
                        borderColor: gender === 'female' ? 'transparent' : colors.border,
                        borderWidth: gender === 'female' ? 0 : 1.5
                      }}
                    >
                      <Text className={`font-inter-semibold text-xs tracking-wider ${gender === 'female' ? 'text-white' : 'text-slate-500'}`}>FEMENINO</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View>
                <Text className="text-slate-500 text-[10px] uppercase font-inter-semibold tracking-wider mb-2">Actividad Física</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1">
                  {[
                    { id: 'sedentary', label: 'Sedentario' },
                    { id: 'light', label: 'Ligero' },
                    { id: 'moderate', label: 'Moderado' },
                    { id: 'active', label: 'Activo' },
                    { id: 'very_active', label: 'Pro' }
                  ].map(item => (
                    <TouchableOpacity 
                      key={item.id}
                      onPress={() => setActivityLevel(item.id)}
                      className="px-4 py-2 rounded-full border mr-2"
                      style={{
                        backgroundColor: activityLevel === item.id ? colors.accent : 'transparent',
                        borderColor: activityLevel === item.id ? 'transparent' : colors.border,
                        borderWidth: 1.5
                      }}
                    >
                      <Text className={`text-[10px] font-inter-bold tracking-wider ${activityLevel === item.id ? 'text-white' : 'text-slate-500'}`}>{item.label.toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}
        </View>

        {/* Accordion 2: Objetivos */}
        <View 
          className="rounded-[24px] border overflow-hidden"
          style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }}
        >
          <TouchableOpacity 
            onPress={() => setIsGoalsCollapsed(!isGoalsCollapsed)}
            activeOpacity={0.8}
            className="p-5 flex-row justify-between items-center"
          >
            <View className="flex-row items-center gap-x-3">
              <Target size={20} color="#eab308" />
              <View>
                <Text className="text-white font-outfit-bold text-lg">Objetivos</Text>
                {isGoalsCollapsed && (
                  <Text className="text-slate-500 text-xs font-inter-medium mt-1">
                    {goal === 'Strength' ? 'Fuerza' : goal === 'Hypertrophy' ? 'Hipertrofia' : 'Definición'} • {level === 'Beginner' ? 'Novato' : level === 'Intermediate' ? 'Intermedio' : 'Pro'}
                  </Text>
                )}
              </View>
            </View>
            <ChevronRight 
              size={20} 
              color="#64748b" 
              style={{ transform: [{ rotate: isGoalsCollapsed ? '0deg' : '90deg' }] }}
            />
          </TouchableOpacity>

          {!isGoalsCollapsed && (
            <View className="px-5 pb-5 gap-y-4">
              <View>
                <Text className="text-slate-500 text-[10px] uppercase font-inter-semibold tracking-wider mb-2">Meta Nutricional</Text>
                <View className="flex-row gap-x-2 h-14">
                  {[
                    { id: 'Strength', label: 'FUERZA' },
                    { id: 'Hypertrophy', label: 'HIPERTROFIA' },
                    { id: 'Fat Loss', label: 'DEFINICIÓN' }
                  ].map(g => (
                    <TouchableOpacity 
                      key={g.id}
                      onPress={() => setGoal(g.id)}
                      className="flex-1 rounded-2xl border items-center justify-center"
                      style={{ 
                        backgroundColor: goal === g.id ? colors.accent : '#020617', 
                        borderColor: goal === g.id ? 'transparent' : colors.border,
                        borderWidth: goal === g.id ? 0 : 1.5
                      }}
                    >
                      <Text className={`text-[10px] font-inter-bold text-center ${goal === g.id ? 'text-white' : 'text-slate-500'}`}>
                        {g.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View>
                <Text className="text-slate-500 text-[10px] uppercase font-inter-semibold tracking-wider mb-2">Experiencia</Text>
                <View className="flex-row gap-x-2 h-14">
                  {[
                    { id: 'Beginner', label: 'NOVATO' },
                    { id: 'Intermediate', label: 'INTERMEDIO' },
                    { id: 'Advanced', label: 'PRO' }
                  ].map(lvl => (
                    <TouchableOpacity 
                      key={lvl.id}
                      onPress={() => setLevel(lvl.id)}
                      className="flex-1 rounded-2xl border items-center justify-center"
                      style={{ 
                        backgroundColor: level === lvl.id ? colors.accent : '#020617', 
                        borderColor: level === lvl.id ? 'transparent' : colors.border,
                        borderWidth: level === lvl.id ? 0 : 1.5
                      }}
                    >
                      <Text className={`text-[10px] font-inter-bold ${level === lvl.id ? 'text-white' : 'text-slate-500'}`}>
                        {lvl.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Card: Nutrición */}
        {nutrition && (
          <SolidCard>
            <View className="flex-row items-center gap-x-3 mb-6">
              <Activity size={20} color={colors.accent} />
              <Text className="text-white font-outfit-bold text-lg">Centro de Nutrición</Text>
            </View>

            <View className="items-center mb-6">
              <View className="flex-row items-baseline">
                <Text className="text-white text-4xl font-outfit-black">{nutrition.targetCalories}</Text>
                <Text className="text-slate-500 text-sm ml-2 font-inter-bold">kcal / día</Text>
              </View>
              <Text className="text-slate-500 text-xs mt-1 text-center font-inter-medium">Gasto diario estimado: {nutrition.tdee} kcal</Text>
            </View>

            <View className="gap-y-4">
              {['protein', 'fat', 'carbs'].map(type => (
                <View key={type}>
                  <View className="flex-row justify-between items-center mb-2">
                    <TouchableOpacity 
                      onPress={() => setActiveTooltip(activeTooltip === type ? null : type)}
                      className="flex-row items-center gap-x-2"
                    >
                      <Text className="text-white font-inter-semibold text-sm capitalize">{type === 'protein' ? 'Proteína' : type === 'fat' ? 'Grasas' : 'Carbohidratos'}</Text>
                      <HelpCircle size={14} color="#64748b" />
                    </TouchableOpacity>
                    <Text style={{ color: colors.accent }} className="font-outfit-bold text-sm">
                      {nutrition.macros[type].min}-{nutrition.macros[type].max}g
                    </Text>
                  </View>
                  {activeTooltip === type && (
                    <View className="p-3 rounded-xl mb-2 border" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                      <Text className="text-slate-500 text-[11px] leading-relaxed font-inter-medium">{macroExplanations[type]}</Text>
                    </View>
                  )}
                  <View className="h-2 bg-slate-950 rounded-full overflow-hidden">
                    <View 
                      className={`h-full ${type === 'protein' ? 'bg-blue-500' : type === 'fat' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ 
                        width: type === 'protein' ? '30%' : type === 'fat' ? '25%' : '45%',
                        backgroundColor: type === 'protein' ? colors.accent : type === 'fat' ? '#f59e0b' : '#10b981'
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>
          </SolidCard>
        )}

        {/* Accordion 3: Copia de Seguridad */}
        <View 
          className="rounded-[24px] border overflow-hidden"
          style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }}
        >
          <TouchableOpacity 
            onPress={() => setIsBackupCollapsed(!isBackupCollapsed)}
            activeOpacity={0.8}
            className="p-5 flex-row justify-between items-center"
          >
            <View className="flex-row items-center gap-x-3">
              <Download size={20} color="#3b82f6" />
              <View>
                <Text className="text-white font-outfit-bold text-lg">Copia de Seguridad e Historial</Text>
                {isBackupCollapsed && (
                  <Text className="text-slate-500 text-xs font-inter-medium mt-1">
                    Exportar JSON/CSV o restaurar datos
                  </Text>
                )}
              </View>
            </View>
            <ChevronRight 
              size={20} 
              color="#64748b" 
              style={{ transform: [{ rotate: isBackupCollapsed ? '0deg' : '90deg' }] }}
            />
          </TouchableOpacity>

          {!isBackupCollapsed && (
            <View className="px-5 pb-5 gap-y-3">
              {/* Exportar JSON */}
              <TouchableOpacity 
                onPress={handleExportJSON}
                disabled={isExporting}
                className="p-4 rounded-2xl flex-row items-center justify-between"
                style={{ backgroundColor: '#020617', borderColor: colors.border, borderWidth: 1.5 }}
              >
                <View className="flex-row items-center flex-1 pr-3">
                  <View className="bg-blue-500/10 p-2.5 rounded-xl mr-3">
                    <Download size={20} color="#3b82f6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-outfit-bold text-sm">Exportar Respaldo Completo</Text>
                    <Text className="text-slate-500 text-[10px] mt-0.5 font-inter-semibold">Archivo JSON para migrar o guardar copia segura.</Text>
                  </View>
                </View>
                <ChevronRight size={18} color="#64748b" />
              </TouchableOpacity>

              {/* Exportar CSV */}
              <TouchableOpacity 
                onPress={handleExportCSV}
                disabled={isExporting}
                className="p-4 rounded-2xl flex-row items-center justify-between"
                style={{ backgroundColor: '#020617', borderColor: colors.border, borderWidth: 1.5 }}
              >
                <View className="flex-row items-center flex-1 pr-3">
                  <View className="bg-emerald-500/10 p-2.5 rounded-xl mr-3">
                    <FileSpreadsheet size={20} color="#10b981" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-outfit-bold text-sm">Exportar Historial a Excel</Text>
                    <Text className="text-slate-500 text-[10px] mt-0.5 font-inter-semibold">Archivo CSV compatible con Excel para ver marcas.</Text>
                  </View>
                </View>
                <ChevronRight size={18} color="#64748b" />
              </TouchableOpacity>

              {/* Importar JSON */}
              <TouchableOpacity 
                onPress={handleImportJSON}
                disabled={isImporting}
                className="p-4 rounded-2xl flex-row items-center justify-between"
                style={{ backgroundColor: '#020617', borderColor: colors.border, borderWidth: 1.5 }}
              >
                <View className="flex-row items-center flex-1 pr-3">
                  <View className="bg-purple-500/10 p-2.5 rounded-xl mr-3">
                    <Upload size={20} color="#a855f7" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-outfit-bold text-sm">Importar Datos de Copia</Text>
                    <Text className="text-slate-500 text-[10px] mt-0.5 font-inter-semibold">Carga un archivo de respaldo JSON desde tu celular.</Text>
                  </View>
                </View>
                <ChevronRight size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Accordion 4: Personalización */}
        <View 
          className="rounded-[24px] border overflow-hidden"
          style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }}
        >
          <TouchableOpacity 
            onPress={() => setIsCustomizationCollapsed(!isCustomizationCollapsed)}
            activeOpacity={0.8}
            className="p-5 flex-row justify-between items-center"
          >
            <View className="flex-row items-center gap-x-3">
              <Palette size={20} color="#a855f7" />
              <View>
                <Text className="text-white font-outfit-bold text-lg">Personalización</Text>
                {isCustomizationCollapsed && (
                  <Text className="text-slate-500 text-xs font-inter-medium mt-1">
                    Tema actual: {globalTheme.toUpperCase()}
                  </Text>
                )}
              </View>
            </View>
            <ChevronRight 
              size={20} 
              color="#64748b" 
              style={{ transform: [{ rotate: isCustomizationCollapsed ? '0deg' : '90deg' }] }}
            />
          </TouchableOpacity>

          {!isCustomizationCollapsed && (
            <View className="px-5 pb-5">
              <View className="flex-row flex-wrap gap-3">
                {[
                  { id: 'midnight', name: 'Midnight', color: '#8b5cf6' },
                  { id: 'oled', name: 'OLED Black', color: '#ffffff' },
                  { id: 'ocean', name: 'Deep Ocean', color: '#00d2ff' },
                  { id: 'volcano', name: 'Volcano', color: '#ff4d4d' },
                  { id: 'emerald', name: 'Emerald', color: '#10b981' },
                  { id: 'gold', name: 'Gold', color: '#eab308' },
                  { id: 'rose', name: 'Rose', color: '#f43f5e' },
                  { id: 'cyberpunk', name: 'Cyberpunk', color: '#ff00ff' }
                ].map(t => (
                  <TouchableOpacity 
                    key={t.id}
                    onPress={() => handleThemeSelect(t.id)}
                    className="flex-1 min-w-[140px] p-4 rounded-2xl border-2 flex-row items-center gap-x-3"
                    style={{ 
                      backgroundColor: '#020617',
                      borderColor: globalTheme === t.id ? t.color : colors.border,
                      borderWidth: 1.5
                    }}
                  >
                    <View className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                    <Text className="text-white font-inter-semibold text-xs">{t.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        <PreciseButton 
          onPress={handleSave}
          disabled={isSaving}
          loading={isSaving}
          variant="primary"
          className="w-full mt-2"
        >
          <Save size={20} color="white" className="mr-2" />
          <Text className="font-outfit-bold text-lg uppercase tracking-widest" style={{ color: colors.accentText }}>Guardar Perfil</Text>
        </PreciseButton>

        <TouchableOpacity
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            useStore.getState().resetAllTutorials();
            Alert.alert("Tutoriales Restablecidos", "Verás las guías contextuales la próxima vez que visites cada pantalla.");
          }}
          className="w-full mt-4 py-4 rounded-2xl items-center justify-center border"
          style={{ backgroundColor: `${colors.card}80`, borderColor: colors.border }}
        >
          <Text className="text-slate-400 font-bold text-xs uppercase tracking-widest">Reiniciar Onboarding</Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}
