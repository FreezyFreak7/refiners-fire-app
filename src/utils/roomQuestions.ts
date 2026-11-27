import type { BibleData } from './bible';
import { shuffleArray } from './helpers';
import type { ClassQuiz } from '../data/classQuizzes';
import { EXAM_ITEMS } from '../data/examQuizzes';
import { buildWordPool, cleanWord, pickBlankIndexes, pickDistractors } from './blanks';

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
export interface ChoiceRoomQuestion {
  kind: 'choice';
  prompt: string;
  verse: string;
  options: string[];
  blank: string;
  explanation?: string;
}

/**
 * Verse builder: tap the chunks into the right order. `chunks` is pre-shuffled (same order on every
 * client) and `blank` is the correct order joined with spaces, so scoring is the same string
 * compare as a choice question.
 */
export interface BuilderRoomQuestion {
  kind: 'builder';
  prompt: string;
  verse: string;
  chunks: string[];
  blank: string;
  explanation?: string;
}

/**
 * Several blanks in one verse, filled in order from a shared word bank (`options`, pre-shuffled,
 * answers plus decoys). `answers` is the correct word for each blank, and `blank` is them joined
 * with ' | ', so scoring stays the same string compare.
 */
export interface MultiBlankRoomQuestion {
  kind: 'multi';
  prompt: string;
  verse: string;
  options: string[];
  answers: string[];
  blank: string;
  explanation?: string;
}

/**
 * Write the full answer: players type it. `blank` is the exact answer; a typed answer counts when it
 * matches ignoring capitals, punctuation and spacing (see answersMatch).
 */
export interface TypedRoomQuestion {
  kind: 'typed';
  prompt: string;
  verse: string;
  blank: string;
  explanation?: string;
}

export type RoomQuestion = ChoiceRoomQuestion | BuilderRoomQuestion | MultiBlankRoomQuestion | TypedRoomQuestion;

/** Compares a typed answer to the real one, ignoring capitals, punctuation, arrows and spacing. */
const compactAnswer = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
export const answersMatch = (typed: string, answer: string) => compactAnswer(typed) !== '' && compactAnswer(typed) === compactAnswer(answer);

export const MULTI_BLANK_SEPARATOR = ' | ';

/** Builders take longer to answer than a tap, so they get this multiple of the room's timer. */
export const BUILDER_TIME_SCALE = 1.5;

/** Builders get BUILDER_TIME_SCALE; multi-blank verses get +40% of the timer per extra blank. */
export const roomQuestionMs = (q: RoomQuestion | undefined, baseMs: number) => {
  if (q?.kind === 'builder') return Math.round(baseMs * BUILDER_TIME_SCALE);
  if (q?.kind === 'multi') return Math.round(baseMs * (1 + 0.4 * Math.max(0, q.answers.length - 1)));
  // Typing takes as long as the answer is: a base allowance plus about 0.35s per character.
  if (q?.kind === 'typed') return Math.round(baseMs * 1.5 + q.blank.length * 350);
  return baseMs;
};

export type LibraryMode = 'blanks' | 'reference';

/** The libraries a live room can draw from, mapped to the books each covers. */
export type RoomSource =
  | 'revelation'
  | 'old_testament'
  | 'new_testament'
  | 'gospels'
  | 'alpha_omega'
  | 'class'
  | 'exam'
  | 'quiz';

export const ROOM_SOURCE_LABELS: Record<RoomSource, string> = {
  revelation: 'Revelation',
  old_testament: 'Old Testament',
  new_testament: 'New Testament',
  gospels: 'The Gospels',
  alpha_omega: 'Alpha & Omega',
  class: 'Class Quizzes',
  exam: 'Graduation Exam',
  quiz: 'My Quiz',
};


type VerseRecord = { ref: string; text: string };

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

// One verse -> a single-blank multiple-choice question. Uses the shared blank rules (no filler
// words, nothing visible elsewhere in the verse) and wrong options drawn from the other verses in
// the round, so the answer can't be read off the screen.
const buildBlank = (verse: VerseRecord, wordPool: string[]): RoomQuestion | null => {
  const words = verse.text.split(' ');
  const [index] = pickBlankIndexes(words, 1);
  if (index === undefined) return null;
  const word = words[index];
  const answer = cleanWord(word);
  if (!answer) return null;
  const at = word.indexOf(answer);
  const prompt = words.map((w, i) => (i === index ? `${w.slice(0, at)}_____${w.slice(at + answer.length)}` : w)).join(' ');
  const distractors = pickDistractors(answer, verse.text, wordPool, 3);
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
  const wordPool = buildWordPool(verses.map((v) => v.text));
  return verses.map((v) => buildBlank(v, wordPool)).filter((q): q is RoomQuestion => q !== null).slice(0, n);
};

// Shuffle until the order differs from the answer (when it can), so a builder is never pre-solved.
const scrambleChunks = (chunks: string[]): string[] => {
  const answer = chunks.join(' ');
  let out = shuffleArray(chunks);
  for (let i = 0; i < 10 && out.join(' ') === answer && new Set(chunks).size > 1; i += 1) out = shuffleArray(chunks);
  return out;
};

/** A class quiz -> room questions, in the written order, with options and chunks shuffled once by the host. */
export const buildClassQuizPool = (quiz: ClassQuiz): RoomQuestion[] =>
  quiz.questions.map((q): RoomQuestion =>
 q.kind === 'blank'
      ? q.answers.length === 1
        ? { kind: 'choice', prompt: q.prompt, verse: q.verse, options: shuffleArray([q.answers[0], ...q.decoys]), blank: q.answers[0] }
        : { kind: 'multi', prompt: q.prompt, verse: q.verse, options: shuffleArray([...q.answers, ...q.decoys]), answers: q.answers, blank: q.answers.join(MULTI_BLANK_SEPARATOR) }
      : { kind: 'builder', prompt: q.prompt ?? 'Put the verse in order.', verse: q.verse, chunks: scrambleChunks(q.chunks), blank: q.chunks.join(' ') });

export type ExamMode = 'builder' | 'blanks' | 'write' | 'mix';
export const EXAM_MODE_LABELS: Record<ExamMode, string> = { builder: 'Builder', blanks: 'Fill in the Blanks', write: 'Write the Answer', mix: 'Mix' };
/** Which questions of the exam a room plays. */
export const EXAM_RANGES: { id: string; label: string; from: number; to: number }[] = [
  { id: 'all', label: 'All 40 questions', from: 1, to: 40 },
  { id: '1-10', label: 'Questions 1–10', from: 1, to: 10 },
  { id: '11-20', label: 'Questions 11–20', from: 11, to: 20 },
  { id: '21-30', label: 'Questions 21–30', from: 21, to: 30 },
  { id: '31-40', label: 'Questions 31–40', from: 31, to: 40 },
];

export const examItemsInRange = (rangeId: string) => {
  const r = EXAM_RANGES.find((x) => x.id === rangeId) || EXAM_RANGES[0];
  return EXAM_ITEMS.filter((it) => it.n >= r.from && it.n <= r.to);
};

/** The Graduation Exam as room questions, in exam order. In Mix each answer is asked one random way. */
export const buildExamPool = (mode: ExamMode, rangeId: string): RoomQuestion[] => {
  const out: RoomQuestion[] = [];
  for (const it of examItemsInRange(rangeId)) {
    const verse = `Exam Q${it.n}${it.label}`;
    const ways: Exclude<ExamMode, 'mix'>[] = mode === 'mix' ? (it.chunks.length ? ['blanks', 'write', 'builder'] : ['blanks', 'write']) : [mode];
    const way = ways[Math.floor(Math.random() * ways.length)];
    if (way === 'blanks') {
      out.push(it.blanks.length === 1
        ? { kind: 'choice', prompt: it.blankPrompt, verse, options: shuffleArray([it.blanks[0], ...it.decoys]), blank: it.blanks[0] }
        : { kind: 'multi', prompt: it.blankPrompt, verse, options: shuffleArray([...it.blanks, ...it.decoys]), answers: it.blanks, blank: it.blanks.join(MULTI_BLANK_SEPARATOR) });
    } else if (way === 'write') {
      out.push({ kind: 'typed', prompt: it.ask, verse, blank: it.answer });
    } else if (it.chunks.length) {
      // Builder is skipped for answers too short to build; long ones are asked in several parts.
      it.chunks.forEach((group, g) => {
        const suffix = it.chunks.length > 1 ? ` (part ${g + 1} of ${it.chunks.length})` : '';
        out.push({ kind: 'builder', prompt: `Put the answer in order: ${it.ask}${suffix}`, verse: verse + suffix, chunks: scrambleChunks(group), blank: group.join(' ') });
      });
    }
  }
  return out;
};

const wordKey = (w: string) => w.toLowerCase().replace(/[^a-z0-9]+/g, '');

/**
 * Word-by-word comparison of a typed answer with the real one, to show where the player went wrong.
 * `typed[i].ok` is false for a word that isn't in the answer (or is out of place); `answer[i].ok` is
 * false for an answer word the player missed. Punctuation-only tokens (arrows) are never marked.
 */
export const diffWords = (typed: string, answer: string) => {
  const a = typed.split(/\s+/).filter(Boolean);
  const b = answer.split(/\s+/).filter(Boolean);
  const ka = a.map(wordKey), kb = b.map(wordKey);
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) {
    lcs[i][j] = ka[i] && ka[i] === kb[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  }
  const okA = ka.map((k) => !k), okB = kb.map((k) => !k);
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (ka[i] && ka[i] === kb[j]) { okA[i] = true; okB[j] = true; i++; j++; }
    else if (lcs[i + 1][j] >= lcs[i][j + 1]) i++;
    else j++;
  }
  return { typed: a.map((w, n) => ({ w, ok: okA[n] })), answer: b.map((w, n) => ({ w, ok: okB[n] })) };
};

/** Recovers the correct order of a builder's pieces from its joined answer (the pieces arrive scrambled). */
export const orderChunks = (chunks: string[], answer: string): string[] | null => {
  const used = new Array(chunks.length).fill(false);
  const out: string[] = [];
  const go = (rest: string): boolean => {
    if (out.length === chunks.length) return rest === '';
    for (let i = 0; i < chunks.length; i++) {
      if (used[i] || !rest.startsWith(chunks[i])) continue;
      const after = rest.slice(chunks[i].length);
      if (after !== '' && !after.startsWith(' ')) continue;
      used[i] = true; out.push(chunks[i]);
      if (go(after.replace(/^ /, ''))) return true;
      used[i] = false; out.pop();
    }
    return false;
  };
  return go(answer) ? out : null;
};
