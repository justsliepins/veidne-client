import type PizZip from 'pizzip';
import { TRANSPARENT_PIXEL_PNG, type TranscodedImage } from './imageTranscoder';

// Per-row media swap (Task 14). Operates on the fresh per-row zip the
// generator already makes, after docxtemplater has rendered: locate each
// tagged drawing by its descr, swap the media bytes, and rewrite the extents
// to the fit rule. String surgery scoped to the drawing's own segment keeps
// everything else byte-intact, in line with patch-not-rebuild.

export interface ImageFieldSwap {
  /** The alt-text tag, including braces: {{PHOTO}}. */
  tag: string;
  /** Transcoded picture for this row, or null for the no-picture rule. */
  image: TranscodedImage | null;
}

const EMU_PER_PX = 9525; // 914400 EMU per inch at 96 px per inch

const IMAGE_REL_TYPE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image';

function extOf(path: string): string {
  return (path.split('.').pop() || '').toLowerCase();
}

function sameFamily(a: string, b: string): boolean {
  const norm = (e: string) => (e === 'jpeg' ? 'jpg' : e);
  return norm(a) === norm(b);
}

/** The fit rule: scale = min(boxW/imgW, boxH/imgH) per axis, aspect always
 *  preserved, never stretched, never cropped. Returns EMU extents. */
export function fitExtents(
  boxCx: number, boxCy: number, pxW: number, pxH: number,
): { cx: number; cy: number } {
  const imgCx = pxW * EMU_PER_PX;
  const imgCy = pxH * EMU_PER_PX;
  const scale = Math.min(boxCx / imgCx, boxCy / imgCy);
  return { cx: Math.max(1, Math.round(imgCx * scale)), cy: Math.max(1, Math.round(imgCy * scale)) };
}

function ensureContentTypeDefault(zip: PizZip, ext: 'png' | 'jpg'): void {
  const file = zip.file('[Content_Types].xml');
  if (!file) return;
  let xml = file.asText();
  const present = ext === 'png'
    ? /Extension="png"/i.test(xml)
    : /Extension="jpe?g"/i.test(xml);
  if (present) return;
  const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
  xml = xml.replace('</Types>', `<Default Extension="${ext}" ContentType="${mime}"/></Types>`);
  zip.file('[Content_Types].xml', xml);
}

/** Swap each tagged drawing's picture in this row's zip. */
export function swapImagesInZip(zip: PizZip, swaps: ImageFieldSwap[]): void {
  const docFile = zip.file('word/document.xml');
  const relsFile = zip.file('word/_rels/document.xml.rels');
  if (!docFile || !relsFile) return;

  let xml = docFile.asText();
  let rels = relsFile.asText();
  let counter = 0;

  for (const swap of swaps) {
    const needle = `descr="${swap.tag}"`;

    xml = xml.replace(/<w:drawing\b[\s\S]*?<\/w:drawing>|<w:pict\b[\s\S]*?<\/w:pict>/g, (segment) => {
      if (!segment.includes(needle)) return segment;

      const relM = segment.match(/r:embed="([^"]+)"|r:id="([^"]+)"/);
      const relId = relM?.[1] || relM?.[2];
      if (!relId) return segment;

      const relEntry = rels.match(new RegExp(`<Relationship[^>]*Id="${relId}"[^>]*Target="([^"]+)"[^>]*/>`))
        ?? rels.match(new RegExp(`<Relationship[^>]*Target="([^"]+)"[^>]*Id="${relId}"[^>]*/>`));
      const target = relEntry?.[1];
      if (!target) return segment;
      const mediaPath = target.startsWith('/') ? target.slice(1) : `word/${target.replace(/^\.\//, '')}`;

      // The sample box comes from this fresh copy's own template extents.
      const extM = segment.match(/<wp:extent cx="(\d+)" cy="(\d+)"/);
      if (!extM) return segment;
      const boxCx = parseInt(extM[1], 10);
      const boxCy = parseInt(extM[2], 10);

      let bytes: ArrayBuffer;
      let outExt: 'png' | 'jpg';
      let cx: number;
      let cy: number;
      if (swap.image) {
        ({ bytes, ext: outExt } = swap.image);
        ({ cx, cy } = fitExtents(boxCx, boxCy, swap.image.pxW, swap.image.pxH));
      } else {
        // No-picture rule: transparent pixel stretched to the full sample box,
        // never delete the drawing (deletion shifts layout).
        const copy = new Uint8Array(TRANSPARENT_PIXEL_PNG.length);
        copy.set(TRANSPARENT_PIXEL_PNG);
        bytes = copy.buffer;
        outExt = 'png';
        cx = boxCx;
        cy = boxCy;
      }

      let out = segment
        .replace(/<wp:extent cx="\d+" cy="\d+"/, `<wp:extent cx="${cx}" cy="${cy}"`)
        .replace(/<a:ext cx="\d+" cy="\d+"/, `<a:ext cx="${cx}" cy="${cy}"`);

      if (sameFamily(extOf(mediaPath), outExt)) {
        zip.file(mediaPath, bytes);
      } else {
        // Format changed: add a new media entry plus rel and retarget r:embed
        // instead of renaming, leaving the original media untouched.
        counter++;
        const newName = `media/veidne_image_${counter}.${outExt}`;
        const newRelId = `rIdVeidne${counter}`;
        zip.file(`word/${newName}`, bytes);
        rels = rels.replace('</Relationships>',
          `<Relationship Id="${newRelId}" Type="${IMAGE_REL_TYPE}" Target="${newName}"/></Relationships>`);
        out = out.replace(`r:embed="${relId}"`, `r:embed="${newRelId}"`)
          .replace(`r:id="${relId}"`, `r:id="${newRelId}"`);
        ensureContentTypeDefault(zip, outExt);
      }

      return out;
    });
  }

  zip.file('word/document.xml', xml);
  zip.file('word/_rels/document.xml.rels', rels);
}
