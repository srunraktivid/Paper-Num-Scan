import React from 'react';
import { SAMPLE_PAPERS } from '../utils/samplePapers';
import { PaperSample } from '../types';
import { Sparkles, ArrowRight } from 'lucide-react';

interface SamplePaperGalleryProps {
  onSelectSample: (sample: PaperSample) => void;
  selectedSampleId?: string;
}

export const SamplePaperGallery: React.FC<SamplePaperGalleryProps> = ({
  onSelectSample,
  selectedSampleId,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Quick Test with Real Paper Presets
          </h3>
        </div>
        <span className="text-[11px] text-slate-400">Click any paper to scan &amp; copy</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {SAMPLE_PAPERS.map((sample) => {
          const isSelected = selectedSampleId === sample.id;
          return (
            <button
              key={sample.id}
              onClick={() => onSelectSample(sample)}
              className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? 'bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-950/40'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 uppercase tracking-wider">
                    {sample.category}
                  </span>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  )}
                </div>
                <div className="font-bold text-xs text-white group-hover:text-emerald-300 transition-colors leading-tight">
                  {sample.title}
                </div>
                <div className="mt-2 text-[10px] font-mono text-emerald-400 font-bold truncate">
                  {sample.expectedNumbers[0]}
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 group-hover:text-slate-200">
                <span>Scan now</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
