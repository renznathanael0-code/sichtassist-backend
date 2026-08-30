import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialisiere die Gemini API mit dem Key aus den Umgebungsvariablen
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/analyze', async (req, res) => {
    try {
        const { imageBase64, mode } = req.body;

        if (!imageBase64) {
            return res.status(400).json({ error: 'Kein Bild übergeben' });
        }

        // Base64-Header entfernen (falls vorhanden)
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        let prompt = "Beschreibe kurz was auf dem Bild zu sehen ist.";
        if (mode === 'traffic') prompt = "Ist hier eine Ampel? Welche Farbe zeigt sie? Ist der Weg frei? Antworte in 1-2 kurzen Sätzen für eine sehbehinderte Person.";
        if (mode === 'obstacle') prompt = "Welche Hindernisse, Stufen, Schwellen oder Gefahren befinden sich direkt vor mir? Antworte kurz und präzise.";
        if (mode === 'text') prompt = "Lies sämtlichen sichtbaren Text auf dem Bild laut und deutlich vor.";
        if (mode === 'color') prompt = "Welche Hauptfarben haben die Objekte im Bild?";

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: prompt },
                        { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } }
                    ]
                }
            ]
        });

        const textResult = response.text;
        res.json({ result: textResult });

    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ error: 'Fehler bei der Bildanalyse' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend läuft auf Port ${PORT}`));
