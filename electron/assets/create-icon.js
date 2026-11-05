import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// Precompute CRC32 table for valid PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

/**
 * Generates a valid RGBA PNG buffer of size width x height with a rounded blue launcher icon.
 */
function createLauncherPng(width, height) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // RGBA color type
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Each scanline has 1 filter byte (0) + width * 4 RGBA bytes
  const rawData = Buffer.alloc(height * (1 + width * 4));
  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.44;
  const innerRadius = width * 0.22;

  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4);
    rawData[rowStart] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const px = rowStart + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= innerRadius) {
        // Inner white circle
        rawData[px] = 255;
        rawData[px + 1] = 255;
        rawData[px + 2] = 255;
        rawData[px + 3] = 255;
      } else if (dist <= radius) {
        // Brand blue circle (#2563EB)
        rawData[px] = 37;
        rawData[px + 1] = 99;
        rawData[px + 2] = 235;
        rawData[px + 3] = 255;
      } else {
        // Transparent background
        rawData[px] = 0;
        rawData[px + 1] = 0;
        rawData[px + 2] = 0;
        rawData[px + 3] = 0;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData, { level: 9 });

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Wraps a PNG buffer inside a valid Windows .ICO container.
 */
function wrapPngAsIco(pngBuf, width, height) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(1, 4); // 1 image

  const dirEntry = Buffer.alloc(16);
  dirEntry[0] = width >= 256 ? 0 : width; // 0 means 256 in ICO format
  dirEntry[1] = height >= 256 ? 0 : height;
  dirEntry[2] = 0; // Color palette
  dirEntry[3] = 0; // Reserved
  dirEntry.writeUInt16LE(1, 4); // Color planes
  dirEntry.writeUInt16LE(32, 6); // Bits per pixel
  dirEntry.writeUInt32LE(pngBuf.length, 8); // Size of PNG data
  dirEntry.writeUInt32LE(22, 12); // Offset (6 + 16 = 22)

  return Buffer.concat([header, dirEntry, pngBuf]);
}

const assetDir = path.join(process.cwd(), 'electron', 'assets');
if (!fs.existsSync(assetDir)) {
  fs.mkdirSync(assetDir, { recursive: true });
}

const png256 = createLauncherPng(256, 256);
const ico256 = wrapPngAsIco(png256, 256, 256);
const png32 = createLauncherPng(32, 32);
const ico32 = wrapPngAsIco(png32, 32, 32);

fs.writeFileSync(path.join(assetDir, 'app-icon.png'), png256);
fs.writeFileSync(path.join(assetDir, 'app-icon.ico'), ico256);
fs.writeFileSync(path.join(assetDir, 'tray-icon.png'), png32);
fs.writeFileSync(path.join(assetDir, 'tray-icon.ico'), ico32);

console.log('Generated 256x256 app-icon.png/.ico and 32x32 tray-icon.png/.ico');
