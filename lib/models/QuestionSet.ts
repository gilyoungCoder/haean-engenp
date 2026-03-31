// lib/models/QuestionSet.ts — Mongoose QuestionSet schema with embedded Question subdocument

import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export interface IQuestion {
  _id: Types.ObjectId
  type?: string
  questionNumber?: number
  difficulty?: number
  instruction?: string
  passageWithMarkers?: string
  choices?: string[]
  answer?: string
  explanation?: string
  testPoint?: string
  isValidated: boolean
  validationResult?: Record<string, unknown>
}

export interface IQuestionSet extends Document {
  userId: Types.ObjectId
  passageId?: Types.ObjectId
  title?: string
  options?: Record<string, unknown>
  status: 'pending' | 'processing' | 'completed' | 'failed'
  errorMessage?: string
  questions: IQuestion[]
  createdAt: Date
  updatedAt: Date
}

const QuestionSchema = new Schema<IQuestion>(
  {
    type: { type: String },
    questionNumber: { type: Number },
    difficulty: { type: Number, min: 1, max: 5 },
    instruction: { type: String },
    passageWithMarkers: { type: String },
    choices: [{ type: String }],
    answer: { type: String },
    explanation: { type: String },
    testPoint: { type: String },
    isValidated: { type: Boolean, default: false },
    validationResult: { type: Schema.Types.Mixed },
  },
  { _id: true }
)

const QuestionSetSchema = new Schema<IQuestionSet>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    passageId: {
      type: Schema.Types.ObjectId,
      ref: 'Passage',
      index: true,
    },
    title: { type: String },
    options: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    errorMessage: { type: String },
    questions: [QuestionSchema],
  },
  { timestamps: true }
)

const QuestionSet: Model<IQuestionSet> =
  mongoose.models.QuestionSet ||
  mongoose.model<IQuestionSet>('QuestionSet', QuestionSetSchema)

export default QuestionSet
