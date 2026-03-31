"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Send, Bot, User, TrendingUp, PlusCircle, BookOpen, Shuffle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useChat } from "@/hooks/use-chat"
import type { StructuredPassage, GeneratedQuestion } from "@/lib/types"

interface AIChatSidebarProps {
  context?: {
    passage?: StructuredPassage | null
    questions?: GeneratedQuestion[] | null
  }
  onQuestionsUpdate?: (questions: GeneratedQuestion[]) => void
  passageId?: string
}

const QUICK_PROMPTS: Array<{ text: string; icon: React.ReactNode }> = [
  { text: "난이도 올려줘", icon: <TrendingUp className="h-3 w-3 shrink-0 text-muted-foreground" /> },
  { text: "문제 추가해줘", icon: <PlusCircle className="h-3 w-3 shrink-0 text-muted-foreground" /> },
  { text: "해설 자세히", icon: <BookOpen className="h-3 w-3 shrink-0 text-muted-foreground" /> },
  { text: "다른 유형으로", icon: <Shuffle className="h-3 w-3 shrink-0 text-muted-foreground" /> },
]

export function AIChatSidebar({
  context,
  onQuestionsUpdate,
  passageId,
}: AIChatSidebarProps) {
  const { messages, isLoading, error, sendMessage, clearMessages, questionsUpdate } =
    useChat(passageId)
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Propagate questions update
  useEffect(() => {
    if (questionsUpdate && onQuestionsUpdate) {
      onQuestionsUpdate(questionsUpdate)
    }
  }, [questionsUpdate, onQuestionsUpdate])

  const handleSend = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return
    setInput("")
    sendMessage(trimmed, context ?? undefined)
  }, [input, isLoading, sendMessage, context])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const handleQuickPrompt = useCallback(
    (prompt: string) => {
      if (isLoading) return
      sendMessage(prompt, context ?? undefined)
    },
    [isLoading, sendMessage, context]
  )

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  }

  return (
    <div className="flex flex-col h-full w-full md:w-[480px] md:shrink-0 border-l border-border bg-background">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">AI 채팅</h3>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={clearMessages}
          >
            초기화
          </Button>
        )}
      </div>

      {/* Quick prompts */}
      {messages.length === 0 && (
        <div className="shrink-0 px-4 py-3 border-b border-border">
          <p className="text-xs text-muted-foreground mb-2">빠른 명령어</p>
          <div className="grid grid-cols-2 gap-1.5">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt.text}
                className="text-xs px-2.5 py-2 rounded-md border border-border hover:bg-muted hover:border-primary/30 transition-colors text-left flex items-center gap-1.5"
                onClick={() => handleQuickPrompt(prompt.text)}
                disabled={isLoading}
              >
                {prompt.icon}
                {prompt.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                msg.role === "user"
                  ? ""
                  : "bg-background border border-border text-foreground"
              }`}
              style={msg.role === "user" ? { backgroundColor: "#7c3aed", color: "#ffffff" } : undefined}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {msg.role === "assistant" ? (
                  <Bot className="h-3 w-3 shrink-0" />
                ) : (
                  <User className="h-3 w-3 shrink-0" />
                )}
                <span className="text-[10px] opacity-70">
                  {formatTime(new Date())}
                </span>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-3 py-2 flex items-center gap-1">
              <span className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs text-destructive text-center">{error}</p>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-border p-3">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요..."
            className="resize-none min-h-[40px] max-h-[120px] text-sm"
            rows={1}
            disabled={isLoading}
          />
          <Button
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
