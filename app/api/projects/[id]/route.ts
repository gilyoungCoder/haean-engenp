// app/api/projects/[id]/route.ts — Project Delete
// Verifies ownership, then deletes R2 file, ChatMessages, QuestionSets, and Passage.

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/api/_lib/auth'
import { connectDB } from '@/lib/mongodb'
import Passage from '@/lib/models/Passage'
import QuestionSet from '@/lib/models/QuestionSet'
import ChatMessage from '@/lib/models/ChatMessage'
import { deleteFromR2, downloadFromR2 } from '@/lib/r2'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  const { userId } = authResult

  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: '프로젝트 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    await connectDB()

    const passage = await Passage.findOne({ _id: id, userId }).lean()
    if (!passage) {
      return NextResponse.json(
        { error: '프로젝트를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const questionSets = await QuestionSet.find({ passageId: id }).lean()
    const questions = questionSets.flatMap(
      (qs: Record<string, unknown>) =>
        (qs.questions as Record<string, unknown>[]) ?? []
    )

    const chatMessages = await ChatMessage.find({ passageId: id, userId }).sort({ createdAt: 1 }).lean()

    // Download file from R2 for base64 display
    let fileBase64 = ''
    let fileContentType = ''
    if (passage.originalFileKey) {
      try {
        const downloaded = await downloadFromR2(passage.originalFileKey as string)
        fileBase64 = downloaded.base64
        fileContentType = downloaded.contentType
      } catch {
        // Non-critical: file preview won't work but data still loads
      }
    }

    return NextResponse.json({ passage, questions, chatMessages, fileBase64, fileContentType })
  } catch (err: unknown) {
    console.error('[projects/get] Error:', err)
    const message = err instanceof Error ? err.message : '프로젝트 로드 중 오류가 발생했습니다.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  const { userId } = authResult

  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: '프로젝트 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    await connectDB()

    // Find passage and verify ownership
    const passage = await Passage.findById(id)

    if (!passage) {
      return NextResponse.json(
        { error: '프로젝트를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (String(passage.userId) !== userId) {
      return NextResponse.json(
        { error: '삭제 권한이 없습니다.' },
        { status: 403 }
      )
    }

    // Delete in order: R2 file, ChatMessages, QuestionSets, Passage
    // 1. Delete R2 file (if exists)
    if (passage.originalFileKey) {
      try {
        await deleteFromR2(passage.originalFileKey)
      } catch (r2Err) {
        // Log but don't fail the whole delete if R2 cleanup fails
        console.warn('[projects/delete] R2 delete failed:', r2Err)
      }
    }

    // 2. Delete chat messages
    await ChatMessage.deleteMany({ passageId: id })

    // 3. Delete question sets
    await QuestionSet.deleteMany({ passageId: id })

    // 4. Delete passage
    await Passage.findByIdAndDelete(id)

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('[projects/delete] Error:', err)
    const message = err instanceof Error ? err.message : '프로젝트 삭제 중 오류가 발생했습니다.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
