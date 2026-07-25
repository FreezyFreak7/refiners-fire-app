/**
 * Quiz shapes and rules, with no Firestore dependency — so the validation that decides whether a
 * quiz is playable can be reasoned about (and tested) without touching a database.
 * Persistence lives in ./quiz.ts.
 */

import { formatRef, type Verse } from './bible';
import { buildQuestion, cleanWordAt, promptWithBlank, type Candidate } from './questionGen';

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
 * Generated from a verse: the verse with one chosen word blanked, plus options. `verseText` and
 * `blankIndex` are kept so the author can re-choose which word is blanked later.
 */
export interface FillBlanksQuestion extends QuizQuestionBase {
  kind: 'blanks';
  verseText: string;
  blankIndex: number;
  options: string[];
  correctIndex: number;
}

/** Like fill-blanks, but the player types the missing word instead of choosing from options. */
export interface TypedBlankQuestion extends QuizQuestionBase {
  kind: 'type';
  verseText: string;
  blankIndex: number;
  answer: string;
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

/**
 * Builds a fill-blanks question from a verse. `wordIndex` chooses which word to blank; omit it to
 * auto-pick a good one. Returns null if the chosen word can't be blanked.
 */
export function blanksFromVerse(verse: Verse, wordIndex?: number): FillBlanksQuestion | null {
  const words = wordsOf(verse);
  const candidate: Candidate = { reference: formatRef(verse), words };
  const q = buildQuestion(candidate, Math.random, wordIndex);
  if (!q || q.correctIndex < 0) return null;
  return {
    id: newQuestionId(),
    kind: 'blanks',
    prompt: q.prompt,
    reference: q.reference,
    verseText: verse.text.replace(/\s+/g, ' ').trim(),
    blankIndex: q.blankIndex,
    options: q.options,
    correctIndex: q.correctIndex,
  };
}

/** Builds a type-the-word question. `wordIndex` chooses the blank; omit to auto-pick. */
export function typedFromVerse(verse: Verse, wordIndex?: number): TypedBlankQuestion | null {
  const words = wordsOf(verse);
  // Reuse the picker to choose a sensible default word when none is given.
  const index = wordIndex ?? buildQuestion({ reference: '', words }, Math.random)?.blankIndex;
  if (index === undefined) return null;
  const answer = cleanWordAt(words, index);
  if (!answer) return null;
  return {
    id: newQuestionId(),
    kind: 'type',
    prompt: promptWithBlank(words, index),
    reference: formatRef(verse),
    verseText: verse.text.replace(/\s+/g, ' ').trim(),
    blankIndex: index,
    answer,
  };
}

/** Re-blanks a fill-blanks question at a different word, rebuilding its options. Keeps id/explanation. */
export function reblankAt(q: FillBlanksQuestion, wordIndex: number): FillBlanksQuestion | null {
  const words = verseWords(q.verseText);
  const g = buildQuestion({ reference: q.reference ?? '', words }, Math.random, wordIndex);
  if (!g || g.correctIndex < 0) return null;
  return { ...q, prompt: g.prompt, blankIndex: wordIndex, options: g.options, correctIndex: g.correctIndex };
}

/** Re-picks the typed word. Keeps id/explanation. */
export function retypeAt(q: TypedBlankQuestion, wordIndex: number): TypedBlankQuestion | null {
  const words = verseWords(q.verseText);
  const answer = cleanWordAt(words, wordIndex);
  if (!answer) return null;
  return { ...q, prompt: promptWithBlank(words, wordIndex), blankIndex: wordIndex, answer };
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
      return question.options?.length >= 2 && question.options[question.correctIndex]
        ? null
        : 'This fill-blanks question is incomplete.';
    case 'type':
      return question.answer?.trim() ? null : 'This type-the-word question is incomplete.';
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
        return { ...base, kind: 'blanks' as const, verseText: q.verseText, blankIndex: q.blankIndex, options: q.options, correctIndex: q.correctIndex };
      case 'type':
        return { ...base, kind: 'type' as const, verseText: q.verseText, blankIndex: q.blankIndex, answer: q.answer };
      case 'builder':
        return { ...base, kind: 'builder' as const, chunks: q.chunks };
    }
  });
}
