import { doc, onSnapshot, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { APP_ID } from './appConfig';

export interface UserProfile {
  username: string;
  avatarId: string | null;
}

/** Raised when a requested username is already held by someone else. */
export class UsernameTakenError extends Error {
  constructor() {
    super('That username is already taken.');
    this.name = 'UsernameTakenError';
  }
}

/**
 * The profile lives in a subcollection doc, `users/{uid}/profile/main`, rather than directly on
 * `users/{uid}`. The security rule matches `users/{uid}/{document=**}`, whose recursive wildcard
 * covers subcollection docs but NOT the user document itself — so a doc one level down is what the
 * rules actually protect, and adding it needs no rules change.
 */
const profileDoc = (uid: string) => doc(db, 'artifacts', APP_ID, 'users', uid, 'profile', 'main');

/** Reservation docs are keyed by the lowercased name, so uniqueness is case-insensitive. */
const usernameDoc = (key: string) => doc(db, 'usernames', key);

/** The lookup key for a username: lowercased and single-spaced. "Noah T" and "noah t" collide. */
export const usernameKeyOf = (username: string) => normalizeUsername(username).toLowerCase();

export const USERNAME_MAX = 20;
const USERNAME_MIN = 3;

/**
 * Usernames are display names, not enforced-unique handles. (True uniqueness would need a separate
 * index collection written transactionally plus its own rules.) Allowed: letters, digits, spaces,
 * and - _ . — trimmed, single-spaced.
 */
export function validateUsername(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name.length < USERNAME_MIN) return `At least ${USERNAME_MIN} characters.`;
  if (name.length > USERNAME_MAX) return `At most ${USERNAME_MAX} characters.`;
  if (!/^[\p{L}\p{N} _.-]+$/u.test(name)) return 'Letters, numbers, spaces, and - _ . only.';
  return null;
}

export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

export function subscribeUserProfile(
  uid: string,
  onChange: (profile: UserProfile | null) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    profileDoc(uid),
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      const data = snap.data();
      onChange({
        username: typeof data.username === 'string' ? data.username : '',
        avatarId: typeof data.avatarId === 'string' ? data.avatarId : null,
      });
    },
    (err) => onError(err as Error),
  );
}

/** Merge-writes so setting the avatar doesn't clobber the username, and vice versa. */
export async function saveUserProfile(uid: string, patch: Partial<UserProfile>): Promise<void> {
  await setDoc(
    profileDoc(uid),
    { ...patch, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

/**
 * Claims a globally-unique username for this user, atomically:
 *   - if the name is held by someone else, throws UsernameTakenError and writes nothing;
 *   - releases the user's previous reservation (stored as `usernameKey` on the profile);
 *   - reserves the new name and writes it onto the profile.
 *
 * The transaction guarantees no two users can win the same name in a race. Requires the
 * `usernames` security rules to be deployed; until then this fails with permission-denied.
 */
export async function claimUsername(uid: string, desired: string): Promise<void> {
  const username = normalizeUsername(desired);
  const key = usernameKeyOf(username);

  await runTransaction(db, async (tx) => {
    const reservationRef = usernameDoc(key);
    const reservation = await tx.get(reservationRef);
    if (reservation.exists() && reservation.data().uid !== uid) {
      throw new UsernameTakenError();
    }

    // Reads must precede writes in a transaction, so fetch the old key before touching anything.
    const profileRef = profileDoc(uid);
    const profile = await tx.get(profileRef);
    const previousKey = profile.exists() ? (profile.data().usernameKey as string | undefined) : undefined;

    if (previousKey && previousKey !== key) {
      tx.delete(usernameDoc(previousKey));
    }

    tx.set(reservationRef, { uid });
    tx.set(
      profileRef,
      { username, usernameKey: key, updatedAt: serverTimestamp() },
      { merge: true },
    );
  });
}
