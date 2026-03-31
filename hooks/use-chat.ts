"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import type { ChatMessage, StructuredPassage, GeneratedQuestion } from "@/lib/types"

interface ChatContext {
  passage?: StructuredPassage | null
  questions?: GeneratedQuestion[] | null
}

interface QuestionsUpdateEvent {
  questions: GeneratedQuestion[]
}

interface UseChatReturn {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  sendMessage: (content: string, context?: ChatContext) => Promise<void>
  clearMessages: () => void
  questionsUpdate: GeneratedQuestion[] | null
}

export function useChat(passageId?: string): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [questionsUpdate, setQuestionsUpdate] = useState<GeneratedQuestion[] | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Load chat history from DB when passageId changes, clear on null
  useEffect(() => {
    if (!passageId) {
      setMessages([])
      setError(null)
      setQuestionsUpdate(null)
      return
    }
    let cancelled = false

    async function loadHistory() {
      try {
        const res = await fetch(`/api/projects/${passageId}`)
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (cancelled) return
        if (data.chatMessages && Array.isArray(data.chatMessages) && data.chatMessages.length > 0) {
          const restored: ChatMessage[] = data.chatMessages.map(
            (m: { role: string; content: string }) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            })
          )
          setMessages(restored)
        } else {
          setMessages([])
        }
      } catch {
        // Non-critical: chat works without history
      }
    }

    loadHistory()
    return () => { cancelled = true }
  }, [passageId])

  const sendMessage = useCallback(
    async (content: string, context?: ChatContext) => {
      setError(null)
      setQuestionsUpdate(null)

      const userMessage: ChatMessage = { role: "user", content }
      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)

      try {
        abortControllerRef.current = new AbortController()

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            context: context ?? {},
            passageId,
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ error: "채팅 요청 실패" }))
          throw new Error(errData.error ?? `HTTP ${response.status}`)
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error("스트림을 읽을 수 없습니다")

        const decoder = new TextDecoder()
        let assistantText = ""
        let buffer = ""

        setMessages((prev) => [...prev, { role: "assistant", content: "" }])

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue
            const payload = line.slice(6).trim()
            if (payload === "[DONE]") continue

            try {
              const parsed = JSON.parse(payload) as { text?: string; error?: string }
              if (parsed.error) {
                setError(parsed.error)
                break
              }
              if (parsed.text) {
                assistantText += parsed.text

                // Detect <questions_update> JSON blocks
                const updateMatch = assistantText.match(
                  /<questions_update>([\s\S]*?)<\/questions_update>/
                )
                if (updateMatch) {
                  try {
                    const updateData: unknown = JSON.parse(updateMatch[1])
                    // Handle both { questions: [...] } and direct [...]
                    const questions = Array.isArray(updateData)
                      ? (updateData as GeneratedQuestion[])
                      : (updateData as QuestionsUpdateEvent).questions
                    if (questions) {
                      setQuestionsUpdate(questions)
                    }
                  } catch {
                    // Incomplete JSON block, wait for more data
                  }
                }

                // Display text without the questions_update block (complete or partial)
                const displayText = assistantText
                  .replace(/<questions_update>[\s\S]*?<\/questions_update>/g, "")
                  .replace(/<questions_update>[\s\S]*$/, "")
                  .trim()

                setMessages((prev) => {
                  const updated = [...prev]
                  const last = updated[updated.length - 1]
                  if (last && last.role === "assistant") {
                    updated[updated.length - 1] = { ...last, content: displayText }
                  }
                  return updated
                })
              }
            } catch {
              // Skip non-JSON lines
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return
        const message = err instanceof Error ? err.message : "알 수 없는 오류"
        setError(message)
      } finally {
        setIsLoading(false)
        abortControllerRef.current = null
      }
    },
    [messages, passageId]
  )

  const clearMessages = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setMessages([])
    setError(null)
    setQuestionsUpdate(null)
  }, [])

  return { messages, isLoading, error, sendMessage, clearMessages, questionsUpdate }
}
