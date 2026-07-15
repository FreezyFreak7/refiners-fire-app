import { doc, onSnapshot, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { APP_ID } from './appConfig';

/**
 * Per-user progression stats: the lifetime "verses refined" counter, the daily streak, and
 * per-mode bests. These power the retention loop (come back to keep your streak) and later the
 * overcomer ranks and achievements.
 *
 * Stored at `users/{uid}/stats/main`, under the owner-only profile subtree, so no new rules are
 * needed. Because it's private and personal (not a competitive leaderboard), client-trust is fine
 * — a user can only affect their own numbers.
 */
export interface UserStats {
  /** Lifetime correct answers across every mode. Only ever increases. */
  versesRefined: number;
  /** Consecutive UTC days on which the user played at least once. */
  currentStreak: number;
  bestStreak: number;
  /** UTC day key (yyyy-mm-dd) of the most recent activity, or null if never played. */
  lastPlayedDay: string | null;
  /** Best-ever daily challenge score and best Furnace run. */
  dailyBest: number;
  furnaceBest: number;
}

export const EMPTY_STATS: UserStats = {
  versesRefined: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastPlayedDay: null,
  dailyBest: 0,
  furnaceBest: 0,
};

const statsDoc = (uid: string) => doc(db, 'artifacts', APP_ID, 'users', uid, 'stats', 'main');

/** UTC calendar day, e.g. "2026-07-15". Matches the daily challenge's day key. */
export function utcDayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function previousDay(key: string): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return utcDayKey(d);
}

/**
 * The streak after playing on `today`:
 *   - same day as last time  → unchanged (a second game today doesn't extend the streak);
 *   - the day after          → +1;
 *   - a gap (or first ever)  → reset to 1.
 */
export function computeStreak(lastDay: string | null, today: string, current: number): number {
  if (lastDay === today) return Math.max(current, 1);
  if (lastDay === previousDay(today)) return current + 1;
  return 1;
}

export function subscribeUserStats(
  uid: string,
  onChange: (stats: UserStats) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    statsDoc(uid),
    (snap) => {
      const data = snap.exists() ? snap.data() : {};
      onChange({
        versesRefined: data.versesRefined ?? 0,
        currentStreak: data.currentStreak ?? 0,
        bestStreak: data.bestStreak ?? 0,
        lastPlayedDay: data.lastPlayedDay ?? null,
        dailyBest: data.dailyBest ?? 0,
        furnaceBest: data.furnaceBest ?? 0,
      });
    },
    (err) => onError(err as Error),
  );
}

export interface ActivityResult {
  streak: number;
  versesRefined: number;
  /** True when this was the first activity of a new day (i.e. the streak advanced or reset). */
  isNewDay: boolean;
}

/**
 * Records the outcome of one completed run, atomically:
 *   - adds `versesCorrect` to the lifetime counter,
 *   - advances/holds/resets the streak based on the last-played day,
 *   - raises the relevant per-mode best.
 *
 * A transaction keeps this correct if two modes finish in quick succession.
 */
export async function recordActivity(
  uid: string,
  opts: { versesCorrect: number; mode: 'daily' | 'furnace'; score: number },
): Promise<ActivityResult> {
  const ref = statsDoc(uid);
  const today = utcDayKey();

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const s = snap.exists() ? snap.data() : {};

    const lastDay = (s.lastPlayedDay as string | undefined) ?? null;
    const isNewDay = lastDay !== today;
    const streak = computeStreak(lastDay, today, (s.currentStreak as number) ?? 0);
    const versesRefined = ((s.versesRefined as number) ?? 0) + Math.max(0, opts.versesCorrect);

    const patch: Record<string, unknown> = {
      versesRefined,
      currentStreak: streak,
      bestStreak: Math.max((s.bestStreak as number) ?? 0, streak),
      lastPlayedDay: today,
    };
    if (opts.mode === 'daily') patch.dailyBest = Math.max((s.dailyBest as number) ?? 0, opts.score);
    if (opts.mode === 'furnace') patch.furnaceBest = Math.max((s.furnaceBest as number) ?? 0, opts.score);

    tx.set(ref, patch, { merge: true });
    return { streak, versesRefined, isNewDay };
  });
}
