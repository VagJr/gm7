'use client';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Compass, Focus, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import type { TacticalMapProps } from './tactical-map';
import { BIOME_PORTALS } from './tactical-map';
import { MAP_COLLISION_PROFILES, findPathAStar, isGridTileWalkable, calculateMovementBudget, type BiomeType } from '@/lib/collision-system';
import { WORLD_SIZE, WALK_TILES_PER_SECOND, worldProps, worldLandmarks, worldHash, legacyWorldPoint } from '@/lib/open-world';
import { heroTokenIndex, enemyTokenIndex, tokenArt } from '@/lib/token-art';

type Piece = { root: THREE.Group; art: THREE.Sprite; ring: THREE.Mesh; x: number; y: number; path: {x:number;y:number}[]; hp: number; pulse: number; kind: string; index:number };
const palettes = { village: 0x536349, forest: 0x324e40, ruins: 0x68665d, dungeon: 0x383e4c, canyon: 0x88674d, lair: 0x423940 };
export function WorldBoard(props: TacticalMapProps & { onFallback: () => void }) {
  const host = useRef<HTMLDivElement>(null); const labels = useRef<HTMLDivElement>(null);
  const current = useRef(props); current.current = props;
  const commands = useRef({ zoom: 9, angle: .55, follow: true, target: { x: 32, y: 32 } });
  const [error, setError] = useState(''); const [grid, setGrid] = useState(false);
  const [notice,setNotice] = useState('');
  const gridRef = useRef(grid); gridRef.current = grid;
  const biome = (props.biome || 'village') as BiomeType;
  const hero = props.characters.find(c => c.id === props.selectedHeroId) || props.characters[0];
  const landmarks = worldLandmarks(biome);

  useEffect(() => {
    if (!host.current) return;
    const mount = host.current;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'low-power' }); }
    catch { setError('O dispositivo não conseguiu iniciar o cenário 3D.'); return; }
    setError('');
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = true; renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.domElement.tabIndex = 0; renderer.domElement.setAttribute('aria-label','Mover no tabuleiro com as setas'); mount.appendChild(renderer.domElement);
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0a1821); scene.fog = new THREE.FogExp2(0x16242c, .010);
    const camera = new THREE.OrthographicCamera(-18, 18, 12, -12, .1, 200);
    const target = new THREE.Vector3(32, 0, 32);
    const light = new THREE.DirectionalLight(0xffe3b1, 2.8); light.position.set(14, 30, 8); light.castShadow = true;
    light.shadow.mapSize.set(512, 512); Object.assign(light.shadow.camera, { left: -42, right: 42, top: 42, bottom: -42, far: 110 }); light.shadow.bias = -.001; light.shadow.normalBias = .04;
    light.target.position.set(32, 0, 32); scene.add(light, light.target, new THREE.HemisphereLight(0xaad8e1, 0x393729, 2.0));
    const rim = new THREE.DirectionalLight(0x6cadc4, 1); rim.position.set(60, 18, 55); scene.add(rim);
    const loader = new THREE.TextureLoader(); const ownedTextures: THREE.Texture[] = [];
    const textures = new Map<string, THREE.Texture>(); let disposed = false;
    const texture = (url: string) => {
      const found = textures.get(url); if (found) return found;
      const result = loader.load(url, t => { if (disposed) { t.dispose(); return; } for (const owned of ownedTextures) if (owned.source === t.source) owned.needsUpdate = true; }, undefined, () => {});
      result.colorSpace = THREE.SRGBColorSpace; result.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); textures.set(url, result); ownedTextures.push(result); return result;
    };
    const row = ['village', 'forest', 'ruins', 'dungeon', 'canyon', 'lair'].indexOf(biome);
    const groundTexture=texture(`/art/terrain/terrain-${row * 6 + (biome==='village'?1:0)}.webp`);groundTexture.wrapS=groundTexture.wrapT=THREE.RepeatWrapping;groundTexture.repeat.set(3,3);
    for (let cy = 0; cy < 8; cy++) for (let cx = 0; cx < 8; cx++) {
      const material = new THREE.MeshStandardMaterial({ color: 0xc3c7b2, map: groundTexture, roughness: 1 });
      const tile = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), material); tile.rotation.x = -Math.PI / 2; tile.position.set(cx * 8 + 4, -.04, cy * 8 + 4); tile.receiveShadow = true; scene.add(tile);
    }
    // Terrain and individual scenery share the same world coordinates and collisions.
    const roadSource = texture(`/art/terrain/terrain-${row * 6 + (biome==='village'?0:5)}.webp`);
    const roadTexture = new THREE.Texture(); roadTexture.source = roadSource.source;
    roadTexture.colorSpace = THREE.SRGBColorSpace; roadTexture.anisotropy = roadSource.anisotropy;
    if (roadTexture.image) roadTexture.needsUpdate = true;
    roadTexture.wrapS = roadTexture.wrapT = THREE.RepeatWrapping; roadTexture.repeat.set(1, 7); ownedTextures.push(roadTexture);
    const roadMaterial = new THREE.MeshStandardMaterial({ color: biome === 'village' ? 0x8b826b : 0x6b6b54, map: roadTexture, roughness: 1 });
    for (const direction of [0, 1]) for (const side of [0, 1, 2]) {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 24), roadMaterial); road.rotation.x = -Math.PI / 2; road.rotation.z = direction ? Math.PI / 2 : 0;
      road.position.set(direction ? [12,32,52][side] : 32, .012, direction ? 32 : [12,32,52][side]); road.receiveShadow = true; scene.add(road);
    }
    const navGrid = new THREE.GridHelper(WORLD_SIZE, WORLD_SIZE, 0xb19b72, 0x48666a); navGrid.position.set(32, .045, 32); navGrid.visible = false;
    (navGrid.material as THREE.Material).transparent = true; (navGrid.material as THREE.Material).opacity = .23; scene.add(navGrid);
    const propsList = worldProps(biome); const dummy = new THREE.Object3D();
    const batch = (kind: string, geometry: THREE.BufferGeometry, material: THREE.MeshStandardMaterial, height: number, scaling: [number, number, number]) => {
      const values = propsList.filter(p => p.kind === kind); const mesh = new THREE.InstancedMesh(geometry, material, values.length);
      values.forEach((p, i) => { dummy.position.set(p.x + .5, height * p.size, p.y + .5); dummy.scale.set(scaling[0] * p.size, scaling[1] * p.size, scaling[2] * p.size); dummy.rotation.y = kind === 'water' ? 0 : worldHash(p.x, p.y) % 100 / 30; dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); });
      mesh.castShadow = kind !== 'water'; mesh.receiveShadow = true; scene.add(mesh); return mesh;
    };
    const sceneryMaterials=new Map<number,THREE.SpriteMaterial>();
    for(const prop of propsList.filter(p=>p.kind!=='water')){
      const index=prop.art ?? (prop.kind==='house'?12:prop.kind==='tree'?0:6);
      let material=sceneryMaterials.get(index);if(!material){material=new THREE.SpriteMaterial({map:texture(`/art/scenery/prop-${index}.webp`),transparent:true,depthWrite:false,alphaTest:.05});sceneryMaterials.set(index,material);}
      const size=(prop.kind==='house'?3.1:prop.kind==='tree'?2.8:2)*prop.size;
      const art=new THREE.Sprite(material);art.scale.set(size,size,1);art.center.set(.5,.12);art.position.set(prop.x+.5,.03,prop.y+.5);scene.add(art);
    }
    const river=new THREE.Shape();for(let y=0;y<=WORLD_SIZE;y++){const x=47+Math.sin(y*.16)*2-1.2;y?river.lineTo(x,-y):river.moveTo(x,0);}for(let y=WORLD_SIZE;y>=0;y--)river.lineTo(47+Math.sin(y*.16)*2+1.2,-y);river.closePath();
    const water = new THREE.Mesh(new THREE.ShapeGeometry(river),new THREE.MeshStandardMaterial({color:biome==='lair'||biome==='canyon'?0xc65a20:0x24566b,metalness:.35,roughness:.35,emissive:biome==='lair'?0x6c240b:0x03141c}));water.rotation.x=-Math.PI/2;water.position.y=-.005;water.visible=biome!=='dungeon';scene.add(water);
    for(const y of [16,32,48]){const bridge=new THREE.Mesh(new THREE.BoxGeometry(4,.14,2.7),new THREE.MeshStandardMaterial({color:0x88704b,roughness:.9}));bridge.position.set(47+Math.sin(y*.16)*2,.08,y);bridge.visible=biome!=='dungeon';scene.add(bridge);}
    const pickables: THREE.Object3D[] = []; const specialObjects: THREE.Object3D[] = []; const flames: THREE.Mesh[] = [];
    const marker = (x: number, y: number, color: number, data: Record<string, unknown>) => {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(.47, .56, .22, 16), new THREE.MeshStandardMaterial({ color: 0x63523e, transparent:true,opacity:.12,metalness: .65, roughness: .55 })); base.position.set(x + .5, .15, y + .5); base.userData = data; scene.add(base); pickables.push(base);
      const index=data.kind==='corpse'?24:data.kind==='portal'?11:worldLandmarks(biome).find(p=>p.id===data.id)?.kind==='camp'?26:worldLandmarks(biome).find(p=>p.id===data.id)?.kind==='shrine'?25:24;
      const decoration=new THREE.Sprite(new THREE.SpriteMaterial({map:texture(`/art/scenery/prop-${index}.webp`),transparent:true,depthWrite:false,alphaTest:.06}));decoration.position.set(x+.5,.1,y+.5);decoration.center.set(.5,.12);decoration.scale.set(1.4,1.4,1);decoration.userData=data;scene.add(decoration);pickables.push(decoration);
      const glow = new THREE.Mesh(new THREE.OctahedronGeometry(.22), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.7, metalness: .5, roughness: .2 })); glow.position.set(x + .5, .85, y + .5); glow.userData = data; scene.add(glow); pickables.push(glow); specialObjects.push(glow); return glow;
    };
    for (const point of worldLandmarks(biome)) {
      marker(point.x, point.y, point.kind === 'cache' ? 0xd6a257 : point.kind === 'camp' ? 0xe78839 : 0x6cbaca, { kind: 'landmark', id: point.id, x: point.x, y: point.y });
      if (point.kind === 'camp') {
        const fire = new THREE.Mesh(new THREE.ConeGeometry(.18, .55, 6), new THREE.MeshBasicMaterial({ color: 0xffb760, transparent: true, opacity: .8 })); fire.position.set(point.x + .5, .45, point.y + .5); scene.add(fire); flames.push(fire);
      }
    }
    for (const portal of BIOME_PORTALS[biome] || []) {
      const point = legacyWorldPoint(biome, portal.x, portal.y);
      marker(point.x, point.y, 0x79cdda, { kind: 'portal', biome: portal.targetBiome, location: portal.targetLocationIndex });
      const arch = new THREE.Mesh(new THREE.TorusGeometry(.6, .08, 8, 24, Math.PI), new THREE.MeshStandardMaterial({ color: 0x79cdda, emissive: 0x226e7c, emissiveIntensity: 1 })); arch.position.set(point.x + .5, .2, point.y + .5); scene.add(arch);
    }
    const pieces = new Map<string, Piece>(); const hpHistory = new Map<string, number>();
    const spriteMaterial = (index: number) => new THREE.SpriteMaterial({ map: texture(tokenArt(index)), transparent: true, depthWrite: false, alphaTest: .04 });
    const addPiece = (id: string, x: number, y: number, index: number, kind: string) => {
      const root = new THREE.Group(); root.position.set(x + .5, .14, y + .5); root.userData = { kind, id };
      const base = new THREE.Mesh(new THREE.CylinderGeometry(.36, .39, .12, 24), new THREE.MeshStandardMaterial({ color: kind === 'enemy' ? 0x80604d : 0x807151, metalness: .7, roughness: .45 })); base.castShadow = true; base.receiveShadow = true; root.add(base);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.4, .025, 6, 36), new THREE.MeshBasicMaterial({ color: kind === 'enemy' ? 0xe18769 : 0x72cad7 })); ring.rotation.x = -Math.PI / 2; ring.position.y = .12; root.add(ring);
      const art = new THREE.Sprite(spriteMaterial(index)); art.position.y = .95; art.scale.set(1.65, 1.65, 1); root.add(art); scene.add(root); pickables.push(root);
      const piece = { root, art, ring, x, y, path: [], hp: 0, pulse: 0, kind, index }; pieces.set(id, piece); return piece;
    };
    const route = new THREE.Group(); scene.add(route); let routeKey = '';
    const routeGeometry = new THREE.SphereGeometry(.06, 6, 4); const routeMaterial = new THREE.MeshBasicMaterial({ color: 0xe4ba75 });
    const rebuildRoute = (path: { x: number; y: number }[]) => {
      const key = path.map(p => `${p.x},${p.y}`).join(';'); if (key === routeKey) return; routeKey = key; route.clear();
      for (const p of path.slice(1)) { const dot = new THREE.Mesh(routeGeometry, routeMaterial); dot.position.set(p.x + .5, .1, p.y + .5); route.add(dot); }
    };
    const ray = new THREE.Raycaster(); const pointer = new THREE.Vector2(); const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); const intersection = new THREE.Vector3();
    let dragging: { x: number; y: number; startX: number; startY: number; button: number; moved: boolean } | null = null;
    const groundPoint = (event: PointerEvent) => { const rect = renderer.domElement.getBoundingClientRect(); pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1); ray.setFromCamera(pointer, camera); ray.ray.intersectPlane(groundPlane, intersection); return { x: Math.floor(intersection.x), y: Math.floor(intersection.z) }; };
    const movePath = (x: number, y: number) => {
      const p = current.current; const actor = p.characters.find(c => c.id === p.selectedHeroId);
      if (!actor || !p.canMove || p.busy || !isGridTileWalkable(biome, x, y, WORLD_SIZE)) return [];
      return findPathAStar(actor, { x, y }, biome, WORLD_SIZE);
    };
    const down = (e: PointerEvent) => { renderer.domElement.focus({preventScroll:true}); dragging = { x: e.clientX, y: e.clientY, startX: commands.current.target.x, startY: commands.current.target.y, button: e.button, moved: false }; renderer.domElement.setPointerCapture(e.pointerId); };
    let lastRouteAt = 0;
    const motion = (e: PointerEvent) => {
      const point = groundPoint(e);
      if (dragging && (dragging.button === 1 || dragging.button === 2 || e.altKey || (e.pointerType === 'touch' && Math.hypot(e.clientX-dragging.x,e.clientY-dragging.y)>8))) {
        dragging.moved = true; commands.current.follow = false;
        const dx = (e.clientX - dragging.x) * commands.current.zoom / mount.clientWidth * 2;
        const dy = (e.clientY - dragging.y) * commands.current.zoom / mount.clientHeight * 2;
        commands.current.target = { x: Math.max(1, Math.min(63, dragging.startX - dx - dy)), y: Math.max(1, Math.min(63, dragging.startY + dx - dy)) }; return;
      }
      if (dragging && Math.hypot(e.clientX - dragging.x, e.clientY - dragging.y) > 8) dragging.moved = true;
      if (performance.now() - lastRouteAt > 140) { lastRouteAt = performance.now(); rebuildRoute(movePath(point.x, point.y)); }
    };
    const up = (e: PointerEvent) => {
      const drag = dragging; dragging = null; if (drag?.moved || e.button !== 0) return;
      const point = groundPoint(e); const p = current.current; const actor = p.characters.find(c => c.id === p.selectedHeroId);
      const hits = ray.intersectObjects(pickables, true); let object: THREE.Object3D | undefined = hits[0]?.object;
      while (object && !object.userData.kind) object = object.parent || undefined;
      const data = object?.userData;
      if (data?.kind === 'hero') { if (p.targetingAction) p.onTargetHero?.(data.id); else p.onSelectToken('hero', data.id); return; }
      if (data?.kind === 'enemy') { if (p.targetingAction) p.onTargetEnemy(data.id); else p.onSelectToken('enemy', data.id); return; }
      if (data?.kind === 'npc') { p.onTalkNpc?.(data.id); return; }
      if (data?.kind === 'corpse') { p.onLootCorpse?.(data.id); return; }
      if (data?.kind === 'portal') { p.onNavigatePortal?.(data.biome, data.location); return; }
      if (data?.kind === 'landmark') { p.onInteractObject?.(`world:${data.id}`, data.x, data.y); return; }
      if (p.targetingAction) { p.onTargetSquare?.(point.x, point.y); return; }
      if(actor && pieces.get(actor.id)?.path.length){setNotice('Seu herói está caminhando. Aguarde a chegada.');return;}
      const path = movePath(point.x, point.y); if (!actor || path.length < 2) {setNotice('Escolha um ponto livre e acessível.');return;}
      const budget = calculateMovementBudget(actor.speed + (p.movementBonusSquares || 0) * 1.5, p.movementUsed || 0);
      if (p.isCombat && path.length - 1 > budget.remainingSquares) {setNotice(`Deslocamento disponível: ${budget.remainingSquares*1.5} m.`);return;}
      setNotice('');
      const piece = pieces.get(actor.id); if (piece) { piece.path = path.slice(1); piece.x = path[path.length-1].x; piece.y = path[path.length-1].y; }
      if (p.onMoveHeroPath) p.onMoveHeroPath(actor.id, path); else p.onMoveHero(actor.id, point.x, point.y);
      commands.current.follow = true;
    };
    const wheel = (e: WheelEvent) => { e.preventDefault(); commands.current.zoom = Math.max(7, Math.min(36, commands.current.zoom + e.deltaY * .016)); };
    const keyboard = (e: KeyboardEvent) => {
      const directions: Record<string,[number,number]> = {ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]};
      if(!directions[e.key] || e.altKey || e.ctrlKey || e.metaKey) return; e.preventDefault();
      const p = current.current, actor = p.characters.find(c=>c.id===p.selectedHeroId); if(!actor || p.targetingAction) return;
      if(pieces.get(actor.id)?.path.length) return;
      const [dx,dy] = directions[e.key], path = movePath(actor.x+dx,actor.y+dy); if(path.length!==2) return;
      if(p.isCombat && calculateMovementBudget(actor.speed+(p.movementBonusSquares||0)*1.5,p.movementUsed||0).remainingSquares<1) return;
      const piece=pieces.get(actor.id); if(piece){piece.path=path.slice(1);piece.x=actor.x+dx;piece.y=actor.y+dy;}
      if(p.onMoveHeroPath) p.onMoveHeroPath(actor.id,path); else p.onMoveHero(actor.id,actor.x+dx,actor.y+dy); commands.current.follow=true;
    };
    const context = (e: Event) => e.preventDefault();
    renderer.domElement.addEventListener('pointerdown', down); renderer.domElement.addEventListener('pointermove', motion); renderer.domElement.addEventListener('pointerup', up); renderer.domElement.addEventListener('wheel', wheel, { passive: false }); renderer.domElement.addEventListener('contextmenu', context); renderer.domElement.addEventListener('keydown',keyboard);
    const resize = () => { const w = mount.clientWidth, h = mount.clientHeight; renderer.setSize(w, h); camera.left = -commands.current.zoom * w / Math.max(1, h); camera.right = -camera.left; camera.top = commands.current.zoom; camera.bottom = -camera.top; camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(mount); resize();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const effects: {mesh:THREE.Mesh;born:number;duration:number;from:THREE.Vector3;to:THREE.Vector3;kind:string}[] = [];
    const seenEffects = new Map<string,number>();
    const addEffect = (key:string,kind:string,from:THREE.Vector3,to:THREE.Vector3,color:number,time:number) => {
      if(seenEffects.has(key)) return; seenEffects.set(key,time); if(reducedMotion) return;
      const geometry=kind==='projectile'?new THREE.SphereGeometry(.12,8,6):new THREE.TorusGeometry(.55,.035,6,28,kind==='slash'?Math.PI*1.2:Math.PI*2);
      const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color,transparent:true,opacity:1,depthWrite:false}));
      if(kind!=='projectile') mesh.rotation.x=-Math.PI/2; scene.add(mesh); effects.push({mesh,born:time,duration:kind==='projectile'?550:650,from,to,kind});
    };
    let frame = 0, last = performance.now(), tick = 0;
    const animate = (time: number) => {
      if (disposed) return; frame = requestAnimationFrame(animate);
      if (document.hidden || time - last < 1000 / 30) return;
      const dt = Math.min(.08, (time - last) / 1000); last = time; tick++;
      const p = current.current; const actor = p.characters.find(c => c.id === p.selectedHeroId);
      const entities = [
        ...p.characters.filter(c => (c.biome || 'village') === biome).map(c => ({ id: c.id, x: c.x, y: c.y, hp: c.hp, index: heroTokenIndex(c), kind: 'hero' })),
        ...p.enemies.filter(e => e.hp > 0 && (!e.biome || e.biome === biome) && (!e.ownerCharId || e.ownerCharId === actor?.id) && (!e.partyId || e.partyId === actor?.partyId)).map(e => ({ id: e.id, x: e.x, y: e.y, hp: e.hp, index: enemyTokenIndex(e.name), kind: 'enemy' })),
        ...(p.npcs || []).filter(n => !n.biome || n.biome === biome).map(n => ({ id: n.id, x: n.x, y: n.y, hp: 1, index: n.id === 'doran' ? 22 : n.id === 'kaelen' ? 23 : n.id === 'elenor' ? 13 : 21, kind: 'npc' })),
      ].map(entity => ({ ...entity, x: entity.x ?? 32, y: entity.y ?? 32 }));
      const alive = new Set(entities.map(e => e.id));
      for (const [id, piece] of pieces) if (!alive.has(id)) { scene.remove(piece.root); const pickIndex = pickables.indexOf(piece.root); if (pickIndex >= 0) pickables.splice(pickIndex, 1); piece.root.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose(); } }); piece.art.material.dispose(); pieces.delete(id); }
      for (const entity of entities) {
        const piece = pieces.get(entity.id) || addPiece(entity.id, entity.x, entity.y, entity.index, entity.kind);
        if(piece.index!==entity.index){piece.art.material.map=texture(tokenArt(entity.index));piece.art.material.needsUpdate=true;piece.index=entity.index;}
        const previousHp = hpHistory.get(entity.id); if (previousHp !== undefined && entity.hp !== previousHp) piece.pulse = entity.hp < previousHp ? 1 : -1; hpHistory.set(entity.id, entity.hp);
        if(piece.x!==entity.x || piece.y!==entity.y){ const from={x:Math.round(piece.root.position.x-.5),y:Math.round(piece.root.position.z-.5)}; piece.path=findPathAStar(from,entity,biome,WORLD_SIZE).slice(1); piece.x=entity.x;piece.y=entity.y; }
        const step=piece.path[0] || entity; const dx=step.x+.5-piece.root.position.x,dz=step.y+.5-piece.root.position.z, distance=Math.hypot(dx,dz); const moving=distance>.025;
        const amount=reducedMotion?distance:Math.min(distance,dt*WALK_TILES_PER_SECOND); if(distance>0){piece.root.position.x+=dx/distance*amount;piece.root.position.z+=dz/distance*amount;} if(distance<=amount+.025 && piece.path.length) piece.path.shift();
        piece.art.position.y = .95 + (moving && !reducedMotion ? Math.sin(time * .018) * .06 : 0); piece.art.material.color.setHex(piece.pulse > .05 ? 0xffaaa0 : piece.pulse < -.05 ? 0xaaffcb : 0xffffff); piece.pulse *= .86;
        const selected = entity.id === p.selectedHeroId || entity.id === p.selectedEnemyId; piece.ring.visible = selected || entity.kind === 'enemy'; piece.ring.scale.setScalar(selected && !reducedMotion ? 1.1 + Math.sin(time * .003) * .07 : 1);
        const label = labels.current?.querySelector<HTMLElement>(`[data-entity-id="${CSS.escape(entity.id)}"]`);
        if (label && tick % 2 === 0) { const pos = piece.root.position.clone().add(new THREE.Vector3(0, 2.05, 0)).project(camera); const margin = Math.min(mount.clientWidth/2,label.offsetWidth/2+8); label.style.left = `${Math.max(margin,Math.min(mount.clientWidth-margin,(pos.x * .5 + .5) * mount.clientWidth))}px`; label.style.top = `${(-pos.y * .5 + .5) * mount.clientHeight}px`; label.style.display = Math.abs(pos.x) > 1 || Math.abs(pos.y) > 1 || pos.z > 1 ? 'none' : ''; }
      }
      const corpseIds = new Set((p.corpses || []).filter(c => !c.biome || c.biome === biome).map(c => c.id));
      for (let i = specialObjects.length - 1; i >= 0; i--) { const o = specialObjects[i]; if (o.userData.corpseId && !corpseIds.has(o.userData.corpseId)) { specialObjects.splice(i, 1); for(let j=pickables.length-1;j>=0;j--){const part=pickables[j];if(part.userData.corpseId===o.userData.corpseId){scene.remove(part);pickables.splice(j,1);if(part instanceof THREE.Mesh){part.geometry.dispose();(part.material as THREE.Material).dispose();}else if(part instanceof THREE.Sprite){part.material.dispose();}}} } }
      for (const corpse of p.corpses || []) if ((!corpse.biome || corpse.biome === biome) && !specialObjects.some(o => o.userData.corpseId === corpse.id)) { const o = marker(corpse.x, corpse.y, 0xd4af66, { kind: 'corpse', id: corpse.id }); o.userData.corpseId = corpse.id; }
      for(const projectile of p.projectiles||[]) addEffect(`p:${projectile.id}`,'projectile',new THREE.Vector3(projectile.startX+.5,.9,projectile.startY+.5),new THREE.Vector3(projectile.targetX+.5,.9,projectile.targetY+.5),projectile.type==='fire_bolt'?0xff873f:projectile.type==='arrow'?0xe0c397:projectile.type==='eldritch'?0xc591fa:0x8eeaff,time);
      for(const [kind,records] of [['slash',p.slashVfx],['heal',p.healVfx]] as const) for(const [id,event] of Object.entries(records||{})){const position=pieces.get(id)?.root.position;if(position)addEffect(`${kind}:${id}:${event.timestamp}`,kind,position.clone().add(new THREE.Vector3(0,.2,0)),position.clone().add(new THREE.Vector3(0,kind==='heal'?1.3:.4,0)),kind==='heal'?0x73e8b5:0xffd7a0,time);}
      for(let i=effects.length-1;i>=0;i--){const effect=effects[i],progress=(time-effect.born)/effect.duration;if(progress>=1){scene.remove(effect.mesh);effect.mesh.geometry.dispose();(effect.mesh.material as THREE.Material).dispose();effects.splice(i,1);continue;}effect.mesh.position.lerpVectors(effect.from,effect.to,progress);if(effect.kind!=='projectile'){effect.mesh.scale.setScalar(.7+progress*.8);effect.mesh.rotation.z=progress*1.5;}(effect.mesh.material as THREE.MeshBasicMaterial).opacity=1-progress*.8;}
      for(const [id,born] of seenEffects) if(time-born>6000)seenEffects.delete(id);
      if (commands.current.follow && actor) { const position=pieces.get(actor.id)?.root.position; commands.current.target = { x: position?.x ?? actor.x + .5, y: position?.z ?? actor.y + .5 }; }
      target.lerp(new THREE.Vector3(commands.current.target.x, 0, commands.current.target.y), reducedMotion ? 1 : Math.min(1, dt * 4));
      const angle = commands.current.angle; camera.position.set(target.x + Math.sin(angle) * 20, 30, target.z + Math.cos(angle) * 20); camera.lookAt(target);
      const aspect = mount.clientWidth / Math.max(1, mount.clientHeight); camera.left = -commands.current.zoom * aspect; camera.right = -camera.left; camera.top = commands.current.zoom; camera.bottom = -camera.top; camera.updateProjectionMatrix();
      navGrid.visible = gridRef.current;
      if (!reducedMotion) { specialObjects.forEach((o, i) => { o.rotation.y = time * .001 + i; }); flames.forEach((fire, i) => fire.scale.y = .8 + Math.sin(time * .013 + i) * .2); }
      (water.material as THREE.MeshStandardMaterial).roughness = .25 + Math.sin(time * .001) * .07;
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(animate);
    renderer.shadowMap.needsUpdate = true;
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); renderer.domElement.removeEventListener('pointerdown', down); renderer.domElement.removeEventListener('pointermove', motion); renderer.domElement.removeEventListener('pointerup', up); renderer.domElement.removeEventListener('wheel', wheel); renderer.domElement.removeEventListener('contextmenu', context); renderer.domElement.removeEventListener('keydown',keyboard);
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(); scene.traverse(o => { if (o instanceof THREE.Mesh) { geometries.add(o.geometry); for (const m of Array.isArray(o.material) ? o.material : [o.material]) materials.add(m); } else if (o instanceof THREE.Sprite) materials.add(o.material); }); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); ownedTextures.forEach(t => t.dispose()); routeGeometry.dispose(); routeMaterial.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, [biome]);

  const visibleHeroes = props.characters.filter(c => (c.biome || 'village') === biome);
  const visibleEnemies = props.enemies.filter(e => e.hp > 0 && (!e.biome || e.biome === biome) && (!e.ownerCharId || e.ownerCharId === hero?.id) && (!e.partyId || e.partyId === hero?.partyId));
  return <div className="dd-world-shell"><div ref={host} style={{ position: 'absolute', inset: 0, touchAction: 'none' }} aria-label="Tabuleiro 3D de Valdoria" />
    <div className="dd-scene-ui"><div className="dd-scene-controls"><button title="Centralizar no herói" aria-label="Centralizar no herói" onClick={() => { commands.current.follow = true; }}><Focus size={16} /></button><button title="Aproximar" aria-label="Aproximar" onClick={() => { commands.current.zoom = Math.max(7, commands.current.zoom - 2); }}><ZoomIn size={16} /></button><button title="Afastar" aria-label="Afastar" onClick={() => { commands.current.zoom = Math.min(36, commands.current.zoom + 2); }}><ZoomOut size={16} /></button><button title="Girar câmera" aria-label="Girar câmera" onClick={() => { commands.current.angle += Math.PI / 4; }}><RotateCcw size={16} /></button><button title="Grade tática" aria-label="Grade tática" aria-pressed={grid} onClick={() => setGrid(g => !g)}><Compass size={16} /></button><button title="Modo de compatibilidade 2D" onClick={props.onFallback}>2D</button></div>
      <div className="dd-scene-labels" ref={labels}>{[...visibleHeroes, ...visibleEnemies].map(e => <div key={e.id} className={`dd-entity-label ${visibleEnemies.some(n => n.id === e.id) ? 'is-enemy' : ''}`} data-entity-id={e.id}>{e.name}<progress max={e.maxHp} value={e.hp} /></div>)}{(props.npcs || []).filter(n => !n.biome || n.biome === biome).map(n => <button type="button" key={n.id} className="dd-entity-label dd-npc-label" data-entity-id={n.id} aria-label={`Conversar com ${n.name}`} onClick={()=>props.onTalkNpc?.(n.id)}>{n.name}</button>)}</div>
      <div className="dd-minimap" role="button" tabIndex={0} aria-label="Mapa regional: centralizar no herói" onClick={e => { const rect = e.currentTarget.getBoundingClientRect(); commands.current.follow = false; commands.current.target = { x: (e.clientX - rect.left) / rect.width * WORLD_SIZE, y: (e.clientY - rect.top) / rect.height * WORLD_SIZE }; }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); commands.current.follow = true; } }}>{landmarks.map(point => <i className="dd-minimap-dot" key={point.id} style={{ left: `${point.x / WORLD_SIZE * 100}%`, top: `${point.y / WORLD_SIZE * 100}%`, background: '#b59b6a' }} />)}{visibleHeroes.map(c => <i className="dd-minimap-dot" key={c.id} style={{ left: `${c.x / WORLD_SIZE * 100}%`, top: `${c.y / WORLD_SIZE * 100}%` }} />)}<span className="dd-minimap-title">MAPA REGIONAL</span></div><div className="dd-scene-hint">Clique para mover · Roda para zoom · Alt + arrastar para explorar</div>
      {notice&&<div className="dd-move-notice" role="status">{notice}</div>}
      {props.targetingAction&&<div className="dd-target-panel"><strong>{props.targetingAction.name}</strong><span>Escolha um alvo · alcance {props.targetingAction.rangeSquares*1.5} m</span>{visibleEnemies.map(e=><button key={e.id} onClick={()=>props.onTargetEnemy(e.id)}>{e.name} · {e.hp}/{e.maxHp} PV</button>)}<button onClick={props.onCancelTargeting}>Cancelar</button></div>}
    </div>{error && <div className="dd-webgl-error"><p>{error}</p><button className="dd-primary" onClick={props.onFallback}>Usar tabuleiro 2D</button></div>}
  </div>;
}
