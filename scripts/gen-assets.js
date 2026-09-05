/**
 * Generates warm, friendly gradient photo assets as real PNG files (no native deps).
 * Used for chat image messages + family cover art so the app works fully offline.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

let CRC_TABLE = null;
function crc32(buf) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, pixelFn) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y);
      const i = rowStart + 1 + x * 4;
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b; raw[i + 3] = a === undefined ? 255 : a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];

function makePainter(width, height) {
  const buf = new Float32Array(width * height * 3);
  return {
    fill(fn) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const [r, g, b] = fn(x / width, y / height);
          const i = (y * width + x) * 3;
          buf[i] = r; buf[i + 1] = g; buf[i + 2] = b;
        }
      }
    },
    blob(cx, cy, r, color, opacity, softness = 0.35) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const dx = (x / width - cx) * (width / height);
          const dy = y / height - cy;
          const d = Math.sqrt(dx * dx + dy * dy) / r;
          if (d < 1.2) {
            const alpha = Math.max(0, Math.min(1, (1 - d) / softness)) * opacity;
            const i = (y * width + x) * 3;
            buf[i] = lerp(buf[i], color[0], alpha);
            buf[i + 1] = lerp(buf[i + 1], color[1], alpha);
            buf[i + 2] = lerp(buf[i + 2], color[2], alpha);
          }
        }
      }
    },
    toPng() {
      return encodePng(width, height, (x, y) => {
        const i = (y * width + x) * 3;
        return [Math.round(Math.max(0, Math.min(255, buf[i]))), Math.round(Math.max(0, Math.min(255, buf[i + 1]))), Math.round(Math.max(0, Math.min(255, buf[i + 2])))];
      });
    },
  };
}

function grain(p, amount, seed) {
  // gentle noise applied post-hoc by re-encoding through painter pixels
  let s = seed;
  return p;
}

const out = (name, width, height, fn) => {
  const p = makePainter(width, height);
  fn(p);
  fs.writeFileSync(path.join(__dirname, '..', 'assets', 'images', name), p.toPng());
  console.log('wrote', name);
};

const W = 900, H = 640;

// 1. Sunset over hills
out('photo-sunset.png', W, H, (p) => {
  p.fill((x, y) => mix([255, 214, 165], [255, 120, 92], Math.pow(y, 1.15)));
  p.blob(0.72, 0.3, 0.13, [255, 246, 214], 0.95, 0.5);
  p.blob(0.2, 0.86, 0.55, [214, 96, 82], 0.9, 0.5);
  p.blob(0.62, 0.95, 0.6, [168, 68, 74], 0.95, 0.45);
  p.blob(0.95, 0.9, 0.4, [196, 84, 78], 0.9, 0.5);
});

// 2. Birthday cake
out('photo-cake.png', W, H, (p) => {
  p.fill(() => [255, 232, 236]);
  p.blob(0.5, 0.62, 0.42, [255, 196, 205], 0.85, 0.5);
  p.blob(0.5, 0.72, 0.3, [255, 246, 238], 1, 0.35);
  p.blob(0.5, 0.6, 0.22, [255, 214, 168], 0.95, 0.35);
  for (let i = 0; i < 5; i++) {
    p.blob(0.36 + i * 0.07, 0.44, 0.028, [255, 158, 92], 1, 0.6);
    p.blob(0.36 + i * 0.07, 0.41, 0.016, [255, 232, 130], 1, 0.7);
  }
  p.blob(0.12, 0.2, 0.12, [255, 214, 120], 0.5, 0.8);
});

// 3. Garden / flowers
out('photo-garden.png', W, H, (p) => {
  p.fill((x, y) => mix([198, 236, 186], [108, 178, 122], Math.pow(y, 0.9)));
  const spots = [[0.2, 0.62], [0.42, 0.75], [0.63, 0.6], [0.82, 0.78], [0.3, 0.85], [0.72, 0.88]];
  spots.forEach(([cx, cy], i) => {
    const petal = [[255, 138, 128], [255, 186, 92], [236, 128, 180], [255, 214, 106], [250, 150, 150], [255, 170, 110]][i];
    p.blob(cx, cy, 0.075, petal, 0.95, 0.5);
    p.blob(cx, cy, 0.03, [255, 245, 200], 1, 0.6);
  });
  p.blob(0.5, 0.08, 0.3, [255, 250, 220], 0.5, 0.9);
});

// 4. Beach picnic
out('photo-beach.png', W, H, (p) => {
  p.fill((x, y) => (y < 0.5 ? mix([150, 214, 236], [198, 238, 246], y * 2) : mix([255, 226, 176], [240, 196, 140], (y - 0.5) * 2)));
  p.blob(0.24, 0.16, 0.1, [255, 250, 224], 0.9, 0.6);
  p.blob(0.5, 0.52, 0.5, [255, 255, 255], 0.35, 0.5);
  p.blob(0.68, 0.78, 0.16, [226, 106, 92], 0.85, 0.45);
  p.blob(0.4, 0.84, 0.12, [255, 176, 92], 0.85, 0.45);
});

// 5. Family table / dinner
out('photo-dinner.png', W, H, (p) => {
  p.fill(() => [46, 32, 26]);
  p.blob(0.5, 0.55, 0.55, [120, 76, 52], 0.95, 0.5);
  p.blob(0.5, 0.55, 0.3, [226, 176, 120], 0.9, 0.45);
  [[0.32, 0.5], [0.68, 0.5], [0.5, 0.72], [0.5, 0.3]].forEach(([cx, cy], i) => {
    p.blob(cx, cy, 0.085, [252, 244, 232], 0.92, 0.4);
    p.blob(cx, cy, 0.045, [[240, 148, 108], [176, 214, 130], [250, 208, 118], [236, 132, 150]][i], 0.95, 0.5);
  });
  p.blob(0.5, 0.05, 0.28, [255, 206, 130], 0.4, 0.9);
});

// 6. Wide family cover art
out('family-cover.png', 1200, 420, (p) => {
  p.fill((x, y) => mix([255, 186, 138], [255, 107, 74], x * 0.75 + y * 0.25));
  p.blob(0.14, 0.3, 0.22, [255, 236, 190], 0.55, 0.7);
  p.blob(0.82, 0.75, 0.3, [232, 84, 58], 0.45, 0.7);
  p.blob(0.55, 0.2, 0.18, [255, 214, 160], 0.4, 0.8);
  p.blob(0.35, 0.9, 0.25, [214, 74, 62], 0.35, 0.8);
});

console.log('all assets generated');
