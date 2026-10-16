import assert from 'node:assert/strict';
import {createServer} from 'vite';
const base=process.env.TEST_BASE_URL||'http://localhost:5173';
const vite=await createServer({configFile:false,logLevel:'error',appType:'custom',server:{middlewareMode:true},resolve:{alias:{'@':process.cwd()}}});
try{
const engine=await vite.ssrLoadModule('/lib/game-engine.ts'),collision=await vite.ssrLoadModule('/lib/collision-system.ts'),combat=await vite.ssrLoadModule('/lib/combat-instances.ts');
async function client(){const first=await fetch(base+'/api/game?room=mmo-world-village');const initial=await first.json();assert.equal(first.status,200,initial.error);const cookie=first.headers.get('set-cookie')?.split(';')[0];assert.ok(cookie,'Sessão autenticada recebida');const user=initial.user;return {user,cookie,async post(body,allowError=false){const response=await fetch(base+'/api/game',{method:'POST',headers:{Cookie:cookie,Origin:base,'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json();if(!allowError)assert.equal(response.status,200,`${body.action}: ${data.error}`);return {data,status:response.status};},async get(room){return (await(await fetch(base+'/api/game?room='+room,{headers:{Cookie:cookie}})).json()).room;}};}
const A=await client(),B=await client();const publicWorld=process.env.TEST_MMO==='1';let id='mmo-world-village';if(!publicWorld){const created=await A.post({action:'create',name:'[QA] Batalhas simultâneas e ciclo completo'});id=created.data.id;const first=await A.get(id);await B.post({action:'join',code:first.code});}
const draft={...engine.newCharacter(),stats:[17,15,13,12,10,8],originBonuses:[2,1,0,0,0,0],biome:'forest',location:1};
const run=crypto.randomUUID().slice(0,8);
await A.post({action:'character',room:id,value:{...draft,name:`QA Espada A ${run}`}});await B.post({action:'character',room:id,value:{...draft,id:crypto.randomUUID(),name:`QA Espada B ${run}`}});
let state=(await A.get(id)).state;const a=state.characters.find(c=>c.name===`QA Espada A ${run}`),b=state.characters.find(c=>c.name===`QA Espada B ${run}`);assert.ok(a&&b);
if(publicWorld){for(const [player,hero] of [[A,a],[B,b]]){for(const step of ['doran_talked','elenor_talked','kaelen_talked'])await player.post({action:'questStep',room:id,character:hero.id,step});await player.post({action:'location',room:id,character:hero.id,location:1});}}
await A.post({action:publicWorld?'startCombat':'encounter',room:id,character:a.id});state=(await A.get(id)).state;const battleA=structuredClone(state.combats[a.id]);assert.ok(battleA.combat);
await B.post({action:publicWorld?'startCombat':'encounter',room:id,character:b.id});state=(await A.get(id)).state;assert.deepEqual(state.combats[a.id],battleA,'A segunda batalha preserva a primeira');assert.ok(state.combats[b.id].combat);assert.ok(!state.combats[a.id].order.some(id=>state.combats[b.id].order.includes(id)),'Ordens independentes');
const wrong=await B.post({action:'attack',room:id,character:b.id,target:state.enemies.find(e=>e.ownerCharId===a.id).id},true);assert.equal(wrong.status,400,'Não é permitido atacar criaturas de outro combate');
const battleB=structuredClone(state.combats[b.id]);let attacks=0;
for(let turn=0;turn<65;turn++){
state=(await A.get(id)).state;const view=combat.projectCombat(state,a),hero=state.characters.find(c=>c.id===a.id);if(!view.combat||hero.hp<=0)break;assert.equal(view.order[view.turn],a.id,'A IA sempre devolve o turno ao jogador');
if(hero.hp<=5){await A.post({action:'useItem',room:id,character:a.id,item:'pocao-cura',target:a.id},true);}
const enemies=state.enemies.filter(e=>e.ownerCharId===a.id&&e.hp>0),target=enemies.sort((l,r)=>Math.hypot(l.x-hero.x,l.y-hero.y)-Math.hypot(r.x-hero.x,r.y-hero.y))[0];if(!target)break;
if(Math.max(Math.abs(target.x-hero.x),Math.abs(target.y-hero.y))>1){let path=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const candidate=collision.findPathAStar(hero,{x:target.x+dx,y:target.y+dy},'forest',64);if(candidate.length&&(!path.length||candidate.length<path.length))path=candidate;}assert.ok(path.length);const budget=Math.max(0,Math.floor(hero.speed/1.5)-(view.movementUsed||0));path=path.slice(0,budget+1);if(path.length>1)await A.post({action:'move',room:id,character:a.id,x:path.at(-1).x,y:path.at(-1).y,waypoints:path,gridSize:64,maxBound:63});}
state=(await A.get(id)).state;const current=state.characters.find(c=>c.id===a.id);if(Math.max(Math.abs(target.x-current.x),Math.abs(target.y-current.y))<=1){await A.post({action:'attack',room:id,character:a.id,target:target.id});attacks++;}
state=(await A.get(id)).state;if(state.combats[a.id].combat)await A.post({action:'pass',room:id,character:a.id});
}
state=(await A.get(id)).state;const final=state.characters.find(c=>c.id===a.id);assert.ok(attacks>0,'Ataques reais resolvidos');assert.deepEqual(state.combats[b.id],battleB,'Mover/atacar/passagem de turno não alteram a outra batalha');
assert.ok(!state.combats[a.id].combat||final.hp<=0,'Combate concluiu com vitória ou derrota');
if(final.hp>0){assert.ok(final.xp>0,'Vitória concede XP');assert.ok(state.corpses.some(c=>c.slainBy===final.name),'Vitória produz saque');console.log(`PASS: vitória com ${attacks} ataques, ${final.xp} XP e saque persistido.`);}else{await A.post({action:'respawn',room:id,character:a.id});assert.ok((await A.get(id)).state.characters.find(c=>c.id===a.id).hp>0);console.log('PASS: derrota e recuperação do herói.');}
const otherHp=state.characters.find(hero=>hero.id===b.id).hp;
await A.post({action:'shortRest',room:id,character:a.id});await A.post({action:'longRest',room:id,character:a.id});
state=(await A.get(id)).state;assert.equal(state.characters.find(hero=>hero.id===b.id).hp,otherHp,'Descansar não cura outro jogador em batalha');assert.deepEqual(state.combats[b.id],battleB,'Descansar não muda a batalha de outro jogador');
const beforeLeaving=state.characters.find(hero=>hero.id===a.id);
await A.post({action:'leave',room:id,character:a.id});state=(await A.get(id)).state;
const afterLeaving=state.characters.find(hero=>hero.id===a.id);assert.ok(afterLeaving,'Fechar o navegador preserva o herói');assert.equal(afterLeaving.hp,beforeLeaving.hp);assert.equal(afterLeaving.x,beforeLeaving.x);assert.equal(afterLeaving.y,beforeLeaving.y);assert.ok(state.characters.find(hero=>hero.id===b.id),'Sair preserva outros jogadores');
console.log('PASS: dois combates simultâneos independentes, iniciativa, movimento, ataque, IA, turnos, descanso isolado, desconexão sem apagar personagens e resultado persistido. Campanha QA preservada.');
}finally{await vite.close();}
