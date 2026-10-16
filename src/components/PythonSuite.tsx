import React, { useState } from 'react';
import {
  Download,
  Copy,
  Check,
  Terminal,
  Camera,
  Keyboard,
  FolderSync,
  Sparkles,
  ExternalLink,
  Info,
  Sliders,
  FileCode,
  ShieldCheck,
  PenTool,
} from 'lucide-react';
import { OSPlatform, PythonConfig, PythonScriptType, DigitLengthFilter } from '../types';
import {
  generateHandwrittenScript,
  generateWebcamScript,
  generateHotkeySnipScript,
  generateFolderWatcherScript,
  generateGeminiScript,
  getTesseractDefaultPath,
} from '../utils/pythonScripts';

export const PythonSuite: React.FC = () => {
  const [selectedScript, setSelectedScript] = useState<PythonScriptType>('handwritten');
  const [os, setOs] = useState<OSPlatform>('windows');
  const [minDigits, setMinDigits] = useState<number>(3);
  const [digitLengthFilter, setDigitLengthFilter] = useState<DigitLengthFilter>('8_or_10');
  const [digitsOnly, setDigitsOnly] = useState<boolean>(true);
  const [playBeep, setPlayBeep] = useState<boolean>(true);
  const [saveHistory, setSaveHistory] = useState<boolean>(true);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedPip, setCopiedPip] = useState<boolean>(false);

  const config: PythonConfig = {
    os,
    minDigits,
    digitsOnly,
    digitLengthFilter,
    playBeep,
    saveHistory,
    tesseractPath: getTesseractDefaultPath(os),
  };

  // Generate appropriate script based on selection
  let currentScriptContent = '';
  let filename = '';

  switch (selectedScript) {
    case 'handwritten':
      currentScriptContent = generateHandwrittenScript(config);
      filename = 'handwritten_8_10_scanner.py';
      break;
    case 'webcam':
      currentScriptContent = generateWebcamScript(config);
      filename = 'webcam_number_scanner.py';
      break;
    case 'gemini':
      currentScriptContent = generateGeminiScript(config);
      filename = 'gemini_handwritten_scanner.py';
      break;
    case 'hotkey':
      currentScriptContent = generateHotkeySnipScript(config);
      filename = 'snip_number_to_clipboard.py';
      break;
    case 'watcher':
      currentScriptContent = generateFolderWatcherScript(config);
      filename = 'watch_paper_photos.py';
      break;
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(currentScriptContent);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([currentScriptContent], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadRequirements = () => {
    const reqs = `opencv-python>=4.8.0
pytesseract>=0.3.10
pyperclip>=1.8.2
Pillow>=10.0.0
numpy>=1.24.0
keyboard>=0.13.5
google-genai>=2.4.0
`;
    const blob = new Blob([reqs], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'requirements.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyPipCommand = () => {
    const pipCmd = 'pip install opencv-python pytesseract pyperclip pillow numpy keyboard';
    navigator.clipboard.writeText(pipCmd);
    setCopiedPip(true);
    setTimeout(() => setCopiedPip(false), 2000);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-4">
            <PenTool className="w-3.5 h-3.5" />
            <span>Tuned for Handwritten Numbers (8 &amp; 10 Digits)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
            Handwritten Paper Number Scanner &rarr; Instant Clipboard (Ctrl+V)
          </h1>
          <p className="mt-3 text-slate-300 text-sm sm:text-base leading-relaxed">
            Hold your handwritten paper note in front of your webcam. Python applies ink-closing filters, isolates the exact <strong>8-digit</strong> or <strong>10-digit</strong> numbers, automatically copies them to your clipboard with a sound beep, and lets you immediately press <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-600 text-emerald-400 font-mono text-xs font-bold">Ctrl + V</kbd>!
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download {filename}</span>
            </button>

            <button
              onClick={handleCopyCode}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-600 transition-all cursor-pointer"
            >
              {copiedCode ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Python Script</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadRequirements}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-mono border border-slate-700 transition-all cursor-pointer"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>requirements.txt</span>
            </button>
          </div>
        </div>
      </div>

      {/* Script Selection & OS Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Script Mode & Configuration */}
        <div className="lg:col-span-5 space-y-6">
          {/* Select Scanner Mode */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              1. Choose Python Scanner Script
            </h2>
            <div className="space-y-2.5">
              {/* Specialized Handwritten Script */}
              <button
                onClick={() => setSelectedScript('handwritten')}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3.5 ${
                  selectedScript === 'handwritten'
                    ? 'bg-emerald-950/40 border-emerald-500/70 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/50'
                    : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div
                  className={`p-2.5 rounded-lg ${
                    selectedScript === 'handwritten'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <PenTool className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">Handwritten (8 &amp; 10 Digits)</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                      Matches Your Request
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Specialized ink-closing filters for pen &amp; pencil writing. Strictly filters for 8 or 10 digit sequences!
                  </p>
                </div>
              </button>

              <button
                onClick={() => setSelectedScript('gemini')}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3.5 ${
                  selectedScript === 'gemini'
                    ? 'bg-emerald-950/40 border-emerald-500/70 shadow-md shadow-emerald-950/30'
                    : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div
                  className={`p-2.5 rounded-lg ${
                    selectedScript === 'gemini'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">AI Vision Scanner (Messy Pen)</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Uses Google Gemini API for ultra-messy handwriting, lined paper, or bad camera lighting.
                  </p>
                </div>
              </button>

              <button
                onClick={() => setSelectedScript('webcam')}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3.5 ${
                  selectedScript === 'webcam'
                    ? 'bg-emerald-950/40 border-emerald-500/70 shadow-md shadow-emerald-950/30'
                    : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div
                  className={`p-2.5 rounded-lg ${
                    selectedScript === 'webcam'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Camera className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">General Webcam Scanner</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    For printed paper, barcodes, invoices, and serial stickers.
                  </p>
                </div>
              </button>

              <button
                onClick={() => setSelectedScript('hotkey')}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3.5 ${
                  selectedScript === 'hotkey'
                    ? 'bg-emerald-950/40 border-emerald-500/70 shadow-md shadow-emerald-950/30'
                    : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div
                  className={`p-2.5 rounded-lg ${
                    selectedScript === 'hotkey'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Keyboard className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">Ctrl+Shift+S Hotkey Snipper</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Runs in background. Snip any paper photo on screen to auto-copy numbers.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* OS Platform & Settings */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                2. Target OS &amp; Digit Length Filter
              </h2>
              <Sliders className="w-4 h-4 text-slate-500" />
            </div>

            {/* OS Tabs */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                onClick={() => setOs('windows')}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  os === 'windows'
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Windows
              </button>
              <button
                onClick={() => setOs('mac')}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  os === 'mac'
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                macOS
              </button>
              <button
                onClick={() => setOs('linux')}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  os === 'linux'
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Linux
              </button>
            </div>

            {/* Target Digit Length Filter */}
            <div className="pt-2 border-t border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="text-white font-bold block">Paper Digit Length Filter</span>
                  <span className="text-[11px] text-slate-400">Strictly filters clipboard output</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 font-mono text-xs">
                  <button
                    onClick={() => setDigitLengthFilter('8_to_10')}
                    className={`px-2.5 py-1 rounded font-bold transition-all ${
                      digitLengthFilter === '8_to_10' || digitLengthFilter === '8_or_10'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    8 - 10 Digits
                  </button>
                  <button
                    onClick={() => setDigitLengthFilter('9')}
                    className={`px-2 py-1 rounded font-bold transition-all ${
                      digitLengthFilter === '9'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    9
                  </button>
                  <button
                    onClick={() => setDigitLengthFilter('8')}
                    className={`px-2 py-1 rounded font-bold transition-all ${
                      digitLengthFilter === '8'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    8
                  </button>
                  <button
                    onClick={() => setDigitLengthFilter('10')}
                    className={`px-2 py-1 rounded font-bold transition-all ${
                      digitLengthFilter === '10'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    10
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Audio Beep when Copied</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={playBeep}
                    onChange={(e) => setPlayBeep(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Save to handwritten_scanned_numbers.txt</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveHistory}
                    onChange={(e) => setSaveHistory(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Setup Guide */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 text-xs space-y-3">
            <div className="flex items-center gap-2 text-white font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>How to Run on {os.toUpperCase()}</span>
            </div>

            <div className="space-y-2">
              <div>
                <span className="text-slate-400 font-semibold">Step 1: Install packages</span>
                <div className="mt-1 flex items-center justify-between bg-slate-950 p-2 rounded-lg font-mono text-[11px] text-emerald-300 border border-slate-800">
                  <span className="truncate">pip install opencv-python pytesseract pyperclip pillow numpy</span>
                  <button
                    onClick={copyPipCommand}
                    className="ml-2 text-slate-400 hover:text-white"
                  >
                    {copiedPip ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-semibold">Step 2: Run Python script</span>
                <div className="mt-1 bg-slate-950 p-2 rounded-lg font-mono text-[11px] text-emerald-300 border border-slate-800">
                  python {filename}
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 text-[11px] flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>
                Hold paper up &rarr; Hear the beep chime &rarr; Press <strong>Ctrl + V</strong> to paste!
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Code Viewer */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full">
            {/* Editor Header */}
            <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                </div>
                <span className="ml-2 font-mono text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                  {filename}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .py</span>
                </button>
              </div>
            </div>

            {/* Code Body */}
            <div className="relative flex-1 bg-slate-950 p-4 overflow-auto max-h-[640px] font-mono text-xs text-slate-200 leading-relaxed selection:bg-emerald-500/30">
              <pre className="whitespace-pre">{currentScriptContent}</pre>
            </div>

            {/* Code Footer */}
            <div className="bg-slate-950/80 px-4 py-2.5 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Ready for Python 3.8+ on {os.toUpperCase()}</span>
              <span className="text-emerald-400 font-mono">
                Target: {digitLengthFilter === '8_or_10' ? '8 & 10 Digits' : `${digitLengthFilter} Digits Only`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
