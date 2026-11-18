import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { uploadImageAtKey, type ImageKind } from './image-storage.js';

async function migrateDirectory(kind: ImageKind): Promise<number> {
  const directory = path.resolve(process.cwd(), 'backend', 'uploads', kind);
  let filenames: string[];
  try {
    filenames = await readdir(directory);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return 0;
    throw error;
  }
  let migrated = 0;
  for (const filename of filenames) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp)$/.test(filename)) continue;
    const data = await readFile(path.join(directory, filename));
    await uploadImageAtKey(kind, filename, data);
    migrated += 1;
  }
  return migrated;
}

const events = await migrateDirectory('events');
const candidates = await migrateDirectory('candidates');
process.stdout.write(`Copied ${events} event images and ${candidates} candidate images to S3.\n`);
