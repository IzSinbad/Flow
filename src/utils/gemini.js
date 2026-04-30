const API_URL = 'http://localhost:3001/api'

export async function processDocument(rawText, simplicity) {
  try {
    console.log('Calling backend to process document...')
    const response = await fetch(`${API_URL}/process-document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: rawText, simplicity })
    })

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`)
    }

    const data = await response.json()
    if (!data.text) {
      throw new Error('No response from server')
    }

    console.log('Document processed successfully')
    return data.text
  } catch (error) {
    console.error('Error processing document:', error)
    throw new Error(`Failed to process document: ${error.message}`)
  }
}

export async function generateSummary(rawText, simplicity) {
  try {
    console.log('Calling backend to generate summary...')
    const response = await fetch(`${API_URL}/generate-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: rawText, simplicity })
    })

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`)
    }

    const data = await response.json()
    if (!data.text) {
      throw new Error('No response from server')
    }

    console.log('Summary generated successfully')
    return data.text
  } catch (error) {
    console.error('Error generating summary:', error)
    throw new Error(`Failed to generate summary: ${error.message}`)
  }
}

export async function formatDraft(rawTranscript, mode = 'polish') {
  try {
    console.log(`Calling backend to format draft (mode: ${mode})...`)
    const response = await fetch(`${API_URL}/format-draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: rawTranscript, mode })
    })

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`)
    }

    const data = await response.json()
    if (!data.text) {
      throw new Error('No response from server')
    }

    console.log('Draft formatted successfully')
    return data.text
  } catch (error) {
    console.error('Error formatting draft:', error)
    throw new Error(`Failed to format draft: ${error.message}`)
  }
}

export async function askDocument(pdfText, conversationHistory, question) {
  try {
    console.log('Calling backend to answer question...')
    const response = await fetch(`${API_URL}/ask-document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdfText, conversationHistory, question })
    })

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`)
    }

    const data = await response.json()
    if (!data.text) {
      throw new Error('No response from server')
    }

    console.log('Question answered successfully')
    return data.text
  } catch (error) {
    console.error('Error asking document:', error)
    throw new Error(`Failed to answer question: ${error.message}`)
  }
}
