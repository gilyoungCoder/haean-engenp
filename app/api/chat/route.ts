// app/api/chat/route.ts — AI Chat (SSE Streaming)
// Uses ReadableStream with async start for Vercel compatibility.

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/api/_lib/auth'
import { connectDB } from '@/lib/mongodb'
import ChatMessage from '@/lib/models/ChatMessage'
import { callClaudeStreamWithMessages } from '@/lib/services/anthropic'
import type {
  ChatMessage as ChatMessageType,
  StructuredPassage,
  GeneratedQuestion,
} from '@/lib/types'

export const maxDuration = 60

interface ChatBody {
  messages: ChatMessageType[]
  context?: {
    passage?: StructuredPassage | null
    questions?: GeneratedQuestion[] | null
  }
  passageId?: string
}

function buildChatSystemPrompt(
  passage?: StructuredPassage | null,
  questions?: GeneratedQuestion[] | null
): string {
  let systemPrompt = `당신은 "Haean AI"입니다. 영어 내신 시험 전문 튜터로서, 한국어로 응답합니다.
영어 문법 설명 시 영어 원문과 한국어 해설을 함께 제공합니다.

## 역할
- 생성된 문제의 수정, 난이도 조절, 해설 보완 등을 도와줍니다.
- 사용자의 요청에 따라 문제를 수정하고, 수정된 결과를 <questions_update> JSON 블록으로 반환합니다.

## 문제 수정 프로토콜
1. 사용자가 수정을 요청하면 → 방법을 제안합니다
2. 사용자가 확인하면 ("네", "좋아요", "해줘", "ok") → 실제 수정을 수행합니다
3. 수정된 문제는 반드시 <questions_update> JSON 블록으로 감싸서 반환합니다
`

  if (passage) {
    systemPrompt += `\n## 현재 지문 컨텍스트
제목: ${passage.title ?? '(제목 없음)'}
난이도: ${passage.estimatedDifficulty}/5
단어 수: ${passage.wordCount}
주제: ${passage.topics?.join(', ') ?? ''}
전문:
${passage.fullText?.substring(0, 2000) ?? ''}
`
  }

  if (questions && questions.length > 0) {
    systemPrompt += `\n## 현재 생성된 문제 (${questions.length}문항)
${questions
  .slice(0, 10)
  .map(
    (q) =>
      `[${q.question_number}번] ${q.type_id} (난이도 ${q.difficulty}) - ${q.test_point}
발문: ${q.instruction}
정답: ${q.answer}`
  )
  .join('\n\n')}
`
  }

  return systemPrompt
}

export async function POST(request: NextRequest): Promise<Response> {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  const { userId } = authResult

  let body: ChatBody
  try {
    body = (await request.json()) as ChatBody
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: 'messages는 필수입니다.' }, { status: 400 })
  }

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          // Client disconnected
        }
      }

      try {
        await connectDB()

        // Save user message
        const latestUserMessage = body.messages[body.messages.length - 1]
        if (latestUserMessage?.role === 'user') {
          try {
            await ChatMessage.create({
              passageId: body.passageId || undefined,
              userId,
              role: 'user',
              content: latestUserMessage.content,
            })
          } catch {
            // Non-critical
          }
        }

        // Build system prompt
        const systemPrompt = buildChatSystemPrompt(
          body.context?.passage,
          body.context?.questions
        )

        // Format messages for Claude
        const claudeMessages = body.messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))

        // Stream response
        let fullResponse = ''

        for await (const chunk of callClaudeStreamWithMessages(
          systemPrompt,
          claudeMessages
        )) {
          fullResponse += chunk
          send({ text: chunk })
        }

        // Send done signal
        try {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } catch {
          // Already closed
        }

        // Save assistant message
        if (fullResponse.trim()) {
          try {
            await ChatMessage.create({
              passageId: body.passageId || undefined,
              userId,
              role: 'assistant',
              content: fullResponse,
            })
          } catch {
            // Non-critical
          }
        }
      } catch (err: unknown) {
        console.error('[chat] Stream error:', err)
        const errorMsg = err instanceof Error ? err.message : '채팅 오류'
        send({ error: errorMsg })
      } finally {
        try {
          controller.close()
        } catch {
          // Already closed
        }
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
