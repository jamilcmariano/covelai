import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Check if offline mode is enabled
  const offlineMode = request.cookies.get("offlineMode")?.value === "true"

  // If offline mode is enabled and this is an API request to Gemini
  if (offlineMode && request.nextUrl.pathname.startsWith("/api/")) {
    // Add a header to indicate offline mode
    const headers = new Headers(request.headers)
    headers.set("X-Offline-Mode", "true")

    // Create a new request with the modified headers
    const newRequest = new NextRequest(request.url, {
      headers,
      method: request.method,
      body: request.body,
      cache: request.cache,
      credentials: request.credentials,
      integrity: request.integrity,
      keepalive: request.keepalive,
      mode: request.mode,
      redirect: request.redirect,
    })

    return NextResponse.next({
      request: newRequest,
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: "/api/:path*",
}
