import type { BibleData } from './bible';
import { buildQuestion, collectCandidates, shuffle, type GenQuestion } from './questionGen';

/**
 * The Furnace: endless survival. Unlike the daily challenge, each run is personal, so questions
 * are drawn at random (not seeded) — the leaderboard compares how *far* you endure, not identical
 * question sets.
 */

export const FURNACE_LIVES = 3;

const START_TIME_MS = 15000;
const MIN_TIME_MS = 6000;
// Every few correct answers the clock tightens, so the fire gets hotter the longer you last.
const STEP_MS = 500;
const STEP_EVERY = 3;

/** Time allowed for the question at a given streak — shrinks with progress, floored so it stays fair. */
export function timeForStreak(streak: number): number {
  const reductions = Math.floor(streak / STEP_EVERY);
  return Math.max(MIN_TIME_MS, START_TIME_MS - reductions * STEP_MS);
}

/**
 * An endless supply of questions from a shuffled deck. When the deck runs out it reshuffles, so a
 * long run keeps going without repeating a verse until every eligible verse has been seen once.
 */
export class SurvivalDeck {
  private deck: GenQuestion[] = [];
  private pointer = 0;
  private readonly data: BibleData;
  private readonly rng: () => number;

  constructor(data: BibleData, rng: () => number = Math.random) {
    this.data = data;
    this.rng = rng;
    this.reshuffle();
  }

  private reshuffle() {
    const candidates = collectCandidates(this.data);
    this.deck = shuffle(candidates, this.rng)
      .map((c) => buildQuestion(c, this.rng))
      .filter((q): q is GenQuestion => q !== null && q.correctIndex >= 0);
    this.pointer = 0;
  }

  next(): GenQuestion {
    if (this.pointer >= this.deck.length) this.reshuffle();
    return this.deck[this.pointer++];
  }
}
