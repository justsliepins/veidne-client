// Browser-side transcode for image fields (Task 14). Runs once per unique
// dropped file, before the row loop, never inside it. Only JPEG and PNG are
// ever embedded, whatever came in.

export interface TranscodedImage {
  bytes: ArrayBuffer;
  pxW: number;
  pxH: number;
  ext: 'png' | 'jpg';
}

/** 1 by 1 transparent PNG for no-picture rows, stretched to the sample box so
 *  layout never shifts and the area reads as empty. */
export const TRANSPARENT_PIXEL_PNG: Uint8Array = Uint8Array.from(atob(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
), (c) => c.charCodeAt(0));

function hasAlphaChannel(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  const data = ctx.getImageData(0, 0, w, h).data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }
  return false;
}

function isJpegSource(fileName: string): boolean {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  return ext === 'jpg' || ext === 'jpeg';
}

async function transcodeOne(fileName: string, blob: Blob, boxLongestPx: number): Promise<TranscodedImage | null> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(blob);
  } catch {
    return null; // undecodable file: the row falls back to the no-picture rule
  }

  // Downscale so the longest side is at most twice the sample box's pixel
  // size at 96 px per inch, hard cap 1600 px. Never upscale here; the fit
  // rule at swap time handles sizing inside the box.
  const maxSide = Math.min(Math.max(1, Math.round(boxLongestPx * 2)), 1600);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  // JPEG sources cannot carry alpha; everything else gets a real scan.
  const alpha = isJpegSource(fileName) ? false : hasAlphaChannel(ctx, w, h);
  const type = alpha ? 'image/png' : 'image/jpeg';

  const out = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), type, 0.85));
  if (!out) return null;

  return { bytes: await out.arrayBuffer(), pxW: w, pxH: h, ext: alpha ? 'png' : 'jpg' };
}

/** Transcode every needed file once (cache by file, not by row). The needed
 *  map carries each file's largest sample box longest-side in pixels. */
export async function transcodeImageFiles(
  files: Map<string, Blob>,
  needed: Map<string, number>,
): Promise<Map<string, TranscodedImage>> {
  const out = new Map<string, TranscodedImage>();
  for (const [name, boxLongestPx] of needed) {
    const blob = files.get(name);
    if (!blob) continue;
    const t = await transcodeOne(name, blob, boxLongestPx);
    if (t) out.set(name, t);
    // Keep the UI breathing between decodes, same cadence as the row loop.
    await new Promise((r) => setTimeout(r, 0));
  }
  return out;
}
