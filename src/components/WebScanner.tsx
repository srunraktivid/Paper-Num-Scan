import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Upload,
  RefreshCw,
  Copy,
  Check,
  Sparkles,
  Zap,
  Volume2,
  VolumeX,
  FileText,
  Sliders,
  ShieldCheck,
  AlertCircle,
  PenTool,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Crop,
  Layers,
  RotateCcw,
} from 'lucide-react';
import { ScannedNumber, PaperSample, DigitLengthFilter } from '../types';
import { runLocalOCR, preprocessCanvas, extractNumbersFromText } from '../utils/ocr';
import { SamplePaperGallery } from './SamplePaperGallery';
import { SAMPLE_PAPERS } from '../utils/samplePapers';
import confetti from 'canvas-confetti';

interface WebScannerProps {
  onNumberCopied: (item: ScannedNumber) => void;
  soundEnabled: boolean;
  onNavigateToTester: () => void;
  onNavigateToPython: () => void;
}

export const WebScanner: React.FC<WebScannerProps> = ({
  onNumberCopied,
  soundEnabled,
  onNavigateToTester,
  onNavigateToPython,
}) => {
  const [inputMode, setInputMode] = useState<'camera' | 'upload' | 'sample'>('sample');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [autoCopy, setAutoCopy] = useState<boolean>(true);
  const [digitsOnlyMode, setDigitsOnlyMode] = useState<boolean>(true);
  const [digitLengthFilter, setDigitLengthFilter] = useState<DigitLengthFilter>('8_to_10');
  const [isHandwrittenMode, setIsHandwrittenMode] = useState<boolean>(true);
  const [ocrEngine, setOcrEngine] = useState<'local' | 'ai'>('ai');
  const [detectedNumbers, setDetectedNumbers] = useState<ScannedNumber[]>([]);
  const [lastCopiedId, setLastCopiedId] = useState<string | null>(null);
  const [activeSample, setActiveSample] = useState<PaperSample | null>(null);
  const [capturedImageDataUrl, setCapturedImageDataUrl] = useState<string | null>(null);
  const [continuousScan, setContinuousScan] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Zoom & Frame Scaling states
  const [zoomLevel, setZoomLevel] = useState<number>(1.0); // 1.0x to 3.0x
  const [frameWidthPercent, setFrameWidthPercent] = useState<number>(75); // 30% to 95%
  const [frameHeightPercent, setFrameHeightPercent] = useState<number>(32); // 15% to 85%
  const [showFrameControls, setShowFrameControls] = useState<boolean>(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const intervalRef = useRef<number | null>(null);
  const caughtImageRef = useRef<HTMLImageElement | null>(null);

  // Stop camera stream cleanly
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // Start camera stream
  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser or use the Upload tab.'
          : 'Unable to start camera. You can still test with sample papers or upload a photo!'
      );
      setIsCameraActive(false);
    }
  };

  useEffect(() => {
    if (inputMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [inputMode]);

  // Copy number to clipboard with feedback
  const handleCopy = useCallback(
    async (numberItem: ScannedNumber) => {
      const valueToCopy = digitsOnlyMode ? numberItem.digitsOnly : numberItem.value;
      try {
        await navigator.clipboard.writeText(valueToCopy);
        setLastCopiedId(numberItem.id);
        onNumberCopied({
          ...numberItem,
          value: valueToCopy,
        });

        const lengthNote = valueToCopy.length === 8 ? ' (8-digit)' : valueToCopy.length === 10 ? ' (10-digit)' : '';
        setToastMessage(`Copied "${valueToCopy}"${lengthNote} to clipboard! Ready for Ctrl+V!`);
        setTimeout(() => setToastMessage(null), 3500);

        // Confetti burst
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#10b981', '#34d399', '#38bdf8'],
        });
      } catch (err) {
        console.error('Failed to copy to clipboard', err);
      }
    },
    [digitsOnlyMode, onNumberCopied]
  );

  // Process an image source (canvas)
  const processImage = async (
    sourceCanvas: HTMLCanvasElement,
    sourceType: 'webcam' | 'upload' | 'sample'
  ) => {
    setIsProcessing(true);
    try {
      let results: ScannedNumber[] = [];

      if (ocrEngine === 'ai') {
        const base64Data = sourceCanvas.toDataURL('image/jpeg', 0.85);
        const res = await fetch('/api/ai-scan-number', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64Data,
            lengthFilter: digitLengthFilter,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.numbers && Array.isArray(data.numbers)) {
            results = data.numbers.map((item: any, idx: number) => ({
              id: `ai-${Date.now()}-${idx}`,
              value: item.value,
              digitsOnly: item.digitsOnly || item.value.replace(/\D/g, ''),
              label: item.label || (item.digitCount ? `Handwritten ${item.digitCount}-digit` : 'Extracted Number'),
              confidence: item.confidence || 0.98,
              timestamp: Date.now(),
              source: 'ai' as const,
            }));
          }
        } else {
          const preprocessed = preprocessCanvas(sourceCanvas, isHandwrittenMode);
          const localRes = await runLocalOCR(preprocessed, 3, digitLengthFilter);
          results = localRes.numbers;
        }
      } else {
        const preprocessed = preprocessCanvas(sourceCanvas, isHandwrittenMode);
        const localRes = await runLocalOCR(preprocessed, 3, digitLengthFilter);
        results = localRes.numbers;
      }

      // Filter by digitLengthFilter
      if (digitLengthFilter === '8') {
        const strict = results.filter((r) => r.digitsOnly.length === 8);
        if (strict.length > 0) results = strict;
      } else if (digitLengthFilter === '9') {
        const strict = results.filter((r) => r.digitsOnly.length === 9);
        if (strict.length > 0) results = strict;
      } else if (digitLengthFilter === '10') {
        const strict = results.filter((r) => r.digitsOnly.length === 10);
        if (strict.length > 0) results = strict;
      } else if (digitLengthFilter === '8_to_10' || digitLengthFilter === '8_or_10') {
        // Target 8, 9, 10 digits (e.g. 070263516), but keep reference codes too
        const matching = results.filter((r) => r.digitsOnly.length >= 8 && r.digitsOnly.length <= 10);
        const others = results.filter((r) => !(r.digitsOnly.length >= 8 && r.digitsOnly.length <= 10));
        results = [...matching, ...others];
      }

      setDetectedNumbers(results);

      // Auto-copy top number if found
      if (results.length > 0 && autoCopy) {
        handleCopy(results[0]);
      }
    } catch (err) {
      console.error('Error processing paper image:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Capture frame from webcam with ZOOM & SCALED FRAME cropping
  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;

    // Apply digital zoom
    const cw = vw / zoomLevel;
    const ch = vh / zoomLevel;
    const cx = (vw - cw) / 2;
    const cy = (vh - ch) / 2;

    // Apply scaled frame box dimensions inside the zoomed area
    const boxW = cw * (frameWidthPercent / 100);
    const boxH = ch * (frameHeightPercent / 100);
    const boxX = cx + (cw - boxW) / 2;
    const boxY = cy + (ch - boxH) / 2;

    // Set canvas dimensions to the exact zoomed & scaled ROI
    canvas.width = Math.round(boxW);
    canvas.height = Math.round(boxH);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, boxX, boxY, boxW, boxH, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg');
    setCapturedImageDataUrl(dataUrl);

    processImage(canvas, 'webcam');
  };

  // Rescan region on caught paper (uploaded photo or sample paper)
  const rescanCaughtPaper = () => {
    if (!caughtImageRef.current) return;
    const img = caughtImageRef.current;

    const canvas = document.createElement('canvas');
    const iw = img.naturalWidth || 600;
    const ih = img.naturalHeight || 400;

    // Apply zoom on caught paper
    const cw = iw / zoomLevel;
    const ch = ih / zoomLevel;
    const cx = (iw - cw) / 2;
    const cy = (ih - ch) / 2;

    // Apply frame scale
    const boxW = cw * (frameWidthPercent / 100);
    const boxH = ch * (frameHeightPercent / 100);
    const boxX = cx + (cw - boxW) / 2;
    const boxY = cy + (ch - boxH) / 2;

    canvas.width = Math.round(boxW);
    canvas.height = Math.round(boxH);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, boxX, boxY, boxW, boxH, 0, 0, canvas.width, canvas.height);
      processImage(canvas, inputMode === 'camera' ? 'webcam' : inputMode);
    }
  };

  // Continuous scanning effect for camera
  useEffect(() => {
    if (isCameraActive && continuousScan && !isProcessing) {
      intervalRef.current = window.setInterval(() => {
        captureFrame();
      }, 1500);
    } else if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isCameraActive, continuousScan, isProcessing, zoomLevel, frameWidthPercent, frameHeightPercent]);

  // Handle uploaded file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCapturedImageDataUrl(dataUrl);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 1600;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          const scale = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          processImage(canvas, 'upload');
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Select sample paper
  const handleSelectSample = (sample: PaperSample) => {
    setActiveSample(sample);
    setInputMode('sample');

    if (sample.svgData) {
      const blob = new Blob([sample.svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      setCapturedImageDataUrl(url);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          processImage(canvas, 'sample');
        }
        URL.revokeObjectURL(url);
      };
      img.src = url;
    }
  };

  // Initialize with sample on mount
  useEffect(() => {
    if (inputMode === 'sample' && !activeSample) {
      const sample = SAMPLE_PAPERS[0];
      handleSelectSample(sample);
    }
  }, []);

  // Quick preset frame sizes
  const applyPresetFrame = (type: 'narrow' | 'standard' | 'full') => {
    if (type === 'narrow') {
      setFrameWidthPercent(78);
      setFrameHeightPercent(24);
    } else if (type === 'standard') {
      setFrameWidthPercent(65);
      setFrameHeightPercent(40);
    } else if (type === 'full') {
      setFrameWidthPercent(90);
      setFrameHeightPercent(75);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-3 rounded-xl shadow-2xl shadow-emerald-500/40 flex items-center gap-3 animate-bounce">
          <Check className="w-5 h-5 bg-slate-950 text-emerald-400 p-0.5 rounded-full" />
          <span>{toastMessage}</span>
          <button
            onClick={onNavigateToTester}
            className="ml-2 underline text-xs text-slate-900 font-extrabold hover:text-white"
          >
            Press Ctrl+V to test &rarr;
          </button>
        </div>
      )}

      {/* Mode & Target Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-slate-900 border border-slate-800 p-3.5 rounded-2xl shadow-lg">
        {/* Input source tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setInputMode('camera');
              setActiveSample(null);
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              inputMode === 'camera'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Webcam Scanner</span>
          </button>

          <button
            onClick={() => {
              setInputMode('upload');
              setActiveSample(null);
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              inputMode === 'upload'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload Paper Photo</span>
          </button>

          <button
            onClick={() => {
              setInputMode('sample');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              inputMode === 'sample'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Sample Handwritings</span>
          </button>
        </div>

        {/* 8 & 10 Digit Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-[11px] font-bold text-slate-400 px-1 flex items-center gap-1">
              <PenTool className="w-3 h-3 text-emerald-400" />
              Target:
            </span>
            <button
              onClick={() => setDigitLengthFilter('8_to_10')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                digitLengthFilter === '8_to_10' || digitLengthFilter === '8_or_10'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              8 - 10 Digits
            </button>
            <button
              onClick={() => setDigitLengthFilter('9')}
              className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                digitLengthFilter === '9'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              9 Digits
            </button>
            <button
              onClick={() => setDigitLengthFilter('8')}
              className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                digitLengthFilter === '8'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              8
            </button>
            <button
              onClick={() => setDigitLengthFilter('10')}
              className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                digitLengthFilter === '10'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              10
            </button>
            <button
              onClick={() => setDigitLengthFilter('all')}
              className={`px-2 py-1 rounded-lg text-xs font-mono transition-all ${
                digitLengthFilter === 'all'
                  ? 'bg-slate-800 text-white font-bold'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              All
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setOcrEngine('local')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                ocrEngine === 'local' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400'
              }`}
            >
              Fast OCR
            </button>
            <button
              onClick={() => setOcrEngine('ai')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 ${
                ocrEngine === 'ai' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>AI Handwriting</span>
            </button>
          </div>

          <button
            onClick={() => setAutoCopy(!autoCopy)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              autoCopy
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${autoCopy ? 'text-emerald-400' : 'text-slate-500'}`} />
            <span>Auto-Copy: {autoCopy ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* NEW: Zoom & Frame Scaling Control Bar */}
      <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Zoom Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <ZoomIn className="w-4 h-4 text-emerald-400" />
            <span>Zoom Paper:</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {[1.0, 1.4, 1.8, 2.2, 2.8].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setZoomLevel(lvl)}
                className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                  zoomLevel === lvl
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {lvl === 1.0 ? '1x' : `${lvl}x`}
              </button>
            ))}
          </div>

          {zoomLevel > 1.0 && (
            <button
              onClick={() => setZoomLevel(1.0)}
              title="Reset Zoom"
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Center: Frame Scale Presets */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Crop className="w-4 h-4 text-emerald-400" />
            <span>Frame Scale:</span>
          </span>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => applyPresetFrame('narrow')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                frameHeightPercent <= 28
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Best for 8 & 10 digit single handwritten slips"
            >
              8/10 Digit Slip (Narrow)
            </button>
            <button
              onClick={() => applyPresetFrame('standard')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                frameHeightPercent > 28 && frameHeightPercent < 60
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Note Card
            </button>
            <button
              onClick={() => applyPresetFrame('full')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                frameHeightPercent >= 60
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Full Page
            </button>
          </div>
        </div>

        {/* Right: Fine-Tune Sliders Toggle */}
        <div className="flex items-center gap-3">
          <div className="text-xs font-mono text-emerald-400 font-bold bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            Box: {frameWidthPercent}% &times; {frameHeightPercent}%
          </div>
          <button
            onClick={() => setShowFrameControls(!showFrameControls)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs flex items-center gap-1"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{showFrameControls ? 'Hide Sliders' : 'Adjust Size'}</span>
          </button>
        </div>
      </div>

      {/* Fine-Tuning Sliders Drawer */}
      {showFrameControls && (
        <div className="bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-300 font-medium w-24">Frame Width:</span>
            <input
              type="range"
              min="30"
              max="95"
              value={frameWidthPercent}
              onChange={(e) => setFrameWidthPercent(Number(e.target.value))}
              className="flex-1 accent-emerald-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />
            <span className="font-mono text-emerald-400 w-10 text-right">{frameWidthPercent}%</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-300 font-medium w-24">Frame Height:</span>
            <input
              type="range"
              min="15"
              max="85"
              value={frameHeightPercent}
              onChange={(e) => setFrameHeightPercent(Number(e.target.value))}
              className="flex-1 accent-emerald-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />
            <span className="font-mono text-emerald-400 w-10 text-right">{frameHeightPercent}%</span>
          </div>
        </div>
      )}

      {/* Main Viewport & Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Viewport (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative aspect-[4/3] flex flex-col justify-center items-center">
            {/* 1. Camera Viewport */}
            {inputMode === 'camera' && (
              <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  style={{
                    transform: `scale(${zoomLevel})`,
                    transition: 'transform 0.15s ease-out',
                  }}
                  className="w-full h-full object-cover origin-center"
                />

                <canvas ref={canvasRef} className="hidden" />

                {/* Scalable & Zoom-Aware Scanner Reticle Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div
                    style={{
                      width: `${frameWidthPercent}%`,
                      height: `${frameHeightPercent}%`,
                      transition: 'width 0.1s ease-out, height 0.1s ease-out',
                    }}
                    className="border-2 border-emerald-400/90 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
                  >
                    {/* Reticle Corner Brackets */}
                    <span className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                    <span className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                    <span className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                    <span className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                    {/* Laser Scan line */}
                    <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-scanline" />

                    {/* HUD badge on reticle */}
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900/90 text-emerald-400 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/40 shadow">
                      Zoom: {zoomLevel.toFixed(1)}x | {frameWidthPercent}%&times;{frameHeightPercent}%
                    </div>
                  </div>
                </div>

                {/* Camera Controls Bar */}
                <div className="absolute bottom-4 inset-x-4 flex items-center justify-between z-20">
                  <button
                    onClick={() => setContinuousScan(!continuousScan)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur border transition-all ${
                      continuousScan
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-950/80 text-slate-300 border-slate-700'
                    }`}
                  >
                    Continuous: {continuousScan ? 'Active' : 'Paused'}
                  </button>

                  <button
                    onClick={captureFrame}
                    disabled={isProcessing}
                    className="px-6 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold text-sm shadow-xl shadow-emerald-500/30 flex items-center gap-2 transform active:scale-95 transition-all cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{isProcessing ? 'Reading Frame...' : 'Snap & Copy Frame'}</span>
                  </button>

                  <button
                    onClick={startCamera}
                    title="Restart camera stream"
                    className="p-2 rounded-xl bg-slate-950/80 text-slate-300 hover:text-white border border-slate-700"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                {cameraError && (
                  <div className="absolute inset-4 bg-slate-950/95 rounded-xl p-6 flex flex-col items-center justify-center text-center text-rose-400">
                    <AlertCircle className="w-10 h-10 mb-3" />
                    <div className="font-bold text-sm mb-1">Camera Permission or Device Error</div>
                    <p className="text-xs text-slate-400 max-w-sm mb-4">{cameraError}</p>
                    <button
                      onClick={() => setInputMode('sample')}
                      className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold"
                    >
                      Test with Handwritten Samples
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 2. Upload Mode with Zoom & Scaled Frame */}
            {inputMode === 'upload' && (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                {capturedImageDataUrl ? (
                  <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-slate-950">
                    <img
                      ref={caughtImageRef}
                      src={capturedImageDataUrl}
                      alt="Uploaded paper"
                      style={{
                        transform: `scale(${zoomLevel})`,
                        transition: 'transform 0.15s ease-out',
                      }}
                      className="max-h-full max-w-full object-contain rounded-lg origin-center"
                    />

                    {/* Scalable Reticle Over Caught Paper */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div
                        style={{
                          width: `${frameWidthPercent}%`,
                          height: `${frameHeightPercent}%`,
                        }}
                        className="border-2 border-emerald-400/90 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
                      >
                        <span className="absolute -top-1 -left-1 w-5 h-5 border-t-3 border-l-3 border-emerald-400" />
                        <span className="absolute -top-1 -right-1 w-5 h-5 border-t-3 border-r-3 border-emerald-400" />
                        <span className="absolute -bottom-1 -left-1 w-5 h-5 border-b-3 border-l-3 border-emerald-400" />
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 border-b-3 border-r-3 border-emerald-400" />
                      </div>
                    </div>

                    {/* Action buttons on caught paper */}
                    <div className="absolute bottom-3 inset-x-3 flex flex-wrap items-center justify-between gap-2 z-20 bg-slate-950/85 p-2 rounded-xl border border-slate-800 backdrop-blur">
                      <button
                        onClick={() => {
                          setCapturedImageDataUrl(null);
                          setDetectedNumbers([]);
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-lg border border-slate-700"
                      >
                        Change Photo
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={rescanCaughtPaper}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg border border-slate-700 flex items-center gap-1.5"
                        >
                          <Crop className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Scan Frame Box</span>
                        </button>

                        <button
                          onClick={() => {
                            if (caughtImageRef.current) {
                              const img = caughtImageRef.current;
                              const canvas = document.createElement('canvas');
                              canvas.width = img.naturalWidth || 800;
                              canvas.height = img.naturalHeight || 600;
                              const ctx = canvas.getContext('2d');
                              if (ctx) {
                                ctx.drawImage(img, 0, 0);
                                processImage(canvas, 'upload');
                              }
                            }
                          }}
                          className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg shadow-lg flex items-center gap-1.5 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>⚡ Full AI Scan</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-full border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl flex flex-col items-center justify-center p-8 transition-colors cursor-pointer group bg-slate-950/40"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-slate-800 group-hover:bg-emerald-500/20 text-slate-400 group-hover:text-emerald-400 flex items-center justify-center mb-4 transition-colors">
                      <Upload className="w-7 h-7" />
                    </div>
                    <span className="font-bold text-sm text-white">
                      Drop photo of handwritten paper here
                    </span>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                      Snap paper with your phone, drop it here, and zoom &amp; scale the frame directly onto your 8 or 10 digits!
                    </p>
                    <button className="mt-4 px-4 py-2 bg-slate-800 group-hover:bg-emerald-500 group-hover:text-slate-950 text-white text-xs font-bold rounded-xl transition-all">
                      Select Paper Photo
                    </button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )}

            {/* 3. Sample Paper Preset Mode with Zoom & Scaled Frame */}
            {inputMode === 'sample' && (
              <div className="w-full h-full flex items-center justify-center p-4 bg-slate-950 relative overflow-hidden">
                {capturedImageDataUrl ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      ref={caughtImageRef}
                      src={capturedImageDataUrl}
                      alt="Sample Paper"
                      style={{
                        transform: `scale(${zoomLevel})`,
                        transition: 'transform 0.15s ease-out',
                      }}
                      className="max-h-full max-w-full object-contain rounded-lg shadow-2xl border border-slate-700 origin-center"
                    />

                    {/* Scalable Reticle Over Caught Sample Paper */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div
                        style={{
                          width: `${frameWidthPercent}%`,
                          height: `${frameHeightPercent}%`,
                        }}
                        className="border-2 border-emerald-400/90 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
                      >
                        <span className="absolute -top-1 -left-1 w-5 h-5 border-t-3 border-l-3 border-emerald-400" />
                        <span className="absolute -top-1 -right-1 w-5 h-5 border-t-3 border-r-3 border-emerald-400" />
                        <span className="absolute -bottom-1 -left-1 w-5 h-5 border-b-3 border-l-3 border-emerald-400" />
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 border-b-3 border-r-3 border-emerald-400" />

                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900/90 text-emerald-400 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/40">
                          {frameWidthPercent}% &times; {frameHeightPercent}%
                        </div>
                      </div>
                    </div>

                    <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur px-3 py-1 rounded-lg border border-slate-700 text-xs font-mono text-emerald-400 font-bold z-10">
                      {activeSample?.title || 'Sample Paper'}
                    </div>

                    <div className="absolute bottom-3 right-3 z-10">
                      <button
                        onClick={rescanCaughtPaper}
                        className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5"
                      >
                        <Crop className="w-3.5 h-3.5" />
                        <span>Rescan Box</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-500 text-xs">Loading sample paper...</div>
                )}
              </div>
            )}

            {/* OCR Processing Overlay */}
            {isProcessing && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                <span className="text-sm font-bold text-white">Extracting handwritten digits...</span>
                <span className="text-xs text-slate-400 font-mono">
                  Filtering for {digitLengthFilter === '8_or_10' ? '8 & 10 digits' : `${digitLengthFilter} digits`}
                </span>
              </div>
            )}
          </div>

          {/* Quick preset selector below camera */}
          <SamplePaperGallery
            onSelectSample={handleSelectSample}
            selectedSampleId={activeSample?.id}
          />
        </div>

        {/* Right Column: Extracted Numbers & Clipboard Copier (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Top Copied Hero Card */}
          {detectedNumbers.length > 0 && (
            <div className="bg-gradient-to-br from-emerald-950/70 via-slate-900 to-slate-900 border-2 border-emerald-500/60 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-400 mb-2">
                <span className="flex items-center gap-1.5 uppercase tracking-wider">
                  <Check className="w-4 h-4 bg-emerald-500 text-slate-950 rounded-full p-0.5" />
                  {detectedNumbers[0].digitsOnly.length === 8 ? '8-Digit Number Copied' : detectedNumbers[0].digitsOnly.length === 10 ? '10-Digit Number Copied' : 'Number Copied'}
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono text-[10px]">
                  Ready for Ctrl+V
                </span>
              </div>

              {/* Number display */}
              <div className="my-3 font-mono text-3xl font-extrabold text-white tracking-wider break-all select-all bg-slate-950/90 p-4 rounded-xl border border-slate-800 shadow-inner text-center">
                {digitsOnlyMode ? detectedNumbers[0].digitsOnly : detectedNumbers[0].value}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-3 px-1">
                <span>Digits: <strong className="text-emerald-400">{detectedNumbers[0].digitsOnly.length}</strong></span>
                <span>Type: <strong className="text-white">Handwritten Paper</strong></span>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  onClick={() => handleCopy(detectedNumbers[0])}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy Again</span>
                </button>

                <button
                  onClick={onNavigateToTester}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 flex items-center gap-1.5 transition-all"
                >
                  <span>Test Ctrl+V</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Detected Numbers Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-full">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Detected Paper Numbers</h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {detectedNumbers.length}
                </span>
              </div>

              {detectedNumbers.length > 0 && (
                <span className="text-xs text-slate-400">Click any number to copy</span>
              )}
            </div>

            <div className="divide-y divide-slate-800/80 overflow-auto max-h-[360px] flex-1 mt-2">
              {detectedNumbers.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  <PenTool className="w-8 h-8 mx-auto mb-2 opacity-30 text-emerald-400" />
                  <p>Hold paper with handwritten 8 or 10 digits in front of camera.</p>
                  <p className="mt-1 text-slate-400">
                    Use the <strong>Zoom</strong> and <strong>Frame Scale</strong> sliders above to frame small handwriting perfectly!
                  </p>
                </div>
              ) : (
                detectedNumbers.map((num, idx) => {
                  const valToDisplay = digitsOnlyMode ? num.digitsOnly : num.value;
                  const isCopied = lastCopiedId === num.id;
                  const digitLen = num.digitsOnly.length;

                  return (
                    <div
                      key={num.id}
                      className="py-3 px-2 flex items-center justify-between group hover:bg-slate-800/40 rounded-xl transition-all"
                    >
                      <div className="min-w-0 flex-1 mr-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                            {valToDisplay}
                          </span>
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                            digitLen === 8 ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : digitLen === 10 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {digitLen} Digits
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                          <span className="text-slate-300 font-medium">
                            {num.label || 'Handwritten Number'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleCopy(num)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                          isCopied
                            ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                            : 'bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200'
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Python suite CTA card */}
            <div className="mt-4 p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="text-xs">
                <span className="font-bold text-white block">Download Python Script (with Zoom &amp; Scaling)</span>
                <span className="text-slate-400 text-[11px]">
                  Press &apos;z&apos; to zoom, &apos;+&apos;/&apos;-&apos; or &apos;w/a/s/d&apos; to scale frame on your PC.
                </span>
              </div>
              <button
                onClick={onNavigateToPython}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs rounded-lg border border-slate-700 transition-colors"
              >
                Get .py File &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
