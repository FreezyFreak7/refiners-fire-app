import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, CheckCircle, Layers, Plus, Search, Trash2 } from 'lucide-react';
import niv1984Canonical from '../../../data/niv1984.canonical.json';

interface MemoryGameProps {
  onBack: () => void;
  isMember: boolean;
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

type VerseLookupResult = {
  ref: string;
  text: string;
};

const bibleData = niv1984Canonical as BibleData;

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
  return {
    book,
    chapter,
    verseStart: Number(verseStart),
    verseEnd: Number(verseEnd ?? verseStart),
  };
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

  return {
    ref,
    text: verses.join(' '),
  };
};

const createCollectionId = () => `collection_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const defaultBasicsReferences = [
  'John 1:1-4',
  'Genesis 1:1-5',
  'Revelation 14:1-5',
  'Revelation 21:1-4',
  'Matthew 24:45-47',
  'Matthew 13:33',
  'Proverbs 30:7-8',
  'Deuteronomy 32:32-33',
  'Malachi 1:7-10',
  'Malachi 2:1-3',
  'Isaiah 58:2-4',
  'Galatians 4:19',
  'Revelation 14:12-13',
  'John 6:63',
  'John 16:33',
  'Ephesians 4:21-24',
  'Hebrews 5:12-14',
  'John 8:44',
  'Romans 12:1-2',
  '2 Corinthians 5:17',
  'Philippians 4:6-7',
  'Hebrews 11:1',
  'James 1:22',
  '1 John 1:9',
  'Micah 6:8',
  'Matthew 5:14-16',
  'Psalm 119:105',
  'Romans 8:28',
  'John 14:6',
  'Acts 4:12',
];

const defaultGospelsReferences = [
  'Matthew 5:3-12',
  'Matthew 5:13-16',
  'Matthew 6:9-13',
  'Matthew 6:19-21',
  'Matthew 7:7-8',
  'Matthew 11:28-30',
  'Matthew 22:37-39',
  'Matthew 28:18-20',
  'Mark 1:14-15',
  'Mark 8:34-35',
  'Mark 10:45',
  'Mark 12:29-31',
  'Luke 2:10-11',
  'Luke 4:18-19',
  'Luke 6:27-28',
  'Luke 9:23-24',
  'Luke 11:9-10',
  'Luke 15:4-7',
  'Luke 19:10',
  'John 3:16-17',
  'John 4:23-24',
  'John 8:12',
  'John 10:10-11',
  'John 11:25-26',
  'John 13:34-35',
  'John 14:1-3',
  'John 15:5',
  'John 15:12-13',
  'John 17:17',
  'John 20:31',
];

const defaultProphecyReferences = [
  'Isaiah 7:14',
  'Isaiah 9:6-7',
  'Isaiah 40:3-5',
  'Isaiah 53:3-6',
  'Jeremiah 31:31-34',
  'Ezekiel 36:26-27',
  'Daniel 2:44',
  'Daniel 7:13-14',
  'Joel 2:28-29',
  'Micah 5:2',
  'Zechariah 9:9',
  'Malachi 3:1',
  'Matthew 24:6-8',
  'Matthew 24:14',
  'Matthew 24:21-22',
  'Luke 21:25-28',
  '1 Thessalonians 4:16-17',
  '2 Peter 3:10-13',
  'Revelation 1:7',
  'Revelation 3:20',
  'Revelation 12:10-11',
  'Revelation 13:16-17',
  'Revelation 14:6-7',
  'Revelation 18:1-4',
  'Revelation 19:11-16',
  'Revelation 20:11-15',
  'Revelation 21:5-7',
  'Revelation 22:12-13',
  'Revelation 22:17',
  'Habakkuk 2:14',
];

const buildDefaultVerseRecords = (refs: string[]): VerseRecord[] =>
  refs
    .map((ref) => {
      const verse = lookupVerseText(ref);
      return verse ? { ref: verse.ref, text: verse.text } : null;
    })
    .filter((verse): verse is VerseRecord => verse !== null);

const MemoryGame: React.FC<MemoryGameProps> = ({ onBack, isMember }) => {
  const [customCollections, setCustomCollections] = useState<CustomCollection[]>([]);
  const [activeCustomCollectionId, setActiveCustomCollectionId] = useState<string | null>(null);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [customRef, setCustomRef] = useState('');
  const [customError, setCustomError] = useState('');
  const [selectedVerse, setSelectedVerse] = useState<VerseRecord | null>(null);
  const customRefInputRef = useRef<HTMLInputElement | null>(null);
  const [shouldFocusCustomRef, setShouldFocusCustomRef] = useState(false);

  const activeCustomCollection = customCollections.find((collection) => collection.id === activeCustomCollectionId) ?? null;

  useEffect(() => {
    try {
      const raw = localStorage.getItem('rf_memory_collections');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const collections = parsed
            .filter((item): item is { id?: unknown; title?: unknown; verses?: unknown } => !!item && typeof item === 'object')
            .map((item) => {
              const title = typeof item.title === 'string' && item.title.trim() ? item.title.trim() : 'My Collection';
              const verses = Array.isArray(item.verses)
                ? item.verses
                  .filter((verse): verse is { ref?: unknown; text?: unknown } => !!verse && typeof verse === 'object')
                  .map((verse) => {
                    const ref = typeof verse.ref === 'string' ? verse.ref : '';
                    const lookup = ref ? lookupVerseText(ref) : null;
                    const text = typeof verse.text === 'string' && verse.text.trim() ? verse.text.trim() : lookup?.text ?? '';
                    return { ref, text };
                  })
                  .filter((verse) => verse.ref && verse.text)
                : [];

              return {
                id: typeof item.id === 'string' && item.id ? item.id : createCollectionId(),
                title,
                verses,
              };
            })
            .filter((collection) => collection.verses.length || collection.title);

          setCustomCollections(collections);
          setActiveCustomCollectionId(collections[0]?.id ?? null);
        }
      } else {
        const legacyRaw = localStorage.getItem('rf_memory_playlist');

        if (legacyRaw) {
          const parsed = JSON.parse(legacyRaw);
          if (Array.isArray(parsed)) {
            const verses = parsed
              .filter((item): item is { ref?: unknown; text?: unknown } => !!item && typeof item === 'object')
              .map((item) => {
                const ref = typeof item.ref === 'string' ? item.ref : '';
                const lookup = ref ? lookupVerseText(ref) : null;
                const text = typeof item.text === 'string' && item.text.trim() ? item.text.trim() : lookup?.text ?? '';
                return { ref, text };
              })
              .filter((item) => item.ref && item.text);

            if (verses.length) {
              const collectionId = createCollectionId();
              setCustomCollections([{ id: collectionId, title: 'My Collection', verses }]);
              setActiveCustomCollectionId(collectionId);
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('rf_memory_collections', JSON.stringify(customCollections));
    } catch {
      // ignore
    }
  }, [customCollections]);

  const sets = useMemo(
    () =>
      [
        ...customCollections.map((collection) => ({
          id: collection.id,
          title: collection.title,
          subtitle: isMember ? 'Saved collection' : 'Preview collection',
          translation: 'NIV 1984',
          verses: collection.verses,
          isCustom: true,
        })),
        {
          id: 'custom-builder',
          title: '+',
          subtitle: isMember ? 'Create collection' : 'Create collection preview',
          translation: 'NIV 1984',
          verses: activeCustomCollection?.verses ?? [],
          isCustom: true,
        },

        {
          id: 'basics',
          title: 'The Basics',
          subtitle: 'Core passages for daily memory work',
          translation: 'NIV 1984',
          verses: buildDefaultVerseRecords(defaultBasicsReferences),
          isCustom: false,
        },
        {
          id: 'gospels',
          title: 'Gospels',
          subtitle: 'Teachings, mission, prayer, and discipleship',
          translation: 'NIV 1984',
          verses: buildDefaultVerseRecords(defaultGospelsReferences),
          isCustom: false,
        },
        {
          id: 'prophecy',
          title: 'Prophecy',
          subtitle: 'Messianic, end-time, and kingdom passages',
          translation: 'NIV 1984',
          verses: buildDefaultVerseRecords(defaultProphecyReferences),
          isCustom: false,
        },
      ] as const,
    [activeCustomCollection?.verses, customCollections, isMember]
  );

  const [activeSetId, setActiveSetId] = useState<(typeof sets)[number]['id']>('basics');

  const [activeSetExpanded, setActiveSetExpanded] = useState(false);
  const [activeMode, setActiveMode] = useState<'builder' | 'blanks' | 'tf' | 'reference' | null>(null);
  const activeSet = sets.find((s) => s.id === activeSetId) || sets[0];
  const isBuilderView = activeSet.id === 'custom-builder';
  const isCustomCollectionView = activeSet.isCustom && activeSet.id !== 'custom-builder';

  useEffect(() => {
    if (!activeSet.isCustom) return;

    if (!shouldFocusCustomRef) return;

    const t = window.setTimeout(() => {
      if (isBuilderView && !activeCustomCollection) return;
      customRefInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [activeCustomCollection, activeSet.isCustom, customRefInputRef, isBuilderView, shouldFocusCustomRef]);

  const normalizeVerseRef = (raw: string) => {
    const compactInput = raw.trim().replace(/\s+/g, ' ');
    const input = compactInput.replace(/^(\d?[A-Za-z]+)(\d+:\d+)/, '$1 $2');
    if (!input) return '';

    // Split on the first chapter/verse token, allowing multi-word book names
    // Examples:
    // - "1 Jn 1:1" => book="1 Jn", rest="1:1"
    // - "Song of Songs 2:1" => book="Song of Songs", rest="2:1"
    const m = input.match(/^(.*?)\s+(\d+\s*:\s*\d+.*)$/);
    if (!m) return input;

    const rawBook = m[1].replace(/\./g, '').replace(/\s+/g, ' ').trim();
    const rest = m[2].replace(/\s+/g, '').trim();

    const bookKey = rawBook
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/&/g, 'and');

    const bookMap: Record<string, string> = {
      // Pentateuch
      gen: 'Genesis',
      ge: 'Genesis',
      gn: 'Genesis',
      genesis: 'Genesis',
      ex: 'Exodus',
      exo: 'Exodus',
      exod: 'Exodus',
      exodus: 'Exodus',
      lev: 'Leviticus',
      le: 'Leviticus',
      lv: 'Leviticus',
      leviticus: 'Leviticus',
      num: 'Numbers',
      nu: 'Numbers',
      nm: 'Numbers',
      nb: 'Numbers',
      numbers: 'Numbers',
      deut: 'Deuteronomy',
      dt: 'Deuteronomy',
      deuteronomy: 'Deuteronomy',

      // History
      josh: 'Joshua',
      jos: 'Joshua',
      joshua: 'Joshua',
      judg: 'Judges',
      jdg: 'Judges',
      judges: 'Judges',
      ruth: 'Ruth',
      ru: 'Ruth',
      '1sam': '1 Samuel',
      '1sa': '1 Samuel',
      'isam': '1 Samuel',
      'i sam': '1 Samuel',
      '2sam': '2 Samuel',
      '2sa': '2 Samuel',
      'iisam': '2 Samuel',
      '1kgs': '1 Kings',
      '1ki': '1 Kings',
      '1king': '1 Kings',
      '1kings': '1 Kings',
      'ikgs': '1 Kings',
      '2kgs': '2 Kings',
      '2ki': '2 Kings',
      '2king': '2 Kings',
      '2kings': '2 Kings',
      'iikgs': '2 Kings',
      '1chr': '1 Chronicles',
      '1ch': '1 Chronicles',
      '1chron': '1 Chronicles',
      '1chronicles': '1 Chronicles',
      '2chr': '2 Chronicles',
      '2ch': '2 Chronicles',
      '2chron': '2 Chronicles',
      '2chronicles': '2 Chronicles',
      ezra: 'Ezra',
      ezr: 'Ezra',
      neh: 'Nehemiah',
      nehemiah: 'Nehemiah',
      est: 'Esther',
      esth: 'Esther',
      esther: 'Esther',

      // Wisdom
      job: 'Job',
      jb: 'Job',
      ps: 'Psalms',
      psa: 'Psalms',
      pss: 'Psalms',
      psalm: 'Psalms',
      psalms: 'Psalms',
      prov: 'Proverbs',
      pr: 'Proverbs',
      pro: 'Proverbs',
      proverbs: 'Proverbs',
      eccl: 'Ecclesiastes',
      ecc: 'Ecclesiastes',
      ecclesiastes: 'Ecclesiastes',
      song: 'Song of Songs',
      sos: 'Song of Songs',
      songofsongs: 'Song of Songs',
      songofsolomon: 'Song of Songs',
      cant: 'Song of Songs',
      canticles: 'Song of Songs',

      // Major Prophets
      is: 'Isaiah',
      isa: 'Isaiah',
      isaiah: 'Isaiah',
      jer: 'Jeremiah',
      jr: 'Jeremiah',
      jeremiah: 'Jeremiah',
      lam: 'Lamentations',
      lamentations: 'Lamentations',
      ezek: 'Ezekiel',
      eze: 'Ezekiel',
      ezk: 'Ezekiel',
      ezekiel: 'Ezekiel',
      dan: 'Daniel',
      dn: 'Daniel',
      daniel: 'Daniel',

      // Minor Prophets
      hos: 'Hosea',
      hosea: 'Hosea',
      joel: 'Joel',
      jl: 'Joel',
      amos: 'Amos',
      am: 'Amos',
      obad: 'Obadiah',
      ob: 'Obadiah',
      obadiah: 'Obadiah',
      jonah: 'Jonah',
      jnh: 'Jonah',
      mic: 'Micah',
      micah: 'Micah',
      nah: 'Nahum',
      nahum: 'Nahum',
      hab: 'Habakkuk',
      habakkuk: 'Habakkuk',
      zeph: 'Zephaniah',
      zep: 'Zephaniah',
      zephaniah: 'Zephaniah',
      hag: 'Haggai',
      haggai: 'Haggai',
      zech: 'Zechariah',
      zec: 'Zechariah',
      zechariah: 'Zechariah',
      mal: 'Malachi',
      malachi: 'Malachi',

      // Gospels
      mt: 'Matthew',
      matt: 'Matthew',
      matthew: 'Matthew',
      mk: 'Mark',
      mrk: 'Mark',
      mark: 'Mark',
      lk: 'Luke',
      luk: 'Luke',
      luke: 'Luke',
      jn: 'John',
      joh: 'John',
      john: 'John',

      // Acts
      act: 'Acts',
      acts: 'Acts',

      // Pauline Epistles
      rom: 'Romans',
      ro: 'Romans',
      romans: 'Romans',
      '1cor': '1 Corinthians',
      '1co': '1 Corinthians',
      '2cor': '2 Corinthians',
      '2co': '2 Corinthians',
      gal: 'Galatians',
      ga: 'Galatians',
      galatians: 'Galatians',
      eph: 'Ephesians',
      ep: 'Ephesians',
      ephesians: 'Ephesians',
      phil: 'Philippians',
      php: 'Philippians',
      ph: 'Philippians',
      philippians: 'Philippians',
      col: 'Colossians',
      co: 'Colossians',
      colossians: 'Colossians',
      '1thess': '1 Thessalonians',
      '1thes': '1 Thessalonians',
      '1th': '1 Thessalonians',
      '2thess': '2 Thessalonians',
      '2thes': '2 Thessalonians',
      '2th': '2 Thessalonians',
      '1tim': '1 Timothy',
      '1ti': '1 Timothy',
      '2tim': '2 Timothy',
      '2ti': '2 Timothy',
      tit: 'Titus',
      ti: 'Titus',
      phlm: 'Philemon',
      phm: 'Philemon',
      philemon: 'Philemon',

      // General Epistles
      heb: 'Hebrews',
      hebrews: 'Hebrews',
      jas: 'James',
      jm: 'James',
      james: 'James',
      '1pet': '1 Peter',
      '1pe': '1 Peter',
      '2pet': '2 Peter',
      '2pe': '2 Peter',
      '1jn': '1 John',
      '1jhn': '1 John',
      '1john': '1 John',
      '2jn': '2 John',
      '2jhn': '2 John',
      '2john': '2 John',
      '3jn': '3 John',
      '3jhn': '3 John',
      '3john': '3 John',
      jude: 'Jude',
      jud: 'Jude',

      // Revelation
      rv: 'Revelation',
      rev: 'Revelation',
      revelation: 'Revelation',
    };

    const normalizedBook = bookMap[bookKey] || rawBook;
    return `${normalizedBook} ${rest}`;
  };

  const createNamedCollection = () => {
    const title = newCollectionName.trim();
    if (!title) {
      setCustomError('Enter a collection name before saving.');
      return;
    }

    const newCollection = {
      id: createCollectionId(),
      title,
      verses: [] as VerseRecord[],
    };

    setCustomCollections((prev) => [newCollection, ...prev]);
    setActiveCustomCollectionId(newCollection.id);
    setActiveSetId(newCollection.id);
    setNewCollectionName('');
    setCustomError('');
    setActiveSetExpanded(true);
    setShouldFocusCustomRef(true);
  };

  const addCustomVerse = () => {
    if (!activeCustomCollection) {
      setCustomError('Create and select a collection first.');
      return;
    }

    const ref = normalizeVerseRef(customRef);
    if (!ref) return;

    const lookup = lookupVerseText(ref);

    if (!lookup) {
      setCustomError('Verse not found in the NIV 1984 data. Check the reference and try again.');
      return;
    }

    setCustomCollections((prev) => {
      const nextVerse = { ref: lookup.ref, text: lookup.text };
      return prev.map((collection) =>
        collection.id === activeCustomCollection.id
          ? {
              ...collection,
              verses: [nextVerse, ...collection.verses.filter((verse) => verse.ref !== lookup.ref)],
            }
          : collection,
      );
    });

    setCustomRef('');
    setCustomError('');
    setActiveSetExpanded(true);
    setShouldFocusCustomRef(true);
  };

  const removeCustomVerse = (collectionId: string, ref: string) => {
    setCustomCollections((prev) =>
      prev.map((collection) =>
        collection.id === collectionId
          ? {
              ...collection,
              verses: collection.verses.filter((v) => v.ref !== ref),
            }
          : collection,
      ),
    );
  };

  const topRowSets = sets.filter((s) => s.id !== 'custom-builder');
  const addSet = sets.find((s) => s.id === 'custom-builder');

  const basicsReferences = [
    'John 1:1-4',
    'Genesis 1:1-5',
    'Revelation 14:1-5',
    'Revelation 21:1-4',
    'Matthew 24:45-47',
    'Matthew 13:33',
    'Proverbs 30:7-8',
    'Deuteronomy 32:32-33',
    'Malachi 1:7-10',
    'Malachi 2:1-3',
    'Isaiah 58:2-4',
    'Galatians 4:19',
    'Revelation 14:12-13',
    'John 6:63',
    'John 16:33',
    'Ephesians 4:21-24',
    'Hebrews 5:12-14',
    'John 8:44',
    'Romans 12:1-2',
    '2 Corinthians 5:17',
    'Philippians 4:6-7',
    'Hebrews 11:1',
    'James 1:22',
    '1 John 1:9',
    'Micah 6:8',
    'Matthew 5:14-16',
    'Psalm 119:105',
    'Romans 8:28',
    'John 14:6',
    'Acts 4:12',
  ];

  const gospelsReferences = [
    'Matthew 5:3-12',
    'Matthew 5:13-16',
    'Matthew 6:9-13',
    'Matthew 6:19-21',
    'Matthew 7:7-8',
    'Matthew 11:28-30',
    'Matthew 22:37-39',
    'Matthew 28:18-20',
    'Mark 1:14-15',
    'Mark 8:34-35',
    'Mark 10:45',
    'Mark 12:29-31',
    'Luke 2:10-11',
    'Luke 4:18-19',
    'Luke 6:27-28',
    'Luke 9:23-24',
    'Luke 11:9-10',
    'Luke 15:4-7',
    'Luke 19:10',
    'John 3:16-17',
    'John 4:23-24',
    'John 8:12',
    'John 10:10-11',
    'John 11:25-26',
    'John 13:34-35',
    'John 14:1-3',
    'John 15:5',
    'John 15:12-13',
    'John 17:17',
    'John 20:31',
  ];

  const prophecyReferences = [
    'Isaiah 7:14',
    'Isaiah 9:6-7',
    'Isaiah 40:3-5',
    'Isaiah 53:3-6',
    'Jeremiah 31:31-34',
    'Ezekiel 36:26-27',
    'Daniel 2:44',
    'Daniel 7:13-14',
    'Joel 2:28-29',
    'Micah 5:2',
    'Zechariah 9:9',
    'Malachi 3:1',
    'Matthew 24:6-8',
    'Matthew 24:14',
    'Matthew 24:21-22',
    'Luke 21:25-28',
    '1 Thessalonians 4:16-17',
    '2 Peter 3:10-13',
    'Revelation 1:7',
    'Revelation 3:20',
    'Revelation 12:10-11',
    'Revelation 13:16-17',
    'Revelation 14:6-7',
    'Revelation 18:1-4',
    'Revelation 19:11-16',
    'Revelation 20:11-15',
    'Revelation 21:5-7',
    'Revelation 22:12-13',
    'Revelation 22:17',
    'Habakkuk 2:14',
  ];

  const buildVerseRecords = (refs: string[]): VerseRecord[] =>
    refs
      .map((ref) => {
        const verse = lookupVerseText(ref);
        return verse ? { ref: verse.ref, text: verse.text } : null;
      })
      .filter((verse): verse is VerseRecord => verse !== null);

  const createBlankedPreview = (text: string) => {
    const words = text.replace(/\s+/g, ' ').trim().split(' ');
    let hiddenCount = 0;

    return words
      .map((word, index) => {
        const clean = word.replace(/[^a-zA-Z]/g, '');
        if (clean.length < 5) return word;
        if (index % 5 !== 2) return word;
        hiddenCount += 1;
        return hiddenCount <= 6 ? '____' : word;
      })
      .join(' ');
  };

  const getModeLabel = (mode: 'builder' | 'blanks' | 'tf' | 'reference' | null) => {
    switch (mode) {
      case 'blanks':
        return 'Fill Blanks';
      case 'builder':
        return 'Verse Builder';
      case 'tf':
        return 'True or Lie';
      case 'reference':
        return 'Reference';
      default:
        return '';
    }
  };

  const modeSampleVerses = activeSet.verses.slice(0, 12);

  return (
    <div className="min-h-screen text-slate-100 font-sans flex flex-col items-center selection:bg-orange-500 selection:text-white">
      <div className="fixed top-0 left-0 w-full p-4 flex justify-between items-center bg-black/30 backdrop-blur-xl border-b border-white/5 z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-black/30 border border-white/10 rounded-full hover:bg-white/5 transition-colors"
            title="Back to Main Menu"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2 select-none">
            <img
              src="https://images.squarespace-cdn.com/content/63ceec1f6db7d32cd45a7e8f/37b4821c-9b93-4e5c-beb3-943f7f6d02c9/output-onlinegiftools+%282%29.gif?content-type=image%2Fgif"
              alt="Fire"
              className="h-5 w-5 object-contain"
            />
            <span className="font-black hidden sm:inline text-slate-200 tracking-wide">Refiner's Fire</span>
          </div>
        </div>

        <div className="text-xs font-black uppercase tracking-[0.35em] text-slate-500">MEMORY GAME</div>
      </div>

      <div className="w-full max-w-5xl flex-1 flex flex-col items-center justify-center pt-24 pb-10 px-4">
        <div className="w-full space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-white">Memory Game</h1>
            <div className="text-xs font-black uppercase tracking-[0.35em] text-slate-500">SELECT A VERSE SET</div>
          </div>

          <div className="w-full rounded-3xl border border-orange-500/20 bg-slate-950/50 p-2 shadow-2xl backdrop-blur-xl">
            <div className="rounded-2xl border border-white/5 bg-black/30 p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-stretch">
                {topRowSets.map((set) => {
                  const active = set.id === activeSetId;
                  return (
                    <button
                      key={set.id}
                      type="button"
                      onClick={() => {
                        setActiveSetId(set.id);
                        if (set.isCustom && set.id !== 'custom-builder') {
                          setActiveCustomCollectionId(set.id);
                          setShouldFocusCustomRef(true);
                        }
                      }}
                      className={`group rounded-2xl border p-3 text-left transition-all ${
                        active
                          ? 'border-orange-500/60 bg-orange-500/10 shadow-[0_0_0_1px_rgba(255,120,60,0.15)]'
                          : 'border-white/5 bg-black/10 hover:border-orange-500/30 hover:bg-white/5'
                      }`}
                    >
                      <div className={`text-[10px] font-black uppercase tracking-[0.25em] ${active ? 'text-orange-300' : 'text-slate-600'}`}>
                        {set.translation}
                      </div>
                      <div className="mt-1 font-black text-white group-hover:text-orange-300">{set.title}</div>
                      <div className="text-[11px] text-slate-400 leading-snug">{set.subtitle}</div>

                      <div className="mt-2 text-[11px] text-slate-500">
                        {set.verses.length ? `${set.verses.length} passages` : set.isCustom ? 'Start a collection' : 'Coming soon'}
                      </div>
                    </button>
                  );
                })}

                {addSet && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSetId(addSet.id);
                      setActiveSetExpanded(true);
                      setShouldFocusCustomRef(true);
                    }}
                    className={`group rounded-2xl border transition-all w-full h-full min-h-20 p-0 flex items-center justify-center ${
                      activeSetId === addSet.id
                        ? 'border-orange-500/60 bg-orange-500/10 shadow-[0_0_0_1px_rgba(255,120,60,0.15)]'
                        : 'border-white/5 bg-black/10 hover:border-orange-500/30 hover:bg-white/5'
                    }`}
                    title="Create collection"
                  >
                    <Plus size={34} strokeWidth={1} className="text-orange-300/90" />
                  </button>
                )}
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="flex items-baseline justify-between gap-4">
                  <div>
                    <div className="text-2xl font-bold text-white">{activeSet.title}</div>
                    <div className="text-sm text-slate-400">{activeSet.translation}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-slate-500">{activeSet.verses.length ? `${activeSet.verses.length} passages` : activeSet.isCustom ? isBuilderView ? 'Create a collection' : 'Add verses to this collection' : 'Coming soon'}</div>

                    <button
                      type="button"
                      onClick={() => setActiveSetExpanded((v) => !v)}
                      className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-black text-slate-200 hover:bg-white/5"
                    >
                      {activeSetExpanded ? 'Hide verses' : 'See verses'}
                    </button>
                  </div>
                </div>

                {activeSet.verses.length ? (
                  activeSetExpanded ? (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activeSet.verses.map((v: VerseRecord) => (
                        <button
                          key={v.ref}
                          type="button"
                          onClick={() => setSelectedVerse(v)}
                          className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-left transition-colors hover:bg-white/5 hover:border-orange-500/30"
                        >
                          <div className="text-sm font-black text-slate-100">{v.ref}</div>
                          <div className="text-xs text-slate-400 truncate">{generateVersePreview(v.text)}</div>
                          <div className="mt-2 text-[11px] font-black uppercase tracking-[0.25em] text-slate-600">Tap to open</div>
                          {activeSet.isCustom && activeSet.id !== 'custom-builder' && (
                            <div className="mt-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeCustomVerse(activeSet.id, v.ref);
                                }}
                                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-black text-slate-200 hover:bg-white/5"
                              >
                                <Trash2 size={14} className="text-orange-300" />
                                REMOVE
                              </button>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4" />
                  )
                ) : (
                  <div className="mt-4 text-sm text-slate-400">
                    {activeSet.isCustom ? isBuilderView ? 'Create a new collection.' : 'No verses added yet.' : 'This set is not ready yet.'}
                  </div>
                )}

                {isBuilderView && (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-black uppercase tracking-[0.35em] text-slate-500">CREATE COLLECTION</div>
                      {!isMember && <div className="text-[11px] text-orange-300">Preview mode for now</div>}
                    </div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                      <input
                        value={newCollectionName}
                        onChange={(e) => {
                          setNewCollectionName(e.target.value);
                          if (customError) setCustomError('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            createNamedCollection();
                          }
                        }}
                        placeholder="Collection name"
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                      />
                      <button
                        type="button"
                        onClick={createNamedCollection}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs font-black text-slate-200 hover:bg-white/5"
                      >
                        <Plus size={16} className="text-orange-300" />
                        SAVE COLLECTION
                      </button>
                    </div>

                    {customError && (
                      <div className="mt-3 rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-200">
                        {customError}
                      </div>
                    )}
                  </div>
                )}

                {isCustomCollectionView && activeCustomCollection && (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-black uppercase tracking-[0.35em] text-slate-500">ADD TO COLLECTION</div>
                      {!isMember && <div className="text-[11px] text-orange-300">Preview mode for now</div>}
                    </div>

                    <div className="mt-2 text-sm text-slate-300">{activeCustomCollection.title}</div>

                    <div className="mt-3 grid grid-cols-1 gap-3">
                      <input
                        ref={customRefInputRef}
                        value={customRef}
                        onChange={(e) => {
                          setCustomRef(e.target.value);
                          if (customError) setCustomError('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addCustomVerse();
                          }
                        }}
                        placeholder="Verse reference (e.g., Jn3:16)"
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                      />
                    </div>

                    {customError && (
                      <div className="mt-3 rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-200">
                        {customError}
                      </div>
                    )}

                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={addCustomVerse}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs font-black text-slate-200 hover:bg-white/5"
                      >
                        <Plus size={16} className="text-orange-300" />
                        ADD VERSE
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-5">
                  <div className="text-xs font-black uppercase tracking-[0.35em] text-slate-500">GAME MODES</div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveMode('blanks')}
                      className={`group relative bg-black/20 hover:bg-white/5 border p-4 rounded-2xl text-left transition-all ${
                        activeMode === 'blanks' ? 'border-orange-500/60' : 'border-white/10 hover:border-orange-500/40'
                      }`}
                    >
                      <BookOpen className="text-orange-400 mb-2" size={24} />
                      <h3 className="font-black text-white">Fill Blanks</h3>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMode('builder')}
                      className={`group relative bg-black/20 hover:bg-white/5 border p-4 rounded-2xl text-left transition-all ${
                        activeMode === 'builder' ? 'border-blue-500/60' : 'border-white/10 hover:border-blue-500/40'
                      }`}
                    >
                      <Layers className="text-blue-400 mb-2" size={24} />
                      <h3 className="font-black text-white">Verse Builder</h3>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMode('tf')}
                      className={`group relative bg-black/20 hover:bg-white/5 border p-4 rounded-2xl text-left transition-all ${
                        activeMode === 'tf' ? 'border-green-500/60' : 'border-white/10 hover:border-green-500/40'
                      }`}
                    >
                      <CheckCircle className="text-green-400 mb-2" size={24} />
                      <h3 className="font-black text-white">True or Lie</h3>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMode('reference')}
                      className={`group relative bg-black/20 hover:bg-white/5 border p-4 rounded-2xl text-left transition-all ${
                        activeMode === 'reference' ? 'border-purple-500/60' : 'border-white/10 hover:border-purple-500/40'
                      }`}
                    >
                      <Search className="text-purple-400 mb-2" size={24} />
                      <h3 className="font-black text-white">Reference</h3>
                    </button>
                  </div>

                  {activeMode && (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-black uppercase tracking-[0.35em] text-slate-500">MODE CONTENT</div>
                          <div className="mt-1 text-lg font-black text-white">{getModeLabel(activeMode)}</div>
                        </div>
                        <div className="text-xs text-slate-500">{modeSampleVerses.length} passages loaded</div>
                      </div>

                      {modeSampleVerses.length ? (
                        <div className="mt-4 space-y-3">
                          {activeMode === 'blanks' &&
                            modeSampleVerses.map((verse) => (
                              <div key={`blanks-${verse.ref}`} className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
                                <div className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">Fill the missing words</div>
                                <div className="mt-2 text-sm font-black text-slate-100">{verse.ref}</div>
                                <div className="mt-2 text-sm leading-7 text-slate-300">{createBlankedPreview(verse.text)}</div>
                              </div>
                            ))}

                          {activeMode === 'builder' &&
                            modeSampleVerses.map((verse) => (
                              <div key={`builder-${verse.ref}`} className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                                <div className="text-xs font-black uppercase tracking-[0.25em] text-blue-300">Build the passage</div>
                                <div className="mt-2 text-sm font-black text-slate-100">{verse.ref}</div>
                                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {verse.text
                                    .split(/(?<=[.!?])\s+/)
                                    .filter(Boolean)
                                    .map((segment, index) => (
                                      <div key={`${verse.ref}-segment-${index}`} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-300">
                                        <span className="mr-2 text-[11px] font-black uppercase tracking-[0.2em] text-blue-300">Part {index + 1}</span>
                                        {segment}
                                      </div>
                                    ))}
                                </div>
                              </div>
                            ))}

                          {activeMode === 'tf' &&
                            modeSampleVerses.map((verse, index) => (
                              <div key={`tf-${verse.ref}`} className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="text-sm font-black text-slate-100">Statement {index + 1}</div>
                                  <div className="text-[11px] font-black uppercase tracking-[0.25em] text-green-300">Check carefully</div>
                                </div>
                                <div className="mt-2 text-sm text-slate-300">"{generateVersePreview(verse.text)}"</div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-black text-slate-200">TRUE: matches {verse.ref}</div>
                                  <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-black text-slate-500">LIE: swap words or wrong reference</div>
                                </div>
                              </div>
                            ))}

                          {activeMode === 'reference' &&
                            modeSampleVerses.map((verse) => (
                              <div key={`reference-${verse.ref}`} className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
                                <div className="text-xs font-black uppercase tracking-[0.25em] text-purple-300">Name the reference</div>
                                <div className="mt-2 text-sm leading-7 text-slate-300">{verse.text}</div>
                                <div className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm font-black text-slate-100">Answer: {verse.ref}</div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="mt-4 text-sm text-slate-400">Select a set with verses to load this mode.</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedVerse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/80"
            onClick={() => setSelectedVerse(null)}
            aria-label="Close verse modal"
          />

          <div className="relative w-full max-w-2xl rounded-2xl border border-orange-500/30 bg-slate-950/85 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <div>
                <div className="text-sm font-bold tracking-widest text-slate-200">VERSE</div>
                <div className="mt-1 text-lg font-black text-white">{selectedVerse.ref}</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVerse(null)}
                className="rounded-lg px-3 py-1 text-xs font-bold text-slate-300 hover:bg-white/5"
              >
                CLOSE
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm leading-7 text-slate-100">
                {selectedVerse.text || 'Verse text is not available for this passage yet.'}
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs font-black uppercase tracking-[0.35em] text-slate-500">PREVIEW</div>
                <div className="mt-2 text-sm text-slate-300">{generateVersePreview(selectedVerse.text)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemoryGame;