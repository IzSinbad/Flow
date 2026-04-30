import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const API_KEY = process.env.VITE_GOOGLE_API_KEY
const MODEL_NAME = 'gemini-2.5-flash'
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`

if (!API_KEY) {
  console.error('Google API key not found in .env file')
  process.exit(1)
}

// Helper function for simplicity prompts
function getSimplicityPrompt(simplicity) {
  const levels = {
    low: 'Shorten sentences to max 16 words. Replace hard words with simple ones. Keep all information. Add a new paragraph every 3 sentences.',
    medium: 'Shorten sentences to max 12 words. Use simpler vocabulary. Keep main information clear. Use clear structure.',
    high: 'Use max 8-10 word sentences. Very simple words only. Keep only the most important points. Make it very brief.',
  }
  return levels[simplicity] || levels.medium
}

// Call Gemini API with retry logic
async function callGemini(prompt, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${API_URL}?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Gemini API returned an error (attempt ${attempt}/${retries}):`, response.status, errorText)

        try {
          const error = JSON.parse(errorText)
          const errorMessage = error.error?.message || error.message || 'API error'

          // Check if it's a high demand error - retry with backoff
          if (errorMessage.includes('high demand') && attempt < retries) {
            const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000) // exponential backoff
            console.log(`Waiting ${delayMs}ms before retrying...`)
            await new Promise(resolve => setTimeout(resolve, delayMs))
            continue
          }

          throw new Error(errorMessage)
        } catch (e) {
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }
      }

      const result = await response.json()
      console.log('Got response from Gemini API:', JSON.stringify(result, null, 2))

      if (!result.candidates || !result.candidates[0]) {
        throw new Error('No candidates in Gemini response')
      }

      const text = result.candidates[0].content.parts[0].text
      return text
    } catch (error) {
      if (attempt === retries) {
        throw error
      }
      // For other errors, wait and retry
      const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
      console.log(`Retrying in ${delayMs}ms (attempt ${attempt}/${retries})...`)
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }
}

// Process document
app.post('/api/process-document', async (req, res) => {
  try {
    const { text, simplicity } = req.body
    const simplicityPrompt = getSimplicityPrompt(simplicity)

    const prompt = `You are a reading assistant for people with dyslexia.

Your task: Reformat this document for easier reading. DO NOT change any wording - only add paragraph breaks.

${simplicityPrompt}

CRITICAL: Use dyslexia-friendly paragraph breaks:
- Add a blank line after EVERY 3-5 sentences
- Add a blank line after each complete idea or topic shift
- Break up any long blocks of text into smaller chunks
- Create digestible chunks with plenty of white space between them
- Blank lines between paragraphs are ESSENTIAL for dyslexic readers

IMPORTANT: Keep all the original words and meaning EXACTLY the same. Only add blank lines - do not rewrite anything.

Return ONLY the reformatted text with paragraph breaks. No headers, no explanations, no markdown.

Document to reformat:
${text.slice(0, 100000)}`

    const result = await callGemini(prompt)
    res.json({ text: result })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Generate summary
app.post('/api/generate-summary', async (req, res) => {
  try {
    const { text, simplicity } = req.body
    const simplicityPrompt = getSimplicityPrompt(simplicity)

    let maxSentences = 5
    if (simplicity === 'high') maxSentences = 3
    if (simplicity === 'low') maxSentences = 7

    const prompt = `You are a reading assistant for people with dyslexia.

Your task: Create a very brief summary of this document.

${simplicityPrompt}

Maximum ${maxSentences} sentences. Use simple words. Make it easy to understand.

Return ONLY the summary. No headers, no explanations.

Document to summarize:
${text.slice(0, 100000)}`

    const result = await callGemini(prompt)
    res.json({ text: result })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Format draft
app.post('/api/format-draft', async (req, res) => {
  try {
    const { text } = req.body

    // Check if user is asking for content generation
    const isContentRequest = /^(can you|i need|write|tell me|explain|what is|how do|describe|create|generate|make)/i.test(text.trim())

    let prompt
    if (isContentRequest) {
      // User is asking for content - generate it
      prompt = `IMPORTANT: You are NOT polishing text. You are CREATING NEW CONTENT.

The user has asked you to write or create something. Your job is to GENERATE that content from scratch.

User's request:
"${text}"

Now write what they asked for. Follow these rules:
- Write 3-4 brief paragraphs
- Use short sentences (max 12-15 words each)
- Add a blank line between paragraphs
- Use simple, everyday words
- Make it easy to understand
- Do NOT say "Here is..." or "Below is..." - just provide the content

GENERATE THE CONTENT NOW. Write the essay, explanation, or description they asked for:`
    } else {
      // User is dictating - polish their words
      prompt = `You are a writing assistant for people with dyslexia.

Your task: Polish this voice-to-text transcript.

Steps:
1. Remove fillers: um, uh, uhm, uhmm, like (filler), you know, so like, etc.
2. Fix grammar, punctuation, capitalization
3. Fix any obvious speech-to-text errors
4. Keep the user's voice and tone
5. Add paragraph breaks if needed

Return ONLY the polished text. No explanations.

Raw transcript:
${text}`
    }

    const result = await callGemini(prompt)
    res.json({ text: result })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Ask document
app.post('/api/ask-document', async (req, res) => {
  try {
    const { pdfText, conversationHistory, question } = req.body

    if (!pdfText || !question) {
      console.error('Missing required fields:', { hasPdfText: !!pdfText, hasQuestion: !!question })
      return res.status(400).json({ error: 'pdfText and question are required' })
    }

    let contextMessages = ''
    if (conversationHistory && Array.isArray(conversationHistory)) {
      conversationHistory.forEach((msg) => {
        contextMessages += `\n${msg.role === 'user' ? 'User' : 'Flow'}: ${msg.text}`
      })
    }

    const prompt = `You are Flow, a reading assistant for people with dyslexia.

Your job: Answer questions about a document. Keep answers short and simple.

Rules:
- Max 4 sentences
- Simple words only
- No jargon
- Short sentences (max 12 words each)

Document:
${pdfText.slice(0, 15000)}

Conversation so far:
${contextMessages}

User: ${question}

Answer as Flow:`

    console.log('Sending question to Gemini:', question.slice(0, 50))
    const result = await callGemini(prompt)
    console.log('Got answer back from Gemini:', result.slice(0, 50))
    res.json({ text: result })
  } catch (error) {
    console.error('Error while trying to answer the question:', error.message)
    res.status(500).json({ error: error.message })
  }
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`Backend server is running at http://localhost:${PORT}`)
})
