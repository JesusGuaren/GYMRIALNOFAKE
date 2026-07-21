import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'

export const THEMES = {
  midnight: { bg: '#020617', card: '#0b0f19', accent: '#6366f1', border: '#1f293d' },
  oled: { bg: '#000000', card: '#0a0a0a', accent: '#f8fafc', border: '#1c1c1e' },
  ocean: { bg: '#010409', card: '#0d1117', accent: '#38bdf8', border: '#21262d' },
  volcano: { bg: '#0c0202', card: '#160808', accent: '#ef4444', border: '#2a1111' },
  emerald: { bg: '#020d08', card: '#08160f', accent: '#10b981', border: '#122c1e' },
  gold: { bg: '#0a0902', card: '#141208', accent: '#eab308', border: '#2b2713' },
  rose: { bg: '#0c0205', card: '#16080e', accent: '#f43f5e', border: '#2c121e' },
  cyberpunk: { bg: '#0a010d', card: '#14051a', accent: '#d946ef', border: '#2d0e3a' }
};

const useStore = create(
  persist(
    (set, get) => ({
      user: null,
      sessionChecked: false,
      userProfile: null,
      exercises: [],
      workouts: [],
      routines: [],
      programs: [],
      coachChatMessages: [],
      
      // Active Workout & Global Timer State
      currentActiveWorkout: null, // { name, date, exercises }
      globalTimerSeconds: null, // null means inactive
      timerEndTime: null, // timestamp expiration
      theme: 'midnight',
      offlineQueue: [], // queue for offline sync
      isResettingPassword: false,
      completedTutorials: { dashboard: false, logger: false, analysis: false, coach: false },
      
      setTheme: (theme) => set({ theme }),
      setIsResettingPassword: (isResettingPassword) => set({ isResettingPassword }),
      markTutorialCompleted: (screen) => set((state) => ({
        completedTutorials: { ...state.completedTutorials, [screen]: true }
      })),
      resetAllTutorials: () => set({
        completedTutorials: { dashboard: false, logger: false, analysis: false, coach: false }
      }),
      setCoachChatMessages: (messages) => set({ coachChatMessages: messages }),
      addCoachChatMessage: (message) => set((state) => ({ 
        coachChatMessages: [...(state.coachChatMessages || []), message] 
      })),
      setCurrentActiveWorkout: (workout) => set({ currentActiveWorkout: workout }),
      clearCurrentActiveWorkout: () => set({ currentActiveWorkout: null }),
      setGlobalTimer: (seconds, isTick = false) => {
        if (seconds === null || seconds <= 0) {
          set({ globalTimerSeconds: null, timerEndTime: null });
        } else {
          set((state) => {
            const updates = { globalTimerSeconds: seconds };
            if (!isTick) {
              updates.timerEndTime = Date.now() + (seconds * 1000);
            }
            return updates;
          });
        }
      },
      
      // Auth Actions
      setUser: (user) => set({ user }),
      setSessionChecked: (checked) => set({ sessionChecked: checked }),
      logout: async () => {
        await supabase.auth.signOut();
        set({ user: null, workouts: [], userProfile: null, routines: [], coachChatMessages: [], currentActiveWorkout: null, timerEndTime: null, offlineQueue: [] });
      },

  // Actions
  fetchExercises: async () => {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .order('name');
    if (!error && data) set({ exercises: data });
  },

  fetchWorkouts: async () => {
    const user = get().user;
    if (!user) return;

    // Fetch all workouts and their entries for the current user
    const { data, error } = await supabase
      .from('workouts')
      .select(`
        *,
        workout_entries (*, exercises (name, muscle_group))
      `)
      .eq('user_id', user.id)
      .order('workout_date', { ascending: false });
    
    if (!error && data) set({ workouts: data });
  },

  fetchUserProfile: async () => {
    const user = get().user;
    if (!user) return;
    
    const { data, error } = await supabase.from('user_profiles').select('*').eq('user_id', user.id).single();
    if (data) {
      set({ userProfile: data });
    } else if (error && error.code === 'PGRST116') {
      // Row not found, create a default profile silently
      const { data: newProfile } = await supabase.from('user_profiles').insert([{ user_id: user.id }]).select().single();
      if (newProfile) set({ userProfile: newProfile });
    }
  },

  updateUserProfile: async (updates) => {
    const user = get().user;
    if (!user) return;
    const { data, error } = await supabase.from('user_profiles').update(updates).eq('user_id', user.id).select().single();
    if (error) {
      console.error("Error al actualizar perfil:", error);
      throw error;
    }
    if (data) set({ userProfile: data });
  },

  fetchRoutines: async () => {
    const user = get().user;
    if (!user) return;

    const { data, error } = await supabase
      .from('routines')
      .select(`
        *,
        routine_exercises (*, exercises (name, muscle_group))
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (!error && data) set({ routines: data });
  },

  fetchPrograms: async () => {
    const user = get().user;
    if (!user) return;

    const { data, error } = await supabase
      .from('training_programs')
      .select(`
        *,
        routines (*, routine_exercises (*, exercises (name, muscle_group)))
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error fetching programs:", error);
    }
    if (data) set({ programs: data });
  },

  saveProgram: async (name, description, days, programId = null) => {
    const user = get().user;
    if (!user) return;

    let program;
    let pError;

    if (programId) {
      // Update existing program
      const { data, error } = await supabase
        .from('training_programs')
        .update({ name, description })
        .eq('id', programId)
        .select()
        .single();
      program = data;
      pError = error;

      // Delete old routines (this will cascade to routine_exercises)
      await supabase.from('routines').delete().eq('program_id', programId);
    } else {
      // Create the new program
      const { data, error } = await supabase
        .from('training_programs')
        .insert([{ user_id: user.id, name, description }])
        .select()
        .single();
      program = data;
      pError = error;
    }

    if (pError || !program) {
      console.error("Error saving program:", pError);
      alert("Error al guardar el programa: " + pError.message);
      return;
    }

    console.log("Programa procesado:", program);

    // 2. Save each routine (day) and link it to the program
    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      const { data: routine, error: rError } = await supabase
        .from('routines')
        .insert([{ 
          user_id: user.id, 
          name: day.name, 
          program_id: program.id, 
          day_order: i 
        }])
        .select()
        .single();

      if (rError) {
        console.error("Error saving routine for day " + i, rError);
        continue;
      }

      const routineExercises = day.exercises.map((ex, exIdx) => ({
        routine_id: routine.id,
        exercise_id: ex.exercise_id,
        default_sets: 3,
        default_reps: 10,
        order_index: exIdx,
        superset_id: ex.supersetId || null
      }));

      const { error: reError } = await supabase.from('routine_exercises').insert(routineExercises);
      if (reError) console.error("Error saving exercises for routine:", reError);
    }

    await get().fetchPrograms();
    await get().fetchRoutines();
    await get().setActiveProgram(program.id);
    alert("¡Programa '" + name + "' guardado y activado con éxito!");
  },

  setActiveProgram: async (programId) => {
    const user = get().user;
    if (!user) return;

    // Set all other programs to inactive
    await supabase.from('training_programs').update({ is_active: false }).eq('user_id', user.id);
    // Set selected to active
    await supabase.from('training_programs').update({ is_active: true }).eq('id', programId);
    
    await get().fetchPrograms();
  },

  deleteProgram: async (programId) => {
    // Routines and routine_exercises should cascade if schema is correct, 
    // but the SQL I gave used ON DELETE CASCADE for program_id in routines.
    const { error } = await supabase.from('training_programs').delete().eq('id', programId);
    if (error) console.error("Error deleting program:", error);
    await get().fetchPrograms();
    await get().fetchRoutines();
  },

  saveRoutine: async (name, description, exercises) => {
    const user = get().user;
    if (!user) return;
    
    const { data: newRoutine, error: routineError } = await supabase
      .from('routines')
      .insert([{ user_id: user.id, name, description }])
      .select()
      .single();
      
    if (routineError || !newRoutine) {
      console.error("Error saving routine:", routineError);
      return;
    }
    
    const routineExercises = exercises.map((ex, index) => ({
      routine_id: newRoutine.id,
      exercise_id: ex.exercise_id,
      default_sets: ex.sets?.length || 3,
      default_reps: ex.sets?.[0]?.reps || 10,
      order_index: index,
      superset_id: ex.supersetId || null
    }));
    
    const { error: exercisesError } = await supabase.from('routine_exercises').insert(routineExercises);
    if (exercisesError) console.error("Error saving routine exercises:", exercisesError);
    
    await get().fetchRoutines();
  },

  updateRoutine: async (routineId, name, description, exercises) => {
    const user = get().user;
    if (!user) return;

    // 1. Update routine header
    const { error: routineError } = await supabase
      .from('routines')
      .update({ name, description })
      .eq('id', routineId);

    if (routineError) {
      console.error("Error updating routine header:", routineError);
      throw routineError;
    }

    // 2. Wipe existing routine exercises and insert the new ones
    await supabase.from('routine_exercises').delete().eq('routine_id', routineId);

    const routineExercises = exercises.map((ex, index) => ({
      routine_id: routineId,
      exercise_id: ex.exercise_id,
      default_sets: ex.default_sets || 3,
      default_reps: ex.default_reps || 10,
      order_index: index,
      superset_id: ex.supersetId || null
    }));

    const { error: exercisesError } = await supabase.from('routine_exercises').insert(routineExercises);
    if (exercisesError) {
      console.error("Error inserting updated routine exercises:", exercisesError);
      throw exercisesError;
    }

    await get().fetchRoutines();
  },

  saveWorkoutEntry: async (date, name, entries) => {
    const user = get().user;
    if (!user) return;

    let workoutId;
    const { data: existing } = await supabase
      .from('workouts')
      .select('id')
      .eq('user_id', user.id)
      .eq('workout_date', date)
      .single();

    if (existing) {
      workoutId = existing.id;
    } else {
      const { data: newWorkout } = await supabase
        .from('workouts')
        .insert([{ user_id: user.id, workout_date: date, name }])
        .select()
        .single();
      workoutId = newWorkout.id;
    }

    const formattedEntries = entries.map((entry, index) => ({
      workout_id: workoutId,
      exercise_id: entry.exercise_id,
      set_number: index + 1,
      weight: entry.weight,
      reps: entry.reps,
      rpe: entry.rpe,
      superset_id: entry.superset_id || null
    }));

    const { error } = await supabase.from('workout_entries').insert(formattedEntries);
    if (error) console.error("Error inserting workout entries:", error);
    await get().fetchWorkouts();
    
    return workoutId;
  },

  deleteWorkout: async (workoutId) => {
    // Delete entries first (if no cascade)
    await supabase.from('workout_entries').delete().eq('workout_id', workoutId);
    const { error } = await supabase.from('workouts').delete().eq('id', workoutId);
    if (error) console.error("Error deleting workout:", error);
    await get().fetchWorkouts();
  },

  updateWorkout: async (workoutId, date, name, entries) => {
    // Update the workout header
    await supabase.from('workouts').update({ name, workout_date: date }).eq('id', workoutId);
    
    // Wipe old entries and insert new ones
    await supabase.from('workout_entries').delete().eq('workout_id', workoutId);
    
    const formattedEntries = entries.map((entry, index) => ({
      workout_id: workoutId,
      exercise_id: entry.exercise_id,
      set_number: index + 1,
      weight: entry.weight,
      reps: entry.reps,
      rpe: entry.rpe
    }));

    const { error } = await supabase.from('workout_entries').insert(formattedEntries);
    if (error) console.error("Error updating entries:", error);
    await get().fetchWorkouts();
  },

  deleteExerciseFromWorkout: async (workoutId, exerciseId) => {
    await supabase.from('workout_entries').delete().eq('workout_id', workoutId).eq('exercise_id', exerciseId);
    const { data: remaining } = await supabase.from('workout_entries').select('id').eq('workout_id', workoutId).limit(1);
    if (!remaining || remaining.length === 0) {
      await supabase.from('workouts').delete().eq('id', workoutId);
    }
    await get().fetchWorkouts();
  },

  deleteRoutine: async (routineId) => {
    await supabase.from('routine_exercises').delete().eq('routine_id', routineId);
    const { error } = await supabase.from('routines').delete().eq('id', routineId);
    if (error) console.error("Error deleting routine:", error);
    await get().fetchRoutines();
  }
    }),
    {
      name: 'elite-gym-tracker-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentActiveWorkout: state.currentActiveWorkout,
        theme: state.theme,
        timerEndTime: state.timerEndTime,
        offlineQueue: state.offlineQueue,
        completedTutorials: state.completedTutorials,
      }),
    }
  )
);

export default useStore;
