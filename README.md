# Flow — Dyslexia-Friendly Reading & Writing

Flow helps people with dyslexia read and write better. It uses AI to make documents easier to read and helps you write by listening to you speak. Dyslexia-friendly fonts, warm colors, and voice commands make everything accessible.

## Features

### 📖 Read Mode
- Upload and reformat PDFs using AI
- Adjust readability (Low/Medium/High)
- Text-to-speech with audio narration
- Smart summaries and Q&A

### 🎙 Write Mode
- Voice dictation that fixes grammar and removes fillers (um, uh, like, you know)
- Smart content generation — say "write", "create", "generate" to make new content
- Text appending — keep recording to add more, doesn't replace
- Edit button for manual changes
- New button to clear and start fresh
- Bigger text box for easier reading

## Setup

### 1. Install
```bash
npm install
```

### 2. Get API Keys
- **Gemini** — [Google AI Studio](https://aistudio.google.com/apikey)
- **ElevenLabs** (optional) — [ElevenLabs](https://www.elevenlabs.io)

### 3. Create `.env` file
```env
VITE_GOOGLE_API_KEY=your_key_here
VITE_ELEVENLABS_KEY=your_key_here
```

### 4. Run
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## How to Use

### Read Mode
1. Upload a PDF
2. Adjust simplicity level
3. Use Summary tab or Ask Flow to ask questions

### Write Mode
1. Click **Record** and speak
2. Say "write", "create", "generate" etc to make new content — otherwise it just fixes grammar
3. Click **Record** again to add more (appends, doesn't replace)
4. Use **New** to clear, **Edit** to change, **Polish** to format, **Copy** to copy

## Tech

- React 18 + Vite
- Google Gemini API (content generation, formatting)
- ElevenLabs (text-to-speech)
- PDF.js (PDF extraction)
- OpenDyslexic font + warm color palette
- Vanilla CSS (no frameworks)

## License

MIT
