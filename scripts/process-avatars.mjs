/**
 * One-off: downscales the uploaded avatar art to web-sized files and gives them stable ids.
 *
 * Source images are multi-MB; avatars render at ~40–96px, so they are resized to 256×256 WebP
 * (tens of KB). Any file in public/avatars/ that is NOT named `avatar-N.webp` is treated as a
 * raw upload, processed in sorted order into avatar-1.webp, avatar-2.webp, … and then deleted.
 *
 *   node scripts/process-avatars.mjs
 */
import { readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const DIR = path.join(process.cwd(), 'public', 'avatars');

const all = await readdir(DIR);
const raw = all.filter((f) => /\.(png|jpe?g|webp)$/i.test(f) && !/^avatar-\d+\.webp$/.test(f)).sort();

if (!raw.length) {
  console.log('No raw uploads to process.');
  process.exit(0);
}

let i = 1;
for (const file of raw) {
  const out = path.join(DIR, `avatar-${i}.webp`);
  await sharp(path.join(DIR, file))
    .resize(256, 256, { fit: 'cover', position: 'top' })
    .webp({ quality: 82 })
    .toFile(out);
  await rm(path.join(DIR, file));
  console.log(`avatar-${i}.webp  <-  ${file}`);
  i += 1;
}
console.log(`\nProcessed ${raw.length} avatars.`);
