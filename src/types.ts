export interface ScannedNumber {
  id: string;
  value: string;
  digitsOnly: string;
  label?: string;
  confidence?: number;
  timestamp: number;
  source: 'webcam' | 'upload' | 'sample' | 'ai';
}

export interface PaperSample {
  id: string;
  title: string;
  category: string;
  description: string;
  expectedNumbers: string[];
  imageUrl: string;
  svgData?: string;
}

export type OSPlatform = 'windows' | 'mac' | 'linux';

export type PythonScriptType = 'handwritten' | 'webcam' | 'gemini' | 'hotkey' | 'watcher';

export type DigitLengthFilter = 'all' | '8' | '9' | '10' | '8_to_10' | '8_or_10';

export interface PythonConfig {
  os: OSPlatform;
  minDigits: number;
  digitsOnly: boolean;
  digitLengthFilter: DigitLengthFilter;
  playBeep: boolean;
  saveHistory: boolean;
  tesseractPath: string;
}
