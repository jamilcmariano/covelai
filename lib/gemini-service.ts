import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai"
import { cache } from "@/lib/cache-utils"

export interface LetterGenerationRequest {
  fullName: string
  email: string
  phone: string
  jobTitle: string
  companyName: string
  skills: string
  additionalNotes?: string
  resume?: string
}

export interface LetterEvaluationRequest {
  letter: string
  jobTitle: string
  companyName: string
}

export interface LetterEvaluation {
  score: number
  feedback: string
  strengths: string[]
  improvements: string[]
}

// Add this function at the top of the file
export function isOfflineMode(headers?: Headers): boolean {
  if (typeof window !== "undefined") {
    return localStorage.getItem("offlineMode") === "true"
  }

  if (headers && headers.get("X-Offline-Mode") === "true") {
    return true
  }

  return false
}

// Initialize the Google Generative AI with API key
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined")
  }
  return new GoogleGenerativeAI(apiKey)
}

// Fallback function to use when API calls fail
export function generateFallbackLetter(request: LetterGenerationRequest): string {
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return `${currentDate}

${request.fullName}
${request.email}
${request.phone}

Hiring Manager
${request.companyName}

Dear Hiring Manager,

I am writing to express my interest in the ${request.jobTitle} position at ${request.companyName}. With my background and skills in ${request.skills}, I believe I would be a valuable addition to your team.

Throughout my career, I have developed expertise in ${request.skills}. I am confident that my experience and skills align well with the requirements of the ${request.jobTitle} role at ${request.companyName}.

${request.additionalNotes ? `Additionally, ${request.additionalNotes}` : ""}

I am excited about the opportunity to bring my unique perspective and expertise to ${request.companyName}. I look forward to discussing how my background, skills, and experiences would benefit your organization.

Thank you for considering my application. I look forward to the possibility of working with you.

Sincerely,
${request.fullName}`
}

// Fallback evaluation when API calls fail
export function generateFallbackEvaluation(): LetterEvaluation {
  return {
    score: 75,
    feedback:
      "This is a solid cover letter that clearly states your interest in the position and highlights your relevant skills. It's concise and professional, though it could benefit from more specific examples of your achievements.",
    strengths: [
      "Clear statement of interest in the specific position",
      "Mentions relevant skills and qualifications",
      "Professional tone and formatting",
      "Appropriate length and structure",
    ],
    improvements: [
      "Add specific examples of past achievements",
      "Include more details about why you're interested in this company specifically",
      "Mention how your skills would solve specific problems for the employer",
      "Customize the closing to be more memorable",
    ],
  }
}

// Function to get a model based on availability and quota
const getAvailableModel = async (genAI: GoogleGenerativeAI) => {
  // Try models in order of preference - using correct model names
  const modelOptions = [
    "gemini-1.5-flash", // Faster, might have higher quota
    "gemini-2.0-flash", // High quality, normal quota
  ]

  // Try each model in sequence until one works
  for (const modelName of modelOptions) {
    try {
      console.log(`Trying model: ${modelName}`)
      const model = genAI.getGenerativeModel({ model: modelName })

      // Test the model with a simple prompt
      await model.generateContent("test")

      console.log(`Successfully using model: ${modelName}`)
      return model
    } catch (error) {
      console.warn(`Model ${modelName} failed:`, error)
      // Continue to the next model
    }
  }

  // If all models fail, throw an error
  throw new Error("No available models found")
}

export async function generateCoverLetter(request: LetterGenerationRequest, headers?: Headers): Promise<string> {
  // Check for offline mode
  if (isOfflineMode(headers)) {
    console.log("Offline mode enabled, using fallback letter")
    return generateFallbackLetter(request)
  }

  // Create a cache key based on the request
  const cacheKey = `letter:${JSON.stringify(request)}`

  // Check cache first
  const cachedLetter = cache.get<string>(cacheKey)
  if (cachedLetter) {
    console.log("Using cached letter")
    return cachedLetter
  }

  const prompt = `
    Generate a professional cover letter for a job application with the following details:
    
    Full Name: ${request.fullName}
    Email: ${request.email}
    Phone: ${request.phone}
    Job Title: ${request.jobTitle}
    Company Name: ${request.companyName}
    Skills/Strengths: ${request.skills}
    ${request.resume ? `Resume Information: ${request.resume}` : ""}
    ${request.additionalNotes ? `Additional Notes: ${request.additionalNotes}` : ""}
    
    The cover letter should be professional, concise, and highlight the applicant's skills and qualifications for the position.
    Format it properly with date, address, salutation, body paragraphs, closing, and signature.
  `

  try {
    // Check if API key is available
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY not found, using fallback letter generation")
      return generateFallbackLetter(request)
    }

    const genAI = getGeminiClient()

    // Get an available model
    let model
    try {
      model = await getAvailableModel(genAI)
    } catch (modelError) {
      console.error("Failed to get available model:", modelError)
      return generateFallbackLetter(request)
    }

    const generationConfig = {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
    }

    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ]

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
      safetySettings,
    })

    const response = result.response
    const text = response.text()

    const letter = text || generateFallbackLetter(request)

    // Cache the result
    cache.set(cacheKey, letter)

    return letter
  } catch (error) {
    console.error("Error generating cover letter:", error)
    // Return a fallback letter if the API call fails
    return generateFallbackLetter(request)
  }
}

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

export async function evaluateCoverLetter(
  request: LetterEvaluationRequest,
  headers?: Headers,
): Promise<LetterEvaluation> {
  // Check for offline mode
  if (isOfflineMode(headers)) {
    console.log("Offline mode enabled, using fallback evaluation")
    return generateFallbackEvaluation()
  }

  // Create a cache key based on the request
  const cacheKey = `evaluation:${JSON.stringify(request)}`

  // Check cache first
  const cachedEvaluation = cache.get<LetterEvaluation>(cacheKey)
  if (cachedEvaluation) {
    console.log("Using cached evaluation")
    return cachedEvaluation
  }

  const prompt = `
    You are an experienced HR Director evaluating a cover letter for a ${request.jobTitle} position at ${request.companyName}.
    
    Please evaluate the following cover letter and provide:
    1. A score from 0-100 indicating how likely this candidate would be invited for an interview
    2. Detailed feedback on the letter's strengths and weaknesses
    3. 3-5 specific strengths of the letter
    4. 3-5 specific areas for improvement
    
    Cover Letter:
    ${request.letter}
    
    IMPORTANT: Return ONLY a JSON object with the following structure, without any markdown formatting, code blocks, or additional text:
    {
      "score": number,
      "feedback": "detailed feedback text",
      "strengths": ["strength1", "strength2", "strength3"],
      "improvements": ["improvement1", "improvement2", "improvement3"]
    }
  `

  try {
    // Check if API key is available
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY not found, using fallback evaluation")
      return generateFallbackEvaluation()
    }

    const genAI = getGeminiClient()

    // Get an available model
    let model
    try {
      model = await getAvailableModel(genAI)
    } catch (modelError) {
      console.error("Failed to get available model:", modelError)
      return generateFallbackEvaluation()
    }

    const generationConfig = {
      temperature: 0.2, // Lower temperature for more deterministic output
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
    }

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
    })

    const response = result.response
    const text = response.text()

    // Try to parse the JSON response
    try {
      // First, try to extract JSON from the text in case it contains markdown formatting
      const jsonText = extractJsonFromText(text)
      console.log("Extracted JSON text:", jsonText)

      const evaluation = JSON.parse(jsonText) as LetterEvaluation

      // Validate the evaluation object
      if (!evaluation.score || !evaluation.feedback || !evaluation.strengths || !evaluation.improvements) {
        console.warn("Invalid evaluation object structure:", evaluation)
        throw new Error("Invalid evaluation object structure")
      }

      // Cache the result
      cache.set(cacheKey, evaluation)

      return evaluation
    } catch (parseError) {
      console.error("Error parsing evaluation JSON:", parseError)
      console.error("Raw response:", text)

      // Try to manually extract the data using regex
      try {
        const scoreMatch = text.match(/"score"\s*:\s*(\d+)/)
        const feedbackMatch = text.match(/"feedback"\s*:\s*"([^"]+)"/)
        const strengthsMatch = text.match(/"strengths"\s*:\s*\[(.*?)\]/s)
        const improvementsMatch = text.match(/"improvements"\s*:\s*\[(.*?)\]/s)

        if (scoreMatch && feedbackMatch && strengthsMatch && improvementsMatch) {
          const score = Number.parseInt(scoreMatch[1], 10)
          const feedback = feedbackMatch[1]
          const strengths = strengthsMatch[1]
            .split(",")
            .map((s) => s.trim().replace(/^"(.*)"$/, "$1"))
            .filter(Boolean)
          const improvements = improvementsMatch[1]
            .split(",")
            .map((s) => s.trim().replace(/^"(.*)"$/, "$1"))
            .filter(Boolean)

          const manuallyExtractedEvaluation: LetterEvaluation = {
            score,
            feedback,
            strengths,
            improvements,
          }

          console.log("Manually extracted evaluation:", manuallyExtractedEvaluation)

          // Cache the result
          cache.set(cacheKey, manuallyExtractedEvaluation)

          return manuallyExtractedEvaluation
        }
      } catch (regexError) {
        console.error("Failed to extract evaluation using regex:", regexError)
      }

      // If parsing fails, return fallback
      return generateFallbackEvaluation()
    }
  } catch (error) {
    console.error("Error evaluating cover letter:", error)
    // Return a fallback evaluation if the API call fails
    return generateFallbackEvaluation()
  }
}

// Predefined suggestions for common fields and job titles
const predefinedSuggestions: Record<string, Record<string, string>> = {
  skills: {
    "Software Engineer":
      "Problem-solving, JavaScript, React, Node.js, API development, Git, Agile methodologies, Communication",
    "Data Analyst":
      "SQL, Python, Data visualization, Statistical analysis, Excel, Tableau, Attention to detail, Critical thinking",
    "Project Manager":
      "Leadership, Communication, Stakeholder management, Risk assessment, Agile methodologies, Budgeting, MS Project, Problem-solving",
    "Marketing Manager":
      "Digital marketing, Social media strategy, Content creation, SEO/SEM, Analytics, Campaign management, Brand development, Communication",
    "Customer Service Representative":
      "Communication, Empathy, Problem-solving, Patience, Active listening, CRM software, Multitasking, Conflict resolution",
    default:
      "Communication, Problem-solving, Teamwork, Attention to detail, Time management, Adaptability, Technical proficiency",
  },
  additionalNotes: {
    "Software Engineer":
      "I am particularly drawn to your company's innovative approach to software development and commitment to technical excellence. My experience with similar technologies would allow me to contribute immediately to your development team.",
    "Data Analyst":
      "I am impressed by your company's data-driven approach to decision making. My analytical skills and attention to detail would be valuable assets in helping your organization derive meaningful insights from complex datasets.",
    "Project Manager":
      "I am excited about your company's project portfolio and growth trajectory. My experience managing cross-functional teams and delivering projects on time and within budget aligns perfectly with your needs.",
    "Marketing Manager":
      "I admire your company's brand presence and creative campaigns. My experience developing integrated marketing strategies would help further strengthen your market position and drive customer engagement.",
    "Customer Service Representative":
      "I am impressed by your company's commitment to customer satisfaction. My empathetic approach to problem-solving and dedication to providing exceptional service would help maintain your excellent reputation.",
    default:
      "I am particularly drawn to your company's innovative approach to the industry and commitment to excellence. I believe my background would allow me to contribute immediately to your team's goals.",
  },
}

export async function getFieldSuggestion(
  field: string,
  currentValue: string,
  jobTitle: string,
  companyName: string,
  headers?: Headers,
): Promise<string> {
  // Check for offline mode
  if (isOfflineMode(headers)) {
    console.log("Offline mode enabled, using fallback suggestion")

    // Fallback suggestions
    const fallbackSuggestions: Record<string, string> = {
      skills:
        "Problem-solving, Communication, Teamwork, Attention to detail, Time management, Adaptability, Technical proficiency",
      additionalNotes: `I am particularly drawn to ${companyName}'s innovative approach to the industry and commitment to excellence. I believe my background would allow me to contribute immediately to your team's goals.`,
    }

    return fallbackSuggestions[field] || `[Suggestion for ${field}]`
  }

  // Create a cache key based on the request
  const cacheKey = `suggestion:${field}:${jobTitle}:${companyName}:${currentValue.substring(0, 20)}`

  // Check cache first
  const cachedSuggestion = cache.get<string>(cacheKey)
  if (cachedSuggestion) {
    console.log("Using cached suggestion")
    return cachedSuggestion
  }

  // Check if we have a predefined suggestion for this field and job title
  if (predefinedSuggestions[field]) {
    const jobSpecificSuggestion = predefinedSuggestions[field][jobTitle] || predefinedSuggestions[field]["default"]
    if (jobSpecificSuggestion) {
      // Cache the predefined suggestion
      cache.set(cacheKey, jobSpecificSuggestion)
      return jobSpecificSuggestion
    }
  }

  const prompts: Record<string, string> = {
    skills: `Suggest 5-7 relevant skills and strengths for a ${jobTitle} position at ${companyName}. Current input: "${currentValue}". Format as a comma-separated list.`,
    additionalNotes: `Suggest additional information that would be valuable to include in a cover letter for a ${jobTitle} position at ${companyName}. Current input: "${currentValue}". Keep it concise (2-3 sentences).`,
  }

  const prompt =
    prompts[field] ||
    `Suggest a good ${field} for a ${jobTitle} position at ${companyName}. Current input: "${currentValue}". Keep it concise.`

  try {
    // Check if API key is available
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY not found, using fallback suggestion")

      // Fallback suggestions
      const fallbackSuggestions: Record<string, string> = {
        skills:
          "Problem-solving, Communication, Teamwork, Attention to detail, Time management, Adaptability, Technical proficiency",
        additionalNotes: `I am particularly drawn to ${companyName}'s innovative approach to the industry and commitment to excellence. I believe my background would allow me to contribute immediately to your team's goals.`,
      }

      return fallbackSuggestions[field] || `[Suggestion for ${field}]`
    }

    const genAI = getGeminiClient()

    // Get an available model
    let model
    try {
      model = await getAvailableModel(genAI)
    } catch (modelError) {
      console.error("Failed to get available model:", modelError)

      // Return fallback suggestion
      const fallbackSuggestions: Record<string, string> = {
        skills:
          "Problem-solving, Communication, Teamwork, Attention to detail, Time management, Adaptability, Technical proficiency",
        additionalNotes: `I am particularly drawn to ${companyName}'s innovative approach to the industry and commitment to excellence. I believe my background would allow me to contribute immediately to your team's goals.`,
      }
      return fallbackSuggestions[field] || `[Suggestion for ${field}]`
    }

    const generationConfig = {
      temperature: 0.4,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    }

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
    })

    const response = result.response
    const suggestion = response.text()

    // Cache the result
    cache.set(cacheKey, suggestion)

    return suggestion
  } catch (error) {
    console.error(`Error getting suggestion for ${field}:`, error)

    // Fallback suggestions
    const fallbackSuggestions: Record<string, string> = {
      skills:
        "Problem-solving, Communication, Teamwork, Attention to detail, Time management, Adaptability, Technical proficiency",
      additionalNotes: `I am particularly drawn to ${companyName}'s innovative approach to the industry and commitment to excellence. I believe my background would allow me to contribute immediately to your team's goals.`,
    }

    return fallbackSuggestions[field] || `[Suggestion for ${field}]`
  }
}

export async function listAvailableModels() {
  try {
    const genAI = getGeminiClient()
    // This is a workaround since the SDK doesn't expose a direct listModels method
    try {
      const models = ["gemini-pro", "gemini-1.5-flash", "gemini-1.5-pro"]
      const availableModels = []

      for (const modelName of models) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName })
          await model.generateContent("test")
          availableModels.push({ name: modelName, status: "available" })
        } catch (error) {
          availableModels.push({ name: modelName, status: "unavailable", error: String(error) })
        }
      }

      return { models: availableModels }
    } catch (error) {
      return { error: String(error) }
    }
  } catch (error) {
    console.error("Error listing models:", error)
    return { error: "Failed to list models" }
  }
}
