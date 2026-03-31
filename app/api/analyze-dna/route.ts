// app/api/analyze-dna/route.ts — DNA Analysis
// Analyzes school exam images to extract DNA profile (Pro only).

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/api/_lib/auth'
import { connectDB } from '@/lib/mongodb'
import Subscription from '@/lib/models/Subscription'
import UsageLog from '@/lib/models/UsageLog'
import { analyzeDna } from '@/lib/services/dna-analyzer'
import type { DnaExamImage, DnaExamMetadata } from '@/lib/types'

interface AnalyzeDnaBody {
  images: DnaExamImage[]
  metadata?: DnaExamMetadata
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  const { userId } = authResult

  try {
    const body = (await request.json()) as AnalyzeDnaBody

    if (!body.images || !Array.isArray(body.images) || body.images.length === 0) {
      return NextResponse.json(
        { error: '분석할 이미지를 하나 이상 제공해주세요.' },
        { status: 400 }
      )
    }

    if (body.images.length > 20) {
      return NextResponse.json(
        { error: '이미지는 최대 20장까지 제공할 수 있습니다.' },
        { status: 400 }
      )
    }

    await connectDB()

    // Check Pro subscription (DNA is Pro-only)
    const subscription = await Subscription.findOne({ userId })
    const plan = subscription?.plan ?? 'free'

    if (plan !== 'pro') {
      return NextResponse.json(
        {
          error: 'DNA 분석은 Pro 플랜에서만 사용할 수 있습니다.',
          code: 'PRO_REQUIRED',
        },
        { status: 403 }
      )
    }

    // Analyze DNA
    const profile = await analyzeDna(body.images, body.metadata)

    // Track usage
    await UsageLog.create({
      userId,
      action: 'structurize', // DNA analysis uses structurize action category
      metadata: {
        type: 'dna',
        imageCount: body.images.length,
        schoolName: profile.school_name,
      },
    })

    return NextResponse.json(profile)
  } catch (err: unknown) {
    console.error('[analyze-dna] Error:', err)
    const message = err instanceof Error ? err.message : 'DNA 분석 중 오류가 발생했습니다.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
