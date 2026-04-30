import dotenv from 'dotenv'
dotenv.config()

const apiKey = process.env.VITE_GOOGLE_API_KEY

if (!apiKey) {
  console.error('❌ VITE_GOOGLE_API_KEY not found in .env')
  process.exit(1)
}

console.log('🔍 Testing Gemini API with key...')

const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`

const body = {
  contents: [
    {
      parts: [
        {
          text: 'Say hello'
        }
      ]
    }
  ]
}

try {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('❌ API Error:', error)
    process.exit(1)
  }

  const result = await response.json()
  console.log('✅ Gemini API works!')
  console.log('Response:', result.candidates[0].content.parts[0].text)
} catch (err) {
  console.error('❌ Request failed:', err.message)
  process.exit(1)
}
