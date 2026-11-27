import fs from 'fs';
import { PARTS } from './parts.mjs';

const plainOf = (t) => t.replace(/[{}]/g, '').replace(/ \| /g, ' ');
const blanksOf = (t) => (t.match(/\{[^}]+\}/g) || []).map((b) => b.slice(1, -1));
const promptOf = (t) => t.replace(/ \| /g, ' ').replace(/\{[^}]+\}/g, '_____');
const chunksOf = (t) => t.split(' | ').map((c) => c.replace(/[{}]/g, ''));
const norm = (s) => s.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
const isRef = (s) => /^(Rv|Jos|Ez|Mt|Lk|1 Cor)\b/.test(s) || /^\d/.test(s);
const words = (s) => s.split(/\s+/).length;
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

const rows = PARTS.map(([n, label, ask, text], i) => ({ n, label, ask, text, i, plain: plainOf(text), blanks: blanksOf(text) }));
const blankPool = [...new Map(rows.flatMap((r) => r.blanks).map((b) => [norm(b), b])).values()];

// One decoy per blank (same shape and similar length), never a word the player can read in the sentence.
const blankDecoys = (r) => {
  const rand = rng(r.i * 7919 + 13);
  const used = new Set(r.blanks.map(norm));
  const out = [];
  const want = Math.max(3, r.blanks.length);
  for (const a of [...r.blanks, ...r.blanks]) {
    if (out.length >= want) break;
    const cands = blankPool
      .filter((c) => !used.has(norm(c)) && !norm(r.plain).includes(norm(c)) && !norm(c).includes(norm(a)) && !norm(a).includes(norm(c)))
      .map((c) => ({ c, s: (isRef(c) === isRef(a) ? 0 : 20) + Math.abs(words(c) - words(a)) * 2 + rand() * 3 }))
      .sort((x, y) => x.s - y.s);
    if (!cands.length) continue;
    out.push(cands[0].c); used.add(norm(cands[0].c));
  }
  return out;
};

const tag = (r) => `Exam Q${r.n}${r.label}`;

const items = rows.map((r) => {
  const ch = chunksOf(r.text);
  const groups = [];
  if (ch.length >= 3) {
    const n = Math.ceil(ch.length / 8), size = Math.ceil(ch.length / n);
    for (let g = 0; g < n; g++) groups.push(ch.slice(g * size, (g + 1) * size));
  }
  return { n: r.n, label: r.label, ask: r.ask, answer: r.plain, blankPrompt: `${r.ask} — ${promptOf(r.text)}`, blanks: r.blanks, decoys: blankDecoys(r), chunks: groups };
});

let ts = `/**
 * The Graduation Exam (Completion_Answer_English.pdf): 40 questions, 100 sub-answers. Five answers that
 * list separate items (Q7③, Q17③, Q19①, Q28②, Q31②) are split, so there are ${items.length} items here.
 * \`answer\` is word-for-word from the exam's answer key; \`ask\` is a short form of the exam question.
 * The live room turns each item into a fill-in-the-blanks, builder or write-the-answer question.
 *
 * Generated: edit scripts/exam/parts.mjs, then run: node scripts/exam/gen.mjs src/data/examQuizzes.ts
 */
export interface ExamItem {
  n: number;
  label: string;
  ask: string;
  answer: string;
  /** The question plus the answer with each key term as _____, filled in order from \`blanks\`. */
  blankPrompt: string;
  blanks: string[];
  decoys: string[];
  /** The answer in order as pieces for the builder, split into groups of at most 8. Empty = too short to build. */
  chunks: string[][];
}

export const EXAM_ITEMS: ExamItem[] = [
`;
for (const it of items) ts += '  ' + JSON.stringify(it).replace(/"([a-zA-Z]+)":/g, '$1:') + ',\n';
ts += '];\n';
fs.writeFileSync(process.argv[2], ts);
console.log(items.length + ' items');
