import dotenv from 'dotenv'
dotenv.config()

const apiKey = process.env.VITE_ELEVENLABS_KEY

if (!apiKey) {
  console.error('❌ VITE_ELEVENLABS_KEY not found in .env')
  process.exit(1)
}

console.log('🔍 Testing ElevenLabs API with key...')

const url = 'https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM'

try {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: 'Hello, this is a test of the ElevenLabs text to speech service.',
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: 0.65,
        similarity_boost: 0.65,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('❌ API Error:', error)
    process.exit(1)
  }

  const audioBlob = await response.blob()
  console.log('✅ ElevenLabs API works!')
  console.log(`Audio size: ${audioBlob.size} bytes`)
} catch (err) {
  console.error('❌ Request failed:', err.message)
  process.exit(1)
}
