// lib/models/Subscription.ts — Mongoose Subscription schema

import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export interface ISubscription extends Document {
  userId: Types.ObjectId
  plan: 'free' | 'pro'
  status: 'active' | 'canceled' | 'past_due' | 'trialing'
  currentPeriodStart?: Date
  currentPeriodEnd?: Date
  tossPaymentKey?: string
  tossOrderId?: string
  tossBillingKey?: string
  tossCustomerKey?: string
  createdAt: Date
  updatedAt: Date
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      unique: true,
      required: true,
    },
    plan: {
      type: String,
      enum: ['free', 'pro'],
      default: 'free',
    },
    status: {
      type: String,
      enum: ['active', 'canceled', 'past_due', 'trialing'],
      default: 'active',
    },
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },
    tossPaymentKey: { type: String },
    tossOrderId: { type: String },
    tossBillingKey: { type: String },
    tossCustomerKey: { type: String },
  },
  { timestamps: true }
)

const Subscription: Model<ISubscription> =
  mongoose.models.Subscription ||
  mongoose.model<ISubscription>('Subscription', SubscriptionSchema)

export default Subscription
