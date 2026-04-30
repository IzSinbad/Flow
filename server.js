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
    const { text, mode = 'polish' } = req.body

    console.log(`[FORMAT-DRAFT] Processing with mode: "${mode}"`)
    console.log(`[FORMAT-DRAFT] Text to process: "${text.substring(0, 100)}..."`)

    if (!text || text.trim().length === 0) {
      console.error('[FORMAT-DRAFT] Error: No text provided')
      return res.status(400).json({ error: 'Text is required' })
    }

    let prompt

    if (mode === 'command') {
      // User started with content generation keyword - do EXACTLY what they say
      console.log('[FORMAT-DRAFT] Using COMMAND mode - generating content')
      prompt = `YOU MUST GENERATE NEW CONTENT BASED ON THIS REQUEST:
"${text}"

CRITICAL FORMATTING - MUST FOLLOW EXACTLY:

Your output format MUST be:
[Sentence 1] [Sentence 2] [Sentence 3] [Sentence 4] [Sentence 5]

[Sentence 6] [Sentence 7] [Sentence 8] [Sentence 9]

Where:
- Each group has 4-5 sentences
- Sentences in a group are on THE SAME LINE separated by single spaces
- A BLANK LINE separates each group of sentences
- Each sentence ends with a period
- NO line breaks within a sentence group
- Keep sentences SHORT (max 12-15 words)
- Use simple words
- Write 3-4 sentence groups total

REAL EXAMPLE OUTPUT:
Global warming is a serious problem. Our Earth is getting much hotter. This change is happening very fast. Scientists are very concerned. Humans are causing most of this.

We burn coal and oil for energy. Cars and factories do this every day. These activities release harmful gases. The gases trap heat in our air. This makes the planet warmer overall.

Now generate the content following this exact format:`
    } else {
      // mode === 'polish' (default) - User is dictating, fix grammar and remove fillers
      console.log('[FORMAT-DRAFT] Using POLISH mode - fixing grammar and removing fillers')
      prompt = `You are a writing assistant for people with dyslexia.

Your task: Polish this voice-to-text transcript AND add paragraph breaks for readability.

STEP 1 - Remove ALL fillers:
- Remove: um, uh, uhm, uhmm, umm, ummm, like (when used as filler), you know, so like, basically, actually, literally, honestly, kind of, sort of, I mean

STEP 2 - Fix GRAMMAR and sentence structure:
- Fix double pronouns: "I , I" → "I" or "I , it" → keep only what makes sense
- Fix capitalization: Every "i" that means the pronoun should be "I" (uppercase)
- Remove orphaned commas: "I , dont" → "I don't"
- Fix missing apostrophes: "dont" → "don't", "wont" → "won't", "cant" → "can't"
- Fix obvious grammar errors that make sentences unclear
- Ensure each sentence is grammatically complete
- Fix run-on sentences by adding periods or commas

STEP 3 - Add paragraph breaks for dyslexia-friendly reading:
CRITICAL FORMAT:
- Group sentences: 4-5 sentences per group
- Each group goes on ONE LINE with spaces between sentences
- Add ONE blank line between groups
- NO line breaks except between groups
- This makes it easier to read

STEP 4 - Keep user's voice:
- Do NOT change meaning or tone
- Keep their personal style and word choices
- Only fix what's grammatically broken

EXAMPLE OUTPUT (with correct paragraph breaks):
I think the plan is good. We should start soon. It will help everyone. This is important for us.

We need to begin tomorrow. Everyone should be ready. Let's make this happen.

(FORMAT: Sentences on same line. ONE blank line between groups. NO line breaks between sentences.)

RULES:
- Do NOT add new content
- Do NOT change what the user is trying to say
- Only remove fillers, fix grammar, and add paragraph breaks
- Return ONLY the polished text with paragraph breaks

Raw transcript:
${text}`
    }

    console.log('[FORMAT-DRAFT] Sending to Gemini API...')
    const result = await callGemini(prompt)
    console.log('[FORMAT-DRAFT] Got result from Gemini, length:', result.length)

    res.json({ text: result })
  } catch (error) {
    console.error('[FORMAT-DRAFT] Error occurred:', error.message)
    console.error('[FORMAT-DRAFT] Full error:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
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
