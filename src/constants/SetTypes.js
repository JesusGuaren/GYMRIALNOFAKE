// Fuente única de verdad para los tipos de serie, usada por el picker
// explícito y por cualquier panel de ayuda en Bitácora y Sesión Activa.
export const SET_TYPES = [
  { id: 'Normal', label: 'Normal', description: 'Serie de trabajo estándar.', color: '#94a3b8' },
  { id: 'Warmup', label: 'Calentamiento', description: 'No cuenta como serie de trabajo.', color: '#fbbf24' },
  { id: 'DropSet', label: 'Serie Descendente', description: 'Bajaste peso sin descansar.', color: '#ef4444' },
  { id: 'AMRAP', label: 'Al Fallo (AMRAP)', description: 'Repeticiones máximas posibles.', color: '#a855f7' }
];
