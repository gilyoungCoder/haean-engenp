// lib/mongodb-client.ts — Native MongoDB client for NextAuth MongoDB Adapter
// Exports a clientPromise singleton using MongoClient.

import { MongoClient } from 'mongodb'

interface MongoClientCache {
  client: MongoClient | null
  promise: Promise<MongoClient> | null
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientCache: MongoClientCache | undefined
}

const cached: MongoClientCache = global._mongoClientCache ?? {
  client: null,
  promise: null,
}

if (!global._mongoClientCache) {
  global._mongoClientCache = cached
}

function getClientPromise(): Promise<MongoClient> {
  if (cached.promise) return cached.promise

  const uri = process.env.MONGODB_URI ?? ''
  if (!uri) {
    // During build, env vars may not be available. Return a deferred promise
    // that will only reject when actually awaited at runtime.
    return Promise.reject(
      new Error('[mongodb-client] MONGODB_URI is not defined.')
    )
  }

  const client = new MongoClient(uri)
  cached.promise = client.connect().then((c) => {
    cached.client = c
    return c
  })
  return cached.promise
}

const clientPromise: Promise<MongoClient> = getClientPromise()

export default clientPromise
