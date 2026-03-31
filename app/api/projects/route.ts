// app/api/projects/route.ts — Project List
// Returns all passages for the authenticated user with question set counts.

import { NextResponse } from 'next/server'
import { requireAuth } from '@/app/api/_lib/auth'
import { connectDB } from '@/lib/mongodb'
import Passage from '@/lib/models/Passage'
import QuestionSet from '@/lib/models/QuestionSet'
import UsageLog from '@/lib/models/UsageLog'

interface ProjectItem {
  _id: string
  title: string | null
  originalFileName: string | null
  status: string
  createdAt: string
  questionCount: number
}

export async function GET(): Promise<NextResponse> {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  const { userId } = authResult

  try {
    await connectDB()

    // Fetch passages sorted by creation date descending
    const passages = await Passage.find({ userId })
      .sort({ createdAt: -1 })
      .select('title originalFileName status createdAt')
      .lean()

    // Fetch question set counts for all passages in one query
    const passageIds = passages.map((p) => p._id)
    const questionSetCounts = await QuestionSet.aggregate<{
      _id: string
      count: number
      totalQuestions: number
    }>([
      { $match: { passageId: { $in: passageIds } } },
      {
        $group: {
          _id: '$passageId',
          count: { $sum: 1 },
          totalQuestions: { $sum: { $size: '$questions' } },
        },
      },
    ])

    // Build count map
    const countMap = new Map<string, number>()
    for (const item of questionSetCounts) {
      countMap.set(String(item._id), item.totalQuestions)
    }

    // Map to response format
    const projects: ProjectItem[] = passages.map((p) => ({
      _id: String(p._id),
      title: p.title ?? null,
      originalFileName: p.originalFileName ?? null,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
      questionCount: countMap.get(String(p._id)) ?? 0,
    }))

    // Calculate monthly usage
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const usageCounts = await UsageLog.aggregate<{ _id: string; count: number }>([
      { $match: { userId, createdAt: { $gte: startOfMonth } } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
    ])

    const usageMap = new Map(usageCounts.map((u) => [u._id, u.count]))
    const monthlyUsage = {
      generate: usageMap.get('generate') ?? 0,
      export: usageMap.get('export') ?? 0,
      chat: usageMap.get('chat') ?? 0,
      structurize: usageMap.get('structurize') ?? 0,
    }

    return NextResponse.json({ projects, monthlyUsage })
  } catch (err: unknown) {
    console.error('[projects] Error:', err)
    const message = err instanceof Error ? err.message : '프로젝트 목록 조회 중 오류가 발생했습니다.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
