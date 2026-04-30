export async function recordAndTranscribe(apiKey) {
  try {
    // Request microphone access
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const analyser = audioContext.createAnalyser()
    const source = audioContext.createMediaStreamSource(stream)
    source.connect(analyser)

    const mediaRecorder = new MediaRecorder(stream)
    const audioChunks = []
    let isRecording = true
    let silenceStart = Date.now()
    let contextClosed = false

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data)
    }

    // Silence detection disabled - user controls recording via manual button click
    // Set a long safety timeout (10 minutes) to prevent infinite recording
    let silenceCheck = null

    // Return a promise that resolves when recording stops
    const recordingPromise = new Promise((resolve, reject) => {
      mediaRecorder.onstop = async () => {
        try {
          if (silenceCheck) clearInterval(silenceCheck)

          // Close audio context
          if (!contextClosed) {
            audioContext.close()
            contextClosed = true
          }

          // Stop all audio tracks
          stream.getTracks().forEach(track => track.stop())

          // Create audio blob with correct type for ElevenLabs
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })

          console.log('Sending audio to ElevenLabs for transcription...', `(${audioBlob.size} bytes)`)

          // Send to ElevenLabs speech-to-text
          const formData = new FormData()
          formData.append('file', audioBlob, 'audio.webm')
          formData.append('model_id', 'scribe_v2')

          const response = await fetch(
            'https://api.elevenlabs.io/v1/speech-to-text',
            {
              method: 'POST',
              headers: {
                'xi-api-key': apiKey,
              },
              body: formData,
            }
          )

          if (!response.ok) {
            const errorText = await response.text()
            console.error('STT Response:', response.status, errorText)
            try {
              const errorJson = JSON.parse(errorText)
              throw new Error(errorJson.detail?.message || errorJson.detail || errorText)
            } catch {
              throw new Error(`HTTP ${response.status}: ${errorText}`)
            }
          }

          const result = await response.json()
          console.log('Got transcript back from ElevenLabs:', result.text)
          resolve(result.text)
        } catch (error) {
          console.error('Error with transcription:', error.message)
          reject(error)
        }
      }

      mediaRecorder.onerror = (event) => {
        if (silenceCheck) clearInterval(silenceCheck)
        if (!contextClosed) {
          try {
            audioContext.close()
            contextClosed = true
          } catch (e) {}
        }
        stream.getTracks().forEach(track => track.stop())
        reject(new Error(`Recording error: ${event.error}`))
      }

      // Max 30 second safety timeout
      setTimeout(() => {
        if (isRecording && mediaRecorder.state === 'recording') {
          console.log('Recording hit the 30 second timeout, stopping it')
          mediaRecorder.stop()
          isRecording = false
        }
      }, 30000)
    })

    // Start recording
    mediaRecorder.start()
    console.log('Started recording, waiting for voice input')

    return {
      promise: recordingPromise,
      stop: () => {
        if (isRecording && mediaRecorder.state === 'recording') {
          mediaRecorder.stop()
          isRecording = false
        }
      }
    }
  } catch (error) {
    console.error('Problem accessing the microphone:', error)
    throw new Error(`Microphone error: ${error.message}`)
  }
}
