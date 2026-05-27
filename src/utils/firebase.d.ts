declare module './utils/firebase' {
  import type { Auth } from 'firebase/auth';
  import type { Firestore } from 'firebase/firestore';

  export const auth: Auth | undefined;
  export const db: Firestore | undefined;
}

declare module './utils/firebase.js' {
  import type { Auth } from 'firebase/auth';
  import type { Firestore } from 'firebase/firestore';

  export const auth: Auth | undefined;
  export const db: Firestore | undefined;
}
