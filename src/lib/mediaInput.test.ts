import { describe, expect, it } from 'vitest';
import { isSupportedImageFile, supportedImageFiles } from './mediaInput';

describe('media input helpers', () => {
  it('accepts supported MIME types and image extensions when a drag omits the MIME type', () => {
    expect(isSupportedImageFile({ name: 'mapa.webp', type: 'image/webp' })).toBe(true);
    expect(isSupportedImageFile({ name: 'mapa.png', type: '' })).toBe(true);
  });

  it('filters unsupported files before an upload starts', () => {
    const files = [
      { name: 'personagem.jpg', type: 'image/jpeg' },
      { name: 'anotacoes.pdf', type: 'application/pdf' }
    ] as File[];

    expect(supportedImageFiles(files).map((file) => file.name)).toEqual(['personagem.jpg']);
  });
});
