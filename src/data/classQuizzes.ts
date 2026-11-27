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
  /** `prompt` replaces the default "Put the verse in order." line, for questions that aren't verses. */
  | { kind: 'builder'; verse: string; chunks: string[]; prompt?: string };

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
  {
    id: 'rev-2',
    name: 'Revelation 2',
    questions: [
      { kind: 'builder', verse: 'Rev 2:1', chunks: ['These are the words of him', 'who holds the seven stars', 'in his right hand', 'and walks among', 'the seven golden lampstands:'] },
      { kind: 'blank', verse: 'Rev 2:2', prompt: 'I know your deeds, your hard _____ and your _____. I know that you cannot tolerate _____ men...', answers: ['work', 'perseverance', 'wicked'], decoys: ['labor', 'patience', 'evil', 'godless'] },
      { kind: 'builder', verse: 'Rev 2:4', chunks: ['Yet I hold this against you:', 'You have forsaken', 'your first love.'] },
      { kind: 'blank', verse: 'Rev 2:5', prompt: 'Remember the _____ from which you have fallen! _____ and do the things you did at first. ...I will come to you and remove your _____ from its place.', answers: ['height', 'Repent', 'lampstand'], decoys: ['depth', 'Return', 'candle', 'crown'] },
      { kind: 'blank', verse: 'Rev 2:7', prompt: 'To him who overcomes, I will give the right to eat from the _____ of _____, which is in the _____ of God.', answers: ['tree', 'life', 'paradise'], decoys: ['vine', 'knowledge', 'garden', 'kingdom'] },
      { kind: 'blank', verse: 'Rev 2:8', prompt: '...the words of him who is the _____ and the _____, who died and came to life _____.', answers: ['First', 'Last', 'again'], decoys: ['Alpha', 'End', 'Beginning', 'forever'] },
      { kind: 'blank', verse: 'Rev 2:9', prompt: 'I know your _____ and your _____-- yet you are _____!', answers: ['afflictions', 'poverty', 'rich'], decoys: ['sufferings', 'weakness', 'wealthy', 'blessed'] },
      { kind: 'blank', verse: 'Rev 2:10', prompt: '...the devil will put some of you in _____ to test you, and you will suffer persecution for _____ days.', answers: ['prison', 'ten'], decoys: ['chains', 'exile', 'seven', 'forty'] },
      { kind: 'builder', verse: 'Rev 2:10', chunks: ['Be faithful,', 'even to the point of death,', 'and I will give you', 'the crown of life.'] },
      { kind: 'blank', verse: 'Rev 2:11', prompt: 'He who overcomes will not be _____ at all by the second _____.', answers: ['hurt', 'death'], decoys: ['harmed', 'judgment', 'touched', 'fire'] },
      { kind: 'blank', verse: 'Rev 2:13', prompt: 'I know where you live-- where _____ has his _____. Yet you remain true to my name.', answers: ['Satan', 'throne'], decoys: ['the devil', 'seat', 'altar', 'dwelling'] },
      { kind: 'blank', verse: 'Rev 2:13', prompt: '...even in the days of _____, my faithful _____, who was put to death in your city...', answers: ['Antipas', 'witness'], decoys: ['Stephen', 'Balaam', 'servant', 'martyr'] },
      { kind: 'blank', verse: 'Rev 2:14', prompt: '...the teaching of _____, who taught _____ to entice the Israelites to sin by eating food sacrificed to _____...', answers: ['Balaam', 'Balak', 'idols'], decoys: ['Korah', 'Moab', 'Baal', 'demons'] },
      { kind: 'builder', verse: 'Rev 2:16', chunks: ['Repent therefore!', 'Otherwise, I will soon come to you', 'and will fight against them', 'with the sword of my mouth.'] },
      { kind: 'blank', verse: 'Rev 2:17', prompt: '...I will give some of the hidden _____. I will also give him a white _____ with a new _____ written on it...', answers: ['manna', 'stone', 'name'], decoys: ['bread', 'scroll', 'crown', 'title'] },
      { kind: 'blank', verse: 'Rev 2:18', prompt: '...the Son of God, whose eyes are like blazing _____ and whose feet are like burnished _____.', answers: ['fire', 'bronze'], decoys: ['flame', 'gold', 'lightning', 'silver'] },
      { kind: 'builder', verse: 'Rev 2:19', chunks: ['I know your deeds,', 'your love and faith,', 'your service and perseverance,', 'and that you are now doing', 'more than you did at first.'] },
      { kind: 'blank', verse: 'Rev 2:20', prompt: 'You tolerate that woman _____, who calls herself a _____.', answers: ['Jezebel', 'prophetess'], decoys: ['Delilah', 'Athaliah', 'queen', 'teacher'] },
      { kind: 'blank', verse: 'Rev 2:23', prompt: '...I am he who searches _____ and _____, and I will repay each of you according to your _____.', answers: ['hearts', 'minds', 'deeds'], decoys: ['souls', 'thoughts', 'works', 'ways'] },
      { kind: 'builder', verse: 'Rev 2:25', chunks: ['Only hold on', 'to what you have', 'until I come.'] },
      { kind: 'blank', verse: 'Rev 2:27-28', prompt: "'He will rule them with an iron _____; he will dash them to pieces like _____'... I will also give him the _____ star.", answers: ['scepter', 'pottery', 'morning'], decoys: ['rod', 'clay', 'evening', 'bright'] },
    ],
  },
];
