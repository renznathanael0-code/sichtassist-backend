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

        let prompt = "Beschreibe kurz was auf dem Bild zu sehen ist. Verwende absolut keine Markdown-Zeichen wie Sterne oder Rautenzeichen.";
        
        if (mode === 'traffic') {
            prompt = `Analysiere die Ampel auf dem Bild für eine sehbehinderte Person.
Halte dich strikt an diese Regeln:
1. Unterscheide genau zwischen Fußgängerampeln und Fahrbahnampeln für Autos.
2. Achte ganz genau auf Signal-Farben und die genaue Richtung von Pfeilen (z. B. Rechtsabbiegerpfeil, Pfeil nach oben).
3. Verwende ABSOLUT KEINE Markdown-Zeichen (keine Sterne *, keine Rautenzeichen #, keine Unterstriche _).
4. Beantworte in 1-2 kurzen, klaren Sätzen: Welche Farbe brennt und ob der Weg frei ist.`;
        }

        if (mode === 'obstacle') {
            prompt = "Welche Hindernisse, Stufen, Schwellen oder Gefahren befinden sich direkt vor mir? Antworte kurz und präzise in 1-2 Sätzen ohne Markdown-Sonderzeichen (keine Sterne *, keine Raute #).";
        }

        if (mode === 'text') {
            prompt = `Lies den Text auf dem Bild so vor, dass er perfekt für eine Sprachausgabe (Text-to-Speech) geeignet ist. 
Halte dich an folgende Regeln:
1. Ersetze Symbole wie '//' oder '/' durch Wörter wie 'für' oder lass sie komplett weg.
2. Schreibe Preisangaben wie '7 €' als '7 Euro' aus.
3. Verwende absolut keine Markdown-Formatierungen (keine Sterne *, keine Rautenzeichen #, keine Bindestriche -).
4. Lies ausschließlich den Inhalt des Dokuments vor und ignoriere Ränder oder Browser-Elemente.
5. Gib das Ergebnis als gut verständlichen, flüssigen Text aus.`;
        }

        if (mode === 'color') {
            prompt = "Welche Hauptfarben haben die Objekte im Bild? Antworte kurz und flüssig ohne Markdown-Sonderzeichen.";
        }

        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
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
        console.error("Backend Error Details:", error);
        // Gibt den genauen Fehlergrund an die App zurück
        res.status(500).json({ 
            error: 'Fehler bei der Bildanalyse', 
            details: error.message || 'Unbekannter Fehler' 
        });
    }

});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend läuft auf Port ${PORT}`));
