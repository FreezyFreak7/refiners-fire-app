/**
 * Sub-divisions for the random-draw libraries, so a player can study a focused slice instead of
 * a scattergun draw across 39 books. Mirrors how the Revelation library splits into acts then
 * chapters: library -> section -> book.
 *
 * Book names must match the keys in public/bible/niv1984.json exactly.
 *
 * A section with a single book skips the book step and goes straight to mode selection.
 * A library with no entry here keeps the old behaviour (one random draw across its whole range) —
 * that is deliberate for Alpha & Omega, whose whole point is a Genesis-to-Revelation mix.
 */
export interface LibrarySection {
  id: string;
  title: string;
  /** Shown under the title, e.g. "Genesis – Deuteronomy". */
  range: string;
  desc: string;
  books: string[];
}

const OLD_TESTAMENT: LibrarySection[] = [
  {
    id: 'law',
    title: 'The Law',
    range: 'Genesis – Deuteronomy',
    desc: 'The five books of Moses',
    books: ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy'],
  },
  {
    id: 'history',
    title: 'History',
    range: 'Joshua – Esther',
    desc: 'The nation, its kings and exile',
    books: [
      'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings',
      '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther',
    ],
  },
  {
    id: 'wisdom',
    title: 'Wisdom & Poetry',
    range: 'Job – Song of Songs',
    desc: 'Suffering, praise, proverbs and love',
    books: ['Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Songs'],
  },
  {
    id: 'major_prophets',
    title: 'Major Prophets',
    range: 'Isaiah – Daniel',
    desc: 'The long prophetic books',
    books: ['Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel'],
  },
  {
    id: 'minor_prophets',
    title: 'Minor Prophets',
    range: 'Hosea – Malachi',
    desc: 'The twelve',
    books: [
      'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah',
      'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
    ],
  },
];

// Four books, so each is its own section — the book step is skipped.
const GOSPELS: LibrarySection[] = [
  { id: 'matthew', title: 'Matthew', range: 'Matthew', desc: 'The promised King', books: ['Matthew'] },
  { id: 'mark', title: 'Mark', range: 'Mark', desc: 'The servant, at pace', books: ['Mark'] },
  { id: 'luke', title: 'Luke', range: 'Luke', desc: 'The Son of Man', books: ['Luke'] },
  { id: 'john', title: 'John', range: 'John', desc: 'The Word made flesh', books: ['John'] },
];

const NEW_TESTAMENT: LibrarySection[] = [
  {
    id: 'gospels',
    title: 'The Gospels',
    range: 'Matthew – John',
    desc: 'The life of Jesus, four times told',
    books: ['Matthew', 'Mark', 'Luke', 'John'],
  },
  {
    id: 'early_church',
    title: 'The Early Church',
    range: 'Acts',
    desc: 'The Spirit and the first witnesses',
    books: ['Acts'],
  },
  {
    id: 'pauls_letters',
    title: "Paul's Letters",
    range: 'Romans – Philemon',
    desc: 'Letters to the churches',
    books: [
      'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians',
      'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon',
    ],
  },
  {
    id: 'general_letters',
    title: 'General Letters',
    range: 'Hebrews – Jude',
    desc: 'Endurance, faith and warning',
    books: ['Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude'],
  },
  {
    id: 'revelation',
    title: 'Revelation',
    range: 'Revelation',
    desc: 'The unveiling',
    books: ['Revelation'],
  },
];

export const LIBRARY_SECTIONS: Record<string, LibrarySection[]> = {
  old_testament: OLD_TESTAMENT,
  gospels: GOSPELS,
  new_testament: NEW_TESTAMENT,
};

export const sectionsFor = (libraryId: string): LibrarySection[] | null =>
  LIBRARY_SECTIONS[libraryId] ?? null;
