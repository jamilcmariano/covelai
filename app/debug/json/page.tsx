"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function DebugJsonPage() {
  const [prompt, setPrompt] = useState(
    'Return a JSON object with the following structure: {"score": 85, "feedback": "Good letter", "strengths": ["Clear", "Concise"], "improvements": ["Add more details"]}',
  )
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testJsonParsing = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/debug-json", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Unknown error")
      }

      setResult(data)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Debug JSON Parsing</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Test JSON Parsing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Prompt</label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={5}
                className="font-mono text-sm"
              />
            </div>

            <Button onClick={testJsonParsing} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test JSON Parsing"
              )}
            </Button>

            {error && (
              <div className="bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 p-4 rounded-md">
                {error}
              </div>
            )}

            {result && (
              <Tabs defaultValue="original">
                <TabsList className="mb-4">
                  <TabsTrigger value="original">Original Response</TabsTrigger>
                  <TabsTrigger value="extracted">Extracted JSON</TabsTrigger>
                  <TabsTrigger value="parsed">Parsed Result</TabsTrigger>
                  <TabsTrigger value="debug">Debug Info</TabsTrigger>
                </TabsList>

                <TabsContent value="original">
                  <div className="bg-muted p-4 rounded-md overflow-auto max-h-[400px]">
                    <pre className="text-xs whitespace-pre-wrap">{result.originalText}</pre>
                  </div>
                </TabsContent>

                <TabsContent value="extracted">
                  <div className="bg-muted p-4 rounded-md overflow-auto max-h-[400px]">
                    <pre className="text-xs whitespace-pre-wrap">{result.extractedJsonText}</pre>
                  </div>
                </TabsContent>

                <TabsContent value="parsed">
                  <div className="bg-muted p-4 rounded-md overflow-auto max-h-[400px]">
                    {result.parseError ? (
                      <div className="text-red-500">Parse Error: {result.parseError}</div>
                    ) : (
                      <pre className="text-xs">{JSON.stringify(result.parsedJson, null, 2)}</pre>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="debug">
                  <div className="bg-muted p-4 rounded-md overflow-auto max-h-[400px]">
                    <div className="space-y-2">
                      <p>
                        <strong>Contains Code Block:</strong> {result.containsCodeBlock ? "Yes" : "No"}
                      </p>
                      <p>
                        <strong>Parse Error:</strong> {result.parseError || "None"}
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
