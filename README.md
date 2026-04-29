# Flow — Dyslexia-Friendly Reading & Writing

Flow is a premium AI-powered app designed for people with dyslexia. It transforms documents and writing into accessible, easy-to-read formats using warm colors, dyslexia-friendly fonts, voice commands, and intelligent text processing.

## Features

### 📖 Read Mode
- **Upload PDFs** with a beautiful drag-and-drop interface
- **Intelligent reformat** using Gemini AI with dyslexia-friendly spacing and sentence structure
- **Adjust simplicity** (Low/Medium/High) to match your reading level
- **Audio narration** via ElevenLabs TTS or browser speech synthesis
- **Smart summaries** of any document
- **Ask Flow** — Voice-powered Q&A about the document content

### 🎙 Write Mode
- **Voice dictation** — speak naturally, Flow transcribes and cleans up your writing
- **Smart commands** — "hey flow write...", "continue...", "save draft", "read it", "discard"
- **Auto-cleanup** using Gemini to remove fillers, fix grammar, and structure your writing
- **Copy to clipboard** with a single click
- **Live feedback** as you speak with real-time transcription

### 🎨 Accessibility First
- Warm, parchment-based color palette (no pure white or black)
- OpenDyslexic font for all content (Nunito for UI chrome)
- 2.1x line-height and 0.06em letter-spacing for easy reading
- Full keyboard navigation with focus indicators
- Web Speech API for voice commands (no mic hardware needed)

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Get API Keys
You'll need:
- **Gemini API Key** — Get one at [Google AI Studio](https://aistudio.google.com/apikey)
- **ElevenLabs API Key** (optional) — Get one at [ElevenLabs](https://www.elevenlabs.io) for premium text-to-speech

### 3. Configure Keys
Create a `.env` file in the project root:
```env
VITE_GEMINI_KEY=your_gemini_api_key_here
VITE_ELEVENLABS_KEY=your_elevenlabs_api_key_here
```

Or, the app will prompt you to enter keys the first time you use a feature that needs them (stored in localStorage).

### 4. Run the Dev Server
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Usage

### Landing Page
- Click **Read Mode** or **Write Mode** cards
- Or say **"Hey Flow, open read mode"** or **"Hey Flow, open write mode"**

### Read Mode
1. Upload a PDF (drag & drop or click)
2. Flow extracts text and reformats it using Gemini
3. Adjust **Simplicity** level (Low = more detail, High = brief)
4. Click **🔊** to hear the document read aloud
5. Use **Summary** tab for a brief overview
6. Use **Ask Flow** tab to ask questions via voice

### Write Mode
1. Say **"Hey Flow, write [anything]"** to start dictation
2. Speak naturally — Flow transcribes in real-time
3. Say **"save draft"** to clean up and format your writing
4. Say **"read it"** to hear your draft read aloud
5. Click **Copy** to copy the text to your clipboard
6. Say **"discard"** to start over

## Voice Commands

### Landing Page
- "Hey Flow, open read mode" → Start reading
- "Hey Flow, open write mode" → Start writing

### Write Mode
- "Hey Flow, write..." → Begin dictation
- "Hey Flow, continue..." → Add more text
- "Hey Flow, save draft" → Clean up and format
- "Hey Flow, read it" → Hear the draft aloud
- "Hey Flow, discard" → Clear everything

### Ask Flow (Read Mode)
- Click the **🎤** button and speak your question
- Flow answers using only the document content

## Design System

All colors avoid pure black, pure white, and grey:

| Token | Color | Use |
|-------|-------|-----|
| `--bg-page` | #FDF6EC | Main background |
| `--text-heading` | #3B1F06 | Headings |
| `--text-body` | #5C3412 | Body text |
| `--accent` | #B8691A | Buttons, focus |
| `--dyslexia-bg` | #FEF9EE | Content boxes |
| `--dyslexia-text` | #3B1F06 | Content text |

**Fonts:**
- **OpenDyslexic** — All content (documents, chat, writing)
- **Nunito** — UI chrome (buttons, labels, navigation)

## Architecture

```
src/
├── components/
│   ├── Landing.jsx / Landing.css
│   ├── ReadMode.jsx / ReadMode.css
│   └── WriteMode.jsx / WriteMode.css
├── utils/
│   ├── gemini.js          // Document processing, summaries, Q&A
│   ├── elevenlabs.js      // Text-to-speech
│   └── pdfParser.js       // PDF text extraction
├── styles/
│   ├── tokens.css         // Design system colors
│   └── globals.css        // Base styles, font loading
├── App.jsx                // Main navigation state
└── main.jsx               // React root
```

## API Integrations

### Google Gemini
- **Document Processing** — Reformats text for dyslexia with adjustable simplicity
- **Summarization** — Creates brief, simple summaries
- **Q&A** — Answers questions about document content

### ElevenLabs
- **Premium Text-to-Speech** — Natural, expressive narration
- Falls back to browser SpeechSynthesis if unavailable

### Web APIs
- **SpeechRecognition** — Voice dictation and commands
- **PDF.js** — PDF text extraction
- **localStorage** — Persists API keys between sessions

## Performance

- **CSS**: Vanilla CSS with CSS variables (no build-time processing)
- **Bundle**: ~70KB gzipped JavaScript, 2.4KB gzipped CSS
- **Fonts**: OpenDyslexic and Nunito loaded via Google Fonts CDN

## Browser Support

Requires modern browser with:
- **SpeechRecognition API** (Chrome, Edge, Safari 14+)
- **Web Speech API** (text-to-speech)
- **PDF.js** support (via CDN)

## Development

- **React 18** with hooks
- **Vite** for fast development
- **No external UI frameworks** — custom styles only
- **Vanilla CSS** with design tokens

### Build for Production
```bash
npm run build
```

Output goes to `dist/` directory.

## License

MIT

---

Built with care for people with dyslexia. 🌤️
