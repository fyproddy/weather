// Turns the original photographs in /photos-src into graded, web-ready WebP
// files in /public/images, plus a manifest the <Photo> component reads.
//
//   1. Drop a JPG/PNG into /photos-src (name it like `stay-rooftop.jpg`)
//   2. npm run images
//   3. Reference it by name in content/images.ts
//
// Every photo gets the same "house grade" so phone shots from different
// places sit together as one editorial set: neutral-warm white balance,
// a soft filmic tone curve, calmer colour (especially electric blues),
// a gentle vignette, fine sharpening and a touch of grain.
import sharp from "sharp";
import { readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const SRC = "photos-src";
const OUT = "public/images";
const MASTER = 2200; // graded master width; smaller sizes derive from it
const WIDTHS = [640, 1080, 1600, 2200];

// Per-photo tweaks, optional. exposure: stops-ish multiplier, warmth: -1..1
const OVERRIDES = {
  "move-vclass": { exposure: 1.06 },
  "move-maybach-cabin": { exposure: 1.03 },
  "stay-villa-garden": { wb: 0.12, warmth: 0.25, blues: 0.18, greens: 0.8, exposure: 1.03 },
  "drinks-on-ice": { wb: 0.3 },
  // keep some of the club light — it is the point of the photo
  "night-bottle-parade": { wb: 0.2, blues: 0.2, warmth: 0.15 },
};

// ---------- colour helpers ----------
const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

// Filmic S-curve with lifted blacks and rolled-off highlights.
function buildCurve() {
  const lut = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = i / 255;
    // smooth S around the midpoint
    const s = x < 0.5 ? 0.5 * Math.pow(2 * x, 1.18) : 1 - 0.5 * Math.pow(2 * (1 - x), 1.18);
    const y = 0.035 + s * (0.955 - 0.035); // black lift / highlight roll-off
    lut[i] = y * 255;
  }
  return lut;
}
const CURVE = buildCurve();

function rgbToHsl(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}
function hue2rgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}
function hslToRgb(h, s, l) {
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hk = h / 360;
  return [hue2rgb(p, q, hk + 1 / 3), hue2rgb(p, q, hk), hue2rgb(p, q, hk - 1 / 3)];
}
// how close hue h is to target (0..1), within width degrees
const near = (h, target, width) => {
  const d = Math.min(Math.abs(h - target), 360 - Math.abs(h - target));
  return d > width ? 0 : 1 - d / width;
};

function grade(data, width, height, channels, opts) {
  const { exposure = 1, warmth = 0.35, greens = 0.85, blues = 0.45, wb: wbStrength = 0.55 } = opts;

  // gray-world white balance, applied partially so places keep their character
  let sr = 0, sg = 0, sb = 0, n = 0;
  for (let i = 0; i < data.length; i += channels * 7) {
    sr += data[i]; sg += data[i + 1]; sb += data[i + 2]; n++;
  }
  const avg = (sr + sg + sb) / (3 * n);
  const k = wbStrength;
  let wr = 1 + k * (avg / (sr / n) - 1);
  let wg = 1 + k * (avg / (sg / n) - 1);
  let wb = 1 + k * (avg / (sb / n) - 1);
  // house warmth
  wr *= 1 + 0.035 * warmth;
  wb *= 1 - 0.05 * warmth;

  const cx = width / 2, cy = height / 2;
  const maxD = Math.sqrt(cx * cx + cy * cy);
  let seed = 1337;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      let r = clamp(data[i] * wr * exposure);
      let g = clamp(data[i + 1] * wg * exposure);
      let b = clamp(data[i + 2] * wb * exposure);

      // tone curve
      r = CURVE[r | 0]; g = CURVE[g | 0]; b = CURVE[b | 0];

      // colour: overall restraint, calm electric blues and loud greens,
      // keep skin/wood/warm tones
      let [h, s, l] = rgbToHsl(r / 255, g / 255, b / 255);
      let sat = 0.9;
      sat *= 1 - blues * near(h, 225, 40); // LED / sky blue
      sat *= 1 - (1 - greens) * near(h, 105, 45); // artificial grass etc.
      sat *= 1 + 0.06 * near(h, 30, 25); // warm wood, skin, candlelight
      s = Math.min(1, s * sat);
      // split tone: warm highlights, neutral-cool shadows
      [r, g, b] = hslToRgb(h, s, l).map((v) => v * 255);
      const hi = Math.max(0, l - 0.55) / 0.45;
      const lo = Math.max(0, 0.35 - l) / 0.35;
      r += 5 * hi - 1.5 * lo;
      g += 2 * hi;
      b += -4 * hi + 2 * lo;

      // vignette
      const dx = x - cx, dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy) / maxD;
      const v = 1 - 0.22 * Math.pow(Math.max(0, d - 0.45) / 0.55, 1.6);

      // fine luminance grain
      const grain = (rand() - 0.5) * 5;

      data[i] = clamp(r * v + grain);
      data[i + 1] = clamp(g * v + grain);
      data[i + 2] = clamp(b * v + grain);
    }
  }
}

// ---------- run ----------
await mkdir(OUT, { recursive: true });
const files = (await readdir(SRC)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
const manifest = {};

for (const file of files) {
  const name = path.parse(file).name;
  const base = sharp(path.join(SRC, file)).rotate();
  const meta = await base.metadata();
  const masterW = Math.min(MASTER, meta.width);

  // light denoise via downscale, then grade the master
  const { data, info } = await base
    .clone()
    .resize({ width: masterW, kernel: "lanczos3" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  grade(data, info.width, info.height, info.channels, OVERRIDES[name] || {});

  const graded = sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } });
  const sizes = WIDTHS.filter((w) => w <= info.width);
  if (sizes.at(-1) !== info.width && info.width < MASTER) sizes.push(info.width); // smaller originals keep full size

  for (const w of sizes) {
    await graded
      .clone()
      .resize({ width: w, kernel: "lanczos3" })
      .sharpen({ sigma: w > 1200 ? 0.7 : 0.5, m1: 0.6, m2: 1.2 })
      .webp({ quality: w > 1200 ? 74 : 78, smartSubsample: true })
      .toFile(path.join(OUT, `${name}-${w}.webp`));
  }

  const { dominant } = await graded.clone().resize(48).stats();
  manifest[name] = {
    width: info.width,
    height: info.height,
    sizes,
    color: `rgb(${dominant.r} ${dominant.g} ${dominant.b})`,
  };
  console.log(`✓ ${name} (${sizes.join(", ")})`);
}

// social share image (1200×630), cropped from the villa interior
if (manifest["stay-villa-interior"]) {
  await sharp(path.join(OUT, "stay-villa-interior-2200.webp"))
    .resize(1200, 630, { fit: "cover", position: "centre" })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(OUT, "og.jpg"));
}

await writeFile("content/photo-manifest.json", JSON.stringify(manifest, null, 2) + "\n");
console.log(`\n${files.length} photos → ${OUT}`);
