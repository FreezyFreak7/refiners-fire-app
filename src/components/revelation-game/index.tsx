import React, { useState, useEffect } from 'react';
import { Flame, Award, BookOpen, Layers, CheckCircle, XCircle, Home, Scroll, Mail, Megaphone, Droplet, Scale, Sun, Sword, Search, Users, Radio, Trophy, ArrowRight, ArrowLeft, Key, ChevronRight, AlertTriangle } from 'lucide-react';
import { doc, setDoc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';

import { db } from '../../utils/firebase';
import { expandedGameData as gameData } from '../../data/expandedGameDataSource';
import { acts } from '../../data/acts';
import { chapters } from '../../data/chapters';
import { shuffleArray } from '../../utils/helpers';

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
  const [appId] = useState('bible-game-v1'); 
  const isMaster = !!isMember;
  const lobbyReturnToMainMenu = initialAppState === 'lobby';

  // --- STATE MANAGEMENT ---
  const [appState, setAppState] = useState<
    'actSelect' | 'chapterSelect' | 'menu' | 'playing' | 'finished' | 'lobby' | 'multiplayer_room'
  >(initialAppState);
  const [selectedAct, setSelectedAct] = useState<any>(null);
  const [selectedChapter, setSelectedChapter] = useState<any>(null);
  const [gameMode, setGameMode] = useState<'blanks' | 'builder' | 'tf' | 'guess_verse' | null>(null);
  
  // Single Player State
  const [currentLevel, setCurrentLevel] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
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
    if (appState === 'multiplayer_room' && roomData?.status === 'playing' && roomData?.chapterId) {
      const rawQ = gameData[roomData.chapterId]?.blanks || [];
      if (activeQuestions.length === 0 || activeQuestions[0]?.verse?.split(':')[0] !== rawQ[0]?.verse?.split(':')[0]) {
        const processed = rawQ.map((q: any) => ({ ...q, options: shuffleArray([q.blank, ...((q.options || []).filter((opt: any) => opt !== q.blank))]) }));
        setActiveQuestions(processed);
      }
    }
  }, [roomData?.chapterId, roomData?.status, appState]);

  useEffect(() => {
    if (appState === 'multiplayer_room' && roomData?.questionIndex !== undefined) {
      if (currentLevel !== roomData.questionIndex) {
        setCurrentLevel(roomData.questionIndex);
        setMpFeedback(null);
      }
    }
  }, [roomData?.questionIndex, currentLevel, appState]);

  const mpStartGame = async () => {
    if (!roomData) return;
    const sessionRef = doc(db as any, 'artifacts', appId, 'public', 'data', 'sessions', roomCode);
    const questions = gameData[roomData.chapterId]?.blanks || [];
    await updateDoc(sessionRef, { status: 'playing', questionIndex: 0, totalQuestions: questions.length });
  };

  const mpSubmitAnswer = async (answer: any) => {
    if (!roomData || mpFeedback) return;
    const currentQ = activeQuestions[roomData.questionIndex];
    const isCorrect = answer === currentQ.blank;
    setMpFeedback(isCorrect ? 'correct' : 'incorrect');
    const sessionRef = doc(db as any, 'artifacts', appId, 'public', 'data', 'sessions', roomCode);

    const currentScore = roomData.players[user.uid]?.score || 0;
    const updatedPlayer = { ...roomData.players[user.uid], score: currentScore + (isCorrect ? 100 : 0) };
    await updateDoc(sessionRef, { [`players.${user.uid}`]: updatedPlayer });
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

  const startGame = (mode: any) => {
    if (!selectedChapter) return;
    setGameMode(mode);
    setScore(0);
    setStreak(0);

    setCurrentLevel(0);
    setAppState('playing');
    setFeedback(null);

    const churchData = gameData[selectedChapter.id] || { blanks: [], tf: [], builder: [] };

    const safeBlanks = churchData.blanks.length ? churchData.blanks : [{ verse: "?", textBefore: "No data", blank: "...", textAfter: ".", options: ["..."] }];
    const safeTF = churchData.tf && churchData.tf.length ? churchData.tf : [{ verse: "?", text: "No data", isTrue: true, explanation: "" }];
    const safeBuilder = churchData.builder && churchData.builder.length ? churchData.builder : [{ verse: "?", chunks: ["No", "data"] }];

    if (mode === 'blanks') setActiveQuestions(shuffleArray(safeBlanks.map((q: any) => ({ ...q, options: shuffleArray([q.blank, ...((q.options || []).filter((opt: any) => opt !== q.blank))]) }))));
    else if (mode === 'tf') setActiveQuestions(shuffleArray([...safeTF]));
    else if (mode === 'builder') { setActiveQuestions([...safeBuilder]); initializeBuilderLevel(0, safeBuilder); }
    else if (mode === 'guess_verse') setActiveQuestions(shuffleArray(safeBlanks.map((q: any) => ({ text: q.textBefore + " " + q.blank + " " + q.textAfter, correct: q.verse, options: shuffleArray([q.verse, "1:1", "2:2", "3:3"]) }))));
  };

  const initializeBuilderLevel = (index: any, source: any) => {
    if (!source || !source[index]) return;
    setBuilderData({ target: source[index].chunks, scrambled: shuffleArray([...source[index].chunks]), selected: [] });
  };

  const handleSinglePlayerAnswer = (isCorrect: any) => {
    if (feedback) return;
    if (isCorrect) {
      setFeedback('correct'); setScore(score + 10 + (streak * 2)); setStreak(streak + 1);
      setTimeout(() => {
        if (currentLevel < activeQuestions.length - 1) { setCurrentLevel(currentLevel + 1); setFeedback(null); if(gameMode==='builder') initializeBuilderLevel(currentLevel+1, activeQuestions); }
        else setAppState('finished');
      }, 1500);
    } else {
      setFeedback('incorrect'); setStreak(0);
      setTimeout(() => { if (gameMode !== 'blanks') { if (currentLevel < activeQuestions.length - 1) { setCurrentLevel(currentLevel + 1); setFeedback(null); } else setAppState('finished'); } else setFeedback(null); }, 2000);
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
    <div className="w-full max-w-4xl rounded-3xl border border-orange-500/25 bg-slate-950/60 p-2 text-center shadow-2xl backdrop-blur-xl">
      <div className="rounded-[1.75rem] border border-white/5 bg-gradient-to-b from-orange-950/35 via-black/40 to-slate-950/80 p-8 space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-400/30 bg-orange-500/15 text-orange-300 shadow-[0_20px_60px_-20px_rgba(249,115,22,0.55)]"><Users size={32} /></div>
        <div className="space-y-2">
          <div className="text-xs font-mono uppercase tracking-[0.35em] text-orange-300">Live Group Study</div>
          <h2 className="text-3xl font-black text-white">Play Together In Real Time</h2>
          <p className="text-sm text-slate-400">Create a room to host the session or enter a room code to join your group.</p>
        </div>
        <input type="text" placeholder="Your Name" value={playerName} onChange={e => setPlayerName(e.target.value)} className="w-full rounded-2xl border border-orange-500/20 bg-black/30 p-4 text-white outline-none transition-colors focus:border-orange-400" />
        <div className="grid gap-4 md:grid-cols-2">
          <button onClick={createSession} disabled={!playerName} className="rounded-2xl border border-orange-400/30 bg-orange-600 p-4 font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-orange-500 disabled:opacity-50">Host Game</button>
          <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
            <input type="text" placeholder="CODE" value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())} className="w-full rounded-xl border border-orange-500/20 bg-slate-900 p-3 text-center uppercase tracking-[0.45em] text-white outline-none focus:border-orange-400" maxLength={4} />
            <button onClick={joinSession} disabled={!playerName || roomCode.length !== 4} className="w-full rounded-xl border border-orange-500/30 bg-orange-950/50 p-3 font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-orange-900/40 disabled:opacity-50">Join Room</button>
          </div>
        </div>
        <button onClick={() => { if (lobbyReturnToMainMenu) onBack(); else setAppState('actSelect'); }} className="text-sm text-slate-500 transition-colors hover:text-white">Cancel</button>
      </div>
    </div>
  );

  const renderMultiplayerRoom = () => {
    if (!roomData) return <div className="text-white">Loading Room...</div>;
    if (roomData.status === 'waiting') {
      return (
        <div className="w-full max-w-4xl rounded-3xl border border-orange-500/25 bg-slate-950/60 p-2 text-center shadow-2xl backdrop-blur-xl">
          <div className="rounded-[1.75rem] border border-white/5 bg-gradient-to-b from-orange-950/35 via-black/40 to-slate-950/80 p-8 space-y-6">
            <div className="bg-black/30 p-4 rounded-2xl inline-block border border-orange-500/30"><div className="text-xs text-orange-400 font-mono">ROOM CODE</div><div className="text-4xl font-black text-white tracking-widest">{roomCode}</div></div>
            <div className="space-y-2"><h3 className="text-slate-400 text-sm uppercase tracking-widest">Players Joined</h3><div className="flex flex-wrap gap-2 justify-center">{(Object.values(roomData.players || {}) as any[]).map((p: any, i: any) => (<span key={i} className="px-3 py-1 rounded-full border border-white/10 bg-black/20 text-white text-sm">{p.name}</span>))}</div></div>
            {isHost ? (<div className="space-y-4"><div className="text-left rounded-2xl border border-white/10 bg-black/20 p-4"><label className="text-xs text-slate-400 mb-2 block uppercase tracking-[0.2em]">Select Chapter</label><select className="w-full rounded-xl border border-orange-500/20 bg-slate-900 text-white p-3 outline-none" onChange={(e) => mpSelectChapter(e.target.value)} value={roomData.chapterId || 'rev1'}>{chapters.map((c: any) => <option key={c.id} value={c.id}>{c.title} ({c.ref})</option>)}</select></div><button onClick={mpStartGame} className="w-full rounded-2xl border border-orange-400/30 bg-orange-600 py-4 font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-orange-500">Start Game</button></div>) : (<div className="flex items-center justify-center gap-2 text-orange-300 animate-pulse"><Radio size={16} /> Waiting for Host...</div>)}
          </div>
        </div>
      );
    }
    if (roomData.status === 'playing') {
      const currentQ = activeQuestions[roomData.questionIndex];
      if (!currentQ) return <div className="text-white">Loading Question...</div>;
      return (
        <div className="w-full max-w-2xl bg-slate-800 p-6 sm:p-8 rounded-3xl border border-slate-700 shadow-2xl text-center">
          <div className="flex justify-between items-center mb-6"><span className="text-orange-400 font-mono text-xs uppercase bg-orange-950/30 px-3 py-1 rounded-full border border-orange-900/50">Question {roomData.questionIndex + 1} / {activeQuestions.length}</span>{isHost && (<button onClick={mpNextQuestion} className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">Next <ArrowRight size={16} /></button>)}</div>
          <div className="text-xl sm:text-2xl font-serif text-slate-200 leading-relaxed mb-10">{currentQ.textBefore} <span className={`inline-block mx-2 px-3 py-1 rounded-lg border-b-2 font-bold transition-all ${mpFeedback === 'correct' ? 'bg-green-900/50 border-green-500 text-green-200' : mpFeedback === 'incorrect' ? 'bg-red-900/50 border-red-500 text-red-200' : 'bg-slate-700/50 border-orange-500/50 text-transparent min-w-[80px]'}`}>{mpFeedback ? currentQ.blank : '_____'}</span> {currentQ.textAfter}</div>
          {mpFeedback && <div className={`mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black uppercase tracking-[0.25em] ${mpFeedback === 'correct' ? 'border-green-500/40 bg-green-500/15 text-green-200' : 'border-red-500/40 bg-red-500/15 text-red-200'}`}>{mpFeedback === 'correct' ? 'Correct' : 'Wrong'}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">{(currentQ.options || []).map((opt: any, i: any) => (<button key={i} onClick={() => mpSubmitAnswer(opt)} disabled={mpFeedback !== null} className={`p-4 rounded-xl text-lg font-medium border-2 transition-all ${mpFeedback === 'correct' && opt === currentQ.blank ? 'bg-green-600 border-green-500 text-white' : mpFeedback === 'incorrect' && opt === currentQ.blank ? 'bg-green-600 border-green-500 text-white opacity-50' : 'bg-slate-700 border-slate-600 hover:border-orange-500'}`}>{opt}</button>))}</div>
          <div className="border-t border-slate-700 pt-4"><h4 className="text-xs text-slate-500 uppercase tracking-widest mb-2">Live Scores</h4><div className="flex flex-wrap gap-4 justify-center">{(Object.entries(roomData.players || {}) as any[]).sort((a: any, b: any) => (b?.[1]?.score || 0) - (a?.[1]?.score || 0)).map(([pid, p]: any, i: any) => (<div key={pid} className={`flex items-center gap-2 text-sm ${pid === user.uid ? 'text-orange-300 font-bold' : 'text-slate-400'}`}><span>#{i+1} {p.name}</span><span className="bg-slate-900 px-2 py-0.5 rounded">{p.score}</span></div>))}</div></div>
        </div>
      );
    }
    if (roomData.status === 'finished') {
      const sortedPlayers = (Object.entries(roomData.players || {}) as any[]).sort((a: any, b: any) => (b?.[1]?.score || 0) - (a?.[1]?.score || 0));
      return (
        <div className="w-full max-w-md rounded-3xl border border-orange-500/25 bg-slate-950/60 p-2 text-center shadow-2xl backdrop-blur-xl">
          <div className="rounded-[1.5rem] border border-white/5 bg-gradient-to-b from-orange-950/40 via-black/40 to-slate-950/80 p-8 space-y-6">
            <Trophy className="w-16 h-16 text-yellow-400 mx-auto animate-bounce" /><h2 className="text-3xl font-black text-white">Final Standings</h2>
            <div className="space-y-2">{sortedPlayers.map(([pid, p]: any, i: any) => (<div key={pid} className={`flex justify-between items-center p-3 rounded-xl ${i===0 ? 'bg-yellow-500/20 border border-yellow-500/50' : 'border border-white/10 bg-black/20'}`}><div className="flex items-center gap-3"><span className="font-mono font-bold text-slate-400">#{i+1}</span><span className="font-bold text-white">{p.name}</span></div><span className="font-mono text-white">{p.score}</span></div>))}</div>
            <button onClick={() => { if (lobbyReturnToMainMenu) onBack(); else setAppState('actSelect'); }} className="w-full rounded-2xl border border-orange-400/30 bg-orange-600 py-3 font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-orange-500">Return to Lobby</button>
          </div>
        </div>
      );
    }

    return null;
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className="min-h-screen text-slate-100 font-sans flex flex-col items-center selection:bg-orange-500 selection:text-white">
      {/* HEADER */}
      <div className="fixed top-0 left-0 w-full p-4 flex justify-between items-center bg-black/30 backdrop-blur-xl border-b border-white/5 z-50">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 bg-black/30 border border-white/10 rounded-full hover:bg-white/5 transition-colors" title="Back to Main Menu"><ArrowLeft size={16} /></button>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { if (lobbyReturnToMainMenu && appState === 'lobby') onBack(); else setAppState('actSelect'); }}>
            <img
              src="https://images.squarespace-cdn.com/content/63ceec1f6db7d32cd45a7e8f/37b4821c-9b93-4e5c-beb3-943f7f6d02c9/output-onlinegiftools+%282%29.gif?content-type=image%2Fgif"
              alt="Fire"
              className="h-5 w-5 object-contain"
            />
            <span className="font-black hidden sm:inline text-slate-200 tracking-wide">Refiner's Fire</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {appState === 'playing' && (<div className="flex gap-4 text-sm font-mono"><div className="flex items-center gap-1 text-orange-400"><Award size={14}/> {score}</div><div className="flex items-center gap-1 text-slate-400"><AlertTriangle size={14}/> {streak}x</div></div>)}
          {appState !== 'actSelect' && appState !== 'multiplayer_room' && (<button onClick={() => { if (lobbyReturnToMainMenu && appState === 'lobby') onBack(); else setAppState('actSelect'); }} className="p-2 bg-black/30 border border-white/10 rounded-full hover:bg-white/5 transition-colors" title="Back to Library"><Home size={16} /></button>)}
        </div>
      </div>

      <div className="w-full max-w-5xl flex-1 flex flex-col items-center justify-center pt-24 pb-10 px-4">
        {appState === 'actSelect' && (
          <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
            <div className="text-center space-y-4 mb-8">
              {isMaster && <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 text-orange-300 rounded-full text-xs font-bold border border-orange-500/40 mb-2"><Key size={12}/> MASTER ACCESS GRANTED</div>}
              <h2 className="text-5xl font-black text-white tracking-tight uppercase bg-gradient-to-r from-orange-400 to-red-600 bg-clip-text text-transparent">THE REVELATION LIBRARY</h2>
            </div>

            <div className="w-full rounded-3xl border border-orange-500/20 bg-slate-950/50 p-2 shadow-2xl backdrop-blur-xl">
              <div className="rounded-2xl border border-white/5 bg-black/30 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {acts.filter((act: any) => !act.hidden || isMaster).map((act: any) => (
                    <button
                      key={act.id}
                      onClick={() => selectAct(act)}
                      className={`group relative p-6 rounded-2xl text-center border transition-all duration-300 flex flex-col items-center gap-4 bg-black/20 hover:bg-white/5 hover:-translate-y-1 ${
                        act.hidden ? 'border-orange-900/30 hover:border-orange-500/40' : 'border-white/10 hover:border-orange-500/40'
                      }`}
                    >
                      <div className="p-4 rounded-2xl border border-orange-500/20 bg-orange-950/20 text-orange-400 group-hover:scale-110 transition-transform">
                        {(() => {
                          const Icon = actIconMap[act.icon];
                          return Icon ? <Icon size={28} /> : null;
                        })()}
                      </div>
                      <div>
                        <h3 className="text-xl font-black mb-1 text-white group-hover:text-orange-300">{act.title}</h3>
                        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-2">{act.range}</p>
                        <p className="text-sm text-slate-300 leading-tight">{act.desc}</p>
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
             <button onClick={() => setAppState('actSelect')} className="inline-flex items-center gap-2 mb-4 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm font-black text-slate-200 transition-colors hover:bg-white/5 hover:border-orange-500/30"><ChevronRight className="rotate-180 text-orange-300" size={16}/> Back to Library</button>
             <div className="text-center space-y-3 mb-8">
               <h2 className="text-4xl font-black text-white tracking-tight uppercase">{selectedAct?.title}</h2>
             </div>

             <div className="w-full rounded-3xl border border-orange-500/20 bg-slate-950/50 p-2 shadow-2xl backdrop-blur-xl">
               <div className="rounded-2xl border border-white/5 bg-black/30 p-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {chapters.filter((c: any) => c.actId === selectedAct?.id).map((chapter: any) => (
                     <button
                       key={chapter.id}
                       onClick={() => selectChapter(chapter.id)}
                       className="group relative p-6 rounded-2xl text-left border transition-all duration-300 bg-black/20 border-white/10 hover:border-orange-500/40 hover:bg-white/5 hover:-translate-y-1"
                     >
                       <div className="flex justify-between items-start mb-4">
                         <span className="font-mono text-xs px-2 py-1 rounded bg-orange-950/30 text-orange-300 border border-orange-500/20">{chapter.ref}</span>
                         <Flame size={16} className="text-orange-400 animate-pulse"/>
                       </div>
                       <h3 className="text-xl font-black mb-1 text-white group-hover:text-orange-300">{chapter.title}</h3>
                       <p className="text-sm text-slate-300">{chapter.desc}</p>
                     </button>
                   ))}
                 </div>
               </div>
             </div>
          </div>
        )}

        {appState === 'menu' && (
          <div className="w-full space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <button onClick={() => setAppState('chapterSelect')} className="inline-flex items-center gap-2 mb-4 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm font-black text-slate-200 transition-colors hover:bg-white/5 hover:border-orange-500/30"><ChevronRight className="rotate-180 text-orange-300" size={16}/> Back to Map</button>
            <div className="text-center space-y-2 mb-8">
              <h2 className="text-4xl font-black text-white tracking-tight uppercase">{selectedChapter?.title}</h2>
              <p className="text-orange-300 font-mono tracking-widest text-xs uppercase">{selectedChapter?.desc}</p>
              <p className="text-slate-500 text-sm mt-2">{selectedChapter?.ref}</p>
            </div>
            <div className="w-full rounded-3xl border border-orange-500/20 bg-slate-950/50 p-2 shadow-2xl backdrop-blur-xl">
              <div className="rounded-2xl border border-white/5 bg-black/30 p-6">
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => startGame('blanks')} className="col-span-2 sm:col-span-1 group relative bg-black/20 hover:bg-white/5 border border-white/10 p-4 rounded-2xl text-left transition-all hover:border-orange-500/40"><BookOpen className="text-orange-400 mb-2" size={24} /><h3 className="font-black text-white">Fill Blanks</h3></button>
                  <button onClick={() => startGame('builder')} className="col-span-2 sm:col-span-1 group relative bg-black/20 hover:bg-white/5 border border-white/10 p-4 rounded-2xl text-left transition-all hover:border-orange-500/40"><Layers className="text-orange-400 mb-2" size={24} /><h3 className="font-black text-white">Builder</h3></button>
                  <button onClick={() => startGame('tf')} className="col-span-2 sm:col-span-1 group relative bg-black/20 hover:bg-white/5 border border-white/10 p-4 rounded-2xl text-left transition-all hover:border-green-500/40"><CheckCircle className="text-green-400 mb-2" size={24} /><h3 className="font-black text-white">True or Lie</h3></button>
                  <button onClick={() => startGame('guess_verse')} className="col-span-2 sm:col-span-1 group relative bg-black/20 hover:bg-white/5 border border-white/10 p-4 rounded-2xl text-left transition-all hover:border-purple-500/40"><Search className="text-purple-400 mb-2" size={24} /><h3 className="font-black text-white">Reference</h3></button>
                </div>
              </div>
            </div>
          </div>
        )}

        {appState === 'playing' && (
           <div className="w-full flex flex-col items-center animate-in fade-in duration-500">
              <div className="w-full max-w-xs h-1 bg-slate-800 rounded-full mb-8 overflow-hidden"><div className="h-full bg-orange-500 transition-all duration-500 ease-out" style={{ width: `${((currentLevel) / activeQuestions.length) * 100}%` }}></div></div>
              {gameMode === 'blanks' && (
                <div className="w-full max-w-2xl rounded-3xl border border-orange-500/20 bg-slate-950/50 p-2 shadow-2xl backdrop-blur-xl">
                  <div className="rounded-2xl border border-white/5 bg-black/30 p-6 sm:p-8 relative overflow-hidden text-center">
                    <div className="mb-8"><span className="text-orange-400 font-mono text-xs uppercase tracking-widest bg-orange-950/30 px-3 py-1 rounded-full border border-orange-900/50">Rev {activeQuestions[currentLevel].verse}</span></div>
                    <div className="text-xl sm:text-2xl font-serif text-slate-200 leading-relaxed mb-10">{activeQuestions[currentLevel].textBefore} <span className={`inline-block mx-2 px-3 py-1 rounded-lg border-b-2 font-bold ${feedback === 'correct' ? 'bg-green-900/50 border-green-500 text-green-200' : feedback === 'incorrect' ? 'bg-red-900/50 border-red-500 text-red-200' : 'bg-slate-700/50 border-orange-500/50 text-transparent min-w-[80px]'}`}>{feedback === 'correct' || feedback === 'incorrect' ? activeQuestions[currentLevel].blank : '_____'}</span> {activeQuestions[currentLevel].textAfter}</div>
                    {feedbackLabel && <div className={`mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black uppercase tracking-[0.25em] ${feedback === 'correct' ? 'border-green-500/40 bg-green-500/15 text-green-200' : 'border-red-500/40 bg-red-500/15 text-red-200'}`}>{feedbackLabel}</div>}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{(activeQuestions[currentLevel].options || []).map((opt: any, i: any) => (<button key={i} onClick={() => handleSinglePlayerAnswer(opt === activeQuestions[currentLevel].blank)} disabled={feedback !== null} className={`p-4 rounded-xl text-lg font-medium border-2 transition-all ${feedback === 'correct' && opt === activeQuestions[currentLevel].blank ? 'bg-green-600 border-green-500 text-white' : feedback === 'incorrect' && opt === activeQuestions[currentLevel].blank ? 'bg-green-600 border-green-500 text-white opacity-50' : 'bg-slate-700 border-slate-600 hover:border-orange-500'}`}>{opt}</button>))}</div>
                  </div>
                </div>
              )}
              {gameMode === 'tf' && (
                <div className="w-full max-w-lg bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl text-center">
                  <div className="mb-6"><span className="text-green-400 font-mono text-xs uppercase tracking-widest bg-green-950/30 px-3 py-1 rounded-full border border-green-900/50">Rev {activeQuestions[currentLevel].verse}</span></div>
                  <h3 className="text-2xl font-serif text-white mb-8 min-h-[100px] flex items-center justify-center">"{activeQuestions[currentLevel].text}"</h3>
                  {feedback && (<div className={`mb-6 rounded-2xl border p-4 text-sm ${feedback === 'correct' ? 'border-green-500/30 bg-green-900/20 text-green-200' : 'border-red-500/30 bg-red-900/20 text-red-200'}`}><div className="mb-1 text-xs font-black uppercase tracking-[0.25em]">{feedback === 'correct' ? 'Correct' : 'Wrong'}</div>{feedback === 'incorrect' && activeQuestions[currentLevel].explanation}</div>)}
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => handleSinglePlayerAnswer(true)} disabled={feedback !== null} className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-2 ${feedback === 'correct' && activeQuestions[currentLevel].isTrue ? 'bg-green-600 border-green-500' : 'bg-slate-700 border-slate-600 hover:border-green-400'}`}><CheckCircle className="w-8 h-8 text-green-400" /><span className="font-bold text-white">TRUE</span></button>
                    <button onClick={() => handleSinglePlayerAnswer(false)} disabled={feedback !== null} className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-2 ${feedback === 'correct' && !activeQuestions[currentLevel].isTrue ? 'bg-red-600 border-red-500' : 'bg-slate-700 border-slate-600 hover:border-red-400'}`}><XCircle className="w-8 h-8 text-red-400" /><span className="font-bold text-white">FALSE</span></button>
                  </div>
                </div>
              )}
              {gameMode === 'guess_verse' && (
                <div className="w-full max-w-2xl bg-slate-800 p-6 sm:p-8 rounded-3xl border border-slate-700 shadow-2xl relative overflow-hidden text-center">
                  <div className="mb-8"><span className="text-purple-400 font-mono text-xs uppercase tracking-widest bg-purple-950/30 px-3 py-1 rounded-full border border-purple-900/50">Identify Reference</span></div>
                  <div className="text-xl sm:text-2xl font-serif text-slate-200 leading-relaxed mb-10">"{activeQuestions[currentLevel].text}"</div>
                  {feedbackLabel && <div className={`mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black uppercase tracking-[0.25em] ${feedback === 'correct' ? 'border-green-500/40 bg-green-500/15 text-green-200' : 'border-red-500/40 bg-red-500/15 text-red-200'}`}>{feedbackLabel}</div>}
                  <div className="grid grid-cols-2 gap-3">{(activeQuestions[currentLevel].options || []).map((opt: string, i: number) => (<button key={i} onClick={() => handleSinglePlayerAnswer(opt === activeQuestions[currentLevel].correct)} disabled={feedback !== null} className={`p-4 rounded-xl text-lg font-mono font-bold border-2 ${feedback === 'correct' && opt === activeQuestions[currentLevel].correct ? 'bg-green-600 border-green-500' : 'bg-slate-700 border-slate-600 hover:border-purple-500'}`}>Rev {opt}</button>))}</div>
                </div>
              )}
              {gameMode === 'builder' && (
                <div className="w-full max-w-2xl flex flex-col items-center">
                  <div className="w-full bg-slate-800 min-h-[160px] p-6 rounded-2xl border-2 border-dashed border-slate-600 mb-6 flex flex-wrap content-start gap-2 relative transition-all">
                    {builderData.selected.map((chunk, i) => (<div key={i} className="inline-flex items-center gap-1 rounded-lg border border-orange-500/30 bg-orange-500/15 px-2 py-2 text-white shadow-lg animate-in zoom-in duration-200"><button type="button" onClick={() => handleBuilderMove(i, -1)} disabled={feedback !== null || i === 0} className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-[10px] font-black text-orange-200 disabled:cursor-not-allowed disabled:opacity-30">←</button><span className="px-1 py-1 font-medium">{chunk}</span><button type="button" onClick={() => handleBuilderMove(i, 1)} disabled={feedback !== null || i === builderData.selected.length - 1} className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-[10px] font-black text-orange-200 disabled:cursor-not-allowed disabled:opacity-30">→</button></div>))}
                    {builderData.selected.length > 0 && !feedback && (<button onClick={handleBuilderUndo} className="absolute bottom-4 right-4 text-xs text-slate-400 hover:text-white underline">Undo Last</button>)}
                  </div>
                  {feedbackLabel && <div className={`mb-4 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black uppercase tracking-[0.25em] ${feedback === 'correct' ? 'border-green-500/40 bg-green-500/15 text-green-200' : 'border-red-500/40 bg-red-500/15 text-red-200'}`}>{feedbackLabel}</div>}
                  <div className="mb-3 text-xs font-black uppercase tracking-[0.3em] text-slate-500">Tap words below, then reorder the placed line</div>
                  <div className="flex flex-wrap justify-center gap-3">{builderData.scrambled.map((chunk, i) => (<button key={i} onClick={() => handleBuilderClick(chunk)} disabled={feedback !== null} className="border border-orange-500/20 bg-slate-700 px-4 py-3 rounded-xl font-medium text-slate-200 shadow-md transition-all hover:border-orange-500 hover:bg-slate-600 active:scale-95">{chunk}</button>))}</div>
                </div>
              )}
           </div>
        )}

        {appState === 'finished' && (
          <div className="w-full max-w-xl rounded-3xl border border-orange-500/25 bg-slate-950/60 p-2 text-center shadow-2xl backdrop-blur-xl animate-in zoom-in duration-300">
            <div className="rounded-[1.35rem] border border-white/5 bg-gradient-to-b from-orange-950/40 via-black/40 to-slate-950/80 p-8 space-y-6">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-orange-400/30 bg-orange-500/15 shadow-[0_20px_60px_-20px_rgba(249,115,22,0.55)]">
                <Award className="h-10 w-10 text-orange-300" />
              </div>
              <div className="space-y-2">
                <div className="text-xs font-mono uppercase tracking-[0.35em] text-orange-300">Run Complete</div>
                <h2 className="text-4xl font-black uppercase tracking-tight text-white">Final Score</h2>
                <p className="text-sm text-slate-400">You finished this Revelation run. Here is how you did.</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-orange-500/20 bg-orange-950/20 p-5">
                  <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-orange-300/80">Points Earned</div>
                  <div className="mt-2 text-4xl font-black text-white">{score}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-slate-400">Total Possible</div>
                  <div className="mt-2 text-4xl font-black text-white">{totalPossibleScore}</div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-sm text-slate-300">
                You earned <span className="font-black text-orange-300">{score}</span> out of <span className="font-black text-white">{totalPossibleScore}</span> possible points.
              </div>
              <button onClick={() => setAppState('chapterSelect')} className="w-full rounded-2xl border border-orange-400/30 bg-orange-600 px-5 py-4 font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-orange-500">Continue</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RevelationGame;