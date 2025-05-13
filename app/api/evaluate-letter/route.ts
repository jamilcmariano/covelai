import { NextResponse } from "next/server";
import {
  evaluateCoverLetter,
  generateFallbackEvaluation,
  type LetterEvaluationRequest,
} from "@/lib/gemini-service";
import { cache } from "@/lib/cache-utils";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LetterEvaluationRequest;

    // Create a cache key based on the request
    const cacheKey = `evaluation:${JSON.stringify(body)}`;

    // Check if we have a cached response
    const cachedEvaluation = cache.get<any>(cacheKey);
    if (cachedEvaluation) {
      return NextResponse.json({
        evaluation: cachedEvaluation,
        source: "cache",
      });
    }

    const evaluation = await evaluateCoverLetter(body, request.headers);

    // Determine if this is a fallback response
    const fallbackEvaluation = generateFallbackEvaluation();
    const isFallback =
      !process.env.GEMINI_API_KEY ||
      (evaluation.score === fallbackEvaluation.score &&
        evaluation.feedback === fallbackEvaluation.feedback);

    // Cache the result if it's not already cached
    if (!isFallback) {
      cache.set(cacheKey, evaluation);
    }

    return NextResponse.json({
      evaluation,
      source: isFallback ? "fallback" : "api",
    });
  } catch (error) {
    console.error("Error in evaluate-letter API route:", error);
    return NextResponse.json(
      { error: "Failed to evaluate cover letter" },
      { status: 500 },
    );
  }
}
