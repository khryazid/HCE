/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
const sharp = require('sharp');
const fs = require('fs');

async function createSplash() {
  await sharp({
    create: {
      width: 1170,
      height: 2532,
      channels: 4,
      background: { r: 10, g: 10, b: 10, alpha: 1 }
    }
  })
  .composite([
    {
      input: 'public/apple-touch-icon.png',
      gravity: 'center'
    }
  ])
  .png()
  .toFile('public/apple-splash-screen-1170x2532.png');
  console.log('Done splash');
}

createSplash().catch(console.error);
