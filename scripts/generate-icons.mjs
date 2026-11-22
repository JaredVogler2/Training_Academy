// Renders the app icons from the brand mark with a real browser, so they match the vector exactly.
//
//   npm run icons
//
// Output: public/assets/icons/{icon-192,icon-512,icon-maskable-512,apple-touch-icon}.png (committed).

import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public/assets/icons');
mkdirSync(out, { recursive: true });

/** The brand mark's artwork on a 64-unit square. `rounded` clips it to the app-icon shape. */
function mark({ rounded, scale = 1 }) {
  const art = `
    <rect width="64" height="64" fill="url(#s)"/>
    <g transform="translate(32 34) scale(${scale}) translate(-32 -34)">
      <circle cx="48" cy="17" r="7.5" fill="#ffd35c"/>
      <path d="M9 49c6-13 15-19 23-19s17 6 23 19z" fill="#6fcf74"/>
      <path d="M14 49c5-8 11-12 18-12" fill="none" stroke="#8fe08e" stroke-width="3" stroke-linecap="round"/>
      <path d="M27 40 28.800 21h6.400L37 40z" fill="#fffaf0"/>
      <path d="M27.900 31h8.200l.4 4.200h-9z" fill="#ff8f7a"/>
      <path d="M26 21.500 32 12l6 9.500z" fill="#c94f3b"/>
      <circle cx="32" cy="26" r="1.900" fill="#ffd35c"/>
    </g>
    <path d="M-2 50c8-3 14 3 22 0s14-3 22 0 14 3 24 0v16H-2z" fill="#45b9c7"/>
    <path d="M-2 55c8-3 14 3 22 0s14-3 22 0 14 3 24 0v11H-2z" fill="#2b82b0" opacity=".55"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <defs>
      <linearGradient id="s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#6dbdea"/><stop offset=".75" stop-color="#fdecc8"/>
      </linearGradient>
      <clipPath id="c"><rect width="64" height="64" rx="17"/></clipPath>
    </defs>
    <g ${rounded ? 'clip-path="url(#c)"' : ''}>${art}</g>
  </svg>`;
}

const ICONS = [
  { file: 'icon-192.png', size: 192, rounded: true },
  { file: 'icon-512.png', size: 512, rounded: true },
  // Maskable: full-bleed, with the picture inside the central safe zone that any launcher shape keeps.
  { file: 'icon-maskable-512.png', size: 512, rounded: false, scale: 0.8 },
  // iOS rounds the corners itself and does not like transparency.
  { file: 'apple-touch-icon.png', size: 180, rounded: false, scale: 0.92 },
];

const browser = await chromium.launch();
try {
  for (const icon of ICONS) {
    const page = await browser.newPage({
      viewport: { width: icon.size, height: icon.size },
      deviceScaleFactor: 1,
    });
    await page.setContent(
      `<body style="margin:0;background:transparent">${mark(icon).replace('<svg ', `<svg width="${icon.size}" height="${icon.size}" `)}</body>`,
    );
    await page.screenshot({ path: join(out, icon.file), omitBackground: icon.rounded });
    await page.close();
    console.log(`wrote public/assets/icons/${icon.file}`);
  }
} finally {
  await browser.close();
}
