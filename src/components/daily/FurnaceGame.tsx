import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Flame, Heart } from 'lucide-react';
import Leaderboard from './Leaderboard';
import { loadBible } from '../../utils/bible';
import { FURNACE_LIVES, SurvivalDeck, timeForStreak } from '../../utils/survival';
import type { GenQuestion } from '../../utils/questionGen';
import { fetchRank, submitScore } from '../../utils/leaderboard';
import { recordActivity } from '../../utils/userStats';
import type { UserProfile } from '../../utils/userProfile';

interface FurnaceGameProps {
  user: { uid: string } | null;
  isMember: boolean;
  profile: UserProfile | null;
  onBack: () => void;
  onOpenAuth: () => void;
}

const BOARD_ID = 'furnace';
const TICK_MS = 100;
type Phase = 'loading' | 'intro' | 'playing' | 'reveal' | 'over';

const FurnaceGame: React.FC<FurnaceGameProps> = ({ user, isMember, profile, onBack, onOpenAuth }) => {
  const deckRef = useRef<SurvivalDeck | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>('loading');
  const [question, setQuestion] = useState<GenQuestion | null>(null);
  const [lives, setLives] = useState(FURNACE_LIVES);
  // Verses survived this run. Only ever increases (a miss costs a life, not progress), so it is
  // both the live score and the final score.
  const [streak, setStreak] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [msLeft, setMsLeft] = useState(0);
  const [questionTime, setQuestionTime] = useState(0);
  const deadline = useRef(0);

  const [rank, setRank] = useState<number | null>(null);
  const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [newStreak, setNewStreak] = useState<number | null>(null);
  const [boardRefresh, setBoardRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadBible()
      .then((data) => {
        if (cancelled) return;
        deckRef.current = new SurvivalDeck(data);
        setPhase('intro');
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const askNext = useCallback((atStreak: number) => {
    if (!deckRef.current) return;
    setQuestion(deckRef.current.next());
    setPicked(null);
    const time = timeForStreak(atStreak);
    setQuestionTime(time);
    setMsLeft(time);
    setPhase('playing');
  }, []);

  const finish = useCallback(
    async (finalScore: number) => {
      setPhase('over');
      if (!isMember || !user) return;

      // Verses survived this run = correct answers, so the lifetime counter grows by the score.
      recordActivity(user.uid, { versesCorrect: finalScore, mode: 'furnace', score: finalScore })
        .then((res) => setNewStreak(res.streak))
        .catch(() => {});

      if (profile?.username) {
        try {
          setSubmitState('saving');
          await submitScore(BOARD_ID, {
            uid: user.uid,
            username: profile.username,
            avatarId: profile.avatarId,
            score: finalScore,
          });
          setSubmitState('saved');
          setRank(await fetchRank(BOARD_ID, finalScore));
        } catch {
          setSubmitState('error');
        } finally {
          setBoardRefresh((n) => n + 1);
        }
      }
    },
    [isMember, user, profile],
  );

  // Reveal + resolve one answer. `choice === null` means the clock ran out (a miss).
  const answer = useCallback(
    (choice: number | null) => {
      setPhase((p) => {
        if (p !== 'playing' || !question) return p;
        setPicked(choice);
        const correct = choice !== null && choice === question.correctIndex;

        if (correct) setStreak((s) => s + 1);
        else setLives((l) => l - 1);
        return 'reveal';
      });
    },
    [question],
  );

  // Timer for the current question.
  useEffect(() => {
    if (phase !== 'playing') return;
    deadline.current = performance.now() + questionTime;
    const id = window.setInterval(() => {
      const remaining = deadline.current - performance.now();
      if (remaining <= 0) {
        window.clearInterval(id);
        answer(null);
      } else {
        setMsLeft(remaining);
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [phase, question, questionTime, answer]);

  const proceed = () => {
    const wasCorrect = picked !== null && question?.correctIndex === picked;
    if (!wasCorrect && lives <= 0) {
      finish(streak);
    } else {
      askNext(wasCorrect ? streak : streak); // streak already updated in state
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

  if (phase === 'loading') {
    return (
      <Shell onBack={onBack}>
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <Flame size={26} className="animate-pulse text-forge-400" />
          <div className="struck text-3xl text-white">Stoking the furnace</div>
        </div>
      </Shell>
    );
  }

  if (phase === 'intro') {
    return (
      <Shell onBack={onBack}>
        <div className="plate p-8 text-center">
          <Flame size={30} className="mx-auto mb-4 text-forge-400" />
          <div className="stamp mb-1">Survival</div>
          <h2 className="struck text-5xl">The Furnace</h2>
          <p className="mx-auto mt-4 max-w-sm text-base text-ash-400">
            Answer as many as you can. You have {FURNACE_LIVES} lives, and the clock tightens the
            longer you last. How far can you endure the fire?
          </p>
          {!isMember && (
            <p className="mx-auto mt-3 max-w-sm text-sm text-gold-400">
              Playing as a guest — sign in to post your run to the leaderboard.
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              setLives(FURNACE_LIVES);
              setStreak(0);
              askNext(0);
            }}
            className="btn-primary mt-6 inline-flex items-center gap-2 px-8 py-3.5 font-display text-base font-semibold uppercase tracking-forge"
          >
            Enter the Furnace
          </button>
        </div>

        <div className="mt-4">
          <Leaderboard
            boardId={BOARD_ID}
            title="World leaderboard · The Furnace"
            highlightUid={user?.uid}
            emptyText="No runs posted yet. Be the first to endure."
          />
        </div>
      </Shell>
    );
  }

  if (phase === 'over') {
    return (
      <Shell onBack={onBack}>
        <div className="plate p-8 text-center">
          <Flame size={30} className="mx-auto mb-4 text-forge-400" />
          <div className="stamp mb-1">You endured</div>
          <div className="font-display text-6xl font-extrabold text-ash-200">{streak}</div>
          <div className="mt-1 text-base text-ash-400">verses before the fire took you</div>

          {newStreak !== null && (
            <div className="mt-3 inline-flex items-center gap-2 border border-forge-500/50 bg-forge-700/15 px-4 py-1.5">
              <Flame size={16} className="text-forge-400" />
              <span className="font-display text-sm font-semibold uppercase tracking-forge text-ash-200">
                {newStreak}-day streak
              </span>
            </div>
          )}

          {isMember ? (
            <div className="mt-3 text-sm text-ash-500">
              {submitState === 'saving' && 'Posting your run…'}
              {submitState === 'saved' && rank !== null && (
                <span className="text-gold-400">World rank #{rank}</span>
              )}
              {submitState === 'error' && (
                <span className="text-red-300">
                  Could not post your run. The leaderboard rules may not be deployed yet.
                </span>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="btn-primary mt-4 inline-flex items-center gap-2 px-5 py-2.5 font-display text-xs font-semibold uppercase tracking-forge"
            >
              Sign in to post your run
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setRank(null);
              setSubmitState('idle');
              setNewStreak(null);
              setLives(FURNACE_LIVES);
              setStreak(0);
              askNext(0);
            }}
            className="mt-5 block w-full border border-iron-700 py-3 font-display text-sm font-semibold uppercase tracking-forge text-ash-300 hover:border-forge-400 hover:text-forge-400"
          >
            Try again
          </button>
        </div>

        <div className="mt-4">
          <Leaderboard
            boardId={BOARD_ID}
            title="World leaderboard · The Furnace"
            highlightUid={user?.uid}
            emptyText="No runs posted yet. Be the first to endure."
            refreshKey={boardRefresh}
          />
        </div>
      </Shell>
    );
  }

  // playing / reveal
  const answered = phase === 'reveal';
  const pct = questionTime > 0 ? Math.max(0, Math.min(100, (msLeft / questionTime) * 100)) : 0;
  const urgent = msLeft < 3500;

  const optionClass = (i: number) => {
    if (!answered) return 'border-iron-800 bg-soot-900/70 text-ash-200 hover:border-forge-400/50 hover:bg-iron-800/40';
    if (i === question!.correctIndex) return 'border-green-400/60 bg-green-500/15 text-green-200';
    if (i === picked) return 'border-red-500/50 bg-red-950/30 text-red-200';
    return 'border-iron-800/60 bg-soot-900/50 text-ash-600';
  };

  return (
    <Shell onBack={onBack}>
      <div className="plate p-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {Array.from({ length: FURNACE_LIVES }).map((_, i) => (
              <Heart
                key={i}
                size={16}
                className={i < lives ? 'fill-forge-500 text-forge-500' : 'text-iron-700'}
              />
            ))}
          </div>
          <div className="font-display text-sm font-bold uppercase tracking-forge text-ash-300">
            Streak <span className="text-forge-400">{streak}</span>
          </div>
        </div>

        <div className="mb-5 h-1 overflow-hidden rounded-full bg-soot-950">
          <div
            className={`h-full transition-[width] duration-100 ease-linear ${urgent ? 'bg-red-500' : 'bg-forge-500'}`}
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
              onClick={() => !answered && answer(i)}
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
            onClick={proceed}
            className="btn-primary mt-5 w-full py-3 font-display text-sm font-semibold uppercase tracking-forge"
          >
            {picked !== null && question?.correctIndex === picked
              ? 'Next'
              : lives <= 0
                ? 'See results'
                : `Continue · ${lives} ${lives === 1 ? 'life' : 'lives'} left`}
          </button>
        )}
      </div>
    </Shell>
  );
};

const Shell: React.FC<{ onBack: () => void; children: React.ReactNode }> = ({ onBack, children }) => (
  <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-6 py-10">
    <div className="mb-6 flex items-center justify-between">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 border border-iron-800 bg-soot-900/70 px-4 py-2 font-display text-sm font-semibold uppercase tracking-forge text-ash-300 hover:bg-iron-800/40"
      >
        <ArrowLeft size={16} /> Menu
      </button>
      <div className="stamp">The Furnace</div>
    </div>
    {children}
  </div>
);

export default FurnaceGame;
