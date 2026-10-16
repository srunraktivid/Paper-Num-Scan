import { createWorker } from 'tesseract.js';
import { ScannedNumber, DigitLengthFilter } from '../types';

let workerPromise: Promise<any> | null = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker('eng');
      // Set parameters optimized for numbers and handwritten characters
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-$#./,:+() ',
      });
      return worker;
    })();
  }
  return workerPromise;
}

/**
 * Preprocess image on canvas: grayscale + high contrast + adaptive binarization to enhance handwritten numbers
 */
export function preprocessCanvas(sourceCanvas: HTMLCanvasElement, isHandwritten: boolean = false): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return sourceCanvas;

  ctx.drawImage(sourceCanvas, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;

  // Grayscale & contrast calculation
  const contrast = isHandwritten ? 1.6 : 1.35;
  const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    // Luminance grayscale
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    
    let adjusted = factor * (gray - 128) + 128;
    adjusted = adjusted < 0 ? 0 : adjusted > 255 ? 255 : adjusted;

    if (isHandwritten) {
      // Binarize pen ink on paper: dark ink becomes crisp black, paper becomes clean white
      adjusted = adjusted < 140 ? 0 : 255;
    }

    d[i] = adjusted;
    d[i + 1] = adjusted;
    d[i + 2] = adjusted;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Common handwritten OCR character confusion fixer (O->0, l/I->1, S->5, B->8, Z->2)
 */
function fixHandwritingConfusion(token: string): string {
  // If the token is predominantly numeric but has common misread letters
  return token
    .replace(/[Oo]/g, '0')
    .replace(/[Il|]/g, '1')
    .replace(/[Ss]/g, '5')
    .replace(/[B]/g, '8')
    .replace(/[Zz]/g, '2')
    .replace(/[gq]/g, '9');
}

/**
 * Matches target digit length requirement: '8', '10', '8_or_10', or 'all'
 */
function matchesLengthFilter(length: number, filter: DigitLengthFilter, minDigits: number): boolean {
  if (filter === '8') return length === 8;
  if (filter === '9') return length === 9;
  if (filter === '10') return length === 10;
  if (filter === '8_to_10' || filter === '8_or_10') return length >= 8 && length <= 10;
  return length >= minDigits;
}

/**
 * Parse raw OCR text and extract candidate numbers with heuristics
 */
export function extractNumbersFromText(
  rawText: string,
  minDigits: number = 3,
  lengthFilter: DigitLengthFilter = 'all',
  source: 'webcam' | 'upload' | 'sample' | 'ai' = 'webcam'
): ScannedNumber[] {
  const results: ScannedNumber[] = [];
  const seenDigits = new Set<string>();

  const lines = rawText.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check potential handwriting confusion
    const fixedLine = fixHandwritingConfusion(trimmed);

    // Look for common labels
    let label = 'Number';
    const lower = trimmed.toLowerCase();
    if (lower.includes('track') || lower.includes('1z') || lower.includes('awb')) label = 'Tracking #';
    else if (lower.includes('serial') || lower.includes('s/n') || lower.includes('sn:')) label = 'Serial #';
    else if (lower.includes('account') || lower.includes('acct')) label = 'Account #';
    else if (lower.includes('total') || lower.includes('amount') || lower.includes('$')) label = 'Total / Price';
    else if (lower.includes('phone') || lower.includes('tel') || lower.includes('cell')) label = 'Phone #';
    else if (lower.includes('pin') || lower.includes('code') || lower.includes('pass')) label = 'PIN / Code';

    // Regex tokens
    const matches = fixedLine.match(/(?:[A-Za-z0-9]+[-/])*[0-9]+(?:[-/. ][0-9]+)*(?:\.[0-9]{2})?/g);

    if (matches) {
      for (const token of matches) {
        const digitsOnly = token.replace(/\D/g, '');
        if (matchesLengthFilter(digitsOnly.length, lengthFilter, minDigits) && !seenDigits.has(digitsOnly)) {
          seenDigits.add(digitsOnly);

          let dynamicLabel = label;
          if (digitsOnly.length === 8) dynamicLabel = 'Handwritten 8-digit #';
          else if (digitsOnly.length === 9) dynamicLabel = 'Handwritten 9-digit # (070263516)';
          else if (digitsOnly.length === 10) dynamicLabel = 'Handwritten 10-digit #';
          else if (token.includes('-')) dynamicLabel = 'Paper Reference Code';

          results.push({
            id: `num-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            value: token.trim(),
            digitsOnly,
            label: dynamicLabel,
            confidence: 0.94,
            timestamp: Date.now(),
            source,
          });
        }
      }
    }
  }

  // Also scan for continuous pure digit sequences
  const globalTokens = fixHandwritingConfusion(rawText).match(/\b\d{8,10}\b|\b\d{3,}(?:[-. ]\d{2,})*\b/g);
  if (globalTokens) {
    for (const token of globalTokens) {
      const digitsOnly = token.replace(/\D/g, '');
      if (matchesLengthFilter(digitsOnly.length, lengthFilter, minDigits) && !seenDigits.has(digitsOnly)) {
        seenDigits.add(digitsOnly);

        let dynamicLabel = 'Detected Number';
        if (digitsOnly.length === 8) dynamicLabel = 'Handwritten 8-digit #';
        else if (digitsOnly.length === 10) dynamicLabel = 'Handwritten 10-digit #';

        results.push({
          id: `num-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          value: token.trim(),
          digitsOnly,
          label: dynamicLabel,
          confidence: 0.92,
          timestamp: Date.now(),
          source,
        });
      }
    }
  }

  // Sort: numbers that strictly match 8 or 10 digits go to the top if filtered
  return results.sort((a, b) => {
    const aIsTarget = a.digitsOnly.length === 8 || a.digitsOnly.length === 10;
    const bIsTarget = b.digitsOnly.length === 8 || b.digitsOnly.length === 10;
    if (aIsTarget && !bIsTarget) return -1;
    if (!aIsTarget && bIsTarget) return 1;
    return b.digitsOnly.length - a.digitsOnly.length;
  });
}

/**
 * Run client-side Tesseract OCR on an image source (canvas, image element, or dataUrl)
 */
export async function runLocalOCR(
  imageSource: string | HTMLCanvasElement,
  minDigits: number = 3,
  lengthFilter: DigitLengthFilter = 'all'
): Promise<{ text: string; numbers: ScannedNumber[] }> {
  try {
    const worker = await getWorker();
    const ret = await worker.recognize(imageSource);
    const text = ret.data.text || '';
    const numbers = extractNumbersFromText(text, minDigits, lengthFilter, 'webcam');
    return { text, numbers };
  } catch (err) {
    console.error('Local OCR failed:', err);
    throw err;
  }
}
