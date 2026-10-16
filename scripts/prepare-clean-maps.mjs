import fs from 'node:fs/promises';
import sharp from 'sharp';
const maps = [{"name":"mata","source":"C:\\Users\\vagmi\\.codex\\generated_images\\01a11f2c-da01-7c60-b2e5-520c7ba5e131\\exec-e1aab5e7-3601-455f-aa0d-01e0c2f2a440.png"},{"name":"ruinas","source":"C:\\Users\\vagmi\\.codex\\generated_images\\01a11f2c-da01-7c60-b2e5-520c7ba5e131\\exec-302a727f-3234-4da0-ad34-8301e56cdf5d.png"},{"name":"dungeon","source":"C:\\Users\\vagmi\\.codex\\generated_images\\01a11f2c-da01-7c60-b2e5-520c7ba5e131\\exec-ae7c82f1-59ab-4bb7-bbef-8fcd89051a71.png"},{"name":"canyon","source":"C:\\Users\\vagmi\\.codex\\generated_images\\01a11f2c-da01-7c60-b2e5-520c7ba5e131\\exec-006eadc7-7e42-480d-974e-17a1d3a45ca0.png"},{"name":"covil","source":"C:\\Users\\vagmi\\.codex\\generated_images\\01a11f2c-da01-7c60-b2e5-520c7ba5e131\\exec-fd8e6c6b-c4dd-45f7-baa6-f29010815fb9.png"}];
const comparisons = [];
for (const [i, {name, source}] of maps.entries()) {
  await sharp(source).webp({quality:92}).toFile(`public/maps/${name}-v2.webp`);
  comparisons.push({input: await sharp(`public/maps/${name}.png`).resize(640,360,{fit:'fill'}).png().toBuffer(),left:0,top:i*360});
  comparisons.push({input: await sharp(source).resize(640,360,{fit:'fill'}).png().toBuffer(),left:640,top:i*360});
}
await sharp({create:{width:1280,height:1800,channels:3,background:'#111'}}).composite(comparisons).jpeg({quality:90}).toFile('docs/visual-qa/map-comparison.jpg');
console.log('Cinco mapas preparados; originais preservados.');
