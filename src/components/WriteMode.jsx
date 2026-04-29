import { useState, useEffect } from 'react'
import { formatDraft } from '../utils/gemini'
import { speak, stopSpeaking } from '../utils/elevenlabs'
import './WriteMode.css'

function WriteMode({ goTo }) {
  const [finalText, setFinalText] = useState('')
  const [inProgressText, setInProgressText] = useState('')
  const [status, setStatus] = useState('listening') // 'listening' | 'recording' | 'thinking'
  const [copiedFeedback, setCopiedFeedback] = useState(false)
  const [recognition, setRecognition] = useState(null)

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    const rec = new SpeechRecognition()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'

    let interim = ''

    rec.onstart = () => {
      setStatus('recording')
    }

    rec.onresult = (event) => {
      interim = ''
      let isFinal = false

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i].transcript.toLowerCase()

        if (event.results[i].isFinal) {
          isFinal = true
          // process command if wake phrase detected
          if (transcript.includes('hey flow') || transcript.includes('hey flo')) {
            const afterWake = transcript.split(/hey flo(w)?/i)[1] || ''
            processCommand(afterWake.trim())
          } else {
            // just add to final text
            setFinalText((prev) => prev + ' ' + transcript)
          }
        } else {
          interim += transcript
        }
      }

      if (!isFinal) {
        setInProgressText(interim)
      } else {
        setInProgressText('')
      }
    }

    rec.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
    }

    rec.onend = () => {
      // restart listening
      setStatus('listening')
      rec.start()
    }

    setRecognition(rec)
    rec.start()

    return () => rec.stop()
  }, [])

  const processCommand = (commandText) => {
    if (commandText.includes('write') || commandText.includes('start')) {
      // extract text after "write"
      const match = commandText.match(/write\s+(.*)/i)
      if (match && match[1]) {
        setFinalText((prev) => prev + ' ' + match[1])
      }
    } else if (commandText.includes('continue')) {
      const match = commandText.match(/continue\s+(.*)/i)
      if (match && match[1]) {
        setFinalText((prev) => prev + ' ' + match[1])
      }
    } else if (commandText.includes('save')) {
      handleSaveDraft()
    } else if (commandText.includes('read')) {
      handleReadDraft()
    } else if (commandText.includes('discard') || commandText.includes('start over')) {
      setFinalText('')
      setInProgressText('')
    }
  }

  const handleSaveDraft = async () => {
    setStatus('thinking')
    const geminiKey = import.meta.env.VITE_GEMINI_KEY || localStorage.getItem('flow_gemini_key')

    if (!geminiKey) {
      alert('Gemini API key required. Set it in settings.')
      setStatus('listening')
      return
    }

    try {
      const cleaned = await formatDraft(finalText + inProgressText, geminiKey)
      setFinalText(cleaned)
      setInProgressText('')
    } catch (error) {
      console.error('Error formatting draft:', error)
      alert('Error cleaning up draft.')
    } finally {
      setStatus('listening')
    }
  }

  const handleReadDraft = () => {
    stopSpeaking()
    const elevenLabsKey = import.meta.env.VITE_ELEVENLABS_KEY || localStorage.getItem('flow_elevenlabs_key')
    speak(finalText + inProgressText, elevenLabsKey)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(finalText + inProgressText)
    setCopiedFeedback(true)
    setTimeout(() => setCopiedFeedback(false), 1500)
  }

  const simulateVoice = () => {
    // inject a demo voice command for testing
    const demo = 'hey flow write an email to my professor about the assignment'
    if (recognition) {
      // we can't directly feed text to recognition, but we can manually trigger the flow
      const afterWake = demo.split(/hey flo(w)?/i)[1] || ''
      processCommand(afterWake.trim())
    }
  }

  const statusText =
    status === 'listening' ? '• LISTENING FOR HEY FLOW...' :
    status === 'recording' ? '• RECORDING' :
    '• THINKING...'

  const statusBackground =
    status === 'listening' ? 'var(--bg-sunken)' :
    status === 'recording' ? '#FEE2E2' :
    '#F3E8FF'

  const statusColor =
    status === 'listening' ? 'var(--text-muted)' :
    status === 'recording' ? '#B91C1C' :
    '#7C3AED'

  return (
    <div className="write-mode-container">
      <header className="write-top-bar">
        <button
          className="write-wordmark"
          onClick={() => goTo('landing')}
          aria-label="Back to home"
        >
          Flow
        </button>
        <div className="status-pill" style={{ background: statusBackground, color: statusColor }}>
          <span className={`status-dot ${status === 'recording' ? 'blink' : ''}`}>•</span>
          {statusText}
        </div>
      </header>

      <main className="write-area">
        {!finalText && !inProgressText && (
          <p className="empty-hint">say "Hey Flow, write..." to start</p>
        )}
        <div className="writing-content">
          <span className="final-text">{finalText}</span>
          {inProgressText && (
            <span className="in-progress-text">{inProgressText}</span>
          )}
        </div>
      </main>

      <footer className="write-bottom-bar">
        <button className="dev-button" onClick={simulateVoice}>
          Simulate voice ↻
        </button>

        <div className="bottom-buttons">
          <button
            className="copy-button"
            onClick={handleCopy}
            title={copiedFeedback ? 'Copied!' : 'Copy to clipboard'}
          >
            {copiedFeedback ? '✓ Copied!' : '📋 Copy'}
          </button>
          <button className="save-button" onClick={handleSaveDraft}>
            Save Draft
          </button>
        </div>
      </footer>
    </div>
  )
}

export default WriteMode
