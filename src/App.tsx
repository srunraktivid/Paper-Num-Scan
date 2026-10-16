/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { WebScanner } from './components/WebScanner';
import { PythonSuite } from './components/PythonSuite';
import { ClipboardTester } from './components/ClipboardTester';
import { ScannedNumber } from './types';
import { playSuccessChime } from './utils/audio';
import { Terminal, Camera, ClipboardPaste, Keyboard, Sparkles, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'scanner' | 'python' | 'tester'>('scanner');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [lastScannedNumber, setLastScannedNumber] = useState<string | null>('070263516');
  const [history, setHistory] = useState<ScannedNumber[]>(() => {
    try {
      const saved = localStorage.getItem('paper2clip_history');
      if (saved && JSON.parse(saved).length > 0) return JSON.parse(saved);
      return [
        {
          id: 'user-070263516',
          value: '070263516',
          digitsOnly: '070263516',
          label: 'Handwritten 9-digit # (Your Paper)',
          confidence: 0.99,
          timestamp: Date.now(),
          source: 'sample',
        },
        {
          id: 'user-10-1038',
          value: '10-1038',
          digitsOnly: '101038',
          label: 'Reference Code (Your Paper)',
          confidence: 0.98,
          timestamp: Date.now() - 30000,
          source: 'sample',
        },
      ];
    } catch {
      return [];
    }
  });

  // Save history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('paper2clip_history', JSON.stringify(history));
    } catch (e) {
      console.warn('Could not save history to localStorage', e);
    }
  }, [history]);

  // Handle number scanned and copied
  const handleNumberCopied = (item: ScannedNumber) => {
    setLastScannedNumber(item.value);
    if (soundEnabled) {
      playSuccessChime();
    }
    setHistory((prev) => {
      // Avoid immediate duplicates
      const filtered = prev.filter((h) => h.value !== item.value);
      return [item, ...filtered].slice(0, 50);
    });
  };

  // Re-copy an item manually
  const handleCopyValue = async (val: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setLastScannedNumber(val);
      if (soundEnabled) {
        playSuccessChime();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        lastCopiedNumber={lastScannedNumber}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'scanner' && (
          <WebScanner
            onNumberCopied={handleNumberCopied}
            soundEnabled={soundEnabled}
            onNavigateToTester={() => setActiveTab('tester')}
            onNavigateToPython={() => setActiveTab('python')}
          />
        )}

        {activeTab === 'python' && <PythonSuite />}

        {activeTab === 'tester' && (
          <ClipboardTester
            lastScannedNumber={lastScannedNumber}
            history={history}
            onClearHistory={handleClearHistory}
            onCopyNumber={handleCopyValue}
          />
        )}
      </main>

      {/* Bottom Sticky Helper Bar */}
      <div className="border-t border-slate-900 bg-slate-950/80 backdrop-blur py-3 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-slate-300 font-semibold">Paper2Clip Engine Active</span>
            <span className="text-slate-600">|</span>
            <span>Scan paper &rarr; Number auto-copied &rarr; Press <kbd className="px-1.5 py-0.2 bg-slate-800 rounded font-mono text-emerald-400 font-bold">Ctrl+V</kbd></span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <div className="flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5 text-slate-500" />
              <span>Paste Shortcut: <strong className="text-slate-200 font-mono">Ctrl+V</strong> (Windows/Linux) or <strong className="text-slate-200 font-mono">⌘V</strong> (Mac)</span>
            </div>
            <span className="text-slate-700 hidden md:inline">•</span>
            <div className="hidden md:flex items-center gap-1.5">
              <span>Python Mode: <strong className="text-emerald-400 font-mono">webcam_scanner.py</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
