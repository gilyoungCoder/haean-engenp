// lib/models/User.ts — Mongoose User schema
// Managed by NextAuth.js MongoDB Adapter + custom password field for Credentials.

import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IUser extends Document {
  email: string
  password?: string
  name?: string
  image?: string
  emailVerified?: Date
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, unique: true, required: true },
    password: { type: String }, // bcrypt hash for email/password signup
    name: { type: String },
    image: { type: String },
    emailVerified: { type: Date },
  },
  { timestamps: true }
)

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema)

export default User
