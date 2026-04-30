import { useEffect } from 'react'
import Icon from './Icon'
import './Landing.css'

function Landing({ goTo }) {
  useEffect(() => {
    // set up voice recognition for "hey flow" wake phrase
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      let interimTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (!result || !result.transcript) continue

        const transcript = result.transcript.toLowerCase()
        if (result.isFinal) {
          // check for "hey flow" or "hey flo"
          if (transcript.includes('hey flow') || transcript.includes('hey flo')) {
            const afterWake = transcript.split(/hey flo(w)?/i)[1] || ''
            if (afterWake.includes('read')) {
              goTo('read')
            } else if (afterWake.includes('write')) {
              goTo('write')
            }
          }
        } else {
          interimTranscript += transcript
        }
      }
    }

    recognition.start()
    return () => recognition.stop()
  }, [goTo])

  return (
    <div className="landing-container">
      <div className="landing-content">
        <h1 className="wordmark">Flow</h1>

        <div className="cards-container">
          <button
            className="mode-card"
            onClick={() => goTo('read')}
            aria-label="Read Mode"
          >
            <Icon name="book" alt="Read Mode" size="64px" />
            <span className="card-text">Read Mode</span>
          </button>

          <button
            className="mode-card"
            onClick={() => goTo('write')}
            aria-label="Write Mode"
          >
            <Icon name="microphone" alt="Write Mode" size="64px" />
            <span className="card-text">Write Mode</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default Landing
