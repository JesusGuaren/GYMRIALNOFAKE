import { buildPrefilledSets, getLastExerciseSets, evaluateLiveSet } from '../CoachingService';

describe('buildPrefilledSets', () => {
  it('fills with zero weight and the fallback reps when there is no history', () => {
    expect(buildPrefilledSets([], 3, 8)).toEqual([
      { weight: 0, reps: 8, rpe: 8, type: 'Normal' },
      { weight: 0, reps: 8, rpe: 8, type: 'Normal' },
      { weight: 0, reps: 8, rpe: 8, type: 'Normal' },
    ]);
    expect(buildPrefilledSets(null, 2)).toEqual([
      { weight: 0, reps: 0, rpe: 8, type: 'Normal' },
      { weight: 0, reps: 0, rpe: 8, type: 'Normal' },
    ]);
  });

  it('repeats the last known set when more sets are requested than there is history for', () => {
    const lastSets = [{ weight: 50, reps: 10, rpe: 7 }];
    expect(buildPrefilledSets(lastSets, 3)).toEqual([
      { weight: 50, reps: 10, rpe: 7, type: 'Normal' },
      { weight: 50, reps: 10, rpe: 7, type: 'Normal' },
      { weight: 50, reps: 10, rpe: 7, type: 'Normal' },
    ]);
  });

  // Regression test: the set COUNT must come from the `count` argument (the
  // routine's own default_sets), never from how many sets happen to exist in
  // history. A routine calling for 1 set must prefill exactly 1, even if a
  // stray old session logged 9-10 sets of the same exercise.
  it('truncates to the requested count even when there is more history than that', () => {
    const lastSets = [
      { weight: 40, reps: 8, rpe: 7 },
      { weight: 45, reps: 6, rpe: 8 },
      { weight: 50, reps: 4, rpe: 9 },
    ];
    expect(buildPrefilledSets(lastSets, 1)).toEqual([
      { weight: 40, reps: 8, rpe: 7, type: 'Normal' },
    ]);
  });

  it('defaults rpe to 8 when the source set has no rpe recorded', () => {
    expect(buildPrefilledSets([{ weight: 40, reps: 8 }], 1)).toEqual([
      { weight: 40, reps: 8, rpe: 8, type: 'Normal' },
    ]);
  });
});

describe('getLastExerciseSets', () => {
  const todayStr = new Date().toISOString().split('T')[0];

  it('returns an empty array when there is no matching history', () => {
    expect(getLastExerciseSets('ex-1', [])).toEqual([]);
    expect(getLastExerciseSets('ex-1', null)).toEqual([]);
    expect(getLastExerciseSets('ex-1', [
      { workout_date: '2024-01-01', workout_entries: [{ exercise_id: 'other', weight: 10, reps: 10 }] },
    ])).toEqual([]);
  });

  it('excludes a workout logged today, even if it is the only match', () => {
    const workouts = [
      { workout_date: todayStr, workout_entries: [{ exercise_id: 'ex-1', weight: 99, reps: 1, set_number: 1 }] },
    ];
    expect(getLastExerciseSets('ex-1', workouts)).toEqual([]);
  });

  it('picks the most recent previous session, not just the first match', () => {
    const workouts = [
      { workout_date: '2024-01-01', workout_entries: [{ exercise_id: 'ex-1', weight: 40, reps: 10, set_number: 1 }] },
      { workout_date: '2024-01-15', workout_entries: [{ exercise_id: 'ex-1', weight: 50, reps: 8, set_number: 1 }] },
    ];
    expect(getLastExerciseSets('ex-1', workouts)).toEqual([{ weight: 50, reps: 8, rpe: 8 }]);
  });

  it('returns sets ordered by set_number and defaults rpe to 8', () => {
    const workouts = [
      {
        workout_date: '2024-01-01',
        workout_entries: [
          { exercise_id: 'ex-1', weight: 60, reps: 5, set_number: 2, rpe: 9 },
          { exercise_id: 'ex-1', weight: 50, reps: 8, set_number: 1 },
        ],
      },
    ];
    expect(getLastExerciseSets('ex-1', workouts)).toEqual([
      { weight: 50, reps: 8, rpe: 8 },
      { weight: 60, reps: 5, rpe: 9 },
    ]);
  });
});

describe('evaluateLiveSet', () => {
  it('never suggests anything for a warmup set', () => {
    expect(evaluateLiveSet(100, 5, 3, 'Warmup')).toBeNull();
  });

  it('returns null when weight, reps or rpe is missing', () => {
    expect(evaluateLiveSet(0, 5, 8)).toBeNull();
    expect(evaluateLiveSet(100, 0, 8)).toBeNull();
    expect(evaluateLiveSet(100, 5, 0)).toBeNull();
  });

  it('suggests increasing weight when RPE is low with enough reps', () => {
    const result = evaluateLiveSet(100, 6, 6);
    expect(result.type).toBe('increase');
    expect(result.text).toContain('102.5kg');
  });

  it('suggests decreasing weight when RPE is near-max with few reps, floored at the current weight below 5kg', () => {
    expect(evaluateLiveSet(20, 3, 10).type).toBe('decrease');
    expect(evaluateLiveSet(20, 3, 10).text).toContain('17.5kg');
    // Below 5kg, don't suggest dropping further.
    expect(evaluateLiveSet(3, 3, 10).text).toContain('3kg');
  });

  it('flags the sweet-spot RPE range as maintain', () => {
    expect(evaluateLiveSet(100, 8, 8).type).toBe('maintain');
  });

  it('returns null outside all the defined RPE/reps buckets', () => {
    expect(evaluateLiveSet(100, 3, 7)).toBeNull();
  });
});
