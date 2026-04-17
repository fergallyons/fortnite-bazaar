// Run once: node generate-icons.mjs
// Requires: npm install sharp (dev only, not in package.json)
// Or use any online SVG-to-PNG converter with icon.svg
import { readFileSync, writeFileSync } from 'fs'

const svg = readFileSync('public/icon.svg')

try {
  const sharp = (await import('sharp')).default
  for (const size of [192, 512]) {
    await sharp(svg).resize(size, size).png().toFile(`public/icon-${size}.png`)
    console.log(`Created icon-${size}.png`)
  }
} catch {
  console.log('sharp not installed. To generate icons, run:')
  console.log('  npm install --save-dev sharp && node generate-icons.mjs')
  console.log('Or convert public/icon.svg manually to icon-192.png and icon-512.png')
}
