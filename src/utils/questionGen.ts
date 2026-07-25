import { listBooks, type BibleData } from './bible';

/**
 * Shared fill-in-the-blank question generation, used by every challenge mode. A question is a
 * verse with one word blanked out and four options (the answer plus three distractors). Callers
 * supply their own RNG: the daily challenge seeds it from the date (so everyone gets the same
 * set), survival passes Math.random (each run is personal).
 */

export interface GenQuestion {
  reference: string;
  /** Verse text with one word replaced by a blank. */
  prompt: string;
  options: string[];
  correctIndex: number;
  /** Index (into the verse's words) that was blanked — lets an editor re-choose the blank. */
  blankIndex: number;
}

/** Bare cleaned word at an index (letters/apostrophes only), for callers that pick their own word. */
export const cleanWordAt = (words: string[], index: number) => clean(words[index] ?? '');

/** Verse text with the word at `index` shown as a blank. */
export const promptWithBlank = (words: string[], index: number) => {
  const next = [...words];
  next[index] = '_____';
  return next.join(' ');
};

export interface Candidate {
  reference: string;
  words: string[];
}

const clean = (word: string) => word.replace(/[^A-Za-z']/g, '');
const PAD_OPTIONS = ['faith', 'grace', 'mercy', 'glory', 'kingdom', 'spirit', 'covenant', 'righteous'];

export function shuffle<T>(items: T[], rng: () => number): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

/** All verses long enough to make a fair fill-in question, in canonical order. */
export function collectCandidates(data: BibleData): Candidate[] {
  const out: Candidate[] = [];
  for (const book of listBooks(data)) {
    const chapters = data[book];
    for (const chapter of Object.keys(chapters)) {
      const verses = chapters[chapter];
      for (const verse of Object.keys(verses)) {
        const words = verses[verse].replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
        if (words.length >= 8 && words.length <= 28) {
          out.push({ reference: `${book} ${chapter}:${verse}`, words });
        }
      }
    }
  }
  return out;
}

/**
 * Builds a fill-in question. If `forcedIndex` is given (an author choosing the word), that word is
 * blanked; otherwise a decent-length word is picked at random via `rng`.
 */
export function buildQuestion(
  candidate: Candidate,
  rng: () => number,
  forcedIndex?: number,
): GenQuestion | null {
  const { words } = candidate;

  let targetIndex: number;
  if (forcedIndex !== undefined) {
    if (!clean(words[forcedIndex] ?? '')) return null;
    targetIndex = forcedIndex;
  } else {
    // Blankable words: real words of decent length, not the first (often a name or "The").
    const blankable = words
      .map((word, index) => ({ index, clean: clean(word) }))
      .filter((w) => w.index > 0 && w.clean.length >= 4);
    if (!blankable.length) return null;
    targetIndex = blankable[Math.floor(rng() * blankable.length)].index;
  }

  const target = { index: targetIndex, clean: clean(words[targetIndex]) };
  const answer = target.clean;

  const distractorPool = words
    .map(clean)
    .filter((w) => w.length >= 4 && w.toLowerCase() !== answer.toLowerCase());

  const distractors: string[] = [];
  for (const word of shuffle([...new Set(distractorPool)], rng)) {
    if (distractors.length >= 3) break;
    if (!distractors.some((d) => d.toLowerCase() === word.toLowerCase())) distractors.push(word);
  }
  for (const pad of shuffle([...PAD_OPTIONS], rng)) {
    if (distractors.length >= 3) break;
    if (
      pad.toLowerCase() !== answer.toLowerCase() &&
      !distractors.some((d) => d.toLowerCase() === pad.toLowerCase())
    ) {
      distractors.push(pad);
    }
  }

  const promptWords = [...words];
  promptWords[target.index] = '_____';

  const options = shuffle([answer, ...distractors], rng);
  return {
    reference: candidate.reference,
    prompt: promptWords.join(' '),
    options,
    correctIndex: options.findIndex((o) => o.toLowerCase() === answer.toLowerCase()),
    blankIndex: target.index,
  };
}
