 

import React from 'react';
import { MCQQuestion, TheoreticalQuestion } from '../../types';

interface MCQQuestionCardProps {
  type: 'mcq';
  question: MCQQuestion;
  index: number;
  selectedValue?: number;
  onChange: (val: number) => void;
}

interface TheoryQuestionCardProps {
  type: 'theory';
  question: TheoreticalQuestion;
  index: number;
  selectedValue?: string;
  onChange: (val: string) => void;
}

type QuestionCardProps = MCQQuestionCardProps | TheoryQuestionCardProps;

export const QuestionCard: React.FC<QuestionCardProps> = (props) => {
  const { type, question, index, selectedValue } = props;

  if (type === 'mcq') {
    const { onChange } = props;
    const mcq = question as MCQQuestion;
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm relative">
        <div className="absolute top-0 left-0 bg-indigo-50 border-r border-b border-indigo-100 px-3.5 py-1 text-[10.5px] font-mono font-bold text-indigo-600 rounded-tl-xl rounded-br-lg uppercase">
          Question #{index} • MCQ ({mcq.points ?? 5} pts)
        </div>
        
        <div className="mt-4 mb-5 text-sm font-sans text-slate-800 font-semibold leading-relaxed">
          {mcq.question}
        </div>

        <div className="space-y-2.5">
          {mcq.options.map((opt) => {
            const isSelected = selectedValue === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => onChange(opt.id)}
                className={`w-full text-left p-3.5 rounded-lg border text-xs font-medium transition flex items-start gap-3 cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50/50 border-indigo-500 text-indigo-950 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100/60 border-slate-200 text-slate-700'
                }`}
              >
                <span className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center font-sans text-[10px] font-bold flex-shrink-0 mt-0.5 ${
                  isSelected
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-white border-slate-300 text-slate-500'
                }`}>
                  {String.fromCharCode(65 + opt.id)}
                </span>
                <span className="leading-relaxed">{opt.text}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Theory question
  const { onChange } = props;
  const theory = question as TheoreticalQuestion;
  const wordCount = (selectedValue as string || '').trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm relative">
      <div className="absolute top-0 left-0 bg-emerald-50 border-r border-b border-emerald-100 px-3.5 py-1 text-[10.5px] font-mono font-bold text-emerald-600 rounded-tl-xl rounded-br-lg uppercase">
        Question #{index} • Subjective / Analytical ({theory.points ?? 15} pts)
      </div>

      <div className="mt-4 mb-4 text-sm font-sans text-slate-800 font-semibold leading-relaxed">
        {theory.question}
      </div>

      <div className="space-y-1.5">
        <textarea
          rows={6}
          value={selectedValue as string || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs font-sans text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-1 focus:ring-emerald-100 transition resize-none leading-relaxed placeholder:text-slate-400"
          placeholder="Explicate your academic solution in full detail. The scoring engine evaluates technical semantic length parameters..."
        />
        <div className="flex items-center justify-between text-[10.5px] font-mono text-slate-400">
          <span>Technical responses are auto-saved in real-time</span>
          <span className="font-bold">Word Count: {wordCount} words</span>
        </div>
      </div>
    </div>
  );
};
