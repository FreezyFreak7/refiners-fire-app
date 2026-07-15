# Refiner's Fire — Roadmap

A parking lot for ideas so nothing is lost. Nothing here is committed to a schedule.
Items are grouped by what they depend on, not by priority.

---

## Shipped

- **Google sign-in** — with anonymous-account linking, so a guest who signs in keeps their uid
  (and their seat in a live room).
- **Profile page** — saved passages and verse playlists, backed by Firestore, account-only.
- **Firestore security rules** — profile data is owner-only; live rooms stay shared.
- **Bundle fix** — the Bible is fetched from `public/` instead of compiled into the JS bundle.
  1.48 MB → 199 KB gzipped.
- **Menu layout** — no more vertical shift when switching Libraries ↔ Live Group Study.
- **Custom quizzes (solo)** — author multiple-choice and true/false questions with your own
  answers, explanations, and references. Private to your account, playable solo.
  `utils/quizModel.ts` (pure rules), `utils/quiz.ts` (Firestore), `components/profile/QuizBuilder.tsx`,
  `components/profile/QuizPlayer.tsx`.
- **Username + avatar** — set a display name and pick from a curated avatar set. Shown on the home
  screen (avatar + name, top right) and edited in the profile. `utils/userProfile.ts`,
  `data/avatars.ts`, `components/profile/IdentityCard.tsx`.
  - Avatars are static files in `public/avatars/`, referenced by id only. **Placeholders** currently
    there — replace with real art (same filenames); `scripts/make-placeholder-avatars.mjs` regenerates.
  - **Usernames are globally unique**, case-insensitive. Enforced by a `usernames/{key}` reservation
    collection where the doc id is the lowercased name — Firestore's create-if-absent makes the claim
    atomic. `claimUsername` runs a transaction that releases the old name and claims the new one.
    **Requires the updated `firestore.rules` to be deployed** (adds the `usernames` block); until then,
    saving a username fails with permission-denied.
  - Not yet wired into live rooms: players still retype their name when joining. The username
    should prefill `playerName` in `revelation-game`.

---

## Design system

Tokens live in `tailwind.config.js`; shared classes (`.plate`, `.stamp`, `.struck`, `.rule-fade`)
in `src/index.css`.

| Token | Use |
|---|---|
| `soot` | Backgrounds. Near-black, faintly warm — not Tailwind's blue-tinted slate. |
| `ash` | Text and chrome. **`ash-600` is the dimmest usable step** — anything darker drops below WCAG AA (4.5:1) on soot, and it is used for real labels and links. |
| `iron` | Borders, rules, dividers. |
| `gold` | **Anything actionable**: buttons, active state, focus. "Gold refined in the fire" (Rev 3:18). |
| `ember` | **The flame only**: background glow, drifting sparks, and the "hot/live" marker. Never a button. |

Two rules worth keeping:

- **Gold is a light colour.** Text on a gold fill must be `text-soot-950`, never white — white on
  gold fails contrast badly.
- **Ember is not an accent.** The moment orange starts appearing on buttons and chrome again, the
  palette collapses back into the generic "dark theme + orange" look this replaced.

Type: **Big Shoulders Display** (condensed, for headings and controls) and **Archivo** (body).
Both self-hosted via `@fontsource` — no Google Fonts request. The border-radius scale is overridden
globally so `rounded-*` classes render as hard forged edges.

`scripts/make-og-image.mjs` regenerates the social share image. It outlines text to vectors rather
than relying on font matching, because Big Shoulders reports a mangled internal family name that
rasterisers silently fail to match.

---

## Next up

### Daily challenge + world leaderboard — SHIPPED (needs rules deploy)

- Same 10 questions for everyone per UTC day, generated deterministically from a date-seeded PRNG
  (`utils/dailyChallenge.ts`) — this is what makes the leaderboard fair. Speed-weighted scoring:
  100 base + up to 100 speed bonus per correct answer, 15s each.
- World leaderboard at `artifacts/{appId}/public/data/daily/{day}/scores/{uid}` — public read,
  members post their own best (`utils/leaderboard.ts`). Rank via a server-side count aggregation.
- `components/daily/DailyChallenge.tsx`, reached from a banner on the home screen.
- **Requires the updated `firestore.rules` deployed** (adds the daily-scores block). Until then the
  results screen shows "leaderboard unavailable".
- **Anti-cheat is intentionally minimal (v1):** rules enforce own-score + keep-best, but the client
  reports the score, so a determined user could forge one via the console. Real integrity needs
  server-side re-scoring (Cloud Functions + Blaze plan). Also, a player can replay for a better score
  (we keep best) — no attempt lock yet.

### The Furnace — survival — SHIPPED (needs rules deploy)

- Endless questions, 3 lives, a per-question clock that tightens as you last longer
  (`utils/survival.ts`). Score = verses survived. All-time world leaderboard (`furnace` board).
- Question generation is now shared: `utils/questionGen.ts` (verse collection + fill-in builder),
  used by both the daily challenge (seeded) and survival (random). The leaderboard is generalized
  to any `boardId` (`utils/leaderboard.ts`), so future modes are cheap. The daily board moved to
  `boards/daily-{date}`; the rule is one generic `boards/{boardId}` block with a per-board score cap.
- Home screen now has a two-card **Challenges** section (Daily + Furnace).
- Same rules-deploy requirement and same v1 anti-cheat caveat as the daily challenge.

### Stats + streaks — SHIPPED (no rules deploy needed)

The retention keystone. Per-user stats at `users/{uid}/stats/main` (under the existing owner-only
profile rules — no redeploy): lifetime **verses refined**, current/best **daily streak**, and
per-mode bests. `utils/userStats.ts` (`recordActivity` runs a transaction; `computeStreak` is pure
and unit-tested incl. month/year boundaries). Daily and Furnace both call `recordActivity` on
finish (independent of the leaderboard, so it works even without the board rules). Shown in a
profile **Progress** panel (`StatsPanel.tsx`), a streak badge on both results screens, and a
"🔥 N-day streak · keep it alive" nudge on the home Daily card.

Next on this thread (the Cookie-Clicker-honest hooks):
- **Overcomer ranks** — tiers unlocked by `versesRefined`, mapped to the 7 Revelation promises.
  Titles/badges visible on the leaderboard. (See the ranks section above.)
- **Achievements** — streak milestones, verses-refined milestones, Furnace/daily records.
- **Spaced-repetition review** ("Trial by Fire") — missed verses come back. Needs a missed-verse store.
- Ethical line held: reward showing up, never punish leaving. No FOMO/guilt mechanics.

### More challenge modes (candidates)

Blitz (60s), Chapter & Verse (reference), Weekly Trial, Duel. All reuse `questionGen` + the generic
leaderboard — each is now mostly a new component + a boardId.

### Host a custom quiz in Live Group Study

The piece that makes custom content social, and the strongest growth lever on this list.

Questions are already stored as self-contained JSON with no external references, specifically so
a whole quiz can be copied into the session doc at `artifacts/{appId}/public/data/sessions/{code}`.
Today a session stores `chapterId` and every client derives the questions locally; a custom room
would instead carry its questions inline. No security-rule change needed — the session doc is
already readable by any signed-in player.

Still to decide:
- Does the host pick a quiz when creating the room, or switch mid-room?
- Scoring: same speed-based scoring as the Revelation rooms?

### Free-text answers

Deferred from the first cut. Needs fuzzy matching (case, punctuation, "Jesus" vs "Jesus Christ")
or it will mark correct answers wrong and infuriate people.

### Unify custom collections with playlists

`GameifiedMemoryGame` has custom collections in `localStorage` (`rf_memory_collections`).
The profile has playlists in Firestore. These are the same concept, built twice. Playlists
should win: they survive a cleared browser and sync across devices.

### Unify custom collections with playlists

`GameifiedMemoryGame` has custom collections in `localStorage` (`rf_memory_collections`).
The profile has playlists in Firestore. These are the same concept, built twice. Playlists
should win: they survive a cleared browser and sync across devices.

---

## Progression and identity

### Profile avatars

Simplest version: a chosen icon/colour, no uploads. Uploads mean Firebase Storage, image
resizing, and moderation of what people upload — a much bigger job, and a real moderation
burden on a faith app. Recommend starting with a curated set.

Avatars should also show up on the live-room player list, where players currently appear as
bare names.

### Ranks and achievements — the overcomer's ladder

The user's idea: players "scale" and earn biblical rewards — the sword, the crown of life,
"the 12 blessings in Revelation."

**Note on the source material.** The canonical set is the **seven promises to the overcomers**
(Revelation 2–3), each granted "to the one who overcomes":

| # | Promise | Church | Ref |
|---|---|---|---|
| 1 | Eat from the tree of life | Ephesus | 2:7 |
| 2 | Not be hurt by the second death | Smyrna | 2:11 |
| 3 | Hidden manna, and a white stone with a new name | Pergamum | 2:17 |
| 4 | Authority over the nations; the morning star | Thyatira | 2:26–28 |
| 5 | Dressed in white; name kept in the book of life | Sardis | 3:5 |
| 6 | A pillar in the temple of God | Philadelphia | 3:12 |
| 7 | Sit with Christ on his throne | Laodicea | 3:21 |

Seven ranks, thematically exact for a game called Refiner's Fire — the whole frame is *overcoming*.
(Revelation also contains **seven beatitudes** — 1:3, 14:13, 16:15, 19:9, 20:6, 22:7, 22:14 — if
"blessings" is what was meant. Either works; the overcomer promises fit a progression ladder better,
since they are explicitly rewards for endurance.)

Other rewards mentioned: the **sword** (the word of God, Eph 6:17 / Heb 4:12) and the
**crown of life** (James 1:12, Rev 2:10). These fit the "armour" framing of Ephesians 6 —
belt of truth, breastplate of righteousness, shield of faith, helmet of salvation, sword of the
Spirit — which is a second, complementary ladder.

Design questions:
- What earns progression? Verses mastered? Streaks? Accuracy? Live-game wins?
- Cosmetic only, or do rewards unlock content?
- Is a "rank" visible to other players in live rooms? (It should be — that's what makes it matter.)

Depends on: per-user stats, which don't exist yet. Needs a stats model in Firestore first.

### Ranked games

Competitive ladder with visible rank. Needs: a rating system, per-user stats, and enough players
for matchmaking to mean anything. **Realistically this comes after the app has an audience** —
a ranked ladder with four players is worse than no ladder.

---

## Growth

### Share to Facebook (and elsewhere)

Cheap and high-value. A share button that posts a link — a score, a streak, a custom quiz —
to Facebook, X, WhatsApp, or the OS share sheet.

Needs: Open Graph meta tags on `index.html` so shared links render with a title, description,
and image instead of a bare URL. Without OG tags a shared link looks broken, and this is the
single most common reason sharing features fall flat.

**No Meta app review required.** This is just a link.

### Facebook Login

Distinct from sharing, and far more expensive. Meta requires app review, business verification,
a public privacy policy URL, and a data-deletion callback endpoint before a Facebook login can
go live to the public. Firebase supports the provider, so the *code* is a few lines — the cost
is entirely process.

Worth asking: what does Facebook Login give you that Google sign-in doesn't already? If the goal
is growth, **sharing is the lever, not login.**

---

## Retention (my suggestions, not yet requested)

- **Review queue for missed verses.** Wrong answers feed a queue that serves them back later.
  This is the single highest-value feature for a memorisation app — spaced repetition is the
  engine that makes memory work. Cheap to build once stats exist.
- **Streaks and stats.** Per-library accuracy, verses mastered, daily streak. Prerequisite for
  ranks and achievements anyway.
- **Display name on the profile.** Players currently retype their name every time they join a
  live room. Small, immediately felt.

---

## Known debt

- **Lint: 83 pre-existing errors** (mostly `no-explicit-any` in `revelation-game/index.tsx`).
  The build passes; lint is not wired into CI.
- **`src/utils/firebase.js` and `firebase.ts` both exist** — duplicate Firebase init. The `.ts`
  one wins; the `.js` one is dead.
- **NIV 1984 text** (`data/Bible-1984-NIV.txt`, `public/bible/niv1984.json`) is copyrighted and
  served publicly. Redistribution beyond quotation is not covered by Biblica's standard
  permission. Public-domain alternatives (WEB, BSB, KJV, ASV) would drop into the same code.
  Flagged and knowingly accepted for now.
