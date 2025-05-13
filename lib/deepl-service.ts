export interface TranslationRequest {
  text: string;
  targetLang: string;
  sourceLang?: string;
}

export interface TranslationResponse {
  translatedText: string;
}

export async function translateText(
  request: TranslationRequest,
): Promise<TranslationResponse> {
  try {
    // Using the unofficial DeepL API endpoint
    const response = await fetch(
      "https://deeplx.missuo.ru/translate?key=cz4T-vqQMR4YD-1ay7eFfghZ-VhpbaOhbq438JTlCjk=",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: request.text,
          source_lang: request.sourceLang || "EN",
          target_lang: request.targetLang,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `DeepL API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    // Check if the response has the expected format
    if (data.code !== 200 || !data.data) {
      throw new Error("Unexpected response format from translation API");
    }

    return {
      translatedText: data.data,
    };
  } catch (error) {
    console.error("Error translating text:", error);
    throw new Error("Failed to translate text. Please try again.");
  }
}
