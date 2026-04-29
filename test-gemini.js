import { GoogleGenerativeAI } from '@google/generative-ai'

// Get the API key from environment
const apiKey = process.env.VITE_GEMINI_KEY

console.log('=== Testing Gemini API ===')
console.log('API Key loaded:', apiKey ? `${apiKey.slice(0, 10)}...${apiKey.slice(-10)}` : 'NOT FOUND')

if (!apiKey) {
  console.error('❌ API key not found in environment!')
  process.exit(1)
}

try {
  console.log('\n1. Initializing GoogleGenerativeAI client...')
  const client = new GoogleGenerativeAI(apiKey)
  console.log('✅ Client initialized')

  console.log('\n2. Getting model (gemini-2.0-flash)...')
  const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' })
  console.log('✅ Model retrieved')

  console.log('\n3. Sending test request...')
  const result = await model.generateContent('Say "Hello from Gemini" and nothing else.')
  console.log('✅ Request successful')

  const responseText = result.response.text()
  console.log('\n4. Response received:')
  console.log(responseText)

  console.log('\n✅ API is working correctly!')
} catch (error) {
  console.error('\n❌ Error occurred:')
  console.error('Message:', error.message)
  console.error('Status:', error.status)
  console.error('Error code:', error.code)
  console.error('Full error:', error)
  process.exit(1)
}
