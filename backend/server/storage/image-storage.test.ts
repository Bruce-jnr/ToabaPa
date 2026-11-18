import { beforeEach, describe, expect, it, vi } from 'vitest';

const send = vi.hoisted(() => vi.fn());
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class { send = send; },
  PutObjectCommand: class { constructor(public input: Record<string, unknown>) {} },
  GetObjectCommand: class { constructor(public input: Record<string, unknown>) {} },
}));

import { env } from '../config/env.js';
import { getImage, uploadImage, uploadImageAtKey } from './image-storage.js';

describe('S3 image storage', () => {
  beforeEach(() => send.mockReset());

  it('uploads an image to a private bucket key and returns the existing public route', async () => {
    send.mockResolvedValue({});
    const data = Buffer.from('test-image');
    const url = await uploadImage('events', data, 'png');
    expect(url).toMatch(/^\/api\/v1\/public\/event-images\/[0-9a-f-]+\.png$/);
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0][0].input).toMatchObject({
      Bucket: env.AWS_S3_BUCKET,
      Key: `events/${url.split('/').at(-1)}`,
      Body: data,
      ContentType: 'image/png',
    });
    expect(send.mock.calls[0][0].input).not.toHaveProperty('ACL');
  });

  it('reads the uploaded image without exposing S3 URLs', async () => {
    const data = Buffer.from('test-image');
    send.mockResolvedValue({ Body: { transformToByteArray: async () => data } });
    const image = await getImage('candidates', '123e4567-e89b-42d3-a456-426614174000.webp');
    expect(image).toEqual({ data, contentType: 'image/webp' });
    expect(send.mock.calls[0][0].input).toMatchObject({
      Bucket: env.AWS_S3_BUCKET,
      Key: 'candidates/123e4567-e89b-42d3-a456-426614174000.webp',
    });
  });

  it('rejects arbitrary object keys before contacting S3', async () => {
    expect(await getImage('events', '../private.txt')).toBeNull();
    await expect(uploadImageAtKey('events', '../private.txt', Buffer.from('bad'))).rejects.toThrow('Invalid image filename.');
    expect(send).not.toHaveBeenCalled();
  });

  it('allows legacy local-file fallback for missing S3 keys', async () => {
    send.mockImplementationOnce(async () => { throw Object.assign(new Error('missing'), { name: 'NoSuchKey' }); });
    expect(await getImage('events', '123e4567-e89b-42d3-a456-426614174000.jpg')).toBeNull();
  });
});
