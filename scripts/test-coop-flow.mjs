import assert from 'node:assert/strict';
import { createServer } from 'vite';
const base=process.env.TEST_BASE_URL||'http://localhost:5173';
const vite=await createServer({configFile:false,logLevel:'error',appType:'custom',server:{middlewareMode:true},resolve:{alias:{'@':process.cwd()}}});
const controller=new AbortController();
const timeout=setTimeout(()=>controller.abort(),25000);
try {
  const engine=await vite.ssrLoadModule('/lib/game-engine.ts');
  const inventory=await vite.ssrLoadModule('/lib/inventory-utils.ts');
  const collision=await vite.ssrLoadModule('/lib/collision-system.ts');
  async function client(){const r=await fetch(base+'/api/game?room=mmo-world-village');assert.equal(r.status,200);const cookie=r.headers.get('set-cookie')?.split(';')[0];assert.ok(cookie);return {cookie,async request(body){const response=await fetch(base+'/api/game',{method:'POST',headers:{Cookie:cookie,Origin:base,'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json();assert.equal(response.status,200,data.error);return data;}};}
  const owner=await client(),visitor=await client();
  const created=await owner.request({action:'create',name:'[QA] Coop, provisões e movimento'});
  const getRoom=async()=>{const r=await fetch(base+'/api/game?room='+created.id,{headers:{Cookie:owner.cookie}});assert.equal(r.status,200);return (await r.json()).room;};
  const room=await getRoom();
  await visitor.request({action:'join',code:room.code});
  const draftA={...engine.newCharacter(),name:'QA Guardião',biome:'forest',location:1,stats:[17,15,13,12,10,8],originBonuses:[2,1,0,0,0,0]};
  const draftB={...draftA,id:crypto.randomUUID(),name:'QA Aliado',biome:'village',location:0,portrait:1};
  await owner.request({action:'character',room:created.id,value:draftA});
  await owner.request({action:'encounter',room:created.id,character:draftA.id});
  assert.equal((await getRoom()).state.combat,true);
  await visitor.request({action:'character',room:created.id,value:draftB});
  assert.ok((await getRoom()).state.characters.some(c=>c.id===draftB.id),'Um novo jogador consegue criar personagem durante combate de outro jogador');
  let state=(await getRoom()).state;
  const a=state.characters.find(c=>c.name===draftA.name),b=state.characters.find(c=>c.name===draftB.name);assert.ok(a&&b);assert.notEqual(a.owner,b.owner);
  const potionName=engine.ITEMS_CATALOG['pocao-cura'].name;
  const before=inventory.getInventoryQuantity(a.inventory,potionName);
  const stale=await fetch(base+'/api/game',{method:'POST',headers:{Cookie:owner.cookie,Origin:base,'Content-Type':'application/json'},body:JSON.stringify({action:'questStep',room:created.id,character:a.id,step:'elenor_talked',version:0})});assert.equal(stale.status,409);const refreshed=await stale.json();assert.ok(refreshed.room);assert.equal(inventory.getInventoryQuantity(refreshed.room.state.characters.find(c=>c.id===a.id).inventory,potionName),before,'Conflito não entrega itens nem grava progresso');
  await owner.request({action:'questStep',room:created.id,character:a.id,step:'elenor_talked',version:refreshed.room.version});
  state=(await getRoom()).state;assert.equal(inventory.getInventoryQuantity(state.characters.find(c=>c.id===a.id).inventory,potionName),before+2);
  await owner.request({action:'questStep',room:created.id,character:a.id,step:'elenor_talked'});
  state=(await getRoom()).state;assert.equal(inventory.getInventoryQuantity(state.characters.find(c=>c.id===a.id).inventory,potionName),before+2,'Provisões são entregues uma única vez');
  const stream=await fetch(base+'/api/game/stream?room='+created.id,{headers:{Cookie:owner.cookie},signal:controller.signal});assert.equal(stream.status,200);assert.match(stream.headers.get('content-type'),/text\/event-stream/);
  const reader=stream.body.getReader(),decoder=new TextDecoder();let buffer='';
  async function nextSnapshot(predicate){while(true){const {value,done}=await reader.read();assert.ok(!done);buffer+=decoder.decode(value,{stream:true});let end;while((end=buffer.indexOf('\n\n'))>=0){const frame=buffer.slice(0,end);buffer=buffer.slice(end+2);const json=frame.split('\n').find(line=>line.startsWith('data: '));if(!json)continue;const snapshot=JSON.parse(json.slice(6));if(predicate(snapshot))return snapshot;}}}
  const first=await nextSnapshot(s=>s.state.characters.some(c=>c.id===b.id));
  let path=[];for(const [dx,dy] of [[0,1],[1,0],[0,-1],[-1,0]]){path=collision.findPathAStar(b,{x:b.x+dx,y:b.y+dy},'village',64);if(path.length===2)break;}assert.equal(path.length,2,'Há uma casa vizinha acessível');const goal=path.at(-1);
  const move=await visitor.request({action:'move',room:created.id,character:b.id,x:goal.x,y:goal.y,waypoints:path,gridSize:64,maxBound:63});assert.ok(move.room);
  const synced=await nextSnapshot(s=>s.version>first.version&&s.state.characters.some(c=>c.id===b.id&&c.x===goal.x&&c.y===goal.y));assert.ok(synced.version>first.version);
  console.log('PASS: dois jogadores independentes, convite privado, provisões sem duplicação, movimento persistido e atualização SSE recebida pelo outro jogador.');
  console.log('Campanha [QA] preservada; nenhum save existente foi excluído.');
} finally {clearTimeout(timeout);controller.abort();await vite.close();}
