import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, StyleSheet, ScrollView } from 'react-native';
import { X, Calculator, Info } from 'lucide-react-native';
import { calculate1RM } from '../lib/rankingSystem';

export default function RMCalculatorModal({ visible, onClose, colors }) {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');

  const oneRM = calculate1RM(parseFloat(weight) || 0, parseInt(reps) || 0);

  const getPercentages = () => {
    if (!oneRM) return [];
    return [
      { pct: 95, label: 'Fuerza Máxima' },
      { pct: 90, label: 'Fuerza' },
      { pct: 85, label: 'Hipertrofia Baja' },
      { pct: 80, label: 'Hipertrofia' },
      { pct: 75, label: 'Hipertrofia Alta' },
      { pct: 70, label: 'Resistencia' }
    ].map(item => ({
      ...item,
      val: Math.round(oneRM * (item.pct / 100))
    }));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
          <View style={styles.header}>
            <View style={styles.headerTitle}>
              <Calculator size={24} color={colors.accent} />
              <Text style={styles.titleText}>Calculadora 1RM</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Peso (kg)</Text>
              <TextInput 
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#334155"
                style={styles.input}
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Reps</Text>
              <TextInput 
                value={reps}
                onChangeText={setReps}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#334155"
                style={styles.input}
              />
            </View>
          </View>

          {oneRM > 0 ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.resultCard}>
                <Text style={styles.resultLabel}>1RM Estimado</Text>
                <Text style={styles.resultValue}>{oneRM}kg</Text>
              </View>

              <Text style={styles.sectionLabel}>Porcentajes de Carga</Text>
              <View style={styles.grid}>
                {getPercentages().map(item => (
                  <View 
                    key={item.pct}
                    style={[styles.gridItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <View style={styles.gridItemHeader}>
                      <Text style={styles.gridItemVal}>{item.val}kg</Text>
                      <Text style={styles.gridItemPct}>{item.pct}%</Text>
                    </View>
                    <Text style={styles.gridItemLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
               <Info size={48} color="#64748b" style={{ marginBottom: 16 }} />
               <Text style={styles.emptyText}>Ingresa peso y repeticiones para calcular.</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={onClose}
            style={[styles.mainButton, { backgroundColor: colors.accent }]}
          >
            <Text style={[styles.mainButtonText, { color: colors.accentText }]}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  container: {
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 32,
    borderTopWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 20,
    fontWeight: '900',
    color: 'white',
    marginLeft: 12,
  },
  closeButton: {
    padding: 8,
  },
  inputRow: {
    flexDirection: 'row',
    marginHorizontal: -8,
    marginBottom: 32,
  },
  inputContainer: {
    flex: 1,
    paddingHorizontal: 8,
  },
  inputLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 20,
  },
  resultCard: {
    alignItems: 'center',
    marginBottom: 32,
    padding: 24,
    borderRadius: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  resultLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  resultValue: {
    color: 'white',
    fontSize: 48,
    fontWeight: '900',
  },
  sectionLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  gridItem: {
    width: '46.5%',
    margin: 6,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  gridItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridItemVal: {
    color: 'white',
    fontWeight: '900',
    fontSize: 18,
  },
  gridItemPct: {
    color: '#64748b',
    fontWeight: 'bold',
    fontSize: 10,
  },
  gridItemLabel: {
    color: '#64748b',
    fontSize: 9,
    marginTop: 4,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    opacity: 0.3,
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
  },
  mainButton: {
    width: '100%',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 40,
  },
  mainButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  }
});
