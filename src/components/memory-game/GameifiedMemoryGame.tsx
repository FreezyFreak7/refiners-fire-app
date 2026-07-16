import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  BookOpen,
  ChevronRight,
  Flame,
  Home,
  Layers,
  Plus,
  Search,
} from 'lucide-react';
import { loadBible, type BibleData } from '../../utils/bible';
import { sectionsFor, type LibrarySection } from '../../data/libraries';

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

type VerseLookupResult = { ref: string; text: string };
type GameMode = 'blanks' | 'builder' | 'reference';
type AppState = 'library' | 'sectionSelect' | 'bookSelect' | 'menu' | 'difficulty' | 'playing' | 'finished';

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

type ReferenceQuestion = {
  kind: 'reference';
  verse: VerseRecord;
  prompt: string;
  correct: string;
  options: string[];
};

type Question = BlanksQuestion | BuilderQuestion | ReferenceQuestion;

type BuilderState = {
  target: string[];
  scrambled: string[];
  selected: string[];
};

const createCollectionId = () => `collection_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

type BookSlices = {
  all: string[];
  oldTestament: string[];
  newTestament: string[];
  gospels: string[];
};

// Canonical book order so each library can draw at random from the right slice of Scripture.
// Derived once the Bible has loaded, rather than at import time — the text is fetched on demand
// instead of being compiled into the bundle.
const sliceBooks = (data: BibleData): BookSlices => {
  const all = Object.keys(data);
  return {
    all,
    oldTestament: all.slice(0, 39),
    newTestament: all.slice(39),
    gospels: ['Matthew', 'Mark', 'Luke', 'John'].filter((book) => book in data),
  };
};

const EMPTY_SLICES: BookSlices = { all: [], oldTestament: [], newTestament: [], gospels: [] };

type Difficulty = 'easy' | 'normal' | 'sealed';

type DifficultySettings = {
  label: string;
  blurb: string;
  accent: string;
  blanks: number;
  options: number;
  refOptions: number;
  wordsPerChunk: number;
  minWords: number;
  maxWords: number;
};

const difficultyConfig: Record<Difficulty, DifficultySettings> = {
  easy: {
    label: 'Easy',
    blurb: 'Shorter verses, fewer blanks, more help.',
    accent: 'green',
    blanks: 1,
    options: 4,
    refOptions: 3,
    wordsPerChunk: 4,
    minWords: 6,
    maxWords: 18,
  },
  normal: {
    label: 'Normal',
    blurb: 'A balanced run for steady practice.',
    accent: 'orange',
    blanks: 2,
    options: 5,
    refOptions: 4,
    wordsPerChunk: 3,
    minWords: 8,
    maxWords: 30,
  },
  sealed: {
    label: 'Sealed',
    blurb: 'Longer verses, maximum blanks, no mercy.',
    accent: 'red',
    blanks: 4,
    options: 6,
    refOptions: 6,
    wordsPerChunk: 2,
    minWords: 14,
    maxWords: 70,
  },
};

const modeLabels: Record<GameMode, string> = {
  blanks: 'Fill Blanks',
  builder: 'Builder',
  reference: 'Reference',
};

const countWords = (text: string) => text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length;

// Draw `count` random single verses from the given books, preferring verses inside the
// requested word-length window so the difficulty actually changes how hard the round feels.
const sampleRandomVerses = (bibleData: BibleData, books: string[], count: number, minWords: number, maxWords: number): VerseRecord[] => {
  const results: VerseRecord[] = [];
  const seen = new Set<string>();
  const pool = books.filter((book) => bibleData[book]);
  if (!pool.length) return results;

  const tryPick = (enforceWindow: boolean) => {
    const book = pool[Math.floor(Math.random() * pool.length)];
    const chapters = bibleData[book];
    const chapterKeys = Object.keys(chapters);
    const chapter = chapterKeys[Math.floor(Math.random() * chapterKeys.length)];
    const verseKeys = Object.keys(chapters[chapter]);
    const verse = verseKeys[Math.floor(Math.random() * verseKeys.length)];
    const ref = `${book} ${chapter}:${verse}`;
    if (seen.has(ref)) return;
    const text = chapters[chapter][verse].replace(/\s+/g, ' ').trim();
    if (!text) return;
    const words = countWords(text);
    if (enforceWindow && (words < minWords || words > maxWords)) return;
    if (words < 4) return; // too short for any game mode
    seen.add(ref);
    results.push({ ref, text });
  };

  let attempts = 0;
  while (results.length < count && attempts < count * 80) {
    attempts += 1;
    tryPick(true);
  }
  // Relax the length window if the strict pass came up short, so a round never starts empty.
  attempts = 0;
  while (results.length < count && attempts < count * 80) {
    attempts += 1;
    tryPick(false);
  }
  return results;
};

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

const lookupVerseText = (bibleData: BibleData, ref: string): VerseLookupResult | null => {
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

const buildVerseRecords = (bibleData: BibleData, refs: string[]): VerseRecord[] =>
  refs
    .map((ref) => lookupVerseText(bibleData, ref))
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

const createBlankedQuestion = (verse: VerseRecord, targetBlanks: number): BlanksQuestion => {
  const words = verse.text.replace(/\s+/g, ' ').trim().split(' ');
  const meaningfulIndexes = words
    .map((word, index) => ({
      index,
      clean: word.replace(/[^A-Za-z']/g, ''),
    }))
    .filter(({ clean }) => clean.length >= 4);

  const blankCount = Math.max(1, Math.min(targetBlanks, meaningfulIndexes.length || 1));

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

const createBuilderQuestion = (verse: VerseRecord, wordsPerChunk: number): BuilderQuestion => {
  const size = Math.max(1, wordsPerChunk);
  const chunks = verse.text
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .reduce<string[]>((acc, word, index) => {
      const bucket = Math.floor(index / size);
      acc[bucket] = acc[bucket] ? `${acc[bucket]} ${word}` : word;
      return acc;
    }, [])
    .filter(Boolean);
  return { kind: 'builder', verse, chunks };
};

const createReferenceQuestion =(verse: VerseRecord, versePool: VerseRecord[], optionCount: number): ReferenceQuestion => {
  const distractorCount = Math.max(1, optionCount - 1);
  const distractors = shuffleArray(versePool.filter((item) => item.ref !== verse.ref).map((item) => item.ref)).slice(0, distractorCount);
  while (distractors.length < distractorCount) distractors.push(`John ${distractors.length + 1}:1`);
  return {
    kind: 'reference',
    verse,
    prompt: generateVersePreview(verse.text),
    correct: verse.ref,
    options: shuffleArray([verse.ref, ...distractors.slice(0, distractorCount)]),
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

  // Sectioned libraries open on their section list; the rest go straight to mode selection.
  const [appState, setAppState] = useState<AppState>(sectionsFor(initialSetId) ? 'sectionSelect' : 'menu');
  const [activeSetId, setActiveSetId] = useState<string>(initialSetId);

  // The chosen slice of Scripture: a section, and optionally one book inside it. `null` book means
  // the whole section. Both null for libraries with no sections (e.g. Alpha & Omega).
  const [selectedSection, setSelectedSection] = useState<LibrarySection | null>(null);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<GameMode | null>(null);
  const [pendingMode, setPendingMode] = useState<GameMode | null>(null);
  const [activeDifficulty, setActiveDifficulty] = useState<Difficulty>('normal');
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [missedCurrent, setMissedCurrent] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [blankGuesses, setBlankGuesses] = useState<string[]>([]);
  const [builderState, setBuilderState] = useState<BuilderState>({ target: [], scrambled: [], selected: [] });

  // The Bible is fetched once from public/ rather than bundled, so it arrives asynchronously.
  const [bibleData, setBibleData] = useState<BibleData | null>(null);
  const [bibleError, setBibleError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadBible()
      .then((data) => {
        if (!cancelled) setBibleData(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setBibleError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const books = useMemo(() => (bibleData ? sliceBooks(bibleData) : EMPTY_SLICES), [bibleData]);

  useEffect(() => {
    // Stored collections keep only refs, so verse text is rehydrated from the Bible once it lands.
    if (!bibleData) return;

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
                const lookup = ref ? lookupVerseText(bibleData, ref) : null;
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
  }, [bibleData]);

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
      random: false,
      books: [] as string[],
    })),
    {
      id: 'old_testament',
      title: 'Old Testament Library',
      subtitle: 'Random draw from Genesis to Malachi',
      translation: 'NIV 1984',
      verses: [] as VerseRecord[],
      isCustom: false,
      random: true,
      books: books.oldTestament,
    },
    {
      id: 'gospels',
      title: 'The Gospels Library',
      subtitle: 'Random draw from Matthew, Mark, Luke & John',
      translation: 'NIV 1984',
      verses: [] as VerseRecord[],
      isCustom: false,
      random: true,
      books: books.gospels,
    },
    {
      id: 'new_testament',
      title: 'New Testament Library',
      subtitle: 'Random draw from Matthew to Revelation',
      translation: 'NIV 1984',
      verses: [] as VerseRecord[],
      isCustom: false,
      random: true,
      books: books.newTestament,
    },
    {
      id: 'alpha_omega',
      title: 'Alpha and Omega Library',
      subtitle: 'Random draw from Genesis to Revelation',
      translation: 'NIV 1984',
      verses: [] as VerseRecord[],
      isCustom: false,
      random: true,
      books: books.all,
    },
  ], [customCollections, isMember, books]);

  const activeSet = sets.find((set) => set.id === activeSetId) ?? sets[0];
  const activeCustomCollection = customCollections.find((collection) => collection.id === activeCustomCollectionId) ?? null;

  const activeSections = sectionsFor(activeSetId);

  // What a round actually draws from: a single book, a section, or the whole library.
  const activeBooks = selectedBook
    ? [selectedBook]
    : selectedSection
      ? selectedSection.books
      : activeSet.books;

  // What to call it on the mode screen.
  const activeScopeTitle = selectedBook ?? selectedSection?.title ?? activeSet.title;
  const activeScopeRange = selectedBook
    ? `${selectedSection?.title ?? ''}`
    : selectedSection?.range ?? activeSet.subtitle;

  const openSection = (section: LibrarySection) => {
    setSelectedSection(section);
    // A one-book section has nothing to choose — go straight to the modes.
    if (section.books.length === 1) {
      setSelectedBook(section.books[0]);
      setAppState('menu');
    } else {
      setSelectedBook(null);
      setAppState('bookSelect');
    }
  };

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
    if (!bibleData) {
      setCustomError('The Bible text is still loading. Try again in a moment.');
      return;
    }
    const lookup = lookupVerseText(bibleData, ref);
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

  const selectMode = (mode: GameMode) => {
    if (!activeSet) return;
    setPendingMode(mode);
    setAppState('difficulty');
  };

  const startGame = (mode: GameMode, difficulty: Difficulty) => {
    if (!activeSet) return;
    const cfg = difficultyConfig[difficulty];

    // Random libraries pull a fresh draw from Scripture each round, narrowed to the chosen book or
    // section; custom collections use their saved verses.
    const versePool = activeSet.random
      ? bibleData
        ? sampleRandomVerses(bibleData, activeBooks, 10, cfg.minWords, cfg.maxWords)
        : []
      : shuffleArray(activeSet.verses).slice(0, Math.min(activeSet.verses.length, 12));

    if (!versePool.length) return;

    const questions: Question[] = versePool.map((verse) => {
      switch (mode) {
        case 'blanks':
          return createBlankedQuestion(verse, cfg.blanks);
        case 'builder':
          return createBuilderQuestion(verse, cfg.wordsPerChunk);
        case 'reference':
          return createReferenceQuestion(verse, versePool, cfg.refOptions);
      }
    });
    setActiveMode(mode);
    setActiveDifficulty(difficulty);
    setActiveQuestions(questions);
    setCurrentLevel(0);
    setScore(0);
    setStreak(0);
    setCorrectCount(0);
    setBestStreak(0);
    setMissedCurrent(false);
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
    setMissedCurrent(false);
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
        const nextStreak = streak + 1;
        setStreak(nextStreak);
        setBestStreak((prev) => Math.max(prev, nextStreak));
        if (!missedCurrent) setCorrectCount((prev) => prev + 1);
        window.setTimeout(advanceLevel, 1100);
      }
      return;
    }

    setFeedback('incorrect');
    setStreak(0);
    setMissedCurrent(true);
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
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setBestStreak((prev) => Math.max(prev, nextStreak));
      if (!missedCurrent) setCorrectCount((prev) => prev + 1);
      window.setTimeout(advanceLevel, 1100);
      return;
    }
    setFeedback('incorrect');
    setStreak(0);
    setMissedCurrent(true);
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
      ).slice(0, Math.max(1, difficultyConfig[activeDifficulty].options - 1)),
    ].filter(Boolean) as string[];
    return shuffleArray(pool);
  }, [currentQuestion, blankGuesses, activeDifficulty]);
  const topRowSets = sets;

  // Every library and every game mode needs the Bible text, so hold the screen until it lands
  // rather than letting Start silently do nothing.
  if (!bibleData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-ash-200">
        <button
          onClick={onBack}
          className="absolute left-4 top-4 rounded-full border border-iron-800 bg-soot-900/70 p-2 hover:bg-iron-800/40"
          title="Back to Main Menu"
        >
          <ArrowLeft size={16} />
        </button>

        {bibleError ? (
          <div className="max-w-sm rounded-2xl border border-red-500/30 bg-red-950/30 p-4 text-center text-sm text-red-200">
            {bibleError}
          </div>
        ) : (
          <>
            <Flame size={28} className="animate-pulse text-gold-400" />
            <div className="text-xs font-black uppercase tracking-[0.35em] text-ash-500">
              Loading Scripture…
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen text-ash-200 font-sans flex flex-col items-center selection:bg-gold-500 selection:text-soot-950">
      <div className="fixed top-0 left-0 w-full p-4 flex justify-between items-center bg-soot-900/70 border-b border-iron-800/60 z-50">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 bg-soot-900/70 border border-iron-800 rounded-full hover:bg-iron-800/40 transition-colors" title="Back to Main Menu">
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2 cursor-pointer" onClick={onBack}>
            <img src="https://images.squarespace-cdn.com/content/63ceec1f6db7d32cd45a7e8f/37b4821c-9b93-4e5c-beb3-943f7f6d02c9/output-onlinegiftools+%282%29.gif?content-type=image%2Fgif" alt="Fire" className="h-5 w-5 object-contain" />
            <span className="font-black hidden sm:inline text-ash-200 tracking-wide">Refiner's Fire</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {appState === 'playing' && (
            <div className="flex gap-4 text-sm font-mono">
              <div className="flex items-center gap-1 text-gold-400"><Award size={14} /> {score}</div>
              <div className="flex items-center gap-1 text-ash-500"><AlertTriangle size={14} /> {streak}x</div>
            </div>
          )}
          {appState !== 'menu' && (
            <button onClick={onBack} className="p-2 bg-soot-900/70 border border-iron-800 rounded-full hover:bg-iron-800/40 transition-colors" title="Back to Main Menu">
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
              <div className="text-xs font-black uppercase tracking-[0.35em] text-ash-600">FULLY GAMEIFIED MEMORY TRAINING</div>
            </div>

            <div className="w-full rounded-3xl border border-gold-500/20 bg-soot-900/80 p-2 shadow-2xl ">
              <div className="rounded-2xl border border-iron-800/60 bg-soot-900/70 p-6 space-y-6">
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
                          // Switching library resets the slice, and sectioned ones start there.
                          setSelectedSection(null);
                          setSelectedBook(null);
                          setAppState(sectionsFor(set.id) ? 'sectionSelect' : 'menu');
                        }}
                        className={`group rounded-2xl border p-3 text-left transition-all ${active ? 'border-gold-500/60 bg-gold-500/10' : 'border-iron-800/60 bg-soot-900/30 hover:border-gold-500/30 hover:bg-iron-800/40'}`}
                      >
                        <div className={`text-[10px] font-black uppercase tracking-[0.25em] ${active ? 'text-gold-400' : 'text-ash-600'}`}>{set.translation}</div>
                        <div className="mt-1 font-black text-white group-hover:text-gold-400">{set.title}</div>
                        <div className="text-[11px] text-ash-500 leading-snug">{set.subtitle}</div>
                        <div className="mt-2 text-[11px] text-ash-600">{set.random ? 'Random draw' : `${set.verses.length} passages`}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-2xl border border-iron-800 bg-soot-900/50 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.35em] text-ash-600">CREATE COLLECTION</div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                    <input value={newCollectionName} onChange={(e) => setNewCollectionName(e.target.value)} placeholder="Collection name" className="w-full rounded-xl border border-iron-800 bg-soot-900/70 px-4 py-3 text-sm text-ash-200 placeholder:text-ash-600 focus:outline-none focus:ring-2 focus:ring-gold-500/30" />
                    <button type="button" onClick={createNamedCollection} className="inline-flex items-center justify-center gap-2 rounded-xl border border-iron-800 bg-soot-900/50 px-4 py-3 text-xs font-black text-ash-200 hover:bg-iron-800/40">
                      <Plus size={16} className="text-gold-400" /> SAVE COLLECTION
                    </button>
                  </div>
                  {customError && <div className="mt-3 rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-200">{customError}</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section select — the library broken into smaller, studiable parts. */}
        {appState === 'sectionSelect' && activeSections && (
          <div className="w-full space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <button onClick={onBack} className="inline-flex items-center gap-2 mb-4 rounded-full border border-iron-800 bg-soot-900/50 px-4 py-2 text-sm font-black text-ash-200 transition-colors hover:bg-iron-800/40 hover:border-gold-500/30">
              <ChevronRight className="rotate-180 text-gold-400" size={16} /> Back to Main Menu
            </button>

            <div className="text-center space-y-2 mb-8">
              <h2 className="struck text-4xl">{activeSet.title}</h2>
              <p className="text-sm text-ash-500">Choose a part to study.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {activeSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => openSection(section)}
                  className="group rounded-2xl border border-iron-800 bg-soot-900/50 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-gold-500/40 hover:bg-iron-800/40"
                >
                  <div className="mb-1 font-display text-xl font-semibold uppercase tracking-forge text-ash-200">{section.title}</div>
                  <div className="text-xs font-black uppercase tracking-widest text-gold-400">{section.range}</div>
                  <div className="mt-2 text-sm text-ash-500">{section.desc}</div>
                  <div className="mt-3 text-xs text-ash-600">
                    {section.books.length === 1 ? '1 book' : `${section.books.length} books`}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Book select — within a section. "Whole section" keeps the wider draw available. */}
        {appState === 'bookSelect' && selectedSection && (
          <div className="w-full space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <button onClick={() => setAppState('sectionSelect')} className="inline-flex items-center gap-2 mb-4 rounded-full border border-iron-800 bg-soot-900/50 px-4 py-2 text-sm font-black text-ash-200 transition-colors hover:bg-iron-800/40 hover:border-gold-500/30">
              <ChevronRight className="rotate-180 text-gold-400" size={16} /> {activeSet.title}
            </button>

            <div className="text-center space-y-2 mb-8">
              <h2 className="struck text-4xl">{selectedSection.title}</h2>
              <p className="text-xs font-black uppercase tracking-widest text-gold-400">{selectedSection.range}</p>
            </div>

            <button
              onClick={() => { setSelectedBook(null); setAppState('menu'); }}
              className="mb-3 w-full rounded-2xl border border-gold-500/40 bg-gold-700/15 p-4 text-left transition-all hover:bg-gold-700/25"
            >
              <div className="font-display text-lg font-semibold uppercase tracking-forge text-gold-300">All of {selectedSection.title}</div>
              <div className="text-xs text-ash-500">Draw from every book in this part</div>
            </button>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {selectedSection.books.map((book) => (
                <button
                  key={book}
                  onClick={() => { setSelectedBook(book); setAppState('menu'); }}
                  className="rounded-xl border border-iron-800 bg-soot-900/50 px-4 py-4 text-left font-bold text-ash-200 transition-all hover:border-gold-500/40 hover:bg-iron-800/40"
                >
                  {book}
                </button>
              ))}
            </div>
          </div>
        )}

        {appState === 'menu' && activeSet && (
          <div className="w-full space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <button
              onClick={() => {
                // Step back up the chain rather than dumping the player at the main menu.
                if (!activeSections) return onBack();
                if (selectedSection && selectedSection.books.length > 1) return setAppState('bookSelect');
                setAppState('sectionSelect');
              }}
              className="inline-flex items-center gap-2 mb-4 rounded-full border border-iron-800 bg-soot-900/50 px-4 py-2 text-sm font-black text-ash-200 transition-colors hover:bg-iron-800/40 hover:border-gold-500/30"
            >
              <ChevronRight className="rotate-180 text-gold-400" size={16} /> {activeSections ? 'Back' : 'Back to Main Menu'}
            </button>

            <div className="text-center space-y-2 mb-8">
              <h2 className="text-4xl font-black text-white tracking-tight uppercase">{activeScopeTitle}</h2>
              <p className="text-gold-400 font-mono tracking-widest text-xs uppercase">{activeScopeRange}</p>
              {activeSet.random ? (
                <p className="text-ash-600 text-sm mt-2">Verses are drawn at random each round for fresh practice.</p>
              ) : (
                <p className="text-ash-600 text-sm mt-2">{activeSet.verses.length} passages loaded</p>
              )}

              {!activeSet.random && (
                <div className="flex justify-center">
                  <button onClick={() => setShowAllVerses(true)} className="inline-flex items-center gap-2 rounded-2xl border border-gold-500/30 bg-gold-700/15 px-5 py-3 text-sm font-black uppercase tracking-[0.2em] text-gold-300 transition-colors hover:bg-gold-700/25 hover:text-white">
                    <BookOpen size={16} /> View All Verses
                  </button>
                </div>
              )}
            </div>

            {activeSet.isCustom && activeCustomCollection && (
              <div className="rounded-2xl border border-iron-800 bg-soot-900/50 p-4">
                <div className="text-xs font-black uppercase tracking-[0.35em] text-ash-600">ADD TO COLLECTION</div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                  <input ref={customRefInputRef} value={customRef} onChange={(e) => setCustomRef(e.target.value)} placeholder="Verse reference (e.g., Jn3:16)" className="w-full rounded-xl border border-iron-800 bg-soot-900/70 px-4 py-3 text-sm text-ash-200 placeholder:text-ash-600 focus:outline-none focus:ring-2 focus:ring-gold-500/30" />
                  <button type="button" onClick={addCustomVerse} className="inline-flex items-center gap-2 rounded-xl border border-iron-800 bg-soot-900/50 px-4 py-3 text-xs font-black text-ash-200 hover:bg-iron-800/40">
                    <Plus size={16} className="text-gold-400" /> ADD VERSE
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-3xl border border-gold-500/20 bg-soot-900/80 p-2 shadow-2xl ">
              <div className="rounded-2xl border border-iron-800/60 bg-soot-900/70 p-6 space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => selectMode('blanks')} className="col-span-2 sm:col-span-1 group relative bg-soot-900/50 hover:bg-iron-800/40 border border-iron-800 p-4 rounded-2xl text-left transition-all hover:border-gold-500/40"><BookOpen className="text-gold-400 mb-2" size={24} /><h3 className="font-black text-white">Fill Blanks</h3></button>
                  <button onClick={() => selectMode('builder')} className="col-span-2 sm:col-span-1 group relative bg-soot-900/50 hover:bg-iron-800/40 border border-iron-800 p-4 rounded-2xl text-left transition-all hover:border-gold-500/40"><Layers className="text-gold-400 mb-2" size={24} /><h3 className="font-black text-white">Builder</h3></button>
                  <button onClick={() => selectMode('reference')} className="col-span-2 sm:col-span-1 group relative bg-soot-900/50 hover:bg-iron-800/40 border border-iron-800 p-4 rounded-2xl text-left transition-all hover:border-purple-500/40"><Search className="text-purple-400 mb-2" size={24} /><h3 className="font-black text-white">Reference</h3></button>
                </div>
              </div>
            </div>
          </div>
        )}

        {appState === 'difficulty' && pendingMode && activeSet && (
          <div className="w-full space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <button onClick={() => setAppState('menu')} className="inline-flex items-center gap-2 mb-4 rounded-full border border-iron-800 bg-soot-900/50 px-4 py-2 text-sm font-black text-ash-200 transition-colors hover:bg-iron-800/40 hover:border-gold-500/30">
              <ChevronRight className="rotate-180 text-gold-400" size={16} /> Back to Modes
            </button>

            <div className="text-center space-y-2 mb-8">
              <p className="text-gold-400 font-mono tracking-widest text-xs uppercase">{modeLabels[pendingMode]}</p>
              <h2 className="text-4xl font-black text-white tracking-tight uppercase">Choose Your Level</h2>
              <p className="text-ash-600 text-sm mt-2">Higher levels pull longer verses and hide more of the text.</p>
            </div>

            <div className="rounded-3xl border border-gold-500/20 bg-soot-900/80 p-2 shadow-2xl ">
              <div className="rounded-2xl border border-iron-800/60 bg-soot-900/70 p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(['easy', 'normal', 'sealed'] as Difficulty[]).map((level) => {
                    const cfg = difficultyConfig[level];
                    const ring =
                      cfg.accent === 'green' ? 'hover:border-green-500/50 text-green-300'
                      : cfg.accent === 'red' ? 'hover:border-red-500/50 text-red-300'
                      : 'hover:border-gold-500/50 text-gold-400';
                    return (
                      <button
                        key={level}
                        onClick={() => startGame(pendingMode, level)}
                        className={`group relative flex flex-col gap-2 rounded-2xl border border-iron-800 bg-soot-900/50 p-5 text-left transition-all hover:bg-iron-800/40 ${ring}`}
                      >
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

        {appState === 'playing' && currentQuestion && (
          <div className="w-full flex flex-col items-center animate-in fade-in duration-500">
            <div className="w-full max-w-xs h-1 bg-neutral-900 rounded-full mb-8 overflow-hidden"><div className="h-full bg-gold-500 transition-all duration-500 ease-out" style={{ width: `${(currentLevel / Math.max(activeQuestions.length, 1)) * 100}%` }} /></div>

            {currentQuestion.kind === 'blanks' && (
              <div className="w-full max-w-3xl rounded-3xl border border-gold-500/20 bg-soot-900/80 p-2 shadow-2xl ">
                <div className="rounded-2xl border border-iron-800/60 bg-soot-900/70 p-6 sm:p-8 text-center">
                  <div className="mb-8"><span className="text-gold-400 font-mono text-xs uppercase tracking-widest bg-gold-700/15 px-3 py-1 rounded-full border border-gold-700/40">{currentQuestion.verse.ref}</span></div>
                  <div className="mb-4 text-xs font-black uppercase tracking-[0.35em] text-ash-600">Blank {Math.min(blankGuesses.length + 1, currentQuestion.answers.length)} of {currentQuestion.answers.length}</div>
                  <div className="text-xl sm:text-2xl font-serif text-ash-200 leading-relaxed mb-10">{currentQuestion.promptWords.map((word, index) => {
                    const blankIndex = currentQuestion.promptWords.slice(0, index + 1).filter((item) => item.startsWith('_____')).length - 1;
                    if (!word.startsWith('_____')) return `${word} `;
                    const guessedWord = blankIndex >= 0 ? blankGuesses[blankIndex] : undefined;
                    return `${guessedWord ?? word} `;
                  })}</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{currentBlankOptions.map((opt, i) => <button key={`${opt}-${i}`} onClick={() => handleBlankChoice(opt)} disabled={feedback !== null} className={`p-4 rounded-xl text-lg font-medium border-2 transition-all ${feedback === 'correct' && opt.toLowerCase() === (currentQuestion.answers[blankGuesses.length] || '').toLowerCase() ? 'bg-green-600 border-green-500 text-white' : feedback === 'incorrect' && opt.toLowerCase() === (currentQuestion.answers[blankGuesses.length] || '').toLowerCase() ? 'bg-green-600 border-green-500 text-white opacity-50' : 'bg-neutral-800 border-neutral-700 hover:border-gold-500'}`}>{opt}</button>)}</div>
                </div>
              </div>
            )}

            {currentQuestion.kind === 'reference' && (
              <div className="w-full max-w-3xl bg-neutral-900 p-6 sm:p-8 rounded-3xl border border-neutral-700 shadow-2xl text-center">
                <div className="mb-8"><span className="text-purple-400 font-mono text-xs uppercase tracking-widest bg-purple-950/30 px-3 py-1 rounded-full border border-purple-900/50">Identify Reference</span></div>
                <div className="text-xl sm:text-2xl font-serif text-ash-200 leading-relaxed mb-10">“{currentQuestion.prompt}”</div>
                <div className="grid grid-cols-2 gap-3">{currentQuestion.options.map((opt, i) => <button key={i} onClick={() => handleAnswer(opt === currentQuestion.correct)} disabled={feedback !== null} className="p-4 rounded-xl text-lg font-mono font-bold border-2 bg-neutral-800 border-neutral-700 hover:border-purple-500">{opt}</button>)}</div>
              </div>
            )}

            {currentQuestion.kind === 'builder' && (
              <div className="w-full max-w-3xl flex flex-col items-center">
                <div className="mb-4 text-sm font-black text-gold-400">{currentQuestion.verse.ref}</div>
                <div className="w-full bg-neutral-900 min-h-[160px] p-6 rounded-2xl border-2 border-dashed border-neutral-700 mb-6 flex flex-wrap content-start gap-2 relative transition-all">
                  {builderState.selected.map((chunk, i) => <div key={`${chunk}-${i}`} className="inline-flex items-center gap-1 rounded-lg border border-gold-500/30 bg-gold-500/15 px-2 py-2 text-soot-950 shadow-lg"><button type="button" onClick={() => handleBuilderMove(i, -1)} disabled={feedback !== null || i === 0} className="rounded-md border border-iron-800 bg-soot-900/50 px-2 py-1 text-[10px] font-black text-gold-300 disabled:cursor-not-allowed disabled:opacity-30">←</button><span className="px-1 py-1 font-medium">{chunk}</span><button type="button" onClick={() => handleBuilderMove(i, 1)} disabled={feedback !== null || i === builderState.selected.length - 1} className="rounded-md border border-iron-800 bg-soot-900/50 px-2 py-1 text-[10px] font-black text-gold-300 disabled:cursor-not-allowed disabled:opacity-30">→</button></div>)}
                  {builderState.selected.length > 0 && !feedback && <button onClick={handleBuilderUndo} className="absolute bottom-4 right-4 text-xs text-ash-500 hover:text-white underline">Undo Last</button>}
                </div>
                <div className="mb-3 text-xs font-black uppercase tracking-[0.3em] text-ash-600">Tap words below, then reorder the placed line</div>
                <div className="mb-4 flex items-center gap-3">
                  <button onClick={handleBuilderConfirm} disabled={feedback !== null || builderState.scrambled.length > 0 || builderState.selected.length === 0} className="btn-primary rounded-2xl px-5 py-3 text-sm font-black uppercase tracking-[0.2em] disabled:cursor-not-allowed disabled:opacity-40">Confirm</button>
                  {builderState.scrambled.length === 0 && !feedback && <span className="text-xs font-black uppercase tracking-[0.25em] text-gold-400/80">Ready when you are</span>}
                </div>
                <div className="flex flex-wrap justify-center gap-3">{builderState.scrambled.map((chunk, i) => <button key={`${chunk}-${i}`} onClick={() => handleBuilderClick(chunk)} disabled={feedback !== null} className="border border-gold-500/20 bg-neutral-800 px-4 py-3 rounded-xl font-medium text-ash-200 shadow-md transition-all hover:border-gold-500 hover:bg-neutral-700 active:scale-95">{chunk}</button>)}</div>
              </div>
            )}
          </div>
        )}

        {appState === 'finished' && (() => {
          const totalQuestions = activeQuestions.length;
          const accuracy = totalQuestions ? Math.round((correctCount / totalQuestions) * 100) : 0;
          return (
            <div className="max-w-md w-full bg-neutral-900 p-8 rounded-2xl border border-iron-800 text-center space-y-6 animate-in zoom-in duration-300">
              <Award className="w-16 h-16 text-yellow-400 mx-auto" />
              <div className="space-y-1">
                <h2 className="text-3xl font-black text-white">Run Complete!</h2>
                <p className="text-sm text-ash-500">You got <span className="font-black text-gold-400">{correctCount}</span> of <span className="font-black text-white">{totalQuestions}</span> verses correct.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-gold-500/20 bg-gold-700/12 p-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.25em] text-gold-400/80">Correct</div>
                  <div className="mt-1 text-3xl font-black text-white">{correctCount}<span className="text-lg text-ash-600">/{totalQuestions}</span></div>
                </div>
                <div className="rounded-2xl border border-iron-800 bg-soot-900/50 p-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.25em] text-ash-500">Accuracy</div>
                  <div className="mt-1 text-3xl font-black text-white">{accuracy}%</div>
                </div>
              </div>

              <div className="rounded-2xl border border-iron-800 bg-soot-900/50 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="text-[11px] font-black uppercase tracking-[0.25em] text-ash-500">Points</div>
                    <div className="text-3xl font-black text-white">{score}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-black uppercase tracking-[0.25em] text-ash-500">Best Streak</div>
                    <div className="text-3xl font-black text-white">{bestStreak}x</div>
                  </div>
                </div>
                <div className="mt-3 border-t border-iron-800 pt-3 text-xs text-ash-600">
                  10 points per correct answer, plus a streak bonus (+2 for each answer in a row).
                </div>
              </div>

              <button onClick={() => setAppState('menu')} className="btn-primary w-full py-3 font-bold rounded-xl">Continue</button>
            </div>
          );
        })()}
      </div>

      {selectedVerse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-soot-950/90" onClick={() => setSelectedVerse(null)} aria-label="Close verse modal" />
          <div className="relative w-full max-w-3xl rounded-2xl border border-gold-500/30 bg-soot-900/85 shadow-2xl">
            <div className="flex items-center justify-between border-b border-iron-800 p-4">
              <div>
                <div className="text-sm font-bold tracking-widest text-ash-200">VERSE</div>
                <div className="mt-1 text-lg font-black text-white">{selectedVerse.ref}</div>
              </div>
              <button type="button" onClick={() => setSelectedVerse(null)} className="rounded-lg px-3 py-1 text-xs font-bold text-ash-300 hover:bg-iron-800/40">CLOSE</button>
            </div>
            <div className="p-4 space-y-4">
              <div className="rounded-xl border border-iron-800 bg-soot-900/70 p-4 text-sm leading-7 text-ash-200">{selectedVerse.text}</div>
              <div className="rounded-xl border border-iron-800 bg-soot-900/50 p-4">
                <div className="text-xs font-black uppercase tracking-[0.35em] text-ash-600">PREVIEW</div>
                <div className="mt-2 text-sm text-ash-300">{generateVersePreview(selectedVerse.text)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAllVerses && activeSet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-soot-950/90" onClick={() => setShowAllVerses(false)} aria-label="Close loaded verses modal" />
          <div className="relative w-full max-w-4xl rounded-2xl border border-gold-500/30 bg-soot-900/90 shadow-2xl">
            <div className="flex items-center justify-between border-b border-iron-800 p-4">
              <div>
                <div className="text-sm font-bold tracking-widest text-ash-200">LOADED VERSES</div>
                <div className="mt-1 text-lg font-black text-white">{activeSet.title}</div>
                <div className="text-xs text-ash-500">{activeSet.verses.length} passages loaded</div>
              </div>
              <button type="button" onClick={() => setShowAllVerses(false)} className="rounded-lg px-3 py-1 text-xs font-bold text-ash-300 hover:bg-iron-800/40">CLOSE</button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {activeSet.verses.map((verse) => (
                  <button key={verse.ref} type="button" onClick={() => { setShowAllVerses(false); setSelectedVerse(verse); }} className="rounded-xl border border-iron-800 bg-soot-900/50 px-4 py-3 text-left transition-colors hover:bg-iron-800/40 hover:border-gold-500/30">
                    <div className="text-sm font-black text-ash-200">{verse.ref}</div>
                    <div className="mt-1 text-xs leading-snug text-ash-500">{generateVersePreview(verse.text)}</div>
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
