// lib/db-helpers.ts — CRUD helpers using Mongoose models

import { connectDB } from './mongodb'
import {
  Passage,
  QuestionSet,
  ChatMessage,
  Subscription,
  UsageLog,
  type IPassage,
  type IQuestionSet,
  type IChatMessage,
  type ISubscription,
  type IUsageLog,
} from './models'
import type { UsageAction } from './models/UsageLog'
import { deleteFromR2 } from './r2'

// ─── Passage ───────────────────────────────────────────────────────────────

export async function getPassagesByUser(userId: string) {
  await connectDB()
  return Passage.find({ userId }).sort({ createdAt: -1 }).lean()
}

export async function getPassageById(passageId: string, userId: string) {
  await connectDB()
  return Passage.findOne({ _id: passageId, userId }).lean()
}

export async function createPassage(data: Partial<IPassage>) {
  await connectDB()
  return Passage.create(data)
}

export async function updatePassage(
  passageId: string,
  userId: string,
  data: Partial<IPassage>
) {
  await connectDB()
  return Passage.findOneAndUpdate(
    { _id: passageId, userId },
    { $set: data },
    { new: true }
  ).lean()
}

export async function deletePassageAndRelated(
  passageId: string,
  userId: string
): Promise<boolean> {
  await connectDB()

  const passage = await Passage.findOne({ _id: passageId, userId })
  if (!passage) return false

  if (passage.originalFileKey) {
    try {
      await deleteFromR2(passage.originalFileKey)
    } catch (err) {
      console.error('[db-helpers] Failed to delete R2 file:', err)
    }
  }

  await Promise.all([
    ChatMessage.deleteMany({ passageId }),
    QuestionSet.deleteMany({ passageId }),
    Passage.deleteOne({ _id: passageId, userId }),
  ])

  return true
}

// ─── QuestionSet ───────────────────────────────────────────────────────────

export async function getQuestionSetsByPassage(passageId: string) {
  await connectDB()
  return QuestionSet.find({ passageId }).sort({ createdAt: -1 }).lean()
}

export async function createQuestionSet(data: Partial<IQuestionSet>) {
  await connectDB()
  return QuestionSet.create(data)
}

// ─── ChatMessage ───────────────────────────────────────────────────────────

export async function getChatMessages(passageId: string, userId: string) {
  await connectDB()
  return ChatMessage.find({ passageId, userId }).sort({ createdAt: 1 }).lean()
}

export async function createChatMessage(data: Partial<IChatMessage>) {
  await connectDB()
  return ChatMessage.create(data)
}

// ─── Subscription ──────────────────────────────────────────────────────────

export async function getUserSubscription(userId: string) {
  await connectDB()
  return Subscription.findOne({ userId }).lean()
}

// ─── UsageLog ──────────────────────────────────────────────────────────────

export async function getUsageCount(
  userId: string,
  action: UsageAction,
  sinceDate: Date
): Promise<number> {
  await connectDB()
  return UsageLog.countDocuments({
    userId,
    action,
    createdAt: { $gte: sinceDate },
  })
}

export async function createUsageLog(data: Partial<IUsageLog>) {
  await connectDB()
  return UsageLog.create(data)
}
