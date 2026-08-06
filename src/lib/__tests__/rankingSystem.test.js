import { calculate1RM, getRankByWeight, getBestRankEver, RANKS } from '../rankingSystem';

describe('calculate1RM', () => {
  it('returns 0 when weight or reps is falsy', () => {
    expect(calculate1RM(0, 5)).toBe(0);
    expect(calculate1RM(100, 0)).toBe(0);
  });

  it('returns the weight itself for a single rep', () => {
    expect(calculate1RM(100, 1)).toBe(100);
  });

  it('uses Brzycki for reps <= 10', () => {
    expect(calculate1RM(100, 5)).toBe(113);
    expect(calculate1RM(100, 10)).toBe(133);
  });

  it('uses Epley for reps > 10', () => {
    expect(calculate1RM(100, 11)).toBe(137);
  });
});

describe('getRankByWeight', () => {
  it('returns the lowest rank for zero or negative 1RM', () => {
    expect(getRankByWeight(0, 'Chest').id).toBe('coal');
    expect(getRankByWeight(-10, 'Chest').id).toBe('coal');
  });

  it('ranks a bilateral lift using the raw 1RM', () => {
    // 100kg Chest: (100 * 1.0) / 75 = 1.333 -> Oro
    expect(getRankByWeight(100, 'Chest', 'Bench Press').name).toBe('Oro');
  });

  it('doubles the 1RM for an explicit dumbbell exercise', () => {
    // 30kg/hand Dumbbell Press on Chest: (30*2 * 1.0) / 75 = 0.8 -> Plata
    expect(getRankByWeight(30, 'Chest', 'Dumbbell Press').name).toBe('Plata');
  });

  // Regression test: this heuristic used to false-positive on bilateral
  // equipment whose name happens to contain "curl" (e.g. Barbell Curl),
  // doubling weight that was never per-hand. See commit history:
  // "afinó la detección" in getRankByWeight.
  it('does not double the weight for bilateral equipment even with a weak dumbbell-word hint', () => {
    // 20kg Arms: (20 * 2.5) / 75 = 0.667 -> Bronce (not doubled)
    expect(getRankByWeight(20, 'Arms', 'Barbell Curl').name).toBe('Bronce');
    // Same weight/muscle, no bilateral signal: (20*2 * 2.5) / 75 = 1.333 -> Oro (doubled)
    expect(getRankByWeight(20, 'Arms', 'Bicep Curl').name).toBe('Oro');
  });
});

describe('getBestRankEver', () => {
  it('returns the lowest rank when there are no workouts', () => {
    expect(getBestRankEver([]).id).toBe('coal');
    expect(getBestRankEver(null).id).toBe('coal');
  });

  it('returns the highest rank achieved across all workouts and exercises', () => {
    const workouts = [
      {
        workout_entries: [
          { weight: 40, reps: 5, exercises: { name: 'Bench Press', muscle_group: 'Chest' } },
        ],
      },
      {
        workout_entries: [
          { weight: 120, reps: 1, exercises: { name: 'Squat', muscle_group: 'Legs' } },
          { weight: 20, reps: 8, exercises: { name: 'Lateral Raise', muscle_group: 'Shoulders' } },
        ],
      },
    ];

    // Squat: (120 * 0.6) / 75 = 0.96 -> Plata — the best of the three entries.
    expect(getBestRankEver(workouts).name).toBe('Plata');
  });
});
