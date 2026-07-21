/**
 * Servicio de Nutrición para Elite Gym Tracker
 * Implementa la fórmula de Mifflin-St Jeor para TDEE y cálculos de macronutrientes.
 */

export const ACTIVITY_FACTORS = {
  sedentary: 1.2,        // Poco o nada de ejercicio
  light: 1.375,         // Ejercicio ligero 1-3 días/semana
  moderate: 1.55,       // Ejercicio moderado 3-5 días/semana
  active: 1.725,        // Ejercicio fuerte 6-7 días/semana
  very_active: 1.9      // Ejercicio muy fuerte + trabajo físico
};

export const calculateBMR = (weight, height, age, gender) => {
  if (!weight || !height || !age || !gender) return 0;
  
  // Fórmula de Mifflin-St Jeor
  if (gender.toLowerCase() === 'male') {
    return (10 * weight) + (6.25 * height) - (5 * age) + 5;
  } else {
    return (10 * weight) + (6.25 * height) - (5 * age) - 161;
  }
};

export const calculateTDEE = (bmr, activityLevel) => {
  const factor = ACTIVITY_FACTORS[activityLevel] || 1.2;
  return Math.round(bmr * factor);
};

export const getAdjustedCalories = (tdee, goal) => {
  switch (goal) {
    case 'Hypertrophy':
      return tdee + 300; // Superávit moderado
    case 'Fat Loss':
      return tdee - 500; // Déficit estándar
    case 'Strength':
    default:
      return tdee; // Mantenimiento
  }
};

export const calculateMacros = (weight, calories) => {
  if (!weight || !calories) return null;

  // Proteína: Rango de 1.8g a 2.2g por kg
  const proteinMin = Math.round(weight * 1.8);
  const proteinMax = Math.round(weight * 2.2);

  // Grasas: Rango de 0.7g a 1.0g por kg
  const fatMin = Math.round(weight * 0.7);
  const fatMax = Math.round(weight * 1.0);

  // Carbohidratos: El resto. 
  // El máximo de carbos ocurre cuando proteína y grasa están al mínimo.
  // El mínimo de carbos ocurre cuando proteína y grasa están al máximo.
  const carbsMax = Math.round(Math.max(0, (calories - (proteinMin * 4 + fatMin * 9)) / 4));
  const carbsMin = Math.round(Math.max(0, (calories - (proteinMax * 4 + fatMax * 9)) / 4));

  return {
    protein: { min: proteinMin, max: proteinMax },
    fat: { min: fatMin, max: fatMax },
    carbs: { min: carbsMin, max: carbsMax }
  };
};
