import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { APP_ID } from './appConfig';
import { formatRef, refToId, type Verse, type VerseRef } from './bible';

export interface SavedPassage extends Verse {
  id: string;
  reference: string;
}

export interface PlaylistVerse extends Verse {
  reference: string;
}

export interface Playlist {
  id: string;
  name: string;
  verses: PlaylistVerse[];
  createdAt: number | null;
  updatedAt: number | null;
}

/**
 * Profile data is per-user and private, so it is namespaced by uid — unlike live sessions,
 * which deliberately live under .../public/data/sessions. The security rules in
 * firestore.rules pin each subtree to its owner's uid.
 */
const savedPassagesCollection = (uid: string) =>
  collection(db, 'artifacts', APP_ID, 'users', uid, 'savedPassages');

const playlistsCollection = (uid: string) =>
  collection(db, 'artifacts', APP_ID, 'users', uid, 'playlists');

/** Firestore Timestamps only materialise after the server round-trip, so this tolerates nulls. */
const toMillis = (value: unknown): number | null =>
  value instanceof Timestamp ? value.toMillis() : null;

export function subscribeSavedPassages(
  uid: string,
  onChange: (passages: SavedPassage[]) => void,
  onError: (error: Error) => void,
) {
  const q = query(savedPassagesCollection(uid), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      onChange(
        snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            book: data.book,
            chapter: data.chapter,
            verse: data.verse,
            text: data.text,
            reference: data.reference,
          };
        }),
      );
    },
    (err) => onError(err as Error),
  );
}

export async function savePassage(uid: string, verse: Verse): Promise<void> {
  const id = refToId(verse);
  await setDoc(doc(savedPassagesCollection(uid), id), {
    book: verse.book,
    chapter: verse.chapter,
    verse: verse.verse,
    text: verse.text,
    reference: formatRef(verse),
    createdAt: serverTimestamp(),
  });
}

export async function removePassage(uid: string, ref: VerseRef): Promise<void> {
  await deleteDoc(doc(savedPassagesCollection(uid), refToId(ref)));
}

export function subscribePlaylists(
  uid: string,
  onChange: (playlists: Playlist[]) => void,
  onError: (error: Error) => void,
) {
  const q = query(playlistsCollection(uid), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      onChange(
        snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name ?? 'Untitled',
            verses: Array.isArray(data.verses) ? (data.verses as PlaylistVerse[]) : [],
            createdAt: toMillis(data.createdAt),
            updatedAt: toMillis(data.updatedAt),
          };
        }),
      );
    },
    (err) => onError(err as Error),
  );
}

export async function createPlaylist(uid: string, name: string): Promise<string> {
  const ref = doc(playlistsCollection(uid));
  await setDoc(ref, {
    name: name.trim() || 'Untitled',
    verses: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function renamePlaylist(uid: string, playlistId: string, name: string): Promise<void> {
  await updateDoc(doc(playlistsCollection(uid), playlistId), {
    name: name.trim() || 'Untitled',
    updatedAt: serverTimestamp(),
  });
}

export async function deletePlaylist(uid: string, playlistId: string): Promise<void> {
  await deleteDoc(doc(playlistsCollection(uid), playlistId));
}

/**
 * Verses are stored as an ordered array on the playlist doc rather than a subcollection:
 * order is the point of a playlist, and a whole playlist is always read at once. Callers pass
 * the current list so we can write the new order atomically without a read-modify-write race
 * against the snapshot listener.
 */
export async function setPlaylistVerses(
  uid: string,
  playlistId: string,
  verses: PlaylistVerse[],
): Promise<void> {
  await updateDoc(doc(playlistsCollection(uid), playlistId), {
    verses,
    updatedAt: serverTimestamp(),
  });
}

export function toPlaylistVerse(verse: Verse): PlaylistVerse {
  return { ...verse, reference: formatRef(verse) };
}
