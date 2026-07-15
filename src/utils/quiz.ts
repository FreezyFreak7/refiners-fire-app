import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { APP_ID } from './appConfig';
import { serializeQuestions, type Quiz, type QuizQuestion } from './quizModel';

// Re-exported so callers have a single import site for quizzes, model and persistence alike.
export * from './quizModel';

/**
 * Questions are stored as plain JSON on the quiz doc — self-contained, with no references back
 * to the Bible file or to other documents. That means a whole quiz can later be copied straight
 * into a live-session doc so every player in the room reads the same questions.
 */
const quizzesCollection = (uid: string) =>
  collection(db, 'artifacts', APP_ID, 'users', uid, 'quizzes');

const toMillis = (value: unknown): number | null =>
  value instanceof Timestamp ? value.toMillis() : null;

export function subscribeQuizzes(
  uid: string,
  onChange: (quizzes: Quiz[]) => void,
  onError: (error: Error) => void,
) {
  const q = query(quizzesCollection(uid), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      onChange(
        snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name ?? 'Untitled quiz',
            questions: Array.isArray(data.questions) ? (data.questions as QuizQuestion[]) : [],
            createdAt: toMillis(data.createdAt),
            updatedAt: toMillis(data.updatedAt),
          };
        }),
      );
    },
    (err) => onError(err as Error),
  );
}

export async function createQuiz(uid: string, name: string): Promise<string> {
  const ref = doc(quizzesCollection(uid));
  await setDoc(ref, {
    name: name.trim() || 'Untitled quiz',
    questions: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function renameQuiz(uid: string, quizId: string, name: string): Promise<void> {
  await updateDoc(doc(quizzesCollection(uid), quizId), {
    name: name.trim() || 'Untitled quiz',
    updatedAt: serverTimestamp(),
  });
}

export async function deleteQuiz(uid: string, quizId: string): Promise<void> {
  await deleteDoc(doc(quizzesCollection(uid), quizId));
}

/**
 * Writes the full question list in one update. Callers pass the whole array so ordering and
 * edits commit atomically, rather than racing the snapshot listener with partial writes.
 */
export async function setQuizQuestions(
  uid: string,
  quizId: string,
  questions: QuizQuestion[],
): Promise<void> {
  await updateDoc(doc(quizzesCollection(uid), quizId), {
    questions: serializeQuestions(questions),
    updatedAt: serverTimestamp(),
  });
}
