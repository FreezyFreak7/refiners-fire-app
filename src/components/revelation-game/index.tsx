import React, { useState, useEffect, useRef } from 'react';
import { Flame, Award, BookOpen, Layers, Home, Scroll, Mail, Megaphone, Droplet, Scale, Sun, Sword, Search, Users, Radio, Trophy, ArrowRight, ArrowLeft, Key, ChevronRight, AlertTriangle } from 'lucide-react';
import { doc, setDoc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';

import { db } from '../../utils/firebase';
import { APP_ID } from '../../utils/appConfig';
import { subscribeQuizzes, validateQuiz, type Quiz, type QuizQuestion } from '../../utils/quiz';
import { expandedGameData as gameData } from '../../data/expandedGameDataSource';
import { acts } from '../../data/acts';
import { chapters } from '../../data/chapters';
import { shuffleArray } from '../../utils/helpers';

type Difficulty = 'easy' | 'normal' | 'sealed';

const revelationDifficultyConfig: Record<Difficulty, { label: string; blurb: string; accent: string; options: number }> = {
  easy: { label: 'Easy', blurb: 'Fewer answer choices to weigh.', accent: 'green', options: 3 },
  normal: { label: 'Normal', blurb: 'A balanced set of choices.', accent: 'orange', options: 4 },
  sealed: { label: 'Sealed', blurb: 'Every decoy is in play.', accent: 'red', options: 6 },
};

type SpeedKey = 'slow' | 'fast' | 'lightning';

// Online-mode answer timer. Faster answers earn a bigger speed bonus on top of the base.
const SPEED_SETTINGS: Record<SpeedKey, { label: string; blurb: string; seconds: number }> = {
  slow: { label: 'Slow', blurb: '20s per question', seconds: 20 },
  fast: { label: 'Fast', blurb: '12s per question', seconds: 12 },
  lightning: { label: 'Lightning', blurb: '6s per question', seconds: 6 },
};

const MP_BASE_POINTS = 50;
const MP_SPEED_BONUS = 50;
const MP_MAX_VERSES = 50;

/**
 * Only questions tied to an explicit chapter:verse reference are used. Anything without one is
 * interpretive rather than something Scripture states outright (e.g. "seven symbolizes
 * completeness"), and this game only asks what the text actually says.
 */
const isVerseQuestion = (q: { verse?: unknown }) =>
  typeof q?.verse === 'string' && /^\d+:\d+/.test(q.verse);

const verseBlanks = (key: string) => (gameData[key]?.blanks || []).filter(isVerseQuestion);

// Total fill-blank questions available across every chapter — used to cap the verse slider.
const MP_TOTAL_AVAILABLE = Object.keys(gameData).reduce((sum, key) => sum + verseBlanks(key).length, 0);

// Build the shared question list for an online round. The selected chapter's verses come
// first, then verses from other chapters fill up to `count`. Options are pre-shuffled here so
// every player renders the identical set in the identical order (the host writes this to the
// session and all clients read it back).
const buildMpQuestionPool = (chapterId: string, count: number) => {
  const primary = verseBlanks(chapterId);
  const others = Object.keys(gameData)
    .filter((key) => key !== chapterId)
    .flatMap((key) => verseBlanks(key));
  const target = Math.max(1, Math.min(count, MP_TOTAL_AVAILABLE));
  const combined = [...primary, ...shuffleArray(others)].slice(0, target);
  return shuffleArray(
    combined.map((q: any) => ({ ...q, options: shuffleArray([q.blank, ...((q.options || []).filter((opt: any) => opt !== q.blank))]) }))
  );
};

/**
 * Converts a player's custom quiz into the room's question shape. Both verse blanks and quiz
 * questions carry `blank` = the correct answer string, so mpSubmitAnswer, the timer and the speed
 * bonus all work on either without branching. `kind` only drives how the question renders.
 *
 * The questions are copied into the session doc at start: players can't read the host's private
 * quiz, and embedding them guarantees everyone sees the identical set in the identical order.
 */
const quizToRoomQuestions = (quiz: Quiz) =>
  shuffleArray(quiz.questions).flatMap((q: QuizQuestion) => {
    // The room only supports pick-an-option answering. Verse-builder (reorder), type-the-word
    // (free text) and multi-blank fill-blanks don't fit, so they're left out of a hosted round; if
    // that leaves nothing, the "no questions" guard in mpStartGame catches it.
    if (q.kind === 'builder' || q.kind === 'type') return [];
    if (q.kind === 'blanks' && q.blankIndexes.length !== 1) return [];

    const base = {
      kind: 'choice',
      prompt: q.prompt,
      verse: q.reference || '',
      explanation: q.explanation || '',
    };
    if (q.kind === 'mc') {
      return [{ ...base, options: shuffleArray(q.options.filter((o) => o.trim())), blank: q.options[q.correctIndex] }];
    }
    if (q.kind === 'blanks') {
      return [{ ...base, options: shuffleArray(q.options), blank: q.answers[0] }];
    }
    return [{ ...base, options: ['True', 'False'], blank: q.isTrue ? 'True' : 'False' }];
  });

const modeLabels: Record<string, string> = {
  blanks: 'Fill Blanks',
  builder: 'Builder',
  guess_verse: 'Reference',
};

const actIconMap: Record<string, React.ComponentType<any>> = {
  Mail,
  Scroll,
  Megaphone,
  Sword,
  Droplet,
  Scale,
  Sun,
  Key,
};

interface RevelationGameProps {
  onBack: () => void;
  user: any;
  authLoading: boolean;
  isMember: boolean;
  initialAppState?: 'actSelect' | 'lobby';
}

const RevelationGame = ({ onBack, user, authLoading, isMember, initialAppState = 'actSelect' }: RevelationGameProps) => {
  const [appId] = useState(APP_ID);
  const isMaster = !!isMember;
  const lobbyReturnToMainMenu = initialAppState === 'lobby';

  // --- STATE MANAGEMENT ---
  const [appState, setAppState] = useState<
    'actSelect' | 'chapterSelect' | 'menu' | 'difficulty' | 'playing' | 'finished' | 'lobby' | 'multiplayer_room'
  >(initialAppState);
  const [selectedAct, setSelectedAct] = useState<any>(null);
  const [selectedChapter, setSelectedChapter] = useState<any>(null);
  const [gameMode, setGameMode] = useState<'blanks' | 'builder' | 'guess_verse' | null>(null);
  const [pendingMode, setPendingMode] = useState<'blanks' | 'builder' | 'guess_verse' | null>(null);
  const [gameDifficulty, setGameDifficulty] = useState<Difficulty>('normal');
  
  // Single Player State
  const [currentLevel, setCurrentLevel] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [missedCurrent, setMissedCurrent] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [activeQuestions, setActiveQuestions] = useState<any[]>([]);
  const [builderData, setBuilderData] = useState<{ target: any[]; scrambled: any[]; selected: any[] }>({
    target: [],
    scrambled: [],
    selected: [],
  });

  // Multiplayer State
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [roomData, setRoomData] = useState<any>(null);
  const [mpFeedback, setMpFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [mpTimeLeft, setMpTimeLeft] = useState(0);
  const [mpLastGain, setMpLastGain] = useState(0);
  const [mpVerseCount, setMpVerseCount] = useState(10);
  const mpAnsweredRef = useRef(false);

  // The host's own quizzes, so they can run one as the room's round.
  const [myQuizzes, setMyQuizzes] = useState<Quiz[]>([]);
  useEffect(() => {
    if (!isMember || !user?.uid) return;
    const unsub = subscribeQuizzes(user.uid, setMyQuizzes, () => {});
    return () => unsub();
  }, [isMember, user?.uid]);

  // Only quizzes that are actually playable can be hosted.
  const hostableQuizzes = myQuizzes.filter((q) => validateQuiz(q) === null);

  const mpSpeedKey: SpeedKey = (roomData?.speed as SpeedKey) || 'fast';
  const mpDurationMs = SPEED_SETTINGS[mpSpeedKey].seconds * 1000;

  const totalPossibleScore = activeQuestions.length
    ? activeQuestions.length * 10 + activeQuestions.length * (activeQuestions.length - 1)
    : 0;

  const feedbackLabel = feedback === 'correct' ? 'Correct' : feedback === 'incorrect' ? 'Wrong' : null;

  // --- MULTIPLAYER LOGIC ---
  const generateRoomCode = () => Math.random().toString(36).substring(2, 6).toUpperCase();

  const createSession = async () => {
    if (!user || !playerName) return alert("Please enter a name!");
    const code = generateRoomCode();
    setRoomCode(code);
    setIsHost(true);

    const sessionRef = doc(db as any, 'artifacts', appId, 'public', 'data', 'sessions', code);
    await setDoc(sessionRef, {
      hostId: user.uid,
      status: 'waiting',
      chapterId: 'rev1',
      questionIndex: 0,
      speed: 'fast',
      verseCount: 10,
      players: { [user.uid]: { name: playerName, score: 0, status: 'joined' } }
    });
    setAppState('multiplayer_room');
  };

  const joinSession = async () => {
    if (!user || !playerName || !roomCode) return alert("Please enter name and code!");
    const sessionRef = doc(db as any, 'artifacts', appId, 'public', 'data', 'sessions', roomCode);
    const sessionSnap = await getDoc(sessionRef);
    if (sessionSnap.exists()) {
      setIsHost(false);
      const currentData = sessionSnap.data();
      const updatedPlayers = { ...currentData.players, [user.uid]: { name: playerName, score: 0, status: 'joined' } };
      await updateDoc(sessionRef, { players: updatedPlayers });
      setAppState('multiplayer_room');
    } else {
      alert("Room not found!");
    }
  };

  useEffect(() => {
    if (appState === 'multiplayer_room' && roomCode && db) {
      const sessionRef = doc(db as any, 'artifacts', appId, 'public', 'data', 'sessions', roomCode);
      const unsub = onSnapshot(sessionRef, (doc) => {
        if (doc.exists()) setRoomData(doc.data());
      });
      return () => unsub();
    }
  }, [appState, roomCode, appId]);

  useEffect(() => {
    if (appState !== 'multiplayer_room') return;
    // The host writes the shared question list to the session; every client renders that exact
    // set (same order, same options) so questionIndex lines up for everyone.
    if (roomData?.status === 'playing' && Array.isArray(roomData?.questions)) {
      if (activeQuestions.length === 0) setActiveQuestions(roomData.questions);
    } else if (roomData?.status === 'waiting') {
      if (activeQuestions.length !== 0) setActiveQuestions([]);
    }
  }, [roomData?.status, roomData?.questions, appState, activeQuestions.length]);

  useEffect(() => {
    if (appState === 'multiplayer_room' && roomData?.questionIndex !== undefined) {
      if (currentLevel !== roomData.questionIndex) {
        setCurrentLevel(roomData.questionIndex);
        setMpFeedback(null);
      }
    }
  }, [roomData?.questionIndex, currentLevel, appState]);

  // Per-question countdown for online play: resets on each new question, locks the
  // round at zero, and drives the speed bonus via the remaining time.
  useEffect(() => {
    if (appState !== 'multiplayer_room' || roomData?.status !== 'playing') return;
    mpAnsweredRef.current = false;
    setMpFeedback(null);
    setMpLastGain(0);
    setMpTimeLeft(mpDurationMs);
    const startedAt = Date.now();
    const id = window.setInterval(() => {
      const left = Math.max(0, mpDurationMs - (Date.now() - startedAt));
      setMpTimeLeft(left);
      if (left <= 0) {
        window.clearInterval(id);
        if (!mpAnsweredRef.current) {
          mpAnsweredRef.current = true;
          setMpFeedback('incorrect');
        }
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [roomData?.questionIndex, roomData?.status, appState, mpDurationMs]);

  const mpStartGame = async () => {
    if (!roomData) return;
    const sessionRef = doc(db as any, 'artifacts', appId, 'public', 'data', 'sessions', roomCode);

    let questions;
    if (roomData.roundType === 'quiz') {
      const quiz = hostableQuizzes.find((q) => q.id === roomData.quizId);
      if (!quiz) return alert('Pick a quiz to play first.');
      questions = quizToRoomQuestions(quiz);
    } else {
      questions = buildMpQuestionPool(roomData.chapterId || 'rev1', roomData.verseCount || mpVerseCount);
    }
    if (!questions.length) return alert('That round has no questions.');

    await updateDoc(sessionRef, { status: 'playing', questionIndex: 0, totalQuestions: questions.length, questions });
  };

  const mpSelectRoundType = async (roundType: 'verses' | 'quiz') => {
    const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', roomCode);
    // Default to the first playable quiz so "Start" is never a dead end.
    const patch: Record<string, unknown> = { roundType };
    if (roundType === 'quiz' && !roomData?.quizId && hostableQuizzes[0]) {
      patch.quizId = hostableQuizzes[0].id;
      patch.quizName = hostableQuizzes[0].name;
    }
    await updateDoc(sessionRef, patch);
  };

  const mpSelectQuiz = async (quizId: string) => {
    const quiz = hostableQuizzes.find((q) => q.id === quizId);
    const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', roomCode);
    await updateDoc(sessionRef, { quizId, quizName: quiz?.name ?? '' });
  };

  const mpSelectVerseCount = async (count: number) => {
    const clamped = Math.max(1, Math.min(MP_MAX_VERSES, count));
    const sessionRef = doc(db as any, 'artifacts', appId, 'public', 'data', 'sessions', roomCode);
    await updateDoc(sessionRef, { verseCount: clamped });
  };

  // End-of-game return: send the whole group back to the waiting room (same room code),
  // reset scores and progress so the host can set up and start another round.
  const mpReturnToRoom = async () => {
    if (!roomData) return;
    const sessionRef = doc(db as any, 'artifacts', appId, 'public', 'data', 'sessions', roomCode);
    const resetPlayers: Record<string, any> = {};
    Object.entries(roomData.players || {}).forEach(([pid, p]: any) => {
      resetPlayers[pid] = { ...p, score: 0 };
    });
    setActiveQuestions([]);
    await updateDoc(sessionRef, { status: 'waiting', questionIndex: 0, questions: [], players: resetPlayers });
  };

  const mpSubmitAnswer = async (answer: any) => {
    if (!roomData || mpFeedback || mpAnsweredRef.current) return;
    mpAnsweredRef.current = true;
    const currentQ = activeQuestions[roomData.questionIndex];
    const isCorrect = answer === currentQ.blank;
    setMpFeedback(isCorrect ? 'correct' : 'incorrect');

    // Faster answers keep more of the speed bonus; correct-but-slow still earns the base.
    const fraction = mpDurationMs > 0 ? Math.max(0, Math.min(1, mpTimeLeft / mpDurationMs)) : 0;
    const gained = isCorrect ? MP_BASE_POINTS + Math.round(MP_SPEED_BONUS * fraction) : 0;
    setMpLastGain(gained);

    const sessionRef = doc(db as any, 'artifacts', appId, 'public', 'data', 'sessions', roomCode);
    const currentScore = roomData.players[user.uid]?.score || 0;
    const updatedPlayer = { ...roomData.players[user.uid], score: currentScore + gained };
    await updateDoc(sessionRef, { [`players.${user.uid}`]: updatedPlayer });
  };

  const mpSelectSpeed = async (speed: SpeedKey) => {
    const sessionRef = doc(db as any, 'artifacts', appId, 'public', 'data', 'sessions', roomCode);
    await updateDoc(sessionRef, { speed });
  };

  const mpNextQuestion = async () => {
    if (!roomData) return;
    const nextIdx = roomData.questionIndex + 1;
    const sessionRef = doc(db as any, 'artifacts', appId, 'public', 'data', 'sessions', roomCode);
    if (nextIdx >= activeQuestions.length) await updateDoc(sessionRef, { status: 'finished' });
    else await updateDoc(sessionRef, { questionIndex: nextIdx });
  };

  const mpSelectChapter = async (chapId: any) => {
    const sessionRef = doc(db as any, 'artifacts', appId, 'public', 'data', 'sessions', roomCode);
    await updateDoc(sessionRef, { chapterId: chapId });
  }

  // --- SINGLE PLAYER LOGIC ---
  const selectAct = (act: any) => {
    setSelectedAct(act);
    setAppState('chapterSelect');
  };

  const selectChapter = (chapterId: any) => {
    const chapter = chapters.find((c: any) => c.id === chapterId);
    setSelectedChapter(chapter);
    setAppState('menu');
  };

  const selectMode = (mode: any) => {
    if (!selectedChapter) return;
    setPendingMode(mode);
    setAppState('difficulty');
  };

  const startGame = (mode: any, difficulty: Difficulty) => {
    if (!selectedChapter) return;
    const optionCount = revelationDifficultyConfig[difficulty].options;
    setGameMode(mode);
    setGameDifficulty(difficulty);
    setScore(0);
    setStreak(0);
    setCorrectCount(0);
    setBestStreak(0);
    setMissedCurrent(false);

    setCurrentLevel(0);
    setAppState('playing');
    setFeedback(null);

    const churchData = gameData[selectedChapter.id] || { blanks: [], builder: [] };

    // Only verse-anchored questions; see isVerseQuestion.
    const chapterBlanks = (churchData.blanks || []).filter(isVerseQuestion);
    const safeBlanks = chapterBlanks.length ? chapterBlanks : [{ verse: "?", textBefore: "No data", blank: "...", textAfter: ".", options: ["..."] }];
    const safeBuilder = churchData.builder && churchData.builder.length ? churchData.builder : [{ verse: "?", chunks: ["No", "data"] }];

    if (mode === 'blanks') setActiveQuestions(shuffleArray(safeBlanks.map((q: any) => {
      const distractors = shuffleArray((q.options || []).filter((opt: any) => opt !== q.blank)).slice(0, Math.max(1, optionCount - 1));
      return { ...q, options: shuffleArray([q.blank, ...distractors]) };
    })));
    else if (mode === 'builder') { setActiveQuestions([...safeBuilder]); initializeBuilderLevel(0, safeBuilder); }
    else if (mode === 'guess_verse') setActiveQuestions(shuffleArray(safeBlanks.map((q: any) => {
      const decoys = shuffleArray(["1:1", "2:2", "3:3", "4:4", "5:5", "6:6"].filter((d) => d !== q.verse)).slice(0, Math.max(1, optionCount - 1));
      return { text: q.textBefore + " " + q.blank + " " + q.textAfter, correct: q.verse, options: shuffleArray([q.verse, ...decoys]) };
    })));
  };

  const initializeBuilderLevel = (index: any, source: any) => {
    if (!source || !source[index]) return;
    setBuilderData({ target: source[index].chunks, scrambled: shuffleArray([...source[index].chunks]), selected: [] });
  };

  const handleSinglePlayerAnswer = (isCorrect: any) => {
    if (feedback) return;
    if (isCorrect) {
      const nextStreak = streak + 1;
      setFeedback('correct'); setScore(score + 10 + (streak * 2)); setStreak(nextStreak);
      setBestStreak((prev) => Math.max(prev, nextStreak));
      if (!missedCurrent) setCorrectCount((prev) => prev + 1);
      setTimeout(() => {
        if (currentLevel < activeQuestions.length - 1) { setCurrentLevel(currentLevel + 1); setFeedback(null); setMissedCurrent(false); if(gameMode==='builder') initializeBuilderLevel(currentLevel+1, activeQuestions); }
        else setAppState('finished');
      }, 1500);
    } else {
      setFeedback('incorrect'); setStreak(0); setMissedCurrent(true);
      setTimeout(() => { if (gameMode !== 'blanks') { if (currentLevel < activeQuestions.length - 1) { setCurrentLevel(currentLevel + 1); setFeedback(null); setMissedCurrent(false); } else setAppState('finished'); } else setFeedback(null); }, 2000);
    }
  };

  const handleBuilderClick = (chunk: any) => {
    if (feedback) return;
    const newSelected = [...builderData.selected, chunk];
    const newScrambled = builderData.scrambled.filter(c => c !== chunk);
    setBuilderData({ ...builderData, selected: newSelected, scrambled: newScrambled });

    if (newScrambled.length === 0) {
      const isCorrect = newSelected.join(" ") === builderData.target.join(" ");
      handleSinglePlayerAnswer(isCorrect);
    }
  };

  const handleBuilderUndo = () => {
    if (feedback || builderData.selected.length === 0) return;
    const lastChunk = builderData.selected[builderData.selected.length - 1];
    setBuilderData({ 
      ...builderData, 
      selected: builderData.selected.slice(0, -1), 
      scrambled: [...builderData.scrambled, lastChunk] 
    });
  };

  const handleBuilderMove = (index: number, direction: -1 | 1) => {
    if (feedback) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= builderData.selected.length) return;
    const selected = [...builderData.selected];
    [selected[index], selected[nextIndex]] = [selected[nextIndex], selected[index]];
    setBuilderData({ ...builderData, selected });
  };

  const renderLobby = () => (
    <div className="w-full max-w-4xl rounded-3xl border border-gold-500/25 bg-soot-900/60 p-2 text-center shadow-2xl ">
      <div className="rounded-[1.75rem] border border-iron-800/60 bg-gradient-to-b from-gold-700/12 via-soot-950/50 to-soot-900/80 p-8 space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-gold-400/30 bg-gold-500/15 text-gold-400 shadow-[0_20px_60px_-20px_rgba(249,115,22,0.55)]"><Users size={32} /></div>
        <div className="space-y-2">
          <div className="text-xs font-mono uppercase tracking-[0.35em] text-gold-400">Live Group Study</div>
          <h2 className="text-3xl font-black text-white">Play Together In Real Time</h2>
          <p className="text-sm text-ash-500">Create a room to host the session or enter a room code to join your group.</p>
        </div>
        <input type="text" placeholder="Your Name" value={playerName} onChange={e => setPlayerName(e.target.value)} className="w-full rounded-2xl border border-gold-500/20 bg-soot-900/70 p-4 text-white outline-none transition-colors focus:border-gold-400" />
        <div className="grid gap-4 md:grid-cols-2">
          <button onClick={createSession} disabled={!playerName} className="btn-primary rounded-2xl p-4 font-black uppercase tracking-[0.2em] disabled:opacity-50">Host Game</button>
          <div className="space-y-3 rounded-2xl border border-iron-800 bg-soot-900/50 p-4">
            <input type="text" placeholder="CODE" value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())} className="w-full rounded-xl border border-gold-500/20 bg-neutral-950 p-3 text-center uppercase tracking-[0.45em] text-white outline-none focus:border-gold-400" maxLength={4} />
            <button onClick={joinSession} disabled={!playerName || roomCode.length !== 4} className="w-full rounded-xl border border-gold-500/30 bg-gold-700/20 p-3 font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-gold-700/25 disabled:opacity-50">Join Room</button>
          </div>
        </div>
        <button onClick={() => { if (lobbyReturnToMainMenu) onBack(); else setAppState('actSelect'); }} className="text-sm text-ash-600 transition-colors hover:text-white">Cancel</button>
      </div>
    </div>
  );

  const renderMultiplayerRoom = () => {
    if (!roomData) return <div className="text-white">Loading Room...</div>;
    if (roomData.status === 'waiting') {
      return (
        <div className="w-full max-w-4xl rounded-3xl border border-gold-500/25 bg-soot-900/60 p-2 text-center shadow-2xl ">
          <div className="rounded-[1.75rem] border border-iron-800/60 bg-gradient-to-b from-gold-700/12 via-soot-950/50 to-soot-900/80 p-8 space-y-6">
            <div className="bg-soot-900/70 p-4 rounded-2xl inline-block border border-gold-500/30"><div className="text-xs text-gold-400 font-mono">ROOM CODE</div><div className="text-4xl font-black text-white tracking-widest">{roomCode}</div></div>
            <div className="space-y-2"><h3 className="text-ash-500 text-sm uppercase tracking-widest">Players Joined</h3><div className="flex flex-wrap gap-2 justify-center">{(Object.values(roomData.players || {}) as any[]).map((p: any, i: any) => (<span key={i} className="px-3 py-1 rounded-full border border-iron-800 bg-soot-900/50 text-white text-sm">{p.name}</span>))}</div></div>
            {isHost ? (<div className="space-y-4">
              {/* What the room plays: Revelation verses, or one of the host's own quizzes. */}
              {hostableQuizzes.length > 0 && (
                <div className="text-left rounded-2xl border border-iron-800 bg-soot-900/50 p-4">
                  <label className="text-xs text-ash-500 mb-2 block uppercase tracking-[0.2em]">Round</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([['verses', 'Verses'], ['quiz', 'My Quiz']] as const).map(([key, label]) => {
                      const active = (roomData.roundType || 'verses') === key;
                      return (
                        <button key={key} type="button" onClick={() => mpSelectRoundType(key)} className={`rounded-xl border p-3 text-sm font-black uppercase tracking-[0.15em] transition-all ${active ? 'border-gold-500/60 bg-gold-500/15 text-gold-300' : 'border-iron-800 bg-soot-900/50 text-ash-300 hover:border-gold-500/30'}`}>{label}</button>
                      );
                    })}
                  </div>
                </div>
              )}

              {roomData.roundType === 'quiz' ? (
                <div className="text-left rounded-2xl border border-iron-800 bg-soot-900/50 p-4">
                  <label className="text-xs text-ash-500 mb-2 block uppercase tracking-[0.2em]">Select Quiz</label>
                  <select className="w-full rounded-xl border border-gold-500/20 bg-neutral-950 text-white p-3 outline-none" onChange={(e) => mpSelectQuiz(e.target.value)} value={roomData.quizId || ''}>
                    {hostableQuizzes.map((q) => <option key={q.id} value={q.id}>{q.name} ({q.questions.length})</option>)}
                  </select>
                  <div className="mt-2 text-[11px] text-ash-600">Your quiz is shared with everyone in the room for this round.</div>
                </div>
              ) : (
                <div className="text-left rounded-2xl border border-iron-800 bg-soot-900/50 p-4"><label className="text-xs text-ash-500 mb-2 block uppercase tracking-[0.2em]">Select Chapter</label><select className="w-full rounded-xl border border-gold-500/20 bg-neutral-950 text-white p-3 outline-none" onChange={(e) => mpSelectChapter(e.target.value)} value={roomData.chapterId || 'rev1'}>{chapters.map((c: any) => <option key={c.id} value={c.id}>{c.title} ({c.ref})</option>)}</select></div>
              )}
              <div className="text-left rounded-2xl border border-iron-800 bg-soot-900/50 p-4">
                <label className="text-xs text-ash-500 mb-2 block uppercase tracking-[0.2em]">Answer Speed</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['slow', 'fast', 'lightning'] as SpeedKey[]).map((key) => {
                    const active = (roomData.speed || 'fast') === key;
                    return (
                      <button key={key} type="button" onClick={() => mpSelectSpeed(key)} className={`flex flex-col items-center gap-1 rounded-xl border p-3 transition-all ${active ? 'border-gold-500/60 bg-gold-500/15 text-gold-300' : 'border-iron-800 bg-soot-900/50 text-ash-300 hover:border-gold-500/30'}`}>
                        <span className="text-sm font-black uppercase tracking-[0.15em]">{SPEED_SETTINGS[key].label}</span>
                        <span className="text-[10px] text-ash-600">{SPEED_SETTINGS[key].blurb}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 text-[11px] text-ash-600">Answer faster to earn more points — up to {MP_BASE_POINTS + MP_SPEED_BONUS} per question.</div>
              </div>
              <div className={`text-left rounded-2xl border border-iron-800 bg-soot-900/50 p-4 ${roomData.roundType === 'quiz' ? 'hidden' : ''}`}>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs text-ash-500 uppercase tracking-[0.2em]">Verses to Play</label>
                  <span className="rounded-lg border border-gold-500/30 bg-gold-700/15 px-3 py-1 text-sm font-black text-gold-300">{mpVerseCount}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={MP_MAX_VERSES}
                  value={mpVerseCount}
                  onChange={(e) => setMpVerseCount(Number(e.target.value))}
                  onMouseUp={() => mpSelectVerseCount(mpVerseCount)}
                  onTouchEnd={() => mpSelectVerseCount(mpVerseCount)}
                  onKeyUp={() => mpSelectVerseCount(mpVerseCount)}
                  className="w-full accent-gold-500"
                />
                <div className="mt-1 flex justify-between text-[10px] text-ash-600"><span>1</span><span>{MP_MAX_VERSES}</span></div>
              </div>
              <button onClick={mpStartGame} className="btn-primary w-full rounded-2xl py-4 font-black uppercase tracking-[0.2em]">Start Game</button></div>) : (<div className="space-y-3"><div className="flex items-center justify-center gap-2 text-gold-400 animate-pulse"><Radio size={16} /> Waiting for Host...</div><div className="text-xs text-ash-600 uppercase tracking-[0.2em]">Speed: {SPEED_SETTINGS[(roomData.speed as SpeedKey) || 'fast'].label} · {roomData.roundType === 'quiz' ? (roomData.quizName || 'Custom quiz') : `${roomData.verseCount || 10} verses`}</div></div>)}
          </div>
        </div>
      );
    }
    if (roomData.status === 'playing') {
      const currentQ = activeQuestions[roomData.questionIndex];
      if (!currentQ) return <div className="text-white">Loading Question...</div>;
      return (
        <div className="w-full max-w-3xl bg-neutral-900 p-6 sm:p-8 rounded-3xl border border-neutral-700 shadow-2xl text-center">
          <div className="flex justify-between items-center mb-4"><span className="text-gold-400 font-mono text-xs uppercase bg-gold-700/15 px-3 py-1 rounded-full border border-gold-700/40">Question {roomData.questionIndex + 1} / {activeQuestions.length}</span>{isHost && (<button onClick={mpNextQuestion} className="btn-primary px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">Next <ArrowRight size={16} /></button>)}</div>
          {(() => {
            const pct = mpDurationMs > 0 ? Math.max(0, Math.min(100, (mpTimeLeft / mpDurationMs) * 100)) : 0;
            const seconds = Math.ceil(mpTimeLeft / 1000);
            const urgent = pct <= 30;
            return (
              <div className="mb-6">
                <div className="mb-1 flex items-center justify-between text-[11px] font-black uppercase tracking-[0.25em]">
                  <span className="text-ash-600">{SPEED_SETTINGS[mpSpeedKey].label}</span>
                  <span className={mpFeedback ? 'text-ash-600' : urgent ? 'text-red-300' : 'text-gold-400'}>{mpFeedback ? 'Time up' : `${seconds}s`}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
                  <div className={`h-full rounded-full transition-[width] duration-100 ease-linear ${urgent ? 'bg-red-500' : 'bg-gold-500'}`} style={{ width: `${mpFeedback ? 0 : pct}%` }} />
                </div>
              </div>
            );
          })()}
          {currentQ.kind === 'choice' ? (
            <div className="mb-10">
              {currentQ.verse && <div className="mb-3 text-sm font-black uppercase tracking-widest text-gold-400">{currentQ.verse}</div>}
              <div className="text-xl sm:text-2xl font-serif text-ash-200 leading-relaxed">{currentQ.prompt}</div>
            </div>
          ) : (
            <div className="text-xl sm:text-2xl font-serif text-ash-200 leading-relaxed mb-10">{currentQ.textBefore} <span className={`inline-block mx-2 px-3 py-1 rounded-lg border-b-2 font-bold transition-all ${mpFeedback === 'correct' ? 'bg-green-900/50 border-green-500 text-green-200' : mpFeedback === 'incorrect' ? 'bg-red-900/50 border-red-500 text-red-200' : 'bg-neutral-800/50 border-gold-500/50 text-transparent min-w-[80px]'}`}>{mpFeedback ? currentQ.blank : '_____'}</span> {currentQ.textAfter}</div>
          )}
          {mpFeedback && <div className={`mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black uppercase tracking-[0.25em] ${mpFeedback === 'correct' ? 'border-green-500/40 bg-green-500/15 text-green-200' : 'border-red-500/40 bg-red-500/15 text-red-200'}`}>{mpFeedback === 'correct' ? `Correct +${mpLastGain}` : 'Wrong'}</div>}
          {mpFeedback && currentQ.explanation && <div className="mb-6 text-sm text-ash-400">{currentQ.explanation}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">{(currentQ.options || []).map((opt: any, i: any) => (<button key={i} onClick={() => mpSubmitAnswer(opt)} disabled={mpFeedback !== null} className={`p-4 rounded-xl text-lg font-medium border-2 transition-all ${mpFeedback === 'correct' && opt === currentQ.blank ? 'bg-green-600 border-green-500 text-white' : mpFeedback === 'incorrect' && opt === currentQ.blank ? 'bg-green-600 border-green-500 text-white opacity-50' : 'bg-neutral-800 border-neutral-700 hover:border-gold-500'}`}>{opt}</button>))}</div>
          <div className="border-t border-neutral-700 pt-4"><h4 className="text-xs text-ash-600 uppercase tracking-widest mb-2">Live Scores</h4><div className="flex flex-wrap gap-4 justify-center">{(Object.entries(roomData.players || {}) as any[]).sort((a: any, b: any) => (b?.[1]?.score || 0) - (a?.[1]?.score || 0)).map(([pid, p]: any, i: any) => (<div key={pid} className={`flex items-center gap-2 text-sm ${pid === user.uid ? 'text-gold-400 font-bold' : 'text-ash-500'}`}><span>#{i+1} {p.name}</span><span className="bg-neutral-950 px-2 py-0.5 rounded">{p.score}</span></div>))}</div></div>
        </div>
      );
    }
    if (roomData.status === 'finished') {
      const sortedPlayers = (Object.entries(roomData.players || {}) as any[]).sort((a: any, b: any) => (b?.[1]?.score || 0) - (a?.[1]?.score || 0));
      return (
        <div className="w-full max-w-md rounded-3xl border border-gold-500/25 bg-soot-900/60 p-2 text-center shadow-2xl ">
          <div className="rounded-[1.5rem] border border-iron-800/60 bg-gradient-to-b from-gold-700/12 via-soot-950/50 to-soot-900/80 p-8 space-y-6">
            <Trophy className="w-16 h-16 text-yellow-400 mx-auto animate-bounce" /><h2 className="text-3xl font-black text-white">Final Standings</h2>
            <div className="space-y-2">{sortedPlayers.map(([pid, p]: any, i: any) => (<div key={pid} className={`flex justify-between items-center p-3 rounded-xl ${i===0 ? 'bg-yellow-500/20 border border-yellow-500/50' : 'border border-iron-800 bg-soot-900/50'}`}><div className="flex items-center gap-3"><span className="font-mono font-bold text-ash-500">#{i+1}</span><span className="font-bold text-white">{p.name}</span></div><span className="font-mono text-white">{p.score}</span></div>))}</div>
            <button onClick={mpReturnToRoom} className="btn-primary w-full rounded-2xl py-3 font-black uppercase tracking-[0.2em]">Back to Room</button>
            <button onClick={() => { if (lobbyReturnToMainMenu) onBack(); else setAppState('actSelect'); }} className="text-sm text-ash-600 transition-colors hover:text-white">Leave group</button>
          </div>
        </div>
      );
    }

    return null;
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className="min-h-screen text-ash-200 font-sans flex flex-col items-center selection:bg-gold-500 selection:text-soot-950">
      {/* HEADER */}
      <div className="fixed top-0 left-0 w-full p-4 flex justify-between items-center bg-soot-900/70 border-b border-iron-800/60 z-50">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 bg-soot-900/70 border border-iron-800 rounded-full hover:bg-iron-800/40 transition-colors" title="Back to Main Menu"><ArrowLeft size={16} /></button>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { if (lobbyReturnToMainMenu && appState === 'lobby') onBack(); else setAppState('actSelect'); }}>
            <img
              src="https://images.squarespace-cdn.com/content/63ceec1f6db7d32cd45a7e8f/37b4821c-9b93-4e5c-beb3-943f7f6d02c9/output-onlinegiftools+%282%29.gif?content-type=image%2Fgif"
              alt="Fire"
              className="h-5 w-5 object-contain"
            />
            <span className="font-black hidden sm:inline text-ash-200 tracking-wide">Refiner's Fire</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {appState === 'playing' && (<div className="flex gap-4 text-sm font-mono"><div className="flex items-center gap-1 text-gold-400"><Award size={14}/> {score}</div><div className="flex items-center gap-1 text-ash-500"><AlertTriangle size={14}/> {streak}x</div></div>)}
          {appState !== 'actSelect' && appState !== 'multiplayer_room' && (<button onClick={() => { if (lobbyReturnToMainMenu && appState === 'lobby') onBack(); else setAppState('actSelect'); }} className="p-2 bg-soot-900/70 border border-iron-800 rounded-full hover:bg-iron-800/40 transition-colors" title="Back to Library"><Home size={16} /></button>)}
        </div>
      </div>

      <div className="w-full max-w-5xl flex-1 flex flex-col items-center justify-center pt-24 pb-10 px-4">
        {appState === 'actSelect' && (
          <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
            <div className="text-center space-y-4 mb-8">
              {isMaster && <div className="inline-flex items-center gap-2 px-3 py-1 bg-gold-500/10 text-gold-400 rounded-full text-xs font-bold border border-gold-500/40 mb-2"><Key size={12}/> MASTER ACCESS GRANTED</div>}
              <h2 className="text-5xl font-black text-white tracking-tight uppercase bg-gradient-to-r from-gold-400 to-red-600 bg-clip-text text-transparent">THE REVELATION LIBRARY</h2>
            </div>

            <div className="w-full rounded-3xl border border-gold-500/20 bg-soot-900/80 p-2 shadow-2xl ">
              <div className="rounded-2xl border border-iron-800/60 bg-soot-900/70 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {acts.filter((act: any) => !act.hidden || isMaster).map((act: any) => (
                    <button
                      key={act.id}
                      onClick={() => selectAct(act)}
                      className={`group relative p-6 rounded-2xl text-center border transition-all duration-300 flex flex-col items-center gap-4 bg-soot-900/50 hover:bg-iron-800/40 hover:-translate-y-1 ${
                        act.hidden ? 'border-gold-700/30 hover:border-gold-500/40' : 'border-iron-800 hover:border-gold-500/40'
                      }`}
                    >
                      <div className="p-4 rounded-2xl border border-gold-500/20 bg-gold-700/12 text-gold-400 group-hover:scale-110 transition-transform">
                        {(() => {
                          const Icon = actIconMap[act.icon];
                          return Icon ? <Icon size={28} /> : null;
                        })()}
                      </div>
                      <div>
                        <h3 className="text-xl font-black mb-1 text-white group-hover:text-gold-400">{act.title}</h3>
                        <p className="text-xs font-mono text-ash-600 uppercase tracking-widest mb-2">{act.range}</p>
                        <p className="text-sm text-ash-300 leading-tight">{act.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {appState === 'lobby' && renderLobby()}
        {appState === 'multiplayer_room' && renderMultiplayerRoom()}

        {/* Single Player Views */}
        {appState === 'chapterSelect' && (
          <div className="w-full space-y-8 animate-in fade-in slide-in-from-right-8 duration-500 pb-10">
             <button onClick={() => setAppState('actSelect')} className="inline-flex items-center gap-2 mb-4 rounded-full border border-iron-800 bg-soot-900/50 px-4 py-2 text-sm font-black text-ash-200 transition-colors hover:bg-iron-800/40 hover:border-gold-500/30"><ChevronRight className="rotate-180 text-gold-400" size={16}/> Back to Library</button>
             <div className="text-center space-y-3 mb-8">
               <h2 className="text-4xl font-black text-white tracking-tight uppercase">{selectedAct?.title}</h2>
             </div>

             <div className="w-full rounded-3xl border border-gold-500/20 bg-soot-900/80 p-2 shadow-2xl ">
               <div className="rounded-2xl border border-iron-800/60 bg-soot-900/70 p-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {chapters.filter((c: any) => c.actId === selectedAct?.id).map((chapter: any) => (
                     <button
                       key={chapter.id}
                       onClick={() => selectChapter(chapter.id)}
                       className="group relative p-6 rounded-2xl text-left border transition-all duration-300 bg-soot-900/50 border-iron-800 hover:border-gold-500/40 hover:bg-iron-800/40 hover:-translate-y-1"
                     >
                       <div className="flex justify-between items-start mb-4">
                         <span className="font-mono text-xs px-2 py-1 rounded bg-gold-700/15 text-gold-400 border border-gold-500/20">{chapter.ref}</span>
                         <Flame size={16} className="text-gold-400 animate-pulse"/>
                       </div>
                       <h3 className="text-xl font-black mb-1 text-white group-hover:text-gold-400">{chapter.title}</h3>
                       <p className="text-sm text-ash-300">{chapter.desc}</p>
                     </button>
                   ))}
                 </div>
               </div>
             </div>
          </div>
        )}

        {appState === 'menu' && (
          <div className="w-full space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <button onClick={() => setAppState('chapterSelect')} className="inline-flex items-center gap-2 mb-4 rounded-full border border-iron-800 bg-soot-900/50 px-4 py-2 text-sm font-black text-ash-200 transition-colors hover:bg-iron-800/40 hover:border-gold-500/30"><ChevronRight className="rotate-180 text-gold-400" size={16}/> Back to Map</button>
            <div className="text-center space-y-2 mb-8">
              <h2 className="text-4xl font-black text-white tracking-tight uppercase">{selectedChapter?.title}</h2>
              <p className="text-gold-400 font-mono tracking-widest text-xs uppercase">{selectedChapter?.desc}</p>
              <p className="text-ash-600 text-sm mt-2">{selectedChapter?.ref}</p>
            </div>
            <div className="w-full rounded-3xl border border-gold-500/20 bg-soot-900/80 p-2 shadow-2xl ">
              <div className="rounded-2xl border border-iron-800/60 bg-soot-900/70 p-6">
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => selectMode('blanks')} className="col-span-2 sm:col-span-1 group relative bg-soot-900/50 hover:bg-iron-800/40 border border-iron-800 p-4 rounded-2xl text-left transition-all hover:border-gold-500/40"><BookOpen className="text-gold-400 mb-2" size={24} /><h3 className="font-black text-white">Fill Blanks</h3></button>
                  <button onClick={() => selectMode('builder')} className="col-span-2 sm:col-span-1 group relative bg-soot-900/50 hover:bg-iron-800/40 border border-iron-800 p-4 rounded-2xl text-left transition-all hover:border-gold-500/40"><Layers className="text-gold-400 mb-2" size={24} /><h3 className="font-black text-white">Builder</h3></button>
                  <button onClick={() => selectMode('guess_verse')} className="col-span-2 sm:col-span-1 group relative bg-soot-900/50 hover:bg-iron-800/40 border border-iron-800 p-4 rounded-2xl text-left transition-all hover:border-purple-500/40"><Search className="text-purple-400 mb-2" size={24} /><h3 className="font-black text-white">Reference</h3></button>
                </div>
              </div>
            </div>
          </div>
        )}

        {appState === 'difficulty' && pendingMode && (
          <div className="w-full space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <button onClick={() => setAppState('menu')} className="inline-flex items-center gap-2 mb-4 rounded-full border border-iron-800 bg-soot-900/50 px-4 py-2 text-sm font-black text-ash-200 transition-colors hover:bg-iron-800/40 hover:border-gold-500/30"><ChevronRight className="rotate-180 text-gold-400" size={16}/> Back to Modes</button>
            <div className="text-center space-y-2 mb-8">
              <p className="text-gold-400 font-mono tracking-widest text-xs uppercase">{modeLabels[pendingMode]}</p>
              <h2 className="text-4xl font-black text-white tracking-tight uppercase">Choose Your Level</h2>
              <p className="text-ash-600 text-sm mt-2">Set the challenge before you begin this run.</p>
            </div>
            <div className="w-full rounded-3xl border border-gold-500/20 bg-soot-900/80 p-2 shadow-2xl ">
              <div className="rounded-2xl border border-iron-800/60 bg-soot-900/70 p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(['easy', 'normal', 'sealed'] as Difficulty[]).map((level) => {
                    const cfg = revelationDifficultyConfig[level];
                    const ring =
                      cfg.accent === 'green' ? 'hover:border-green-500/50 text-green-300'
                      : cfg.accent === 'red' ? 'hover:border-red-500/50 text-red-300'
                      : 'hover:border-gold-500/50 text-gold-400';
                    return (
                      <button key={level} onClick={() => startGame(pendingMode, level)} className={`group relative flex flex-col gap-2 rounded-2xl border border-iron-800 bg-soot-900/50 p-5 text-left transition-all hover:bg-iron-800/40 ${ring}`}>
                        <div className="text-[10px] font-black uppercase tracking-[0.35em] opacity-80">Level</div>
                        <h3 className="text-2xl font-black text-white">{cfg.label}</h3>
                        <p className="text-xs text-ash-500 leading-snug">{cfg.blurb}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {appState === 'playing' && (
           <div className="w-full flex flex-col items-center animate-in fade-in duration-500">
              <div className="w-full max-w-xs h-1 bg-neutral-900 rounded-full mb-8 overflow-hidden"><div className="h-full bg-gold-500 transition-all duration-500 ease-out" style={{ width: `${((currentLevel) / activeQuestions.length) * 100}%` }}></div></div>
              {gameMode === 'blanks' && (
                <div className="w-full max-w-3xl rounded-3xl border border-gold-500/20 bg-soot-900/80 p-2 shadow-2xl ">
                  <div className="rounded-2xl border border-iron-800/60 bg-soot-900/70 p-6 sm:p-8 relative overflow-hidden text-center">
                    <div className="mb-8"><span className="text-gold-400 font-mono text-xs uppercase tracking-widest bg-gold-700/15 px-3 py-1 rounded-full border border-gold-700/40">Rev {activeQuestions[currentLevel].verse}</span></div>
                    <div className="text-xl sm:text-2xl font-serif text-ash-200 leading-relaxed mb-10">{activeQuestions[currentLevel].textBefore} <span className={`inline-block mx-2 px-3 py-1 rounded-lg border-b-2 font-bold ${feedback === 'correct' ? 'bg-green-900/50 border-green-500 text-green-200' : feedback === 'incorrect' ? 'bg-red-900/50 border-red-500 text-red-200' : 'bg-neutral-800/50 border-gold-500/50 text-transparent min-w-[80px]'}`}>{feedback === 'correct' || feedback === 'incorrect' ? activeQuestions[currentLevel].blank : '_____'}</span> {activeQuestions[currentLevel].textAfter}</div>
                    {feedbackLabel && <div className={`mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black uppercase tracking-[0.25em] ${feedback === 'correct' ? 'border-green-500/40 bg-green-500/15 text-green-200' : 'border-red-500/40 bg-red-500/15 text-red-200'}`}>{feedbackLabel}</div>}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{(activeQuestions[currentLevel].options || []).map((opt: any, i: any) => (<button key={i} onClick={() => handleSinglePlayerAnswer(opt === activeQuestions[currentLevel].blank)} disabled={feedback !== null} className={`p-4 rounded-xl text-lg font-medium border-2 transition-all ${feedback === 'correct' && opt === activeQuestions[currentLevel].blank ? 'bg-green-600 border-green-500 text-white' : feedback === 'incorrect' && opt === activeQuestions[currentLevel].blank ? 'bg-green-600 border-green-500 text-white opacity-50' : 'bg-neutral-800 border-neutral-700 hover:border-gold-500'}`}>{opt}</button>))}</div>
                  </div>
                </div>
              )}
              {gameMode === 'guess_verse' && (
                <div className="w-full max-w-3xl bg-neutral-900 p-6 sm:p-8 rounded-3xl border border-neutral-700 shadow-2xl relative overflow-hidden text-center">
                  <div className="mb-8"><span className="text-purple-400 font-mono text-xs uppercase tracking-widest bg-purple-950/30 px-3 py-1 rounded-full border border-purple-900/50">Identify Reference</span></div>
                  <div className="text-xl sm:text-2xl font-serif text-ash-200 leading-relaxed mb-10">"{activeQuestions[currentLevel].text}"</div>
                  {feedbackLabel && <div className={`mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black uppercase tracking-[0.25em] ${feedback === 'correct' ? 'border-green-500/40 bg-green-500/15 text-green-200' : 'border-red-500/40 bg-red-500/15 text-red-200'}`}>{feedbackLabel}</div>}
                  <div className="grid grid-cols-2 gap-3">{(activeQuestions[currentLevel].options || []).map((opt: string, i: number) => (<button key={i} onClick={() => handleSinglePlayerAnswer(opt === activeQuestions[currentLevel].correct)} disabled={feedback !== null} className={`p-4 rounded-xl text-lg font-mono font-bold border-2 ${feedback === 'correct' && opt === activeQuestions[currentLevel].correct ? 'bg-green-600 border-green-500' : 'bg-neutral-800 border-neutral-700 hover:border-purple-500'}`}>Rev {opt}</button>))}</div>
                </div>
              )}
              {gameMode === 'builder' && (
                <div className="w-full max-w-3xl flex flex-col items-center">
                  <div className="w-full bg-neutral-900 min-h-[160px] p-6 rounded-2xl border-2 border-dashed border-neutral-700 mb-6 flex flex-wrap content-start gap-2 relative transition-all">
                    {builderData.selected.map((chunk, i) => (<div key={i} className="inline-flex items-center gap-1 rounded-lg border border-gold-500/30 bg-gold-500/15 px-2 py-2 text-soot-950 shadow-lg animate-in zoom-in duration-200"><button type="button" onClick={() => handleBuilderMove(i, -1)} disabled={feedback !== null || i === 0} className="rounded-md border border-iron-800 bg-soot-900/50 px-2 py-1 text-[10px] font-black text-gold-300 disabled:cursor-not-allowed disabled:opacity-30">←</button><span className="px-1 py-1 font-medium">{chunk}</span><button type="button" onClick={() => handleBuilderMove(i, 1)} disabled={feedback !== null || i === builderData.selected.length - 1} className="rounded-md border border-iron-800 bg-soot-900/50 px-2 py-1 text-[10px] font-black text-gold-300 disabled:cursor-not-allowed disabled:opacity-30">→</button></div>))}
                    {builderData.selected.length > 0 && !feedback && (<button onClick={handleBuilderUndo} className="absolute bottom-4 right-4 text-xs text-ash-500 hover:text-white underline">Undo Last</button>)}
                  </div>
                  {feedbackLabel && <div className={`mb-4 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black uppercase tracking-[0.25em] ${feedback === 'correct' ? 'border-green-500/40 bg-green-500/15 text-green-200' : 'border-red-500/40 bg-red-500/15 text-red-200'}`}>{feedbackLabel}</div>}
                  <div className="mb-3 text-xs font-black uppercase tracking-[0.3em] text-ash-600">Tap words below, then reorder the placed line</div>
                  <div className="flex flex-wrap justify-center gap-3">{builderData.scrambled.map((chunk, i) => (<button key={i} onClick={() => handleBuilderClick(chunk)} disabled={feedback !== null} className="border border-gold-500/20 bg-neutral-800 px-4 py-3 rounded-xl font-medium text-ash-200 shadow-md transition-all hover:border-gold-500 hover:bg-neutral-700 active:scale-95">{chunk}</button>))}</div>
                </div>
              )}
           </div>
        )}

        {appState === 'finished' && (
          <div className="w-full max-w-xl rounded-3xl border border-gold-500/25 bg-soot-900/60 p-2 text-center shadow-2xl animate-in zoom-in duration-300">
            <div className="rounded-[1.35rem] border border-iron-800/60 bg-gradient-to-b from-gold-700/12 via-soot-950/50 to-soot-900/80 p-8 space-y-6">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-gold-400/30 bg-gold-500/15 shadow-[0_20px_60px_-20px_rgba(249,115,22,0.55)]">
                <Award className="h-10 w-10 text-gold-400" />
              </div>
              <div className="space-y-2">
                <div className="text-xs font-mono uppercase tracking-[0.35em] text-gold-400">Run Complete</div>
                <h2 className="text-4xl font-black uppercase tracking-tight text-white">Final Score</h2>
                <p className="text-sm text-ash-500">You got <span className="font-black text-gold-400">{correctCount}</span> of <span className="font-black text-white">{activeQuestions.length}</span> questions correct.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gold-500/20 bg-gold-700/12 p-5">
                  <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-gold-400/80">Correct</div>
                  <div className="mt-2 text-4xl font-black text-white">{correctCount}<span className="text-xl text-ash-600">/{activeQuestions.length}</span></div>
                </div>
                <div className="rounded-2xl border border-iron-800 bg-soot-900/50 p-5">
                  <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-ash-500">Accuracy</div>
                  <div className="mt-2 text-4xl font-black text-white">{activeQuestions.length ? Math.round((correctCount / activeQuestions.length) * 100) : 0}%</div>
                </div>
              </div>
              <div className="rounded-2xl border border-iron-800 bg-soot-900/50 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-ash-500">Points</div>
                    <div className="text-3xl font-black text-white">{score}<span className="text-lg text-ash-600">/{totalPossibleScore}</span></div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-ash-500">Best Streak</div>
                    <div className="text-3xl font-black text-white">{bestStreak}x</div>
                  </div>
                </div>
                <div className="mt-3 border-t border-iron-800 pt-3 text-xs text-ash-600">
                  10 points per correct answer, plus a streak bonus (+2 for each answer in a row). The max for this run is {totalPossibleScore}.
                </div>
              </div>
              <button onClick={() => setAppState('chapterSelect')} className="btn-primary w-full rounded-2xl px-5 py-4 font-black uppercase tracking-[0.2em]">Continue</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RevelationGame;