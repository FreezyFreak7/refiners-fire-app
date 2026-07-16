import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookmarkPlus,
  ChevronDown,
  ChevronUp,
  ListMusic,
  Play,
  Plus,
  SquarePen,
  Trash2,
} from 'lucide-react';
import VersePicker from './VersePicker';
import QuizBuilder from './QuizBuilder';
import QuizPlayer from './QuizPlayer';
import IdentityCard from './IdentityCard';
import StatsPanel from './StatsPanel';
import { refToId, type Verse } from '../../utils/bible';
import { EMPTY_STATS, subscribeUserStats, type UserStats } from '../../utils/userStats';
import {
  claimUsername,
  saveUserProfile,
  subscribeUserProfile,
  UsernameTakenError,
  type UserProfile,
} from '../../utils/userProfile';
import {
  createQuiz,
  deleteQuiz,
  renameQuiz,
  setQuizQuestions,
  subscribeQuizzes,
  validateQuiz,
  type Quiz,
  type QuizQuestion,
} from '../../utils/quiz';
import {
  createPlaylist,
  deletePlaylist,
  removePassage,
  renamePlaylist,
  savePassage,
  setPlaylistVerses,
  subscribePlaylists,
  subscribeSavedPassages,
  toPlaylistVerse,
  type Playlist,
  type SavedPassage,
} from '../../utils/profile';

interface ProfilePageProps {
  user: { uid: string; displayName?: string | null; email?: string | null };
  onBack: () => void;
}

type ProfileTab = 'passages' | 'playlists' | 'quizzes';
type SaveState = 'idle' | 'saving' | 'saved';

/** Autosave delay for the quiz editor — long enough that typing a question is one write, not thirty. */
const QUIZ_SAVE_DELAY_MS = 800;

const ProfilePage: React.FC<ProfilePageProps> = ({ user, onBack }) => {
  const [tab, setTab] = useState<ProfileTab>('passages');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats>(EMPTY_STATS);
  const [passages, setPassages] = useState<SavedPassage[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [openPlaylistId, setOpenPlaylistId] = useState<string | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [nameDraft, setNameDraft] = useState<string | null>(null);

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [openQuizId, setOpenQuizId] = useState<string | null>(null);
  const [playingQuizId, setPlayingQuizId] = useState<string | null>(null);
  const [newQuizName, setNewQuizName] = useState('');
  const [quizNameDraft, setQuizNameDraft] = useState<string | null>(null);

  // The builder edits a local draft; writes are debounced so typing a question is one Firestore
  // write instead of one per keystroke.
  const [questionDraft, setQuestionDraft] = useState<QuizQuestion[] | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const saveTimer = useRef<number | null>(null);
  const [pickerFor, setPickerFor] = useState<null | { kind: 'passages' } | { kind: 'playlist'; id: string }>(null);

  useEffect(() => {
    const unsubPassages = subscribeSavedPassages(
      user.uid,
      (next) => {
        setPassages(next);
        setLoading(false);
      },
      (err) => {
        setError(describeFirestoreError(err));
        setLoading(false);
      },
    );

    const unsubPlaylists = subscribePlaylists(
      user.uid,
      setPlaylists,
      (err) => setError(describeFirestoreError(err)),
    );

    const unsubQuizzes = subscribeQuizzes(
      user.uid,
      setQuizzes,
      (err) => setError(describeFirestoreError(err)),
    );

    const unsubProfile = subscribeUserProfile(
      user.uid,
      setUserProfile,
      (err) => setError(describeFirestoreError(err)),
    );

    const unsubStats = subscribeUserStats(
      user.uid,
      setStats,
      (err) => setError(describeFirestoreError(err)),
    );

    return () => {
      unsubPassages();
      unsubPlaylists();
      unsubQuizzes();
      unsubProfile();
      unsubStats();
    };
  }, [user.uid]);

  const handleSaveUsername = async (username: string) => {
    // Let the "taken" case reach IdentityCard unchanged so it can show it on the field itself;
    // everything else becomes a friendly Firestore message. Either way, rethrow so the card
    // keeps the editor open.
    try {
      await claimUsername(user.uid, username);
    } catch (err) {
      if (err instanceof UsernameTakenError) throw err;
      throw new Error(describeFirestoreError(err as Error));
    }
  };

  const handleSaveAvatar = async (avatarId: string) => {
    setError(null);
    try {
      await saveUserProfile(user.uid, { avatarId });
    } catch (err) {
      setError(describeFirestoreError(err as Error));
      throw err;
    }
  };

  // A pending autosave must not be lost if the page unmounts mid-edit.
  useEffect(() => {
    const timer = saveTimer;
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  /** Always clear any in-progress rename when changing playlists, so a draft can't leak across. */
  const selectPlaylist = (id: string | null) => {
    setNameDraft(null);
    setOpenPlaylistId(id);
  };

  const openQuiz = useMemo(() => quizzes.find((q) => q.id === openQuizId) ?? null, [quizzes, openQuizId]);
  const playingQuiz = useMemo(
    () => quizzes.find((q) => q.id === playingQuizId) ?? null,
    [quizzes, playingQuizId],
  );

  /** The quiz as the builder should see it: the unsaved draft if there is one, else the stored copy. */
  const editingQuiz = useMemo(() => {
    if (!openQuiz) return null;
    return questionDraft ? { ...openQuiz, questions: questionDraft } : openQuiz;
  }, [openQuiz, questionDraft]);

  const writeQuestions = (quizId: string, questions: QuizQuestion[]) => {
    setSaveState('saving');
    setQuizQuestions(user.uid, quizId, questions)
      .then(() => setSaveState('saved'))
      .catch((err) => {
        setSaveState('idle');
        setError(describeFirestoreError(err as Error));
      });
  };

  const handleQuestionsChange = (questions: QuizQuestion[]) => {
    if (!openQuizId) return;

    setQuestionDraft(questions);
    setSaveState('saving');

    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveTimer.current = null;
      writeQuestions(openQuizId, questions);
    }, QUIZ_SAVE_DELAY_MS);
  };

  /** Leaving the editor must not drop a debounced write that hasn't fired yet. */
  const closeQuizEditor = () => {
    if (saveTimer.current && openQuizId && questionDraft) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
      writeQuestions(openQuizId, questionDraft);
    }

    setQuestionDraft(null);
    setQuizNameDraft(null);
    setSaveState('idle');
    setOpenQuizId(null);
  };

  const savedIds = useMemo(() => new Set(passages.map((p) => p.id)), [passages]);
  const openPlaylist = useMemo(
    () => playlists.find((p) => p.id === openPlaylistId) ?? null,
    [playlists, openPlaylistId],
  );

  const handleAddVerse = async (verse: Verse) => {
    setError(null);
    try {
      if (pickerFor?.kind === 'passages') {
        await savePassage(user.uid, verse);
        return;
      }

      if (pickerFor?.kind === 'playlist') {
        const target = playlists.find((p) => p.id === pickerFor.id);
        if (!target) return;
        if (target.verses.some((v) => refToId(v) === refToId(verse))) return;
        await setPlaylistVerses(user.uid, target.id, [...target.verses, toPlaylistVerse(verse)]);
      }
    } catch (err) {
      setError(describeFirestoreError(err as Error));
    }
  };

  const handleCreatePlaylist = async () => {
    const name = newPlaylistName.trim();
    if (!name) return;

    setError(null);
    try {
      const id = await createPlaylist(user.uid, name);
      setNewPlaylistName('');
      selectPlaylist(id);
    } catch (err) {
      setError(describeFirestoreError(err as Error));
    }
  };

  const handleCreateQuiz = async () => {
    const name = newQuizName.trim();
    if (!name) return;

    setError(null);
    try {
      const id = await createQuiz(user.uid, name);
      setNewQuizName('');
      setOpenQuizId(id);
    } catch (err) {
      setError(describeFirestoreError(err as Error));
    }
  };

  const commitQuizRename = async (quiz: Quiz) => {
    const next = (quizNameDraft ?? '').trim();
    setQuizNameDraft(null);
    if (!next || next === quiz.name) return;

    setError(null);
    try {
      await renameQuiz(user.uid, quiz.id, next);
    } catch (err) {
      setError(describeFirestoreError(err as Error));
    }
  };

  const commitRename = async (playlist: Playlist) => {
    const next = (nameDraft ?? '').trim();
    setNameDraft(null);
    if (!next || next === playlist.name) return;

    setError(null);
    try {
      await renamePlaylist(user.uid, playlist.id, next);
    } catch (err) {
      setError(describeFirestoreError(err as Error));
    }
  };

  const moveVerse = async (playlist: Playlist, index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= playlist.verses.length) return;

    const next = [...playlist.verses];
    [next[index], next[target]] = [next[target], next[index]];

    setError(null);
    try {
      await setPlaylistVerses(user.uid, playlist.id, next);
    } catch (err) {
      setError(describeFirestoreError(err as Error));
    }
  };

  const pickerExistingIds =
    pickerFor?.kind === 'playlist'
      ? new Set((playlists.find((p) => p.id === pickerFor.id)?.verses ?? []).map(refToId))
      : savedIds;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-6 py-10">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl border border-iron-800 bg-soot-900/70 px-4 py-2 text-xs font-black text-ash-200 hover:bg-iron-800/40"
        >
          <ArrowLeft size={16} className="text-gold-400" />
          MENU
        </button>
        <div className="stamp">Profile</div>
      </div>

      <div className="mt-6">
        <IdentityCard
          profile={userProfile}
          fallbackName={user.displayName || (user.email ? user.email.split('@')[0] : '')}
          email={user.email ?? null}
          onSaveUsername={handleSaveUsername}
          onSaveAvatar={handleSaveAvatar}
        />
      </div>

      <div className="mt-4">
        <StatsPanel stats={stats} />
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2 rounded-2xl border border-iron-800 bg-soot-900/70 p-1.5">
        <button
          type="button"
          onClick={() => setTab('passages')}
          className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-[11px] font-black uppercase tracking-[0.15em] transition-colors ${
            tab === 'passages'
              ? 'bg-gold-500/15 text-gold-300 shadow-[0_0_0_1px_rgba(255,120,60,0.25)]'
              : 'bg-soot-950/60 text-ash-500 hover:bg-iron-800/40'
          }`}
        >
          <BookmarkPlus size={15} />
          Passages
        </button>
        <button
          type="button"
          onClick={() => setTab('playlists')}
          className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-[11px] font-black uppercase tracking-[0.15em] transition-colors ${
            tab === 'playlists'
              ? 'bg-gold-500/15 text-gold-300 shadow-[0_0_0_1px_rgba(255,120,60,0.25)]'
              : 'bg-soot-950/60 text-ash-500 hover:bg-iron-800/40'
          }`}
        >
          <ListMusic size={15} />
          Playlists
        </button>
        <button
          type="button"
          onClick={() => setTab('quizzes')}
          className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-[11px] font-black uppercase tracking-[0.15em] transition-colors ${
            tab === 'quizzes'
              ? 'bg-gold-500/15 text-gold-300 shadow-[0_0_0_1px_rgba(255,120,60,0.25)]'
              : 'bg-soot-950/60 text-ash-500 hover:bg-iron-800/40'
          }`}
        >
          <SquarePen size={15} />
          Quizzes
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="mt-4 rounded-3xl border border-gold-500/20 bg-soot-900/80 p-2 shadow-2xl ">
        <div className="rounded-2xl border border-iron-800/60 bg-soot-900/70 p-6">
          {tab === 'passages' && (
            <div>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-xs font-bold uppercase tracking-[0.35em] text-ash-600">
                  SAVED PASSAGES
                </div>
                <button
                  type="button"
                  onClick={() => setPickerFor({ kind: 'passages' })}
                  className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest"
                >
                  <Plus size={14} /> Add
                </button>
              </div>

              {loading ? (
                <div className="py-10 text-center text-sm text-ash-600">Loading…</div>
              ) : passages.length === 0 ? (
                <div className="py-10 text-center text-sm text-ash-600">
                  No saved passages yet. Add one to start your collection.
                </div>
              ) : (
                <div className="space-y-2">
                  {passages.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-start gap-3 rounded-2xl border border-iron-800/60 bg-soot-900/50 p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-black uppercase tracking-widest text-gold-400">
                          {p.reference}
                        </div>
                        <div className="mt-1 text-sm text-ash-300">{p.text}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePassage(user.uid, p).catch((e) => setError(describeFirestoreError(e)))}
                        aria-label={`Remove ${p.reference}`}
                        className="shrink-0 rounded-lg border border-iron-800 p-2 text-ash-500 hover:border-red-500/40 hover:text-red-300"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'playlists' && !openPlaylist && (
            <div>
              <div className="mb-4 text-xs font-bold uppercase tracking-[0.35em] text-ash-600">
                VERSE PLAYLISTS
              </div>

              <div className="mb-4 flex gap-2">
                <input
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreatePlaylist();
                  }}
                  placeholder="New playlist name"
                  className="flex-1 rounded-xl border border-iron-800 bg-soot-950/60 p-3 text-white outline-none focus:border-gold-500/60"
                />
                <button
                  type="button"
                  onClick={handleCreatePlaylist}
                  disabled={!newPlaylistName.trim()}
                  className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus size={14} /> Create
                </button>
              </div>

              {playlists.length === 0 ? (
                <div className="py-10 text-center text-sm text-ash-600">
                  No playlists yet. Name one above to get started.
                </div>
              ) : (
                <div className="space-y-2">
                  {playlists.map((pl) => (
                    <button
                      key={pl.id}
                      type="button"
                      onClick={() => selectPlaylist(pl.id)}
                      className="flex w-full items-center justify-between rounded-2xl border border-iron-800/60 bg-soot-900/50 px-4 py-4 text-left hover:border-gold-500/30 hover:bg-iron-800/40"
                    >
                      <div>
                        <div className="font-black text-white">{pl.name}</div>
                        <div className="text-xs text-ash-500">
                          {pl.verses.length} {pl.verses.length === 1 ? 'verse' : 'verses'}
                        </div>
                      </div>
                      <div className="text-xs font-black uppercase tracking-[0.25em] text-ash-600">
                        OPEN
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'playlists' && openPlaylist && (
            <div>
              <button
                type="button"
                onClick={() => selectPlaylist(null)}
                className="mb-4 inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-ash-500 hover:text-gold-400"
              >
                <ArrowLeft size={14} /> All playlists
              </button>

              <div className="mb-4 flex flex-wrap items-center gap-2">
                {/* Renames commit on blur or Enter, not on keystroke — otherwise typing a name
                    would fire one Firestore write per character. */}
                <input
                  value={nameDraft ?? openPlaylist.name}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onBlur={() => commitRename(openPlaylist)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                    if (e.key === 'Escape') setNameDraft(null);
                  }}
                  className="flex-1 rounded-xl border border-iron-800 bg-soot-950/60 p-3 text-lg font-black text-white outline-none focus:border-gold-500/60"
                />
                <button
                  type="button"
                  onClick={() => setPickerFor({ kind: 'playlist', id: openPlaylist.id })}
                  className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest"
                >
                  <Plus size={14} /> Add verse
                </button>
                <button
                  type="button"
                  onClick={() => {
                    selectPlaylist(null);
                    deletePlaylist(user.uid, openPlaylist.id).catch((err) =>
                      setError(describeFirestoreError(err)),
                    );
                  }}
                  aria-label="Delete playlist"
                  className="rounded-xl border border-iron-800 p-3 text-ash-500 hover:border-red-500/40 hover:text-red-300"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {openPlaylist.verses.length === 0 ? (
                <div className="py-10 text-center text-sm text-ash-600">
                  This playlist is empty. Add a verse to build it up.
                </div>
              ) : (
                <div className="space-y-2">
                  {openPlaylist.verses.map((v, index) => (
                    <div
                      key={refToId(v)}
                      className="flex items-start gap-3 rounded-2xl border border-iron-800/60 bg-soot-900/50 p-4"
                    >
                      <div className="flex shrink-0 flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => moveVerse(openPlaylist, index, -1)}
                          disabled={index === 0}
                          aria-label="Move up"
                          className="rounded border border-iron-800 p-1 text-ash-500 hover:text-gold-400 disabled:opacity-30"
                        >
                          <ChevronUp size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveVerse(openPlaylist, index, 1)}
                          disabled={index === openPlaylist.verses.length - 1}
                          aria-label="Move down"
                          className="rounded border border-iron-800 p-1 text-ash-500 hover:text-gold-400 disabled:opacity-30"
                        >
                          <ChevronDown size={12} />
                        </button>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-black uppercase tracking-widest text-gold-400">
                          {v.reference}
                        </div>
                        <div className="mt-1 text-sm text-ash-300">{v.text}</div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setPlaylistVerses(
                            user.uid,
                            openPlaylist.id,
                            openPlaylist.verses.filter((x) => refToId(x) !== refToId(v)),
                          ).catch((err) => setError(describeFirestoreError(err)))
                        }
                        aria-label={`Remove ${v.reference}`}
                        className="shrink-0 rounded-lg border border-iron-800 p-2 text-ash-500 hover:border-red-500/40 hover:text-red-300"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'quizzes' && playingQuiz && (
            <QuizPlayer quiz={playingQuiz} onExit={() => setPlayingQuizId(null)} />
          )}

          {tab === 'quizzes' && !playingQuiz && !editingQuiz && (
            <div>
              <div className="mb-4 text-xs font-bold uppercase tracking-[0.35em] text-ash-600">
                CUSTOM QUIZZES
              </div>

              <div className="mb-4 flex gap-2">
                <input
                  value={newQuizName}
                  onChange={(e) => setNewQuizName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateQuiz();
                  }}
                  placeholder="New quiz name"
                  className="flex-1 rounded-xl border border-iron-800 bg-soot-950/60 p-3 text-white outline-none focus:border-gold-500/60"
                />
                <button
                  type="button"
                  onClick={handleCreateQuiz}
                  disabled={!newQuizName.trim()}
                  className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus size={14} /> Create
                </button>
              </div>

              {quizzes.length === 0 ? (
                <div className="py-10 text-center text-sm text-ash-600">
                  No quizzes yet. Name one above, then write your own questions and answers.
                </div>
              ) : (
                <div className="space-y-2">
                  {quizzes.map((quiz) => {
                    const problem = validateQuiz(quiz);

                    return (
                      <div
                        key={quiz.id}
                        className="flex items-center gap-3 rounded-2xl border border-iron-800/60 bg-soot-900/50 px-4 py-4"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-black text-white">{quiz.name}</div>
                          <div className="text-xs text-ash-500">
                            {quiz.questions.length}{' '}
                            {quiz.questions.length === 1 ? 'question' : 'questions'}
                            {problem && <span className="text-amber-400"> · {problem}</span>}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setPlayingQuizId(quiz.id)}
                          disabled={!!problem}
                          title={problem ?? 'Play this quiz'}
                          className="btn-primary inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest disabled:cursor-not-allowed disabled:border-iron-800 disabled:bg-iron-800/40 disabled:text-ash-600"
                        >
                          <Play size={14} /> Play
                        </button>

                        <button
                          type="button"
                          onClick={() => setOpenQuizId(quiz.id)}
                          aria-label={`Edit ${quiz.name}`}
                          className="shrink-0 rounded-lg border border-iron-800 p-2 text-ash-500 hover:border-gold-500/40 hover:text-gold-400"
                        >
                          <SquarePen size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteQuiz(user.uid, quiz.id).catch((err) =>
                              setError(describeFirestoreError(err)),
                            )
                          }
                          aria-label={`Delete ${quiz.name}`}
                          className="shrink-0 rounded-lg border border-iron-800 p-2 text-ash-500 hover:border-red-500/40 hover:text-red-300"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'quizzes' && !playingQuiz && editingQuiz && (
            <div>
              <div className="mb-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={closeQuizEditor}
                  className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-ash-500 hover:text-gold-400"
                >
                  <ArrowLeft size={14} /> All quizzes
                </button>

                <div className="text-xs font-black uppercase tracking-widest text-ash-600">
                  {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : ''}
                </div>
              </div>

              <div className="mb-4 flex flex-wrap items-center gap-2">
                <input
                  value={quizNameDraft ?? editingQuiz.name}
                  onChange={(e) => setQuizNameDraft(e.target.value)}
                  onBlur={() => commitQuizRename(editingQuiz)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                    if (e.key === 'Escape') setQuizNameDraft(null);
                  }}
                  className="flex-1 rounded-xl border border-iron-800 bg-soot-950/60 p-3 text-lg font-black text-white outline-none focus:border-gold-500/60"
                />
                <button
                  type="button"
                  onClick={() => {
                    closeQuizEditor();
                    setPlayingQuizId(editingQuiz.id);
                  }}
                  disabled={!!validateQuiz(editingQuiz)}
                  title={validateQuiz(editingQuiz) ?? 'Play this quiz'}
                  className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest disabled:cursor-not-allowed disabled:border-iron-800 disabled:bg-iron-800/40 disabled:text-ash-600"
                >
                  <Play size={14} /> Play
                </button>
              </div>

              <QuizBuilder quiz={editingQuiz} onChange={handleQuestionsChange} />
            </div>
          )}
        </div>
      </div>

      <VersePickerHost
        pickerFor={pickerFor}
        existingIds={pickerExistingIds}
        onClose={() => setPickerFor(null)}
        onSelect={handleAddVerse}
      />
    </div>
  );
};

/** Kept separate so the picker's Bible fetch isn't torn down on every ProfilePage re-render. */
const VersePickerHost: React.FC<{
  pickerFor: null | { kind: 'passages' } | { kind: 'playlist'; id: string };
  existingIds: Set<string>;
  onClose: () => void;
  onSelect: (verse: Verse) => Promise<void>;
}> = ({ pickerFor, existingIds, onClose, onSelect }) => (
  <VersePicker
    isOpen={pickerFor !== null}
    onClose={onClose}
    onSelect={onSelect}
    existingIds={existingIds}
    actionLabel={pickerFor?.kind === 'playlist' ? 'ADD' : 'SAVE'}
    title={pickerFor?.kind === 'playlist' ? 'Add verse to playlist' : 'Save a passage'}
  />
);

/**
 * Firestore's permission-denied is the error users will actually hit if the security rules
 * aren't deployed, so it gets a message that points at the real cause.
 */
function describeFirestoreError(err: Error & { code?: string }): string {
  if (err?.code === 'permission-denied') {
    return 'Permission denied by Firestore. The security rules for profile data may not be deployed yet.';
  }
  return err?.message || 'Something went wrong.';
}

export default ProfilePage;
