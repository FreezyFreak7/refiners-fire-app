import React, { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle, RotateCcw, Trophy, XCircle } from 'lucide-react';
import type { Quiz, QuizQuestion } from '../../utils/quiz';

interface QuizPlayerProps {
  quiz: Quiz;
  onExit: () => void;
}

/** What the player picked: an option index for multiple choice, or a boolean for true/false. */
type Answer = number | boolean;

const isCorrect = (question: QuizQuestion, answer: Answer): boolean =>
  question.kind === 'mc' ? answer === question.correctIndex : answer === question.isTrue;

const QuizPlayer: React.FC<QuizPlayerProps> = ({ quiz, onExit }) => {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const question = quiz.questions[index];
  const total = quiz.questions.length;

  const correctLabel = useMemo(() => {
    if (!question) return '';
    return question.kind === 'mc'
      ? question.options[question.correctIndex]
      : question.isTrue
        ? 'True'
        : 'False';
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

      <div className="mb-5 text-lg font-bold text-white">{question.prompt}</div>

      {question.kind === 'mc' ? (
        <div className="space-y-2">
          {question.options.map((option, i) => (
            <button
              key={i}
              type="button"
              onClick={() => submit(i)}
              disabled={answered}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-bold transition-colors disabled:cursor-default ${optionClass(
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
      ) : (
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
