/**
 * BackupService.js
 * Servicio inteligente para exportar e importar datos locales y de la base de datos de Supabase.
 * Genera archivos CSV limpios para Excel y JSON estructurados para respaldos del sistema.
 */

/**
 * Convierte el historial de entrenamientos a un formato CSV compatible con Excel.
 */
export const convertWorkoutsToCSV = (workouts) => {
  if (!workouts || workouts.length === 0) return '';

  // Encabezados estándar de Latinoamérica
  const headers = ['Fecha', 'Entrenamiento', 'Grupo Muscular', 'Ejercicio', 'Serie', 'Peso (kg)', 'Repeticiones', 'RPE'];
  const rows = [headers.join(',')];

  workouts.forEach(w => {
    const date = w.workout_date;
    const workoutName = `"${w.name.replace(/"/g, '""')}"`;

    if (w.workout_entries && w.workout_entries.length > 0) {
      // Ordenar por número de serie
      const sortedEntries = [...w.workout_entries].sort((a, b) => a.set_number - b.set_number);
      
      sortedEntries.forEach(entry => {
        const muscle = entry.exercises?.muscle_group || 'Otros';
        const exName = `"${(entry.exercises?.name || 'Ejercicio Desconocido').replace(/"/g, '""')}"`;
        const setNum = entry.set_number;
        const weight = entry.weight || 0;
        const reps = entry.reps || 0;
        const rpe = entry.rpe || '';

        const line = [date, workoutName, muscle, exName, setNum, weight, reps, rpe];
        rows.push(line.join(','));
      });
    }
  });

  return rows.join('\n');
};

/**
 * Genera el paquete JSON completo de copia de seguridad con metadatos.
 */
export const generateJSONBackup = (profile, workouts, routines) => {
  return JSON.stringify({
    metadata: {
      appName: 'GymTrackerInteligente',
      version: '1.2.0',
      exportedAt: new Date().toISOString(),
      backupType: 'Full'
    },
    profile: profile || {},
    workouts: workouts || [],
    routines: routines || []
  }, null, 2);
};

/**
 * Importa y sincroniza un archivo JSON de respaldo de forma masiva en Supabase.
 */
export const importJSONBackupToSupabase = async (jsonData, userId, supabaseClient) => {
  // 1. Validaciones básicas del archivo
  if (!jsonData || !jsonData.metadata || jsonData.metadata.appName !== 'GymTrackerInteligente') {
    throw new Error('El archivo seleccionado no es una copia de seguridad válida de Gym Tracker.');
  }

  const { workouts = [], routines = [], profile = {} } = jsonData;

  // 2. Restaurar Perfil de Usuario si existen campos válidos
  if (profile && Object.keys(profile).length > 0) {
    const { error: profileError } = await supabaseClient
      .from('user_profiles')
      .upsert({
        user_id: userId,
        body_weight: profile.body_weight,
        height: profile.height,
        age: profile.age,
        gender: profile.gender,
        activity_level: profile.activity_level,
        goal: profile.goal,
        experience_level: profile.experience_level
      });
    
    if (profileError) console.error('Error al restaurar perfil:', profileError);
  }

  // 3. Restaurar Rutinas Guardadas
  for (const r of routines) {
    // Verificar si ya existe una rutina con este nombre para evitar duplicar
    const { data: existingRoutine } = await supabaseClient
      .from('routines')
      .select('id')
      .eq('user_id', userId)
      .eq('name', r.name)
      .limit(1);

    if (!existingRoutine || existingRoutine.length === 0) {
      // Crear cabecera de la rutina
      const { data: newRoutine, error: rError } = await supabaseClient
        .from('routines')
        .insert([{ user_id: userId, name: r.name, description: r.description }])
        .select()
        .single();

      if (!rError && newRoutine && r.routine_exercises) {
        // Preparar ejercicios de la rutina
        const formattedExercises = r.routine_exercises.map((re, index) => ({
          routine_id: newRoutine.id,
          exercise_id: re.exercise_id,
          default_sets: re.default_sets || 3,
          default_reps: re.default_reps || 10,
          order_index: re.order_index || index
        }));

        await supabaseClient.from('routine_exercises').insert(formattedExercises);
      }
    }
  }

  // 4. Restaurar Historial de Entrenamientos y sus entradas
  for (const w of workouts) {
    // Verificar si el entrenamiento ya existe por fecha y nombre
    const { data: existingWorkout } = await supabaseClient
      .from('workouts')
      .select('id')
      .eq('user_id', userId)
      .eq('workout_date', w.workout_date)
      .eq('name', w.name)
      .limit(1);

    let workoutId;
    if (existingWorkout && existingWorkout.length > 0) {
      workoutId = existingWorkout[0].id;
    } else {
      // Crear cabecera del entrenamiento
      const { data: newWorkout, error: wError } = await supabaseClient
        .from('workouts')
        .insert([{ user_id: userId, workout_date: w.workout_date, name: w.name }])
        .select()
        .single();

      if (!wError && newWorkout) {
        workoutId = newWorkout.id;
      }
    }

    // Inyectar los sets del entrenamiento si tenemos un ID válido
    if (workoutId && w.workout_entries && w.workout_entries.length > 0) {
      // Borrar entradas previas para evitar duplicidad de series en el mismo entrenamiento
      await supabaseClient.from('workout_entries').delete().eq('workout_id', workoutId);

      const formattedEntries = w.workout_entries.map(entry => ({
        workout_id: workoutId,
        exercise_id: entry.exercise_id,
        set_number: entry.set_number,
        weight: entry.weight,
        reps: entry.reps,
        rpe: entry.rpe
      }));

      const { error: eError } = await supabaseClient.from('workout_entries').insert(formattedEntries);
      if (eError) console.error('Error insertando entradas restauradas:', eError);
    }
  }

  return {
    importedWorkouts: workouts.length,
    importedRoutines: routines.length
  };
};
