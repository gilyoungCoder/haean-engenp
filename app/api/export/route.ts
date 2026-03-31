// app/api/export/route.ts — DOCX Export
// Generates a DOCX file from passage + questions and returns it as a download.

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/api/_lib/auth'
import { connectDB } from '@/lib/mongodb'
import Subscription from '@/lib/models/Subscription'
import UsageLog from '@/lib/models/UsageLog'
import { exportToDocx } from '@/lib/services/exporter'
import type {
  StructuredPassage,
  GeneratedQuestion,
  ExportOptions,
} from '@/lib/types'

interface ExportBody {
  passage: StructuredPassage
  questions: GeneratedQuestion[]
  options: ExportOptions
}

export async function POST(request: NextRequest): Promise<Response> {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  const { userId } = authResult

  try {
    const body = (await request.json()) as ExportBody

    if (!body.passage || !body.questions || !body.options) {
      return NextResponse.json(
        { error: 'passage, questions, options는 필수입니다.' },
        { status: 400 }
      )
    }

    await connectDB()

    // Check export limit for free plan
    const subscription = await Subscription.findOne({ userId })
    const plan = subscription?.plan ?? 'free'

    if (plan === 'free') {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const monthlyExports = await UsageLog.countDocuments({
        userId,
        action: 'export',
        createdAt: { $gte: startOfMonth },
      })

      if (monthlyExports >= 5) {
        return NextResponse.json(
          {
            error: '무료 플랜의 월간 내보내기 한도(5회)를 초과했습니다. Pro 플랜으로 업그레이드해주세요.',
            code: 'LIMIT_EXCEEDED',
          },
          { status: 403 }
        )
      }
    }

    // Generate DOCX
    const docxBuffer = await exportToDocx(
      body.passage,
      body.questions,
      body.options
    )

    // Track usage
    await UsageLog.create({
      userId,
      action: 'export',
      metadata: {
        format: body.options.format,
        questionCount: body.questions.length,
        includeAnswers: body.options.includeAnswers,
        includeExplanations: body.options.includeExplanations,
      },
    })

    // Build filename
    const title = body.passage.title ?? '문제'
    const date = new Date().toISOString().slice(0, 10)
    const filename = `${title}_${date}.docx`

    return new Response(new Uint8Array(docxBuffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': String(docxBuffer.byteLength),
      },
    })
  } catch (err: unknown) {
    console.error('[export] Error:', err)
    const message = err instanceof Error ? err.message : '내보내기 중 오류가 발생했습니다.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
