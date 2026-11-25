import { z } from 'zod';

export const MEDIA_CATEGORIES = [
  'CHARACTERS', 'LANDSCAPES', 'LOCATIONS', 'MAPS', 'ORGANIZATIONS',
  'CREATURES', 'OBJECTS', 'SYMBOLS', 'ILLUSTRATIONS', 'OTHER'
] as const;

export const mediaVisibilitySchema = z.enum(['PRIVATE', 'PUBLISHED']);
export const mediaCategorySchema = z.string().trim().min(1).max(60).optional();
export const mediaTagsSchema = z.array(z.string().trim().min(1).max(48)).max(20).transform((tags) => [...new Set(tags)]);

export const updateMediaSchema = z.object({
  displayName: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  altText: z.string().trim().max(500).nullable().optional(),
  category: mediaCategorySchema.nullable(),
  tags: mediaTagsSchema.optional(),
  visibility: mediaVisibilitySchema.optional(),
  focalX: z.number().min(0).max(1).nullable().optional(),
  focalY: z.number().min(0).max(1).nullable().optional()
}).strict();

const MAX_IMAGE_BYTES = Number.parseInt(process.env.MEDIA_MAX_IMAGE_BYTES ?? '10485760', 10);
const MAX_IMAGE_PIXELS = Number.parseInt(process.env.MEDIA_MAX_IMAGE_PIXELS ?? '40000000', 10);
export const MAX_MEDIA_FILES = Number.parseInt(process.env.MEDIA_MAX_UPLOAD_FILES ?? '10', 10);

export type ImageInspection = { mimeType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp'; width: number; height: number };

function invalid(message: string): never {
  throw Object.assign(new Error(message), { status: 422 });
}

function readPng(view: DataView) {
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function readGif(view: DataView) {
  return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
}

function readJpeg(bytes: Uint8Array) {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    const marker = bytes[offset + 1] ?? 0;
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 2 > bytes.length) break;
    const length = ((bytes[offset] ?? 0) << 8) + (bytes[offset + 1] ?? 0);
    if (length < 2 || offset + length > bytes.length) break;
    if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
      return { height: ((bytes[offset + 3] ?? 0) << 8) + (bytes[offset + 4] ?? 0), width: ((bytes[offset + 5] ?? 0) << 8) + (bytes[offset + 6] ?? 0) };
    }
    offset += length;
  }
  invalid('Não foi possível ler as dimensões do JPEG.');
}

function readWebp(bytes: Uint8Array) {
  const chunk = String.fromCharCode(...bytes.slice(12, 16));
  if (chunk === 'VP8X' && bytes.length >= 30) {
    const width = 1 + (bytes[24] ?? 0) + ((bytes[25] ?? 0) << 8) + ((bytes[26] ?? 0) << 16);
    const height = 1 + (bytes[27] ?? 0) + ((bytes[28] ?? 0) << 8) + ((bytes[29] ?? 0) << 16);
    return { width, height };
  }
  if (chunk === 'VP8 ' && bytes.length >= 30) {
    return { width: (bytes[26] ?? 0) + (((bytes[27] ?? 0) & 0x3f) << 8), height: (bytes[28] ?? 0) + (((bytes[29] ?? 0) & 0x3f) << 8) };
  }
  if (chunk === 'VP8L' && bytes.length >= 25 && bytes[20] === 0x2f) {
    return {
      width: 1 + (bytes[21] ?? 0) + (((bytes[22] ?? 0) & 0x3f) << 8),
      height: 1 + (((bytes[22] ?? 0) >> 6) | ((bytes[23] ?? 0) << 2) | (((bytes[24] ?? 0) & 0x0f) << 10))
    };
  }
  invalid('Não foi possível ler as dimensões do WebP.');
}

export function inspectImage(buffer: ArrayBuffer): ImageInspection {
  const bytes = new Uint8Array(buffer);
  if (bytes.byteLength > MAX_IMAGE_BYTES) invalid(`A imagem deve ter no máximo ${Math.floor(MAX_IMAGE_BYTES / 1024 / 1024)} MB.`);
  if (bytes.byteLength < 12) invalid('O arquivo de imagem está incompleto.');
  const view = new DataView(buffer);
  let mimeType: ImageInspection['mimeType'];
  let dimensions: { width: number; height: number };
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) {
    mimeType = 'image/png'; dimensions = readPng(view);
  } else if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    mimeType = 'image/jpeg'; dimensions = readJpeg(bytes);
  } else if (String.fromCharCode(...bytes.slice(0, 6)) === 'GIF87a' || String.fromCharCode(...bytes.slice(0, 6)) === 'GIF89a') {
    mimeType = 'image/gif'; dimensions = readGif(view);
  } else if (String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') {
    mimeType = 'image/webp'; dimensions = readWebp(bytes);
  } else {
    invalid('Use PNG, JPEG, GIF ou WebP válido. SVG e formatos ativos não são aceitos.');
  }
  if (dimensions.width < 1 || dimensions.height < 1 || dimensions.width * dimensions.height > MAX_IMAGE_PIXELS) invalid('As dimensões da imagem ultrapassam o limite configurado.');
  return { mimeType, ...dimensions };
}

export function safeFileName(value: string) {
  const cleaned = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\.{2,}/g, '-').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
  return cleaned || 'imagem';
}
