declare module '*.js';

declare module '*utils/firebase' {
  export const auth: any;
  export const db: any;
}

declare module '*data/gameData' {
  export const gameData: any;
}

declare module '*data/acts' {
  export const acts: any;
}

declare module '*data/chapters' {
  export const chapters: any;
}

declare module '*utils/helpers' {
  export const shuffleArray: any;
}
