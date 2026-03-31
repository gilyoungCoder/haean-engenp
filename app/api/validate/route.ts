// app/api/validate/route.ts — Question Validation
// Validates a generated question against the passage using 7-check system.

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/api/_lib/auth'
import { validateQuestion } from '@/lib/services/validator'
import type { StructuredPassage, GeneratedQuestion } from '@/lib/types'

interface ValidateBody {
  passage: StructuredPassage
  question: GeneratedQuestion
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  try {
    const body = (await request.json()) as ValidateBody

    if (!body.passage || !body.question) {
      return NextResponse.json(
        { error: 'passage와 question은 필수입니다.' },
        { status: 400 }
      )
    }

    const result = await validateQuestion(body.passage, body.question)

    return NextResponse.json(result)
  } catch (err: unknown) {
    console.error('[validate] Error:', err)
    const message = err instanceof Error ? err.message : '검증 중 오류가 발생했습니다.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
