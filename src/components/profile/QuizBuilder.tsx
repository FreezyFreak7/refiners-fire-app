import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, CircleCheck, Plus, Trash2 } from 'lucide-react';
import {
  emptyQuestion,
  validateQuestion,
  type MultipleChoiceQuestion,
  type Quiz,
  type QuizQuestion,
  type TrueFalseQuestion,
} from '../../utils/quiz';

interface QuizBuilderProps {
  quiz: Quiz;
  onChange: (questions: QuizQuestion[]) => void;
}

const fieldClass =
  'w-full rounded-xl border border-iron-800 bg-soot-950/60 p-3 text-white outline-none focus:border-gold-500/60';

const QuizBuilder: React.FC<QuizBuilderProps> = ({ quiz, onChange }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const questions = quiz.questions;

  const update = (id: string, patch: Partial<QuizQuestion>) => {
    onChange(questions.map((q) => (q.id === id ? ({ ...q, ...patch } as QuizQuestion) : q)));
  };

  const add = (kind: 'mc' | 'tf') => {
    const question = emptyQuestion(kind);
    onChange([...questions, question]);
    setExpandedId(question.id);
  };

  const remove = (id: string) => onChange(questions.filter((q) => q.id !== id));

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    const next = [...questions];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const renderMultipleChoice = (q: MultipleChoiceQuestion) => (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ash-500">
          Answers — tap the circle to mark the correct one
        </label>

        <div className="space-y-2">
          {q.options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => update(q.id, { correctIndex: index } as Partial<QuizQuestion>)}
                aria-label={`Mark answer ${index + 1} as correct`}
                className={`shrink-0 rounded-full border p-1.5 transition-colors ${
                  q.correctIndex === index
                    ? 'border-green-400/60 bg-green-500/20 text-green-300'
                    : 'border-iron-800 text-ash-600 hover:text-ash-300'
                }`}
              >
                <CircleCheck size={16} />
              </button>

              <input
                value={option}
                onChange={(e) => {
                  const options = [...q.options];
                  options[index] = e.target.value;
                  update(q.id, { options } as Partial<QuizQuestion>);
                }}
                placeholder={`Answer ${index + 1}`}
                className={fieldClass}
              />

              <button
                type="button"
                onClick={() => {
                  const options = q.options.filter((_, i) => i !== index);
                  // Keep the correct answer pointing at the same option after a removal.
                  const correctIndex =
                    index === q.correctIndex
                      ? 0
                      : index < q.correctIndex
                        ? q.correctIndex - 1
                        : q.correctIndex;
                  update(q.id, { options, correctIndex } as Partial<QuizQuestion>);
                }}
                disabled={q.options.length <= 2}
                aria-label={`Remove answer ${index + 1}`}
                className="shrink-0 rounded-lg border border-iron-800 p-2 text-ash-600 hover:border-red-500/40 hover:text-red-300 disabled:opacity-30"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {q.options.length < 5 && (
          <button
            type="button"
            onClick={() => update(q.id, { options: [...q.options, ''] } as Partial<QuizQuestion>)}
            className="mt-2 inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-ash-500 hover:text-gold-400"
          >
            <Plus size={12} /> Add answer
          </button>
        )}
      </div>
    </div>
  );

  const renderTrueFalse = (q: TrueFalseQuestion) => (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ash-500">
        Is this statement true or false?
      </label>
      <div className="grid grid-cols-2 gap-2">
        {[true, false].map((value) => (
          <button
            key={String(value)}
            type="button"
            onClick={() => update(q.id, { isTrue: value } as Partial<QuizQuestion>)}
            className={`rounded-xl border py-3 text-sm font-black uppercase tracking-widest transition-colors ${
              q.isTrue === value
                ? 'border-green-400/60 bg-green-500/15 text-green-300'
                : 'border-iron-800 bg-soot-900/70 text-ash-500 hover:bg-iron-800/40'
            }`}
          >
            {value ? 'True' : 'False'}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      {questions.length === 0 ? (
        <div className="py-10 text-center text-sm text-ash-600">
          No questions yet. Add your first one below.
        </div>
      ) : (
        <div className="space-y-2">
          {questions.map((q, index) => {
            const problem = validateQuestion(q);
            const expanded = expandedId === q.id;

            return (
              <div
                key={q.id}
                className={`rounded-2xl border bg-soot-900/50 ${
                  problem ? 'border-amber-500/30' : 'border-iron-800/60'
                }`}
              >
                <div className="flex items-start gap-3 p-3">
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label="Move question up"
                      className="rounded border border-iron-800 p-1 text-ash-500 hover:text-gold-400 disabled:opacity-30"
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === questions.length - 1}
                      aria-label="Move question down"
                      className="rounded border border-iron-800 p-1 text-ash-500 hover:text-gold-400 disabled:opacity-30"
                    >
                      <ChevronDown size={12} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : q.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-iron-800/40 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-ash-500">
                        {q.kind === 'mc' ? 'Choice' : 'True/False'}
                      </span>
                      <span className="text-xs font-black text-ash-600">#{index + 1}</span>
                      {problem && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-400">
                          <AlertTriangle size={10} /> {problem}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 truncate text-sm text-ash-200">
                      {q.prompt.trim() || <span className="text-ash-600">Untitled question</span>}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => remove(q.id)}
                    aria-label={`Delete question ${index + 1}`}
                    className="shrink-0 rounded-lg border border-iron-800 p-2 text-ash-500 hover:border-red-500/40 hover:text-red-300"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {expanded && (
                  <div className="space-y-3 border-t border-iron-800/60 p-3">
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ash-500">
                        {q.kind === 'tf' ? 'Statement' : 'Question'}
                      </label>
                      <textarea
                        value={q.prompt}
                        onChange={(e) => update(q.id, { prompt: e.target.value })}
                        rows={2}
                        placeholder={
                          q.kind === 'tf'
                            ? 'e.g. Paul wrote the letter to the Hebrews.'
                            : 'e.g. Who did Jesus raise from the dead in Bethany?'
                        }
                        className={fieldClass}
                      />
                    </div>

                    {q.kind === 'mc' ? renderMultipleChoice(q) : renderTrueFalse(q)}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ash-500">
                          Reference (optional)
                        </label>
                        <input
                          value={q.reference ?? ''}
                          onChange={(e) => update(q.id, { reference: e.target.value })}
                          placeholder="John 11:43"
                          className={fieldClass}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ash-500">
                          Explanation (optional)
                        </label>
                        <input
                          value={q.explanation ?? ''}
                          onChange={(e) => update(q.id, { explanation: e.target.value })}
                          placeholder="Shown after answering"
                          className={fieldClass}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => add('mc')}
          className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest"
        >
          <Plus size={14} /> Multiple choice
        </button>
        <button
          type="button"
          onClick={() => add('tf')}
          className="inline-flex items-center gap-2 rounded-xl border border-iron-800 bg-soot-900/70 px-4 py-3 text-xs font-black uppercase tracking-widest text-ash-200 hover:bg-iron-800/40"
        >
          <Plus size={14} /> True / false
        </button>
      </div>
    </div>
  );
};

export default QuizBuilder;
