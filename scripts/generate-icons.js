import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  return table;
}

const crcTable = makeCrcTable();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const typeAndData = buf.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function generatePng(width, height, isMaskable = false) {
  // Signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8-bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = makeChunk('IHDR', ihdrData);

  // Raw image data with filter byte 0 per scanline
  const rowBytes = 1 + width * 4;
  const rawData = Buffer.alloc(rowBytes * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.42;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Slate dark background #0F172A
      let r = 15;
      let g = 23;
      let b = 42;
      let a = 255;

      if (!isMaskable) {
        // Inner rounded badge / circle
        if (dist <= radius) {
          // Inner emerald/slate contrast #1E293B
          r = 30;
          g = 41;
          b = 59;
        }
      }

      // Draw stylized "B24" or center emblem
      if (Math.abs(dx) < width * 0.22 && Math.abs(dy) < height * 0.22) {
        // Crisp amber / emerald accent
        r = 16;
        g = 185;
        b = 129;
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idat = makeChunk('IDAT', compressedData);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generatePng(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generatePng(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generatePng(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generatePng(180, 180, false));

// High-fidelity SVG icon
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="128" fill="#0F172A"/>
  <rect x="48" y="48" width="416" height="416" rx="96" fill="#18181B" stroke="#27272A" stroke-width="8"/>
  <circle cx="256" cy="256" r="160" fill="#10B981" fill-opacity="0.12" stroke="#10B981" stroke-width="8"/>
  <text x="256" y="278" font-family="system-ui, -apple-system, sans-serif" font-size="130" font-weight="900" fill="#F4F4F5" text-anchor="middle" letter-spacing="4">B24</text>
  <text x="256" y="340" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="700" fill="#10B981" text-anchor="middle" letter-spacing="6">MSE ROUTINE</text>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svg);
console.log('PWA icon assets generated successfully in public/');
