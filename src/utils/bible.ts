export interface VerseRef {
  book: string;
  chapter: number;
  verse: number;
}

export interface Verse extends VerseRef {
  text: string;
}

/** Shape of public/bible/niv1984.json: { [book]: { [chapter]: { [verse]: text } } } */
export type BibleData = Record<string, Record<string, Record<string, string>>>;

let cache: BibleData | null = null;
let inflight: Promise<BibleData> | null = null;

/**
 * The Bible file is ~4MB, so it lives in public/ and is fetched on first use rather than
 * bundled. Concurrent callers share one request; a failed load clears the promise so the
 * next caller retries instead of being stuck with a rejected one forever.
 */
export async function loadBible(): Promise<BibleData> {
  if (cache) return cache;

  if (!inflight) {
    inflight = fetch(`${import.meta.env.BASE_URL}bible/niv1984.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`Could not load the Bible text (${res.status}).`);
        return res.json() as Promise<BibleData>;
      })
      .then((data) => {
        cache = data;
        return data;
      })
      .finally(() => {
        inflight = null;
      });
  }

  return inflight;
}

/** Books in canonical order, as they appear in the source file. */
export function listBooks(data: BibleData): string[] {
  return Object.keys(data);
}

export function listChapters(data: BibleData, book: string): number[] {
  return Object.keys(data[book] ?? {})
    .map(Number)
    .sort((a, b) => a - b);
}

export function listVerses(data: BibleData, book: string, chapter: number): Verse[] {
  const verses = data[book]?.[String(chapter)] ?? {};
  return Object.keys(verses)
    .map(Number)
    .sort((a, b) => a - b)
    .map((verse) => ({ book, chapter, verse, text: verses[String(verse)] }));
}

export function getVerse(data: BibleData, ref: VerseRef): Verse | null {
  const text = data[ref.book]?.[String(ref.chapter)]?.[String(ref.verse)];
  return text ? { ...ref, text } : null;
}

export function formatRef(ref: VerseRef): string {
  return `${ref.book} ${ref.chapter}:${ref.verse}`;
}

/** Firestore document ids can't contain '/', so refs are slugged: "1 John 3:16" -> "1-john-3-16". */
export function refToId(ref: VerseRef): string {
  const book = ref.book.toLowerCase().replace(/\s+/g, '-');
  return `${book}-${ref.chapter}-${ref.verse}`;
}

const REFERENCE_PATTERN = /^\s*((?:[1-3]\s*)?[a-z\s]+?)\s*(\d+)(?::(\d+))?\s*$/i;

/**
 * Parses "John 3:16", "1 John 3", "psalm 23" into a book/chapter/verse. Book names are matched
 * loosely (prefix, case-insensitive) so "rev 21:4" and "song of" both resolve.
 */
export function parseReference(
  data: BibleData,
  query: string,
): { book: string; chapter: number; verse?: number } | null {
  const match = REFERENCE_PATTERN.exec(query);
  if (!match) return null;

  const [, rawBook, rawChapter, rawVerse] = match;
  const needle = rawBook.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!needle) return null;

  const books = listBooks(data);
  const book =
    books.find((b) => b.toLowerCase() === needle) ??
    books.find((b) => b.toLowerCase().startsWith(needle));
  if (!book) return null;

  const chapter = Number(rawChapter);
  if (!data[book]?.[String(chapter)]) return null;

  const verse = rawVerse ? Number(rawVerse) : undefined;
  if (verse !== undefined && !data[book][String(chapter)][String(verse)]) return null;

  return { book, chapter, verse };
}

/**
 * Full-text scan across all ~31k verses. Stops as soon as `limit` hits so a common word
 * like "the" doesn't build a 20k-element array on every keystroke.
 */
export function searchText(data: BibleData, query: string, limit = 40): Verse[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 3) return [];

  const results: Verse[] = [];

  for (const book of listBooks(data)) {
    const chapters = data[book];
    for (const chapter of Object.keys(chapters)) {
      const verses = chapters[chapter];
      for (const verse of Object.keys(verses)) {
        const text = verses[verse];
        if (text.toLowerCase().includes(needle)) {
          results.push({ book, chapter: Number(chapter), verse: Number(verse), text });
          if (results.length >= limit) return results;
        }
      }
    }
  }

  return results;
}
