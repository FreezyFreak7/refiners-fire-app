/**
 * The curated avatar set.
 *
 * Each entry's `id` is what gets stored on the user's profile (never the image itself), and the
 * image is served statically from `public/avatars/<id>.<ext>`. To add or change avatars:
 *
 *   1. Drop the image files in `public/avatars/`.
 *   2. Add or edit entries here so `id` matches the filename (without extension).
 *
 * Image specs:
 *   - Square. 256×256 is plenty (they render at ~40–96px); larger just wastes bandwidth.
 *   - PNG or WebP. WebP is smaller — prefer it unless a file needs transparency PNG handles better.
 *   - Keep each file well under ~50 KB; these load on the profile and (later) in live rooms.
 *
 * `id` must be a url-safe slug: lowercase, digits and hyphens only.
 */
export interface Avatar {
  id: string;
  /** Shown as the option's accessible label and tooltip. */
  label: string;
  /** File extension in public/avatars/. */
  ext: 'png' | 'webp';
}

// Labels are just display text — rename them to whatever you intended these figures to be.
export const AVATARS: Avatar[] = [
  { id: 'avatar-1', label: 'The Shepherd', ext: 'webp' },
  { id: 'avatar-2', label: 'The Teacher', ext: 'webp' },
  { id: 'avatar-3', label: 'The Disciple', ext: 'webp' },
  { id: 'avatar-4', label: 'The Rabbi', ext: 'webp' },
  { id: 'avatar-5', label: 'The Fisherman', ext: 'webp' },
  { id: 'avatar-6', label: 'The Faithful', ext: 'webp' },
];

const byId = new Map(AVATARS.map((a) => [a.id, a]));

/** Path to an avatar's image, or null if the id isn't in the set (e.g. an avatar was removed). */
export function avatarSrc(id: string | null | undefined): string | null {
  if (!id) return null;
  const avatar = byId.get(id);
  return avatar ? `${import.meta.env.BASE_URL}avatars/${avatar.id}.${avatar.ext}` : null;
}

export function isKnownAvatar(id: string | null | undefined): id is string {
  return !!id && byId.has(id);
}
