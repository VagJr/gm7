import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const source = 'C:/Users/vagmi/.codex/generated_images/01a11f2c-da01-7c60-b2e5-520c7ba5e131';
const atlas = [
  ['tokens', 'exec-39757f49-222b-434d-b8cc-1a403e38d572.png', 'token'],
  ['terrain', 'exec-5bae8efe-bf3a-4028-a48a-fa90f429dd64.png', 'terrain'],
];
await fs.mkdir('public/art', { recursive: true });
for (const [kind, file, prefix] of atlas) {
  const input = path.join(source, file);
  await fs.copyFile(input, `public/art/${kind}-sheet.png`);
  await fs.mkdir(`public/art/${kind}`, { recursive: true });
  const { width, height } = await sharp(input).metadata();
  for (let i = 0; i < 36; i++) {
    const x = i % 6, y = Math.floor(i / 6);
    const left = Math.floor(x * width / 6), top = Math.floor(y * height / 6);
    await sharp(input).extract({ left, top, width: Math.floor((x + 1) * width / 6) - left, height: Math.floor((y + 1) * height / 6) - top }).webp({ quality: 90 }).toFile(`public/art/${kind}/${prefix}-${i}.webp`);
  }
}
await sharp(path.join(source, 'exec-e7712243-d056-444c-8454-006963c83106.png')).resize({ width: 1000, withoutEnlargement: true }).png().toFile('public/art/dragons-logo.png');
console.log('72 assets e logotipo preparados.');
