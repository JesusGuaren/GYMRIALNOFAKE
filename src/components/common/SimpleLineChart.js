import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import Svg, { Polyline, Circle, Defs, LinearGradient, Stop, Path } from 'react-native-svg';

const { width } = Dimensions.get('window');
const CHART_HEIGHT = 200;
const CHART_PADDING = 40;

// Gráfico de línea simple con área degradada, sin dependencias externas.
// data: [{ date: string, [dataKey]: number }]
export default function SimpleLineChart({ data, color, dataKey }) {
  if (!data || data.length < 2) return null;

  const maxVal = Math.max(...data.map(d => d[dataKey]));
  const minVal = Math.min(...data.map(d => d[dataKey]));
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => {
    const x = CHART_PADDING + (i * (width - CHART_PADDING * 2) / (data.length - 1));
    const y = CHART_HEIGHT - CHART_PADDING - ((d[dataKey] - minVal) * (CHART_HEIGHT - CHART_PADDING * 2) / range);
    return { x, y };
  });

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');

  const areaPath = `M ${points[0].x} ${CHART_HEIGHT - CHART_PADDING} ` +
                   points.map(p => `L ${p.x} ${p.y}`).join(' ') +
                   ` L ${points[points.length - 1].x} ${CHART_HEIGHT - CHART_PADDING} Z`;

  return (
    <View style={{ height: CHART_HEIGHT, width: '100%' }}>
      <Svg height={CHART_HEIGHT} width={width - 40}>
        <Defs>
          <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.3" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#grad)" />
        <Polyline
          points={polylinePoints}
          fill="none"
          stroke={color}
          strokeWidth="3"
        />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r="4" fill={color} stroke="#020617" strokeWidth="2" />
        ))}
      </Svg>
      <View className="flex-row justify-between px-2 mt-2">
         <Text className="text-slate-500 text-[8px] font-bold">{data[0].date}</Text>
         <Text className="text-slate-500 text-[8px] font-bold">{data[data.length - 1].date}</Text>
      </View>
    </View>
  );
}
