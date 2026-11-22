import { inflateSync } from 'node:zlib';

/**
 * Just enough PNG decoding to look at a screenshot: 8-bit RGB or RGBA, not interlaced (which is what Playwright
 * writes). Used to tell a drawn scene from a blank canvas, and a moving one from a still one.
 */
export interface Pixels {
  width: number;
  height: number;
  /** RGBA, 4 bytes per pixel. */
  data: Uint8Array;
}

export function decodePng(file: Buffer): Pixels {
  if (file.readUInt32BE(0) !== 0x89504e47) throw new Error('Not a PNG.');
  let offset = 8;
  let width = 0;
  let height = 0;
  let channels = 4;
  const chunks: Buffer[] = [];
  while (offset < file.length) {
    const length = file.readUInt32BE(offset);
    const type = file.toString('ascii', offset + 4, offset + 8);
    const body = file.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      const colourType = body[9];
      if (body[8] !== 8 || (colourType !== 2 && colourType !== 6) || body[12] !== 0) {
        throw new Error('Unsupported PNG variant.');
      }
      channels = colourType === 6 ? 4 : 3;
    } else if (type === 'IDAT') {
      chunks.push(body);
    }
    offset += 12 + length;
  }

  const raw = inflateSync(Buffer.concat(chunks));
  const stride = width * channels;
  const data = new Uint8Array(width * height * 4);
  const previous = new Uint8Array(stride);
  const line = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const start = y * (stride + 1);
    const filter = raw[start];
    for (let x = 0; x < stride; x++) {
      const value = raw[start + 1 + x] ?? 0;
      const left = x >= channels ? (line[x - channels] ?? 0) : 0;
      const up = previous[x] ?? 0;
      const upLeft = x >= channels ? (previous[x - channels] ?? 0) : 0;
      let predicted = 0;
      if (filter === 1) predicted = left;
      else if (filter === 2) predicted = up;
      else if (filter === 3) predicted = (left + up) >> 1;
      else if (filter === 4) {
        const estimate = left + up - upLeft;
        const dl = Math.abs(estimate - left);
        const du = Math.abs(estimate - up);
        const dul = Math.abs(estimate - upLeft);
        predicted = dl <= du && dl <= dul ? left : du <= dul ? up : upLeft;
      }
      line[x] = (value + predicted) & 0xff;
    }
    for (let x = 0; x < width; x++) {
      const target = (y * width + x) * 4;
      data[target] = line[x * channels] ?? 0;
      data[target + 1] = line[x * channels + 1] ?? 0;
      data[target + 2] = line[x * channels + 2] ?? 0;
      data[target + 3] = channels === 4 ? (line[x * channels + 3] ?? 255) : 255;
    }
    previous.set(line);
  }
  return { width, height, data };
}

/** How many clearly different colours the picture has (colours are rounded so noise does not count). */
export function distinctColours(pixels: Pixels): number {
  const seen = new Set<number>();
  for (let index = 0; index < pixels.data.length; index += 4) {
    const r = (pixels.data[index] ?? 0) >> 4;
    const g = (pixels.data[index + 1] ?? 0) >> 4;
    const b = (pixels.data[index + 2] ?? 0) >> 4;
    seen.add((r << 8) | (g << 4) | b);
  }
  return seen.size;
}

/** The share of pixels that differ noticeably between two pictures of the same size. */
export function changedShare(a: Pixels, b: Pixels): number {
  if (a.width !== b.width || a.height !== b.height) return 1;
  let changed = 0;
  for (let index = 0; index < a.data.length; index += 4) {
    const delta =
      Math.abs((a.data[index] ?? 0) - (b.data[index] ?? 0)) +
      Math.abs((a.data[index + 1] ?? 0) - (b.data[index + 1] ?? 0)) +
      Math.abs((a.data[index + 2] ?? 0) - (b.data[index + 2] ?? 0));
    if (delta > 24) changed += 1;
  }
  return changed / (a.data.length / 4);
}

/** Average colour of a horizontal band, given as fractions of the height. */
export function bandColour(
  pixels: Pixels,
  from: number,
  to: number,
): { r: number; g: number; b: number } {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let y = Math.floor(from * pixels.height); y < Math.floor(to * pixels.height); y++) {
    for (let x = 0; x < pixels.width; x++) {
      const index = (y * pixels.width + x) * 4;
      r += pixels.data[index] ?? 0;
      g += pixels.data[index + 1] ?? 0;
      b += pixels.data[index + 2] ?? 0;
      count += 1;
    }
  }
  return { r: r / count, g: g / count, b: b / count };
}

/** Average colour of a square patch centred on a point, in pixels. */
export function patchColour(
  pixels: Pixels,
  centreX: number,
  centreY: number,
  half = 6,
): { r: number; g: number; b: number } {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let y = Math.round(centreY) - half; y <= Math.round(centreY) + half; y++) {
    for (let x = Math.round(centreX) - half; x <= Math.round(centreX) + half; x++) {
      if (x < 0 || y < 0 || x >= pixels.width || y >= pixels.height) continue;
      const index = (y * pixels.width + x) * 4;
      r += pixels.data[index] ?? 0;
      g += pixels.data[index + 1] ?? 0;
      b += pixels.data[index + 2] ?? 0;
      count += 1;
    }
  }
  if (count === 0) return { r: 0, g: 0, b: 0 };
  return { r: r / count, g: g / count, b: b / count };
}

/** How far apart two colours are: 0 for the same colour, about 441 for black against white. */
export function colourDistance(
  one: { r: number; g: number; b: number },
  two: { r: number; g: number; b: number },
): number {
  return Math.hypot(one.r - two.r, one.g - two.g, one.b - two.b);
}
