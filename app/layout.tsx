import { Doto, Geist_Mono, Space_Grotesk } from "next/font/google"
import type { Metadata } from "next"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { SettingsProvider } from "@/components/settings-context"
import { cn } from "@/lib/utils";

const spaceGrotesk = Space_Grotesk({subsets:['latin'],variable:'--font-sans'})

const doto = Doto({ subsets: ['latin'], variable: '--font-doto' })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "KeyZen — Typing Speed Test",
  description:
    "Measure and improve your typing speed and accuracy with Typecraft. A clean, minimal typing test with time and word modes, punctuation support, and real-time WPM tracking.",
  keywords: [
    "typing test",
    "typing speed",
    "wpm test",
    "words per minute",
    "typing practice",
    "typing trainer",
    "KeyZen",
    "monkeytype alternative",
  ],
  authors: [{ name: "KeyZen" }],
  creator: "Shiva Bhattacharjee",
  metadataBase: new URL("https://KeyZen.theshiva.xyz"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://KeyZen.theshiva.xyz",
    title: "KeyZen — Typing Speed Test",
    description:
      "Measure and improve your typing speed with a clean, distraction-free typing test. Real-time WPM, accuracy tracking, time and word modes.",
    siteName: "KeyZen",
  },
  twitter: {
    card: "summary_large_image",
    title: "KeyZen — Typing Speed Test",
    description:
      "A clean, minimal typing test. Track your WPM and accuracy in real-time.",
    creator: "@KeyZen",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", spaceGrotesk.variable, doto.variable)}
    >
      <body>
        <ThemeProvider>
          <SettingsProvider>{children}</SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
