// lib/r2.ts — Cloudflare R2 storage client (S3-compatible)
// Exports r2Client singleton, uploadToR2, and deleteFromR2.

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

/**
 * Upload a file to R2 and return its public URL.
 * Key format: {userId}/{passageId}/{fileName}
 */
export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  )
  return `${process.env.R2_PUBLIC_URL}/${key}`
}

/**
 * Download a file from R2 and return it as a base64 string.
 */
export async function downloadFromR2(key: string): Promise<{ base64: string; contentType: string }> {
  const response = await r2Client.send(
    new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    })
  )
  const bytes = await response.Body!.transformToByteArray()
  const base64 = Buffer.from(bytes).toString('base64')
  const contentType = response.ContentType ?? 'application/octet-stream'
  return { base64, contentType }
}

/**
 * Delete a file from R2 by its object key.
 */
export async function deleteFromR2(key: string): Promise<void> {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    })
  )
}
