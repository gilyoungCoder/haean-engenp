// app/api/generate/route.ts — Question Generation
// Validates input, checks subscription limits, generates questions.

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/api/_lib/auth'
import { connectDB } from '@/lib/mongodb'
import Subscription from '@/lib/models/Subscription'
import QuestionSet from '@/lib/models/QuestionSet'
import UsageLog from '@/lib/models/UsageLog'
import { generateQuestions } from '@/lib/services/generator'
import type {
  StructuredPassage,
  GenerationOptions,
  SchoolDnaProfile,
} from '@/lib/types'

export const maxDuration = 60

const MAX_FULLTEXT_LENGTH = 50000
const MAX_BODY_SIZE = 500 * 1024 // 500KB

interface GenerateBody {
  passage: StructuredPassage
  options: GenerationOptions
  dnaProfile?: SchoolDnaProfile | null
  passageId?: string
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  const { userId } = authResult

  try {
    // Check body size
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
      return NextResponse.json(
        { error: '요청 크기가 500KB를 초과했습니다.' },
        { status: 400 }
      )
    }

    const body = (await request.json()) as GenerateBody

    // Validate required fields
    if (!body.passage || !body.options) {
      return NextResponse.json(
        { error: 'passage와 options는 필수입니다.' },
        { status: 400 }
      )
    }

    // Validate passage text length
    if (
      body.passage.fullText &&
      body.passage.fullText.length > MAX_FULLTEXT_LENGTH
    ) {
      return NextResponse.json(
        { error: `지문 텍스트가 ${MAX_FULLTEXT_LENGTH}자를 초과했습니다.` },
        { status: 400 }
      )
    }

    // Validate options
    if (
      !Array.isArray(body.options.types) ||
      body.options.types.length === 0
    ) {
      return NextResponse.json(
        { error: '문제 유형을 하나 이상 선택해주세요.' },
        { status: 400 }
      )
    }

    await connectDB()

    // Check subscription limits
    const subscription = await Subscription.findOne({ userId })
    const plan = subscription?.plan ?? 'free'

    if (plan === 'free') {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const monthlyUsage = await UsageLog.countDocuments({
        userId,
        action: 'generate',
        createdAt: { $gte: startOfMonth },
      })

      if (monthlyUsage >= 10) {
        return NextResponse.json(
          {
            error: '무료 플랜의 월간 생성 한도(10회)를 초과했습니다. Pro 플랜으로 업그레이드해주세요.',
            code: 'LIMIT_EXCEEDED',
          },
          { status: 403 }
        )
      }
    }

    // Cap total questions to prevent Vercel 60s timeout
    // Sonnet generates ~10 questions in 25-35s safely
    const MAX_TOTAL_QUESTIONS = 10
    const totalRequested = body.options.types.length * body.options.count
    if (totalRequested > MAX_TOTAL_QUESTIONS) {
      body.options.count = Math.max(1, Math.floor(MAX_TOTAL_QUESTIONS / body.options.types.length))
    }

    // Generate questions
    const questions = await generateQuestions(
      body.passage,
      body.options,
      body.dnaProfile ?? undefined
    )

    // Save questions to QuestionSet (for project restore)
    if (body.passageId) {
      try {
        await QuestionSet.create({
          userId,
          passageId: body.passageId,
          title: body.passage.title ?? '생성된 문제',
          options: body.options,
          status: 'completed',
          questions,
        })
      } catch {
        // Non-critical
      }
    }

    // Track usage
    await UsageLog.create({
      userId,
      action: 'generate',
      metadata: {
        types: body.options.types,
        count: body.options.count,
        difficulty: body.options.difficulty,
        generationMode: body.options.generationMode,
        questionsGenerated: questions.length,
      },
    })

    return NextResponse.json({ questions })
  } catch (err: unknown) {
    console.error('[generate] Error:', err)
    const message = err instanceof Error ? err.message : '문제 생성 중 오류가 발생했습니다.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
