import assert from 'node:assert/strict';
import {createServer} from 'vite';
const vite=await createServer({configFile:false,logLevel:'error',appType:'custom',server:{middlewareMode:true},resolve:{alias:{'@':process.cwd()}}});
try{
  const engine=await vite.ssrLoadModule('/lib/game-engine.ts'),origins=await vite.ssrLoadModule('/lib/character-origins.ts'),progress=await vite.ssrLoadModule('/lib/campaign-progression.ts'),dungeon=await vite.ssrLoadModule('/lib/dungeon-crawler.ts'),navigation=await vite.ssrLoadModule('/lib/dungeon-navigation.ts'),collision=await vite.ssrLoadModule('/lib/collision-system.ts');
  const stats=[17,15,13,12,10,8],bonuses=[2,1,0,0,0,0];
  for(const className of ['Guerreiro','Mago','Clérigo','Ladino','Paladino','Bárbaro','Bardo','Bruxo','Druida','Feiticeiro','Monge','Patrulheiro']){
    const hero=origins.createAuthoritativeHero({...engine.newCharacter(),className,stats,originBonuses:bonuses,spellAbility:0});
    for(const itemId of Object.values(hero.equipment))if(itemId)assert.ok(engine.ITEMS_CATALOG[itemId],`${className}: ${itemId}`);
    assert.ok(Number.isFinite(engine.calculateEquippedStats(hero).ac));
    const state=engine.initialState();state.characters=[hero];state.logs=[engine.entry('Ancião Doran e Elenor entregou provisões; floresta vencida')];state.enemies.forEach(enemy=>enemy.hp=0);
    progress.rebuildCampaignProofFromEvidence(state,hero);assert.deepEqual(hero.campaignProof,{},'Um herói novo não herda histórico público');
    const ability={Mago:3,'Clérigo':4,Druida:4,Patrulheiro:4,Paladino:5,Bardo:5,Bruxo:5,Feiticeiro:5}[className];if(ability!==undefined)assert.equal(hero.spellAbility,ability);
  }
  for(const seed of [17,72,991]){
    const floor=dungeon.generateDungeonFloor(seed,1,'solo'),zones=navigation.dungeonCollisionZones(floor),blocked=dungeon.getDungeonObstacleCoordinates(floor);
    for(let y=0;y<floor.height;y++)for(let x=0;x<floor.width;x++)assert.equal(collision.isGridTileWalkable('dungeon',x,y,floor.width,zones),!blocked.has(`${x},${y}`),`Portas e paredes ${seed}: ${x},${y}`);
    const door=floor.rooms.flatMap(room=>room.doors).find(door=>!door.isOpen);assert.ok(door);assert.equal(collision.isGridTileWalkable('dungeon',door.x,door.y,floor.width,zones),false);door.isOpen=true;assert.equal(collision.isGridTileWalkable('dungeon',door.x,door.y,floor.width,navigation.dungeonCollisionZones(floor)),true);
  }
  console.log('PASS: 12 classes com equipamento válido, atributos de magia autoritativos, campanha nova independente e 3 masmorras com paredes/portas coerentes.');
}finally{await vite.close();}
