/**
 * Hand-written quizzes a host can run in a live room ("Class Quizzes"). Available to every host.
 * Text is NIV 1984, the same translation as public/bible/niv1984.json.
 *
 * Questions play in the order written here (they follow the passage). The word bank and builder
 * chunks are shuffled by the host at start, so the order here is the correct order.
 *
 * Blank questions: each `_____` in the prompt is filled, in order, from `answers`. The word bank
 * shown to players is the answers plus the decoys.
 */

export type ClassQuizQuestion =
  | { kind: 'blank'; verse: string; prompt: string; answers: string[]; decoys: string[] }
  | { kind: 'builder'; verse: string; chunks: string[] };

export interface ClassQuiz {
  id: string;
  name: string;
  questions: ClassQuizQuestion[];
}

export const CLASS_QUIZZES: ClassQuiz[] = [
  {
    id: 'rev-1-9-20',
    name: 'Revelation 1:9-20',
    questions: [
      { kind: 'builder', verse: 'Rev 1:9', chunks: ['I, John,', 'your brother and companion', 'in the suffering', 'and kingdom', 'and patient endurance', 'that are ours in Jesus,'] },
      { kind: 'blank', verse: 'Rev 1:9', prompt: '...was on the island of Patmos because of the _____ of God and the _____ of Jesus.', answers: ['word', 'testimony'], decoys: ['gospel', 'witness', 'Spirit', 'name'] },
      { kind: 'builder', verse: 'Rev 1:10', chunks: ["On the Lord's Day", 'I was in the Spirit,', 'and I heard behind me', 'a loud voice', 'like a trumpet,'] },
      { kind: 'blank', verse: 'Rev 1:11', prompt: '...send it to the seven churches: to Ephesus, _____, _____, Thyatira, Sardis, _____ and Laodicea.', answers: ['Smyrna', 'Pergamum', 'Philadelphia'], decoys: ['Colosse', 'Antioch', 'Corinth', 'Galatia'] },
      { kind: 'builder', verse: 'Rev 1:12', chunks: ['I turned around', 'to see the voice', 'that was speaking to me.', 'And when I turned', 'I saw seven', 'golden lampstands,'] },
      { kind: 'blank', verse: 'Rev 1:13', prompt: '...dressed in a _____ reaching down to his feet and with a golden _____ around his chest.', answers: ['robe', 'sash'], decoys: ['cloak', 'tunic', 'belt', 'chain'] },
      { kind: 'blank', verse: 'Rev 1:14', prompt: 'His head and hair were white like _____, as white as _____, and his eyes were like _____ fire.', answers: ['wool', 'snow', 'blazing'], decoys: ['linen', 'milk', 'burning', 'consuming'] },
      { kind: 'blank', verse: 'Rev 1:15', prompt: 'His feet were like _____ glowing in a _____, and his voice was like the sound of rushing _____.', answers: ['bronze', 'furnace', 'waters'], decoys: ['gold', 'fire', 'wind', 'thunder'] },
      { kind: 'builder', verse: 'Rev 1:16', chunks: ['In his right hand', 'he held seven stars,', 'and out of his mouth', 'came a sharp', 'double-edged sword.'] },
      { kind: 'blank', verse: 'Rev 1:16', prompt: 'His face was like the _____ shining in all its _____.', answers: ['sun', 'brilliance'], decoys: ['moon', 'lightning', 'glory', 'splendor'] },
      { kind: 'blank', verse: 'Rev 1:17', prompt: 'When I saw him, I fell at his _____ as though _____. Then he placed his right _____ on me...', answers: ['feet', 'dead', 'hand'], decoys: ['knees', 'asleep', 'face', 'staff'] },
      { kind: 'builder', verse: 'Rev 1:17-18', chunks: ['Do not be afraid.', 'I am the First', 'and the Last.', 'I am the Living One;', 'I was dead,', 'and behold I am alive', 'for ever and ever!'] },
      { kind: 'blank', verse: 'Rev 1:18', prompt: 'And I hold the _____ of _____ and _____.', answers: ['keys', 'death', 'Hades'], decoys: ['gates', 'life', 'the grave', 'the abyss'] },
      { kind: 'builder', verse: 'Rev 1:19', chunks: ['Write, therefore,', 'what you have seen,', 'what is now', 'and what will', 'take place later.'] },
      { kind: 'blank', verse: 'Rev 1:20', prompt: 'The seven stars are the _____ of the seven churches, and the seven _____ are the seven _____.', answers: ['angels', 'lampstands', 'churches'], decoys: ['elders', 'spirits', 'candles', 'cities'] },
    ],
  },
];
