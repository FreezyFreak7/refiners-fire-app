/**
 * Builds public/favicon.png from a single frame of the flame GIF used by the home-screen logo,
 * so the browser tab matches the app's mark. Regenerate with: node scripts/make-favicon.mjs
 *
 * Social crawlers and browser tabs can't animate a favicon, so we take the first frame as a
 * static raster. sharp reads frame 0 of a GIF by default.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const GIF_URL =
  'https://images.squarespace-cdn.com/content/63ceec1f6db7d32cd45a7e8f/37b4821c-9b93-4e5c-beb3-943f7f6d02c9/output-onlinegiftools+%282%29.gif';

const res = await fetch(GIF_URL);
if (!res.ok) throw new Error(`Could not fetch flame GIF (${res.status}).`);
const gif = Buffer.from(await res.arrayBuffer());

// 64px is crisp on standard and hi-dpi tabs; the flame's shape still reads at 16px.
const out = path.join(process.cwd(), 'public', 'favicon.png');
await writeFile(
  out,
  await sharp(gif).resize(64, 64, { fit: 'contain', background: { r: 8, g: 7, b: 10, alpha: 1 } }).png().toBuffer(),
);
console.log(`Wrote ${out}`);
