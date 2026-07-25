/**
 * Quiz shapes and rules, with no Firestore dependency — so the validation that decides whether a
 * quiz is playable can be reasoned about (and tested) without touching a database.
 * Persistence lives in ./quiz.ts.
 */

import { formatRef, type Verse } from './bible';
import { cleanWordAt, shuffle } from './questionGen';

export type QuizQuestionKind = 'mc' | 'tf' | 'blanks' | 'builder' | 'type';

interface QuizQuestionBase {
  id: string;
  prompt: string;
  /** Optional scripture reference, e.g. "John 3:16". Shown with the answer. */
  reference?: string;
  explanation?: string;
}

export interface MultipleChoiceQuestion extends QuizQuestionBase {
  kind: 'mc';
  options: string[];
  correctIndex: number;
}

export interface TrueFalseQuestion extends QuizQuestionBase {
  kind: 'tf';
  isTrue: boolean;
}

/**
 * Generated from a verse: the verse with one or more chosen words blanked, plus a word bank.
 * `verseText` + `blankIndexes` are kept so the author can add/remove blanks later.
 */
export interface FillBlanksQuestion extends QuizQuestionBase {
  kind: 'blanks';
  verseText: string;
  /** Word indexes that are blanked, ascending. */
  blankIndexes: number[];
  /** The blanked words, in blank order. */
  answers: string[];
  /** The word bank: answers plus distractors, shuffled. */
  options: string[];
}

/** Like fill-blanks, but the player types the missing words instead of choosing from a bank. */
export interface TypedBlankQuestion extends QuizQuestionBase {
  kind: 'type';
  verseText: string;
  blankIndexes: number[];
  answers: string[];
}

/** Generated from a verse: ordered chunks the player reassembles. */
export interface VerseBuilderQuestion extends QuizQuestionBase {
  kind: 'builder';
  /** The chunks in their correct order. */
  chunks: string[];
}

export type QuizQuestion =
  | MultipleChoiceQuestion
  | TrueFalseQuestion
  | FillBlanksQuestion
  | TypedBlankQuestion
  | VerseBuilderQuestion;

export interface Quiz {
  id: string;
  name: string;
  questions: QuizQuestion[];
  createdAt: number | null;
  updatedAt: number | null;
}

export const QUESTION_KIND_LABELS: Record<QuizQuestionKind, string> = {
  mc: 'Multiple choice',
  tf: 'True / false',
  blanks: 'Fill blanks',
  type: 'Type the word',
  builder: 'Verse builder',
};

export const newQuestionId = () =>
  `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

/** The manually-authored kinds start empty; blanks/builder are generated from a verse instead. */
export function emptyQuestion(kind: 'mc' | 'tf'): QuizQuestion {
  if (kind === 'tf') {
    return { id: newQuestionId(), kind: 'tf', prompt: '', isTrue: true };
  }
  return { id: newQuestionId(), kind: 'mc', prompt: '', options: ['', ''], correctIndex: 0 };
}

export const verseWords = (text: string) => text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
const wordsOf = (verse: Verse) => verseWords(verse.text);
const CHUNK_SIZE = 3;

/** True if a word can be blanked (has letters). Used to grey out punctuation-only tokens. */
export const isBlankableWord = (word: string) => /[A-Za-z]/.test(word);

/** Case- and punctuation-insensitive comparison for typed answers. */
export function matchesTypedAnswer(input: string, answer: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, '');
  return norm(input) === norm(answer) && norm(input).length > 0;
}

const PAD_WORDS = ['faith', 'grace', 'mercy', 'glory', 'kingdom', 'spirit', 'covenant', 'righteous', 'truth', 'light', 'word', 'world'];

/** How much of a verse to blank when auto-filling. */
export type BlankDifficulty = 'easy' | 'medium' | 'hard';
const DIFFICULTY_FRACTION: Record<BlankDifficulty, number> = { easy: 0.2, medium: 0.4, hard: 0.65 };

/** Auto-picks blanks by difficulty: a fraction of the decent-length, non-leading words. */
function autoBlankIndexes(words: string[], difficulty: BlankDifficulty = 'medium'): number[] {
  const blankable = words
    .map((_, i) => ({ i, c: cleanWordAt(words, i) }))
    .filter((x) => x.i > 0 && x.c.length >= 4);
  if (!blankable.length) return [];
  const count = Math.min(
    blankable.length,
    Math.max(1, Math.round(blankable.length * DIFFICULTY_FRACTION[difficulty])),
  );
  return shuffle(blankable, Math.random).slice(0, count).map((x) => x.i).sort((a, b) => a - b);
}

const promptWithBlanks = (words: string[], indexes: number[]) => {
  const set = new Set(indexes);
  return words.map((w, i) => (set.has(i) ? '_____' : w)).join(' ');
};

const answersAt = (words: string[], indexes: number[]) =>
  [...indexes].sort((a, b) => a - b).map((i) => cleanWordAt(words, i));

/** Word bank: the answers plus a few distractors drawn from the verse and a fallback pool. */
function wordBank(words: string[], answers: string[]): string[] {
  const answerSet = new Set(answers.map((a) => a.toLowerCase()));
  const need = Math.max(4, answers.length + 3);
  const distractors: string[] = [];

  const add = (w: string) => {
    const lw = w.toLowerCase();
    if (w.length >= 3 && !answerSet.has(lw) && !distractors.some((d) => d.toLowerCase() === lw)) {
      distractors.push(w);
    }
  };
  for (const w of shuffle(words.map((_, i) => cleanWordAt(words, i)), Math.random)) {
    if (answers.length + distractors.length >= need) break;
    add(w);
  }
  for (const p of shuffle([...PAD_WORDS], Math.random)) {
    if (answers.length + distractors.length >= need) break;
    add(p);
  }
  return shuffle([...answers, ...distractors], Math.random);
}

/** Builds a fill-blanks question. `indexes` chooses the words; omit to auto-pick at `difficulty`. */
export function blanksFromVerse(verse: Verse, indexes?: number[], difficulty?: BlankDifficulty): FillBlanksQuestion | null {
  const words = wordsOf(verse);
  const idx = indexes?.length ? [...indexes].sort((a, b) => a - b) : autoBlankIndexes(words, difficulty);
  const answers = answersAt(words, idx);
  if (!answers.length || answers.some((a) => !a)) return null;
  return {
    id: newQuestionId(),
    kind: 'blanks',
    prompt: promptWithBlanks(words, idx),
    reference: formatRef(verse),
    verseText: verse.text.replace(/\s+/g, ' ').trim(),
    blankIndexes: idx,
    answers,
    options: wordBank(words, answers),
  };
}

/** Builds a type-the-words question. `indexes` chooses the blanks; omit to auto-pick at `difficulty`. */
export function typedFromVerse(verse: Verse, indexes?: number[], difficulty?: BlankDifficulty): TypedBlankQuestion | null {
  const words = wordsOf(verse);
  const idx = indexes?.length ? [...indexes].sort((a, b) => a - b) : autoBlankIndexes(words, difficulty);
  const answers = answersAt(words, idx);
  if (!answers.length || answers.some((a) => !a)) return null;
  return {
    id: newQuestionId(),
    kind: 'type',
    prompt: promptWithBlanks(words, idx),
    reference: formatRef(verse),
    verseText: verse.text.replace(/\s+/g, ' ').trim(),
    blankIndexes: idx,
    answers,
  };
}

/** Re-blanks a fill-blanks question automatically at the given difficulty. Keeps id/explanation. */
export function autoFillBlanks(q: FillBlanksQuestion, difficulty: BlankDifficulty): FillBlanksQuestion {
  const words = verseWords(q.verseText);
  const idx = autoBlankIndexes(words, difficulty);
  if (!idx.length) return q;
  const answers = answersAt(words, idx);
  return { ...q, blankIndexes: idx, answers, options: wordBank(words, answers), prompt: promptWithBlanks(words, idx) };
}

/** Re-blanks a type-the-words question automatically at the given difficulty. Keeps id/explanation. */
export function autoFillTyped(q: TypedBlankQuestion, difficulty: BlankDifficulty): TypedBlankQuestion {
  const words = verseWords(q.verseText);
  const idx = autoBlankIndexes(words, difficulty);
  if (!idx.length) return q;
  return { ...q, blankIndexes: idx, answers: answersAt(words, idx), prompt: promptWithBlanks(words, idx) };
}

/** Toggles a word in/out of the blanks for a fill-blanks question. Never removes the last blank. */
export function toggleBlanksWord(q: FillBlanksQuestion, wordIndex: number): FillBlanksQuestion {
  const words = verseWords(q.verseText);
  const has = q.blankIndexes.includes(wordIndex);
  const next = (has ? q.blankIndexes.filter((i) => i !== wordIndex) : [...q.blankIndexes, wordIndex]).sort((a, b) => a - b);
  if (!next.length) return q;
  const answers = answersAt(words, next);
  return { ...q, blankIndexes: next, answers, options: wordBank(words, answers), prompt: promptWithBlanks(words, next) };
}

/** Toggles a word in/out of the blanks for a type-the-words question. Never removes the last blank. */
export function toggleTypedWord(q: TypedBlankQuestion, wordIndex: number): TypedBlankQuestion {
  const words = verseWords(q.verseText);
  const has = q.blankIndexes.includes(wordIndex);
  const next = (has ? q.blankIndexes.filter((i) => i !== wordIndex) : [...q.blankIndexes, wordIndex]).sort((a, b) => a - b);
  if (!next.length) return q;
  return { ...q, blankIndexes: next, answers: answersAt(words, next), prompt: promptWithBlanks(words, next) };
}

/** Splits a verse into ordered chunks for a builder question, or null if it's too short. */
export function builderFromVerse(verse: Verse): VerseBuilderQuestion | null {
  const words = wordsOf(verse);
  if (words.length < 4) return null;
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += CHUNK_SIZE) {
    chunks.push(words.slice(i, i + CHUNK_SIZE).join(' '));
  }
  if (chunks.length < 2) return null;
  return { id: newQuestionId(), kind: 'builder', prompt: '', reference: formatRef(verse), chunks };
}

/** Returns a human-readable problem, or null when the question is playable. */
export function validateQuestion(question: QuizQuestion): string | null {
  switch (question.kind) {
    case 'mc': {
      if (!question.prompt.trim()) return 'The question is empty.';
      const filled = question.options.filter((o) => o.trim());
      if (filled.length < 2) return 'Needs at least two answer options.';
      if (!question.options[question.correctIndex]?.trim()) return 'No correct answer is selected.';
      return null;
    }
    case 'tf':
      return question.prompt.trim() ? null : 'The question is empty.';
    case 'blanks':
      // Auto-generated, so these only fail if data was corrupted.
      return question.answers?.length >= 1 && question.options?.length >= 2
        ? null
        : 'This fill-blanks question is incomplete.';
    case 'type':
      return question.answers?.length >= 1 && question.answers.every((a) => a.trim())
        ? null
        : 'This type-the-word question is incomplete.';
    case 'builder':
      return question.chunks?.length >= 2 ? null : 'This verse builder question is incomplete.';
  }
}

/** A quiz is playable only if it has questions and every one of them is valid. */
export function validateQuiz(quiz: Quiz): string | null {
  if (!quiz.questions.length) return 'This quiz has no questions yet.';

  for (let i = 0; i < quiz.questions.length; i += 1) {
    const problem = validateQuestion(quiz.questions[i]);
    if (problem) return `Question ${i + 1}: ${problem}`;
  }

  return null;
}

/**
 * Firestore rejects `undefined` outright, and the optional reference/explanation fields are
 * routinely left blank in the editor — so drop empty ones rather than writing them.
 */
export function serializeQuestions(questions: QuizQuestion[]): QuizQuestion[] {
  return questions.map((q) => {
    const base = {
      id: q.id,
      prompt: q.prompt.trim(),
      ...(q.reference?.trim() ? { reference: q.reference.trim() } : {}),
      ...(q.explanation?.trim() ? { explanation: q.explanation.trim() } : {}),
    };

    switch (q.kind) {
      case 'mc':
        return { ...base, kind: 'mc' as const, options: q.options.map((o) => o.trim()), correctIndex: q.correctIndex };
      case 'tf':
        return { ...base, kind: 'tf' as const, isTrue: q.isTrue };
      case 'blanks':
        return { ...base, kind: 'blanks' as const, verseText: q.verseText, blankIndexes: q.blankIndexes, answers: q.answers, options: q.options };
      case 'type':
        return { ...base, kind: 'type' as const, verseText: q.verseText, blankIndexes: q.blankIndexes, answers: q.answers };
      case 'builder':
        return { ...base, kind: 'builder' as const, chunks: q.chunks };
    }
  });
}
