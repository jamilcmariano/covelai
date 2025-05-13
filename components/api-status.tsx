"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CheckCircle, XCircle, AlertCircle, Clock, Info } from "lucide-react"

export function ApiStatus() {
  const [status, setStatus] = useState<"checking" | "online" | "offline" | "rate-limited" | "model-error">("checking")
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [retryAfter, setRetryAfter] = useState<number | null>(null)
  const [modelInfo, setModelInfo] = useState<string | null>(null)

  useEffect(() => {
    const checkApiStatus = async () => {
      // If we're rate limited, don't check again until the retry time has passed
      if (status === "rate-limited" && retryAfter && Date.now() < retryAfter) {
        return
      }

      try {
        // Simple test to check if the API is working
        const response = await fetch("/api/field-suggestion", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            field: "skills",
            currentValue: "",
            jobTitle: "Test Position",
            companyName: "Test Company",
          }),
        })

        if (response.ok) {
          const data = await response.json()

          if (data.source === "fallback") {
            setStatus("model-error")
            setErrorMessage("Using fallback responses due to model availability issues")
            setModelInfo(data.modelInfo || null)
          } else {
            setStatus("online")
            setErrorMessage(null)
            setRetryAfter(null)
          }
        } else {
          const errorData = await response.json()

          // Check if it's a rate limit error
          if (response.status === 429) {
            setStatus("rate-limited")
            // Set retry after to current time + 60 seconds (or use the Retry-After header if available)
            const retryAfterHeader = response.headers.get("Retry-After")
            const retrySeconds = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : 60
            setRetryAfter(Date.now() + retrySeconds * 1000)
          } else if (response.status === 404 && errorData.error?.includes("model")) {
            setStatus("model-error")
            setModelInfo(errorData.error || "Model not found")
          } else {
            setStatus("offline")
          }

          setErrorMessage(errorData.error || "Unknown error")
        }
      } catch (error) {
        setStatus("offline")
        setErrorMessage(error instanceof Error ? error.message : "Unknown error")
      }

      setLastChecked(new Date())
    }

    checkApiStatus()
    // Check status every 5 minutes
    const interval = setInterval(checkApiStatus, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [status, retryAfter])

  // Calculate time remaining for rate limit
  const getTimeRemaining = () => {
    if (!retryAfter) return null

    const seconds = Math.max(0, Math.floor((retryAfter - Date.now()) / 1000))
    if (seconds <= 0) return null

    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const timeRemaining = getTimeRemaining()

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center">
            <Badge
              variant="outline"
              className={`flex items-center gap-1 ${
                status === "online"
                  ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                  : status === "rate-limited"
                    ? "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
                    : status === "model-error"
                      ? "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400"
                      : status === "offline"
                        ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                        : "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
              }`}
            >
              {status === "online" ? (
                <CheckCircle className="h-3 w-3" />
              ) : status === "rate-limited" ? (
                <Clock className="h-3 w-3" />
              ) : status === "model-error" ? (
                <Info className="h-3 w-3" />
              ) : status === "offline" ? (
                <XCircle className="h-3 w-3" />
              ) : (
                <AlertCircle className="h-3 w-3" />
              )}
              <span>
                AI: {" "}
                {status === "online"
                  ? "Online"
                  : status === "rate-limited"
                    ? "Rate Limited"
                    : status === "model-error"
                      ? "Model Issue"
                      : status === "offline"
                        ? "Offline"
                        : "Checking..."}
                {timeRemaining && ` (${timeRemaining})`}
              </span>
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {status === "rate-limited" ? (
            <div>
              <p>Rate limit exceeded. Using fallback responses.</p>
              {timeRemaining && <p>Retry in: {timeRemaining}</p>}
              <p>Last checked: {lastChecked?.toLocaleTimeString()}</p>
            </div>
          ) : status === "model-error" ? (
            <div>
              <p>Model availability issue. Using fallback responses.</p>
              {modelInfo && <p>Details: {modelInfo}</p>}
              <p>Last checked: {lastChecked?.toLocaleTimeString()}</p>
            </div>
          ) : status === "offline" && errorMessage ? (
            <div>
              <p>Error: {errorMessage}</p>
              <p>Last checked: {lastChecked?.toLocaleTimeString()}</p>
            </div>
          ) : lastChecked ? (
            `Last checked: ${lastChecked.toLocaleTimeString()}`
          ) : (
            "Checking API status..."
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
