import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { avatarSrc } from '../../data/avatars';
import { fetchTopScores, type LeaderboardEntry } from '../../utils/leaderboard';

interface LeaderboardProps {
  boardId: string;
  title: string;
  highlightUid?: string | null;
  emptyText?: string;
  /** Bumped by the parent (e.g. after posting a score) to force a refresh. */
  refreshKey?: number;
}

/** Self-fetching leaderboard panel, shared by the intro and results screens of every mode. */
const Leaderboard: React.FC<LeaderboardProps> = ({
  boardId,
  title,
  highlightUid,
  emptyText = 'No scores posted yet. Be the first.',
  refreshKey = 0,
}) => {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // No synchronous reset here: boardId is stable for a mounted board, and refetching in place
    // after a score post updates the list without a spinner flash. Initial load shows "Loading…"
    // because state starts null.
    let cancelled = false;
    fetchTopScores(boardId)
      .then((rows) => {
        if (!cancelled) setEntries(rows);
      })
      .catch(() => {
        if (!cancelled) {
          setEntries([]);
          setError('The leaderboard is unavailable. Its security rules may not be deployed yet.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [boardId, refreshKey]);

  return (
    <div className="plate p-5">
      <div className="stamp mb-3">{title}</div>

      {entries === null ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-ash-500">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      ) : error ? (
        <div className="py-8 text-center text-sm text-ash-600">{error}</div>
      ) : entries.length === 0 ? (
        <div className="py-8 text-center text-sm text-ash-600">{emptyText}</div>
      ) : (
        <ol className="space-y-1">
          {entries.map((entry, i) => {
            const you = highlightUid === entry.uid;
            const src = avatarSrc(entry.avatarId);
            return (
              <li
                key={entry.uid}
                className={`flex items-center gap-3 rounded-md px-3 py-2 ${
                  you ? 'bg-gold-700/15 ring-1 ring-gold-500/40' : ''
                }`}
              >
                <span className="w-6 shrink-0 text-right font-display text-base font-bold text-ash-500">
                  {i + 1}
                </span>
                {src ? (
                  <img src={src} alt="" className="h-8 w-8 rounded-full border border-gold-500/40" />
                ) : (
                  <span className="h-8 w-8 rounded-full border border-iron-700 bg-soot-800" />
                )}
                <span className="min-w-0 flex-1 truncate text-base font-bold text-ash-200">
                  {entry.username}
                  {you && <span className="ml-1 text-xs text-gold-400">(you)</span>}
                </span>
                <span className="font-display text-base font-bold text-gold-400">{entry.score}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};

export default Leaderboard;
