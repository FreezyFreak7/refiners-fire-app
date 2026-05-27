import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const projectRoot = process.cwd()

const INPUT_PATH = path.join(projectRoot, 'data', 'Bible-1984-NIV.txt')
const OUTPUT_VERSES_PATH = path.join(projectRoot, 'data', 'niv1984.parsed.json')
const OUTPUT_CANONICAL_VERSES_PATH = path.join(projectRoot, 'data', 'niv1984.canonical.json')
const OUTPUT_BOOK_TOKENS_PATH = path.join(projectRoot, 'data', 'niv1984.bookTokens.json')
const OUTPUT_UNMAPPED_TOKENS_PATH = path.join(projectRoot, 'data', 'niv1984.unmappedBookTokens.json')

function normalizeWhitespace(s) {
  return s.replace(/\s+/g, ' ').trim()
}

function setNested(obj, keys, value) {
  let cur = obj
  for (let i = 0; i < keys.length - 1; i += 1) {
    const k = keys[i]
    if (cur[k] == null) cur[k] = {}
    cur = cur[k]
  }
  cur[keys[keys.length - 1]] = value
}

function getCanonicalBookName(bookToken) {
  /** @type {Record<string, string>} */
  const map = {
    Gen: 'Genesis',
    Exo: 'Exodus',
    Lev: 'Leviticus',
    Num: 'Numbers',
    Deu: 'Deuteronomy',
    Jos: 'Joshua',
    Jdg: 'Judges',
    Rut: 'Ruth',
    '1Sa': '1 Samuel',
    '2Sa': '2 Samuel',
    '1Ki': '1 Kings',
    '2Ki': '2 Kings',
    '1Ch': '1 Chronicles',
    '2Ch': '2 Chronicles',
    Ezr: 'Ezra',
    Neh: 'Nehemiah',
    Est: 'Esther',
    Job: 'Job',
    Psa: 'Psalms',
    Pro: 'Proverbs',
    Ecc: 'Ecclesiastes',
    Sol: 'Song of Songs',
    Isa: 'Isaiah',
    Jer: 'Jeremiah',
    Lam: 'Lamentations',
    Eze: 'Ezekiel',
    Dan: 'Daniel',
    Hos: 'Hosea',
    Joe: 'Joel',
    Amo: 'Amos',
    Oba: 'Obadiah',
    Jon: 'Jonah',
    Mic: 'Micah',
    Nah: 'Nahum',
    Hab: 'Habakkuk',
    Zep: 'Zephaniah',
    Hag: 'Haggai',
    Zec: 'Zechariah',
    Mal: 'Malachi',
    Mat: 'Matthew',
    Mar: 'Mark',
    Luk: 'Luke',
    Joh: 'John',
    Act: 'Acts',
    Rom: 'Romans',
    '1Co': '1 Corinthians',
    '2Co': '2 Corinthians',
    Gal: 'Galatians',
    Eph: 'Ephesians',
    Phi: 'Philippians',
    Col: 'Colossians',
    '1Th': '1 Thessalonians',
    '2Th': '2 Thessalonians',
    '1Ti': '1 Timothy',
    '2Ti': '2 Timothy',
    Tit: 'Titus',
    Phm: 'Philemon',
    Heb: 'Hebrews',
    Jam: 'James',
    '1Pe': '1 Peter',
    '2Pe': '2 Peter',
    '1Jo': '1 John',
    '2Jo': '2 John',
    '3Jo': '3 John',
    Jud: 'Jude',
    Rev: 'Revelation',
    '6e&': 'Exodus',
    'N&"': 'Numbers',
    Eos: 'Joshua',
    Edg: 'Judges',
    '3&t': 'Ruth',
    "1'a": '1 Samuel',
    "'a": '2 Samuel',
    Neh: 'Nehemiah',
    '7st': 'Esther',
    Eob: 'Job',
    '1Fi': '1 Kings',
    Fi: '2 Kings',
    '1;h': '1 Chronicles',
    '8sa': 'Psalms',
    '8ro': 'Proverbs',
    '7cc': 'Ecclesiastes',
    Eer: 'Jeremiah',
    Eoe: 'Joel',
    Eon: 'Jonah',
    '5ba': 'Obadiah',
    Bat: 'Matthew',
    Bar: 'Mark',
    '8hi': 'Luke',
    Eoh: 'John',
    '3o"': 'Romans',
    '1;o': '1 Corinthians',
    ';o': '2 Corinthians',
    'Ea"': 'James',
    '8h"': 'Philemon',
    Th: '2 Thessalonians',
    Ti: '2 Timothy',
    '3ev': 'Revelation',
  }

  return map[bookToken] ?? null
}

async function main() {
  const raw = await readFile(INPUT_PATH, 'utf8')

  // Verse marker examples observed:
  // - Gen 1:1
  // - 1Th 4:13
  // - N&" 10:1
  // - N&" 1,: 4
  // - Heb 11:1
  // - ;ol 4:1
  // - 6e& 1:1 (Exodus in this OCR output)
  //
  // Notes:
  // - Chapter sometimes includes a trailing comma from OCR: "1,".
  // - Separator between chapter and verse appears as ":" or ".".
  // - There may be variable whitespace.
  // - Book tokens appear to be short (typically 2-4 chars, sometimes with OCR symbols)
  //   so we cap length to reduce accidental matches (e.g. normal words like "lived").
  const verseMarkerRe = /(^|\s)([0-9]?[A-Za-z;&"']{1,4})\s+(\d+)\s*,?\s*[:\.]\s*(\d+)\s*/g

  /** @type {Record<string, Record<string, Record<string, string>>>} */
  const verses = {}
  /** @type {Record<string, Record<string, Record<string, string>>>} */
  const canonicalVerses = {}
  /** @type {Record<string, number>} */
  const countsByBookToken = {}
  /** @type {Record<string, number>} */
  const countsByUnmappedToken = {}

  const matches = []
  for (const m of raw.matchAll(verseMarkerRe)) {
    if (m.index == null) continue
    matches.push({
      start: m.index + m[1].length,
      end: m.index + m[0].length,
      book: m[2],
      chapter: m[3],
      verse: m[4],
    })
  }

  for (let i = 0; i < matches.length; i += 1) {
    const cur = matches[i]
    const next = matches[i + 1]

    const textSlice = raw.slice(cur.end, next?.start ?? raw.length)
    const text = normalizeWhitespace(textSlice)

    if (!text) continue

    setNested(verses, [cur.book, cur.chapter, cur.verse], text)

    const canonicalBook = getCanonicalBookName(cur.book)
    if (canonicalBook) {
      setNested(canonicalVerses, [canonicalBook, cur.chapter, cur.verse], text)
    } else {
      countsByUnmappedToken[cur.book] = (countsByUnmappedToken[cur.book] ?? 0) + 1
    }

    countsByBookToken[cur.book] = (countsByBookToken[cur.book] ?? 0) + 1
  }

  await writeFile(OUTPUT_VERSES_PATH, JSON.stringify(verses, null, 2) + '\n', 'utf8')
  await writeFile(OUTPUT_CANONICAL_VERSES_PATH, JSON.stringify(canonicalVerses, null, 2) + '\n', 'utf8')
  await writeFile(
    OUTPUT_BOOK_TOKENS_PATH,
    JSON.stringify(
      {
        inputPath: INPUT_PATH,
        outputVersesPath: OUTPUT_VERSES_PATH,
        outputCanonicalVersesPath: OUTPUT_CANONICAL_VERSES_PATH,
        uniqueBookTokens: Object.keys(countsByBookToken).sort(),
        countsByBookToken,
        totalVersesParsed: Object.values(countsByBookToken).reduce((a, b) => a + b, 0),
      },
      null,
      2,
    ) + '\n',
    'utf8',
  )

  await writeFile(
    OUTPUT_UNMAPPED_TOKENS_PATH,
    JSON.stringify(
      {
        inputPath: INPUT_PATH,
        outputVersesPath: OUTPUT_VERSES_PATH,
        outputCanonicalVersesPath: OUTPUT_CANONICAL_VERSES_PATH,
        uniqueUnmappedBookTokens: Object.keys(countsByUnmappedToken).sort(),
        countsByUnmappedToken,
        totalUnmappedVerses: Object.values(countsByUnmappedToken).reduce((a, b) => a + b, 0),
      },
      null,
      2,
    ) + '\n',
    'utf8',
  )

  // eslint-disable-next-line no-console
  console.log(`Wrote ${OUTPUT_VERSES_PATH}`)
  // eslint-disable-next-line no-console
  console.log(`Wrote ${OUTPUT_CANONICAL_VERSES_PATH}`)
  // eslint-disable-next-line no-console
  console.log(`Wrote ${OUTPUT_BOOK_TOKENS_PATH}`)
  // eslint-disable-next-line no-console
  console.log(`Wrote ${OUTPUT_UNMAPPED_TOKENS_PATH}`)
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exitCode = 1
})
