import React from 'react';
import { ArrowLeft } from 'lucide-react';
import QuizPlayer from './QuizPlayer';
import type { Quiz } from '../../utils/quiz';

interface QuizPlayScreenProps {
  quiz: Quiz;
  /** Shown as "Shared by …" for a quiz opened from a link. */
  byline?: string;
  onExit: () => void;
}

/** A quiz played on its own page, rather than inline in the profile. */
const QuizPlayScreen: React.FC<QuizPlayScreenProps> = ({ quiz, byline, onExit }) => (
  <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-10">
    <div className="mb-6 flex items-center justify-between">
      <button
        type="button"
        onClick={onExit}
        className="inline-flex items-center gap-2 border border-iron-800 bg-soot-900/70 px-4 py-2 font-display text-sm font-semibold uppercase tracking-forge text-ash-300 hover:bg-iron-800/40"
      >
        <ArrowLeft size={16} /> Leave
      </button>
      <div className="stamp">{byline ? `Shared by ${byline}` : quiz.name}</div>
    </div>

    <QuizPlayer quiz={quiz} onExit={onExit} />
  </div>
);

export default QuizPlayScreen;
