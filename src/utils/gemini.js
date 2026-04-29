import { GoogleGenerativeAI } from '@google/generative-ai'

function getSimplicityPrompt(simplicity) {
  const levels = {
    low: 'Shorten sentences to max 16 words. Replace hard words with simple ones. Keep all information. Add a new paragraph every 3 sentences.',
    medium: 'Shorten sentences to max 12 words. Use simpler vocabulary. Keep main information clear. Use clear structure.',
    high: 'Use max 8-10 word sentences. Very simple words only. Keep only the most important points. Make it very brief.',
  }
  return levels[simplicity] || levels.medium
}

export async function processDocument(rawText, simplicity, apiKey) {
  const client = new GoogleGenerativeAI(apiKey)
  const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const simplicityPrompt = getSimplicityPrompt(simplicity)

  const prompt = `You are a reading assistant for people with dyslexia.

Your task: Reformat this document for easier reading.

${simplicityPrompt}

Use dyslexia-friendly formatting:
- Use clear, consistent spacing
- Simple sentence structures
- Short paragraphs

Return ONLY the reformatted text. No headers, no explanations, no markdown.

Document to reformat:
${rawText.slice(0, 15000)}`

  const result = await model.generateContent(prompt)
  return result.response.text()
}

export async function generateSummary(rawText, simplicity, apiKey) {
  const client = new GoogleGenerativeAI(apiKey)
  const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' })

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
${rawText.slice(0, 15000)}`

  const result = await model.generateContent(prompt)
  return result.response.text()
}

export async function formatDraft(rawTranscript, apiKey) {
  const client = new GoogleGenerativeAI(apiKey)
  const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const prompt = `You are a writing assistant for people with dyslexia.

Your task: Clean up this messy voice transcript.

Remove fillers: um, uh, uhm, uhmm, like (filler), you know, so like, etc.
Fix grammar, punctuation, and capitalization.
Detect the document type (email, letter, essay, message, note, report) and format appropriately.

For emails: add "Dear [recipient]" if not present. Add closing signature if needed.
For formal writing: use proper structure.

Keep the user's original voice and tone. Don't over-edit.

Return ONLY the cleaned text. No explanations or metadata.

Raw transcript:
${rawTranscript}`

  const result = await model.generateContent(prompt)
  return result.response.text()
}

export async function askDocument(pdfText, conversationHistory, question, apiKey) {
  const client = new GoogleGenerativeAI(apiKey)
  const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' })

  // build conversation context
  let contextMessages = ''
  conversationHistory.forEach((msg) => {
    contextMessages += `\n${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}`
  })

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

  const result = await model.generateContent(prompt)
  return result.response.text()
}
