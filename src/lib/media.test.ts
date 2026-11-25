import { describe, expect, it } from 'vitest';
import { inspectImage, safeFileName } from './media';

function png(width: number, height: number) {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  new DataView(bytes.buffer).setUint32(16, width);
  new DataView(bytes.buffer).setUint32(20, height);
  return bytes.buffer;
}

describe('media inspection', () => {
  it('uses file signatures instead of trusting a browser MIME value', () => {
    expect(inspectImage(png(1920, 1080))).toMatchObject({ mimeType: 'image/png', width: 1920, height: 1080 });
  });

  it('rejects SVG and arbitrary bytes before object storage is called', () => {
    const svg = new TextEncoder().encode('<svg onload="alert(1)"></svg>').buffer;
    expect(() => inspectImage(svg)).toThrow('PNG, JPEG, GIF ou WebP');
  });

  it('creates a safe storage leaf name without trusting path segments', () => {
    expect(safeFileName('../../Mapa mágico!!.png')).toBe('Mapa-magico-.png');
  });
});
