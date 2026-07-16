import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Flame, Loader2, Trophy } from 'lucide-react';
import Leaderboard from './Leaderboard';
import { loadBible } from '../../utils/bible';
import {
  dailyKey,
  generateDailyQuestions,
  maxDailyScore,
  QUESTIONS_PER_DAY,
  scoreForAnswer,
  TIME_PER_QUESTION_MS,
  type DailyQuestion,
} from '../../utils/dailyChallenge';
import { dailyBoardId, fetchRank, submitScore } from '../../utils/leaderboard';
import { recordActivity } from '../../utils/userStats';
import type { UserProfile } from '../../utils/userProfile';

interface DailyChallengeProps {
  user: { uid: string } | null;
  isMember: boolean;
  profile: UserProfile | null;
  onBack: () => void;
  onOpenAuth: () => void;
}

type Phase = 'loading' | 'intro' | 'playing' | 'reveal' | 'done';

const TICK_MS = 100;

const DailyChallenge: React.FC<DailyChallengeProps> = ({
  user,
  isMember,
  profile,
  onBack,
  onOpenAuth,
}) => {
  const dayKey = useMemo(() => dailyKey(), []);
  const boardId = useMemo(() => dailyBoardId(dayKey), [dayKey]);
  const [questions, setQuestions] = useState<DailyQuestion[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>('loading');
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [msLeft, setMsLeft] = useState(TIME_PER_QUESTION_MS);
  const deadline = useRef(0);

  const [rank, setRank] = useState<number | null>(null);
  const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [newStreak, setNewStreak] = useState<number | null>(null);
  // Bumped after a score is posted so the results leaderboard refetches and shows the new standing.
  const [boardRefresh, setBoardRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadBible()
      .then((data) => {
        if (cancelled) return;
        setQuestions(generateDailyQuestions(data, dayKey));
        setPhase('intro');
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [dayKey]);

  const question = questions?.[index] ?? null;

  // Reveal the answer, banking the speed-weighted score. Shared by a click and by the timer
  // running out (choice = null → scored as wrong).
  const reveal = useCallback(
    (choice: number | null) => {
      setPhase((p) => {
        if (p !== 'playing') return p;
        setPicked(choice);
        const remaining = Math.max(0, deadline.current - performance.now());
        const correct = choice !== null && question?.correctIndex === choice;
        setScore((s) => s + scoreForAnswer(correct, remaining));
        if (correct) setCorrectCount((c) => c + 1);
        return 'reveal';
      });
    },
    [question],
  );

  // One interval per question drives both the visible clock and the timeout.
  useEffect(() => {
    if (phase !== 'playing') return;
    deadline.current = performance.now() + TIME_PER_QUESTION_MS;
    const id = window.setInterval(() => {
      const remaining = deadline.current - performance.now();
      if (remaining <= 0) {
        window.clearInterval(id);
        reveal(null);
      } else {
        setMsLeft(remaining);
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [phase, index, reveal]);

  const startQuestion = (i: number) => {
    setIndex(i);
    setPicked(null);
    setMsLeft(TIME_PER_QUESTION_MS);
    setPhase('playing');
  };

  const next = () => {
    if (!questions) return;
    if (index + 1 >= questions.length) {
      finish();
    } else {
      startQuestion(index + 1);
    }
  };

  const finish = async () => {
    setPhase('done');
    if (!isMember || !user) return;

    // Private stats (streak, lifetime count) record independently of the public leaderboard, so
    // they update even if the board rules aren't deployed.
    recordActivity(user.uid, { versesCorrect: correctCount, mode: 'daily', score })
      .then((res) => setNewStreak(res.streak))
      .catch(() => {});

    if (profile?.username) {
      try {
        setSubmitState('saving');
        await submitScore(boardId, {
          uid: user.uid,
          username: profile.username,
          avatarId: profile.avatarId,
          score,
        });
        setSubmitState('saved');
        setRank(await fetchRank(boardId, score));
      } catch {
        setSubmitState('error');
      } finally {
        setBoardRefresh((n) => n + 1);
      }
    }
  };

  if (loadError) {
    return (
      <Shell onBack={onBack}>
        <div className="rounded-md border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-200">
          {loadError}
        </div>
      </Shell>
    );
  }

  if (phase === 'loading' || !questions) {
    return (
      <Shell onBack={onBack}>
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <Loader2 size={22} className="animate-spin text-forge-400" />
          <div className="struck animate-pulse text-3xl text-white">Preparing today’s challenge</div>
        </div>
      </Shell>
    );
  }

  if (phase === 'intro') {
    return (
      <Shell onBack={onBack}>
        <div className="plate p-8 text-center">
          <div className="stamp mb-2">Daily Challenge</div>
          <h2 className="struck text-5xl">{dayKey}</h2>
          <p className="mx-auto mt-4 max-w-sm text-base text-ash-400">
            {QUESTIONS_PER_DAY} questions, {TIME_PER_QUESTION_MS / 1000} seconds each. The faster you
            answer correctly, the more points you earn. Everyone plays the same set today.
          </p>
          {!isMember && (
            <p className="mx-auto mt-3 max-w-sm text-sm text-gold-400">
              Playing as a guest — sign in to post your score to the world leaderboard.
            </p>
          )}
          <button
            type="button"
            onClick={() => startQuestion(0)}
            className="btn-primary mt-6 inline-flex items-center gap-2 px-8 py-3.5 font-display text-base font-semibold uppercase tracking-forge"
          >
            Begin
          </button>
        </div>

        {/* See the board you're aiming at before you play. */}
        <div className="mt-4">
          <Leaderboard
            boardId={boardId}
            title={`World leaderboard · ${dayKey}`}
            highlightUid={user?.uid}
            emptyText="No scores posted yet today. Play to set the mark."
          />
        </div>
      </Shell>
    );
  }

  if (phase === 'done') {
    return (
      <Shell onBack={onBack}>
        <div className="plate p-8 text-center">
          <Trophy size={30} className="mx-auto mb-4 text-gold-400" />
          <div className="stamp mb-1">Your score</div>
          <div className="font-display text-5xl font-extrabold text-ash-200">{score}</div>
          <div className="mt-1 text-base text-ash-400">out of {maxDailyScore()}</div>

          {newStreak !== null && (
            <div className="mt-3 inline-flex items-center gap-2 border border-forge-500/50 bg-forge-700/15 px-4 py-1.5">
              <Flame size={16} className="text-forge-400" />
              <span className="font-display text-sm font-semibold uppercase tracking-forge text-ash-200">
                {newStreak}-day streak
              </span>
            </div>
          )}

          {isMember ? (
            <div className="mt-3 text-xs text-ash-500">
              {submitState === 'saving' && 'Posting your score…'}
              {submitState === 'saved' && rank !== null && (
                <span className="text-gold-400">World rank #{rank}</span>
              )}
              {submitState === 'error' && (
                <span className="text-red-300">
                  Could not post your score. The leaderboard rules may not be deployed yet.
                </span>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="btn-primary mt-4 inline-flex items-center gap-2 px-5 py-2.5 font-display text-xs font-semibold uppercase tracking-forge"
            >
              Sign in to post your score
            </button>
          )}
        </div>

        <div className="mt-4">
          <Leaderboard
            boardId={boardId}
            title={`World leaderboard · ${dayKey}`}
            highlightUid={user?.uid}
            emptyText="No scores posted yet today. Be the first."
            refreshKey={boardRefresh}
          />
        </div>
      </Shell>
    );
  }

  // playing / reveal
  const answered = phase === 'reveal';
  const pct = Math.max(0, Math.min(100, (msLeft / TIME_PER_QUESTION_MS) * 100));
  const urgent = msLeft < 4000;

  const optionClass = (i: number) => {
    if (!answered) return 'border-iron-800 bg-soot-900/70 text-ash-200 hover:border-gold-500/40 hover:bg-iron-800/40';
    if (i === question!.correctIndex) return 'border-green-400/60 bg-green-500/15 text-green-200';
    if (i === picked) return 'border-red-500/50 bg-red-950/30 text-red-200';
    return 'border-iron-800/60 bg-soot-900/50 text-ash-600';
  };

  return (
    <Shell onBack={onBack}>
      <div className="plate p-6">
        <div className="mb-3 flex items-center justify-between text-sm font-black uppercase tracking-widest text-ash-500">
          <span>Question {index + 1} / {questions.length}</span>
          <span>Score {score}</span>
        </div>

        <div className="mb-5 h-1 overflow-hidden rounded-full bg-soot-950">
          <div
            className={`h-full transition-[width] duration-100 ease-linear ${urgent ? 'bg-red-500' : 'bg-gold-500'}`}
            style={{ width: answered ? '0%' : `${pct}%` }}
          />
        </div>

        <div className="mb-2 text-sm font-black uppercase tracking-widest text-gold-400">
          {question!.reference}
        </div>
        <div className="mb-6 text-xl font-bold leading-relaxed text-white">{question!.prompt}</div>

        <div className="space-y-2.5">
          {question!.options.map((option, i) => (
            <button
              key={i}
              type="button"
              onClick={() => !answered && reveal(i)}
              disabled={answered}
              className={`w-full rounded-md border px-4 py-3.5 text-left text-base font-bold transition-colors disabled:cursor-default ${optionClass(i)}`}
            >
              {option}
            </button>
          ))}
        </div>

        {answered && (
          <button
            type="button"
            onClick={next}
            className="btn-primary mt-5 w-full py-3 font-display text-sm font-semibold uppercase tracking-forge"
          >
            {index + 1 >= questions.length ? 'See results' : 'Next'}
          </button>
        )}
      </div>
    </Shell>
  );
};

const Shell: React.FC<{ onBack: () => void; children: React.ReactNode }> = ({ onBack, children }) => (
  <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-10">
    <div className="mb-6 flex items-center justify-between">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 border border-iron-800 bg-soot-900/70 px-4 py-2 font-display text-sm font-semibold uppercase tracking-forge text-ash-300 hover:bg-iron-800/40"
      >
        <ArrowLeft size={16} /> Menu
      </button>
      <div className="stamp">Daily Challenge</div>
    </div>
    {children}
  </div>
);

export default DailyChallenge;
