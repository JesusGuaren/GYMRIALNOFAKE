import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { ChevronLeft, ChevronRight, Dumbbell, X, Trash2, Calendar as CalendarIcon, Link2, Trash } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import useStore, { THEMES } from '../../store/useStore';
import { normalizeMuscleGroup, translateMuscleGroup, SUB_TO_PRIMARY_MAPPING } from '../../constants/Muscles';

const { width } = Dimensions.get('window');

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAY_LABELS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

const ABBREVIATIONS = {
  'Chest': 'Pch',
  'Back': 'Esp',
  'Legs': 'Pir',
  'Shoulders': 'Hom',
  'Arms': 'Brz',
  'Core': 'Abs'
};

const getMuscleAbbreviation = (mg) => {
  const norm = normalizeMuscleGroup(mg);
  if (norm === 'UNKNOWN') return 'Ej';
  const primary = SUB_TO_PRIMARY_MAPPING[norm] || norm;
  return ABBREVIATIONS[primary] || 'Ej';
};

const COLORS_MAP = {
  'Chest': { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171' },
  'Back': { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc' },
  'Legs': { bg: 'rgba(249, 115, 22, 0.15)', text: '#fb923c' },
  'Shoulders': { bg: 'rgba(236, 72, 153, 0.15)', text: '#f472b6' },
  'Arms': { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa' },
  'Core': { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399' }
};

const getMuscleColor = (mg) => {
  const norm = normalizeMuscleGroup(mg);
  if (norm === 'UNKNOWN') return { bg: 'rgba(148, 163, 184, 0.15)', text: '#94a3b8' };
  const primary = SUB_TO_PRIMARY_MAPPING[norm] || norm;
  return COLORS_MAP[primary] || { bg: 'rgba(148, 163, 184, 0.15)', text: '#94a3b8' };
};

export default function CalendarScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { workouts, theme, deleteWorkout, deleteExerciseFromWorkout, setCurrentActiveWorkout } = useStore();
  const colors = THEMES[theme] || THEMES.midnight;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const selectedWorkout = useMemo(() => {
    if (!selectedDay) return null;
    return workouts.find(w => w.workout_date === selectedDay) || null;
  }, [selectedDay, workouts]);

  const hasWorkout = (dateStr) => workouts.some(w => w.workout_date === dateStr);

  const getDominantMuscle = (dateStr) => {
    const workout = workouts.find(w => w.workout_date === dateStr);
    if (!workout || !workout.workout_entries || workout.workout_entries.length === 0) return null;
    const counts = {};
    workout.workout_entries.forEach(e => {
      const mg = e.exercises?.muscle_group;
      if (mg) counts[mg] = (counts[mg] || 0) + 1;
    });
    let dominant = null;
    let max = 0;
    Object.entries(counts).forEach(([muscle, count]) => {
      if (count > max) { max = count; dominant = muscle; }
    });
    return dominant;
  };

  const monthlyStats = useMemo(() => {
    let sessionCount = 0;
    let totalTonnage = 0;
    const muscleCounts = {};
    workouts.forEach(w => {
      const wDate = new Date(w.workout_date);
      if (wDate.getFullYear() === year && wDate.getMonth() === month) {
        sessionCount += 1;
        (w.workout_entries || []).forEach(e => {
          totalTonnage += (Number(e.weight) * Number(e.reps)) || 0;
          const mg = e.exercises?.muscle_group;
          if (mg) muscleCounts[mg] = (muscleCounts[mg] || 0) + 1;
        });
      }
    });
    let favoriteMuscle = 'Ninguno';
    let maxCount = 0;
    Object.entries(muscleCounts).forEach(([muscle, count]) => {
      if (count > maxCount) { maxCount = count; favoriteMuscle = muscle; }
    });
    return {
      sessions: sessionCount,
      tonnage: Math.round(totalTonnage),
      favoriteMuscle: favoriteMuscle !== 'Ninguno' ? translateMuscleGroup(favoriteMuscle) : 'Ninguno'
    };
  }, [workouts, year, month]);

  const handlePrevMonth = () => { setCurrentDate(new Date(year, month - 1, 1)); setSelectedDay(null); };
  const handleNextMonth = () => { setCurrentDate(new Date(year, month + 1, 1)); setSelectedDay(null); };

  const handleDayPress = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (hasWorkout(dateStr)) {
      setSelectedDay(dateStr);
    } else {
      Alert.alert(
        "Nuevo Entrenamiento",
        `¿Deseas iniciar un entrenamiento para el día ${day} de ${MONTH_NAMES[month]}?`,
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Iniciar", onPress: () => navigation.navigate('WorkoutSetup', { date: dateStr }) }
        ]
      );
    }
  };

  const handleEditWorkout = () => {
    if (!selectedWorkout) return;
    const grouped = {};
    const order = [];
    [...(selectedWorkout.workout_entries || [])]
      .sort((a, b) => a.set_number - b.set_number)
      .forEach(entry => {
        if (!grouped[entry.exercise_id]) {
          grouped[entry.exercise_id] = {
            id: Date.now() + Math.random(),
            exercise_id: entry.exercise_id,
            name: entry.exercises?.name || 'Ejercicio',
            muscle_group: entry.exercises?.muscle_group || 'Arms',
            sets: [],
          };
          order.push(entry.exercise_id);
        }
        grouped[entry.exercise_id].sets.push({
          weight: entry.weight,
          reps: entry.reps,
          rpe: entry.rpe,
          type: 'Normal',
          isCompleted: true,
        });
      });

    setCurrentActiveWorkout({
      id: selectedWorkout.id,
      name: selectedWorkout.name,
      date: selectedWorkout.workout_date,
      exercises: order.map(id => grouped[id]),
      isEditing: true,
    });
    navigation.navigate('ActiveWorkout');
  };

  const handleDeleteWorkout = () => {
    if (!selectedWorkout) return;
    Alert.alert("Eliminar Entrenamiento", "¿Estás seguro de que deseas eliminar permanentemente este entrenamiento y todas sus series?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: async () => { await deleteWorkout(selectedWorkout.id); setSelectedDay(null); } }
    ]);
  };

  const handleDeleteExercise = (exId, exName) => {
    Alert.alert("Eliminar Ejercicio", `¿Seguro que deseas eliminar todas las series de ${exName} de este día?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: async () => { await deleteExerciseFromWorkout(selectedWorkout.id, exId); } }
    ]);
  };

  // ── Workout Details (all inline styles, zero dynamic className) ──
  const renderWorkoutDetails = () => {
    if (!selectedWorkout) return null;
    const entries = selectedWorkout.workout_entries || [];
    const groupedExercises = Object.values(entries.reduce((acc, entry) => {
      const name = entry.exercises?.name || 'Ejercicio';
      if (!acc[name]) acc[name] = { name, exercise_id: entry.exercise_id, sets: [], superset_id: entry.superset_id };
      acc[name].sets.push(entry);
      return acc;
    }, {}));

    const finalGroups = [];
    groupedExercises.forEach((ex, idx) => {
      if (idx === 0) { finalGroups.push({ isSuperset: !!ex.superset_id, items: [ex] }); return; }
      const lastGroup = finalGroups[finalGroups.length - 1];
      if (ex.superset_id && ex.superset_id === groupedExercises[idx - 1]?.superset_id) {
        lastGroup.items.push(ex); lastGroup.isSuperset = true;
      } else { finalGroups.push({ isSuperset: !!ex.superset_id, items: [ex] }); }
    });

    return (
      <View style={{ marginTop: 24, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <View>
            <Text style={{ color: '#fff', fontSize: 20, fontFamily: 'Outfit-Bold' }}>{selectedWorkout.name || 'Entrenamiento'}</Text>
            <Text style={{ color: '#64748b', fontSize: 11, fontFamily: 'Inter-SemiBold', textTransform: 'uppercase', marginTop: 4 }}>
              {selectedDay ? selectedDay.split('-').reverse().join(' / ') : ''}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={handleEditWorkout}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: `${colors.accent}15`, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${colors.accent}30` }}
            >
              <Dumbbell size={18} color={colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDeleteWorkout}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(239,68,68,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' }}
            >
              <Trash2 size={18} color="#ef4444" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSelectedDay(null)}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}
            >
              <X size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ gap: 16 }}>
          {finalGroups.map((group, gIdx) => (
            <View
              key={gIdx}
              style={group.isSuperset ? { backgroundColor: 'rgba(168,85,247,0.05)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)', padding: 16, borderRadius: 16 } : {}}
            >
              {group.isSuperset && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Link2 size={12} color="#8b5cf6" />
                  <Text style={{ color: '#c084fc', fontSize: 10, fontFamily: 'Outfit-Bold', textTransform: 'uppercase' }}>Superserie / Circuito</Text>
                </View>
              )}
              {group.items.map((ex, exIdx) => (
                <View
                  key={exIdx}
                  style={{ backgroundColor: '#020617', padding: 16, borderRadius: 16, marginBottom: exIdx < group.items.length - 1 ? 12 : 0, borderWidth: 1, borderColor: colors.border }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ color: '#fff', fontFamily: 'Outfit-Bold', fontSize: 14 }}>{ex.name}</Text>
                    <TouchableOpacity onPress={() => handleDeleteExercise(ex.exercise_id, ex.name)}>
                      <Trash size={12} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                  {ex.sets.map((s, sIdx) => (
                    <View key={sIdx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                      <Text style={{ color: '#64748b', fontSize: 10, fontFamily: 'Inter-Medium' }}>Serie {sIdx + 1}</Text>
                      <Text style={{ color: '#cbd5e1', fontSize: 10, fontFamily: 'Outfit-Bold' }}>{s.weight || 0}kg × {s.reps || 0}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ))}
        </View>
      </View>
    );
  };

  // ── Render a single calendar day cell (all inline styles) ──
  const renderDayCell = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const hasWork = hasWorkout(dateStr);
    const isToday = new Date().toISOString().split('T')[0] === dateStr;
    const isSelected = selectedDay === dateStr;
    const dominantMuscle = getDominantMuscle(dateStr);
    const mColor = getMuscleColor(dominantMuscle);

    // Compute cell background/border dynamically
    let cellBg = 'transparent';
    let cellBorder = 'transparent';
    if (isSelected) { cellBg = colors.accent; cellBorder = colors.accent; }
    else if (hasWork) { cellBg = `${colors.accent}10`; cellBorder = `${colors.accent}30`; }
    else if (isToday) { cellBg = colors.card; cellBorder = colors.border; }

    let textColor = '#64748b';
    if (isSelected) textColor = '#fff';
    else if (hasWork || isToday) textColor = '#fff';

    return (
      <TouchableOpacity
        key={day}
        onPress={() => handleDayPress(day)}
        style={{ width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 4 }}
      >
        <View
          style={{
            width: '100%', height: '100%', borderRadius: 16,
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 1,
            backgroundColor: cellBg, borderColor: cellBorder,
          }}
        >
          <Text style={{ fontSize: 13, fontFamily: 'Outfit-Bold', color: textColor, marginBottom: 4 }}>{day}</Text>
          {hasWork ? (
            <View 
              style={{ 
                width: 6, 
                height: 6, 
                borderRadius: 3, 
                backgroundColor: isSelected ? '#fff' : mColor.text, 
              }} 
            />
          ) : (
            <View style={{ height: 6 }} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <ScrollView style={{ flex: 1, paddingHorizontal: 24 }} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 24 }}>
          <Text style={{ color: '#fff', fontSize: 30, fontFamily: 'Outfit-Black' }}>Calendario</Text>
          <View style={{ flexDirection: 'row', backgroundColor: colors.card, borderRadius: 16, padding: 4, borderWidth: 1, borderColor: colors.border }}>
            <TouchableOpacity onPress={handlePrevMonth} style={{ padding: 8 }}>
              <ChevronLeft size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleNextMonth} style={{ padding: 8 }}>
              <ChevronRight size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Monthly Stats */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 16, gap: 8 }}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 16, fontFamily: 'Outfit-Bold' }}>{monthlyStats.sessions}</Text>
            <Text style={{ color: '#64748b', fontSize: 9, fontFamily: 'Inter-SemiBold', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 4 }}>Sesiones</Text>
          </View>
          <View style={{ width: 1, height: 32, backgroundColor: colors.border }} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 16, fontFamily: 'Outfit-Bold' }}>
              {monthlyStats.tonnage >= 1000 ? `${(monthlyStats.tonnage / 1000).toFixed(1)}k` : `${monthlyStats.tonnage}`}kg
            </Text>
            <Text style={{ color: '#64748b', fontSize: 9, fontFamily: 'Inter-SemiBold', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 4 }}>Volumen</Text>
          </View>
          <View style={{ width: 1, height: 32, backgroundColor: colors.border }} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: colors.accent, fontSize: 12, fontFamily: 'Outfit-Bold' }} numberOfLines={1}>{monthlyStats.favoriteMuscle}</Text>
            <Text style={{ color: '#64748b', fontSize: 9, fontFamily: 'Inter-SemiBold', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 4 }}>Foco Principal</Text>
          </View>
        </View>

        {/* Calendar Grid */}
        <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <Text style={{ color: colors.accent, fontFamily: 'Outfit-Bold', fontSize: 20, textTransform: 'uppercase', letterSpacing: -0.5 }}>
              {MONTH_NAMES[month]} <Text style={{ color: '#64748b', fontFamily: 'Outfit-Regular' }}>{year}</Text>
            </Text>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {/* Week day labels */}
            {DAY_LABELS.map((d, i) => (
              <View key={`label-${i}`} style={{ width: `${100 / 7}%`, alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ color: '#64748b', fontSize: 10, fontFamily: 'Inter-SemiBold' }}>{d}</Text>
              </View>
            ))}

            {/* Empty spaces before first day */}
            {Array.from({ length: (firstDay + 6) % 7 }).map((_, i) => (
              <View key={`empty-${i}`} style={{ width: `${100 / 7}%` }} />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => renderDayCell(i + 1))}
          </View>
        </View>

        {/* Details Section */}
        {!selectedDay ? (
          <View style={{ marginTop: 40, alignItems: 'center', justifyContent: 'center', opacity: 0.4 }}>
            <CalendarIcon size={48} color="#64748b" />
            <Text style={{ color: '#64748b', marginTop: 16, fontSize: 12, fontFamily: 'Inter-SemiBold' }}>Toca un día entrenado para ver detalles</Text>
          </View>
        ) : (
          renderWorkoutDetails()
        )}
      </ScrollView>
    </View>
  );
}
