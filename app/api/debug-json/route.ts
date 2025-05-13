import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

// Function to extract JSON from a string that might contain markdown formatting
function extractJsonFromText(text: string): string {
  // Check if the text contains a markdown code block
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)```/
  const match = text.match(jsonBlockRegex)

  if (match && match[1]) {
    // Return the content inside the code block
    return match[1].trim()
  }

  // If no code block is found, return the original text
  return text.trim()
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { prompt } = body

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    // Check if API key is available
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not defined" }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: "gemini-pro" })

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
      },
    })

    const response = result.response
    const text = response.text()

    // Try to extract and parse JSON
    const jsonText = extractJsonFromText(text)
    let parsedJson = null
    let parseError = null

    try {
      parsedJson = JSON.parse(jsonText)
    } catch (error) {
      parseError = String(error)
    }

    return NextResponse.json({
      originalText: text,
      extractedJsonText: jsonText,
      parsedJson,
      parseError,
      containsCodeBlock: text.includes("```"),
    })
  } catch (error) {
    console.error("Error in debug-json API route:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
