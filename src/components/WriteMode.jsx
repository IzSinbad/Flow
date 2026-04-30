import { useState, useEffect } from 'react'
import { formatDraft } from '../utils/gemini'
import { speak, stopSpeaking } from '../utils/elevenlabs'
import { recordAndTranscribe } from '../utils/elevenlabs-stt'
import Icon from './Icon'
import './WriteMode.css'

function WriteMode({ goTo }) {
  const [finalText, setFinalText] = useState('')
  const [inProgressText, setInProgressText] = useState('')
  const [status, setStatus] = useState('listening') // 'listening' | 'recording' | 'thinking'
  const [copiedFeedback, setCopiedFeedback] = useState(false)
  const [recognition, setRecognition] = useState(null)
  const [isListening, setIsListening] = useState(false)
  const [recordingState, setRecordingState] = useState(null) // { promise, stop }
  const [isEditing, setIsEditing] = useState(false)
  const [editingText, setEditingText] = useState('')

  // Using ElevenLabs STT via mic button - old browser speech recognition removed

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

    try {
      const cleaned = await formatDraft(finalText + inProgressText)
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

  const handleEditClick = () => {
    setEditingText(finalText + inProgressText)
    setIsEditing(true)
  }

  const handleSaveEdit = () => {
    setFinalText(editingText)
    setInProgressText('')
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditingText('')
    setIsEditing(false)
  }

  const handleNewDraft = () => {
    setFinalText('')
    setInProgressText('')
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
    setStatus('recording')
    try {
      const recordingPromise = await recordAndTranscribe(elevenLabsKey)
      setRecordingState(recordingPromise)

      // Wait for recording to finish
      const transcript = await recordingPromise.promise
      setRecordingState(null)
      console.log('Got transcript:', transcript)

      // Ignore empty transcripts or very short audio
      if (!transcript || transcript.trim().length < 3) {
        console.log('Transcript is too short, ignoring it')
        setIsListening(false)
        setStatus('listening')
        return
      }

      // Check for wake phrase
      if (transcript.toLowerCase().includes('hey flow') || transcript.toLowerCase().includes('hey flo')) {
        const afterWake = transcript.split(/hey flo(w)?/i)[1] || ''
        processCommand(afterWake.trim())
        setIsListening(false)
        setStatus('listening')
      } else {
        // Check if transcript triggers content generation mode
        // Keywords: "Specifically", "can you", "write", "create", "generate", "tell me", "explain", "make"
        const lowerTranscript = transcript.trim().toLowerCase()

        let isSpecificCommand = false
        let textToProcess = transcript

        // Check for each keyword explicitly and robustly
        if (lowerTranscript.startsWith('specifically ') || lowerTranscript === 'specifically') {
          isSpecificCommand = true
          textToProcess = transcript.replace(/^specifically[\s,.:;!?]*/i, '').trim()
        } else if (lowerTranscript.startsWith('can you ')) {
          isSpecificCommand = true
          textToProcess = transcript.replace(/^can you[\s,.:;!?]*/i, '').trim()
        } else if (lowerTranscript.startsWith('write ') || lowerTranscript === 'write') {
          isSpecificCommand = true
          textToProcess = transcript.replace(/^write[\s,.:;!?]*/i, '').trim()
        } else if (lowerTranscript.startsWith('create ') || lowerTranscript === 'create') {
          isSpecificCommand = true
          textToProcess = transcript.replace(/^create[\s,.:;!?]*/i, '').trim()
        } else if (lowerTranscript.startsWith('generate ') || lowerTranscript === 'generate') {
          isSpecificCommand = true
          textToProcess = transcript.replace(/^generate[\s,.:;!?]*/i, '').trim()
        } else if (lowerTranscript.startsWith('tell me ')) {
          isSpecificCommand = true
          textToProcess = transcript.replace(/^tell me[\s,.:;!?]*/i, '').trim()
        } else if (lowerTranscript.startsWith('explain ') || lowerTranscript === 'explain') {
          isSpecificCommand = true
          textToProcess = transcript.replace(/^explain[\s,.:;!?]*/i, '').trim()
        } else if (lowerTranscript.startsWith('make ') || lowerTranscript === 'make') {
          isSpecificCommand = true
          textToProcess = transcript.replace(/^make[\s,.:;!?]*/i, '').trim()
        }

        const mode = isSpecificCommand ? 'command' : 'polish'
        console.log('[KEYWORD DETECTION] Transcript:', transcript)
        console.log('[KEYWORD DETECTION] Is command mode:', isSpecificCommand, 'Mode:', mode)
        console.log('[KEYWORD DETECTION] Text to process:', textToProcess)

        setStatus('thinking')
        try {
          const processed = await formatDraft(textToProcess, mode)
          console.log('Got processed text back from Gemini:', processed)
          // APPEND to existing text instead of replacing
          setFinalText((prev) => prev ? prev + ' ' + processed : processed)
        } catch (error) {
          console.error('Error processing text:', error)
          // If Gemini fails, just append raw text
          setFinalText((prev) => prev ? prev + ' ' + textToProcess : textToProcess)
        } finally {
          setIsListening(false)
          setStatus('listening')
        }
      }
    } catch (error) {
      console.error('Voice input error:', error)
      // Don't alert on corrupted audio errors, just retry
      if (!error.message.includes('corrupted') && !error.message.includes('invalid_audio')) {
        alert(`Voice input error: ${error.message}`)
      }
      setRecordingState(null)
      setIsListening(false)
      setStatus('listening')
    }
  }

  const statusText =
    status === 'recording' ? '• RECORDING' :
    status === 'thinking' ? '• THINKING...' :
    ''

  const statusBackground =
    status === 'recording' ? '#FEE2E2' :
    '#F3E8FF'

  const statusColor =
    status === 'recording' ? '#B91C1C' :
    '#7C3AED'

  const showStatus = status === 'recording' || status === 'thinking'

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
        {showStatus && (
          <div className="status-pill" style={{ background: statusBackground, color: statusColor }}>
            <span className={`status-dot ${status === 'recording' ? 'blink' : ''}`}>•</span>
            {statusText}
          </div>
        )}
      </header>

      <main className="write-area">
        {!finalText && !inProgressText && !isEditing && (
          <p className="empty-hint">click the microphone to start writing</p>
        )}
        {isEditing ? (
          <div className="writing-wrapper editing">
            <textarea
              className="edit-textarea"
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              placeholder="Edit your text here..."
            />
          </div>
        ) : (
          <div className="writing-wrapper">
            <div className="writing-content">
              <span className="final-text">{finalText}</span>
              {inProgressText && (
                <span className="in-progress-text">{inProgressText}</span>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="write-bottom-bar">
        {isEditing ? (
          <>
            <div className="bottom-buttons">
              <button className="cancel-button" onClick={handleCancelEdit}>
                Cancel
              </button>
              <button className="save-button" onClick={handleSaveEdit}>
                Save Edit
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              className="record-button"
              onClick={handleMicClick}
              disabled={status === 'thinking'}
              aria-label={recordingState ? 'Stop recording' : 'Start recording'}
              title={recordingState ? 'Click again to stop' : "Click to start recording"}
            >
              <Icon name="microphone" alt="Microphone" size="18px" style={{ marginRight: '8px' }} />
              Record
            </button>
            <div className="bottom-buttons">
              <button
                className="new-button"
                onClick={handleNewDraft}
                disabled={!finalText && !inProgressText}
                title="Start a new draft"
              >
                New
              </button>
              <button
                className="edit-button"
                onClick={handleEditClick}
                disabled={!finalText && !inProgressText}
                title="Edit the text manually"
              >
                Edit
              </button>
              <button
                className="copy-button"
                onClick={handleCopy}
                title={copiedFeedback ? 'Copied!' : 'Copy to clipboard'}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Icon name="copy" alt="Copy" size="18px" />
                {copiedFeedback ? 'Copied!' : 'Copy'}
              </button>
              <button className="save-button" onClick={handleSaveDraft}>
                Polish Draft
              </button>
            </div>
          </>
        )}
      </footer>
    </div>
  )
}

export default WriteMode
