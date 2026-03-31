// app/api/structurize/route.ts — VLM Structurization
// Routes to appropriate structurizer method based on input type.

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/api/_lib/auth'
import { connectDB } from '@/lib/mongodb'
import Passage from '@/lib/models/Passage'
import UsageLog from '@/lib/models/UsageLog'
import {
  structurizeFromBase64,
  structurizeFromUrl,
  structurizeFromPdf,
} from '@/lib/services/structurizer'
import type { ImageMediaType } from '@/lib/types'

export const maxDuration = 60

interface StructurizeBody {
  fileUrl?: string
  base64?: string
  mediaType?: ImageMediaType
  passageId?: string
  pdfBuffer?: string // base64-encoded PDF
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  const { userId } = authResult

  try {
    const body = (await request.json()) as StructurizeBody

    await connectDB()

    let result

    if (body.pdfBuffer) {
      // PDF path: base64-encoded PDF buffer
      const buffer = Buffer.from(body.pdfBuffer, 'base64')
      result = await structurizeFromPdf(buffer)
    } else if (body.base64 && (body.mediaType as string) === 'application/pdf') {
      // PDF uploaded as base64 — route to text extraction, not Vision API
      const buffer = Buffer.from(body.base64, 'base64')
      result = await structurizeFromPdf(buffer)
    } else if (body.base64 && body.mediaType) {
      // Image base64 path (JPG/PNG)
      result = await structurizeFromBase64(
        body.base64,
        body.mediaType
      )
    } else if (body.fileUrl) {
      // URL path (image)
      result = await structurizeFromUrl(body.fileUrl)
    } else {
      return NextResponse.json(
        { error: 'fileUrl, base64+mediaType, 또는 pdfBuffer 중 하나를 제공해야 합니다.' },
        { status: 400 }
      )
    }

    // Save structuredData to Passage (for project restore)
    if (body.passageId) {
      try {
        await Passage.findByIdAndUpdate(body.passageId, {
          structuredData: result,
          status: 'completed',
        })
      } catch {
        // Non-critical: continue even if save fails
      }
    }

    // Track usage
    await UsageLog.create({
      userId,
      action: 'structurize',
      metadata: {
        passageId: body.passageId,
        inputType: body.pdfBuffer ? 'pdf' : body.base64 ? 'base64' : 'url',
      },
    })

    return NextResponse.json({ passage: result })
  } catch (err: unknown) {
    console.error('[structurize] Error:', err)
    const message = err instanceof Error ? err.message : '구조화 중 오류가 발생했습니다.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
