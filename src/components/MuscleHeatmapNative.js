import React, { useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Polygon, G } from 'react-native-svg';
import { normalizeMuscleGroup, SUB_TO_PRIMARY_MAPPING } from '../constants/Muscles';

const ANTERIOR_PATHS = [
  { muscle: 'Chest', points: ["51.8 41.6 51 55.1 58 58 67.8 55.5 70.6 47.3 62 41.6", "29.8 46.5 31.4 55.5 40.8 58 48.2 55.1 47.8 42 37.6 42"] },
  { muscle: 'Core', points: ["68.6 63.3 67.3 57.1 58.8 59.6 60 64.1 60.4 83.3 65.7 78.8 66.5 69.8", "33.9 78.4 33.1 71.8 31 63.3 32.2 57.1 40.8 59.2 39.2 63.3 39.2 83.7", "56.3 59.2 58 64.1 58.4 78 58.4 92.7 56.3 98.4 55.1 104.1 51.4 107.8 51 84.5 50.6 67.3 51 57.1", "43.7 58.8 48.6 57.1 49 67.3 48.6 84.5 48.2 107.3 44.5 103.7 40.8 91.4 40.8 78.4 41.2 64.5"] },
  { muscle: 'Arms', points: ["16.7 68.2 18 71.4 22.9 66.1 29 53.9 27.8 49.4 20.4 55.9", "71.4 49.4 70.2 54.7 76.3 66.1 81.6 71.8 82.9 69 78.8 55.5", "6.1 88.6 10.2 75.1 14.7 70.2 16.3 74.3 19.2 73.5 4.5 97.6 0 100", "84.5 69.8 83.3 73.5 80 73.1 95.1 98.4 100 100.4 93.5 89.4 89.8 76.3", "77.6 72.2 77.6 77.6 80.4 84.1 85.3 89.8 92.2 101.2 94.7 99.6", "6.9 101.2 13.5 90.6 18.8 84.1 21.6 77.1 21.2 71.8 4.9 98.8"] },
  { muscle: 'Shoulders', points: ["78.4 53.1 79.6 47.8 79.2 41.2 75.9 38 71 36.3 72.2 42.9 71.4 47.3", "28.2 47.3 21.2 53.1 20 47.8 20.4 40.8 24.5 37.1 28.6 37.1 26.9 43.3"] },
  { muscle: 'Legs', points: ["34.7 98.8 37.1 108.2 37.1 127.8 34.3 137.1 31 132.7 29.4 120 28.2 111.4 29.4 100.8 32.2 94.7", "63.3 105.7 64.5 100 66.9 94.7 70.2 101.2 71 111.8 68.2 133.1 65.3 137.6 62.4 128.6 62 111.4", "38.8 129.4 38.4 112.2 41.2 118.4 44.5 129.4 42.9 135.1 40 146.1 36.3 146.5 35.5 140", "59.6 145.7 55.5 129 60.8 113.9 61.2 130.2 64.1 139.6 62.9 146.5", "32.7 138.4 26.5 145.7 25.7 136.7 25.7 127.3 26.9 114.3 29.4 133.5", "71.8 113.1 73.9 124.1 73.9 140.4 72.7 145.7 66.5 138.4 70.2 133.5", "71.4 160.4 73.5 153.5 76.7 161.2 79.6 167.8 78.4 187.8 79.6 195.5 74.7 195.5", "24.9 194.7 27.8 164.9 28.2 160.4 26.1 154.3 24.9 157.6 22.4 161.6 20.8 167.8 22 188.2 20.8 195.5", "72.7 195.1 69.8 159.2 65.3 158.4 64.1 162.4 64.1 165.3 65.7 177.1", "35.5 158.4 35.9 162.4 35.9 166.9 35.1 172.2 35.1 176.7 32.2 182 30.6 187.3 26.9 194.7 27.3 187.8 28.2 180.4 28.6 175.5 29 169.8 29.8 164.1 30.2 158.8"] },
  { muscle: 'Head', points: ["42.4 2.9 40 11.8 42 19.6 46.1 23.3 49.8 25.3 54.7 22.4 57.6 19.2 59.2 10.2 57.1 2.4 49.8 0"] }
];

const POSTERIOR_PATHS = [
  { muscle: 'Back', points: ["44.7 21.7 47.7 21.7 47.2 38.3 47.7 64.7 38.3 53.2 35.3 40.9 31.1 36.6 39.1 33.2 43.8 27.2", "52.3 21.7 55.7 21.7 56.6 27.2 60.9 32.8 68.9 36.6 64.7 40.4 61.7 53.2 52.3 64.7 53.2 38.3", "31.1 38.7 28.1 48.9 28.5 55.3 34 75.3 47.2 71.1 47.2 66.4 36.6 54 33.6 41.3", "68.9 38.7 71.9 49.4 71.5 56.2 66 75.3 52.8 71.1 52.8 66.4 63.4 54.5 66.4 41.7", "47.7 72.8 34.5 77 35.3 83.4 49.4 102.1 46.8 83", "52.3 72.8 65.5 77 64.7 83.4 50.6 102.1 53.2 83.8"] },
  { muscle: 'Shoulders', points: ["29.4 37 23 39.1 17.4 44.3 18.3 53.6 24.3 49.4 27.2 46.4", "71.1 37 78.3 39.6 82.6 44.7 81.7 53.6 74.9 48.9 72.3 45.1"] },
  { muscle: 'Arms', points: ["26.8 49.8 17.9 55.7 14.5 72.3 16.6 81.7 21.7 63.8 26.8 55.7", "73.6 50.2 82.1 55.7 86 73.2 83.4 82.1 77.9 63 73.2 55.7", "26.8 58.3 26.8 68.5 23 75.3 19.1 77.4 22.6 65.5", "72.8 58.3 77 64.7 80.4 77.4 76.6 75.3 72.8 68.9", "86.4 75.7 91.1 83.4 93.2 94 100 106.4 96.2 104.3 88.1 89.4 84.3 83.8", "13.6 75.7 8.9 83.8 6.8 93.6 0 106.4 3.8 104.3 12.3 88.5 15.7 83", "81.3 79.6 77.4 77.9 79.1 84.7 91.1 103.8 93.2 108.9 94.5 104.7", "18.7 79.6 22.1 77.9 20.9 84.3 9.4 103 6.8 108.5 5.1 104.7"] },
  { muscle: 'Legs', points: ["44.7 99.6 30.2 108.5 29.8 118.7 31.5 126 47.2 121.3 49.4 114.9", "55.3 99.1 51.1 114.5 52.3 120.9 68.1 126 69.8 119.1 69.4 108.5", "28.9 122.1 31.1 129.4 36.6 126 35.3 135.3 34.5 150.2 29.4 158.3 28.9 146.8 27.7 141.3 27.2 131.5", "71.5 121.7 69.4 128.9 63.8 126 65.5 136.6 66.4 150.2 71.1 158.3 71.5 147.7 72.8 142.1 73.6 131.9", "38.7 125.5 44.3 146 40.4 166.8 36.2 152.8 37 135.3", "61.7 125.5 63.4 136.2 64.3 153.2 60 166.8 56.2 146.4", "29.4 160.4 28.5 167.2 24.7 179.6 23.8 192.8 25.5 197 28.5 193.2 29.8 180 31.9 171.1 31.9 166.8", "37.4 165.1 35.3 167.7 33.2 171.9 31.1 180.4 30.2 191.9 34 200 38.7 190.6 39.1 168.9", "63 165.1 61.3 168.5 61.7 190.6 66.4 199.6 70.6 191.9 68.9 179.6 66.8 170.2", "70.6 160.4 72.3 168.5 75.7 179.1 76.6 192.8 74.5 196.6 72.3 193.6 70.6 179.6 68.1 168.1"] },
  { muscle: 'Head', points: ["50.6 0 46 0.9 40.9 5.5 40.4 12.8 45.1 20 55.7 20 59.1 13.6 59.6 4.7 55.7 1.3"] }
];

export default function MuscleHeatmapNative({ workouts, colors, selectedMuscle, onSelectMuscle }) {
  const frontScale = useRef(new Animated.Value(1)).current;
  const frontOpacity = useRef(new Animated.Value(1)).current;
  const backScale = useRef(new Animated.Value(1)).current;
  const backOpacity = useRef(new Animated.Value(1)).current;

  const heatmapData = useMemo(() => {
    const counts = { 'Chest': 0, 'Back': 0, 'Legs': 0, 'Shoulders': 0, 'Arms': 0, 'Core': 0 };
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    workouts.forEach(w => {
      if (new Date(w.workout_date) >= sevenDaysAgo) {
        w.workout_entries?.forEach(e => {
          const rawMg = e.exercises?.muscle_group;
          if (!rawMg) return;
          const mg = normalizeMuscleGroup(rawMg);
          if (mg === 'UNKNOWN') return;
          const primaryGroup = SUB_TO_PRIMARY_MAPPING[mg];
          if (primaryGroup && counts[primaryGroup] !== undefined) {
            counts[primaryGroup] += 1;
          }
        });
      }
    });
    return counts;
  }, [workouts]);

  useEffect(() => {
    let targetFrontScale = 1;
    let targetFrontOpacity = 1;
    let targetBackScale = 1;
    let targetBackOpacity = 1;

    if (selectedMuscle) {
      const isAnterior = ANTERIOR_PATHS.some(p => p.muscle === selectedMuscle);
      if (isAnterior) {
        targetFrontScale = 1.05;
        targetFrontOpacity = 1;
        targetBackScale = 0.95;
        targetBackOpacity = 0.35;
      } else {
        targetFrontScale = 0.95;
        targetFrontOpacity = 0.35;
        targetBackScale = 1.05;
        targetBackOpacity = 1;
      }
    }

    Animated.parallel([
      Animated.spring(frontScale, { toValue: targetFrontScale, useNativeDriver: true, tension: 65, friction: 8 }),
      Animated.spring(frontOpacity, { toValue: targetFrontOpacity, useNativeDriver: true, tension: 65, friction: 8 }),
      Animated.spring(backScale, { toValue: targetBackScale, useNativeDriver: true, tension: 65, friction: 8 }),
      Animated.spring(backOpacity, { toValue: targetBackOpacity, useNativeDriver: true, tension: 65, friction: 8 })
    ]).start();
  }, [selectedMuscle]);

  const getIntensityColor = (muscle) => {
    const count = heatmapData[muscle] || 0;
    const isAnySelected = !!selectedMuscle;
    const isThisSelected = selectedMuscle === muscle;

    if (isAnySelected) {
      if (isThisSelected) return colors.accent;
      return '#050811';
    }

    if (count === 0) return '#0f172a';
    if (count < 5) return `${colors.accent}25`;
    if (count < 12) return `${colors.accent}65`;
    return colors.accent;
  };

  const renderModel = (paths, scaleVal, opacityVal) => (
    <Animated.View style={{ transform: [{ scale: scaleVal }], opacity: opacityVal, alignItems: 'center' }}>
      <Svg width="150" height="230" viewBox="0 0 100 220">
        <G>
          {paths.map((p, i) => (
            <G key={i}>
              {p.points.map((points, j) => (
                <Polygon 
                   key={`${i}-${j}`} 
                   points={points} 
                   fill={p.muscle === 'Head' ? '#050811' : getIntensityColor(p.muscle)} 
                   stroke={selectedMuscle === p.muscle ? '#ffffff' : (selectedMuscle ? 'transparent' : '#020617')} 
                   strokeWidth={selectedMuscle === p.muscle ? '2' : (selectedMuscle ? '0' : '0.75')}
                   onPress={() => p.muscle !== 'Head' && onSelectMuscle && onSelectMuscle(p.muscle)}
                />
              ))}
            </G>
          ))}
        </G>
      </Svg>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={styles.title}>ESTADO DE RECUPERACIÓN</Text>
      
      <View style={styles.heatmapRow}>
        <View style={styles.modelContainer}>
          <Text style={styles.viewLabel}>VISTA FRONTAL</Text>
          {renderModel(ANTERIOR_PATHS, frontScale, frontOpacity)}
        </View>

        <View style={styles.modelContainer}>
          <Text style={styles.viewLabel}>VISTA POSTERIOR</Text>
          {renderModel(POSTERIOR_PATHS, backScale, backOpacity)}
        </View>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.accent }]} />
          <Text style={styles.legendText}>CARGA ALTA</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: `${colors.accent}65` }]} />
          <Text style={styles.legendText}>CARGA MEDIA</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: `${colors.accent}25` }]} />
          <Text style={styles.legendText}>CARGA BAJA</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#0f172a' }]} />
          <Text style={styles.legendText}>SIN CARGA</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 24
  },
  title: {
    fontSize: 11,
    fontFamily: 'Outfit-Bold',
    color: '#64748b',
    textAlign: 'center',
    letterSpacing: 1.5,
    marginBottom: 20
  },
  heatmapRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start'
  },
  modelContainer: {
    alignItems: 'center'
  },
  viewLabel: {
    fontSize: 8,
    fontFamily: 'Inter-SemiBold',
    color: '#475569',
    letterSpacing: 1,
    marginBottom: 12
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  legendText: {
    fontSize: 8,
    fontFamily: 'Inter-SemiBold',
    color: '#64748b'
  }
});
