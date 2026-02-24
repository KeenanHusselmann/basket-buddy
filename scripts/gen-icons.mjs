// generates pwa-192.png and pwa-512.png from basket.svg using sharp
import sharp from 'sharp';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, '..');
const svgPath = resolve(root, 'public', 'basket.svg');

if (!existsSync(svgPath)) {
  console.error('basket.svg not found at', svgPath);
  process.exit(1);
}

const svgBuf = readFileSync(svgPath);

for (const size of [192, 512]) {
  // Create a coloured background square, then composite the icon on top
  const bg = await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 99, g: 102, b: 241, alpha: 1 } },
  }).png().toBuffer();

  const padding = Math.round(size * 0.15);
  const iconSize = size - padding * 2;

  const icon = await sharp(svgBuf).resize(iconSize, iconSize).png().toBuffer();

  await sharp(bg)
    .composite([{ input: icon, top: padding, left: padding }])
    .toFile(resolve(root, 'public', `pwa-${size}.png`));

  console.log(`✓ pwa-${size}.png`);
}
