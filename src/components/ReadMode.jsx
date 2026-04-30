import { useState } from 'react'
import { extractText } from '../utils/pdfParser'
import { processDocument, generateSummary, askDocument } from '../utils/gemini'
import { speak, stopSpeaking } from '../utils/elevenlabs'
import { recordAndTranscribe } from '../utils/elevenlabs-stt'
import Icon from './Icon'
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
  const [questionInput, setQuestionInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [recordingState, setRecordingState] = useState(null) // { promise, stop }

  const handleFileSelect = async (file) => {
    if (file.type !== 'application/pdf') {
      alert('Please select a PDF file')
      return
    }

    setIsParsing(true)
    try {
      // extract text from pdf
      const text = await extractText(file)
      setPdfText(text)

      // process with vertex ai (uses application default credentials)
      const processed = await processDocument(text, simplicity)
      setProcessedText(processed)

      // generate summary
      const summaryText = await generateSummary(text, simplicity)
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
    console.log('Got a question from the user:', question, 'Type:', typeof question)

    if (!question || !question.trim()) {
      console.warn('The question is empty, skipping it')
      return
    }

    setIsAsking(true)

    try {
      // add user question to history
      const updatedHistory = [...conversationHistory, { role: 'user', text: question }]
      console.log('Updated the conversation history:', updatedHistory)
      setConversationHistory(updatedHistory)

      // get answer from gemini
      console.log('Sending the question to Gemini')
      const answer = await askDocument(pdfText, updatedHistory, question)
      console.log('Got the answer back from Gemini:', answer)

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
      try {
        const processed = await processDocument(pdfText, level)
        setProcessedText(processed)
        const summaryText = await generateSummary(pdfText, level)
        setSummary(summaryText)
      } catch (error) {
        console.error('Error reprocessing with new simplicity:', error)
      } finally {
        setIsParsing(false)
      }
    }
  }

  const handleMicClick = async () => {
    // If already recording, stop and process
    if (recordingState) {
      console.log('Stopping the recording')
      recordingState.stop()
      setRecordingState(null)
      return
    }

    // Otherwise, start recording
    const elevenLabsKey = import.meta.env.VITE_ELEVENLABS_KEY || localStorage.getItem('flow_elevenlabs_key')

    if (!elevenLabsKey) {
      alert('ElevenLabs API key not configured')
      return
    }

    setIsListening(true)
    try {
      const recordingPromise = await recordAndTranscribe(elevenLabsKey)
      setRecordingState(recordingPromise)

      // Wait for recording to finish
      const transcript = await recordingPromise.promise
      setRecordingState(null)
      console.log('Got transcript:', transcript)

      // Ignore empty transcripts
      if (!transcript || transcript.trim().length < 3) {
        console.log('Transcript is too short, skipping it')
        setIsListening(false)
        return
      }

      handleAsk(transcript)
    } catch (error) {
      console.error('Voice input error:', error)
      if (!error.message.includes('corrupted') && !error.message.includes('invalid_audio')) {
        alert(`Voice input error: ${error.message}`)
      }
      setRecordingState(null)
      setIsListening(false)
    } finally {
      setIsListening(false)
    }
  }


  // upload state
  if (!pdfText) {
    return (
      <div className="read-mode-upload">
        <header className="upload-header">
          <button
            className="upload-wordmark"
            onClick={() => goTo('landing')}
            aria-label="Back to home"
          >
            Flow
          </button>
        </header>
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
            <Icon name="ask-flow" alt="Ask" size="18px" style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Ask Flow
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
            </div>
            <div className="document-wrapper">
              <button
                className="audio-button doc-audio-button"
                onClick={() => handlePlayAudio(processedText)}
                aria-label="Play audio"
              >
                <Icon name="speaker" alt="Play audio" size="24px" />
              </button>
              <div className="document-content">
                {processedText || 'Processing...'}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'summary' && (
          <div className="summary-section">
            <h2 className="summary-title">Summary</h2>
            <hr className="summary-divider" />
            <div className="summary-wrapper">
              <button
                className="audio-button summary-audio"
                onClick={() => handlePlayAudio(summary)}
                aria-label="Play summary"
              >
                <Icon name="speaker" alt="Play summary" size="24px" />
              </button>
              <div className="summary-content">
                {summary || 'Generating summary...'}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'ask' && (
          <div className="ask-flow-section">
            <h2 className="ask-title">Ask Flow</h2>
            <p className="ask-subtitle">
              Ask anything about this document. Flow will answer in plain language.
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
              {isAsking && (
                <div className="chat-bubble flow">
                  <em>Flow is thinking...</em>
                </div>
              )}
            </div>

            <div className="ask-input-area">
              <input
                type="text"
                className="ask-text-input"
                placeholder="Type or use voice..."
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && questionInput.trim()) {
                    handleAsk(questionInput)
                    setQuestionInput('')
                  }
                }}
                disabled={isAsking || recordingState}
              />
              <button
                className={`mic-button ${recordingState ? 'recording' : ''}`}
                onClick={handleMicClick}
                disabled={isAsking}
                aria-label={recordingState ? 'Stop recording' : 'Start recording'}
                title={recordingState ? 'Click again to stop' : "Click to start recording"}
              >
                {recordingState ? (
                  <Icon name="recording-indicator" alt="Recording" size="24px" />
                ) : (
                  <Icon name="microphone" alt="Microphone" size="24px" />
                )}
              </button>
              <button
                className="send-button"
                onClick={() => {
                  if (questionInput.trim()) {
                    handleAsk(questionInput)
                    setQuestionInput('')
                  }
                }}
                disabled={isAsking || isListening || !questionInput.trim()}
                aria-label="Send question"
              >
                →
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default ReadMode
