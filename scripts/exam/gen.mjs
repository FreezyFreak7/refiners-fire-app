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

// Full-answer decoys for the "pick the answer" style: other questions' answers of similar length.
const pickDecoys = (r) => {
  const rand = rng(r.i * 104729 + 7);
  const cands = rows
    .filter((o) => o.n !== r.n && norm(o.plain) !== norm(r.plain))
    .map((o) => ({ o, s: Math.abs(o.plain.length - r.plain.length) / Math.max(10, r.plain.length) + rand() * 0.35 }))
    .sort((x, y) => x.s - y.s);
  const seen = new Set([norm(r.plain)]); const out = [];
  for (const { o } of cands) { if (seen.has(norm(o.plain))) continue; seen.add(norm(o.plain)); out.push(o.plain); if (out.length === 3) break; }
  return out;
};

const tag = (r) => `Exam Q${r.n}${r.label}`;
const q = (o) => '      ' + JSON.stringify(o).replace(/"([a-z]+)":/g, '$1:') + ',';

const RANGES = [[1, 10], [11, 20], [21, 30], [31, 40]];
const out = [];
for (const [lo, hi] of RANGES) {
  const rs = rows.filter((r) => r.n >= lo && r.n <= hi);
  const blank = rs.map((r) => ({ kind: 'blank', verse: tag(r), prompt: `${r.ask} — ${promptOf(r.text)}`, answers: r.blanks, decoys: blankDecoys(r) }));
  const builder = [];
  for (const r of rs) {
    const ch = chunksOf(r.text);
    if (ch.length < 3) continue;
    const groups = Math.ceil(ch.length / 8), size = Math.ceil(ch.length / groups);
    for (let g = 0; g < groups; g++) {
      const part = ch.slice(g * size, (g + 1) * size);
      const suffix = groups > 1 ? ` (part ${g + 1} of ${groups})` : '';
      builder.push({ kind: 'builder', verse: tag(r) + suffix, prompt: `Put the answer in order: ${r.ask}${suffix}`, chunks: part });
    }
  }
  const pick = rs.map((r) => ({ kind: 'blank', verse: tag(r), prompt: `${r.ask} → _____`, answers: [r.plain], decoys: pickDecoys(r) }));
  const label = `Q${lo}–${hi}`;
  out.push({ id: `exam-q${lo}-${hi}-blanks`, name: `Exam ${label} · Fill the Blanks`, questions: blank });
  out.push({ id: `exam-q${lo}-${hi}-builder`, name: `Exam ${label} · Builder`, questions: builder });
  out.push({ id: `exam-q${lo}-${hi}-pick`, name: `Exam ${label} · Pick the Answer`, questions: pick });
}

let ts = `/**
 * Exam quizzes for Completion_Answer_English.pdf (40 questions, 100 sub-answers; five answers that list separate items, Q7③, Q17③, Q19①, Q28②, Q31②, are split so there are ${rows.length} prompts). Answers are
 * word-for-word from the exam's answer key; the prompts are short forms of the exam questions.
 * Three styles, each in four parts of ten questions:
 *   Fill the Blanks  the exact answer with its key terms blanked, filled from a word bank
 *   Builder          the exact answer cut into pieces to put back in order
 *   Pick the Answer  the exact answer among answers from other questions
 *
 * Generated: edit scripts/exam/parts.mjs, then run: node scripts/exam/gen.mjs src/data/examQuizzes.ts
 */
import type { ClassQuiz } from './classQuizzes';

export const EXAM_QUIZZES: ClassQuiz[] = [
`;
for (const z of out) {
  ts += `  {\n    id: '${z.id}',\n    name: '${z.name}',\n    questions: [\n${z.questions.map(q).join('\n')}\n    ],\n  },\n`;
}
ts += '];\n';
fs.writeFileSync(process.argv[2], ts);
console.log(out.map((z) => `${z.name}: ${z.questions.length}`).join('\n'));
