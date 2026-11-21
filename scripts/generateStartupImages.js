#!/usr/bin/env node
/**
 * Generates iOS PWA launch images (apple-touch-startup-image) and writes the
 * matching <link> tags into public/index.html between the STARTUP-IMAGES markers.
 *
 * iOS shows these from disk the instant a home-screen app launches, before any
 * network request. It only uses an image whose pixel size exactly matches the
 * device screen, selected by the <link media> query, so every supported screen
 * size needs its own file.
 *
 * Usage: node scripts/generateStartupImages.js
 * Dependency-free: PNG decode/encode uses Node's built-in zlib.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const ICON = path.join(ROOT, 'public/icon-512.png');
const OUT_DIR = path.join(ROOT, 'public/splash');
const INDEX_HTML = path.join(ROOT, 'public/index.html');

const BACKGROUND = [0x1a, 0x18, 0x16];
const ICON_POINTS = 160;

// [css width, css height, device pixel ratio, label], portrait.
const IPHONES = [
  [440, 956, 3, 'iPhone 16/17 Pro Max'],
  [430, 932, 3, 'iPhone 14 Pro Max, 15 Plus/Pro Max, 16 Plus'],
  [428, 926, 3, 'iPhone 12/13 Pro Max, 14 Plus'],
  [420, 912, 3, 'iPhone Air'],
  [414, 896, 3, 'iPhone XS Max, 11 Pro Max'],
  [414, 896, 2, 'iPhone XR, 11'],
  [414, 736, 3, 'iPhone 6/7/8 Plus'],
  [402, 874, 3, 'iPhone 16 Pro, 17, 17 Pro'],
  [393, 852, 3, 'iPhone 14 Pro, 15, 15 Pro, 16'],
  [390, 844, 3, 'iPhone 12/13/14, 12/13 Pro, 16e'],
  [375, 812, 3, 'iPhone X, XS, 11 Pro, 12/13 mini'],
  [375, 667, 2, 'iPhone 6/7/8, SE 2nd/3rd gen'],
  [320, 568, 2, 'iPhone SE 1st gen'],
];

// iPads rotate freely, so they get portrait and landscape images.
const IPADS = [
  [1032, 1376, 2, 'iPad Pro 13" (M4), iPad Air 13" (M2+)'],
  [1024, 1366, 2, 'iPad Pro 12.9"'],
  [834, 1210, 2, 'iPad Pro 11" (M4)'],
  [834, 1194, 2, 'iPad Pro 11"'],
  [834, 1112, 2, 'iPad Air 10.5"'],
  [820, 1180, 2, 'iPad Air 10.9"/11", iPad 10th gen+'],
  [810, 1080, 2, 'iPad 10.2"'],
  [768, 1024, 2, 'iPad 9.7", iPad mini 5'],
  [744, 1133, 2, 'iPad mini 6+'],
];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** Decodes an 8-bit, non-interlaced RGB or RGBA PNG into RGB pixels. */
function decodePng(file) {
  const buf = fs.readFileSync(file);
  let pos = 8;
  let width, height, channels;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const [bitDepth, colorType, , , interlace] = data.subarray(8);
      if (bitDepth !== 8 || interlace !== 0 || (colorType !== 2 && colorType !== 6)) {
        throw new Error(`${file}: only 8-bit non-interlaced RGB/RGBA PNGs are supported`);
      }
      channels = colorType === 6 ? 4 : 3;
    } else if (type === 'IDAT') {
      idat.push(data);
    }
    pos += 12 + len;
  }

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(width * height * 3);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? line[i - channels] : 0;
      const b = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      let p;
      switch (filter) {
        case 0: p = 0; break;
        case 1: p = a; break;
        case 2: p = b; break;
        case 3: p = (a + b) >> 1; break;
        case 4: {
          const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
          p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
          break;
        }
        default: throw new Error(`${file}: unknown PNG filter ${filter}`);
      }
      line[i] = (line[i] + p) & 0xff;
    }
    for (let x = 0; x < width; x++) {
      line.copy(out, (y * width + x) * 3, x * channels, x * channels + 3);
    }
    prev = line;
  }
  return { width, height, data: out };
}

function encodePng(width, height, rgb) {
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Box-filter resample: each output pixel averages the source area it covers. */
function resize(src, size) {
  const out = Buffer.alloc(size * size * 3);
  const scale = src.width / size;
  for (let y = 0; y < size; y++) {
    const y0 = y * scale, y1 = y0 + scale;
    for (let x = 0; x < size; x++) {
      const x0 = x * scale, x1 = x0 + scale;
      const sum = [0, 0, 0];
      let weight = 0;
      for (let sy = Math.floor(y0); sy < Math.ceil(y1); sy++) {
        const wy = Math.min(sy + 1, y1) - Math.max(sy, y0);
        for (let sx = Math.floor(x0); sx < Math.ceil(x1); sx++) {
          const w = wy * (Math.min(sx + 1, x1) - Math.max(sx, x0));
          const i = (sy * src.width + sx) * 3;
          sum[0] += src.data[i] * w;
          sum[1] += src.data[i + 1] * w;
          sum[2] += src.data[i + 2] * w;
          weight += w;
        }
      }
      const o = (y * size + x) * 3;
      out[o] = Math.round(sum[0] / weight);
      out[o + 1] = Math.round(sum[1] / weight);
      out[o + 2] = Math.round(sum[2] / weight);
    }
  }
  return { width: size, height: size, data: out };
}

function renderLaunchImage(width, height, icon) {
  const rgb = Buffer.alloc(width * height * 3);
  for (let i = 0; i < rgb.length; i += 3) {
    rgb[i] = BACKGROUND[0];
    rgb[i + 1] = BACKGROUND[1];
    rgb[i + 2] = BACKGROUND[2];
  }
  const left = Math.round((width - icon.width) / 2);
  const top = Math.round((height - icon.height) / 2);
  for (let y = 0; y < icon.height; y++) {
    icon.data.copy(
      rgb,
      ((top + y) * width + left) * 3,
      y * icon.width * 3,
      (y + 1) * icon.width * 3
    );
  }
  return encodePng(width, height, rgb);
}

function main() {
  const sourceIcon = decodePng(ICON);
  const iconsByRatio = new Map();
  const iconFor = (ratio) => {
    if (!iconsByRatio.has(ratio)) iconsByRatio.set(ratio, resize(sourceIcon, ICON_POINTS * ratio));
    return iconsByRatio.get(ratio);
  };

  const targets = [
    ...IPHONES.map(([w, h, r, label]) => ({ w, h, r, label, orientation: 'portrait' })),
    ...IPADS.flatMap(([w, h, r, label]) => [
      { w, h, r, label, orientation: 'portrait' },
      { w, h, r, label, orientation: 'landscape' },
    ]),
  ];

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const links = targets.map(({ w, h, r, label, orientation }) => {
    const portrait = orientation === 'portrait';
    const pxW = (portrait ? w : h) * r;
    const pxH = (portrait ? h : w) * r;
    const name = `launch-${pxW}x${pxH}.png`;
    fs.writeFileSync(path.join(OUT_DIR, name), renderLaunchImage(pxW, pxH, iconFor(r)));
    // device-width/height are fixed to the portrait dimensions on iOS regardless of rotation.
    const media =
      `(device-width: ${w}px) and (device-height: ${h}px) and ` +
      `(-webkit-device-pixel-ratio: ${r}) and (orientation: ${orientation})`;
    return `    <!-- ${label}, ${orientation} -->\n    <link rel="apple-touch-startup-image" media="${media}" href="/splash/${name}" />`;
  });

  const START = '<!-- STARTUP-IMAGES:START (generated by scripts/generateStartupImages.js) -->';
  const END = '<!-- STARTUP-IMAGES:END -->';
  const html = fs.readFileSync(INDEX_HTML, 'utf8');
  const block = `${START}\n${links.join('\n')}\n    ${END}`;
  const pattern = /<!-- STARTUP-IMAGES:START[\s\S]*?<!-- STARTUP-IMAGES:END -->/;
  if (!pattern.test(html)) {
    throw new Error(`public/index.html is missing the STARTUP-IMAGES markers`);
  }
  fs.writeFileSync(INDEX_HTML, html.replace(pattern, block));

  console.log(`Wrote ${targets.length} launch images to public/splash and updated public/index.html`);
}

main();
