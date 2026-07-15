/**
 * Renders public/og.png — the image Facebook, WhatsApp, X and iMessage show when someone shares
 * a link to the app. Regenerate after a brand change with: node scripts/make-og-image.mjs
 *
 * It must be a raster at 1200x630: social crawlers do not render SVG.
 *
 * Text is converted to vector outlines rather than left as <text> for the rasteriser to typeset.
 * SVG rasterisers match fonts on the family name stored inside the font file, which for fonts
 * instanced from a variable source is often mangled — Big Shoulders Display calls itself
 * "Big Shoulders Display Thin ExtraBold" — and a mismatch silently falls back to the wrong font
 * instead of failing. Outlining sidesteps font matching entirely, so what you see here is exactly
 * the type used in the app.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import opentype from 'opentype.js';
import sharp from 'sharp';
import { decompress } from 'wawoff2';

const root = process.cwd();
const OUT = path.join(root, 'public', 'og.png');

const WIDTH = 1200;
const HEIGHT = 630;

/** @fontsource ships only woff/woff2; opentype.js needs raw TrueType, so decompress in memory. */
const loadFont = async (relativePath) => {
  const woff2 = await readFile(path.join(root, 'node_modules', '@fontsource', relativePath));
  const ttf = await decompress(woff2);
  return opentype.parse(new Uint8Array(ttf).buffer);
};

const display = await loadFont('big-shoulders-display/files/big-shoulders-display-latin-800-normal.woff2');
const body = await loadFont('archivo/files/archivo-latin-400-normal.woff2');

/**
 * Outlines `text` and returns the path plus its advance width, so callers can centre or fit it.
 *
 * Glyphs are looked up per character rather than via stringToGlyphs, which runs the font's GSUB
 * shaping tables — Big Shoulders uses a substitution format opentype.js cannot parse and throws on.
 * Latin display text needs no shaping, so mapping characters straight to glyphs is both sufficient
 * and immune to that.
 */
const outline = (font, text, size, x, y, { tracking = 0, fill = '#fff' } = {}) => {
  const glyphs = [...text].map((ch) => font.charToGlyph(ch));
  const scale = size / font.unitsPerEm;

  let cursor = x;
  let d = '';

  glyphs.forEach((glyph, i) => {
    d += glyph.getPath(cursor, y, size).toPathData(2) + ' ';
    cursor += glyph.advanceWidth * scale + tracking;
    if (i < glyphs.length - 1) {
      cursor += (font.getKerningValue(glyph, glyphs[i + 1]) || 0) * scale;
    }
  });

  return { svg: `<path d="${d.trim()}" fill="${fill}"/>`, width: cursor - x };
};

const embers = Array.from({ length: 22 }, (_, i) => {
  const x = 60 + ((i * 53) % 1090);
  const y = HEIGHT - ((i * 37) % 190) - 12;
  const r = 1.5 + ((i * 7) % 3);
  const o = (0.25 + ((i * 13) % 50) / 100).toFixed(2);
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="#ff6b1f" opacity="${o}"/>`;
}).join('\n  ');

const MARGIN = 100;
const MAX_TITLE_WIDTH = WIDTH - MARGIN * 2;

// Size the title to the plate rather than guessing: measure at a reference size, then scale to fit.
const probe = outline(display, "REFINER’S FIRE", 100, 0, 0, { tracking: 3 });
const titleSize = Math.min(150, Math.floor((100 * MAX_TITLE_WIDTH) / probe.width));

const title = outline(display, "REFINER’S FIRE", titleSize, MARGIN, 330, {
  tracking: 3,
  fill: '#e2dde5',
});
const tagline = outline(body, 'A dramatic Bible challenge, forged in Revelation.', 30, MARGIN, 396, {
  fill: '#a49cab',
});
const features = outline(
  body,
  'Memorise scripture · Play live with friends · Build your own quizzes',
  22,
  MARGIN,
  470,
  { fill: '#6b6470' },
);

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <radialGradient id="heat" cx="50%" cy="98%" r="70%">
      <stop offset="0%" stop-color="#e8540f" stop-opacity="0.55"/>
      <stop offset="45%" stop-color="#9a2f0a" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#08070a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="crown" cx="50%" cy="0%" r="55%">
      <stop offset="0%" stop-color="#ffb06a" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="#08070a" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="#08070a"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#crown)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#heat)"/>

  <rect x="${MARGIN}" y="196" width="120" height="4" fill="#e8540f"/>

  ${title.svg}
  ${tagline.svg}
  ${features.svg}

  ${embers}
</svg>`;

await writeFile(OUT, await sharp(Buffer.from(svg)).png().toBuffer());
console.log(`Wrote ${OUT} — title set at ${titleSize}px, ${Math.round(title.width)}px wide`);
