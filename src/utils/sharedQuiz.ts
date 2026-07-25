import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { APP_ID } from './appConfig';
import { serializeQuestions, type Quiz, type QuizQuestion } from './quizModel';

/**
 * Shared quizzes are published copies that anyone with the link can play — including guests, since
 * everyone is signed in (anonymously) on load. They live under the public data tree, keyed by the
 * original quiz's id, so re-sharing overwrites the same link. Sharing is a SNAPSHOT: the author's
 * later edits stay private until they publish again.
 */
export interface SharedQuiz {
  id: string;
  name: string;
  questions: QuizQuestion[];
  ownerName: string;
}

const sharedQuizDoc = (shareId: string) =>
  doc(db, 'artifacts', APP_ID, 'public', 'data', 'quizzes', shareId);

/** Public link for a shared quiz. Uses the current origin so it works in dev and production. */
export function shareUrl(shareId: string): string {
  return `${window.location.origin}/?quiz=${encodeURIComponent(shareId)}`;
}

/** Publishes (or re-publishes) a snapshot of the quiz to its public share doc. */
export async function publishSharedQuiz(
  quiz: Quiz,
  ownerUid: string,
  ownerName: string,
): Promise<string> {
  await setDoc(sharedQuizDoc(quiz.id), {
    name: quiz.name,
    questions: serializeQuestions(quiz.questions),
    ownerUid,
    ownerName: ownerName || 'A player',
    sharedAt: serverTimestamp(),
  });
  return quiz.id;
}

/** Loads a shared quiz by id, or null if the link is dead. */
export async function fetchSharedQuiz(shareId: string): Promise<SharedQuiz | null> {
  const snap = await getDoc(sharedQuizDoc(shareId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: shareId,
    name: data.name ?? 'Shared quiz',
    questions: Array.isArray(data.questions) ? (data.questions as QuizQuestion[]) : [],
    ownerName: data.ownerName ?? 'A player',
  };
}
