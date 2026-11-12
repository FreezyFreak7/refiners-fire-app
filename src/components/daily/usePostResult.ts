import { useEffect, useRef, useState } from 'react';
import { fetchRank, submitScore } from '../../utils/leaderboard';
import { recordActivity } from '../../utils/userStats';
import type { UserProfile } from '../../utils/userProfile';

export type SubmitState = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Records a finished challenge run (private stats) and posts it to a world board, and keeps
 * trying as the player becomes eligible:
 *   - a guest who signs in from the results screen gets the run recorded and posted then;
 *   - a member with no username gets it posted as soon as they claim one.
 *
 * Pass `result: null` while the run is still in progress, and a new object for each finished run
 * (a fresh object identity is what marks "a new run", so replays post again).
 */
export function usePostResult(opts: {
  user: { uid: string } | null;
  isMember: boolean;
  profile: UserProfile | null;
  boardId: string;
  mode: 'daily' | 'furnace';
  result: { score: number; versesCorrect: number } | null;
}) {
  const { user, isMember, profile, boardId, mode, result } = opts;
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [rank, setRank] = useState<number | null>(null);
  const [newStreak, setNewStreak] = useState<number | null>(null);
  const [boardRefresh, setBoardRefresh] = useState(0);

  const recordedFor = useRef<object | null>(null);
  const postedFor = useRef<object | null>(null);

  useEffect(() => {
    if (!result) {
      recordedFor.current = null;
      postedFor.current = null;
      return;
    }
    if (!isMember || !user) return;

    if (recordedFor.current !== result) {
      recordedFor.current = result;
      recordActivity(user.uid, { versesCorrect: result.versesCorrect, mode, score: result.score })
        .then((res) => setNewStreak(res.streak))
        .catch(() => {});
    }

    const username = profile?.username;
    if (!username || postedFor.current === result) return;
    postedFor.current = result;

    // Not cancelled on re-render: the post is a one-shot per run, and a later profile change
    // (e.g. an avatar update) must not leave the status stuck on "saving".
    (async () => {
      try {
        setSubmitState('saving');
        await submitScore(boardId, { uid: user.uid, username, avatarId: profile?.avatarId ?? null, score: result.score });
        setSubmitState('saved');
        setRank(await fetchRank(boardId, result.score));
      } catch {
        setSubmitState('error');
      } finally {
        setBoardRefresh((n) => n + 1);
      }
    })();
  }, [result, isMember, user, profile?.username, profile?.avatarId, boardId, mode]);

  const reset = () => {
    setSubmitState('idle');
    setRank(null);
    setNewStreak(null);
  };

  return { submitState, rank, newStreak, boardRefresh, reset };
}
