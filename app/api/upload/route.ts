// app/api/upload/route.ts — File Upload to R2
// Accepts FormData, validates file, uploads to R2, creates Passage record.

import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { requireAuth } from '@/app/api/_lib/auth'
import { connectDB } from '@/lib/mongodb'
import Passage from '@/lib/models/Passage'
import { uploadToR2 } from '@/lib/r2'

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
])

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  const { userId } = authResult

  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: '파일을 선택해주세요.' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'PDF, JPG, PNG 파일만 업로드할 수 있습니다.' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: '파일 크기는 10MB 이하여야 합니다.' },
        { status: 400 }
      )
    }

    await connectDB()

    // Generate passage ID for R2 key
    const passageId = new Types.ObjectId()
    const originalFileName = file.name
    const r2Key = `${userId}/${passageId.toString()}/${originalFileName}`

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to R2
    const fileUrl = await uploadToR2(r2Key, buffer, file.type)

    // Create Passage record with date/time title
    const now = new Date()
    const title = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const passage = await Passage.create({
      _id: passageId,
      userId,
      title,
      originalFileName,
      originalFileUrl: fileUrl,
      originalFileKey: r2Key,
      status: 'pending',
    })

    return NextResponse.json(
      {
        passage: {
          _id: passage._id.toString(),
          originalFileName: passage.originalFileName,
          originalFileUrl: passage.originalFileUrl,
          status: passage.status,
        },
      },
      { status: 201 }
    )
  } catch (err: unknown) {
    console.error('[upload] Error:', err)
    const message = err instanceof Error ? err.message : '파일 업로드 중 오류가 발생했습니다.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
