"use client"

import type React from "react"
import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Copy, Download, Sparkles, Lightbulb, Languages, FileText, BarChart, RefreshCw } from "lucide-react"
import { LanguageSelector, languages } from "@/components/language-selector"
import { exportToPDF } from "@/lib/pdf-utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

interface FormData {
  fullName: string
  email: string
  phone: string
  jobTitle: string
  companyName: string
  skills: string
  resume: File | null
  additionalNotes: string
}

interface LetterEvaluation {
  score: number
  feedback: string
  strengths: string[]
  improvements: string[]
}

export default function GeneratePage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("form")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [isSuggesting, setSuggesting] = useState<Record<string, boolean>>({})
  const [generatedLetter, setGeneratedLetter] = useState("")
  const [translatedLetter, setTranslatedLetter] = useState("")
  const [selectedLanguage, setSelectedLanguage] = useState("EN")
  const [evaluation, setEvaluation] = useState<LetterEvaluation | null>(null)
  const [viewMode, setViewMode] = useState<"letter" | "evaluation">("letter")
  const [showTranslation, setShowTranslation] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [usingFallback, setUsingFallback] = useState(false)
  const [usingCache, setUsingCache] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    phone: "",
    jobTitle: "",
    companyName: "",
    skills: "",
    resume: null,
    additionalNotes: "",
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData((prev) => ({ ...prev, resume: e.target.files![0] }))
    }
  }

  const handleGenerateLetter = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    if (!formData.fullName || !formData.jobTitle || !formData.companyName) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    setActiveTab("preview")
    setUsingFallback(false)
    setUsingCache(false)

    try {
      // Convert resume to text if available
      let resumeText = ""
      if (formData.resume) {
        // In a real implementation, you would extract text from the resume
        // For this example, we'll just use the filename
        resumeText = `Resume file: ${formData.resume.name}`
      }

      const response = await fetch("/api/generate-letter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          resume: resumeText,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate letter")
      }

      const data = await response.json()
      setGeneratedLetter(data.letter)

      // Check if we're using fallback or cached content
      if (data.source === "fallback") {
        setUsingFallback(true)
      } else if (data.source === "cache") {
        setUsingCache(true)
      }

      toast({
        title: "Letter generated!",
        description:
          data.source === "fallback"
            ? "Using fallback letter due to API limitations."
            : data.source === "cache"
              ? "Using cached letter."
              : "Your cover letter has been created successfully.",
      })

      // Automatically evaluate the letter
      handleEvaluateLetter(data.letter)
    } catch (error) {
      toast({
        title: "Generation failed",
        description: "There was an error generating your letter. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleEvaluateLetter = async (letterToEvaluate: string) => {
    setIsEvaluating(true)
    setUsingFallback(false)
    setUsingCache(false)

    try {
      const response = await fetch("/api/evaluate-letter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          letter: letterToEvaluate,
          jobTitle: formData.jobTitle,
          companyName: formData.companyName,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to evaluate letter")
      }

      const data = await response.json()
      setEvaluation(data.evaluation)

      // Check if we're using fallback or cached content
      if (data.source === "fallback") {
        setUsingFallback(true)
      } else if (data.source === "cache") {
        setUsingCache(true)
      }

      toast({
        title: "Evaluation complete",
        description:
          data.source === "fallback"
            ? "Using fallback evaluation due to API limitations."
            : data.source === "cache"
              ? "Using cached evaluation."
              : `Your letter received a score of ${data.evaluation.score}/100.`,
      })
    } catch (error) {
      toast({
        title: "Evaluation failed",
        description: "There was an error evaluating your letter. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsEvaluating(false)
    }
  }

  const handleTranslateLetter = async () => {
    if (!generatedLetter) return

    setIsTranslating(true)
    setShowTranslation(true)

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: generatedLetter,
          targetLang: selectedLanguage,
          sourceLang: "EN", // Explicitly set source language
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to translate letter")
      }

      const data = await response.json()
      setTranslatedLetter(data.translatedText)

      toast({
        title: "Translation complete",
        description: `Your letter has been translated to ${languages.find((l) => l.code === selectedLanguage)?.name}.`,
      })
    } catch (error) {
      toast({
        title: "Translation failed",
        description: "There was an error translating your letter. Please try again.",
        variant: "destructive",
      })
      setShowTranslation(false)
    } finally {
      setIsTranslating(false)
    }
  }

  const handleGetSuggestion = async (field: string) => {
    if (!formData.jobTitle || !formData.companyName) {
      toast({
        title: "Missing information",
        description: "Please fill in the job title and company name first.",
        variant: "destructive",
      })
      return
    }

    setSuggesting((prev) => ({ ...prev, [field]: true }))
    setUsingFallback(false)
    setUsingCache(false)

    try {
      const response = await fetch("/api/field-suggestion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          field,
          currentValue: formData[field as keyof FormData] as string,
          jobTitle: formData.jobTitle,
          companyName: formData.companyName,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to get suggestion for ${field}`)
      }

      const data = await response.json()

      setFormData((prev) => ({ ...prev, [field]: data.suggestion }))

      // Check if we're using fallback or cached content
      if (data.source === "fallback") {
        setUsingFallback(true)
      } else if (data.source === "cache") {
        setUsingCache(true)
      }

      toast({
        title: "Suggestion added",
        description:
          data.source === "fallback"
            ? "Using fallback suggestion due to API limitations."
            : data.source === "cache"
              ? "Using cached suggestion."
              : `The ${field} field has been updated with a suggestion.`,
      })
    } catch (error) {
      toast({
        title: "Suggestion failed",
        description: `There was an error getting a suggestion for ${field}. Please try again.`,
        variant: "destructive",
      })
    } finally {
      setSuggesting((prev) => ({ ...prev, [field]: false }))
    }
  }

  const handleCopyToClipboard = () => {
    const textToCopy = showTranslation ? translatedLetter : generatedLetter
    navigator.clipboard.writeText(textToCopy)
    toast({
      title: "Copied to clipboard",
      description: "Your letter has been copied to clipboard.",
    })
  }

  const handleDownloadPDF = () => {
    const title = `Cover Letter for ${formData.jobTitle} at ${formData.companyName}`

    exportToPDF({
      title,
      content: generatedLetter,
      translatedContent: showTranslation ? translatedLetter : undefined,
      targetLanguage: showTranslation ? languages.find((l) => l.code === selectedLanguage)?.name : undefined,
      evaluation: evaluation || undefined,
    })

    toast({
      title: "Downloaded",
      description: "Your letter has been downloaded as a PDF.",
    })
  }

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    setFormData((prev) => ({ ...prev, resume: null }))
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <motion.h1
          className="text-3xl font-bold tracking-tight mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Generate Your Cover Letter
        </motion.h1>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="form">Form</TabsTrigger>
            <TabsTrigger value="preview" disabled={!generatedLetter}>
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="form">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <Card>
                <CardContent className="pt-6">
                  <form onSubmit={handleGenerateLetter} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">
                          Full Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="fullName"
                          name="fullName"
                          placeholder="John Doe"
                          value={formData.fullName}
                          onChange={handleInputChange}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">
                          Email <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="john.doe@example.com"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">
                          Phone Number <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="phone"
                          name="phone"
                          placeholder="(123) 456-7890"
                          value={formData.phone}
                          onChange={handleInputChange}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="jobTitle">
                          Job Title <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="jobTitle"
                          name="jobTitle"
                          placeholder="Software Engineer"
                          value={formData.jobTitle}
                          onChange={handleInputChange}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="companyName">
                          Company Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="companyName"
                          name="companyName"
                          placeholder="Acme Inc."
                          value={formData.companyName}
                          onChange={handleInputChange}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="resume">Upload Resume (Optional)</Label>
                        <div className="flex gap-2">
                          <Input
                            id="resume"
                            name="resume"
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={handleFileChange}
                            ref={fileInputRef}
                          />
                          {formData.resume && (
                            <Button type="button" variant="outline" size="icon" onClick={resetFileInput}>
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="skills">
                          Personal Skills/Strengths <span className="text-red-500">*</span>
                        </Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleGetSuggestion("skills")}
                                disabled={isSuggesting.skills}
                              >
                                {isSuggesting.skills ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Lightbulb className="mr-2 h-4 w-4" />
                                )}
                                Ask Gemini
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Get AI suggestions for relevant skills</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Textarea
                        id="skills"
                        name="skills"
                        placeholder="List your key skills and strengths..."
                        value={formData.skills}
                        onChange={handleInputChange}
                        required
                        className="min-h-[100px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="additionalNotes">Additional Notes (Optional)</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleGetSuggestion("additionalNotes")}
                                disabled={isSuggesting.additionalNotes}
                              >
                                {isSuggesting.additionalNotes ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Lightbulb className="mr-2 h-4 w-4" />
                                )}
                                Ask Gemini
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Get AI suggestions for additional information</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Textarea
                        id="additionalNotes"
                        name="additionalNotes"
                        placeholder="Any additional information you'd like to include..."
                        value={formData.additionalNotes}
                        onChange={handleInputChange}
                        className="min-h-[100px]"
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={isGenerating}>
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generate Cover Letter
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="preview">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              {generatedLetter ? (
                <div className="space-y-6">
                  {usingFallback && (
                    <div className="mb-4 p-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-sm rounded-md">
                      Using fallback content due to API rate limits. Some features may be limited.
                    </div>
                  )}

                  {usingCache && (
                    <div className="mb-4 p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 text-sm rounded-md">
                      Using cached content. This content was generated previously.
                    </div>
                  )}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <TabsList>
                            <TabsTrigger
                              value="letter"
                              onClick={() => setViewMode("letter")}
                              className={viewMode === "letter" ? "bg-primary text-primary-foreground" : ""}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Letter
                            </TabsTrigger>
                            <TabsTrigger
                              value="evaluation"
                              onClick={() => setViewMode("evaluation")}
                              className={viewMode === "evaluation" ? "bg-primary text-primary-foreground" : ""}
                              disabled={!evaluation}
                            >
                              <BarChart className="mr-2 h-4 w-4" />
                              Evaluation
                              {isEvaluating && <Loader2 className="ml-2 h-3 w-3 animate-spin" />}
                            </TabsTrigger>
                          </TabsList>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          {viewMode === "letter" && (
                            <>
                              <div className="flex-1 min-w-[150px]">
                                <LanguageSelector value={selectedLanguage} onChange={setSelectedLanguage} />
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleTranslateLetter}
                                disabled={isTranslating || selectedLanguage === "EN"}
                              >
                                {isTranslating ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Languages className="mr-2 h-4 w-4" />
                                )}
                                Translate
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <AnimatePresence mode="wait">
                        {viewMode === "letter" ? (
                          <motion.div
                            key="letter"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            {showTranslation && translatedLetter ? (
                              <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                  <Badge variant="outline">
                                    {languages.find((l) => l.code === selectedLanguage)?.name}
                                  </Badge>
                                  <Button variant="ghost" size="sm" onClick={() => setShowTranslation(false)}>
                                    Show Original
                                  </Button>
                                </div>
                                <div className="bg-muted p-6 rounded-md whitespace-pre-line">{translatedLetter}</div>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {translatedLetter && (
                                  <div className="flex justify-between items-center">
                                    <Badge variant="outline">English (Original)</Badge>
                                    <Button variant="ghost" size="sm" onClick={() => setShowTranslation(true)}>
                                      Show Translation
                                    </Button>
                                  </div>
                                )}
                                <div className="bg-muted p-6 rounded-md whitespace-pre-line">{generatedLetter}</div>
                              </div>
                            )}
                          </motion.div>
                        ) : (
                          <motion.div
                            key="evaluation"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            {evaluation ? (
                              <div className="space-y-6">
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-medium">HR Director's Score</h3>
                                    <Badge
                                      variant={
                                        evaluation.score >= 80
                                          ? "default"
                                          : evaluation.score >= 60
                                            ? "outline"
                                            : "destructive"
                                      }
                                    >
                                      {evaluation.score}/100
                                    </Badge>
                                  </div>
                                  <Progress value={evaluation.score} className="h-2" />
                                </div>

                                <div className="space-y-2">
                                  <h3 className="text-lg font-medium">Feedback</h3>
                                  <p className="text-muted-foreground">{evaluation.feedback}</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-2">
                                    <h3 className="text-lg font-medium">Strengths</h3>
                                    <ul className="space-y-1">
                                      {evaluation.strengths.map((strength, index) => (
                                        <li key={index} className="flex gap-2">
                                          <span className="text-green-500">✓</span>
                                          <span>{strength}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>

                                  <div className="space-y-2">
                                    <h3 className="text-lg font-medium">Areas for Improvement</h3>
                                    <ul className="space-y-1">
                                      {evaluation.improvements.map((improvement, index) => (
                                        <li key={index} className="flex gap-2">
                                          <span className="text-amber-500">!</span>
                                          <span>{improvement}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-6">
                                <Skeleton className="h-4 w-[250px]" />
                                <Skeleton className="h-2 w-full" />
                                <Skeleton className="h-4 w-[200px]" />
                                <Skeleton className="h-20 w-full" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-2">
                                    <Skeleton className="h-4 w-[100px]" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-full" />
                                  </div>
                                  <div className="space-y-2">
                                    <Skeleton className="h-4 w-[150px]" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-full" />
                                  </div>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={handleCopyToClipboard}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                    <Button variant="outline" onClick={handleDownloadPDF}>
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </Button>
                  </div>
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center p-6 min-h-[300px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
                    <CardTitle className="text-xl mb-2">Generating your letter</CardTitle>
                    <p className="text-muted-foreground text-center">
                      Please wait while Gemini AI creates your personalized cover letter...
                    </p>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
