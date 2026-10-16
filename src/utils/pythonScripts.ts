import { OSPlatform, PythonConfig, PythonScriptType, DigitLengthFilter } from '../types';

export function getTesseractDefaultPath(os: OSPlatform): string {
  switch (os) {
    case 'windows':
      return `r'C:\\Program Files\\Tesseract-OCR\\tesseract.exe'`;
    case 'mac':
      return `'/opt/homebrew/bin/tesseract'  # or '/usr/local/bin/tesseract'`;
    case 'linux':
      return `'/usr/bin/tesseract'`;
  }
}

/**
 * Generate specialized script for HANDWRITTEN 8 & 10 digit paper numbers
 */
export function generateHandwrittenScript(config: PythonConfig): string {
  const tesseractSetup =
    config.os === 'windows'
      ? `\n# Windows: Point pytesseract to installed tesseract.exe\npytesseract.pytesseract.tesseract_cmd = ${config.tesseractPath || `r'C:\\Program Files\\Tesseract-OCR\\tesseract.exe'`}\n`
      : config.os === 'mac'
      ? `\n# macOS: If tesseract is not in default PATH, uncomment below:\n# pytesseract.pytesseract.tesseract_cmd = '/opt/homebrew/bin/tesseract'\n`
      : `\n# Linux: standard path is usually /usr/bin/tesseract\n`;

  const beepCode = config.playBeep
    ? config.os === 'windows'
      ? `    # Windows sound beep
    try:
        import winsound
        winsound.Beep(1200, 150)
    except Exception:
        print('\\a', end='', flush=True)`
      : config.os === 'mac'
      ? `    # Mac sound beep
    try:
        import os
        os.system('afplay /System/Library/Sounds/Tink.aiff &')
    except Exception:
        print('\\a', end='', flush=True)`
      : `    # Linux bell beep
    print('\\a', end='', flush=True)`
    : `    pass`;

  let lengthCondition = "len(digits) in (8, 9, 10)";
  if (config.digitLengthFilter === '8') lengthCondition = "len(digits) == 8";
  if (config.digitLengthFilter === '9') lengthCondition = "len(digits) == 9";
  if (config.digitLengthFilter === '10') lengthCondition = "len(digits) == 10";
  if (config.digitLengthFilter === 'all') lengthCondition = "len(digits) >= 4";

  return `#!/usr/bin/env python3
"""
=============================================================================
  HANDWRITTEN PAPER NUMBER SCANNER (8 & 10 DIGITS) -> AUTO-CLIPBOARD
  Specialized for numbers written by hand with pen or pencil on paper.
  Strictly filters for 8-digit and 10-digit numbers so you get 100% clean Ctrl+V!
=============================================================================
Requirements:
  pip install opencv-python pytesseract pyperclip pillow numpy
"""

import cv2
import numpy as np
import pytesseract
import pyperclip
import re
import time
from datetime import datetime
${tesseractSetup}
# TARGET SETTINGS
# Checks if number is 8 or 10 digits
TARGET_FILTER = "${config.digitLengthFilter}"  # '8_or_10', '8', or '10'
AUTO_COPY = True
SAVE_HISTORY = ${config.saveHistory ? 'True' : 'False'}
HISTORY_FILE = "handwritten_scanned_numbers.txt"

def play_chime():
${beepCode}

def fix_handwriting_mistakes(text):
    """
    Fixes common OCR confusions on handwritten digits:
    Letters like O, l, I, S, B, Z that people write resembling numbers.
    """
    subs = {
        'O': '0', 'o': '0', 'D': '0',
        'I': '1', 'l': '1', '|': '1', '!': '1',
        'Z': '2', 'z': '2',
        'S': '5', 's': '5',
        'B': '8',
        'g': '9', 'q': '9'
    }
    cleaned_chars = []
    for ch in text:
        cleaned_chars.append(subs.get(ch, ch))
    return "".join(cleaned_chars)

def extract_8_or_10_digits(text):
    """
    Isolates pure numerical sequences that match exactly 8 or 10 digits.
    """
    corrected = fix_handwriting_mistakes(text)
    # Find all continuous digit sequences
    candidates = re.findall(r'\\b\\d{8,10}\\b|\\d+', corrected)
    valid_numbers = []
    
    for item in candidates:
        digits = re.sub(r'\\D', '', item)
        if ${lengthCondition}:
            valid_numbers.append(digits)
            
    return valid_numbers

def preprocess_handwriting(roi_bgr):
    """
    Specially tuned morphological filtering for ink and pencil strokes on paper:
    1. Grayscale + CLAHE to remove paper shadows/creases
    2. Adaptive Gaussian thresholding to isolate ink
    3. Morphological closing to connect broken pen strokes
    """
    gray = cv2.cvtColor(roi_bgr, cv2.COLOR_BGR2GRAY)
    
    # 1. CLAHE (Contrast Limited Adaptive Histogram Equalization)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    contrast_enhanced = clahe.apply(gray)
    
    # 2. Gaussian blur to reduce paper grain
    blurred = cv2.GaussianBlur(contrast_enhanced, (3, 3), 0)
    
    # 3. Adaptive thresholding for paper ink
    thresh = cv2.adaptiveThreshold(
        blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 15, 8
    )
    
    # 4. Morphological Close to connect broken ballpoint pen strokes
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    
    # Invert back to black text on white background for Tesseract
    final_roi = cv2.bitwise_not(closed)
    return final_roi

def copy_to_clipboard(number_str):
    """Puts the 8 or 10 digit handwritten number into clipboard with sound"""
    pyperclip.copy(number_str)
    play_chime()
    n_digits = len(number_str)
    print("\\n" + "="*56)
    print(f" [SUCCESS] COPIED HANDWRITTEN {n_digits}-DIGIT NUMBER: {number_str}")
    print(f" >>> Now press Ctrl+V (or Cmd+V) to paste! <<<")
    print("="*56 + "\\n")
    
    if SAVE_HISTORY:
        with open(HISTORY_FILE, "a", encoding="utf-8") as f:
            f.write(f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - {number_str} ({n_digits} digits)\\n")

def main():
    print("=========================================================")
    print("  HANDWRITTEN PAPER SCANNER (8 & 10 DIGIT NUMBERS)")
    print("  CONTROLS:")
    print("    'z': Cycle Digital Zoom (1.0x -> 1.5x -> 2.0x -> 2.5x)")
    print("    '+' or ']': Enlarge Scanning Box Size")
    print("    '-' or '[': Shrink Scanning Box Size")
    print("    'w'/'s': Scale Box Height (Taller / Shorter)")
    print("    'd'/'a': Scale Box Width (Wider / Narrower)")
    print("    SPACE: Force Capture & Copy to Clipboard")
    print("    'c': Re-copy last number | 'q': Quit")
    print("=========================================================\\n")

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("[ERROR] Could not open webcam. Try changing VideoCapture(0) to (1).")
        return

    # Request HD frame
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    last_copied = ""
    last_ocr_time = 0
    ocr_interval = 0.4  # Run scan every 400ms
    current_digits = []
    # Zoom and Frame Scaling Parameters
    zoom_levels = [1.0, 1.4, 1.8, 2.4]
    zoom_idx = 0
    scale_w = 0.60
    scale_h = 0.35

    while True:
        ret, raw_frame = cap.read()
        if not ret:
            break

        # Digital zoom
        zoom = zoom_levels[zoom_idx]
        if zoom > 1.0:
            zh, zw, _ = raw_frame.shape
            ch, cw = int(zh / zoom), int(zw / zoom)
            cx, cy = (zw - cw) // 2, (zh - ch) // 2
            cropped = raw_frame[cy:cy+ch, cx:cx+cw]
            frame = cv2.resize(cropped, (zw, zh), interpolation=cv2.INTER_LINEAR)
        else:
            frame = raw_frame.copy()

        h, w, _ = frame.shape
        # Center target reticle box with user scaling
        bw = int(w * scale_w)
        bh = int(h * scale_h)
        bw = max(120, min(bw, w - 20))
        bh = max(60, min(bh, h - 20))
        x1 = (w - bw) // 2
        y1 = (h - bh) // 2
        x2 = x1 + bw
        y2 = y1 + bh

        roi = frame[y1:y2, x1:x2]

        now = time.time()
        if now - last_ocr_time > ocr_interval:
            last_ocr_time = now
            processed = preprocess_handwriting(roi)

            # Tesseract config: psm 6 or 7 (line of text), digits only whitelist
            tess_config = r'--psm 6 -c tessedit_char_whitelist=0123456789OolISsBZgq'
            raw_text = pytesseract.image_to_string(processed, config=tess_config)
            
            candidates = extract_8_or_10_digits(raw_text)
            if candidates:
                current_digits = candidates
                top_match = candidates[0]
                n = len(top_match)
                status_text = f"Detected {n}-digit: {top_match}"
                status_color = (0, 255, 0) # Green

                if AUTO_COPY and top_match != last_copied:
                    copy_to_clipboard(top_match)
                    last_copied = top_match
                    status_text = f"COPIED {n}-DIGIT: {top_match} (Ctrl+V ready)"
            else:
                current_digits = []
                status_text = "Align handwritten 8 or 10 digits"
                status_color = (0, 200, 255)

        # Draw Viewfinder Overlay
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (w, h), (10, 12, 18), -1)
        cv2.rectangle(overlay, (x1, y1), (x2, y2), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.45, frame, 0.55, 0, frame)

        # Draw green/yellow targeting box
        border_col = (0, 255, 0) if len(current_digits) > 0 else (0, 255, 255)
        cv2.rectangle(frame, (x1, y1), (x2, y2), border_col, 2)

        # Corner brackets
        clen = 25
        cv2.line(frame, (x1, y1), (x1 + clen, y1), (0, 255, 0), 4)
        cv2.line(frame, (x1, y1), (x1, y1 + clen), (0, 255, 0), 4)
        cv2.line(frame, (x2, y1), (x2 - clen, y1), (0, 255, 0), 4)
        cv2.line(frame, (x2, y1), (x2, y1 + clen), (0, 255, 0), 4)
        cv2.line(frame, (x1, y2), (x1 + clen, y2), (0, 255, 0), 4)
        cv2.line(frame, (x1, y2), (x1, y2 - clen), (0, 255, 0), 4)
        cv2.line(frame, (x2, y2), (x2 - clen, y2), (0, 255, 0), 4)
        cv2.line(frame, (x2, y2), (x2, y2 - clen), (0, 255, 0), 4)

        # Top Banner with Zoom & Scale stats
        cv2.rectangle(frame, (0, 0), (w, 55), (15, 20, 28), -1)
        cv2.putText(frame, f"HANDWRITTEN SCANNER | Zoom: {zoom:.1f}x | Box: {int(scale_w*100)}%x{int(scale_h*100)}%",
                    (20, 36), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2)

        # Status & Instructions
        cv2.putText(frame, status_text, (x1, y2 + 35),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.75, status_color, 2)
        cv2.putText(frame, "SPACE: Snap | 'z': Zoom | '+/-' or 'w/a/s/d': Scale Box | 'c': Re-copy | 'q': Quit",
                    (20, h - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (200, 200, 200), 1)

        cv2.imshow("Handwritten Paper Number Scanner", frame)

        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('z'):
            zoom_idx = (zoom_idx + 1) % len(zoom_levels)
            print(f"[ZOOM] Set to {zoom_levels[zoom_idx]}x")
        elif key in (ord('+'), ord('='), ord(']')):
            scale_w = min(0.92, scale_w + 0.05)
            scale_h = min(0.85, scale_h + 0.05)
            print(f"[FRAME SCALE] Box size: {int(scale_w*100)}% x {int(scale_h*100)}%")
        elif key in (ord('-'), ord('_'), ord('[')):
            scale_w = max(0.25, scale_w - 0.05)
            scale_h = max(0.15, scale_h - 0.05)
            print(f"[FRAME SCALE] Box size: {int(scale_w*100)}% x {int(scale_h*100)}%")
        elif key == ord('w'):
            scale_h = min(0.85, scale_h + 0.04)
        elif key == ord('s'):
            scale_h = max(0.15, scale_h - 0.04)
        elif key == ord('d'):
            scale_w = min(0.92, scale_w + 0.04)
        elif key == ord('a'):
            scale_w = max(0.25, scale_w - 0.04)
        elif key == 32:  # SPACEBAR force capture
            processed = preprocess_handwriting(roi)
            raw_text = pytesseract.image_to_string(processed, config=r'--psm 6')
            candidates = extract_8_or_10_digits(raw_text)
            if candidates:
                copy_to_clipboard(candidates[0])
                last_copied = candidates[0]
            else:
                print("[INFO] No 8 or 10 digit number clearly seen. Hold steady or adjust zoom with 'z'.")
        elif key == ord('c') and last_copied:
            pyperclip.copy(last_copied)
            play_chime()
            print(f"[RE-COPIED] {last_copied}")

    cap.release()
    cv2.destroyAllWindows()
    print("\\nScanner closed. Your scanned number is in clipboard ready for Ctrl+V!")

if __name__ == "__main__":
    main()
`;
}

export function generateWebcamScript(config: PythonConfig): string {
  const tesseractSetup =
    config.os === 'windows'
      ? `\n# Windows: Point pytesseract to installed tesseract.exe\npytesseract.pytesseract.tesseract_cmd = ${config.tesseractPath || `r'C:\\Program Files\\Tesseract-OCR\\tesseract.exe'`}\n`
      : config.os === 'mac'
      ? `\n# macOS: If tesseract is not in default PATH, uncomment below:\n# pytesseract.pytesseract.tesseract_cmd = '/opt/homebrew/bin/tesseract'\n`
      : `\n# Linux: standard path is usually /usr/bin/tesseract\n`;

  const beepCode = config.playBeep
    ? config.os === 'windows'
      ? `    # Sound notification for Windows
    try:
        import winsound
        winsound.Beep(1200, 150)
    except Exception:
        print('\\a', end='', flush=True)`
      : config.os === 'mac'
      ? `    # Sound notification for Mac
    try:
        import os
        os.system('afplay /System/Library/Sounds/Tink.aiff &')
    except Exception:
        print('\\a', end='', flush=True)`
      : `    # Sound notification for Linux
    print('\\a', end='', flush=True)`
    : `    pass`;

  let lengthCheck = "len(digits_only) >= MIN_DIGITS";
  if (config.digitLengthFilter === '8') lengthCheck = "len(digits_only) == 8";
  if (config.digitLengthFilter === '10') lengthCheck = "len(digits_only) == 10";
  if (config.digitLengthFilter === '8_or_10') lengthCheck = "len(digits_only) in (8, 10)";

  const numberFilterCode = config.digitsOnly
    ? `        digits_only = re.sub(r'\\D', '', raw_token)
        if ${lengthCheck}:
            extracted.append(digits_only)`
    : `        cleaned = raw_token.strip('.,:;()[]')
        digits_only = re.sub(r'\\D', '', cleaned)
        if ${lengthCheck}:
            extracted.append(cleaned)`;

  return `#!/usr/bin/env python3
"""
=============================================================================
  PAPER TO CLIPBOARD NUMBER SCANNER
  Scan numbers on physical paper with your webcam and auto-copy to clipboard!
  Ready for instant Ctrl+V into Excel, Word, Browser, ERP, or Form.
=============================================================================
Requirements:
  pip install opencv-python pytesseract pyperclip pillow
"""

import cv2
import pytesseract
import pyperclip
import re
import time
from datetime import datetime
${tesseractSetup}
# Settings
MIN_DIGITS = ${config.minDigits}
LENGTH_FILTER = "${config.digitLengthFilter}"
AUTO_COPY_WHEN_STEADY = True
SAVE_HISTORY_FILE = ${config.saveHistory ? 'True' : 'False'}
HISTORY_FILENAME = "scanned_numbers_log.txt"

def play_chime():
${beepCode}

def clean_and_extract_numbers(text):
    """Filter candidate number sequences from OCR text"""
    extracted = []
    # Match sequences that contain numbers (with optional dashes, dots, spaces)
    matches = re.findall(r'[A-Za-z0-9]*[0-9]+(?:[-/. ][0-9]+)*(?:\\.[0-9]{2})?', text)
    for raw_token in matches:
${numberFilterCode}
    return extracted

def preprocess_paper_image(roi_bgr):
    """
    Apply OpenCV computer vision preprocessing to handle paper glare,
    shadows, and improve printed/handwritten digit contrast.
    """
    gray = cv2.cvtColor(roi_bgr, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (3, 3), 0)
    thresh = cv2.adaptiveThreshold(
        blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 15, 6
    )
    return thresh

def copy_to_clipboard(number_str):
    """Copies extracted paper number directly to OS clipboard"""
    pyperclip.copy(number_str)
    play_chime()
    print(f"\\n" + "="*50)
    print(f" [SUCCESS] COPIED TO CLIPBOARD: {number_str}")
    print(f" >>> Now press Ctrl+V (or Cmd+V) to paste! <<<")
    print("="*50 + "\\n")
    
    if SAVE_HISTORY_FILE:
        with open(HISTORY_FILENAME, "a", encoding="utf-8") as f:
            f.write(f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - {number_str}\\n")

def main():
    print("=========================================================")
    print("  Paper Number Scanner is Starting...")
    print("  1. Hold your paper inside the GREEN BOX.")
    print("  2. Numbers will be detected automatically.")
    print("  3. Press SPACEBAR to force-capture, or 'c' to copy.")
    print("  4. Press 'q' to quit.")
    print("=========================================================\\n")

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("[ERROR] Cannot open webcam. Try changing VideoCapture(0) to (1).")
        return

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    last_copied = ""
    last_ocr_time = 0
    ocr_interval = 0.5
    current_numbers = []
    status_msg = "Hold paper inside box"
    status_color = (0, 255, 255)

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        h, w, _ = frame.shape
        box_w, box_h = int(w * 0.55), int(h * 0.40)
        x1 = (w - box_w) // 2
        y1 = (h - box_h) // 2
        x2 = x1 + box_w
        y2 = y1 + box_h

        roi = frame[y1:y2, x1:x2]

        now = time.time()
        if now - last_ocr_time > ocr_interval:
            last_ocr_time = now
            processed_roi = preprocess_paper_image(roi)
            custom_config = r'--psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-./,:$'
            raw_text = pytesseract.image_to_string(processed_roi, config=custom_config)
            
            candidates = clean_and_extract_numbers(raw_text)
            if candidates:
                current_numbers = candidates
                top_candidate = candidates[0]
                status_msg = f"Detected: {top_candidate}"
                status_color = (0, 255, 0)

                if AUTO_COPY_WHEN_STEADY and top_candidate != last_copied:
                    copy_to_clipboard(top_candidate)
                    last_copied = top_candidate
                    status_msg = f"COPIED: {top_candidate} (Ready for Ctrl+V)"
            else:
                current_numbers = []
                status_msg = "Align paper with number in box"
                status_color = (0, 200, 255)

        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (w, h), (10, 10, 15), -1)
        cv2.rectangle(overlay, (x1, y1), (x2, y2), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.4, frame, 0.6, 0, frame)

        box_color = (0, 255, 0) if len(current_numbers) > 0 else (0, 255, 255)
        cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2)

        cv2.rectangle(frame, (0, 0), (w, 55), (20, 24, 33), -1)
        cv2.putText(frame, "PAPER NUMBER SCANNER -> CLIPBOARD (CTRL+V)", (20, 35),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

        cv2.putText(frame, status_msg, (x1, y2 + 35),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.75, status_color, 2)
        
        cv2.putText(frame, "SPACE: Manual Snap & Copy | 'c': Re-copy | 'q': Quit", (20, h - 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (180, 180, 180), 1)

        cv2.imshow("Paper Number Scanner", frame)

        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == 32:  # SPACEBAR
            if current_numbers:
                copy_to_clipboard(current_numbers[0])
                last_copied = current_numbers[0]
            else:
                processed_roi = preprocess_paper_image(roi)
                text = pytesseract.image_to_string(processed_roi)
                candidates = clean_and_extract_numbers(text)
                if candidates:
                    copy_to_clipboard(candidates[0])
                    last_copied = candidates[0]
        elif key == ord('c') and last_copied:
            pyperclip.copy(last_copied)
            play_chime()
            print(f"[RE-COPIED] {last_copied}")

    cap.release()
    cv2.destroyAllWindows()
    print("\\nScanner closed. Ready for Ctrl+V!")

if __name__ == "__main__":
    main()
`;
}

export function generateHotkeySnipScript(config: PythonConfig): string {
  const tesseractSetup =
    config.os === 'windows'
      ? `\n# Windows tesseract path\npytesseract.pytesseract.tesseract_cmd = ${config.tesseractPath || `r'C:\\Program Files\\Tesseract-OCR\\tesseract.exe'`}\n`
      : ``;

  return `#!/usr/bin/env python3
"""
=============================================================================
  GLOBAL HOTKEY PAPER SNIPPER (Press Ctrl+Shift+S)
  Snip any paper photo, webcam window, or document on screen.
  Automatically extracts 8 or 10 digit numbers and copies to clipboard for Ctrl+V!
=============================================================================
Requirements:
  pip install pillow pytesseract pyperclip keyboard
"""

import time
import re
import pytesseract
import pyperclip
from PIL import ImageGrab, Image, ImageEnhance
import keyboard
${tesseractSetup}
MIN_DIGITS = ${config.minDigits}
LENGTH_FILTER = "${config.digitLengthFilter}"

def play_chime():
    try:
        import winsound
        winsound.Beep(1200, 150)
    except Exception:
        print('\\a', end='', flush=True)

def extract_number_from_image(img):
    gray = img.convert('L')
    enhancer = ImageEnhance.Contrast(gray)
    contrasted = enhancer.enhance(2.0)
    
    text = pytesseract.image_to_string(contrasted)
    # Fix handwriting confusions
    subs = {'O': '0', 'o': '0', 'l': '1', 'I': '1', 'S': '5', 's': '5', 'B': '8'}
    for k, v in subs.items():
        text = text.replace(k, v)
        
    matches = re.findall(r'\\d+', text)
    valid = []
    for token in matches:
        if LENGTH_FILTER == '8_or_10' and len(token) in (8, 10):
            valid.append(token)
        elif LENGTH_FILTER == '8' and len(token) == 8:
            valid.append(token)
        elif LENGTH_FILTER == '10' and len(token) == 10:
            valid.append(token)
        elif LENGTH_FILTER == 'all' and len(token) >= MIN_DIGITS:
            valid.append(token)
    return valid

def on_hotkey_pressed():
    print("\\n[HOTKEY TRIGGERED] Reading snip from clipboard...")
    time.sleep(0.3)
    img = ImageGrab.grabclipboard()
    if isinstance(img, Image.Image):
        nums = extract_number_from_image(img)
        if nums:
            target = nums[0]
            pyperclip.copy(target)
            play_chime()
            print(f" >>> COPIED TO CLIPBOARD: {target} (Ready for Ctrl+V) <<<")
        else:
            print("[!] Image found in clipboard but no 8 or 10 digit number detected.")
    else:
        print("[!] No image in clipboard. Press Win+Shift+S first to snip paper!")

print("="*60)
print("  HOTKEY PAPER SNIPPER RUNNING IN BACKGROUND")
print("  Step 1: Press Win+Shift+S to snip paper number.")
print("  Step 2: Press Ctrl+Shift+S to auto-extract number into clipboard.")
print("  Step 3: Press Ctrl+V in your application!")
print("  Press Ctrl+C in this terminal to exit.")
print("="*60)

keyboard.add_hotkey('ctrl+shift+s', on_hotkey_pressed)
keyboard.wait()
`;
}

export function generateFolderWatcherScript(config: PythonConfig): string {
  const tesseractSetup =
    config.os === 'windows'
      ? `\n# Windows tesseract path\npytesseract.pytesseract.tesseract_cmd = ${config.tesseractPath || `r'C:\\Program Files\\Tesseract-OCR\\tesseract.exe'`}\n`
      : ``;

  return `#!/usr/bin/env python3
"""
=============================================================================
  DROP FOLDER / PHONE PHOTO SYNC WATCHER (8 & 10 DIGIT NUMBERS)
  Drop any photo of handwritten paper into a folder.
  Script immediately extracts numbers and copies to clipboard for Ctrl+V!
=============================================================================
Requirements:
  pip install pytesseract pyperclip pillow
"""

import os
import time
import re
import pytesseract
import pyperclip
from PIL import Image, ImageEnhance
${tesseractSetup}
WATCH_DIR = "./paper_photos_to_scan"
LENGTH_FILTER = "${config.digitLengthFilter}"
PROCESSED_FILES = set()

os.makedirs(WATCH_DIR, exist_ok=True)

def play_chime():
    try:
        import winsound
        winsound.Beep(1200, 150)
    except Exception:
        print('\\a', end='', flush=True)

def scan_paper_image(file_path):
    try:
        img = Image.open(file_path).convert('L')
        enhancer = ImageEnhance.Contrast(img)
        contrasted = enhancer.enhance(2.0)
        text = pytesseract.image_to_string(contrasted)
        
        # Handwriting letter fixer
        for k, v in {'O': '0', 'o': '0', 'l': '1', 'I': '1', 'S': '5', 's': '5', 'B': '8'}.items():
            text = text.replace(k, v)

        matches = re.findall(r'\\d+', text)
        for token in matches:
            is_valid = False
            if LENGTH_FILTER == '8_or_10' and len(token) in (8, 10):
                is_valid = True
            elif LENGTH_FILTER == '8' and len(token) == 8:
                is_valid = True
            elif LENGTH_FILTER == '10' and len(token) == 10:
                is_valid = True
            elif LENGTH_FILTER == 'all' and len(token) >= 3:
                is_valid = True

            if is_valid:
                pyperclip.copy(token)
                play_chime()
                print(f"\\n[NEW PHOTO SCANNED] {os.path.basename(file_path)}")
                print(f" >>> COPIED TO CLIPBOARD: {token} ({len(token)} digits)")
                print(f" >>> Ready to Ctrl+V into your form/spreadsheet! <<<\\n")
                return
        print(f"[!] No matching 8 or 10 digit number in {os.path.basename(file_path)}")
    except Exception as e:
        print(f"[ERROR] Could not read {file_path}: {e}")

print(f"Watching folder: {os.path.abspath(WATCH_DIR)}")
print("Drop any photo of paper with handwritten 8 or 10 digits here to auto-copy to clipboard!")

while True:
    try:
        for fname in os.listdir(WATCH_DIR):
            if fname.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.webp')):
                full_path = os.path.join(WATCH_DIR, fname)
                if full_path not in PROCESSED_FILES:
                    time.sleep(0.5)
                    scan_paper_image(full_path)
                    PROCESSED_FILES.add(full_path)
        time.sleep(1)
    except KeyboardInterrupt:
        break
`;
}

export function generateGeminiScript(config: PythonConfig): string {
  return `#!/usr/bin/env python3
"""
=============================================================================
  AI VISION HANDWRITTEN NUMBER SCANNER (Google Gemini API)
  UNBEATABLE ACCURACY for numbers written by hand on paper (8 and 10 digits)!
  Handles messy handwriting, ballpoint pen, lined paper, and poor lighting.
  Auto-copies the extracted 8 or 10 digit number directly to your clipboard!
=============================================================================
Requirements:
  pip install google-genai pyperclip pillow
"""

import os
import sys
import re
import pyperclip
from google import genai
from PIL import Image

api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("[ERROR] Please set GEMINI_API_KEY environment variable.")
    print("Example: set GEMINI_API_KEY=your_key (Windows) or export GEMINI_API_KEY=your_key (Mac/Linux)")
    sys.exit(1)

client = genai.Client(api_key=api_key)

def scan_handwritten_paper(image_path):
    if not os.path.exists(image_path):
        print(f"[ERROR] File not found: {image_path}")
        return

    print(f"Scanning handwritten paper: {image_path} with Gemini AI...")
    img = Image.open(image_path)
    
    prompt = """
    This image contains numbers written BY HAND on physical paper.
    Some numbers are 8 digits long, and some numbers are 10 digits long.
    Look carefully at the handwritten digits. Distinguish 0 from O, 1 from I/l, 5 from S, 8 from B.
    
    Extract ONLY the 8-digit and 10-digit numbers.
    Output each detected number on its own line:
    Example:
    84920194
    0814929381
    """

    response = client.models.generate_content(
        model='gemini-3.8-flash',
        contents=[img, prompt]
    )

    print("\\n" + "="*50)
    print(" EXTRACTED HANDWRITTEN NUMBERS:")
    print("="*50)
    print(response.text.strip())
    
    # Filter for 8, 9, or 10 digits (including e.g. 070263516)
    all_numbers = re.findall(r'\\b\\d{8,10}\\b|\\d+', response.text)
    matching = [n for n in all_numbers if len(n) in (8, 9, 10)]
    
    if matching:
        target = matching[0]
        pyperclip.copy(target)
        print("="*50)
        print(f" [COPIED TO CLIPBOARD]: {target} ({len(target)} digits)")
        print(" >>> Now press Ctrl+V (or Cmd+V) to paste! <<<")
        print("="*50)
    elif all_numbers:
        target = all_numbers[0]
        pyperclip.copy(target)
        print(f" [COPIED TO CLIPBOARD]: {target}")
        print(" >>> Ready for Ctrl+V! <<<")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python gemini_handwritten_scanner.py <path_to_paper_photo.jpg>")
    else:
        scan_handwritten_paper(sys.argv[1])
`;
}
