import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON payload limit for image data
  app.use(express.json({ limit: '20mb' }));

  // AI Vision OCR endpoint for difficult paper (handwriting, complex receipts, serial tags)
  app.post('/api/ai-scan-number', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          error: 'GEMINI_API_KEY is not configured on the server. Local OCR will be used instead.',
        });
      }

      const { imageBase64, mode = 'all', lengthFilter = 'all' } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'imageBase64 is required' });
      }

      // Remove data URL prefix if present
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

      const ai = new GoogleGenAI({ apiKey });

      let filterHint = "";
      if (lengthFilter === '8') {
        filterHint = "CRITICAL: The user has handwritten 8-digit numbers on paper. Prioritize and isolate numbers that contain exactly 8 digits.";
      } else if (lengthFilter === '9') {
        filterHint = "CRITICAL: The user has handwritten 9-digit numbers on paper (like 070263516). Prioritize and isolate numbers that contain exactly 9 digits.";
      } else if (lengthFilter === '10') {
        filterHint = "CRITICAL: The user has handwritten 10-digit numbers on paper. Prioritize and isolate numbers that contain exactly 10 digits.";
      } else if (lengthFilter === '8_to_10' || lengthFilter === '8_or_10') {
        filterHint = "CRITICAL: The user writes numbers by hand on paper slips where numbers are 8, 9, or 10 digits long (e.g. 070263516, or 8/10 digits) as well as reference codes like 10-1038. You MUST extract all handwritten numbers.";
      }

      const prompt = `You are a high-accuracy OCR specialist trained specifically in recognizing HANDWRITTEN numbers, digits written with pen/pencil on paper, notes, forms, and labels.
${filterHint}
Pay special attention to handwritten strokes:
- Distinguish between '0' (zero) and 'O' / 'o'
- Distinguish between '1' (one) and 'I' / 'l' / '|'
- Distinguish between '5' and 'S' / 's'
- Distinguish between '8' and 'B'
- Distinguish between '7' and '1'
- Distinguish between '2' and 'Z'
- Extract all complete numbers. Especially look for handwritten numbers with 8 digits or 10 digits.

Return ONLY valid JSON with this structure:
{
  "primaryNumber": "the best extracted handwritten number (pure digits or formatted as written)",
  "numbers": [
    {
      "value": "extracted number string as written on paper",
      "digitsOnly": "pure digits only without spaces or symbols",
      "label": "descriptive label (e.g. Handwritten 8-digit ID, Handwritten 10-digit Phone/Code, Account #)",
      "confidence": 0.99,
      "digitCount": 8,
      "context": "surrounding words or context on paper"
    }
  ],
  "summary": "brief summary of detected handwriting"
}
Do not wrap in markdown block quotes, return parseable JSON.`;

      const candidateModels = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];
      let response: any = null;
      let lastErr: any = null;

      for (const modelName of candidateModels) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: 'user',
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: 'image/jpeg',
                      data: cleanBase64,
                    },
                  },
                ],
              },
            ],
          });
          if (response && response.text) {
            console.log(`Successfully generated content using model: ${modelName}`);
            break;
          }
        } catch (mErr: any) {
          lastErr = mErr;
          console.warn(`Model ${modelName} returned error, trying fallback...`, mErr.message);
        }
      }

      if (!response || !response.text) {
        throw lastErr || new Error('All candidate vision models were unavailable.');
      }

      const responseText = response.text || '';
      console.log('AI Vision OCR raw response:', responseText);

      // Clean markdown block quotes if present
      const cleanedText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();

      let parsed: any = null;
      try {
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.warn('JSON parse warning:', e);
      }

      // If parsed successfully and has numbers
      if (parsed && Array.isArray(parsed.numbers) && parsed.numbers.length > 0) {
        return res.json(parsed);
      }

      // Robust regex fallback over responseText: extract all numbers
      const extractedNumbers: any[] = [];
      const tokens = responseText.match(/\b\d[\d\-\.\/]{2,}\b|\b\d{4,}\b/g) || [];
      const seen = new Set<string>();

      for (const tok of tokens) {
        const cleanDigits = tok.replace(/\D/g, '');
        if (cleanDigits.length >= 4 && !seen.has(cleanDigits)) {
          seen.add(cleanDigits);
          extractedNumbers.push({
            value: tok,
            digitsOnly: cleanDigits,
            label: cleanDigits.length === 9 ? 'Handwritten 9-digit #' : cleanDigits.length === 8 ? 'Handwritten 8-digit #' : cleanDigits.length === 10 ? 'Handwritten 10-digit #' : 'Extracted Number',
            confidence: 0.98,
            digitCount: cleanDigits.length,
          });
        }
      }

      const primary = extractedNumbers.length > 0 ? extractedNumbers[0].value : (parsed?.primaryNumber || '');

      return res.json({
        primaryNumber: primary,
        numbers: extractedNumbers,
        summary: parsed?.summary || 'Handwritten paper scan',
        rawText: responseText,
      });
    } catch (err: any) {
      console.error('AI OCR error:', err);
      res.status(500).json({ error: err.message || 'Error processing paper image' });
    }
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', hasGeminiKey: Boolean(process.env.GEMINI_API_KEY) });
  });

  // Mount Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Paper2Clip Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
