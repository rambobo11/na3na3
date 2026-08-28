import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const iconsDir = path.join(root, "public", "icons");
const splashDir = path.join(root, "public", "splash");
const BG = "#0b1210";

const cursorMaster = path.join(
  process.env.HOME || "",
  ".cursor/projects/Users-rambobo-Documents-Na3Na3/assets/icon-master.png",
);

async function resolveMaster() {
  if (process.env.ICON_MASTER) return process.env.ICON_MASTER;
  try {
    await access(cursorMaster);
    return cursorMaster;
  } catch {
    return path.join(iconsDir, "icon-512.png");
  }
}

const master = await resolveMaster();
console.log("master:", master);

async function resizeMaster(size, outPath) {
  await sharp(master)
    .resize(size, size, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

/** Android adaptive: keep mark inside ~center 72%. */
async function writeMaskable(size, outPath) {
  const content = Math.round(size * 0.72);
  const logo = await sharp(master)
    .resize(content, content, { fit: "cover" })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: BG,
    },
  })
    .composite([
      {
        input: logo,
        top: Math.round((size - content) / 2),
        left: Math.round((size - content) / 2),
      },
    ])
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

async function writeSplash(width, height, outPath) {
  const logoSize = Math.round(Math.min(width, height) * 0.26);
  const logo = await sharp(master)
    .resize(logoSize, logoSize, { fit: "cover" })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: BG,
    },
  })
    .composite([
      {
        input: logo,
        top: Math.round((height - logoSize) / 2),
        left: Math.round((width - logoSize) / 2),
      },
    ])
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

const splashes = [
  { w: 1290, h: 2796, name: "iphone-14-pro-max" },
  { w: 1179, h: 2556, name: "iphone-14-pro" },
  { w: 1170, h: 2532, name: "iphone-14" },
  { w: 1284, h: 2778, name: "iphone-13-pro-max" },
  { w: 1125, h: 2436, name: "iphone-x" },
  { w: 1242, h: 2688, name: "iphone-xs-max" },
  { w: 750, h: 1334, name: "iphone-se" },
  { w: 1668, h: 2388, name: "ipad-11" },
];

await mkdir(iconsDir, { recursive: true });
await mkdir(splashDir, { recursive: true });

await resizeMaster(180, path.join(iconsDir, "apple-touch-icon.png"));
await resizeMaster(192, path.join(iconsDir, "icon-192.png"));
await resizeMaster(512, path.join(iconsDir, "icon-512.png"));
await writeMaskable(512, path.join(iconsDir, "icon-512-maskable.png"));
await resizeMaster(32, path.join(root, "public", "favicon-32.png"));
await resizeMaster(16, path.join(root, "public", "favicon-16.png"));

for (const { w, h, name } of splashes) {
  await writeSplash(w, h, path.join(splashDir, `${name}.png`));
  console.log(`splash ${name} ${w}x${h}`);
}

console.log("icons + splash ready");
