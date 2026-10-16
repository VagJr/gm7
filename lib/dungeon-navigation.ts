import type { Character, State } from './game-engine';
import type { DungeonExpeditionState, DungeonFloor } from './dungeon-crawler';
import { getDungeonObstacleCoordinates } from './dungeon-crawler';
import type { CollisionPolygon } from './collision-system';

export function activeDungeonFloor(state: State, hero: Character): DungeonFloor | undefined {
  const activity=hero.activeActivityId ? state.activities?.[hero.activeActivityId] : undefined;
  if(activity?.type!=='dungeon'||activity.status!=='active') return;
  const expedition=activity.payload as unknown as DungeonExpeditionState;
  const floor=expedition.floorHistory?.[expedition.currentFloor];
  if(!floor||!Number.isInteger(floor.width)||floor.width<2||floor.width>64||floor.height!==floor.width||!Array.isArray(floor.tiles)||!Array.isArray(floor.rooms)) return;
  return floor;
}

export function dungeonCollisionZones(floor: DungeonFloor): CollisionPolygon[] {
  return [...getDungeonObstacleCoordinates(floor)].map((key)=>{
    const [x,y]=key.split(',').map(Number),left=x/floor.width,top=y/floor.height,right=(x+1)/floor.width,bottom=(y+1)/floor.height;
    return {id:key,name:'Bloco sólido',type:'obstacle',points:[[left,top],[right,top],[right,bottom],[left,bottom]]};
  });
}
