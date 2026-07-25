/**
 * Quiz shapes and rules, with no Firestore dependency — so the validation that decides whether a
 * quiz is playable can be reasoned about (and tested) without touching a database.
 * Persistence lives in ./quiz.ts.
 */

import { formatRef, type Verse } from './bible';
import { buildQuestion, type Candidate } from './questionGen';

export type QuizQuestionKind = 'mc' | 'tf' | 'blanks' | 'builder';

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

/** Auto-generated from a verse: the verse with one word blanked, and options to choose from. */
export interface FillBlanksQuestion extends QuizQuestionBase {
  kind: 'blanks';
  options: string[];
  correctIndex: number;
}

/** Auto-generated from a verse: ordered chunks the player reassembles. */
export interface VerseBuilderQuestion extends QuizQuestionBase {
  kind: 'builder';
  /** The chunks in their correct order. */
  chunks: string[];
}

export type QuizQuestion =
  | MultipleChoiceQuestion
  | TrueFalseQuestion
  | FillBlanksQuestion
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

const wordsOf = (verse: Verse) => verse.text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
const CHUNK_SIZE = 3;

/** Builds a fill-blanks question from a verse, or null if the verse is too short to blank fairly. */
export function blanksFromVerse(verse: Verse): FillBlanksQuestion | null {
  const candidate: Candidate = { reference: formatRef(verse), words: wordsOf(verse) };
  const q = buildQuestion(candidate, Math.random);
  if (!q || q.correctIndex < 0) return null;
  return {
    id: newQuestionId(),
    kind: 'blanks',
    prompt: q.prompt,
    reference: q.reference,
    options: q.options,
    correctIndex: q.correctIndex,
  };
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
        return { ...base, kind: 'blanks' as const, options: q.options, correctIndex: q.correctIndex };
      case 'builder':
        return { ...base, kind: 'builder' as const, chunks: q.chunks };
    }
  });
}
