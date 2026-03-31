// lib/models/ChatMessage.ts — Mongoose ChatMessage schema

import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export interface IChatMessage extends Document {
  passageId?: Types.ObjectId
  userId: Types.ObjectId
  role: 'user' | 'assistant'
  content: string
  createdAt: Date
  updatedAt: Date
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    passageId: {
      type: Schema.Types.ObjectId,
      ref: 'Passage',
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: { type: String, required: true },
  },
  { timestamps: true }
)

const ChatMessage: Model<IChatMessage> =
  mongoose.models.ChatMessage ||
  mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema)

export default ChatMessage
