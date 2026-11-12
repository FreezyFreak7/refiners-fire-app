/**
 * Shared fill-in-the-blank helpers: which words to blank, and which wrong options to offer.
 *
 * The goals are that a question can't be solved without knowing the verse:
 *  - never blank a word that is still visible elsewhere in the same verse;
 *  - skip filler words ("that", "with", "said") that make weak blanks;
 *  - draw wrong options from OTHER verses, so they aren't sitting in the text on screen;
 *  - no duplicate options, and every option uses the answer's capitalisation so a capital letter
 *    never gives the answer away.
 */

export const STOPWORDS = new Set([
  'about', 'after', 'also', 'among', 'been', 'before', 'being', 'both', 'came', 'come', 'could',
  'does', 'down', 'each', 'even', 'every', 'from', 'gave', 'give', 'have', 'having', 'here', 'into',
  'just', 'like', 'made', 'make', 'many', 'more', 'most', 'much', 'must', 'never', 'none', 'only',
  'other', 'over', 'said', 'same', 'says', 'shall', 'should', 'some', 'such', 'than', 'that', 'their',
  'them', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'thus', 'unto', 'upon', 'very',
  'want', 'were', 'what', 'when', 'where', 'which', 'while', 'whom', 'whose', 'will', 'with', 'would',
  'your', 'yours', "don't", "didn't", "won't", "can't", "it's", "that's",
]);

/** Fillers used only when the round itself can't supply enough wrong options. */
export const FALLBACK_WORDS = [
  'faith', 'truth', 'glory', 'spirit', 'kingdom', 'mercy', 'grace', 'light', 'heaven', 'peace',
  'power', 'righteous', 'covenant', 'blessed', 'temple', 'prophet', 'servant', 'wisdom', 'heart',
  'nations', 'mountain', 'promise', 'holy', 'praise', 'strength', 'salvation', 'judgment', 'gospel',
];

export const cleanWord = (w: string) => w.replace(/[^A-Za-z']/g, '').replace(/^'+|'+$/g, '');

const lower = (w: string) => w.toLowerCase();

/** Give `word` the same capitalisation style as `model` (Capitalised vs lowercase). */
export const matchCase = (word: string, model: string) => {
  // NIV prints the divine name as "LORD"; keep all-caps answers' options all-caps too.
  if (model.length > 1 && model === model.toUpperCase() && model !== model.toLowerCase()) {
    return word.toUpperCase();
  }
  const first = model.charAt(0);
  if (first && first === first.toUpperCase() && first !== first.toLowerCase()) {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }
  return word.toLowerCase();
};

/**
 * Picks which word positions to blank. Prefers words that appear only once in the verse (so the
 * answer isn't visible elsewhere) and are not filler, weighted toward longer words but randomised
 * so a verse isn't always blanked the same way. Blanks are never adjacent, never the first or last
 * word, and the result is always at least one index that has letters in it.
 */
export function pickBlankIndexes(words: string[], count: number, rand: () => number = Math.random): number[] {
  const cleaned = words.map(cleanWord);
  const freq = new Map<string, number>();
  cleaned.forEach((c) => { if (c) freq.set(lower(c), (freq.get(lower(c)) ?? 0) + 1); });

  const inner = cleaned
    .map((clean, index) => ({ clean, index }))
    .filter(({ clean, index }) => clean && index > 0 && index < words.length - 1);

  const tiers = [
    inner.filter(({ clean }) => clean.length >= 4 && !STOPWORDS.has(lower(clean)) && freq.get(lower(clean)) === 1),
    inner.filter(({ clean }) => clean.length >= 4 && !STOPWORDS.has(lower(clean))),
    inner.filter(({ clean }) => clean.length >= 3),
    cleaned.map((clean, index) => ({ clean, index })).filter(({ clean }) => clean),
  ];

  const picked: number[] = [];
  for (const tier of tiers) {
    const ranked = tier
      .map((item) => ({ ...item, weight: item.clean.length + rand() * 5 }))
      .sort((a, b) => b.weight - a.weight);
    for (const { index } of ranked) {
      if (picked.length >= count) break;
      if (picked.includes(index)) continue;
      if (picked.some((p) => Math.abs(p - index) <= 1)) continue;
      picked.push(index);
    }
    if (picked.length >= count) break;
    // Only fall to a weaker tier if we found nothing at all; a verse with one good blank is
    // better played with one blank than padded with filler.
    if (picked.length > 0) break;
  }
  return picked.sort((a, b) => a - b);
}

const isCapitalised = (w: string) => /^[A-Z]/.test(w);

/**
 * Collects candidate wrong-option words from a set of verse texts, de-duplicated. A word that only
 * ever appears capitalised mid-sentence is a name ("Javan", "Cush") and is kept capitalised so it is
 * only offered against other names; everything else is stored lowercase.
 */
export function buildWordPool(texts: string[]): string[] {
  const common = new Set<string>();
  const names = new Set<string>();
  for (const text of texts) {
    text.split(/\s+/).forEach((raw, i, all) => {
      const c = cleanWord(raw);
      const key = lower(c);
      if (key.length < 4 || STOPWORDS.has(key)) return;
      const sentenceStart = i === 0 || /[.!?:"“]$/.test(all[i - 1] ?? '');
      if (isCapitalised(c) && !sentenceStart) names.add(key);
      else if (!isCapitalised(c)) common.add(key);
    });
  }
  return [...common, ...[...names].filter((n) => !common.has(n)).map((n) => n.charAt(0).toUpperCase() + n.slice(1))];
}

const shuffle = <T,>(items: T[], rand: () => number) => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

/**
 * Wrong options for one blank. Excludes every word in the verse being played (so options aren't
 * sitting on screen) and the other answers, prefers words of a similar length to the answer, and
 * returns them in the answer's capitalisation. Always returns exactly `n` distinct words.
 */
export function pickDistractors(
  answer: string,
  verseText: string,
  pool: string[],
  n: number,
  rand: () => number = Math.random,
): string[] {
  const inVerse = new Set(verseText.split(/\s+/).map((w) => lower(cleanWord(w))).filter(Boolean));
  const ans = lower(answer);
  const usable = (w: string) => lower(w) !== ans && !inVerse.has(lower(w));

  // Names are offered against names, ordinary words against ordinary words. An answer that is
  // capitalised may be a name or just start a sentence, so it accepts both, names first.
  const answerIsCap = isCapitalised(answer) && answer !== answer.toUpperCase();
  const names = pool.filter((w) => isCapitalised(w) && usable(w));
  const commons = pool.filter((w) => !isCapitalised(w) && usable(w));
  const candidates = answerIsCap ? [...shuffle(names, rand), ...shuffle(commons, rand)] : shuffle(commons, rand);
  const close = candidates.filter((w) => Math.abs(w.length - ans.length) <= 2);
  const far = candidates.filter((w) => Math.abs(w.length - ans.length) > 2);
  const lowerOut = (w: string) => lower(w);
  const fallback = shuffle(FALLBACK_WORDS.filter(usable), rand);

  const out: string[] = [];
  for (const w of [...close, ...far, ...fallback]) {
    if (out.length >= n) break;
    if (!out.some((o) => lowerOut(o) === lowerOut(w))) out.push(w);
  }
  return out.map((w) => matchCase(w, answer));
}
