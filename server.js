import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Erlaubt Anfragen von deinem Frontend (z.B. GitHub Pages oder Spck Vorschau)
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.post('/api/analyze', async (req, res) => {
    try {
        const { imageBase64, mode } = req.body;

        if (!imageBase64) {
            return res.status(400).json({ error: 'Kein Bild empfangen.' });
        }

        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        let systemPrompt = "Du bist ein präziser Assistent für blinde Menschen. ";
        
        if (mode === 'traffic') {
            systemPrompt += "Analysiere die Verkehrssituation und Ampeln. Ist eine Fußgängerampel zu sehen? Welche Farbe zeigt sie? Ist sie kaputt oder ausgeschaltet? Antworte kurz, klar und in maximal 2 Sätzen.";
        } else if (mode === 'obstacle') {
            systemPrompt += "Beschreibe die unmittelbaren Hindernisse im Weg (z. B. Stufen, Baustellen, Mülltonnen, Stühle). Gib ungefähre Entfernungen an. Antworte in 1 bis 2 kurzen Sätzen.";
        } else if (mode === 'color') {
            systemPrompt += "Nenne die Hauptfarbe des Gegenstands in der Mitte des Bildes. Sei präzise (z.B. Dunkelblau, Hellrot).";
        } else if (mode === 'text') {
            systemPrompt += "Lies sämtlichen lesbaren Text auf dem Bild vor. Wenn kein Text vorhanden ist, sage 'Kein Text erkannt'.";
        }

        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: systemPrompt },
                        {
                            inlineData: {
                                mimeType: 'image/jpeg',
                                data: base64Data
                            }
                        }
                    ]
                }
            ]
        });

        res.json({ result: response.text });

    } catch (error) {
        console.error('API Fehler:', error);
        res.status(500).json({ error: 'Fehler bei der Bildanalyse.' });
    }
});

app.listen(port, () => {
    console.log(`Server läuft auf Port ${port}`);
});
