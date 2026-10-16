import fs from 'node:fs/promises';
import sharp from 'sharp';
import { cropSheetObject } from './crop-sheet-object.mjs';
const sources={"tokens":"C:\\Users\\vagmi\\.codex\\generated_images\\01a11f2c-da01-7c60-b2e5-520c7ba5e131\\exec-fded2eaa-ead1-4c4d-b2d0-0865c5159e74.png","scenery":"C:\\Users\\vagmi\\.codex\\generated_images\\01a11f2c-da01-7c60-b2e5-520c7ba5e131\\exec-5a84690e-1655-4e0e-934c-3bc1ddad0438.png"};
await fs.mkdir('docs/production',{recursive:true});
for(const [kind,source] of Object.entries(sources)){
  const target=kind==='tokens'?'miniatures':'scenery'; await fs.mkdir(`public/art/${target}`,{recursive:true});
  await fs.copyFile(source,`public/art/${target}-sheet.png`);
  const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const axis=(vertical)=>{const length=vertical?info.height:info.width,other=vertical?info.width:info.height;const projection=Array.from({length},(_,n)=>{let v=0;for(let k=0;k<other;k++){const x=vertical?k:n,y=vertical?n:k;if(data[(y*info.width+x)*4+3]>60)v++;}return v;});const edges=[0];for(let n=1;n<6;n++){const center=n*length/6,spread=length/6*.18;let best=Math.round(center),score=Infinity;for(let i=Math.floor(center-spread);i<=center+spread;i++){const candidate=projection[i]+projection[i-1]+projection[i+1]+Math.abs(i-center)*.05;if(candidate<score){score=candidate;best=i;}}edges.push(best);}edges.push(length);return edges;};
  const xs=axis(false),ys=axis(true),contacts=[];
  if(kind==='tokens'){ys[3]=655;ys[4]=877;}
  console.log({kind,xs,ys});
  for(let i=0;i<36;i++){const col=i%6,row=Math.floor(i/6),left=xs[col],top=ys[row],width=xs[col+1]-left,height=ys[row+1]-top;const cell=await sharp(source).extract({left,top,width,height}).png().toBuffer();const croppedObject=await cropSheetObject(cell);const crop=await sharp(croppedObject).resize(280,280,{fit:'inside'}).png().toBuffer();const metadata=await sharp(crop).metadata();const result=await sharp({create:{width:320,height:320,channels:4,background:'#00000000'}}).composite([{input:crop,left:Math.floor((320-metadata.width)/2),top:320-metadata.height-20}]).webp({quality:94}).toBuffer();await fs.writeFile(`public/art/${target}/${kind==='tokens'?'token':'prop'}-${i}.webp`,result);contacts.push({input:await sharp(result).resize(150,150).png().toBuffer(),left:col*150,top:row*150});}
  await sharp({create:{width:900,height:900,channels:3,background:'#13232c'}}).composite(contacts).jpeg({quality:93}).toFile(`docs/production/${target}-contact.jpg`);
  console.log(`${target}: 36 peças com enquadramento e margem próprios.`);
}
