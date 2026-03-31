// lib/models/UsageLog.ts — Mongoose UsageLog schema

import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export type UsageAction = 'structurize' | 'generate' | 'validate' | 'export' | 'chat'

export interface IUsageLog extends Document {
  userId: Types.ObjectId
  action: UsageAction
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

const UsageLogSchema = new Schema<IUsageLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ['structurize', 'generate', 'validate', 'export', 'chat'],
    },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
)

const UsageLog: Model<IUsageLog> =
  mongoose.models.UsageLog ||
  mongoose.model<IUsageLog>('UsageLog', UsageLogSchema)

export default UsageLog
