#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = '/Users/claudio2/.gemini/antigravity/scratch/luna-nihongo';
const sourceSvgPath = join(ROOT, 'public/favicon.svg');
const outDir = join(ROOT, 'public/pwa');

const faviconSvg = readFileSync(sourceSvgPath, 'utf8');
const pathMatch = faviconSvg.match(/<path[^>]*d="([^"]+)"/i);

if (!pathMatch) {
  throw new Error('Could not parse path from public/favicon.svg');
}

const iconPath = pathMatch[1];
const sourceWidth = 1455;
const sourceHeight = 1440;
const canvas = 1024;
const iconRatio = 0.76;
const target = canvas * iconRatio;
const scale = Math.min(target / sourceWidth, target / sourceHeight);
const scaledWidth = sourceWidth * scale;
const scaledHeight = sourceHeight * scale;
const translateX = (canvas - scaledWidth) / 2;
const translateY = (canvas - scaledHeight) / 2;

const composedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas}" height="${canvas}" viewBox="0 0 ${canvas} ${canvas}">
  <rect width="${canvas}" height="${canvas}" fill="#000000" />
  <g transform="translate(${translateX} ${translateY}) scale(${scale})">
    <path fill="#d6304a" d="${iconPath}" />
  </g>
</svg>
`;

const tempDir = mkdtempSync(join(tmpdir(), 'luna-pwa-icons-'));
const tempSvgPath = join(tempDir, 'icon-base.svg');
writeFileSync(tempSvgPath, composedSvg, 'utf8');

const renderPng = (size, outputFile) => {
  execFileSync(
    'npx',
    [
      '--yes',
      'sharp-cli',
      '-i',
      tempSvgPath,
      '--density',
      '1024',
      '-o',
      outputFile,
      'resize',
      String(size),
      String(size),
      '--fit',
      'cover',
    ],
    { stdio: 'inherit' },
  );
};

try {
  renderPng(192, join(outDir, 'icon-192.png'));
  renderPng(512, join(outDir, 'icon-512.png'));
  renderPng(180, join(outDir, 'apple-touch-icon.png'));
  console.log('Generated PWA icons in public/pwa');
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
