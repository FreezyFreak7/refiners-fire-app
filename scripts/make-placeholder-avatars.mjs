/**
 * Generates simple placeholder avatars in public/avatars/ so the picker renders before the real
 * artwork is dropped in. Safe to delete once real avatars replace them.
 *
 *   node scripts/make-placeholder-avatars.mjs
 *
 * Each is a 256×256 PNG: a soot disc with a gold monogram. Replace any file with your own art
 * (same filename) and the picker picks it up with no code change.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const OUT_DIR = path.join(process.cwd(), 'public', 'avatars');
await mkdir(OUT_DIR, { recursive: true });

// id -> single-glyph mark. Matches the ids in src/data/avatars.ts.
const MARKS = {
  lion: '🦁',
  lamb: '🐑',
  crown: '♛',
  sword: '†',
  flame: '🔥',
  dove: '🕊',
  scroll: '§',
  star: '★',
};

for (const [id, glyph] of Object.entries(MARKS)) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
      <circle cx="128" cy="128" r="128" fill="#141118"/>
      <circle cx="128" cy="128" r="120" fill="none" stroke="#c8952f" stroke-opacity="0.5" stroke-width="3"/>
      <text x="128" y="128" font-size="120" text-anchor="middle" dominant-baseline="central"
            fill="#e0b04a">${glyph}</text>
    </svg>`;
  const file = path.join(OUT_DIR, `${id}.png`);
  await writeFile(file, await sharp(Buffer.from(svg)).png().toBuffer());
  console.log(`Wrote ${file}`);
}
