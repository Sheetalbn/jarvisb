import express from 'express';
import cors from 'cors';


const app = express();
app.use(cors()); // This lets your frontend access the backend securely from any URL
app.use(express.json());

// Pull your keys safely out of the deployment platform settings
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// Route 1: Talks to NVIDIA Llama 3.3 Nemotron Super securely
app.post('/api/chat', async (req, res) => {
    try {
        const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${NVIDIA_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "nvidia/llama-3.3-nemotron-super-49b-v1.5",
                messages: [
                    { role: "system", content: "You are a fast voice assistant. Answer in 1 very short sentence max. No formatting, lists, markdown, or symbols." },
                    { role: "user", content: req.body.prompt }
                ],
                max_tokens: 60
            })
        });
        const data = await response.json();
        res.json({ text: data.choices[0].message.content });
    } catch (err) {
        res.status(500).json({ error: "NVIDIA NIM execution failed" });
    }
});

// Route 2: Talks to ElevenLabs Flash for lightning-fast speech streaming
app.post('/api/tts', async (req, res) => {
    try {
        const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Standard Rachel Voice
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`, {
            method: "POST",
            headers: {
                "xi-api-key": ELEVENLABS_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                text: req.body.text,
                model_id: "eleven_flash_v2_5", // Lowest latency model available
                voice_settings: { stability: 0.5, similarity_boost: 0.75 }
            })
        });

        // Pipe the live binary audio bytes instantly down to the browser
        response.body.pipe(res);
    } catch (err) {
        res.status(500).json({ error: "ElevenLabs synthesis failed" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running smoothly on port ${PORT}`));