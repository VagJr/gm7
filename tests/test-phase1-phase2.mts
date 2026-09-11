// tests/test-phase1-phase2.mts
import assert from 'node:assert';
import {
  isPointInsidePolygon,
  isPointWalkableWithPolygons,
  findPathWithCustomPolygons,
  type CollisionPolygon
} from '../lib/collision-system.ts';
import {
  GM_CONTROLLED_TOOLS,
  executeServerAuthoritativeGmTool
} from '../lib/gm-tools.ts';
import { starterState, type State } from '../lib/game-engine.ts';

console.log('--- INICIANDO TESTES AUTOMATIZADOS: FASE 1 & FASE 2 ---');

// ═══════════════════════════════════════════════════════════════════
// TESTE FASE 1: EDITOR DE MAPAS & PATHFINDING COM POLÍGONOS CUSTOMIZADOS
// ═══════════════════════════════════════════════════════════════════
console.log('\n[Fase 1] Testando colisões e tipos de polígonos...');

// 1. Definição de polígonos de teste
const testPolygons: CollisionPolygon[] = [
  // Paredão Bloqueado no meio do mapa (X: 0.3 a 0.7, Y: 0.4 a 0.5)
  {
    id: 'wall-1',
    name: 'Muralha de Pedra',
    type: 'bloqueado',
    points: [
      [0.3, 0.4],
      [0.7, 0.4],
      [0.7, 0.5],
      [0.3, 0.5]
    ]
  },
  // Rio de Água Profunda (X: 0.0 a 1.0, Y: 0.7 a 0.85)
  {
    id: 'river-1',
    name: 'Rio das Sombras',
    type: 'agua',
    points: [
      [0.0, 0.7],
      [1.0, 0.7],
      [1.0, 0.85],
      [0.0, 0.85]
    ]
  },
  // Ponte sobre o Rio (X: 0.38 a 0.62, Y: 0.68 a 0.87)
  {
    id: 'bridge-1',
    name: 'Ponte de Madeira',
    type: 'ponte',
    points: [
      [0.38, 0.68],
      [0.62, 0.68],
      [0.62, 0.87],
      [0.38, 0.87]
    ]
  },
  // Porta de Madeira
  {
    id: 'door-1',
    name: 'Porta de Ferro Fechada',
    type: 'porta',
    points: [
      [0.1, 0.1],
      [0.2, 0.1],
      [0.2, 0.2],
      [0.1, 0.2]
    ]
  },
  // Região Caminhável
  {
    id: 'walkable-path',
    name: 'Estrada da Vila',
    type: 'caminhavel',
    points: [
      [0.05, 0.25],
      [0.25, 0.25],
      [0.25, 0.35],
      [0.05, 0.35]
    ]
  }
];

// Teste 1.1: Ponto dentro da muralha deve ser intransponível
assert.strictEqual(
  isPointWalkableWithPolygons(0.5, 0.45, testPolygons),
  false,
  'Ponto dentro de "bloqueado" deve ser intransponível (walkable = false)'
);

// Teste 1.2: Ponto dentro do rio (fora da ponte) deve ser intransponível
assert.strictEqual(
  isPointWalkableWithPolygons(0.2, 0.75, testPolygons),
  false,
  'Ponto na água fora da ponte deve ser intransponível'
);

// Teste 1.3: Ponto sobre a ponte deve ser transponível (ponte sobrescreve água!)
assert.strictEqual(
  isPointWalkableWithPolygons(0.5, 0.75, testPolygons),
  true,
  'Ponto sobre a ponte deve ser transponível (sobrescreve rio)'
);

// Teste 1.4: Ponto em terreno aberto deve ser livre
assert.strictEqual(
  isPointWalkableWithPolygons(0.1, 0.5, testPolygons),
  true,
  'Ponto em terreno aberto deve ser livre'
);

// Teste 1.5: Ponto fora dos limites (ex: x < 0.01 ou x > 0.99) deve ser bloqueado
assert.strictEqual(
  isPointWalkableWithPolygons(0.005, 0.5, testPolygons),
  false,
  'Ponto fora das bordas do mapa deve ser bloqueado'
);

console.log('✓ Verificações de Ray-Casting e tipos de terreno validadas!');

// Teste 1.6: Pathfinding A* contornando obstáculos e usando ponte
console.log('\n[Fase 1] Testando Pathfinding A* com token...');
const gridSize = 8;

// Destino do outro lado do rio (indo de Y:2 para Y:7)
// O rio corta Y:5..Y:6 (em grid 8: 0.7 a 0.85 = linha 5 a 6).
// O token DEVE passar pela ponte (X:4) para alcançar o outro lado!
const startPoint = { x: 4, y: 1 };
const targetAcrossRiver = { x: 4, y: 7 };

const riverPath = findPathWithCustomPolygons(startPoint, targetAcrossRiver, testPolygons, gridSize);
assert(riverPath.length > 0, 'Deveria encontrar caminho atravessando pela ponte');

// Verifica que o token não tentou passar pela água em X:1 (que não tem ponte)
const steppedInWaterWithoutBridge = riverPath.some(
  (p) => p.y >= 5 && p.y <= 6 && (p.x < 3 || p.x > 5)
);
assert.strictEqual(
  steppedInWaterWithoutBridge,
  false,
  'Token NÃO pode atravessar água onde não há ponte!'
);

console.log(`✓ Rota encontrada com sucesso contornando obstáculos: ${riverPath.length} passos.`);

// Teste 1.7: Caminho impossível (destino dentro de obstáculo)
const blockedDestination = { x: 4, y: 3 }; // dentro da muralha 0.4 a 0.5 (linha 3 no grid 8)
const impossiblePath = findPathWithCustomPolygons(startPoint, blockedDestination, testPolygons, gridSize);
assert.strictEqual(
  impossiblePath.length,
  0,
  'Token NÃO pode mover para destino bloqueado por obstáculo!'
);

console.log('✓ Token impedido com sucesso de entrar ou passar por obstáculo.');


// ═══════════════════════════════════════════════════════════════════
// TESTE FASE 2: GM DE IA COM AS 5 FERRAMENTAS CONTROLADAS
// ═══════════════════════════════════════════════════════════════════
console.log('\n[Fase 2] Testando as 5 Ferramentas Controladas do GM...');

// Verifica que a lista de ferramentas declaradas contém exatamente 5 ferramentas
assert.strictEqual(
  GM_CONTROLLED_TOOLS.length,
  5,
  'O GM deve ter EXATAMENTE 5 ferramentas declaradas'
);

const toolNames = GM_CONTROLLED_TOOLS.map((t) => t.function.name).sort();
assert.deepStrictEqual(
  toolNames,
  ['create_encounter', 'create_npc', 'grant_loot', 'set_combat_state', 'update_quest'].sort(),
  'As ferramentas devem ser estritamente: create_encounter, create_npc, grant_loot, set_combat_state, update_quest'
);

console.log('✓ 5 Ferramentas confirmadas no esquema:', toolNames.join(', '));

// Cria estado inicial com heróis para testes de servidor
const testState: State = starterState();
assert(testState.characters.length > 0, 'Estado deve ter heróis iniciais');

// 2.1: Teste create_encounter
console.log('\n[Fase 2 - Ferramenta 1] create_encounter...');
const encRes = executeServerAuthoritativeGmTool(
  'create_encounter',
  {
    name: 'Sentinela Abissal',
    hp: 15,
    ac: 12,
    attack: 3,
    damage: '1d6+2',
    x: 6,
    y: 2,
    startCombat: true
  },
  testState
);

assert.strictEqual(encRes.success, true);
assert.strictEqual(testState.enemies.length, 1);
assert.strictEqual(testState.enemies[0].name, 'Sentinela Abissal');
assert.strictEqual(testState.enemies[0].hp, 15);
assert.strictEqual(testState.enemies[0].maxHp, 15);
assert.strictEqual(testState.enemies[0].ac, 12);
assert.strictEqual(testState.enemies[0].x, 6);
assert.strictEqual(testState.enemies[0].y, 2);
assert.strictEqual(testState.combat, true, 'startCombat deve ativar combate');
assert(testState.order.length >= 2, 'Ordem de iniciativa deve conter heróis e inimigo');
console.log('✓ create_encounter validado: inimigo inserido e combate iniciado!');

// 2.2: Teste create_npc
console.log('\n[Fase 2 - Ferramenta 2] create_npc...');
const npcRes = executeServerAuthoritativeGmTool(
  'create_npc',
  {
    name: 'Maelor, o Cartógrafo',
    role: 'Especialista em Mapas',
    description: 'Um ancião segurando pergaminhos com tinta reluzente.',
    dialogue: ['Tenho mapas das catacumbas caso tenham moedas.', 'Cuidado com a água tóxica.'],
    x: 2,
    y: 4
  },
  testState
);

assert.strictEqual(npcRes.success, true);
const createdNpc = testState.npcs.find((n) => n.name === 'Maelor, o Cartógrafo');
assert(createdNpc, 'NPC deve existir em state.npcs');
assert.strictEqual(createdNpc?.role, 'Especialista em Mapas');
assert.strictEqual(createdNpc?.dialogue?.length, 2);
console.log('✓ create_npc validado: NPC inserido com diálogos!');

// 2.3: Teste grant_loot
console.log('\n[Fase 2 - Ferramenta 3] grant_loot...');
const firstHero = testState.characters[0];
const prevGold = firstHero.gold || 0;
const prevXp = firstHero.xp || 0;

const lootRes = executeServerAuthoritativeGmTool(
  'grant_loot',
  {
    targetHeroId: firstHero.id,
    gold: 50,
    xp: 150,
    itemId: 'pocao-cura',
    itemName: 'Poção de Cura',
    reason: 'Tesouro da Cripta'
  },
  testState
);

assert.strictEqual(lootRes.success, true);
assert.strictEqual(firstHero.gold, prevGold + 50, 'Ouro deve ser incrementado');
assert.strictEqual(firstHero.xp, prevXp + 150, 'XP deve ser incrementado');
assert(firstHero.inventory?.includes('pocao-cura'), 'Item deve constar no inventário do herói');
console.log('✓ grant_loot validado: ouro, XP e item concedidos ao herói!');

// 2.4: Teste set_combat_state (end & start)
console.log('\n[Fase 2 - Ferramenta 4] set_combat_state...');
// Encerra combate
const endCombatRes = executeServerAuthoritativeGmTool(
  'set_combat_state',
  { action: 'end', reason: 'Os inimigos recuaram' },
  testState
);
assert.strictEqual(endCombatRes.success, true);
assert.strictEqual(testState.combat, false, 'Combate deve ter sido encerrado');
assert.strictEqual(testState.order.length, 0, 'Ordem deve ter sido esvaziada');

// Reinicia combate
const startCombatRes = executeServerAuthoritativeGmTool(
  'set_combat_state',
  { action: 'start', reason: 'Emboscada nas ruínas' },
  testState
);
assert.strictEqual(startCombatRes.success, true);
assert.strictEqual(testState.combat, true, 'Combate deve ter sido iniciado');
assert(testState.order.length > 0, 'Ordem de iniciativa deve estar preenchida');
console.log('✓ set_combat_state validado: encerramento e reinício com iniciativa!');

// 2.5: Teste update_quest
console.log('\n[Fase 2 - Ferramenta 5] update_quest...');
const questRes = executeServerAuthoritativeGmTool(
  'update_quest',
  {
    questKey: 'abbey_cleansed',
    title: 'Purificar a Abadia',
    completed: true,
    narrativeNote: 'As cinzas foram dissipadas pelo vento sagrado.'
  },
  testState
);

assert.strictEqual(questRes.success, true);
assert.strictEqual(testState.questProgress?.abbey_cleansed, true, 'Etapa deve estar marcada como concluída');
console.log('✓ update_quest validado: missão registrada em questProgress!');

// 2.6: Teste de rejeição de ferramenta NÃO autorizada
console.log('\n[Fase 2 - Segurança] Teste de rejeição de ferramenta arbitrária...');
const unauthorizedRes = executeServerAuthoritativeGmTool(
  'kill_all_players',
  {},
  testState
);
assert.strictEqual(unauthorizedRes.success, false, 'Ferramentas não autorizadas devem ser rejeitadas');
console.log('✓ Segurança confirmada: ferramenta desconhecida bloqueada pelo servidor autoritativo!');

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('TODOS OS TESTES AUTOMATIZADOS PASSARAM COM 100% DE SUCESSO! 🎉');
console.log('═══════════════════════════════════════════════════════════════');
