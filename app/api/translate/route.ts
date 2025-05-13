import { NextResponse } from "next/server"
import { translateText, type TranslationRequest } from "@/lib/deepl-service"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TranslationRequest
    const translation = await translateText(body)

    return NextResponse.json(translation)
  } catch (error) {
    console.error("Error in translate API route:", error)
    return NextResponse.json({ error: "Failed to translate text" }, { status: 500 })
  }
}
