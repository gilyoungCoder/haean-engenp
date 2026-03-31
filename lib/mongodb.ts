// lib/mongodb.ts — Mongoose connection with serverless caching
// Uses global.mongoose pattern to persist connections across hot reloads.

import mongoose from 'mongoose'

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined
}

const cached: MongooseCache = global.mongooseCache ?? { conn: null, promise: null }

if (!global.mongooseCache) {
  global.mongooseCache = cached
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const uri = process.env.MONGODB_URI
    if (!uri) {
      throw new Error('[mongodb] MONGODB_URI is not defined.')
    }

    cached.promise = mongoose.connect(uri, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    }).catch((err) => {
      // Reset cache on connection failure so next call retries
      cached.promise = null
      throw err
    })
  }

  cached.conn = await cached.promise
  return cached.conn
}
