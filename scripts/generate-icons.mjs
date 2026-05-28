/**
 * generate-icons.mjs
 * Generates all PWA icons, favicon, and apple-touch-icon from public/logo.png
 * Outputs WebP for PWA icons + PNG for favicon/apple-touch-icon (compatibility)
 */
import sharp from 'sharp';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

const SOURCE = join(process.cwd(), 'public', 'logo.png');
const ICONS_DIR = join(process.cwd(), 'public', 'icons');
const PUBLIC_DIR = join(process.cwd(), 'public');

// PWA icon sizes — output as WebP
const PWA_SIZES = [48, 96, 144, 192, 256, 384, 512];

// Maskable icon needs extra padding (safe zone is inner 80%)
const MASKABLE_SIZE = 512;

async function main() {
  await mkdir(ICONS_DIR, { recursive: true });

  const source = sharp(SOURCE);
  const metadata = await source.metadata();
  console.log(`Source: ${metadata.width}x${metadata.height} ${metadata.format}`);

  // ── 1. PWA icons (WebP) ──
  for (const size of PWA_SIZES) {
    const outPath = join(ICONS_DIR, `icon-${size}.webp`);
    await sharp(SOURCE)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 90 })
      .toFile(outPath);
    console.log(`✓ ${outPath} (${size}x${size} WebP)`);
  }

  // ── 2. android-chrome icons (WebP) — for manifest ──
  for (const size of [192, 512]) {
    const outPath = join(ICONS_DIR, `android-chrome-${size}x${size}.webp`);
    await sharp(SOURCE)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 92 })
      .toFile(outPath);
    console.log(`✓ ${outPath} (android-chrome ${size}x${size} WebP)`);
  }

  // ── 3. Maskable icon (WebP) — 512x512 with 10% padding on each side ──
  {
    const innerSize = Math.round(MASKABLE_SIZE * 0.8); // 80% safe zone
    const outPath = join(ICONS_DIR, `icon-512-maskable.webp`);
    const resized = await sharp(SOURCE)
      .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();
    
    await sharp({
      create: {
        width: MASKABLE_SIZE,
        height: MASKABLE_SIZE,
        channels: 4,
        background: { r: 9, g: 9, b: 11, alpha: 1 }, // #09090B — theme bg
      }
    })
      .composite([{ input: resized, gravity: 'centre' }])
      .webp({ quality: 92 })
      .toFile(outPath);
    console.log(`✓ ${outPath} (maskable 512x512 WebP)`);
  }

  // ── 4. apple-touch-icon.png (180x180, PNG — Apple requires PNG) ──
  {
    const outPath = join(PUBLIC_DIR, 'apple-touch-icon.png');
    await sharp(SOURCE)
      .resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ quality: 90 })
      .toFile(outPath);
    console.log(`✓ ${outPath} (apple-touch-icon 180x180 PNG)`);
  }

  // ── 5. favicon.ico (48x48 PNG embedded in ICO container) ──
  // ICO format: we'll generate a 48x48 PNG and wrap it manually
  {
    const png48 = await sharp(SOURCE)
      .resize(48, 48, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    const ico = createIco(png48, 48, 48);
    
    // Write to both locations
    await writeFile(join(PUBLIC_DIR, 'favicon.ico'), ico);
    await writeFile(join(process.cwd(), 'src', 'app', 'favicon.ico'), ico);
    console.log(`✓ favicon.ico (48x48 ICO — public/ + src/app/)`);
  }

  // ── 6. Keep PNG versions of android-chrome for legacy compatibility ──
  for (const size of [192, 512]) {
    const outPath = join(ICONS_DIR, `android-chrome-${size}x${size}.png`);
    await sharp(SOURCE)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ quality: 90 })
      .toFile(outPath);
    console.log(`✓ ${outPath} (android-chrome ${size}x${size} PNG fallback)`);
  }

  // ── 7. Remove old PNG-only PWA icons ──
  const { unlink } = await import('fs/promises');
  const oldFiles = [
    'icon-48.png', 'icon-96.png', 'icon-144.png', 'icon-256.png', 
    'icon-384.png', 'icon-512-maskable.png'
  ];
  for (const file of oldFiles) {
    try {
      await unlink(join(ICONS_DIR, file));
      console.log(`🗑️  Removed old ${file}`);
    } catch { /* doesn't exist, skip */ }
  }

  console.log('\n✅ All icons generated successfully!');
}

/**
 * Creates a minimal ICO file from a PNG buffer.
 * ICO format: Header (6 bytes) + Entry (16 bytes) + PNG data
 */
function createIco(pngBuffer, width, height) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);       // Reserved
  header.writeUInt16LE(1, 2);       // ICO type
  header.writeUInt16LE(1, 4);       // 1 image

  const entry = Buffer.alloc(16);
  entry.writeUInt8(width >= 256 ? 0 : width, 0);   // Width
  entry.writeUInt8(height >= 256 ? 0 : height, 1);  // Height
  entry.writeUInt8(0, 2);           // Color palette
  entry.writeUInt8(0, 3);           // Reserved
  entry.writeUInt16LE(1, 4);        // Color planes
  entry.writeUInt16LE(32, 6);       // Bits per pixel
  entry.writeUInt32LE(pngBuffer.length, 8);  // Image size
  entry.writeUInt32LE(22, 12);      // Offset (6 + 16 = 22)

  return Buffer.concat([header, entry, pngBuffer]);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
