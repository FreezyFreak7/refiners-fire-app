import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Loader2, Search } from 'lucide-react';
import {
  formatRef,
  listBooks,
  listChapters,
  listVerses,
  loadBible,
  parseReference,
  refToId,
  searchText,
  type BibleData,
  type Verse,
} from '../../utils/bible';

interface VersePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (verse: Verse) => void | Promise<void>;
  /** Refs already added, shown as disabled so users don't add duplicates. */
  existingIds?: Set<string>;
  actionLabel?: string;
  title?: string;
}

const VersePicker: React.FC<VersePickerProps> = ({
  isOpen,
  onClose,
  onSelect,
  existingIds,
  actionLabel = 'ADD',
  title = 'Add a passage',
}) => {
  const [bible, setBible] = useState<BibleData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [queryText, setQueryText] = useState('');
  const [book, setBook] = useState<string | null>(null);
  const [chapter, setChapter] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || bible) return;

    let cancelled = false;
    setLoadError(null);

    loadBible()
      .then((data) => {
        if (!cancelled) setBible(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, bible]);

  // A search that looks like a reference jumps straight to that chapter, so typing
  // "rev 21" browses rather than returning every verse containing the word.
  const results = useMemo(() => {
    if (!bible) return null;

    const trimmed = queryText.trim();
    if (!trimmed) return null;

    const ref = parseReference(bible, trimmed);
    if (ref) {
      const verses = listVerses(bible, ref.book, ref.chapter);
      return ref.verse ? verses.filter((v) => v.verse === ref.verse) : verses;
    }

    return searchText(bible, trimmed);
  }, [bible, queryText]);

  if (!isOpen) return null;

  const handleSelect = async (verse: Verse) => {
    const id = refToId(verse);
    setBusyId(id);
    try {
      await onSelect(verse);
    } finally {
      setBusyId(null);
    }
  };

  const renderVerseRow = (verse: Verse) => {
    const id = refToId(verse);
    const already = existingIds?.has(id) ?? false;

    return (
      <div
        key={id}
        className="flex items-start gap-3 rounded-xl border border-iron-800/60 bg-soot-900/50 p-3"
      >
        <div className="min-w-0 flex-1">
          <div className="text-xs font-black uppercase tracking-widest text-gold-400">
            {formatRef(verse)}
          </div>
          <div className="mt-1 text-sm text-ash-300">{verse.text}</div>
        </div>
        <button
          type="button"
          onClick={() => handleSelect(verse)}
          disabled={already || busyId === id}
          className="btn-primary shrink-0 rounded-lg px-3 py-1.5 text-xs font-black disabled:cursor-not-allowed disabled:border-iron-800 disabled:bg-iron-800/40 disabled:text-ash-600"
        >
          {already ? 'ADDED' : busyId === id ? '…' : actionLabel}
        </button>
      </div>
    );
  };

  const showBrowser = !results;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-soot-950/92"
        onClick={onClose}
        aria-label="Close verse picker"
      />

      <div className="relative flex h-[80vh] w-full max-w-3xl flex-col rounded-2xl border border-gold-500/30 bg-soot-900/90 shadow-2xl ">
        <div className="flex items-center justify-between border-b border-iron-800 p-4">
          <div className="text-sm font-black tracking-widest text-ash-200">
            {title.toUpperCase()}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-xs font-bold text-ash-300 hover:bg-iron-800/40"
          >
            CLOSE
          </button>
        </div>

        <div className="border-b border-iron-800 p-4">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ash-600"
            />
            <input
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Search “John 3:16” or “living water”"
              className="w-full rounded-xl border border-iron-800 bg-soot-950/60 py-3 pl-9 pr-3 text-white outline-none focus:border-gold-500/60"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loadError && (
            <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-sm text-red-200">
              {loadError}
            </div>
          )}

          {!bible && !loadError && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-ash-500">
              <Loader2 size={16} className="animate-spin" />
              Loading the Bible text…
            </div>
          )}

          {bible && results && (
            <div className="space-y-2">
              {results.length === 0 ? (
                <div className="py-12 text-center text-sm text-ash-600">
                  Nothing found for “{queryText.trim()}”.
                </div>
              ) : (
                results.map(renderVerseRow)
              )}
            </div>
          )}

          {bible && showBrowser && !book && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {listBooks(bible).map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setBook(name)}
                  className="rounded-xl border border-iron-800/60 bg-soot-900/50 px-3 py-3 text-left text-sm font-bold text-ash-200 hover:border-gold-500/30 hover:bg-iron-800/40"
                >
                  {name}
                </button>
              ))}
            </div>
          )}

          {bible && showBrowser && book && chapter === null && (
            <div>
              <button
                type="button"
                onClick={() => setBook(null)}
                className="mb-3 inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-ash-500 hover:text-gold-400"
              >
                <ChevronLeft size={14} /> Books
              </button>
              <div className="mb-3 text-lg font-black text-white">{book}</div>
              <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
                {listChapters(bible, book).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setChapter(n)}
                    className="rounded-lg border border-iron-800/60 bg-soot-900/50 py-2 text-sm font-bold text-ash-200 hover:border-gold-500/30 hover:bg-iron-800/40"
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {bible && showBrowser && book && chapter !== null && (
            <div>
              <button
                type="button"
                onClick={() => setChapter(null)}
                className="mb-3 inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-ash-500 hover:text-gold-400"
              >
                <ChevronLeft size={14} /> {book}
              </button>
              <div className="mb-3 text-lg font-black text-white">
                {book} {chapter}
              </div>
              <div className="space-y-2">{listVerses(bible, book, chapter).map(renderVerseRow)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VersePicker;
