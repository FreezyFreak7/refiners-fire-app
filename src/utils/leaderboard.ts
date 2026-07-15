import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { APP_ID } from './appConfig';

export interface LeaderboardEntry {
  uid: string;
  username: string;
  avatarId: string | null;
  score: number;
}

/**
 * A generic scored leaderboard, keyed by a `boardId` so every challenge mode shares one code path
 * and one security rule. Examples of boardIds:
 *   - `daily-2026-07-15`  (the daily challenge, one board per UTC day)
 *   - `furnace`           (survival, a single all-time board)
 *
 * Boards are public (a world leaderboard is the point), so they live under `.../public/data`.
 * Rules restrict writes to the owner's own doc and only allow the score to increase (keep-best),
 * with a per-board score cap.
 */
export const dailyBoardId = (dayKey: string) => `daily-${dayKey}`;

const scoresCollection = (boardId: string) =>
  collection(db, 'artifacts', APP_ID, 'public', 'data', 'boards', boardId, 'scores');

/**
 * Writes a score to a board, keeping the player's best. The read-then-write is a UX guard; the
 * rules enforce keep-best authoritatively, so a forged lower or over-cap write is rejected anyway.
 */
export async function submitScore(
  boardId: string,
  entry: LeaderboardEntry,
): Promise<{ improved: boolean; best: number }> {
  const ref = doc(scoresCollection(boardId), entry.uid);
  const existing = await getDoc(ref);
  const previous = existing.exists() ? (existing.data().score as number) : -1;

  if (entry.score <= previous) {
    return { improved: false, best: previous };
  }

  await setDoc(ref, {
    uid: entry.uid,
    username: entry.username,
    avatarId: entry.avatarId,
    score: entry.score,
    at: serverTimestamp(),
  });
  return { improved: true, best: entry.score };
}

export async function fetchTopScores(boardId: string, top = 20): Promise<LeaderboardEntry[]> {
  const snap = await getDocs(query(scoresCollection(boardId), orderBy('score', 'desc'), limit(top)));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      uid: data.uid,
      username: data.username ?? 'Player',
      avatarId: data.avatarId ?? null,
      score: data.score ?? 0,
    };
  });
}

/**
 * Global rank for a score = (number of strictly higher scores) + 1, via a server-side count
 * aggregation so it works no matter how large the board is.
 */
export async function fetchRank(boardId: string, score: number): Promise<number> {
  const higher = await getCountFromServer(query(scoresCollection(boardId), where('score', '>', score)));
  return higher.data().count + 1;
}
