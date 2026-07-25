import React, { useState } from 'react';
import { AlertTriangle, BookOpen, ChevronDown, ChevronUp, CircleCheck, ListOrdered, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import VersePicker from './VersePicker';
import type { Verse } from '../../utils/bible';
import {
  autoFillBlanks,
  autoFillTyped,
  blanksFromVerse,
  builderFromVerse,
  emptyQuestion,
  isBlankableWord,
  toggleBlanksWord,
  toggleTypedWord,
  typedFromVerse,
  validateQuestion,
  verseWords,
  type BlankDifficulty,
  type FillBlanksQuestion,
  type MultipleChoiceQuestion,
  type Quiz,
  type QuizQuestion,
  type TrueFalseQuestion,
  type TypedBlankQuestion,
  type VerseBuilderQuestion,
} from '../../utils/quiz';

const AUTO_LEVELS: { key: BlankDifficulty; label: string }[] = [
  { key: 'easy', label: 'Easy' },
  { key: 'medium', label: 'Medium' },
  { key: 'hard', label: 'Hard' },
];

interface QuizBuilderProps {
  quiz: Quiz;
  onChange: (questions: QuizQuestion[]) => void;
}

/** Short label for the type chip on each question row. */
const KIND_CHIP: Record<QuizQuestion['kind'], string> = {
  mc: 'Choice',
  tf: 'True/False',
  blanks: 'Blanks',
  type: 'Type',
  builder: 'Builder',
};

const fieldClass =
  'w-full rounded-xl border border-iron-800 bg-soot-950/60 p-3 text-white outline-none focus:border-gold-500/60';

const QuizBuilder: React.FC<QuizBuilderProps> = ({ quiz, onChange }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // When set, the verse picker is open to generate a question of this kind (or replace `replaceId`).
  const [versePickerFor, setVersePickerFor] = useState<
    { kind: 'blanks' | 'builder' | 'type'; replaceId?: string } | null
  >(null);
  const [genError, setGenError] = useState<string | null>(null);

  const questions = quiz.questions;

  const update = (id: string, patch: Partial<QuizQuestion>) => {
    onChange(questions.map((q) => (q.id === id ? ({ ...q, ...patch } as QuizQuestion) : q)));
  };

  const add = (kind: 'mc' | 'tf') => {
    const question = emptyQuestion(kind);
    onChange([...questions, question]);
    setExpandedId(question.id);
  };

  // Fill-blanks, type-the-word and verse-builder are generated from a picked verse.
  const handleVersePicked = (verse: Verse) => {
    if (!versePickerFor) return;
    const generated =
      versePickerFor.kind === 'blanks'
        ? blanksFromVerse(verse)
        : versePickerFor.kind === 'type'
          ? typedFromVerse(verse)
          : builderFromVerse(verse);

    if (!generated) {
      // Close so the error below the add buttons is visible (it would sit behind the picker).
      setVersePickerFor(null);
      setGenError(
        versePickerFor.kind === 'builder'
          ? 'That verse is too short to build. Pick a longer one.'
          : 'Could not make a question from that verse.',
      );
      return;
    }

    if (versePickerFor.replaceId) {
      // Keep the question's position and its explanation when swapping the verse.
      const prev = questions.find((q) => q.id === versePickerFor.replaceId);
      const merged = { ...generated, id: versePickerFor.replaceId, explanation: prev?.explanation };
      onChange(questions.map((q) => (q.id === versePickerFor.replaceId ? merged : q)));
    } else {
      onChange([...questions, generated]);
      setExpandedId(generated.id);
    }
    setVersePickerFor(null);
    setGenError(null);
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

  // The verse, with each word tappable to toggle it in/out of the blanks (multiple allowed).
  const wordChooser = (verseText: string, blankIndexes: number[], onToggle: (i: number) => void) => {
    const chosen = new Set(blankIndexes);
    return (
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ash-500">
          Tap words to blank them ({blankIndexes.length} selected)
        </label>
        <div className="flex flex-wrap gap-1.5 rounded-xl border border-iron-800 bg-soot-950/40 p-3 leading-relaxed">
          {verseWords(verseText).map((word, i) => {
            const blankable = isBlankableWord(word);
            return (
              <button
                key={i}
                type="button"
                disabled={!blankable}
                onClick={() => onToggle(i)}
                className={`rounded px-1.5 py-0.5 text-sm transition-colors ${
                  chosen.has(i)
                    ? 'bg-gold-600 font-bold text-soot-950'
                    : blankable
                      ? 'text-ash-200 hover:bg-iron-800/60'
                      : 'text-ash-600'
                }`}
              >
                {word}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const changeVerseButton = (kind: 'blanks' | 'type', id: string) => (
    <button
      type="button"
      onClick={() => setVersePickerFor({ kind, replaceId: id })}
      className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-ash-500 hover:text-gold-400"
    >
      <RefreshCw size={12} /> Change verse
    </button>
  );

  // One-click auto-fill: blank more or fewer words by difficulty.
  const autoFillRow = (onPick: (d: BlankDifficulty) => void) => (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold uppercase tracking-widest text-ash-500">Auto-fill</span>
      {AUTO_LEVELS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onPick(key)}
          className="rounded-lg border border-iron-800 bg-soot-900/70 px-3 py-1.5 text-xs font-black uppercase tracking-widest text-ash-300 hover:border-gold-500/40 hover:text-gold-400"
        >
          {label}
        </button>
      ))}
    </div>
  );

  const renderBlanks = (q: FillBlanksQuestion) => (
    <div className="space-y-3">
      {autoFillRow((d) => update(q.id, autoFillBlanks(q, d)))}
      {wordChooser(q.verseText, q.blankIndexes, (i) => update(q.id, toggleBlanksWord(q, i)))}
      <div className="rounded-xl border border-iron-800 bg-soot-950/40 p-3">
        <div className="mb-2 text-xs font-bold uppercase tracking-widest text-ash-500">
          Word bank (answers in green)
        </div>
        <div className="flex flex-wrap gap-2">
          {q.options.map((option, i) => {
            const isAnswer = q.answers.some((a) => a.toLowerCase() === option.toLowerCase());
            return (
              <span
                key={i}
                className={`rounded-lg border px-3 py-1 text-sm font-bold ${
                  isAnswer
                    ? 'border-green-400/60 bg-green-500/15 text-green-200'
                    : 'border-iron-800 bg-soot-900/60 text-ash-400'
                }`}
              >
                {option}
              </span>
            );
          })}
        </div>
      </div>
      {changeVerseButton('blanks', q.id)}
    </div>
  );

  const renderTyped = (q: TypedBlankQuestion) => (
    <div className="space-y-3">
      {autoFillRow((d) => update(q.id, autoFillTyped(q, d)))}
      {wordChooser(q.verseText, q.blankIndexes, (i) => update(q.id, toggleTypedWord(q, i)))}
      <div className="rounded-xl border border-iron-800 bg-soot-950/40 p-3">
        <div className="text-lg text-white">{q.prompt}</div>
        <div className="mt-2 text-xs text-ash-500">
          Players type: <span className="font-bold text-green-300">{q.answers.join(', ')}</span>
        </div>
      </div>
      {changeVerseButton('type', q.id)}
    </div>
  );

  const renderBuilder = (q: VerseBuilderQuestion) => (
    <div className="space-y-3">
      <div className="rounded-xl border border-iron-800 bg-soot-950/40 p-3">
        <div className="mb-2 text-xs font-bold uppercase tracking-widest text-ash-500">Chunks, in order</div>
        <div className="flex flex-wrap gap-2">
          {q.chunks.map((chunk, i) => (
            <span key={i} className="rounded-lg border border-iron-800 bg-soot-900/60 px-3 py-1 text-sm text-ash-200">
              {chunk}
            </span>
          ))}
        </div>
        <div className="mt-2 text-xs text-ash-600">Players reassemble these in the right order.</div>
      </div>
      <button
        type="button"
        onClick={() => setVersePickerFor({ kind: 'builder', replaceId: q.id })}
        className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-ash-500 hover:text-gold-400"
      >
        <RefreshCw size={12} /> Change verse
      </button>
    </div>
  );

  const generatedKind = (k: QuizQuestion['kind']) => k === 'blanks' || k === 'builder' || k === 'type';

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
                        {KIND_CHIP[q.kind]}
                      </span>
                      <span className="text-xs font-black text-ash-600">#{index + 1}</span>
                      {problem && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-400">
                          <AlertTriangle size={10} /> {problem}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 truncate text-sm text-ash-200">
                      {q.kind === 'builder'
                        ? <span className="text-gold-400">{q.reference}</span>
                        : q.prompt.trim() || <span className="text-ash-600">Untitled question</span>}
                    </div>
                    {q.kind === 'type' && (
                      <div className="mt-0.5 text-xs text-ash-600">Answers: {q.answers.join(', ')}</div>
                    )}
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
                    {generatedKind(q.kind) ? (
                      <>
                        {q.reference && (
                          <div className="text-xs font-black uppercase tracking-widest text-gold-400">{q.reference}</div>
                        )}
                        {q.kind === 'blanks'
                          ? renderBlanks(q)
                          : q.kind === 'type'
                            ? renderTyped(q)
                            : renderBuilder(q as VerseBuilderQuestion)}
                      </>
                    ) : (
                      <>
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

                        {q.kind === 'mc' ? renderMultipleChoice(q) : renderTrueFalse(q as TrueFalseQuestion)}

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
                      </>
                    )}

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
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4">
        <div className="mb-2 text-xs font-bold uppercase tracking-widest text-ash-500">Add a question</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <button
            type="button"
            onClick={() => add('mc')}
            className="inline-flex flex-col items-center gap-1 rounded-xl border border-iron-800 bg-soot-900/70 px-3 py-4 text-center text-xs font-black uppercase tracking-widest text-ash-200 transition-colors hover:border-gold-500/40 hover:bg-iron-800/40"
          >
            <Plus size={16} className="text-gold-400" /> Multiple choice
          </button>
          <button
            type="button"
            onClick={() => add('tf')}
            className="inline-flex flex-col items-center gap-1 rounded-xl border border-iron-800 bg-soot-900/70 px-3 py-4 text-center text-xs font-black uppercase tracking-widest text-ash-200 transition-colors hover:border-gold-500/40 hover:bg-iron-800/40"
          >
            <CircleCheck size={16} className="text-gold-400" /> True / false
          </button>
          <button
            type="button"
            onClick={() => { setGenError(null); setVersePickerFor({ kind: 'blanks' }); }}
            className="inline-flex flex-col items-center gap-1 rounded-xl border border-iron-800 bg-soot-900/70 px-3 py-4 text-center text-xs font-black uppercase tracking-widest text-ash-200 transition-colors hover:border-gold-500/40 hover:bg-iron-800/40"
          >
            <BookOpen size={16} className="text-gold-400" /> Fill blanks
          </button>
          <button
            type="button"
            onClick={() => { setGenError(null); setVersePickerFor({ kind: 'type' }); }}
            className="inline-flex flex-col items-center gap-1 rounded-xl border border-iron-800 bg-soot-900/70 px-3 py-4 text-center text-xs font-black uppercase tracking-widest text-ash-200 transition-colors hover:border-gold-500/40 hover:bg-iron-800/40"
          >
            <Pencil size={16} className="text-gold-400" /> Type the word
          </button>
          <button
            type="button"
            onClick={() => { setGenError(null); setVersePickerFor({ kind: 'builder' }); }}
            className="inline-flex flex-col items-center gap-1 rounded-xl border border-iron-800 bg-soot-900/70 px-3 py-4 text-center text-xs font-black uppercase tracking-widest text-ash-200 transition-colors hover:border-gold-500/40 hover:bg-iron-800/40"
          >
            <ListOrdered size={16} className="text-gold-400" /> Verse builder
          </button>
        </div>
        {genError && <div className="mt-2 text-xs text-red-300">{genError}</div>}
      </div>

      <VersePicker
        isOpen={versePickerFor !== null}
        onClose={() => { setVersePickerFor(null); setGenError(null); }}
        onSelect={handleVersePicked}
        actionLabel="USE"
        title={
          versePickerFor?.kind === 'builder'
            ? 'Pick a verse to build'
            : versePickerFor?.kind === 'type'
              ? 'Pick a verse to type'
              : 'Pick a verse to blank'
        }
      />
    </div>
  );
};

export default QuizBuilder;
