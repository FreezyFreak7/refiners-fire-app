import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle,
  ChevronRight,
  Home,
  Layers,
  Plus,
  Search,
  XCircle,
} from 'lucide-react';
import niv1984Canonical from '../../../data/niv1984.canonical.json';

interface MemoryGameProps {
  onBack: () => void;
  isMember: boolean;
  initialSetId?: 'old_testament' | 'gospels' | 'new_testament' | 'alpha_omega';
}

type VerseRecord = {
  ref: string;
  text: string;
};

type CustomCollection = {
  id: string;
  title: string;
  verses: VerseRecord[];
};

type BibleData = Record<string, Record<string, Record<string, string>>>;
type VerseLookupResult = { ref: string; text: string };
type GameMode = 'blanks' | 'builder' | 'tf' | 'reference';
type AppState = 'library' | 'menu' | 'playing' | 'finished';

type BlanksQuestion = {
  kind: 'blanks';
  verse: VerseRecord;
  promptWords: string[];
  answers: string[];
  options: string[];
};

type BuilderQuestion = {
  kind: 'builder';
  verse: VerseRecord;
  chunks: string[];
};

type TfQuestion = {
  kind: 'tf';
  verse: VerseRecord;
  statement: string;
  isTrue: boolean;
  explanation: string;
};

type ReferenceQuestion = {
  kind: 'reference';
  verse: VerseRecord;
  prompt: string;
  correct: string;
  options: string[];
};

type Question = BlanksQuestion | BuilderQuestion | TfQuestion | ReferenceQuestion;

type BuilderState = {
  target: string[];
  scrambled: string[];
  selected: string[];
};

const bibleData = niv1984Canonical as BibleData;
const createCollectionId = () => `collection_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const defaultOldTestamentReferences = [
  'Genesis 1:1-5', 'Genesis 12:1-3', 'Exodus 14:13-14', 'Deuteronomy 6:4-9', 'Joshua 1:8-9',
  '1 Samuel 16:7', '2 Chronicles 7:14', 'Job 19:25-27', 'Psalm 1:1-3', 'Psalm 23:1-4',
  'Psalm 46:1-3', 'Psalm 119:105', 'Proverbs 3:5-6', 'Proverbs 30:7-8', 'Ecclesiastes 3:1-8',
  'Isaiah 9:6-7', 'Isaiah 40:28-31', 'Isaiah 53:4-6', 'Jeremiah 29:11-13', 'Lamentations 3:22-23',
  'Ezekiel 36:26-27', 'Daniel 2:44', 'Micah 6:8', 'Habakkuk 2:14', 'Malachi 3:1'
];

const defaultGospelsReferences = [
  'Matthew 5:3-12', 'Matthew 5:13-16', 'Matthew 6:9-13', 'Matthew 6:19-21', 'Matthew 7:7-8',
  'Matthew 11:28-30', 'Matthew 22:37-39', 'Matthew 28:18-20', 'Mark 1:14-15', 'Mark 8:34-35',
  'Mark 10:45', 'Mark 12:29-31', 'Luke 2:10-11', 'Luke 4:18-19', 'Luke 6:27-28',
  'Luke 9:23-24', 'Luke 11:9-10', 'Luke 15:4-7', 'Luke 19:10', 'John 3:16-17',
  'John 4:23-24', 'John 8:12', 'John 10:10-11', 'John 11:25-26', 'John 13:34-35',
  'John 14:1-3', 'John 15:5', 'John 15:12-13', 'John 17:17', 'John 20:31',
  'Matthew 4:4', 'Luke 18:27', 'John 6:35', 'John 7:37-38', 'John 16:13',
];

const defaultNewTestamentReferences = [
  'Acts 1:8', 'Acts 4:12', 'Romans 5:8', 'Romans 8:28', 'Romans 12:1-2',
  '1 Corinthians 10:13', '1 Corinthians 13:4-7', '2 Corinthians 5:17', 'Galatians 2:20', 'Ephesians 2:8-10',
  'Ephesians 4:21-24', 'Philippians 4:6-7', 'Colossians 3:12-14', '1 Thessalonians 4:16-17', '2 Timothy 3:16-17',
  'Hebrews 11:1', 'Hebrews 12:1-2', 'James 1:22', '1 Peter 5:7', '1 John 1:9',
  '1 John 4:7-8', 'Jude 1:24-25', 'Revelation 1:7', 'Revelation 14:12', 'Revelation 22:12-13'
];
const defaultAlphaOmegaReferences = [
  ...defaultOldTestamentReferences,
  ...defaultGospelsReferences,
  ...defaultNewTestamentReferences,
  'Revelation 3:20', 'Revelation 12:10-11', 'Revelation 19:11-16', 'Revelation 21:5-7', 'Revelation 22:17'
];

const shuffleArray = <T,>(items: T[]) => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const generateVersePreview = (text: string) => {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  if (normalized.length <= 110) return normalized;
  return `${normalized.slice(0, 107).trimEnd()}...`;
};

const parseVerseRefParts = (ref: string) => {
  const match = ref.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!match) return null;
  const [, book, chapter, verseStart, verseEnd] = match;
  return { book, chapter, verseStart: Number(verseStart), verseEnd: Number(verseEnd ?? verseStart) };
};

const lookupVerseText = (ref: string): VerseLookupResult | null => {
  const parts = parseVerseRefParts(ref);
  if (!parts) return null;
  const chapterData = bibleData[parts.book]?.[String(parts.chapter)];
  if (!chapterData) return null;
  const verses: string[] = [];
  for (let verse = parts.verseStart; verse <= parts.verseEnd; verse += 1) {
    const verseText = chapterData[String(verse)];
    if (!verseText) return null;
    verses.push(verseText.trim());
  }
  return { ref, text: verses.join(' ') };
};

const buildVerseRecords = (refs: string[]): VerseRecord[] =>
  refs
    .map((ref) => lookupVerseText(ref))
    .filter((verse): verse is VerseLookupResult => verse !== null)
    .map((verse) => ({ ref: verse.ref, text: verse.text }));

const normalizeVerseRef = (raw: string) => {
  const compactInput = raw.trim().replace(/\s+/g, ' ');
  const input = compactInput.replace(/^([123]?[A-Za-z]+)(\d+:\d+)/, '$1 $2');
  if (!input) return '';
  const m = input.match(/^(.*?)\s+(\d+\s*:\s*\d+.*)$/);
  if (!m) return input;
  const rawBook = m[1].replace(/\./g, '').replace(/\s+/g, ' ').trim();
  const rest = m[2].replace(/\s+/g, '').trim();
  const bookKey = rawBook.toLowerCase().replace(/\s+/g, '').replace(/&/g, 'and');
  const bookMap: Record<string, string> = {
    gen: 'Genesis', genesis: 'Genesis', ex: 'Exodus', exodus: 'Exodus', lev: 'Leviticus', leviticus: 'Leviticus',
    num: 'Numbers', numbers: 'Numbers', deut: 'Deuteronomy', deuteronomy: 'Deuteronomy', josh: 'Joshua', joshua: 'Joshua',
    judg: 'Judges', judges: 'Judges', ruth: 'Ruth', '1sam': '1 Samuel', '2sam': '2 Samuel', '1kgs': '1 Kings', '2kgs': '2 Kings',
    ps: 'Psalms', psa: 'Psalms', psalm: 'Psalms', psalms: 'Psalms', prov: 'Proverbs', proverbs: 'Proverbs',
    isa: 'Isaiah', isaiah: 'Isaiah', jer: 'Jeremiah', jeremiah: 'Jeremiah', ezek: 'Ezekiel', ezekiel: 'Ezekiel',
    dan: 'Daniel', daniel: 'Daniel', joel: 'Joel', mic: 'Micah', micah: 'Micah', hab: 'Habakkuk', habakkuk: 'Habakkuk',
    zech: 'Zechariah', zechariah: 'Zechariah', mal: 'Malachi', malachi: 'Malachi', matt: 'Matthew', matthew: 'Matthew', mt: 'Matthew',
    mark: 'Mark', mrk: 'Mark', mk: 'Mark', luke: 'Luke', luk: 'Luke', lk: 'Luke', john: 'John', joh: 'John', jn: 'John',
    acts: 'Acts', rom: 'Romans', romans: 'Romans', '1cor': '1 Corinthians', '2cor': '2 Corinthians', gal: 'Galatians',
    eph: 'Ephesians', phil: 'Philippians', col: 'Colossians', heb: 'Hebrews', james: 'James', jas: 'James',
    '1pet': '1 Peter', '2pet': '2 Peter', '1jn': '1 John', '1john': '1 John', '2jn': '2 John', '3jn': '3 John',
    rev: 'Revelation', revelation: 'Revelation', rv: 'Revelation', '1thess': '1 Thessalonians', '2thess': '2 Thessalonians',
    '2tim': '2 Timothy', '1tim': '1 Timothy', joshuaa: 'Joshua'
  };
  const normalizedBook = bookMap[bookKey] || rawBook;
  return `${normalizedBook} ${rest}`;
};

const createBlankedQuestion = (verse: VerseRecord): BlanksQuestion => {
  const words = verse.text.replace(/\s+/g, ' ').trim().split(' ');
  const meaningfulIndexes = words
    .map((word, index) => ({
      index,
      clean: word.replace(/[^A-Za-z']/g, ''),
    }))
    .filter(({ clean }) => clean.length >= 4);

  const blankCount = meaningfulIndexes.length >= 18 ? 4 : meaningfulIndexes.length >= 10 ? 3 : 2;

  const selectedIndexes = meaningfulIndexes
    .filter(({ index }) => index > 0 && index < words.length - 1)
    .sort((a, b) => b.clean.length - a.clean.length)
    .reduce<number[]>((acc, item) => {
      if (acc.length >= blankCount) return acc;
      if (acc.some((existing) => Math.abs(existing - item.index) <= 1)) return acc;
      acc.push(item.index);
      return acc;
    }, []);

  if (!selectedIndexes.length && words.length) {
    selectedIndexes.push(Math.min(2, Math.max(words.length - 1, 0)));
  }

  const orderedIndexes = [...selectedIndexes].sort((a, b) => a - b);
  const answers = orderedIndexes
    .map((index) => words[index]?.replace(/[^A-Za-z']/g, '') || '')
    .filter(Boolean);
  const promptWords = [...words];
  orderedIndexes.forEach((index, answerIndex) => {
    promptWords[index] = `_____ ${answerIndex + 1}`;
  });

  const distractors = shuffleArray(
    words
      .map((word) => word.replace(/[^A-Za-z']/g, ''))
      .filter(
        (word) =>
          word.length >= 4 &&
          !answers.some((answer) => answer.toLowerCase() === word.toLowerCase())
      )
  );

  while (distractors.length < 12) {
    distractors.push(['faith', 'truth', 'glory', 'spirit', 'kingdom', 'mercy'][distractors.length % 6]);
  }

  return {
    kind: 'blanks',
    verse,
    promptWords,
    answers,
    options: distractors,
  };
};

const createBuilderQuestion = (verse: VerseRecord): BuilderQuestion => {
  const rawChunks = verse.text
    .split(/(?<=[,.;!?])\s+|\s+(?=and\s|for\s|that\s|who\s|because\s)/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  const chunks = rawChunks.length >= 3 ? rawChunks.slice(0, 6) : verse.text.split(/\s+/).reduce<string[]>((acc, word, index) => {
    const bucket = Math.floor(index / 3);
    acc[bucket] = acc[bucket] ? `${acc[bucket]} ${word}` : word;
    return acc;
  }, []).filter(Boolean);
  return { kind: 'builder', verse, chunks };
};

const createTfQuestion = (verse: VerseRecord, index: number, versePool: VerseRecord[]): TfQuestion => {
  const useTrue = index % 2 === 0 || versePool.length < 2;
  if (useTrue) {
    return {
      kind: 'tf',
      verse,
      statement: generateVersePreview(verse.text),
      isTrue: true,
      explanation: `${verse.ref} matches the verse exactly.`,
    };
  }

  const other = versePool[(index + 1) % versePool.length];
  return {
    kind: 'tf',
    verse,
    statement: generateVersePreview(other.text),
    isTrue: false,
    explanation: `That line belongs to ${other.ref}, not ${verse.ref}.`,
  };
};

const createReferenceQuestion = (verse: VerseRecord, versePool: VerseRecord[]): ReferenceQuestion => {
  const distractors = shuffleArray(versePool.filter((item) => item.ref !== verse.ref).map((item) => item.ref)).slice(0, 3);
  while (distractors.length < 3) distractors.push('John 1:1');
  return {
    kind: 'reference',
    verse,
    prompt: generateVersePreview(verse.text),
    correct: verse.ref,
    options: shuffleArray([verse.ref, ...distractors.slice(0, 3)]),
  };
};

const GameifiedMemoryGame: React.FC<MemoryGameProps> = ({ onBack, isMember, initialSetId = 'old_testament' }) => {
  const [customCollections, setCustomCollections] = useState<CustomCollection[]>([]);
  const [activeCustomCollectionId, setActiveCustomCollectionId] = useState<string | null>(null);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [customRef, setCustomRef] = useState('');
  const [customError, setCustomError] = useState('');
  const [selectedVerse, setSelectedVerse] = useState<VerseRecord | null>(null);
  const [showAllVerses, setShowAllVerses] = useState(false);
  const customRefInputRef = useRef<HTMLInputElement | null>(null);

  const [appState, setAppState] = useState<AppState>('menu');
  const [activeSetId, setActiveSetId] = useState<string>(initialSetId);
  const [activeMode, setActiveMode] = useState<GameMode | null>(null);
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [blankGuesses, setBlankGuesses] = useState<string[]>([]);
  const [builderState, setBuilderState] = useState<BuilderState>({ target: [], scrambled: [], selected: [] });

  useEffect(() => {
    try {
      const raw = localStorage.getItem('rf_memory_collections');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const collections = parsed.map((item) => ({
        id: typeof item?.id === 'string' ? item.id : createCollectionId(),
        title: typeof item?.title === 'string' && item.title.trim() ? item.title.trim() : 'My Collection',
        verses: Array.isArray(item?.verses)
          ? item.verses
              .map((verse: any) => {
                const ref = typeof verse?.ref === 'string' ? verse.ref : '';
                const lookup = ref ? lookupVerseText(ref) : null;
                const text = typeof verse?.text === 'string' && verse.text.trim() ? verse.text.trim() : lookup?.text ?? '';
                return ref && text ? { ref, text } : null;
              })
              .filter((verse: VerseRecord | null): verse is VerseRecord => verse !== null)
          : [],
      }));
      setCustomCollections(collections);
      setActiveCustomCollectionId(collections[0]?.id ?? null);
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('rf_memory_collections', JSON.stringify(customCollections));
    } catch {
      // no-op
    }
  }, [customCollections]);

  const sets = useMemo(() => [
    ...customCollections.map((collection) => ({
      id: collection.id,
      title: collection.title,
      subtitle: isMember ? 'Saved collection' : 'Preview collection',
      translation: 'NIV 1984',
      verses: collection.verses,
      isCustom: true,
    })),
    {
      id: 'old_testament',
      title: 'Old Testament Library',
      subtitle: 'Law, wisdom, prophets, and foundational passages',
      translation: 'NIV 1984',
      verses: buildVerseRecords(defaultOldTestamentReferences),
      isCustom: false,
    },
    {
      id: 'gospels',
      title: 'The Gospels Library',
      subtitle: 'Teachings, mission, prayer, and discipleship',
      translation: 'NIV 1984',
      verses: buildVerseRecords(defaultGospelsReferences),
      isCustom: false,
    },
    {
      id: 'new_testament',
      title: 'New Testament Library',
      subtitle: 'Acts, letters, endurance, and church life',
      translation: 'NIV 1984',
      verses: buildVerseRecords(defaultNewTestamentReferences),
      isCustom: false,
    },
    {
      id: 'alpha_omega',
      title: 'Alpha and Omega Library',
      subtitle: 'A mixed run from Genesis to Revelation',
      translation: 'NIV 1984',
      verses: buildVerseRecords(defaultAlphaOmegaReferences),
      isCustom: false,
    },
  ], [customCollections, isMember]);

  const activeSet = sets.find((set) => set.id === activeSetId) ?? sets[0];
  const activeCustomCollection = customCollections.find((collection) => collection.id === activeCustomCollectionId) ?? null;

  const createNamedCollection = () => {
    const title = newCollectionName.trim();
    if (!title) {
      setCustomError('Enter a collection name before saving.');
      return;
    }
    const collection = { id: createCollectionId(), title, verses: [] as VerseRecord[] };
    setCustomCollections((prev) => [collection, ...prev]);
    setActiveCustomCollectionId(collection.id);
    setActiveSetId(collection.id);
    setNewCollectionName('');
    setCustomError('');
    setTimeout(() => customRefInputRef.current?.focus(), 0);
  };

  const addCustomVerse = () => {
    if (!activeCustomCollection) {
      setCustomError('Create or select a collection first.');
      return;
    }
    const ref = normalizeVerseRef(customRef);
    if (!ref) return;
    const lookup = lookupVerseText(ref);
    if (!lookup) {
      setCustomError('Verse not found in the NIV 1984 data.');
      return;
    }
    const nextVerse = { ref: lookup.ref, text: lookup.text };
    setCustomCollections((prev) => prev.map((collection) =>
      collection.id === activeCustomCollection.id
        ? { ...collection, verses: [nextVerse, ...collection.verses.filter((verse) => verse.ref !== nextVerse.ref)] }
        : collection
    ));
    setCustomRef('');
    setCustomError('');
  };

  const initializeBuilder = (question: BuilderQuestion) => {
    setBuilderState({
      target: question.chunks,
      scrambled: shuffleArray([...question.chunks]),
      selected: [],
    });
  };

  const startGame = (mode: GameMode) => {
    if (!activeSet?.verses?.length) return;
    const versePool = shuffleArray(activeSet.verses).slice(0, Math.min(activeSet.verses.length, 12));
    const questions: Question[] = versePool.map((verse, index) => {
      switch (mode) {
        case 'blanks':
          return createBlankedQuestion(verse);
        case 'builder':
          return createBuilderQuestion(verse);
        case 'tf':
          return createTfQuestion(verse, index, versePool);
        case 'reference':
          return createReferenceQuestion(verse, versePool);
      }
    });
    setActiveMode(mode);
    setActiveQuestions(questions);
    setCurrentLevel(0);
    setScore(0);
    setStreak(0);
    setFeedback(null);
    setBlankGuesses([]);
    setAppState('playing');
    if (mode === 'builder' && questions[0]?.kind === 'builder') initializeBuilder(questions[0]);
  };

  const advanceLevel = () => {
    const nextIndex = currentLevel + 1;
    if (nextIndex >= activeQuestions.length) {
      setAppState('finished');
      return;
    }
    setCurrentLevel(nextIndex);
    setFeedback(null);
    setBlankGuesses([]);
    const nextQuestion = activeQuestions[nextIndex];
    if (nextQuestion?.kind === 'builder') initializeBuilder(nextQuestion);
  };

  const handleBlankChoice = (choice: string) => {
    if (feedback || currentQuestion?.kind !== 'blanks') return;

    const expected = currentQuestion.answers[blankGuesses.length];
    if (!expected) return;

    if (choice.toLowerCase() === expected.toLowerCase()) {
      const nextGuesses = [...blankGuesses, expected];
      setBlankGuesses(nextGuesses);

      if (nextGuesses.length === currentQuestion.answers.length) {
        setFeedback('correct');
        setScore((prev) => prev + 10 + streak * 2);
        setStreak((prev) => prev + 1);
        window.setTimeout(advanceLevel, 1100);
      }
      return;
    }

    setFeedback('incorrect');
    setStreak(0);
    window.setTimeout(() => {
      setBlankGuesses([]);
      setFeedback(null);
    }, 1000);
  };

  const handleAnswer = (isCorrect: boolean) => {
    if (feedback) return;
    if (isCorrect) {
      setFeedback('correct');
      setScore((prev) => prev + 10 + streak * 2);
      setStreak((prev) => prev + 1);
      window.setTimeout(advanceLevel, 1100);
      return;
    }
    setFeedback('incorrect');
    setStreak(0);
    window.setTimeout(() => {
      if (activeMode === 'blanks') setFeedback(null);
      else advanceLevel();
    }, 1400);
  };

  const handleBuilderClick = (chunk: string) => {
    if (feedback) return;
    const selected = [...builderState.selected, chunk];
    const scrambled = builderState.scrambled.filter((item, index) => !(item === chunk && index === builderState.scrambled.indexOf(chunk)));
    setBuilderState((prev) => ({ ...prev, selected, scrambled }));
  };

  const handleBuilderUndo = () => {
    if (!builderState.selected.length || feedback) return;
    const last = builderState.selected[builderState.selected.length - 1];
    setBuilderState((prev) => ({
      ...prev,
      selected: prev.selected.slice(0, -1),
      scrambled: [...prev.scrambled, last],
    }));
  };

  const handleBuilderMove = (index: number, direction: -1 | 1) => {
    if (feedback) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= builderState.selected.length) return;
    setBuilderState((prev) => {
      const selected = [...prev.selected];
      [selected[index], selected[nextIndex]] = [selected[nextIndex], selected[index]];
      return { ...prev, selected };
    });
  };

  const handleBuilderConfirm = () => {
    if (feedback || builderState.scrambled.length > 0 || builderState.selected.length === 0) return;
    const isCorrect = builderState.selected.join(' ') === builderState.target.join(' ');
    handleAnswer(isCorrect);
  };

  const currentQuestion = activeQuestions[currentLevel];
  const currentBlankOptions = useMemo(() => {
    if (currentQuestion?.kind !== 'blanks') return [] as string[];
    const expected = currentQuestion.answers[blankGuesses.length];
    if (!expected) return [] as string[];
    const pool = [
      expected,
      ...currentQuestion.options.filter(
        (opt) =>
          opt.toLowerCase() !== expected.toLowerCase() &&
          !blankGuesses.some((guess) => guess.toLowerCase() === opt.toLowerCase())
      ).slice(0, 5),
    ].filter(Boolean) as string[];
    return shuffleArray(pool);
  }, [currentQuestion, blankGuesses]);
  const topRowSets = sets;

  return (
    <div className="min-h-screen text-slate-100 font-sans flex flex-col items-center selection:bg-orange-500 selection:text-white">
      <div className="fixed top-0 left-0 w-full p-4 flex justify-between items-center bg-black/30 backdrop-blur-xl border-b border-white/5 z-50">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 bg-black/30 border border-white/10 rounded-full hover:bg-white/5 transition-colors" title="Back to Main Menu">
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2 cursor-pointer" onClick={onBack}>
            <img src="https://images.squarespace-cdn.com/content/63ceec1f6db7d32cd45a7e8f/37b4821c-9b93-4e5c-beb3-943f7f6d02c9/output-onlinegiftools+%282%29.gif?content-type=image%2Fgif" alt="Fire" className="h-5 w-5 object-contain" />
            <span className="font-black hidden sm:inline text-slate-200 tracking-wide">Refiner's Fire</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {appState === 'playing' && (
            <div className="flex gap-4 text-sm font-mono">
              <div className="flex items-center gap-1 text-orange-400"><Award size={14} /> {score}</div>
              <div className="flex items-center gap-1 text-slate-400"><AlertTriangle size={14} /> {streak}x</div>
            </div>
          )}
          {appState !== 'menu' && (
            <button onClick={onBack} className="p-2 bg-black/30 border border-white/10 rounded-full hover:bg-white/5 transition-colors" title="Back to Main Menu">
              <Home size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="w-full max-w-5xl flex-1 flex flex-col items-center justify-center pt-24 pb-10 px-4">
        {appState === 'library' && (
          <div className="w-full space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-bold text-white">Memory Game</h1>
              <div className="text-xs font-black uppercase tracking-[0.35em] text-slate-500">FULLY GAMEIFIED MEMORY TRAINING</div>
            </div>

            <div className="w-full rounded-3xl border border-orange-500/20 bg-slate-950/50 p-2 shadow-2xl backdrop-blur-xl">
              <div className="rounded-2xl border border-white/5 bg-black/30 p-6 space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-stretch">
                  {topRowSets.map((set) => {
                    const active = set.id === activeSetId;
                    return (
                      <button
                        key={set.id}
                        type="button"
                        onClick={() => {
                          setActiveSetId(set.id);
                          if (set.isCustom) setActiveCustomCollectionId(set.id);
                          setAppState('menu');
                        }}
                        className={`group rounded-2xl border p-3 text-left transition-all ${active ? 'border-orange-500/60 bg-orange-500/10' : 'border-white/5 bg-black/10 hover:border-orange-500/30 hover:bg-white/5'}`}
                      >
                        <div className={`text-[10px] font-black uppercase tracking-[0.25em] ${active ? 'text-orange-300' : 'text-slate-600'}`}>{set.translation}</div>
                        <div className="mt-1 font-black text-white group-hover:text-orange-300">{set.title}</div>
                        <div className="text-[11px] text-slate-400 leading-snug">{set.subtitle}</div>
                        <div className="mt-2 text-[11px] text-slate-500">{set.verses.length} passages</div>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.35em] text-slate-500">CREATE COLLECTION</div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                    <input value={newCollectionName} onChange={(e) => setNewCollectionName(e.target.value)} placeholder="Collection name" className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/30" />
                    <button type="button" onClick={createNamedCollection} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs font-black text-slate-200 hover:bg-white/5">
                      <Plus size={16} className="text-orange-300" /> SAVE COLLECTION
                    </button>
                  </div>
                  {customError && <div className="mt-3 rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-200">{customError}</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {appState === 'menu' && activeSet && (
          <div className="w-full space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <button onClick={onBack} className="inline-flex items-center gap-2 mb-4 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm font-black text-slate-200 transition-colors hover:bg-white/5 hover:border-orange-500/30">
              <ChevronRight className="rotate-180 text-orange-300" size={16} /> Back to Main Menu
            </button>

            <div className="text-center space-y-2 mb-8">
              <h2 className="text-4xl font-black text-white tracking-tight uppercase">{activeSet.title}</h2>
              <p className="text-orange-300 font-mono tracking-widest text-xs uppercase">{activeSet.subtitle}</p>
              <p className="text-slate-500 text-sm mt-2">{activeSet.verses.length} passages loaded</p>

              <div className="flex justify-center">
                <button onClick={() => setShowAllVerses(true)} className="inline-flex items-center gap-2 rounded-2xl border border-orange-500/30 bg-orange-950/30 px-5 py-3 text-sm font-black uppercase tracking-[0.2em] text-orange-200 transition-colors hover:bg-orange-900/40 hover:text-white">
                  <BookOpen size={16} /> View All Loaded Verses
                </button>
              </div>
            </div>

            {activeSet.isCustom && activeCustomCollection && (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs font-black uppercase tracking-[0.35em] text-slate-500">ADD TO COLLECTION</div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                  <input ref={customRefInputRef} value={customRef} onChange={(e) => setCustomRef(e.target.value)} placeholder="Verse reference (e.g., Jn3:16)" className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/30" />
                  <button type="button" onClick={addCustomVerse} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs font-black text-slate-200 hover:bg-white/5">
                    <Plus size={16} className="text-orange-300" /> ADD VERSE
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-3xl border border-orange-500/20 bg-slate-950/50 p-2 shadow-2xl backdrop-blur-xl">
              <div className="rounded-2xl border border-white/5 bg-black/30 p-6 space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => startGame('blanks')} className="col-span-2 sm:col-span-1 group relative bg-black/20 hover:bg-white/5 border border-white/10 p-4 rounded-2xl text-left transition-all hover:border-orange-500/40"><BookOpen className="text-orange-400 mb-2" size={24} /><h3 className="font-black text-white">Fill Blanks</h3></button>
                  <button onClick={() => startGame('builder')} className="col-span-2 sm:col-span-1 group relative bg-black/20 hover:bg-white/5 border border-white/10 p-4 rounded-2xl text-left transition-all hover:border-blue-500/40"><Layers className="text-blue-400 mb-2" size={24} /><h3 className="font-black text-white">Builder</h3></button>
                  <button onClick={() => startGame('tf')} className="col-span-2 sm:col-span-1 group relative bg-black/20 hover:bg-white/5 border border-white/10 p-4 rounded-2xl text-left transition-all hover:border-green-500/40"><CheckCircle className="text-green-400 mb-2" size={24} /><h3 className="font-black text-white">True or Lie</h3></button>
                  <button onClick={() => startGame('reference')} className="col-span-2 sm:col-span-1 group relative bg-black/20 hover:bg-white/5 border border-white/10 p-4 rounded-2xl text-left transition-all hover:border-purple-500/40"><Search className="text-purple-400 mb-2" size={24} /><h3 className="font-black text-white">Reference</h3></button>
                </div>
              </div>
            </div>
          </div>
        )}

        {appState === 'playing' && currentQuestion && (
          <div className="w-full flex flex-col items-center animate-in fade-in duration-500">
            <div className="w-full max-w-xs h-1 bg-slate-800 rounded-full mb-8 overflow-hidden"><div className="h-full bg-orange-500 transition-all duration-500 ease-out" style={{ width: `${(currentLevel / Math.max(activeQuestions.length, 1)) * 100}%` }} /></div>

            {currentQuestion.kind === 'blanks' && (
              <div className="w-full max-w-2xl rounded-3xl border border-orange-500/20 bg-slate-950/50 p-2 shadow-2xl backdrop-blur-xl">
                <div className="rounded-2xl border border-white/5 bg-black/30 p-6 sm:p-8 text-center">
                  <div className="mb-8"><span className="text-orange-400 font-mono text-xs uppercase tracking-widest bg-orange-950/30 px-3 py-1 rounded-full border border-orange-900/50">{currentQuestion.verse.ref}</span></div>
                  <div className="mb-4 text-xs font-black uppercase tracking-[0.35em] text-slate-500">Blank {Math.min(blankGuesses.length + 1, currentQuestion.answers.length)} of {currentQuestion.answers.length}</div>
                  <div className="text-xl sm:text-2xl font-serif text-slate-200 leading-relaxed mb-10">{currentQuestion.promptWords.map((word, index) => {
                    const blankIndex = currentQuestion.promptWords.slice(0, index + 1).filter((item) => item.startsWith('_____')).length - 1;
                    if (!word.startsWith('_____')) return `${word} `;
                    const guessedWord = blankIndex >= 0 ? blankGuesses[blankIndex] : undefined;
                    return `${guessedWord ?? word} `;
                  })}</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{currentBlankOptions.map((opt, i) => <button key={`${opt}-${i}`} onClick={() => handleBlankChoice(opt)} disabled={feedback !== null} className={`p-4 rounded-xl text-lg font-medium border-2 transition-all ${feedback === 'correct' && opt.toLowerCase() === (currentQuestion.answers[blankGuesses.length] || '').toLowerCase() ? 'bg-green-600 border-green-500 text-white' : feedback === 'incorrect' && opt.toLowerCase() === (currentQuestion.answers[blankGuesses.length] || '').toLowerCase() ? 'bg-green-600 border-green-500 text-white opacity-50' : 'bg-slate-700 border-slate-600 hover:border-orange-500'}`}>{opt}</button>)}</div>
                </div>
              </div>
            )}

            {currentQuestion.kind === 'tf' && (
              <div className="w-full max-w-lg bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl text-center">
                <div className="mb-6"><span className="text-green-400 font-mono text-xs uppercase tracking-widest bg-green-950/30 px-3 py-1 rounded-full border border-green-900/50">{currentQuestion.verse.ref}</span></div>
                <h3 className="text-2xl font-serif text-white mb-8 min-h-[100px] flex items-center justify-center">“{currentQuestion.statement}”</h3>
                {feedback && <div className={`mb-6 p-4 rounded-xl text-sm ${feedback === 'correct' ? 'bg-green-900/30 text-green-200' : 'bg-red-900/30 text-red-200'}`}>{feedback === 'correct' ? 'Correct!' : 'Incorrect!'} {feedback === 'incorrect' && currentQuestion.explanation}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => handleAnswer(currentQuestion.isTrue)} disabled={feedback !== null} className="p-6 rounded-2xl border-2 flex flex-col items-center gap-2 bg-slate-700 border-slate-600 hover:border-green-400"><CheckCircle className="w-8 h-8 text-green-400" /><span className="font-bold text-white">TRUE</span></button>
                  <button onClick={() => handleAnswer(!currentQuestion.isTrue)} disabled={feedback !== null} className="p-6 rounded-2xl border-2 flex flex-col items-center gap-2 bg-slate-700 border-slate-600 hover:border-red-400"><XCircle className="w-8 h-8 text-red-400" /><span className="font-bold text-white">FALSE</span></button>
                </div>
              </div>
            )}

            {currentQuestion.kind === 'reference' && (
              <div className="w-full max-w-2xl bg-slate-800 p-6 sm:p-8 rounded-3xl border border-slate-700 shadow-2xl text-center">
                <div className="mb-8"><span className="text-purple-400 font-mono text-xs uppercase tracking-widest bg-purple-950/30 px-3 py-1 rounded-full border border-purple-900/50">Identify Reference</span></div>
                <div className="text-xl sm:text-2xl font-serif text-slate-200 leading-relaxed mb-10">“{currentQuestion.prompt}”</div>
                <div className="grid grid-cols-2 gap-3">{currentQuestion.options.map((opt, i) => <button key={i} onClick={() => handleAnswer(opt === currentQuestion.correct)} disabled={feedback !== null} className="p-4 rounded-xl text-lg font-mono font-bold border-2 bg-slate-700 border-slate-600 hover:border-purple-500">{opt}</button>)}</div>
              </div>
            )}

            {currentQuestion.kind === 'builder' && (
              <div className="w-full max-w-2xl flex flex-col items-center">
                <div className="mb-4 text-sm font-black text-orange-300">{currentQuestion.verse.ref}</div>
                <div className="w-full bg-slate-800 min-h-[160px] p-6 rounded-2xl border-2 border-dashed border-slate-600 mb-6 flex flex-wrap content-start gap-2 relative transition-all">
                  {builderState.selected.map((chunk, i) => <div key={`${chunk}-${i}`} className="inline-flex items-center gap-1 rounded-lg border border-orange-500/30 bg-orange-500/15 px-2 py-2 text-white shadow-lg"><button type="button" onClick={() => handleBuilderMove(i, -1)} disabled={feedback !== null || i === 0} className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-[10px] font-black text-orange-200 disabled:cursor-not-allowed disabled:opacity-30">←</button><span className="px-1 py-1 font-medium">{chunk}</span><button type="button" onClick={() => handleBuilderMove(i, 1)} disabled={feedback !== null || i === builderState.selected.length - 1} className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-[10px] font-black text-orange-200 disabled:cursor-not-allowed disabled:opacity-30">→</button></div>)}
                  {builderState.selected.length > 0 && !feedback && <button onClick={handleBuilderUndo} className="absolute bottom-4 right-4 text-xs text-slate-400 hover:text-white underline">Undo Last</button>}
                </div>
                <div className="mb-3 text-xs font-black uppercase tracking-[0.3em] text-slate-500">Tap words below, then reorder the placed line</div>
                <div className="mb-4 flex items-center gap-3">
                  <button onClick={handleBuilderConfirm} disabled={feedback !== null || builderState.scrambled.length > 0 || builderState.selected.length === 0} className="rounded-2xl border border-orange-400/30 bg-orange-600 px-5 py-3 text-sm font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-40">Confirm</button>
                  {builderState.scrambled.length === 0 && !feedback && <span className="text-xs font-black uppercase tracking-[0.25em] text-orange-300/80">Ready when you are</span>}
                </div>
                <div className="flex flex-wrap justify-center gap-3">{builderState.scrambled.map((chunk, i) => <button key={`${chunk}-${i}`} onClick={() => handleBuilderClick(chunk)} disabled={feedback !== null} className="border border-orange-500/20 bg-slate-700 px-4 py-3 rounded-xl font-medium text-slate-200 shadow-md transition-all hover:border-orange-500 hover:bg-slate-600 active:scale-95">{chunk}</button>)}</div>
              </div>
            )}
          </div>
        )}

        {appState === 'finished' && (
          <div className="max-w-md w-full bg-slate-800 p-8 rounded-2xl border border-white/10 text-center space-y-6 animate-in zoom-in duration-300">
            <Award className="w-16 h-16 text-yellow-400 mx-auto" />
            <h2 className="text-3xl font-bold">Run Complete!</h2>
            <div className="py-4 bg-slate-900/50 rounded-xl"><div className="text-sm text-slate-400">Score</div><div className="text-4xl font-black text-white">{score}</div></div>
            <button onClick={() => setAppState('menu')} className="w-full py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-200">Continue</button>
          </div>
        )}
      </div>

      {selectedVerse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/80" onClick={() => setSelectedVerse(null)} aria-label="Close verse modal" />
          <div className="relative w-full max-w-2xl rounded-2xl border border-orange-500/30 bg-slate-950/85 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <div>
                <div className="text-sm font-bold tracking-widest text-slate-200">VERSE</div>
                <div className="mt-1 text-lg font-black text-white">{selectedVerse.ref}</div>
              </div>
              <button type="button" onClick={() => setSelectedVerse(null)} className="rounded-lg px-3 py-1 text-xs font-bold text-slate-300 hover:bg-white/5">CLOSE</button>
            </div>
            <div className="p-4 space-y-4">
              <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm leading-7 text-slate-100">{selectedVerse.text}</div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs font-black uppercase tracking-[0.35em] text-slate-500">PREVIEW</div>
                <div className="mt-2 text-sm text-slate-300">{generateVersePreview(selectedVerse.text)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAllVerses && activeSet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/80" onClick={() => setShowAllVerses(false)} aria-label="Close loaded verses modal" />
          <div className="relative w-full max-w-4xl rounded-2xl border border-orange-500/30 bg-slate-950/90 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <div>
                <div className="text-sm font-bold tracking-widest text-slate-200">LOADED VERSES</div>
                <div className="mt-1 text-lg font-black text-white">{activeSet.title}</div>
                <div className="text-xs text-slate-400">{activeSet.verses.length} passages loaded</div>
              </div>
              <button type="button" onClick={() => setShowAllVerses(false)} className="rounded-lg px-3 py-1 text-xs font-bold text-slate-300 hover:bg-white/5">CLOSE</button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {activeSet.verses.map((verse) => (
                  <button key={verse.ref} type="button" onClick={() => { setShowAllVerses(false); setSelectedVerse(verse); }} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-left transition-colors hover:bg-white/5 hover:border-orange-500/30">
                    <div className="text-sm font-black text-slate-100">{verse.ref}</div>
                    <div className="mt-1 text-xs leading-snug text-slate-400">{generateVersePreview(verse.text)}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameifiedMemoryGame;
