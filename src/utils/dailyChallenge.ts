import type { BibleData } from './bible';
import { buildQuestion, collectCandidates, shuffle, type GenQuestion } from './questionGen';

/**
 * The daily challenge is the SAME set of questions for everyone on a given UTC day — that is what
 * makes the world leaderboard comparable. Questions are generated deterministically from a
 * date-seeded PRNG, so no server round-trip is needed and every client produces an identical set.
 */

export type DailyQuestion = GenQuestion;

export const QUESTIONS_PER_DAY = 10;
export const TIME_PER_QUESTION_MS = 15000;
const BASE_POINTS = 100;
const SPEED_BONUS_MAX = 100;

/** Correct answers earn a base plus a speed bonus that decays linearly with the clock. */
export function scoreForAnswer(
  isCorrect: boolean,
  msRemaining: number,
  msTotal: number = TIME_PER_QUESTION_MS,
): number {
  if (!isCorrect) return 0;
  const fraction = Math.max(0, Math.min(1, msRemaining / msTotal));
  return BASE_POINTS + Math.round(SPEED_BONUS_MAX * fraction);
}

/**
 * The largest score attainable in a run — used to show "X / max" without magic numbers.
 * NOTE: firestore.rules hardcodes this value (2000) as the leaderboard score cap. If this
 * formula changes, update the cap in the daily-scores rule to match.
 */
export const maxDailyScore = () => QUESTIONS_PER_DAY * (BASE_POINTS + SPEED_BONUS_MAX);

/** UTC calendar day, e.g. "2026-07-15" — the leaderboard key and the generator seed. */
export function dailyKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

// mulberry32: a tiny, fast, well-distributed seeded PRNG. Deterministic for a given seed.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministically builds the day's questions. Same `key` + same Bible ⇒ identical output. */
export function generateDailyQuestions(
  data: BibleData,
  key: string,
  count: number = QUESTIONS_PER_DAY,
): DailyQuestion[] {
  const rng = mulberry32(hashString(key));
  const candidates = collectCandidates(data);
  if (!candidates.length) return [];

  const questions: DailyQuestion[] = [];
  for (const candidate of shuffle(candidates, rng)) {
    if (questions.length >= count) break;
    const q = buildQuestion(candidate, rng);
    if (q && q.correctIndex >= 0) questions.push(q);
  }
  return questions;
}
