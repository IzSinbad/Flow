import { useState } from 'react'
import { extractText } from '../utils/pdfParser'
import { processDocument, generateSummary, askDocument } from '../utils/gemini'
import { speak, stopSpeaking } from '../utils/elevenlabs'
import './ReadMode.css'

function ReadMode({ goTo }) {
  const [pdfText, setPdfText] = useState(null)
  const [processedText, setProcessedText] = useState(null)
  const [summary, setSummary] = useState(null)
  const [isParsing, setIsParsing] = useState(false)
  const [activeSection, setActiveSection] = useState('document')
  const [simplicity, setSimplicity] = useState('medium')
  const [conversationHistory, setConversationHistory] = useState([])
  const [isAsking, setIsAsking] = useState(false)
  const [currentAudio, setCurrentAudio] = useState(null)

  const handleFileSelect = async (file) => {
    if (!file.type === 'application/pdf') {
      alert('Please select a PDF file')
      return
    }

    setIsParsing(true)
    try {
      // extract text from pdf
      const text = await extractText(file)
      setPdfText(text)

      // process with gemini
      const geminiKey = import.meta.env.VITE_GEMINI_KEY || localStorage.getItem('flow_gemini_key')
      if (!geminiKey) {
        showKeyModal('gemini')
        setIsParsing(false)
        return
      }

      const processed = await processDocument(text, simplicity, geminiKey)
      setProcessedText(processed)

      // generate summary
      const summaryText = await generateSummary(text, simplicity, geminiKey)
      setSummary(summaryText)

      setActiveSection('document')
    } catch (error) {
      console.error('Error processing PDF:', error)
      alert('Error processing PDF. Make sure your API key is valid.')
    } finally {
      setIsParsing(false)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.currentTarget.classList.add('drag-over')
  }

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('drag-over')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.currentTarget.classList.remove('drag-over')
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleFileInput = (e) => {
    const file = e.target.files[0]
    if (file) handleFileSelect(file)
  }

  const handleAsk = async (question) => {
    if (!question.trim()) return

    setIsAsking(true)
    const geminiKey = import.meta.env.VITE_GEMINI_KEY || localStorage.getItem('flow_gemini_key')

    try {
      // add user question to history
      const updatedHistory = [...conversationHistory, { role: 'user', text: question }]
      setConversationHistory(updatedHistory)

      // get answer from gemini
      const answer = await askDocument(pdfText, updatedHistory, question, geminiKey)

      // add flow response
      const finalHistory = [...updatedHistory, { role: 'flow', text: answer }]
      setConversationHistory(finalHistory)
    } catch (error) {
      console.error('Error asking question:', error)
      alert('Error getting answer. Check your API key.')
    } finally {
      setIsAsking(false)
    }
  }

  const handlePlayAudio = (text) => {
    stopSpeaking()
    const elevenLabsKey = import.meta.env.VITE_ELEVENLABS_KEY || localStorage.getItem('flow_elevenlabs_key')
    const audio = speak(text, elevenLabsKey)
    setCurrentAudio(audio)
  }

  const handleSimplicityChange = async (level) => {
    setSimplicity(level)
    if (pdfText) {
      setIsParsing(true)
      const geminiKey = import.meta.env.VITE_GEMINI_KEY || localStorage.getItem('flow_gemini_key')
      try {
        const processed = await processDocument(pdfText, level, geminiKey)
        setProcessedText(processed)
        const summaryText = await generateSummary(pdfText, level, geminiKey)
        setSummary(summaryText)
      } catch (error) {
        console.error('Error reprocessing with new simplicity:', error)
      } finally {
        setIsParsing(false)
      }
    }
  }

  const showKeyModal = (type) => {
    const key = prompt(`Enter your ${type === 'gemini' ? 'Gemini' : 'ElevenLabs'} API key:`)
    if (key) {
      localStorage.setItem(
        type === 'gemini' ? 'flow_gemini_key' : 'flow_elevenlabs_key',
        key
      )
    }
  }

  // upload state
  if (!pdfText) {
    return (
      <div className="read-mode-upload">
        {isParsing ? (
          <div className="spinner-container">
            <div className="spinner"></div>
          </div>
        ) : (
          <div
            className="upload-zone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <svg className="upload-icon" viewBox="0 0 52 52" width="52" height="52">
              <rect x="8" y="8" width="36" height="36" rx="4" fill="none" stroke="currentColor" strokeWidth="2"/>
              <path d="M28 20v12M22 26h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <h2 className="upload-heading">Drop your PDF here</h2>
            <p className="upload-subtext">or click to choose a file</p>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileInput}
              className="file-input"
            />
          </div>
        )}
      </div>
    )
  }

  // reading view
  return (
    <div className="read-mode-layout">
      <aside className="sidebar">
        <button
          className="wordmark-nav"
          onClick={() => goTo('landing')}
          aria-label="Back to home"
        >
          Flow
        </button>

        <nav className="nav-items">
          <button
            className={`nav-item ${activeSection === 'document' ? 'active' : ''}`}
            onClick={() => setActiveSection('document')}
          >
            Document
          </button>
          <button
            className={`nav-item ${activeSection === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveSection('summary')}
          >
            Summary
          </button>
          <button
            className={`nav-item ${activeSection === 'ask' ? 'active' : ''}`}
            onClick={() => setActiveSection('ask')}
          >
            🎙 Ask Flow
          </button>
        </nav>
      </aside>

      <main className="main-content">
        {activeSection === 'document' && (
          <div className="document-section">
            <div className="doc-top-bar">
              <div className="simplicity-group">
                <label className="simplicity-label">SIMPLICITY</label>
                <div className="simplicity-pills">
                  {['low', 'medium', 'high'].map((level) => (
                    <button
                      key={level}
                      className={`simplicity-pill ${simplicity === level ? 'active' : ''}`}
                      onClick={() => handleSimplicityChange(level)}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <button
                className="audio-button"
                onClick={() => handlePlayAudio(processedText)}
                aria-label="Play audio"
              >
                🔊
              </button>
            </div>
            <div className="document-content">
              {processedText || 'Processing...'}
            </div>
          </div>
        )}

        {activeSection === 'summary' && (
          <div className="summary-section">
            <h2 className="summary-title">Summary</h2>
            <hr className="summary-divider" />
            <button
              className="audio-button summary-audio"
              onClick={() => handlePlayAudio(summary)}
              aria-label="Play summary"
            >
              🔊
            </button>
            <div className="summary-content">
              {summary || 'Generating summary...'}
            </div>
          </div>
        )}

        {activeSection === 'ask' && (
          <div className="ask-flow-section">
            <h2 className="ask-title">Ask Flow</h2>
            <p className="ask-subtitle">
              Ask anything about this document using your voice. Flow will answer in plain language.
            </p>

            <div className="conversation-area">
              {conversationHistory.map((msg, idx) => (
                <div key={idx} className={`chat-bubble ${msg.role}`}>
                  {msg.text}
                  {msg.role === 'flow' && (
                    <button
                      className="listen-button"
                      onClick={() => handlePlayAudio(msg.text)}
                    >
                      🔊 Listen
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="ask-input-area">
              <button
                className="mic-button"
                onClick={() => startVoiceInput(handleAsk)}
                aria-label="Ask a question"
              >
                🎤
              </button>
              <p className="ask-prompt">Ask a question</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function startVoiceInput(onQuestion) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) {
    alert('Speech recognition not supported')
    return
  }

  const recognition = new SpeechRecognition()
  recognition.lang = 'en-US'

  recognition.onresult = (event) => {
    let transcript = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i].transcript
    }
    if (event.results[event.results.length - 1].isFinal) {
      onQuestion(transcript)
    }
  }

  recognition.start()
}

export default ReadMode
