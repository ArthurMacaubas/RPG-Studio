import { del, get, put } from '@vercel/blob';

export const MEDIA_STORAGE_PROVIDER = 'vercel-blob';

function storageConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function unavailable(): never {
  throw Object.assign(new Error('O armazenamento de mídia ainda não foi configurado. Defina BLOB_READ_WRITE_TOKEN do Blob Store privado.'), { status: 503 });
}

export const mediaStorage = {
  isConfigured: storageConfigured,

  async put(key: string, bytes: ArrayBuffer, contentType: string) {
    if (!storageConfigured()) unavailable();
    return put(key, bytes, { access: 'private', addRandomSuffix: false, contentType, cacheControlMaxAge: 60 * 60 * 24 * 30 });
  },

  async delete(key: string) {
    if (!storageConfigured()) unavailable();
    await del(key);
  },

  async read(key: string) {
    if (!storageConfigured()) unavailable();
    return get(key, { access: 'private' });
  }
};
