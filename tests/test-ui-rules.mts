// tests/test-ui-rules.mts
import assert from 'node:assert';
import {
  determineAttackMode,
  resolveAttack,
  spendSpellSlot,
  shortRestHeal,
  classes,
  species,
  newCharacter,
  calculateEquippedStats
} from '../lib/game-engine';

async function runUnitAndApiTests() {
  console.log('⚔️ Testing D&D 5e Rules & Mechanics Extensions...\n');

  // 1. Test Conditions Engine (determineAttackMode & resolveAttack)
  console.log('1️⃣ Testing Condition Rules (Vantagem / Desvantagem)...');
  const normalMode = determineAttackMode([], []);
  assert.strictEqual(normalMode, 'normal', 'No conditions should be normal mode');

  const poisonedMode = determineAttackMode(['Envenenado'], []);
  assert.strictEqual(poisonedMode, 'disadvantage', 'Poisoned attacker must have disadvantage');

  const proneTargetMode = determineAttackMode([], ['Caído']);
  assert.strictEqual(proneTargetMode, 'advantage', 'Prone target must grant advantage');

  const cancelOutMode = determineAttackMode(['Envenenado'], ['Caído']);
  assert.strictEqual(cancelOutMode, 'normal', 'Advantage + Disadvantage cancels out to normal');

  const atkResult = resolveAttack(
    { name: 'Guerreiro', attack: 5, damage: '1d8+3', conditions: ['Invisível'] },
    { id: 'target-1', name: 'Goblin', ac: 10, hp: 15, conditions: [] }
  );
  assert.ok(atkResult.text.includes('(Vantagem)'), 'Attack with invisible condition should log Vantagem');
  console.log('✅ Condition mechanics verified successfully!');

  // 2. Test Spell Slots System
  console.log('\n2️⃣ Testing Leveled Spell Slot Consumption...');
  const hero = {
    ...newCharacter(),
    slots: [2, 1, 0, 0, 0, 0, 0, 0, 0],
    usedSlots: [0, 0, 0, 0, 0, 0, 0, 0, 0]
  };

  // Cantrip (level 0) doesn't consume slot
  const cantripOk = spendSpellSlot(hero, 0);
  assert.strictEqual(cantripOk, true, 'Cantrip must succeed without slot');
  assert.strictEqual(hero.usedSlots[0], 0, 'Level 1 slot must remain 0 after cantrip');

  // Spend 1st level slot #1
  const spell1Ok = spendSpellSlot(hero, 1);
  assert.strictEqual(spell1Ok, true, 'Level 1 spell slot #1 spent');
  assert.strictEqual(hero.usedSlots[0], 1, 'Used slots level 1 must be 1');

  // Spend 1st level slot #2
  const spell2Ok = spendSpellSlot(hero, 1);
  assert.strictEqual(spell2Ok, true, 'Level 1 spell slot #2 spent');
  assert.strictEqual(hero.usedSlots[0], 2, 'Used slots level 1 must be 2');

  // Attempt to spend 3rd time (should fail, max was 2)
  const spell3Ok = spendSpellSlot(hero, 1);
  assert.strictEqual(spell3Ok, false, 'Level 1 spell slot #3 must fail when depleted');
  console.log('✅ Spell slot consumption and depletion verified!');

  // 3. Test Short Rest Healing with Hit Dice
  console.log('\n3️⃣ Testing Short Rest with Hit Dice (Descanso Curto 1h)...');
  const woundedHero = {
    ...newCharacter(),
    className: 'Guerreiro',
    hp: 4,
    maxHp: 12,
    stats: [16, 14, 14, 10, 12, 8] // CON 14 (+2)
  };
  const restRes = shortRestHeal(woundedHero);
  assert.ok(restRes.healed >= 3, 'Healed amount must be at least 1 + CON mod (1+2=3)');
  assert.ok(woundedHero.hp > 4, 'Hero HP must increase after short rest');
  assert.ok(restRes.rollText.includes('1d10'), 'Fighter Hit Die is 1d10');
  console.log(`✅ Short Rest heal verified: ${restRes.rollText}`);

  // 4. Test All 9 Official Species
  console.log('\n4️⃣ Verifying all 9 Official D&D 5e Species...');
  assert.strictEqual(species.length, 9, 'Must have exactly 9 official species');
  const expectedSpecies = ['Anão', 'Draconato', 'Elfo', 'Gnomo', 'Golias', 'Humano', 'Orc', 'Pequenino', 'Tiferino'];
  for (const sp of expectedSpecies) {
    assert.ok(species.includes(sp), `Species ${sp} must be present in official species list`);
  }
  console.log('✅ All 9 official Portuguese species present and verified!');

  // 5. Test Live Server Endpoints (Short Rest & Spell)
  console.log('\n5️⃣ Testing Live Server API for shortRest & spell...');
  const baseUrl = 'http://localhost:5173';
  const auth = await fetch(baseUrl + '/signin-with-chatgpt?return_to=/', { redirect: 'manual' });
  const cookie = auth.headers.get('set-cookie')?.split(';')[0];
  const headers = { cookie: cookie || '', 'Content-Type': 'application/json', Origin: baseUrl };

  // Create room
  const roomRes = await fetch(`${baseUrl}/api/game`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'create', name: 'Mesa de Teste D&D 5e' })
  });
  const roomData = await roomRes.json() as any;
  const roomId = roomData.id;

  // Fetch room
  const getRes = await fetch(`${baseUrl}/api/game?room=${encodeURIComponent(roomId)}`, { headers });
  const getData = await getRes.json() as any;
  let version = getData.room.version;
  let state = getData.room.state;

  if (state.characters.length === 0) {
    const freshHero = {
      ...newCharacter(),
      id: 'test-hero-1',
      name: 'Valerius Teste',
      level: 1,
      hp: 12,
      maxHp: 12
    };
    const addHeroRes = await fetch(`${baseUrl}/api/game`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ room: roomId, version, action: 'character', value: freshHero })
    });
    const addHeroData = await addHeroRes.json() as any;
    version = addHeroData.room.version;
    state = addHeroData.room.state;
  }

  // 5a. Test shortRest API
  const hero0 = state.characters[0];
  hero0.hp = Math.max(1, hero0.maxHp - 4);
  const saveRes = await fetch(`${baseUrl}/api/game`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ room: roomId, version, action: 'character', value: hero0 })
  });
  const saveData = await saveRes.json() as any;
  version = saveData.room.version;

  const shortRestRes = await fetch(`${baseUrl}/api/game`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ room: roomId, version, action: 'shortRest' })
  });
  assert.strictEqual(shortRestRes.status, 200, 'shortRest must return 200');
  const shortRestData = await shortRestRes.json() as any;
  version = shortRestData.room.version;
  const healedHero0 = shortRestData.room.state.characters.find((c: any) => c.id === hero0.id);
  console.log(`✅ Short Rest API verified! Hero HP recovered to ${healedHero0.hp}/${healedHero0.maxHp}`);

  // 5b. Test Spell Action
  // Start encounter to spawn enemies and initialize 5e initiative
  const encRes = await fetch(`${baseUrl}/api/game`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ room: roomId, version, action: 'encounter' })
  });
  assert.strictEqual(encRes.status, 200, 'Encounter must start successfully');
  const encData = await encRes.json() as any;
  version = encData.room.version;
  state = encData.room.state;
  const enemy = state.enemies[0];
  assert.ok(enemy, 'Enemy must be spawned in combat');

  const mageHero = state.characters.find((c: any) => c.className === 'Mago') || state.characters[0];
  if (!mageHero.slots || mageHero.slots[0] === 0) {
    mageHero.slots = [2, 0, 0, 0, 0, 0, 0, 0, 0];
    mageHero.usedSlots = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  }

  // Advance turn until it is mageHero's turn
  let passes = 0;
  while (state.combat && state.order[state.turn] !== mageHero.id && passes < 10) {
    passes++;
    const curId = state.order[state.turn];
    const passRes = await fetch(`${baseUrl}/api/game`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ room: roomId, version, action: 'pass', character: curId })
    });
    const passData = await passRes.json() as any;
    version = passData.room.version;
    state = passData.room.state;
  }

  const spellRes = await fetch(`${baseUrl}/api/game`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      room: roomId,
      version,
      action: 'spell',
      character: mageHero.id,
      spellName: 'Raio de Fogo',
      spellLevel: 0,
      damageFormula: '1d10',
      target: enemy.id
    })
  });
  assert.strictEqual(spellRes.status, 200, 'Spell action must return 200');
  const spellData = await spellRes.json() as any;
  assert.ok(spellData.attackResult, 'Spell must return attackResult');
  console.log(`✅ Spell executed on server! Result: ${spellData.attackResult.text}`);
  console.log(`   Combat status: ${spellData.room.state.combat}, Active turn: ${spellData.room.state.turn}`);

  console.log('\n🎉 ALL ADVANCED D&D 5E EXTENSION TESTS PASSED! 🛡️✨');
}

runUnitAndApiTests().catch((e) => {
  console.error('❌ Test failed:', e);
  process.exit(1);
});
