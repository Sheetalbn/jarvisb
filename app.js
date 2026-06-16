// Once your server is deployed, change this to your actual deployed URL (e.g., https://my-backend.render.com)
const BACKEND_URL = "http://localhost:3000"; 

const statusText = document.getElementById('status');
const indicator = document.getElementById('indicator');
const log = document.getElementById('log');

// Setup persistent browser microphone listener
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.continuous = true;       // Don't turn off when a sentence ends
recognition.interimResults = false;  // Only respond to finished thoughts
recognition.lang = 'en-US';

// Automatically open the microphone immediately upon landing
window.addEventListener('DOMContentLoaded', () => {
    try { recognition.start(); } catch(e) {}
});

recognition.onstart = () => {
    setVisualState('listening', 'Status: Listening constantly... Just talk!');
};

// Automatically processes the audio context the millisecond you stop talking
recognition.onresult = async (event) => {
    const speechToText = event.results[event.results.length - 1][0].transcript.trim();
    if (!speechToText) return;

    // Temporarily pause the mic so the AI doesn't listen to its own voice playback
    recognition.stop(); 
    
    log.innerHTML += `<br><span style="color:#76b900"><b>You:</b></span> ${speechToText}`;
    setVisualState('thinking', 'Status: NVIDIA Processing...');

    // 1. Ask your secure backend for the NVIDIA LLM text response
    const aiResponse = await fetch(`${BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: speechToText })
    });
    const aiData = await aiResponse.json();
    log.innerHTML += `<br><b>AI:</b> ${aiData.text}`;
    
    setVisualState('speaking', 'Status: ElevenLabs Speaking...');

    // 2. Fetch the streaming audio data array straight from ElevenLabs via your backend
    const ttsResponse = await fetch(`${BACKEND_URL}/api/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiData.text })
    });

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await ttsResponse.arrayBuffer();
    
    audioContext.decodeAudioData(arrayBuffer, (buffer) => {
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        
        source.onended = () => {
            // Processing loop finished! Re-engage continuous listening cleanly
            setVisualState('listening', 'Status: Listening constantly... Just talk!');
            recognition.start();
        };
        source.start(0);
    });
};

// Safeguard: If speech tracking finishes on an idle timeout, instantly spin it back up
recognition.onend = () => {
    if (indicator.classList.contains('listening')) {
        recognition.start();
    }
};

function setVisualState(state, text) {
    statusText.innerText = text;
    indicator.className = 'pulse-indicator ' + state;
    indicator.innerText = state === 'listening' ? 'LIVE' : state.toUpperCase();
}