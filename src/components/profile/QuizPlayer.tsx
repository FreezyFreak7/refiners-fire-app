import React, { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle, RotateCcw, Trophy, XCircle } from 'lucide-react';
import { matchesTypedAnswer, verseWords, type FillBlanksQuestion, type Quiz, type QuizQuestion, type TypedBlankQuestion, type VerseBuilderQuestion } from '../../utils/quiz';

interface QuizPlayerProps {
  quiz: Quiz;
  onExit: () => void;
}

/** What the player gave: an option index (mc/blanks), a boolean (tf), typed text, or a built order. */
type Answer = number | boolean | string | string[];

const shuffle = <T,>(items: T[]): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

/** Tap-to-order board for a verse-builder question. Local state resets via the parent's key. */
const VerseBuilderBoard: React.FC<{
  question: VerseBuilderQuestion;
  answered: boolean;
  onSubmit: (order: string[]) => void;
}> = ({ question, answered, onSubmit }) => {
  const [placed, setPlaced] = useState<string[]>([]);
  const [pool, setPool] = useState<string[]>(() => shuffle(question.chunks));

  return (
    <div className="space-y-4">
      <div className="min-h-[3rem] rounded-xl border border-iron-800 bg-soot-950/40 p-3">
        {placed.length === 0 ? (
          <span className="text-sm text-ash-600">Tap the chunks below in order…</span>
        ) : (
          // Each placed chunk has ‹ › to nudge it left/right (fix a mistake without restarting) and
          // the body taps back to the pool.
          <div className="flex flex-wrap gap-2">
            {placed.map((chunk, i) => (
              <div
                key={`${chunk}-${i}`}
                className="inline-flex items-stretch overflow-hidden rounded-lg border border-gold-500/40 bg-gold-700/15"
              >
                <button
                  type="button"
                  disabled={answered || i === 0}
                  aria-label="Move left"
                  onClick={() =>
                    setPlaced((pl) => {
                      const n = [...pl];
                      [n[i - 1], n[i]] = [n[i], n[i - 1]];
                      return n;
                    })
                  }
                  className="px-1.5 text-ash-400 hover:bg-gold-700/30 disabled:opacity-25"
                >
                  ‹
                </button>
                <button
                  type="button"
                  disabled={answered}
                  onClick={() => {
                    setPool((p) => [...p, chunk]);
                    setPlaced((pl) => pl.filter((_, idx) => idx !== i));
                  }}
                  className="px-2 py-1.5 text-sm text-ash-200 disabled:cursor-default"
                >
                  {chunk}
                </button>
                <button
                  type="button"
                  disabled={answered || i === placed.length - 1}
                  aria-label="Move right"
                  onClick={() =>
                    setPlaced((pl) => {
                      const n = [...pl];
                      [n[i], n[i + 1]] = [n[i + 1], n[i]];
                      return n;
                    })
                  }
                  className="px-1.5 text-ash-400 hover:bg-gold-700/30 disabled:opacity-25"
                >
                  ›
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {!answered && pool.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pool.map((chunk, i) => (
            <button
              key={`${chunk}-${i}`}
              type="button"
              onClick={() => {
                setPlaced((pl) => [...pl, chunk]);
                setPool((p) => p.filter((_, idx) => idx !== i));
              }}
              className="rounded-lg border border-iron-800 bg-soot-900/70 px-3 py-1.5 text-sm font-bold text-ash-200 transition-colors hover:border-gold-500/40 hover:bg-iron-800/40"
            >
              {chunk}
            </button>
          ))}
        </div>
      )}

      {!answered && pool.length === 0 && (
        <button
          type="button"
          onClick={() => onSubmit([...placed])}
          className="btn-primary w-full rounded-xl py-3 text-sm font-black uppercase tracking-widest"
        >
          Check order
        </button>
      )}
    </div>
  );
};

const isCorrect = (question: QuizQuestion, answer: Answer): boolean => {
  switch (question.kind) {
    case 'mc':
      return answer === question.correctIndex;
    case 'tf':
      return answer === question.isTrue;
    case 'blanks':
    case 'type':
      return (
        Array.isArray(answer) &&
        answer.length === question.answers.length &&
        answer.every((w, i) => typeof w === 'string' && matchesTypedAnswer(w, question.answers[i]))
      );
    case 'builder':
      return Array.isArray(answer) && answer.join('') === question.chunks.join('');
  }
};

/** Renders a prompt (verse with `_____` tokens) as text with a React node in place of each blank. */
const renderWithBlanks = (prompt: string, slot: (i: number) => React.ReactNode) => {
  const parts = prompt.split('_____');
  return (
    <span>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {part}
          {i < parts.length - 1 && slot(i)}
        </React.Fragment>
      ))}
    </span>
  );
};

/** Word-bank board for a (multi-)fill-blanks question. Tap a bank word to fill the next blank. */
const BlanksBoard: React.FC<{
  question: FillBlanksQuestion;
  answered: boolean;
  onSubmit: (words: string[]) => void;
}> = ({ question, answered, onSubmit }) => {
  const blanks = question.answers.length;
  // Each slot holds a bank index, or null. The bank is question.options.
  const [slots, setSlots] = useState<(number | null)[]>(Array(blanks).fill(null));

  const usedBank = new Set(slots.filter((s): s is number => s !== null));
  const fillNext = (bankIdx: number) => {
    const empty = slots.findIndex((s) => s === null);
    if (empty === -1) return;
    setSlots((cur) => cur.map((s, i) => (i === empty ? bankIdx : s)));
  };
  const clearSlot = (slotIdx: number) => setSlots((cur) => cur.map((s, i) => (i === slotIdx ? null : s)));

  const allFilled = slots.every((s) => s !== null);
  const filledWords = () => slots.map((s) => (s === null ? '' : question.options[s]));

  return (
    <div className="space-y-4">
      <div className="text-xl font-bold leading-loose text-white">
        {renderWithBlanks(question.prompt, (i) => {
          const bankIdx = slots[i];
          return (
            <button
              type="button"
              disabled={answered || bankIdx === null}
              onClick={() => clearSlot(i)}
              className={`mx-1 inline-block min-w-[4rem] rounded border-b-2 px-2 text-center align-baseline ${
                bankIdx === null
                  ? 'border-gold-500/50 text-transparent'
                  : 'border-gold-500 bg-gold-700/15 text-gold-200'
              }`}
            >
              {bankIdx === null ? '···' : question.options[bankIdx]}
            </button>
          );
        })}
      </div>

      {!answered && (
        <div className="flex flex-wrap gap-2">
          {question.options.map((word, i) => (
            <button
              key={i}
              type="button"
              disabled={usedBank.has(i)}
              onClick={() => fillNext(i)}
              className="rounded-lg border border-iron-800 bg-soot-900/70 px-3 py-1.5 text-sm font-bold text-ash-200 transition-colors hover:border-gold-500/40 hover:bg-iron-800/40 disabled:opacity-30"
            >
              {word}
            </button>
          ))}
        </div>
      )}

      {!answered && allFilled && (
        <button
          type="button"
          onClick={() => onSubmit(filledWords())}
          className="btn-primary w-full rounded-xl py-3 text-sm font-black uppercase tracking-widest"
        >
          Check answer
        </button>
      )}
    </div>
  );
};

/** Multi-input board for a type-the-words question. */
const TypedBoard: React.FC<{
  question: TypedBlankQuestion;
  answered: boolean;
  onSubmit: (words: string[]) => void;
}> = ({ question, answered, onSubmit }) => {
  const [inputs, setInputs] = useState<string[]>(Array(question.answers.length).fill(''));
  const words = verseWords(question.verseText);

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (inputs.every((t) => t.trim()) && !answered) onSubmit(inputs); }}
      className="space-y-3"
    >
      <div className="text-xl font-bold leading-loose text-white">
        {renderWithBlanks(question.prompt, () => (
          <span className="mx-1 inline-block min-w-[3rem] border-b-2 border-gold-500/50 align-baseline">&nbsp;</span>
        ))}
      </div>

      <div className="space-y-2">
        {question.blankIndexes.map((wi, i) => {
          // A hint word before the blank helps the player know which blank this is.
          const before = words.slice(Math.max(0, wi - 2), wi).join(' ');
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="w-32 shrink-0 truncate text-right text-xs text-ash-500">…{before}</span>
              <input
                value={inputs[i]}
                onChange={(e) => setInputs((cur) => cur.map((t, j) => (j === i ? e.target.value : t)))}
                disabled={answered}
                autoFocus={i === 0}
                placeholder={`Blank ${i + 1}`}
                className="flex-1 rounded-xl border border-iron-800 bg-soot-950/60 p-3 text-white outline-none focus:border-gold-500/60 disabled:opacity-60"
              />
            </div>
          );
        })}
      </div>

      {!answered && (
        <button
          type="submit"
          disabled={!inputs.every((t) => t.trim())}
          className="btn-primary w-full rounded-xl py-3 text-sm font-black uppercase tracking-widest disabled:opacity-40"
        >
          Check answer
        </button>
      )}
    </form>
  );
};

const QuizPlayer: React.FC<QuizPlayerProps> = ({ quiz, onExit }) => {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const question = quiz.questions[index];
  const total = quiz.questions.length;

  const correctLabel = useMemo(() => {
    if (!question) return '';
    switch (question.kind) {
      case 'mc':
        return question.options[question.correctIndex];
      case 'tf':
        return question.isTrue ? 'True' : 'False';
      case 'blanks':
      case 'type':
        return question.answers.join(', ');
      case 'builder':
        return question.chunks.join(' ');
    }
  }, [question]);

  const submit = (value: Answer) => {
    if (answer !== null) return; // already answered this one
    setAnswer(value);
    if (isCorrect(question, value)) setScore((s) => s + 1);
  };

  const next = () => {
    if (index + 1 >= total) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setAnswer(null);
  };

  const restart = () => {
    setIndex(0);
    setAnswer(null);
    setScore(0);
    setFinished(false);
  };

  if (finished) {
    const pct = total ? Math.round((score / total) * 100) : 0;

    return (
      <div className="rounded-2xl border border-iron-800/60 bg-soot-900/70 p-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-gold-400/30 bg-gold-500/15 text-gold-400">
          <Trophy size={30} />
        </div>
        <h2 className="text-2xl font-black text-white">{quiz.name}</h2>
        <div className="mt-2 text-sm text-ash-500">
          You scored <span className="font-black text-gold-400">{score}</span> out of {total} ({pct}%)
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={restart}
            className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-black uppercase tracking-widest"
          >
            <RotateCcw size={14} /> Play again
          </button>
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-2 rounded-xl border border-iron-800 bg-soot-900/70 px-5 py-3 text-xs font-black uppercase tracking-widest text-ash-200 hover:bg-iron-800/40"
          >
            <ArrowLeft size={14} /> Back to quizzes
          </button>
        </div>
      </div>
    );
  }

  if (!question) return null;

  const answered = answer !== null;
  const gotItRight = answered && isCorrect(question, answer);

  const optionClass = (selected: boolean, correct: boolean) => {
    if (!answered) {
      return 'border-iron-800 bg-soot-900/70 text-ash-200 hover:border-gold-500/40 hover:bg-iron-800/40';
    }
    if (correct) return 'border-green-400/60 bg-green-500/15 text-green-200';
    if (selected) return 'border-red-500/50 bg-red-950/30 text-red-200';
    return 'border-iron-800/60 bg-soot-900/50 text-ash-600';
  };

  return (
    <div className="rounded-2xl border border-iron-800/60 bg-soot-900/70 p-6">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-ash-500 hover:text-gold-400"
        >
          <ArrowLeft size={14} /> Quit
        </button>
        <div className="text-xs font-black uppercase tracking-widest text-ash-600">
          Question {index + 1} of {total} · Score {score}
        </div>
      </div>

      {question.reference && question.kind !== 'mc' && question.kind !== 'tf' && (
        <div className="mb-2 text-sm font-black uppercase tracking-widest text-gold-400">{question.reference}</div>
      )}
      {(question.kind === 'mc' || question.kind === 'tf') && (
        <div className="mb-5 text-xl font-bold leading-relaxed text-white">{question.prompt}</div>
      )}
      {question.kind === 'builder' && (
        <div className="mb-5 text-xl font-bold leading-relaxed text-white">Put the verse back in order.</div>
      )}

      {question.kind === 'mc' && (
        <div className="space-y-2">
          {question.options.map((option, i) => (
            <button
              key={i}
              type="button"
              onClick={() => submit(i)}
              disabled={answered}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-base font-bold transition-colors disabled:cursor-default ${optionClass(
                answer === i,
                i === question.correctIndex,
              )}`}
            >
              {option}
              {answered && i === question.correctIndex && <CheckCircle size={16} />}
              {answered && answer === i && i !== question.correctIndex && <XCircle size={16} />}
            </button>
          ))}
        </div>
      )}

      {question.kind === 'blanks' && (
        <BlanksBoard key={question.id} question={question} answered={answered} onSubmit={submit} />
      )}

      {question.kind === 'tf' && (
        <div className="grid grid-cols-2 gap-2">
          {[true, false].map((value) => (
            <button
              key={String(value)}
              type="button"
              onClick={() => submit(value)}
              disabled={answered}
              className={`rounded-xl border py-4 text-sm font-black uppercase tracking-widest transition-colors disabled:cursor-default ${optionClass(
                answer === value,
                value === question.isTrue,
              )}`}
            >
              {value ? 'True' : 'False'}
            </button>
          ))}
        </div>
      )}

      {question.kind === 'builder' && (
        // Keyed by id so each question starts with a fresh, freshly-scrambled board.
        <VerseBuilderBoard key={question.id} question={question} answered={answered} onSubmit={submit} />
      )}

      {question.kind === 'type' && (
        <TypedBoard key={question.id} question={question} answered={answered} onSubmit={submit} />
      )}

      {answered && (
        <div
          className={`mt-5 rounded-xl border p-4 ${
            gotItRight
              ? 'border-green-500/30 bg-green-950/20'
              : 'border-red-500/30 bg-red-950/20'
          }`}
        >
          <div
            className={`text-xs font-black uppercase tracking-widest ${
              gotItRight ? 'text-green-300' : 'text-red-300'
            }`}
          >
            {gotItRight ? 'Correct' : `Not quite — the answer was “${correctLabel}”`}
          </div>

          {question.explanation && (
            <div className="mt-2 text-sm text-ash-300">{question.explanation}</div>
          )}
          {question.reference && (
            <div className="mt-1 text-xs font-black uppercase tracking-widest text-gold-400">
              {question.reference}
            </div>
          )}

          <button
            type="button"
            onClick={next}
            className="btn-primary mt-4 w-full rounded-xl py-3 text-sm font-black uppercase tracking-widest"
          >
            {index + 1 >= total ? 'See results' : 'Next question'}
          </button>
        </div>
      )}
    </div>
  );
};

export default QuizPlayer;
