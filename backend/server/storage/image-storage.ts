import { randomUUID } from 'node:crypto';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '../config/env.js';

export type ImageKind = 'events' | 'candidates';
export type ImageExtension = 'jpg' | 'png' | 'webp';

const imageFilename = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp)$/;
const contentTypes: Record<ImageExtension, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function uploadImage(kind: ImageKind, data: Buffer, extension: ImageExtension): Promise<string> {
  const filename = `${randomUUID()}.${extension}`;
  await uploadImageAtKey(kind, filename, data);
  return `/api/v1/public/${kind === 'events' ? 'event' : 'candidate'}-images/${filename}`;
}

export async function uploadImageAtKey(kind: ImageKind, filename: string, data: Buffer): Promise<void> {
  if (!imageFilename.test(filename)) throw new Error('Invalid image filename.');
  const extension = filename.slice(filename.lastIndexOf('.') + 1) as ImageExtension;
  await s3.send(new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: `${kind}/${filename}`,
    Body: data,
    ContentType: contentTypes[extension],
    CacheControl: 'public, max-age=86400',
  }));
}

export async function getImage(kind: ImageKind, filename: string): Promise<{ data: Buffer; contentType: string } | null> {
  if (!imageFilename.test(filename)) return null;
  const extension = filename.slice(filename.lastIndexOf('.') + 1) as ImageExtension;
  try {
    const response = await s3.send(new GetObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: `${kind}/${filename}`,
    }));
    if (!response.Body) return null;
    return { data: Buffer.from(await response.Body.transformToByteArray()), contentType: contentTypes[extension] };
  } catch (error) {
    if (error && typeof error === 'object' && 'name' in error && ['NoSuchKey', 'NotFound'].includes(String(error.name))) return null;
    throw error;
  }
}
