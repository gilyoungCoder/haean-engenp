import type { Metadata } from "next"
import type { ReactNode } from "react"
import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "sonner"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "Haean — AI 영어 변형문제 생성기",
    template: "%s | Haean",
  },
  description: "학교 시험 지문을 업로드하면 AI가 고품질 변형문제, 워크북, 동형 모의고사를 자동 생성합니다. 영어 내신 대비의 새로운 기준.",
  keywords: ["영어 변형문제", "내신 대비", "AI 문제 생성", "워크북", "동형 모의고사", "수능 영어", "해안"],
  authors: [{ name: "Haean", url: "https://engenp-v2.vercel.app" }],
  creator: "Haean",
  publisher: "Haean",
  metadataBase: new URL("https://engenp-v2.vercel.app"),
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://engenp-v2.vercel.app",
    siteName: "Haean",
    title: "Haean — AI 영어 변형문제 생성기",
    description: "학교 시험 지문을 업로드하면 AI가 고품질 변형문제, 워크북, 동형 모의고사를 자동 생성합니다.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Haean AI 영어 변형문제 생성기" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Haean — AI 영어 변형문제 생성기",
    description: "학교 시험 지문 업로드 → AI 변형문제 자동 생성",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/favicon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="font-sans antialiased">
        <SessionProvider>
          <ThemeProvider defaultTheme="light" storageKey="haean-theme">
            {children}
            <Toaster position="top-center" richColors />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
