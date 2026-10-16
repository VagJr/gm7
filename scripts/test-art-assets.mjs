import assert from 'node:assert/strict';
import sharp from 'sharp';
const panels=['frame-bronze','frame-gold','frame-leather','button-default','button-selected','button-disabled','surface-stone','surface-leather','surface-parchment'];
const assets=[...Array.from({length:36},(_,i)=>`/art/miniatures/token-${i}.webp`),...Array.from({length:36},(_,i)=>`/art/scenery/prop-${i}.webp`),...Array.from({length:36},(_,i)=>`/art/ui/icon-${i}.webp`),...panels.map(n=>`/art/ui/${n}.webp`),...Array.from({length:36},(_,i)=>`/art/terrain/terrain-${i}.webp`),...['vila','mata','ruinas','dungeon','canyon','covil'].map(n=>`/maps/${n}-v2.webp`),'/art/dragons-logo.png','/art/dragons-menu.webp'];
for(const asset of assets){
  const metadata=await sharp(`public${asset}`).metadata();assert.ok(metadata.width>=100&&metadata.height>=100,asset);
  if(asset.includes('/miniatures/')||asset.includes('/scenery/')){
    assert.ok(metadata.hasAlpha,`${asset}: transparência preservada`);
    const {data,info}=await sharp(`public${asset}`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(x<16||y<16||x>=info.width-16||y>=info.height-16)assert.equal(data[(y*info.width+x)*4+3],0,`${asset}: margem impede recorte da figura`);
  }
}
const base=process.env.TEST_BASE_URL;
if(base){for(let i=0;i<assets.length;i+=4){await Promise.all(assets.slice(i,i+4).map(async asset=>{const response=await fetch(base+asset,{method:'HEAD'});assert.equal(response.status,200,asset);assert.match(response.headers.get('content-type'),/^image\//,asset);}));}assert.equal((await fetch(base+'/SRD-5.2.1.pdf',{method:'HEAD'})).status,200);}
console.log(`PASS: ${assets.length} imagens válidas, 72 miniaturas/cenários com margens seguras e 45 artes do HUD${base?', todas disponíveis por HTTP e créditos SRD acessíveis':''}.`);
