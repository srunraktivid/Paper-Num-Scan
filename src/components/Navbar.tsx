import React from 'react';
import { Camera, Terminal, ClipboardPaste, Volume2, VolumeX, Sparkles } from 'lucide-react';

interface NavbarProps {
  activeTab: 'scanner' | 'python' | 'tester';
  setActiveTab: (tab: 'scanner' | 'python' | 'tester') => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  lastCopiedNumber: string | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  soundEnabled,
  setSoundEnabled,
  lastCopiedNumber,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Camera className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-white tracking-tight">Paper2Clip</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Ctrl+V Ready
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Scan paper numbers directly to clipboard
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1.5 p-1 bg-slate-950/70 rounded-xl border border-slate-800/80">
            <button
              onClick={() => setActiveTab('scanner')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'scanner'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Web Scanner</span>
            </button>

            <button
              onClick={() => setActiveTab('python')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'python'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>Python Scripts</span>
              <span className="hidden md:inline text-[11px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-emerald-400">
                .py
              </span>
            </button>

            <button
              onClick={() => setActiveTab('tester')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'tester'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ClipboardPaste className="w-4 h-4" />
              <span>Ctrl+V Tester</span>
              {lastCopiedNumber && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              )}
            </button>
          </nav>

          {/* Actions & Status */}
          <div className="flex items-center gap-3">
            {/* Audio Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Beep sound enabled on copy' : 'Sound muted'}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {/* Quick Clipboard Pill */}
            {lastCopiedNumber && (
              <div
                onClick={() => setActiveTab('tester')}
                className="cursor-pointer hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-xs font-mono text-emerald-300 hover:border-emerald-400 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-400">In Clipboard:</span>
                <span className="font-bold text-white max-w-[130px] truncate">
                  {lastCopiedNumber}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
