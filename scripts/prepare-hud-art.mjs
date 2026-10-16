import fs from 'node:fs/promises';
import sharp from 'sharp';
const panelSource="C:\\Users\\vagmi\\.codex\\generated_images\\01a11f2c-da01-7c60-b2e5-520c7ba5e131\\exec-98491a4c-09ab-476d-9786-32141b4327ab.png";
const iconSource="C:\\Users\\vagmi\\.codex\\generated_images\\01a11f2c-da01-7c60-b2e5-520c7ba5e131\\exec-7c6ee55d-464a-4ddb-8566-ca1c29dc01e1.png";
await fs.mkdir('public/art/ui',{recursive:true});
const panelNames=['frame-bronze','frame-gold','frame-leather','button-default','button-selected','button-disabled','surface-stone','surface-leather','surface-parchment'];
const metadata=await sharp(panelSource).metadata();
// The button row is shorter than the square frame and material rows in this production sheet.
const rows=[0,460,758,1254];
for(let i=0;i<9;i++){const col=i%3,row=Math.floor(i/3),left=Math.floor(col*metadata.width/3),right=Math.floor((col+1)*metadata.width/3);const cell=await sharp(panelSource).extract({left,top:rows[row],width:right-left,height:rows[row+1]-rows[row]}).png().toBuffer();await sharp(cell).trim({threshold:25}).webp({quality:94}).toFile(`public/art/ui/${panelNames[i]}.webp`);}
const icons=await sharp(iconSource).metadata();
for(let i=0;i<36;i++){const col=i%6,row=Math.floor(i/6),left=Math.floor(col*icons.width/6),top=Math.floor(row*icons.height/6);const cell=await sharp(iconSource).extract({left,top,width:Math.floor((col+1)*icons.width/6)-left,height:Math.floor((row+1)*icons.height/6)-top}).png().toBuffer();const icon=await sharp(cell).trim({threshold:30}).resize(112,112,{fit:'inside'}).png().toBuffer();await sharp({create:{width:128,height:128,channels:4,background:'#00000000'}}).composite([{input:icon,gravity:'centre'}]).webp({quality:94}).toFile(`public/art/ui/icon-${i}.webp`);}
console.log('9 fundos/molduras e 36 ícones próprios preparados.');
