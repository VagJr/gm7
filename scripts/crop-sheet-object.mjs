import sharp from 'sharp';

// Find the primary figure before extracting it, rather than including tips of
// neighbouring figures that cross a generated sheet's nominal cell boundaries.
export async function cropSheetObject(buffer) {
  const {data,info}=await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const seen=new Uint8Array(info.width*info.height),components=[];
  for(let pixel=0;pixel<seen.length;pixel++){
    if(seen[pixel]||data[pixel*4+3]<48)continue;
    const queue=[pixel];seen[pixel]=1;
    const bounds={area:0,left:info.width,top:info.height,right:0,bottom:0};
    for(let cursor=0;cursor<queue.length;cursor++){
      const current=queue[cursor],x=current%info.width,y=Math.floor(current/info.width);
      bounds.area++;bounds.left=Math.min(bounds.left,x);bounds.right=Math.max(bounds.right,x);bounds.top=Math.min(bounds.top,y);bounds.bottom=Math.max(bounds.bottom,y);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=info.width||ny>=info.height)continue;
        const next=ny*info.width+nx;if(!seen[next]&&data[next*4+3]>=48){seen[next]=1;queue.push(next);}
      }
    }
    components.push(bounds);
  }
  components.sort((a,b)=>b.area-a.area);const main=components[0];if(!main)return buffer;
  const kept=components.filter(component=>component.area>=main.area*.05 && !(component.area<main.area*.2 && (component.right-component.left)>8*(component.bottom-component.top+1)));
  const left=Math.max(0,Math.min(...kept.map(c=>c.left))-2),top=Math.max(0,Math.min(...kept.map(c=>c.top))-2),right=Math.min(info.width,Math.max(...kept.map(c=>c.right))+3),bottom=Math.min(info.height,Math.max(...kept.map(c=>c.bottom))+3);
  return sharp(buffer).extract({left,top,width:right-left,height:bottom-top}).png().toBuffer();
}
