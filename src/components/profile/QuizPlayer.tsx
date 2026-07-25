import React, { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle, RotateCcw, Trophy, XCircle } from 'lucide-react';
import { matchesTypedAnswer, type Quiz, type QuizQuestion, type VerseBuilderQuestion } from '../../utils/quiz';

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
          <div className="flex flex-wrap gap-2">
            {placed.map((chunk, i) => (
              <button
                key={`${chunk}-${i}`}
                type="button"
                disabled={answered}
                onClick={() => {
                  setPool((p) => [...p, chunk]);
                  setPlaced((pl) => pl.filter((_, idx) => idx !== i));
                }}
                className="rounded-lg border border-gold-500/40 bg-gold-700/15 px-3 py-1.5 text-sm text-ash-200 disabled:cursor-default"
              >
                {chunk}
              </button>
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
    case 'blanks':
      return answer === question.correctIndex;
    case 'tf':
      return answer === question.isTrue;
    case 'type':
      return typeof answer === 'string' && matchesTypedAnswer(answer, question.answer);
    case 'builder':
      return Array.isArray(answer) && answer.join('') === question.chunks.join('');
  }
};

/** Text-entry board for a type-the-word question, keyed so it resets per question. */
const TypeAnswerBoard: React.FC<{ answered: boolean; onSubmit: (text: string) => void }> = ({ answered, onSubmit }) => {
  const [text, setText] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (text.trim() && !answered) onSubmit(text); }} className="space-y-3">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={answered}
        autoFocus
        placeholder="Type the missing word…"
        className="w-full rounded-xl border border-iron-800 bg-soot-950/60 p-3 text-lg text-white outline-none focus:border-gold-500/60 disabled:opacity-60"
      />
      {!answered && (
        <button type="submit" disabled={!text.trim()} className="btn-primary w-full rounded-xl py-3 text-sm font-black uppercase tracking-widest disabled:opacity-40">
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
      case 'blanks':
        return question.options[question.correctIndex];
      case 'tf':
        return question.isTrue ? 'True' : 'False';
      case 'type':
        return question.answer;
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
      <div className="mb-5 text-xl font-bold leading-relaxed text-white">
        {question.kind === 'builder' ? 'Put the verse back in order.' : question.prompt}
      </div>

      {(question.kind === 'mc' || question.kind === 'blanks') && (
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
        <TypeAnswerBoard key={question.id} answered={answered} onSubmit={(t) => submit(t)} />
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
