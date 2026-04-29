// set up pdf.js worker
if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
}

export async function extractText(file) {
  if (!window.pdfjsLib) {
    throw new Error('PDF.js not loaded')
  }

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await window.pdfjsLib.getDocument(arrayBuffer).promise

  let fullText = ''

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()
    const pageText = textContent.items.map((item) => item.str).join(' ')
    fullText += pageText + '\n\n'
  }

  return fullText
}
