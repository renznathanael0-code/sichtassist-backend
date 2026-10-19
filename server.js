import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialisierung
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Globaler Hinweis für schlechte Belichtung
const DARKNESS_RULE = `
WICHTIGE SONDERREGEL FÜR ALLE MODI:
Falls das Bild zu dunkel, extrem schattig oder aufgrund von schlechten Lichtverhältnissen völlig unleserlich/unerkenntlich ist, ignoriere alle anderen Anweisungen und antworte AUSSCHLIESSLICH mit dem exakten Wort:
[RETRY_WITH_TORCH]
`;

app.post('/api/analyze', async (req, res) => {
    try {
        const { imageBase64, mode, target } = req.body;

        if (!imageBase64) {
            return res.status(400).json({ error: 'Kein Bild übergeben' });
        }

        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        let prompt = `Beschreibe kurz was auf dem Bild zu sehen ist. Verwende absolut keine Markdown-Zeichen wie Sterne oder Rautenzeichen. ${DARKNESS_RULE}`;
        
        if (mode === 'text') {
            prompt = `Lies den Text auf dem Bild so vor, dass er perfekt für eine Sprachausgabe (Text-to-Speech) geeignet ist. 
Halte dich an folgende Regeln:
1. Ersetze Symbole wie '//' oder '/' durch Wörter wie 'für' oder lass sie komplett weg.
2. Schreibe Preisangaben wie '7 €' als '7 Euro' aus.
3. Verwende absolut keine Markdown-Formatierungen (keine Sterne *, keine Rautenzeichen #, keine Bindestriche -).
4. Lies ausschließlich den Inhalt des Dokuments vor und ignoriere Ränder oder Browser-Elemente.
5. Gib das Ergebnis als gut verständlichen, flüssigen Text aus auf Deutsch.
${DARKNESS_RULE}`;
        }

        else if (mode === 'color') {
            prompt = `Welche Hauptfarben haben die zentralen Objekte im Bild? Antworte kurz und präzise in 1 bis 2 Sätzen auf Deutsch ohne Markdown-Sonderzeichen (keine Sterne *, keine Rautenzeichen #). ${DARKNESS_RULE}`;
        }

        else if (mode === 'object') {
            prompt = `Welche Gegenstände oder Objekte sind im Bild zu sehen? Beschreibe die wichtigsten Objekte kurz und präzise in 1 bis 2 Sätzen auf Deutsch ohne Markdown-Sonderzeichen (keine Sterne *, keine Rautenzeichen #). ${DARKNESS_RULE}`;
        }

        else if (mode === 'currency') {
            prompt = `Identifiziere das im Bild gezeigte Bargeld (Euro-Scheine oder Münzen). Nenne den Gesamtwert oder die Werte der einzelnen Scheine und Münzen präzise auf Deutsch. Verwende keine Markdown-Sonderzeichen. Falls kein Geld zu sehen ist, antworte: 'Kein Bargeld erkannt.' ${DARKNESS_RULE}`;
        }

        else if (mode === 'count') {
            const countTarget = target || "Objekte";
            prompt = `Zähle wie oft das gesuchte Objekt "${countTarget}" auf dem Bild zu sehen ist.
Halte dich an folgende Regeln:
1. Nenne die genaue Anzahl in einem kurzen Satz auf Deutsch (z. B. "Auf dem Bild sind 3 Stifte zu sehen.").
2. Falls keines vorhanden ist, sage klar, dass keins gefunden wurde.
3. Verwende absolut keine Markdown-Formatierungen (keine Sterne *, keine Rautenzeichen #).
${DARKNESS_RULE}`;
        }

        else if (mode === 'search') {
            const searchTarget = target || "Gegenstand";
            prompt = `Scanne das Bild nach dem Objekt: "${searchTarget}".
Halte dich strikt an diese Regeln:
1. Falls das Objekt "${searchTarget}" (oder ein sehr ähnlicher Gegenstand) im Bild zu sehen ist: Antworte direkt und kurz, wo es sich befindet (z. B. "Ja, das iPad liegt mittig auf dem Tisch.").
2. Falls das Objekt NICHT zu sehen ist: Antworte exakt mit dem Satz: "${searchTarget} ist im Bild nicht zu erkennen."
3. Verwende absolut keine Markdown-Formatierungen (keine Sterne *, keine Rautenzeichen #).
4. Antworte in nur einem einzigen Satz auf Deutsch.
${DARKNESS_RULE}`;
        }

        // Unterstützung für kombinierte Modi (z.B. text+color)
        else if (mode && mode.includes('+')) {
            const subModes = mode.split('+');
            prompt = `Führe die folgenden Analysen gleichzeitig für das Bild aus und fasse das Ergebnis kurz und präzise auf Deutsch zusammen: ${subModes.join(', ')}. 
Verwende absolut keine Markdown-Formatierungen (keine Sterne *, keine Rautenzeichen #). ${DARKNESS_RULE}`;
        }

        // Offizieller Aufruf für Bildanalyse
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
        console.error("Backend Error Details:", error);
        res.status(500).json({ 
            error: 'Fehler bei der Bildanalyse', 
            details: error.message || 'Unbekannter Fehler' 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend läuft auf Port ${PORT}`));
