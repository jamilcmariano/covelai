import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import Header from "@/components/header";
import Footer from "@/components/footer";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "AI-Powered Job Application Letter Generator | CovelAI",
    template: "%s | CovelAI",
  },
  description:
    "Create perfect HR-approved job application letters in minutes using AI. Customizable templates, industry-specific phrasing, and professional formats.",
  keywords: [
    "AI cover letter",
    "job application generator",
    "employment letter",
    "career tools",
    "HR-approved letters",
  ],
  metadataBase: new URL("https://covelai.vercel.app"),

  alternates: {
    canonical: "/",
  },

  openGraph: {
    title: "AI Job Application Letter Generator | CovelAI",
    description:
      "Create professional job application letters in minutes with AI",
    url: "https://covelai.vercel.app",
    siteName: "CovelAI",
    images: [
      {
        url: "/og-image.webp", // Create 1200x630 image and place in /public
        width: 1200,
        height: 630,
        alt: "CovelAI Cover Letter Generator",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "AI-Powered Job Application Letter Generator",
    description: "Generate professional cover letters in minutes with CovelAI",
    images: ["https://covelai.vercel.app/og-image.webp"],
    creator: "@covelai",
  },

  verification: {
    google: "469869013",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preload" href="/og-image.webp" as="image" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* Add Google Analytics Scripts */}
          <Script
            src="https://www.googletagmanager.com/gtag/js?id=G-469869013"
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-469869013');
          `}
          </Script>
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
