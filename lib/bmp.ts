/**
 * Encodes a raw single-channel 8-bit grayscale buffer (values already
 * thresholded to 0 or 255) into a real 1-bit-per-pixel BMP file.
 * sharp/libvips has no BMP writer, so this container is built by hand
 * per the BITMAPFILEHEADER / BITMAPINFOHEADER spec.
 */
export function toMonochromeBmp(pixels: Buffer, width: number, height: number): Buffer {
  const rowSize = Math.floor((width + 31) / 32) * 4; // row bytes, padded to 4-byte boundary
  const pixelArraySize = rowSize * height;
  const headerSize = 14 + 40 + 8; // file header + info header + 2-color palette
  const fileSize = headerSize + pixelArraySize;

  const buffer = Buffer.alloc(fileSize);

  // BITMAPFILEHEADER
  buffer.write('BM', 0, 'ascii');
  buffer.writeUInt32LE(fileSize, 2);
  buffer.writeUInt32LE(0, 6); // reserved
  buffer.writeUInt32LE(headerSize, 10); // pixel data offset

  // BITMAPINFOHEADER
  buffer.writeUInt32LE(40, 14);
  buffer.writeInt32LE(width, 18);
  buffer.writeInt32LE(height, 22); // positive => bottom-up row order
  buffer.writeUInt16LE(1, 26); // planes
  buffer.writeUInt16LE(1, 28); // bits per pixel
  buffer.writeUInt32LE(0, 30); // BI_RGB, no compression
  buffer.writeUInt32LE(pixelArraySize, 34);
  buffer.writeInt32LE(2835, 38); // ~72 DPI
  buffer.writeInt32LE(2835, 42);
  buffer.writeUInt32LE(2, 46); // colors used
  buffer.writeUInt32LE(2, 50); // colors important

  // 2-entry color palette (BGRA): index 0 = black, index 1 = white
  buffer.writeUInt32LE(0x00000000, 54);
  buffer.writeUInt32LE(0x00ffffff, 58);

  const bytesPerRow = Math.ceil(width / 8);
  let offset = headerSize;

  for (let y = height - 1; y >= 0; y--) {
    const rowStart = offset;
    for (let byteIndex = 0; byteIndex < bytesPerRow; byteIndex++) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit++) {
        const x = byteIndex * 8 + bit;
        if (x >= width) break;
        if (pixels[y * width + x] >= 128) {
          byte |= 1 << (7 - bit);
        }
      }
      buffer.writeUInt8(byte, offset);
      offset += 1;
    }
    offset = rowStart + rowSize; // skip row padding (already zeroed by Buffer.alloc)
  }

  return buffer;
}

/**
 * Packs the same thresholded grayscale buffer into a raw 1-bpp bitmap
 * with no file header and no row padding - top-to-bottom, exactly
 * width/8 bytes per row. This is the format GxEPD2's drawBitmap() on
 * the ESP32 expects; BMP's bottom-up rows and 4-byte row padding would
 * just be extra parsing work for a microcontroller that only ever
 * needs the raw pixels, never to open the file elsewhere.
 */
export function toPackedMonochrome(pixels: Buffer, width: number, height: number): Buffer {
  const bytesPerRow = Math.ceil(width / 8);
  const buffer = Buffer.alloc(bytesPerRow * height);

  for (let y = 0; y < height; y++) {
    for (let byteIndex = 0; byteIndex < bytesPerRow; byteIndex++) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit++) {
        const x = byteIndex * 8 + bit;
        if (x >= width) break;
        if (pixels[y * width + x] >= 128) {
          byte |= 1 << (7 - bit);
        }
      }
      buffer[y * bytesPerRow + byteIndex] = byte;
    }
  }

  return buffer;
}
