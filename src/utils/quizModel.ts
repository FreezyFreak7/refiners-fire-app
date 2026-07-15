/**
 * Quiz shapes and rules, with no Firestore dependency — so the validation that decides whether a
 * quiz is playable can be reasoned about (and tested) without touching a database.
 * Persistence lives in ./quiz.ts.
 */

export type QuizQuestionKind = 'mc' | 'tf';

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

export type QuizQuestion = MultipleChoiceQuestion | TrueFalseQuestion;

export interface Quiz {
  id: string;
  name: string;
  questions: QuizQuestion[];
  createdAt: number | null;
  updatedAt: number | null;
}

export const newQuestionId = () =>
  `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export function emptyQuestion(kind: QuizQuestionKind): QuizQuestion {
  if (kind === 'tf') {
    return { id: newQuestionId(), kind: 'tf', prompt: '', isTrue: true };
  }
  return { id: newQuestionId(), kind: 'mc', prompt: '', options: ['', ''], correctIndex: 0 };
}

/** Returns a human-readable problem, or null when the question is playable. */
export function validateQuestion(question: QuizQuestion): string | null {
  if (!question.prompt.trim()) return 'The question is empty.';

  if (question.kind === 'mc') {
    const filled = question.options.filter((o) => o.trim());
    if (filled.length < 2) return 'Needs at least two answer options.';
    if (!question.options[question.correctIndex]?.trim()) return 'No correct answer is selected.';
  }

  return null;
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

    return q.kind === 'mc'
      ? { ...base, kind: 'mc' as const, options: q.options.map((o) => o.trim()), correctIndex: q.correctIndex }
      : { ...base, kind: 'tf' as const, isTrue: q.isTrue };
  });
}
