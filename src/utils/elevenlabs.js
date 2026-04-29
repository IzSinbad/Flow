let currentAudio = null

export async function speak(text, apiKey) {
  stopSpeaking()

  if (apiKey) {
    try {
      // use elevenlabs tts
      const response = await fetch(
        'https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM',
        {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
            Accept: 'audio/mpeg',
          },
          body: JSON.stringify({
            text: text.slice(0, 3000),
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.65,
              similarity_boost: 0.65,
            },
          }),
        }
      )

      if (!response.ok) {
        throw new Error('ElevenLabs API error')
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      currentAudio = audio
      audio.play()
      return audio
    } catch (error) {
      console.error('ElevenLabs error, falling back to browser speech:', error)
      return fallbackSpeech(text)
    }
  } else {
    return fallbackSpeech(text)
  }
}

function fallbackSpeech(text) {
  const utterance = new SpeechSynthesisUtterance(text.slice(0, 3000))
  utterance.rate = 0.88
  utterance.pitch = 1.0
  window.speechSynthesis.speak(utterance)
  return null
}

export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }
  window.speechSynthesis.cancel()
}
