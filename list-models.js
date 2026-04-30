import dotenv from 'dotenv'
dotenv.config()

const apiKey = process.env.VITE_GOOGLE_API_KEY

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`

try {
  const response = await fetch(url)
  const result = await response.json()

  if (result.models) {
    console.log('Available models:')
    result.models.forEach(m => console.log(`  - ${m.name}`))
  } else {
    console.log(result)
  }
} catch (err) {
  console.error('Error:', err.message)
}
