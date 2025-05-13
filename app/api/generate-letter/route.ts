import { NextResponse } from "next/server"
import { generateCoverLetter, type LetterGenerationRequest } from "@/lib/gemini-service"
import { cache } from "@/lib/cache-utils"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LetterGenerationRequest

    // Create a cache key based on the request
    const cacheKey = `letter:${JSON.stringify(body)}`

    // Check if we have a cached response
    const cachedLetter = cache.get<string>(cacheKey)
    if (cachedLetter) {
      return NextResponse.json({
        letter: cachedLetter,
        source: "cache",
      })
    }

    const letter = await generateCoverLetter(body, request.headers)

    // Determine if this is a fallback response
    const isFallback = !process.env.GEMINI_API_KEY || letter.includes("Dear Hiring Manager,")

    // Cache the result if it's not already cached
    if (!isFallback) {
      cache.set(cacheKey, letter)
    }

    return NextResponse.json({
      letter,
      source: isFallback ? "fallback" : "api",
    })
  } catch (error) {
    console.error("Error in generate-letter API route:", error)
    return NextResponse.json({ error: "Failed to generate cover letter" }, { status: 500 })
  }
}
