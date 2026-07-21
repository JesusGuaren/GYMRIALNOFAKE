import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { X, Dumbbell, Info } from 'lucide-react-native';
import { calculatePlatesNeeded } from '../services/PlateCalculatorService';
import Svg, { Rect, Circle, G } from 'react-native-svg';

// Colores oficiales IPF / Halterofilia para representar los discos de manera realista
const PLATE_COLORS = {
  25: { bg: '#ef4444', text: '#ffffff', label: '25 kg', border: '#b91c1c' }, // Rojo
  20: { bg: '#3b82f6', text: '#ffffff', label: '20 kg', border: '#1d4ed8' }, // Azul
  15: { bg: '#eab308', text: '#020617', label: '15 kg', border: '#a16207' }, // Amarillo
  10: { bg: '#10b981', text: '#ffffff', label: '10 kg', border: '#047857' }, // Verde
  5: { bg: '#f8fafc', text: '#020617', label: '5 kg', border: '#cbd5e1' },   // Blanco
  2.5: { bg: '#1e293b', text: '#ffffff', label: '2.5', border: '#0f172a' },  // Negro
  1.25: { bg: '#94a3b8', text: '#020617', label: '1.2', border: '#475569' } // Plateado
};

// Alturas/Radios relativos para los discos en SVG (para que se vean proporcionales en la barra)
const PLATE_SIZES = {
  25: { height: 110, width: 22 },
  20: { height: 105, width: 20 },
  15: { height: 95, width: 18 },
  10: { height: 85, width: 16 },
  5: { height: 65, width: 14 },
  2.5: { height: 50, width: 12 },
  1.25: { height: 40, width: 10 }
};

export default function PlateCalculatorModal({ visible, onClose, totalWeight, exerciseName, colors }) {
  const [barWeight, setBarWeight] = useState(20);
  const [calculated, setCalculated] = useState({ success: false, plates: [] });

  // Reiniciar barra por defecto según ejercicio cuando se abre el modal
  useEffect(() => {
    if (visible && exerciseName) {
      const nameLower = exerciseName.toLowerCase();
      if (nameLower.includes('curl') || nameLower.includes('rompecraneos') || nameLower.includes('z-bar') || nameLower.includes('barra z')) {
        setBarWeight(10);
      } else {
        setBarWeight(20);
      }
    }
  }, [visible, exerciseName]);

  // Recalcular discos cuando cambie el peso total o el peso de la barra
  useEffect(() => {
    const numericWeight = parseFloat(totalWeight) || 0;
    const res = calculatePlatesNeeded(numericWeight, barWeight);
    setCalculated(res);
  }, [totalWeight, barWeight, visible]);

  if (!visible) return null;

  // Lógica para dibujar los discos en la manga de la barra (SVG)
  const renderBarbellSVG = () => {
    if (!calculated.success || calculated.plates.length === 0) {
      // Dibujar barra vacía
      return (
        <Svg height="140" width="100%" viewBox="0 0 300 140">
          {/* Barra de agarre (izquierda) */}
          <Rect x="0" y="62" width="120" height="16" fill="#64748b" rx="2" />
          {/* Tope/Collarín */}
          <Rect x="120" y="48" width="12" height="44" fill="#cbd5e1" rx="3" />
          {/* Manga donde van los discos */}
          <Rect x="132" y="58" width="150" height="24" fill="#94a3b8" rx="2" />
          {/* Tapón de extremo */}
          <Circle cx="282" cy="70" r="12" fill="#475569" />
        </Svg>
      );
    }

    let currentX = 138; // Coordenada X inicial para empezar a cargar discos en la manga de la barra
    const svgElements = [];

    // Recorrer los discos calculados (de mayor a menor peso) y acumular en SVG
    calculated.plates.forEach((plate, plateIdx) => {
      const plateColor = PLATE_COLORS[plate.weight] || { bg: '#94a3b8', text: '#000', border: '#475569' };
      const size = PLATE_SIZES[plate.weight] || { height: 60, width: 12 };
      
      // Dibujar la cantidad de discos de este peso especificado
      for (let i = 0; i < plate.qty; i++) {
        const yCoord = 70 - (size.height / 2);
        
        svgElements.push(
          <G key={`${plateIdx}-${i}-${currentX}`}>
            {/* Disco */}
            <Rect 
              x={currentX} 
              y={yCoord} 
              width={size.width} 
              height={size.height} 
              fill={plateColor.bg} 
              stroke={plateColor.border}
              strokeWidth="1.5"
              rx="4" 
            />
            {/* Ranura/Detalle del disco interno */}
            <Rect 
              x={currentX + 3} 
              y={yCoord + 4} 
              width={size.width - 6} 
              height={size.height - 8} 
              fill="transparent" 
              stroke={plateColor.border}
              strokeWidth="1"
              opacity="0.4"
              rx="2" 
            />
          </G>
        );
        currentX += (size.width + 4); // Desplazar X al siguiente disco con margen de 4px
      }
    });

    return (
      <View className="items-center justify-center bg-slate-950/80 rounded-2xl p-4 border border-slate-900 mb-6">
        <Svg height="140" width="100%" viewBox="0 0 300 140">
          {/* Barra de agarre */}
          <Rect x="0" y="62" width="120" height="16" fill="#475569" rx="2" />
          {/* Tope/Collarín */}
          <Rect x="120" y="48" width="12" height="44" fill="#cbd5e1" rx="3" />
          {/* Manga de carga */}
          <Rect x="132" y="58" width="150" height="24" fill="#94a3b8" rx="2" />
          
          {/* Discos cargados dinámicos */}
          {svgElements}
          
          {/* Tapón final */}
          <Circle cx="282" cy="70" r="12" fill="#334155" />
        </Svg>
        <Text className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest mt-1">
          Representación visual de 1 extremo de la barra
        </Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 items-center justify-center px-6">
        <View 
          className="w-full rounded-3xl p-6 border"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          {/* Header */}
          <View className="flex-row justify-between items-center mb-6">
            <View className="flex-row items-center gap-x-2">
              <View className="w-8 h-8 rounded-lg bg-blue-500/10 items-center justify-center">
                <Dumbbell color="#3b82f6" size={18} />
              </View>
              <View>
                <Text className="text-white font-extrabold text-base">Carga de Barra ⚖️</Text>
                <Text className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">{exerciseName}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} className="w-8 h-8 bg-slate-900 border border-slate-800 rounded-full items-center justify-center">
              <X color="#94a3b8" size={16} />
            </TouchableOpacity>
          </View>

          {/* Peso Total e Información */}
          <View className="items-center mb-6">
            <View className="flex-row items-baseline">
              <Text className="text-white text-4xl font-black">{totalWeight || 0}</Text>
              <Text className="text-slate-500 text-sm font-bold ml-1.5">kg totales</Text>
            </View>
            <Text className="text-slate-500 text-xs mt-1 text-center font-medium">
              Peso por lado: {calculated.success ? `${((parseFloat(totalWeight) - barWeight) / 2).toFixed(2)} kg` : '0 kg'}
            </Text>
          </View>

          {/* Barra interactiva SVG */}
          {renderBarbellSVG()}

          {/* Selectores de Barra */}
          <Text className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider mb-3">Peso de la Barra Base</Text>
          <View className="flex-row gap-x-2 mb-6">
            {[
              { weight: 20, name: '20 kg (Olímpica)' },
              { weight: 15, name: '15 kg (Femenina)' },
              { weight: 10, name: '10 kg (Z / Corta)' }
            ].map(item => (
              <TouchableOpacity
                key={item.weight}
                onPress={() => setBarWeight(item.weight)}
                className={`flex-1 py-3 rounded-xl border items-center justify-center ${barWeight === item.weight ? 'bg-blue-600 border-blue-500' : 'bg-slate-950 border-slate-900'}`}
              >
                <Text className={`text-[10px] font-black ${barWeight === item.weight ? 'text-white' : 'text-slate-400'}`}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Resultados Detallados de Carga */}
          <View className="p-4 bg-slate-950 rounded-2xl border border-slate-900 mb-6">
            <Text className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider mb-3">Discos a colocar por lado</Text>

            {calculated.success ? (
              <View className="gap-y-2">
                {calculated.plates.map((plate, index) => {
                  const plateColor = PLATE_COLORS[plate.weight] || { bg: '#fff', text: '#000' };
                  return (
                    <View key={index} className="flex-row items-center justify-between border-b border-slate-900/50 pb-2">
                      <View className="flex-row items-center gap-x-3">
                        <View 
                          className="w-5 h-5 rounded-full items-center justify-center border border-black/10"
                          style={{ backgroundColor: plateColor.bg }}
                        >
                          <Text 
                            className="text-[8px] font-black"
                            style={{ color: plateColor.text }}
                          >
                            {plate.weight >= 10 ? plate.weight : plate.weight.toFixed(1)}
                          </Text>
                        </View>
                        <Text className="text-white font-extrabold text-sm">Discos de {plate.weight} kg</Text>
                      </View>
                      <View className="bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                        <Text className="text-blue-400 font-black text-xs">x {plate.qty}</Text>
                      </View>
                    </View>
                  );
                })}
                {calculated.plates.length === 0 && (
                  <Text className="text-slate-400 text-xs py-1">Coloca la barra vacía sin discos.</Text>
                )}
                {calculated.remaining > 0 && (
                  <View className="flex-row items-center gap-x-2 mt-2 pt-2 border-t border-slate-900/60">
                    <Info size={12} color="#fbbf24" />
                    <Text className="text-amber-500 text-[10px] font-bold">
                      Remanente inaccesible: {calculated.remaining} kg por lado (Requiere micro-discos).
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <Text className="text-red-400 font-bold text-xs py-1">⚠️ {calculated.error}</Text>
            )}
          </View>

          {/* Botón de cerrar */}
          <TouchableOpacity
            onPress={onClose}
            className="w-full py-4 rounded-xl items-center justify-center shadow-lg"
            style={{ backgroundColor: colors.accent }}
          >
            <Text style={{ color: colors.accentText }} className="font-extrabold text-sm">Entendido, ¡a levantar! 🏋️‍♂️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
