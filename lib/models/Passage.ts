// lib/models/Passage.ts — Mongoose Passage schema

import mongoose, { Schema, Document, Model, Types } from 'mongoose'
import type { StructuredPassage } from '@/lib/types'

export interface IPassage extends Document {
  userId: Types.ObjectId
  title?: string
  source?: string
  originalFileUrl?: string
  originalFileName?: string
  originalFileKey?: string
  structuredData?: StructuredPassage
  status: 'pending' | 'processing' | 'completed' | 'failed'
  errorMessage?: string
  createdAt: Date
  updatedAt: Date
}

const PassageSchema = new Schema<IPassage>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String },
    source: { type: String },
    originalFileUrl: { type: String },
    originalFileName: { type: String },
    originalFileKey: { type: String },
    structuredData: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    errorMessage: { type: String },
  },
  { timestamps: true }
)

const Passage: Model<IPassage> =
  mongoose.models.Passage ||
  mongoose.model<IPassage>('Passage', PassageSchema)

export default Passage
