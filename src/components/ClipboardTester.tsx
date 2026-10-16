import React, { useState, useEffect } from 'react';
import {
  ClipboardPaste,
  CheckCircle2,
  Copy,
  Trash2,
  Download,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ScannedNumber } from '../types';

interface ClipboardTesterProps {
  lastScannedNumber: string | null;
  history: ScannedNumber[];
  onClearHistory: () => void;
  onCopyNumber: (val: string) => void;
}

export const ClipboardTester: React.FC<ClipboardTesterProps> = ({
  lastScannedNumber,
  history,
  onClearHistory,
  onCopyNumber,
}) => {
  const [pastedValue, setPastedValue] = useState<string>('');
  const [lastPastedTime, setLastPastedTime] = useState<number | null>(null);
  const [matchStatus, setMatchStatus] = useState<'match' | 'mismatch' | 'empty'>('empty');
  const [clipboardReadVal, setClipboardReadVal] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const handlePasteEvent = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text');
    evaluatePaste(text);
  };

  const evaluatePaste = (text: string) => {
    setPastedValue(text);
    setLastPastedTime(Date.now());

    if (!text.trim()) {
      setMatchStatus('empty');
      return;
    }

    if (lastScannedNumber) {
      // Check exact match or digits match
      const cleanPasted = text.replace(/\D/g, '');
      const cleanExpected = lastScannedNumber.replace(/\D/g, '');

      if (
        text.trim() === lastScannedNumber.trim() ||
        (cleanPasted.length > 0 && cleanPasted === cleanExpected)
      ) {
        setMatchStatus('match');
        // Trigger celebratory confetti
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#34d399', '#6ee7b7', '#38bdf8'],
        });
      } else {
        setMatchStatus('mismatch');
      }
    } else {
      setMatchStatus('match');
    }
  };

  const handleReadClipboard = async () => {
    setPermissionError(null);
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        setPermissionError('Clipboard reading API not supported in this browser context.');
        return;
      }
      const text = await navigator.clipboard.readText();
      setClipboardReadVal(text);
      if (text) {
        evaluatePaste(text);
      }
    } catch (err: any) {
      console.warn('Clipboard read error:', err);
      setPermissionError('Clipboard read permission was dismissed or blocked. Simply press Ctrl+V into the box below!');
    }
  };

  const handleExport = (format: 'txt' | 'csv') => {
    if (history.length === 0) return;

    let content = '';
    let mimeType = 'text/plain';
    let filename = `scanned_numbers_${Date.now()}.${format}`;

    if (format === 'csv') {
      content = 'Timestamp,Value,DigitsOnly,Label,Source\n';
      content += history
        .map(
          (item) =>
            `"${new Date(item.timestamp).toISOString()}","${item.value}","${item.digitsOnly}","${
              item.label || ''
            }","${item.source}"`
        )
        .join('\n');
      mimeType = 'text/csv';
    } else {
      content = history
        .map(
          (item) =>
            `${new Date(item.timestamp).toLocaleTimeString()} - ${item.value} (${item.label || 'Number'})`
        )
        .join('\n');
    }

    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Title */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
          <ClipboardPaste className="w-3.5 h-3.5" />
          <span>Interactive Paste Bench</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Test Your <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-emerald-400 font-mono">Ctrl + V</kbd> Right Here
        </h1>
        <p className="mt-2 text-slate-400 text-sm max-w-2xl">
          Click the box below and press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-xs">Ctrl+V</kbd> (or <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-xs">Cmd+V</kbd> on Mac). The tester validates your system clipboard and ensures digits were copied cleanly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Paste Area (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <span>Active Paste Input Area</span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                  Focus &amp; press Ctrl+V
                </span>
              </label>

              <button
                onClick={handleReadClipboard}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Read Clipboard</span>
              </button>
            </div>

            {/* Big Interactive Paste Box */}
            <div className="relative">
              <textarea
                value={pastedValue}
                onChange={(e) => evaluatePaste(e.target.value)}
                onPaste={handlePasteEvent}
                placeholder="Click here and press Ctrl+V to paste your scanned paper number..."
                rows={5}
                className="w-full bg-slate-950 border-2 border-dashed border-slate-700 focus:border-emerald-500 rounded-xl p-4 font-mono text-lg text-emerald-300 placeholder:text-slate-600 focus:outline-none transition-all resize-none shadow-inner"
              />

              {pastedValue && (
                <button
                  onClick={() => {
                    setPastedValue('');
                    setMatchStatus('empty');
                  }}
                  className="absolute top-3 right-3 text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white px-2 py-1 rounded transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {permissionError && (
              <div className="mt-3 p-3 rounded-xl bg-amber-950/40 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
                <span>{permissionError}</span>
              </div>
            )}

            {/* Verification Status Card */}
            {matchStatus === 'match' && pastedValue && (
              <div className="mt-4 p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 flex items-start gap-3 animate-fade-in shadow-lg shadow-emerald-950/40">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">
                      Perfect Match! Clipboard Verified!
                    </span>
                    {lastPastedTime && (
                      <span className="text-[11px] text-emerald-400/80 font-mono">
                        Pasted just now
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-emerald-200 mt-1">
                    Your clipboard is holding this number. You can freely paste (<kbd className="bg-emerald-900/60 px-1 py-0.5 rounded font-mono text-[10px]">Ctrl+V</kbd>) into spreadsheets, ERPs, shipping portals, or search bars.
                  </p>
                  <div className="mt-2.5 pt-2 border-t border-emerald-500/20 flex flex-wrap gap-4 text-xs font-mono">
                    <div>
                      <span className="text-emerald-400/70">Raw:</span>{' '}
                      <span className="text-white font-bold">{pastedValue}</span>
                    </div>
                    <div>
                      <span className="text-emerald-400/70">Digits:</span>{' '}
                      <span className="text-emerald-300 font-bold">
                        {pastedValue.replace(/\D/g, '')}
                      </span>
                    </div>
                    <div>
                      <span className="text-emerald-400/70">Length:</span>{' '}
                      <span className="text-white">{pastedValue.length} chars</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {matchStatus === 'mismatch' && (
              <div className="mt-4 p-4 rounded-xl bg-amber-950/50 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white text-sm">
                    Clipboard has a different text than expected
                  </div>
                  <p className="mt-1 text-slate-300">
                    Expected from last scan:{' '}
                    <code className="text-emerald-400 font-bold bg-slate-950 px-1.5 py-0.5 rounded">
                      {lastScannedNumber}
                    </code>
                    <br />
                    Currently pasted:{' '}
                    <code className="text-amber-300 font-bold bg-slate-950 px-1.5 py-0.5 rounded">
                      {pastedValue}
                    </code>
                  </p>
                  {lastScannedNumber && (
                    <button
                      onClick={() => onCopyNumber(lastScannedNumber)}
                      className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Re-copy Expected Number ({lastScannedNumber})</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {matchStatus === 'empty' && (
              <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs flex items-center justify-between">
                <span>Waiting for your paste... Press Ctrl+V inside the box.</span>
                <span className="font-mono text-emerald-400">Ctrl+V</span>
              </div>
            )}
          </div>

          {/* Quick tips */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 text-xs text-slate-400 space-y-2">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>How does Ctrl+V work across applications?</span>
            </h3>
            <p>
              When Paper2Clip or the Python scanner copies a number, it places it directly onto your operating system's native clipboard buffer (via Windows Win32 API, macOS NSPasteboard, or Linux X11/Wayland).
            </p>
            <p className="text-slate-300">
              This means you can switch to <strong>Microsoft Excel</strong>, <strong>Google Sheets</strong>, <strong>SAP / ERP</strong>, <strong>FedEx / UPS portal</strong>, or a text file and hit <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-emerald-400 font-mono">Ctrl + V</kbd> instantly.
            </p>
          </div>
        </div>

        {/* History Stack (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-full">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Scanned Numbers History</h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {history.length}
                </span>
              </div>

              {history.length > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleExport('csv')}
                    title="Export as CSV"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="text-[10px]">CSV</span>
                  </button>

                  <button
                    onClick={onClearHistory}
                    title="Clear history"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 text-xs transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto max-h-[500px] divide-y divide-slate-800/60 mt-2">
              {history.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>No numbers scanned in this session yet.</p>
                  <p className="mt-1 text-slate-600">Scan paper with webcam or run the Python script!</p>
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    className="py-3 px-2 flex items-center justify-between group hover:bg-slate-800/40 rounded-xl transition-all"
                  >
                    <div className="min-w-0 flex-1 mr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-white truncate">
                          {item.value}
                        </span>
                        {item.label && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-emerald-400 font-semibold shrink-0">
                            {item.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                        <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                        <span className="text-slate-600">•</span>
                        <span className="font-mono text-slate-400">
                          {item.digitsOnly.length} digits
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="capitalize text-slate-500">{item.source}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => onCopyNumber(item.value)}
                      title="Copy to clipboard"
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-500 text-slate-300 hover:text-slate-950 font-semibold text-xs transition-all flex items-center gap-1 shrink-0"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
