// Maakt de app-iconen (PNG) voor Kastje: een kledinghanger op saliegroen.
// Gebruikt alleen wat in Node zit (zlib), geen extra pakketten.
// Draaien met: node scripts/make-icons.mjs   (de PNG's komen in public/icons/)
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const SAGE = [79, 107, 90];
const CREAM = [245, 242, 236];

// ---------- PNG schrijven ----------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bits per kanaal
  header[9] = 6; // RGBA
  const rows = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    rows[y * (size * 4 + 1)] = 0; // geen filter
    rgba.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- Vormen (in coördinaten 0..1) ----------

function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Afstand tot de lijnen van de hanger: haakje, steeltje en driehoek. */
function hangerDistance(x, y) {
  // Haakje: een cirkelboog, open aan de linkeronderkant
  const hx = 0.5;
  const hy = 0.255;
  const r = 0.07;
  const angle = Math.atan2(y - hy, x - hx); // 0 = rechts, positief = naar beneden
  const onArc = !(angle > Math.PI * 0.45 && angle < Math.PI * 1.0);
  const arc = onArc ? Math.abs(Math.hypot(x - hx, y - hy) - r) : Infinity;
  // Steeltje van onder het haakje naar de top van de driehoek
  const stem = distanceToSegment(x, y, 0.5, hy + r, 0.5, 0.4);
  // Driehoek
  const top = [0.5, 0.4];
  const left = [0.17, 0.7];
  const right = [0.83, 0.7];
  const triangle = Math.min(
    distanceToSegment(x, y, ...top, ...left),
    distanceToSegment(x, y, ...top, ...right),
    distanceToSegment(x, y, ...left, ...right),
  );
  return Math.min(arc, stem, triangle);
}

/** Zit (x, y) binnen een afgeronde rechthoek die het hele vlak vult? */
function insideRoundedSquare(x, y, radius) {
  const cx = Math.min(Math.max(x, radius), 1 - radius);
  const cy = Math.min(Math.max(y, radius), 1 - radius);
  return Math.hypot(x - cx, y - cy) <= radius;
}

/**
 * Tekent een icoon.
 * - rounded: afgeronde hoeken met doorzichtige rand (gewoon app-icoon)
 * - scale: hoe groot de hanger is (kleiner voor "maskable", zodat hij binnen de veilige zone valt)
 */
function drawIcon(size, { rounded, scale }) {
  const rgba = Buffer.alloc(size * size * 4);
  const samples = 4; // 4×4 subpixels voor zachte randen
  const stroke = 0.045 / 2;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let bg = 0;
      let fg = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const x = (px + (sx + 0.5) / samples) / size;
          const y = (py + (sy + 0.5) / samples) / size;
          const inBg = rounded ? insideRoundedSquare(x, y, 0.22) : true;
          if (!inBg) continue;
          bg++;
          // Hanger rond het midden schalen (iets omhoog geschoven zodat hij optisch gecentreerd is)
          const hx = 0.5 + (x - 0.5) / scale;
          const hy = 0.47 + (y - 0.5) / scale;
          if (hangerDistance(hx, hy) <= stroke) fg++;
        }
      }
      const total = samples * samples;
      const alpha = bg / total;
      const mix = bg ? fg / bg : 0;
      const i = (py * size + px) * 4;
      for (let c = 0; c < 3; c++) rgba[i + c] = Math.round(SAGE[c] * (1 - mix) + CREAM[c] * mix);
      rgba[i + 3] = Math.round(alpha * 255);
    }
  }
  return encodePng(size, rgba);
}

const outDir = new URL('../public/icons/', import.meta.url);
mkdirSync(outDir, { recursive: true });
const icons = {
  'icon-192.png': drawIcon(192, { rounded: true, scale: 1 }),
  'icon-512.png': drawIcon(512, { rounded: true, scale: 1 }),
  'icon-maskable-512.png': drawIcon(512, { rounded: false, scale: 0.78 }),
  'apple-touch-icon.png': drawIcon(180, { rounded: false, scale: 0.9 }),
};
for (const [name, png] of Object.entries(icons)) {
  writeFileSync(new URL(name, outDir), png);
  console.log(`public/icons/${name} (${(png.length / 1024).toFixed(1)} kB)`);
}
