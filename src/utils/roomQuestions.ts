import type { BibleData } from './bible';
import { shuffleArray } from './helpers';

/**
 * A single question as the live room understands it. Every source — Revelation's hand-authored
 * blanks, a player's custom quiz, or a random draw from any Bible library — is converted to this
 * one "pick an option" shape so the room renders and scores them all the same way.
 *
 *  - `prompt`  the sentence shown to players (a verse with one word blanked, or the verse text for
 *              a reference round).
 *  - `verse`   the reference label shown above the prompt. Empty string hides it — used for the
 *              reference mode, where showing the reference would give the answer away.
 *  - `options` the answer buttons, pre-shuffled so every client renders the identical order.
 *  - `blank`   the correct option.
 */
export interface RoomQuestion {
  kind: 'choice';
  prompt: string;
  verse: string;
  options: string[];
  blank: string;
  explanation?: string;
}

export type LibraryMode = 'blanks' | 'reference';

/** The libraries a live room can draw from, mapped to the books each covers. */
export type RoomSource =
  | 'revelation'
  | 'old_testament'
  | 'new_testament'
  | 'gospels'
  | 'alpha_omega'
  | 'quiz';

export const ROOM_SOURCE_LABELS: Record<RoomSource, string> = {
  revelation: 'Revelation',
  old_testament: 'Old Testament',
  new_testament: 'New Testament',
  gospels: 'The Gospels',
  alpha_omega: 'Alpha & Omega',
  quiz: 'My Quiz',
};

const FALLBACK_WORDS = ['faith', 'truth', 'glory', 'spirit', 'kingdom', 'mercy', 'grace', 'light', 'word', 'love'];

type VerseRecord = { ref: string; text: string };

const cleanWord = (w: string) => w.replace(/[^A-Za-z']/g, '');
const countWords = (t: string) => t.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length;

/**
 * The canonical book slice for a library. The source file lists all 66 books in order, so the
 * first 39 are the Old Testament and the rest the New — the same split the single-player libraries
 * use (see GameifiedMemoryGame.sliceBooks).
 */
export const booksForSource = (data: BibleData, source: RoomSource): string[] => {
  const all = Object.keys(data);
  switch (source) {
    case 'old_testament':
      return all.slice(0, 39);
    case 'new_testament':
      return all.slice(39);
    case 'gospels':
      return ['Matthew', 'Mark', 'Luke', 'John'].filter((b) => b in data);
    case 'alpha_omega':
      return all;
    default:
      return [];
  }
};

// Draw `count` distinct verses at random from the given books, preferring a readable length window
// (short enough to fit on screen, long enough to make a fair question). The window is relaxed only
// if the strict pass comes up short, so a round never starts empty.
const sampleVerses = (data: BibleData, books: string[], count: number): VerseRecord[] => {
  const out: VerseRecord[] = [];
  const seen = new Set<string>();
  const pool = books.filter((b) => data[b]);
  if (!pool.length) return out;

  const pick = (enforceWindow: boolean) => {
    const book = pool[Math.floor(Math.random() * pool.length)];
    const chapters = data[book];
    const ck = Object.keys(chapters);
    const chap = ck[Math.floor(Math.random() * ck.length)];
    const vk = Object.keys(chapters[chap]);
    const v = vk[Math.floor(Math.random() * vk.length)];
    const ref = `${book} ${chap}:${v}`;
    if (seen.has(ref)) return;
    const text = chapters[chap][v].replace(/\s+/g, ' ').trim();
    if (!text) return;
    const words = countWords(text);
    if (enforceWindow && (words < 6 || words > 28)) return;
    if (words < 4) return;
    seen.add(ref);
    out.push({ ref, text });
  };

  let attempts = 0;
  while (out.length < count && attempts < count * 100) {
    attempts += 1;
    pick(true);
  }
  attempts = 0;
  while (out.length < count && attempts < count * 100) {
    attempts += 1;
    pick(false);
  }
  return out;
};

// One verse -> a single-blank multiple-choice question. Picks a meaningful interior word, blanks
// it, and fills the option list with other words from the same verse (plus common fallbacks so
// short verses still get four choices).
const buildBlank = (verse: VerseRecord): RoomQuestion | null => {
  const words = verse.text.split(' ');
  const candidates = words
    .map((w, i) => ({ i, clean: cleanWord(w) }))
    .filter(({ i, clean }) => i > 0 && i < words.length - 1 && clean.length >= 4);
  if (!candidates.length) return null;

  const target = candidates[Math.floor(Math.random() * candidates.length)];
  const answer = target.clean;
  const prompt = words.map((w, i) => (i === target.i ? '_____' : w)).join(' ');

  const distractors: string[] = [];
  for (const w of shuffleArray(words.map(cleanWord))) {
    if (distractors.length >= 3) break;
    if (w.length < 4) continue;
    if (w.toLowerCase() === answer.toLowerCase()) continue;
    if (distractors.some((d) => d.toLowerCase() === w.toLowerCase())) continue;
    distractors.push(w);
  }
  let fi = 0;
  while (distractors.length < 3 && fi < FALLBACK_WORDS.length * 2) {
    const f = FALLBACK_WORDS[fi % FALLBACK_WORDS.length];
    fi += 1;
    if (f.toLowerCase() === answer.toLowerCase()) continue;
    if (distractors.some((d) => d.toLowerCase() === f.toLowerCase())) continue;
    distractors.push(f);
  }

  return { kind: 'choice', prompt, verse: verse.ref, options: shuffleArray([answer, ...distractors]), blank: answer };
};

// One verse -> "which reference is this?" The reference is hidden (verse: '') so it isn't a giveaway.
const buildReference = (verse: VerseRecord, pool: VerseRecord[]): RoomQuestion => {
  const distractors = shuffleArray(pool.filter((v) => v.ref !== verse.ref).map((v) => v.ref)).slice(0, 3);
  while (distractors.length < 3) distractors.push(`John ${distractors.length + 1}:1`);
  const preview = verse.text.length <= 140 ? verse.text : `${verse.text.slice(0, 137).trimEnd()}...`;
  return { kind: 'choice', prompt: `"${preview}"`, verse: '', options: shuffleArray([verse.ref, ...distractors]), blank: verse.ref };
};

/**
 * Build a shared round of `count` questions from a Bible library. The host runs this once and
 * writes the result into the session, so every player renders the identical set in identical order.
 */
export const buildLibraryPool = (data: BibleData, books: string[], mode: LibraryMode, count: number): RoomQuestion[] => {
  const n = Math.max(1, Math.min(count, 50));
  // Reference rounds need a few extra verses in the pool to draw plausible wrong references from.
  const verses = sampleVerses(data, books, mode === 'reference' ? Math.max(n, 4) : n);
  if (!verses.length) return [];
  if (mode === 'reference') {
    return shuffleArray(verses).slice(0, n).map((v) => buildReference(v, verses));
  }
  return verses.map(buildBlank).filter((q): q is RoomQuestion => q !== null).slice(0, n);
};
