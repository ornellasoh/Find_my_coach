import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Autorise l'app mobile Capacitor (iOS : capacitor://localhost, Android : https://localhost)
app.use(cors({
  origin: [
    'capacitor://localhost',
    'https://localhost',
    'http://localhost',
    ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : []),
  ],
}));
app.use(express.json({ limit: '10mb' }));

// API endpoint for Coach AI Agent
app.post('/api/coach-ai', async (req, res) => {
  try {
    const { prompt, systemInstruction } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not defined in environment.');
      return res.status(200).json({
        fallback: true,
        message: 'No GEMINI_API_KEY provided'
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || "Tu es l'Agent IA d'élite pour les coachs sportifs professionnels sur FindMyCoach. Tu es un expert en biomécanique, préparation physique, nutrition et programmation d'entraînement.",
        temperature: 0.7,
      }
    });

    return res.status(200).json({
      content: response.text,
      fallback: false
    });
  } catch (error: any) {
    console.error('Gemini API error in /api/coach-ai:', error);
    return res.status(200).json({
      fallback: true,
      error: error?.message || 'Error communicating with Gemini service'
    });
  }
});

// Vite middleware in dev or static files in production
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`FindMyCoach server running at http://0.0.0.0:${port}`);
  });
}

startServer();
