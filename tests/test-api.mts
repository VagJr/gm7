import assert from 'node:assert/strict';
const base='http://localhost:5173';
const auth=await fetch(base+'/signin-with-chatgpt?return_to=/',{redirect:'manual'});const cookie=auth.headers.get('set-cookie')?.split(';')[0];assert(cookie,'local auth cookie');
async function get(path){const r=await fetch(base+path,{headers:{cookie}});return {status:r.status,data:await r.json()};}
async function post(a){const r=await fetch(base+'/api/game',{method:'POST',headers:{cookie,'Content-Type':'application/json',Origin:base},body:JSON.stringify(a)});return {status:r.status,data:await r.json()};}
const {data:created}=await post({action:'create',name:'Teste de integração'});assert(created.id);let loaded=await get('/api/game?room='+created.id);assert.equal(loaded.status,200);assert.equal(loaded.data.room.state.characters.length,0);
const {newCharacter}=await import('../lib/game-engine.ts');const c=newCharacter();c.name='Arin';let p=await post({action:'character',room:created.id,version:0,value:c});assert.equal(p.status,200);p=await post({action:'roll',room:created.id,version:0,formula:'1d20'});assert.equal(p.status,409);
loaded=await get('/api/game?room='+created.id);assert.equal(loaded.data.room.state.characters[0].name,'Arin');p=await post({action:'encounter',room:created.id,version:loaded.data.room.version});assert.equal(p.status,200);loaded=await get('/api/game?room='+created.id);assert.equal(loaded.data.room.state.combat,true);assert.equal(loaded.data.room.state.order.length,2);
const anon=await fetch(base+'/api/game?room='+created.id);assert.equal((await anon.json()).signedIn,false);
const library=await get('/api/library?category=Besti%C3%A1rio&q=dragon');assert(library.data.results.length>30);
const gm=await fetch(base+'/api/gm',{method:'POST',headers:{cookie,'Content-Type':'application/json',Origin:base},body:JSON.stringify({room:created.id,version:loaded.data.room.version,key:'',text:'teste'})});assert.equal(gm.status,400);
console.log('PASS: signed-in persistence, character save/load, optimistic concurrency, encounter, anonymous isolation, bestiary search and missing-key handling.');
