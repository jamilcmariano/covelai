import { NextResponse } from "next/server";
import { getFieldSuggestion } from "@/lib/gemini-service";
import { cache } from "@/lib/cache-utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { field, currentValue, jobTitle, companyName } = body;

    // Create a cache key based on the request
    const cacheKey = `suggestion:${field}:${jobTitle}:${companyName}:${currentValue.substring(0, 20)}`;

    // Check if we have a cached response
    const cachedSuggestion = cache.get<string>(cacheKey);
    if (cachedSuggestion) {
      return NextResponse.json({
        suggestion: cachedSuggestion,
        source: "cache",
      });
    }

    const suggestion = await getFieldSuggestion(
      field,
      currentValue,
      jobTitle,
      companyName,
      request.headers,
    );

    // Determine if this is a fallback response
    const isFallback =
      !process.env.GEMINI_API_KEY ||
      suggestion.includes("Problem-solving, Communication, Teamwork");

    // Cache the result if it's not already cached
    if (!isFallback) {
      cache.set(cacheKey, suggestion);
    }

    return NextResponse.json({
      suggestion,
      source: isFallback ? "fallback" : "api",
    });
  } catch (error) {
    console.error("Error in field-suggestion API route:", error);
    return NextResponse.json(
      { error: "Failed to get field suggestion" },
      { status: 500 },
    );
  }
}
