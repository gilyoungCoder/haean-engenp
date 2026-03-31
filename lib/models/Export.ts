// lib/models/Export.ts — Mongoose Export schema

import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export interface IExport extends Document {
  userId: Types.ObjectId
  questionSetId?: Types.ObjectId
  format: 'docx' | 'pdf' | 'json'
  options?: Record<string, unknown>
  fileKey?: string
  fileUrl?: string
  createdAt: Date
  updatedAt: Date
}

const ExportSchema = new Schema<IExport>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    questionSetId: {
      type: Schema.Types.ObjectId,
      ref: 'QuestionSet',
    },
    format: {
      type: String,
      enum: ['docx', 'pdf', 'json'],
    },
    options: { type: Schema.Types.Mixed },
    fileKey: { type: String },
    fileUrl: { type: String },
  },
  { timestamps: true }
)

const Export: Model<IExport> =
  mongoose.models.Export ||
  mongoose.model<IExport>('Export', ExportSchema)

export default Export
