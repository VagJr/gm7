import { NextRequest, NextResponse } from 'next/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/lib/room-db';
import {
  initialState,
  starterState,
  entry,
  validateCharacter,
  calculateEquippedStats,
  canLevelUp,
  getXpForNextLevel,
  isAsiLevel,
  getSpellSlotsForClass,
  classes,
  attack,
  resolveAttack,
  spendSpellSlot,
  shortRestHeal,
  d20,
  roll,
  mod,
  prof,
  locations,
  type State,
  type Character,
  type AttackResult
} from '@/lib/game-engine';

type Room = { id: string; owner: string; name: string; state: string; version: number; code: string };

export async function GET(req: NextRequest) {
  try {
    const user = await getChatGPTUser();
    if (!user) return NextResponse.json({ signedIn: false, rooms: [] });
    const db = database();
    let rooms = await db
      .prepare('SELECT r.id,r.name FROM rooms r JOIN members m ON m.room=r.id WHERE m.user=?')
      .bind(user.userId)
      .all();
    const isWipe = req.nextUrl.searchParams.get('wipe') === '1';
    if (isWipe) {
      const userRooms = await db
        .prepare('SELECT room FROM members WHERE user=?')
        .bind(user.userId)
        .all<{ room: string }>();
      const roomIds = userRooms.results?.map((r) => r.room) || [];
      for (const roomId of roomIds) {
        await db.prepare('DELETE FROM members WHERE room=?').bind(roomId).run();
        await db.prepare('DELETE FROM rooms WHERE id=?').bind(roomId).run();
      }
      await db.prepare('DELETE FROM members WHERE user=?').bind(user.userId).run();
      await db.prepare('DELETE FROM rooms WHERE owner=?').bind(user.userId).run();
      rooms = { results: [], success: true, meta: {} } as any;
    }

    if (!rooms.results || rooms.results.length === 0) {
      const id = crypto.randomUUID();
      const code = crypto.randomUUID().replaceAll('-', '').slice(0, 16);
      const name = 'Vila do Rio Verde';
      await db.batch([
        db.prepare('INSERT INTO rooms(id,owner,name,state,code) VALUES(?,?,?,?,?)')
          .bind(id, user.userId, name, JSON.stringify(initialState()), code),
        db.prepare('INSERT INTO members(room,user) VALUES(?,?)').bind(id, user.userId)
      ]);
      rooms = await db
        .prepare('SELECT r.id,r.name FROM rooms r JOIN members m ON m.room=r.id WHERE m.user=?')
        .bind(user.userId)
        .all();
    }
    const requestedId = req.nextUrl.searchParams.get('room');
    const targetId = requestedId || (rooms.results[0] ? (rooms.results[0].id as string) : null);
    if (!targetId) return NextResponse.json({ signedIn: true, user: user.userId, rooms: rooms.results });
    const room = await db
      .prepare('SELECT r.* FROM rooms r JOIN members m ON m.room=r.id WHERE r.id=? AND m.user=?')
      .bind(targetId, user.userId)
      .first<Room>();
    if (!room) {
      if (requestedId) return NextResponse.json({ error: 'Mesa não encontrada.' }, { status: 404 });
      return NextResponse.json({ signedIn: true, user: user.userId, rooms: rooms.results });
    }
    return NextResponse.json({
      signedIn: true,
      user: user.userId,
      rooms: rooms.results,
      room: { ...room, state: JSON.parse(room.state) }
    });
  } catch {
    return NextResponse.json({ error: 'Não foi possível carregar a mesa. Tente novamente.' }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getChatGPTUser();
    if (!user) return NextResponse.json({ error: 'Entre para salvar sua aventura.' }, { status: 401 });
    if (req.headers.get('origin') && req.headers.get('origin') !== req.nextUrl.origin) {
      return NextResponse.json({ error: 'Origem inválida.' }, { status: 403 });
    }
    const raw = await req.text();
    if (raw.length > 100000) throw Error('Dados muito grandes.');
    const a = JSON.parse(raw);
    const db = database();

    if (a.action === 'wipe' || a.action === 'resetAll') {
      const userRooms = await db
        .prepare('SELECT room FROM members WHERE user=?')
        .bind(user.userId)
        .all<{ room: string }>();
      const roomIds = userRooms.results?.map((r) => r.room) || [];
      for (const roomId of roomIds) {
        await db.prepare('DELETE FROM members WHERE room=?').bind(roomId).run();
        await db.prepare('DELETE FROM rooms WHERE id=?').bind(roomId).run();
      }
      await db.prepare('DELETE FROM members WHERE user=?').bind(user.userId).run();
      await db.prepare('DELETE FROM rooms WHERE owner=?').bind(user.userId).run();

      const id = crypto.randomUUID();
      const code = crypto.randomUUID().replaceAll('-', '').slice(0, 16);
      const name = 'Vila do Rio Verde';
      const freshState = initialState();
      await db.batch([
        db.prepare('INSERT INTO rooms(id,owner,name,state,code) VALUES(?,?,?,?,?)')
          .bind(id, user.userId, name, JSON.stringify(freshState), code),
        db.prepare('INSERT INTO members(room,user) VALUES(?,?)').bind(id, user.userId)
      ]);
      return NextResponse.json({
        ok: true,
        id,
        room: {
          id,
          owner: user.userId,
          name,
          code,
          version: 1,
          state: freshState
        }
      });
    }

    if (a.action === 'create') {
      const id = crypto.randomUUID();
      const code = crypto.randomUUID().replaceAll('-', '').slice(0, 16);
      const name = String(a.name || 'Vila do Rio Verde').slice(0, 80);
      await db.batch([
        db.prepare('INSERT INTO rooms(id,owner,name,state,code) VALUES(?,?,?,?,?)')
          .bind(id, user.userId, name, JSON.stringify(initialState()), code),
        db.prepare('INSERT INTO members(room,user) VALUES(?,?)').bind(id, user.userId)
      ]);
      return NextResponse.json({ id });
    }

    if (a.action === 'join') {
      const room = await db.prepare('SELECT id FROM rooms WHERE code=?').bind(String(a.code).trim()).first<{ id: string }>();
      if (!room) throw Error('Código de convite inválido.');
      await db.prepare('INSERT OR IGNORE INTO members(room,user) VALUES(?,?)').bind(room.id, user.userId).run();
      return NextResponse.json({ id: room.id });
    }

    const r = await db
      .prepare('SELECT r.* FROM rooms r JOIN members m ON m.room=r.id WHERE r.id=? AND m.user=?')
      .bind(a.room, user.userId)
      .first<Room>();
    if (!r) return NextResponse.json({ error: 'Mesa não encontrada.' }, { status: 404 });
    if (a.version !== undefined && r.version !== a.version) {
      return NextResponse.json({ error: 'A mesa mudou. Os dados foram atualizados; tente sua ação novamente.' }, { status: 409 });
    }

    const s: State = JSON.parse(r.state);
    const owner = r.owner === user.userId;
    const c = s.characters.find((c) => c.id === a.character);
    const own = () => {
      if (!c || (!owner && c.owner !== user.userId)) throw Error('Escolha um personagem seu.');
      return c;
    };
    const gm = () => {
      if (!owner) throw Error('Somente o anfitrião pode realizar esta ação.');
    };
    const log = (text: string, kind: 'gm' | 'roll' | 'player' | 'system' = 'system') =>
      s.logs.push(entry(text, kind));

    let clientAttackResult: AttackResult | null = null;
    let clientHealResult: { targetId: string; targetName: string; healAmount: number; hpAfter: number; maxHp: number } | null = null;

    switch (a.action) {
      case 'character': {
        const rawChar = a.value as Character;
        const old = s.characters.find((x) => x.id === rawChar?.id);
        const isEquipmentUpdate = Boolean(old && JSON.stringify(old.equipment) !== JSON.stringify(rawChar?.equipment));
        const isHpOrConditionUpdate = Boolean(old && (old.hp !== rawChar?.hp || JSON.stringify(old.conditions) !== JSON.stringify(rawChar?.conditions)));
        if (s.combat && !isEquipmentUpdate && !isHpOrConditionUpdate && !owner) throw Error('Encerre o combate antes de editar atributos da ficha.');
        let next = validateCharacter(rawChar);
        next = calculateEquippedStats(next);
        if (old && !owner && old.owner !== user.userId) throw Error('Esta ficha pertence a outro jogador.');
        if (old) {
          s.characters = s.characters.map((x) => (x.id === old.id ? { ...next, id: old.id, owner: old.owner } : x));
        } else {
          if (s.characters.length >= 12) throw Error('Limite de 12 personagens por mesa.');
          s.characters.push({ ...next, id: next.id || crypto.randomUUID(), owner: user.userId });
        }
        log(`${next.name} ${old ? (isEquipmentUpdate ? 'ajustou seus equipamentos' : 'atualizou sua ficha') : 'entrou na aventura'}.`);
        break;
      }
      case 'roll': {
        const result = roll(String(a.formula));
        log(`${user.displayName}: ${a.formula} → [${result.results.join(', ')}] ${result.bonus ? '+ (' + result.bonus + ') ' : ''}= ${result.total}`, 'roll');
        break;
      }
      case 'check': {
        const p = own();
        const ability = Number(a.ability);
        if (!Number.isInteger(ability) || ability < 0 || ability > 5) throw Error('Atributo inválido.');
        const result = d20(a.mode);
        const bonus =
          mod(p.stats[ability]) +
          (a.skill && p.skills.includes(a.skill) ? prof(p.level) : 0) +
          (a.skill && p.expertise.includes(a.skill) ? prof(p.level) : 0) -
          2 * p.exhaustion;
        log(`${p.name}: ${String(a.label).slice(0, 60)} [${result.dice.join(', ')}] ${bonus >= 0 ? '+' : ''}${bonus} = ${result.raw + bonus}`, 'roll');
        break;
      }
      case 'encounter': {
        gm();
        if (s.combat) throw Error('Já existe um combate em andamento.');
        if (!s.characters.some((x) => x.hp > 0)) throw Error('Crie um personagem consciente primeiro.');
        s.enemies = [
          {
            id: crypto.randomUUID(),
            name: 'Sentinela de Cinzas',
            hp: 9,
            maxHp: 9,
            ac: 11,
            attack: 2,
            damage: '1d4+1',
            initiative: d20().raw + 1,
            x: 7,
            y: 3
          }
        ];
        for (const p of s.characters) p.initiative = d20().raw + mod(p.stats[1]) + 3 - 2 * p.exhaustion; // +3 hero preparation bonus
        s.order = [...s.characters.filter((x) => x.hp > 0), ...s.enemies]
          .sort((a, b) => b.initiative - a.initiative || a.id.localeCompare(b.id))
          .map((x) => x.id);
        s.combat = true;
        s.round = 1;
        s.turn = 0;
        s.actionUsed = false;
        log(
          'Combate iniciado! Iniciativa 5e: ' +
            s.order
              .map((id) => {
                const x = [...s.characters, ...s.enemies].find((x) => x.id === id)!;
                return x.name + ' (' + x.initiative + ')';
              })
              .join(' • '),
          'roll'
        );
        executeEnemyAI(s);
        break;
      }
      case 'attack': {
        const p = own();
        if (!s.combat) {
          s.combat = true;
          s.round = 1;
          for (const char of s.characters) char.initiative = d20().raw + mod(char.stats[1]) + 3 - 2 * char.exhaustion; // +3 hero preparation bonus
          for (const enemy of s.enemies) enemy.initiative = d20().raw + 1;
          s.order = [...s.characters.filter((x) => x.hp > 0), ...s.enemies.filter((e) => e.hp > 0)]
            .sort((a, b) => b.initiative - a.initiative || a.id.localeCompare(b.id))
            .map((x) => x.id);
          s.turn = s.order.indexOf(p.id);
          if (s.turn === -1) {
            s.order.unshift(p.id);
            s.turn = 0;
          }
          s.actionUsed = false;
          log(`${p.name} desferiu um ataque surpresa, iniciando o combate!`, 'roll');
        } else {
          // Strict D&D 5e Action Economy enforcement:
          const curTurnId = s.order[s.turn];
          if (curTurnId && curTurnId !== p.id) {
            const activeCreature = [...s.characters, ...s.enemies].find((x) => x.id === curTurnId);
            throw Error(`Não é o turno de ${p.name}. Turno atual: ${activeCreature ? activeCreature.name : 'Inimigo'}.`);
          }
          if (s.actionUsed) {
            throw Error('Você já utilizou sua Ação neste turno. Mova-se pelo terreno ou clique em "Fim do Turno" para passar a vez.');
          }
        }

        if (p.hp <= 0) throw Error('Este personagem está inconsciente.');
        const targetId = a.target || a.targetId;
        const target = s.enemies.find((e) => e.id === targetId && e.hp > 0);
        if (!target) throw Error('Escolha um alvo inimigo ativo.');

        // Server authoritative SRD attack resolution
        const dmgFormula = String(a.damageFormula || p.damage);
        const attackBonus = p.attack - 2 * p.exhaustion;
        const res = resolveAttack(
          { name: p.name, attack: attackBonus, damage: dmgFormula, conditions: p.conditions },
          { id: target.id, name: target.name, ac: target.ac, hp: target.hp, conditions: target.conditions },
          a.mode
        );
        clientAttackResult = res;
        target.hp = res.hpAfter;
        s.actionUsed = true;
        log(res.text, 'roll');

        if (target.hp <= 0) {
          log(`💀 ${target.name} foi derrotado!`, 'gm');
          const xpReward = target.name.includes('Malakor') ? 500 : target.name.includes('Guardião') ? 250 : 150;
          for (const char of s.characters) {
            char.xp = (char.xp || 0) + xpReward;
          }
          log(`✨ Os heróis receberam +${xpReward} XP pela vitória contra ${target.name}!`, 'gm');
        }

        if (s.enemies.length > 0 && s.enemies.every((e) => e.hp <= 0)) {
          if (!s.questProgress) s.questProgress = {};
          if (s.biome === 'forest' || s.location === 1) {
            s.questProgress.forest_cleared = true;
          } else if (s.biome === 'dungeon' || s.location === 2) {
            s.questProgress.malakor_defeated = true;
          }
          s.combat = false;
          s.actionUsed = false;
          log('⚔️ Todos os inimigos foram vencidos! Vitória do grupo!', 'gm');
        }

        // If client specified immediate end of turn, advance
        if (a.endTurn) {
          s.actionUsed = false;
          advance(s);
          executeEnemyAI(s);
        }
        break;
      }
      case 'spell': {
        const p = own();
        if (!s.combat) {
          s.combat = true;
          s.round = 1;
          for (const char of s.characters) char.initiative = d20().raw + mod(char.stats[1]) + 3 - 2 * char.exhaustion; // +3 hero preparation bonus
          for (const enemy of s.enemies) enemy.initiative = d20().raw + 1;
          s.order = [...s.characters.filter((x) => x.hp > 0), ...s.enemies.filter((e) => e.hp > 0)]
            .sort((a, b) => b.initiative - a.initiative || a.id.localeCompare(b.id))
            .map((x) => x.id);
          s.turn = s.order.indexOf(p.id);
          if (s.turn === -1) {
            s.order.unshift(p.id);
            s.turn = 0;
          }
          s.actionUsed = false;
          log(`${p.name} conjurou uma magia de surpresa, iniciando o combate!`, 'roll');
        } else {
          const curTurnId = s.order[s.turn];
          if (curTurnId && curTurnId !== p.id) {
            const activeCreature = [...s.characters, ...s.enemies].find((x) => x.id === curTurnId);
            throw Error(`Não é o turno de ${p.name}. Turno atual: ${activeCreature ? activeCreature.name : 'Inimigo'}.`);
          }
          if (s.actionUsed) {
            throw Error('Você já utilizou sua Ação neste turno. Mova-se pelo terreno ou clique em "Fim do Turno" para passar a vez.');
          }
        }

        if (p.hp <= 0) throw Error('Este personagem está inconsciente.');
        const spellLevel = Number(a.spellLevel || 0);
        const spellName = String(a.spellName || 'Magia');

        if (spellLevel > 0) {
          const spent = spendSpellSlot(p, spellLevel);
          if (!spent) {
            throw Error(`Sem espaços de magia de nível ${spellLevel} restantes para ${p.name}!`);
          }
        }

        const targetId = a.target || a.targetId;
        if (targetId) {
          const target = s.enemies.find((e) => e.id === targetId && e.hp > 0);
          if (!target) throw Error('Escolha um alvo inimigo ativo.');
          const dmgFormula = String(a.damageFormula || '1d10');
          const spellAtkBonus = prof(p.level) + mod(p.stats[p.spellAbility || 3]) - 2 * p.exhaustion;
          const res = resolveAttack(
            { name: p.name, attack: spellAtkBonus, damage: dmgFormula, conditions: p.conditions },
            { id: target.id, name: target.name, ac: target.ac, hp: target.hp, conditions: target.conditions },
            a.mode
          );
          clientAttackResult = res;
          target.hp = res.hpAfter;
          s.actionUsed = true;
          log(`✨ [${spellName}${spellLevel > 0 ? ' • Nível ' + spellLevel : ' • Truque'}] ${res.text}`, 'roll');

          if (target.hp <= 0) {
            log(`💀 ${target.name} foi derrotado pela magia!`, 'gm');
            const xpReward = target.name.includes('Malakor') ? 500 : target.name.includes('Guardião') ? 250 : 150;
            for (const char of s.characters) {
              char.xp = (char.xp || 0) + xpReward;
            }
            log(`✨ Os heróis receberam +${xpReward} XP pela vitória contra ${target.name}!`, 'gm');
          }

          if (s.enemies.length > 0 && s.enemies.every((e) => e.hp <= 0)) {
            if (!s.questProgress) s.questProgress = {};
            if (s.biome === 'forest' || s.location === 1) {
              s.questProgress.forest_cleared = true;
            } else if (s.biome === 'dungeon' || s.location === 2) {
              s.questProgress.malakor_defeated = true;
            }
            s.combat = false;
            s.actionUsed = false;
            log('⚔️ Todos os inimigos foram vencidos! Vitória do grupo!', 'gm');
          }
        } else if (a.healFormula) {
          const targetChar = s.characters.find((c) => c.id === (a.targetId || p.id));
          if (!targetChar) throw Error('Alvo inválido para cura.');
          const healRoll = roll(a.healFormula);
          const oldHp = targetChar.hp;
          targetChar.hp = Math.min(targetChar.maxHp, targetChar.hp + healRoll.total);
          const healed = targetChar.hp - oldHp;
          clientHealResult = {
            targetId: targetChar.id,
            targetName: targetChar.name,
            healAmount: healed,
            hpAfter: targetChar.hp,
            maxHp: targetChar.maxHp
          };
          s.actionUsed = true;
          log(`✨ ${p.name} conjurou ${spellName} em ${targetChar.name}: [${healRoll.results.join(', ')}] + ${healRoll.bonus} = recuperou ${healed} PV! (${targetChar.hp}/${targetChar.maxHp} PV)`, 'roll');
        } else {
          s.actionUsed = true;
          log(`✨ ${p.name} conjurou ${spellName}${spellLevel > 0 ? ' (Espaço de nível ' + spellLevel + ' gasto)' : ''}.`, 'roll');
        }

        if (a.endTurn && s.combat) {
          s.actionUsed = false;
          advance(s);
          executeEnemyAI(s);
        }
        break;
      }
      case 'useItem': {
        const p = own();
        const itemId = String(a.itemId || 'pocao-cura');
        const targetId = a.targetId || p.id;
        const targetChar = s.characters.find((x) => x.id === targetId);
        if (!targetChar) throw Error('Alvo inválido para o item.');

        if (s.combat) {
          const curTurnId = s.order[s.turn];
          if (curTurnId && curTurnId !== p.id) {
            throw Error(`Não é o turno de ${p.name}. Aguarde sua vez na ordem de iniciativa.`);
          }
          if (s.actionUsed) {
            throw Error('Você já utilizou sua Ação neste turno. Mova-se ou passe o turno.');
          }
          s.actionUsed = true;
        }

        let healRoll = { total: 0, results: [0], bonus: 0 };
        let itemName = 'Poção de Cura';
        if (itemId === 'pocao-cura-maior') {
          healRoll = roll('4d4+4');
          itemName = 'Poção de Cura Maior';
        } else {
          healRoll = roll('2d4+2');
        }

        const healAmount = healRoll.total;
        const oldHp = targetChar.hp;
        targetChar.hp = Math.min(targetChar.maxHp, targetChar.hp + healAmount);
        const actualHealed = targetChar.hp - oldHp;

        log(
          `${p.name} consumiu ${itemName} em ${targetChar.name}: [${healRoll.results.join(', ')}] + ${healRoll.bonus} = recuperou ${actualHealed} PV! (${targetChar.hp}/${targetChar.maxHp} PV)`,
          'roll'
        );

        clientHealResult = {
          targetId: targetChar.id,
          targetName: targetChar.name,
          healAmount: actualHealed,
          hpAfter: targetChar.hp,
          maxHp: targetChar.maxHp
        };

        if (a.endTurn && s.combat) {
          s.actionUsed = false;
          advance(s);
          executeEnemyAI(s);
        }
        break;
      }
      case 'enemy': {
        gm();
        executeEnemyAI(s);
        break;
      }
      case 'pass': {
        if (s.characters.some((x) => x.id === s.order[s.turn])) {
          own();
          if (c!.id !== s.order[s.turn]) throw Error('Não é seu turno.');
        } else gm();
        log(`Turno de ${c?.name || 'personagem'} concluído.`);
        s.actionUsed = false;
        advance(s);
        executeEnemyAI(s);
        break;
      }
      case 'endCombat': {
        gm();
        s.combat = false;
        s.order = [];
        s.actionUsed = false;
        log('O anfitrião encerrou o combate.');
        break;
      }
      case 'move': {
        const p = own();
        const x = Number(a.x);
        const y = Number(a.y);
        const maxBound = Number(a.maxBound || 7);
        if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x > maxBound || y < 0 || y > maxBound) {
          throw Error('Posição inválida.');
        }
        p.x = x;
        p.y = y;
        break;
      }
      case 'shortRest': {
        if (s.combat) throw Error('Não é possível descansar em combate.');
        let logMsg = 'Descanso Curto (1h): ';
        for (const p of s.characters) {
          if (p.hp > 0 && p.hp < p.maxHp) {
            const res = shortRestHeal(p);
            logMsg += `${p.name} ${res.rollText}. `;
          }
        }
        if (!logMsg.includes('recuperou')) {
          logMsg += 'Todos os heróis já estavam com vida máxima.';
        }
        log(logMsg, 'roll');
        break;
      }
      case 'rest': {
        gm();
        if (s.combat) throw Error('Não é possível descansar em combate.');
        for (const p of s.characters) {
          p.hp = p.maxHp;
          p.usedSlots = p.usedSlots.map(() => 0);
          p.deathFail = 0;
          p.deathSuccess = 0;
          p.exhaustion = Math.max(0, p.exhaustion - 1);
        }
        log('O grupo concluiu um descanso longo (8h). PV e espaços de magia restaurados.', 'roll');
        break;
      }
      case 'location': {
        if (s.combat) throw Error('Encerre o combate antes de viajar.');
        const n = Number(a.location);
        if (!locations[n]) throw Error('Local inválido.');
        s.location = n;
        s.biome = locations[n].biome;

        // Reposition heroes to safe entrance coordinates in the new biome
        for (let i = 0; i < s.characters.length; i++) {
          s.characters[i].x = 4 + (i % 2);
          s.characters[i].y = 6 + Math.floor(i / 2);
        }

        // Configure enemies appropriate for the destination biome
        if (s.biome === 'forest') {
          s.enemies = [
            {
              id: crypto.randomUUID(),
              name: 'Sentinela de Cinzas',
              hp: 9,
              maxHp: 9,
              ac: 11,
              attack: 2,
              damage: '1d4+1',
              initiative: d20().raw + 1,
              x: 7,
              y: 3
            },
            {
              id: crypto.randomUUID(),
              name: 'Cão do Vazio',
              hp: 7,
              maxHp: 7,
              ac: 10,
              attack: 2,
              damage: '1d4',
              initiative: d20().raw + 1,
              x: 6,
              y: 2
            }
          ];
        } else if (s.biome === 'dungeon') {
          s.enemies = [
            {
              id: crypto.randomUUID(),
              name: 'Guardião Espectral',
              hp: 18,
              maxHp: 18,
              ac: 13,
              attack: 3,
              damage: '1d6+2',
              initiative: d20().raw + 2,
              x: 5,
              y: 2
            },
            {
              id: crypto.randomUUID(),
              name: 'Escriba Sombrio',
              hp: 11,
              maxHp: 11,
              ac: 11,
              attack: 2,
              damage: '1d6',
              initiative: d20().raw + 1,
              x: 6,
              y: 4
            }
          ];
        } else {
          // Peaceful village hub
          s.enemies = [];
        }

        if (s.biome === 'dungeon' || s.location === 2) {
          if (!s.questProgress) s.questProgress = {};
          s.questProgress.dungeon_entered = true;
        }

        log(`O grupo viajou para ${locations[n].name}. ${locations[n].text}`, 'gm');
        break;
      }
      case 'advanceAct': {
        const nextAct = Number(a.act) as 1 | 2 | 3;
        if (![1, 2, 3].includes(nextAct)) throw Error('Ato inválido.');
        s.location = nextAct - 1;
        s.biome = locations[s.location].biome;
        s.combat = false;
        s.order = [];
        if (nextAct >= 2) {
          if (!s.questProgress) s.questProgress = {};
          s.questProgress.dungeon_entered = true;
        }
        if (nextAct === 2) {
          s.enemies = [
            {
              id: crypto.randomUUID(),
              name: 'Guardião Espectral',
              hp: 18,
              maxHp: 18,
              ac: 13,
              attack: 3,
              damage: '1d6+2',
              initiative: d20().raw + 2,
              x: 5,
              y: 2
            },
            {
              id: crypto.randomUUID(),
              name: 'Escriba Sombrio',
              hp: 11,
              maxHp: 11,
              ac: 11,
              attack: 2,
              damage: '1d6',
              initiative: d20().raw + 1,
              x: 6,
              y: 4
            }
          ];
          log('O grupo desce às Catacumbas das Três Inscrições (Ato II). O ar cheira a poeira e ozônio arcano.', 'gm');
        } else if (nextAct === 3) {
          s.enemies = [
            {
              id: crypto.randomUUID(),
              name: 'Malakor, o Lorde das Cinzas',
              hp: 30,
              maxHp: 30,
              ac: 15,
              attack: 5,
              damage: '1d10+3',
              initiative: d20().raw + 3,
              x: 4,
              y: 1
            },
            {
              id: crypto.randomUUID(),
              name: 'Sentinela Abissal',
              hp: 12,
              maxHp: 12,
              ac: 12,
              attack: 3,
              damage: '1d6+1',
              initiative: d20().raw + 1,
              x: 2,
              y: 3
            }
          ];
          log('O grupo alcança o Santuário do Vazio (Ato III). Malakor ergue-se do trono de pedra negra!', 'gm');
        } else {
          s.enemies = [
            {
              id: crypto.randomUUID(),
              name: 'Sentinela de Cinzas',
              hp: 9,
              maxHp: 9,
              ac: 11,
              attack: 2,
              damage: '1d4+1',
              initiative: d20().raw + 1,
              x: 5,
              y: 2
            }
          ];
          log('O grupo retorna ao claustro da superfície (Ato I).', 'gm');
        }
        break;
      }
      case 'notes':
        gm();
        s.notes = String(a.notes).slice(0, 10000);
        break;
      case 'npc':
        gm();
        if (s.npcs.length >= 50) throw Error('Limite de NPCs atingido.');
        s.npcs.push({
          id: crypto.randomUUID(),
          name: String(a.name).slice(0, 60),
          role: String(a.role).slice(0, 100),
          description: String(a.description).slice(0, 3000)
        });
        break;
      case 'message': {
        log(String(a.text).slice(0, 3000), 'player');
        break;
      }
      case 'questStep': {
        const stepKey = String(a.step || '');
        if (!s.questProgress) s.questProgress = {};
        if (stepKey) {
          s.questProgress[stepKey] = true;
        }
        if (a.logText) {
          log(String(a.logText), 'system');
        }
        break;
      }
      case 'equip': {
        const p = own();
        const nextEquipment = { ...(p.equipment || {}), ...(a.equipment || {}) };
        p.equipment = nextEquipment;
        const recalculated = calculateEquippedStats(p);
        Object.assign(p, recalculated);
        log(`${p.name} reorganizou seu equipamento de combate.`, 'player');
        break;
      }
      case 'levelup': {
        const p = own();
        if (!canLevelUp(p)) {
          throw Error(`XP insuficiente para subir de nível (${p.xp || 0}/${getXpForNextLevel(p.level)} XP necessários).`);
        }
        if (p.level >= 20) throw Error('Este personagem já atingiu o nível máximo (20).');

        const oldLevel = p.level;
        const newLevel = oldLevel + 1;
        p.level = newLevel;

        // Dado de vida da classe (D&D 5e oficial)
        const classTuple = classes.find((cl) => cl[0] === p.className);
        const hitDieSides = classTuple ? classTuple[1] : 8;
        const conMod = mod(p.stats[2]);
        // Incremento de PV pela média ou valor fornecido
        const hpGain = Math.max(1, Math.floor(hitDieSides / 2) + 1 + conMod);
        p.maxHp += hpGain;
        p.hp = Math.min(p.maxHp, p.hp + hpGain);

        // Atualização de espaços de magia para conjuradores
        p.slots = getSpellSlotsForClass(p.className, newLevel);
        if (!p.usedSlots) p.usedSlots = [0, 0, 0, 0, 0, 0, 0, 0, 0];

        // ASI: Aumento no Valor de Atributo (distribuição de 2 pontos nos níveis 4, 8, etc.)
        if (isAsiLevel(p.className, newLevel) && Array.isArray(a.statIncreases)) {
          for (const statIdx of a.statIncreases) {
            const idx = Number(statIdx);
            if (idx >= 0 && idx <= 5 && p.stats[idx] < 20) {
              p.stats[idx] += 1;
            }
          }
        }

        // Recalcular bônus de proficiência, ataque, CA com os novos atributos e nível
        const recalculated = calculateEquippedStats(p);
        Object.assign(p, recalculated);

        log(`🌟 LEVEL UP! ${p.name} alcançou o NÍVEL ${newLevel}! (+${hpGain} PV Máx). Parabéns!`, 'gm');
        break;
      }
      case 'respawn': {
        const hero = own();
        hero.hp = hero.maxHp;
        hero.conditions = [];
        hero.deathSuccess = 0;
        hero.deathFail = 0;
        hero.x = 4;
        hero.y = 6;
        s.combat = false;
        s.order = [];
        s.actionUsed = false;
        s.location = 0;
        s.biome = 'village';
        s.enemies = [];
        log(`🕊️ ${hero.name} recuperou a consciência no santuário da Vila do Rio Verde, curado pelas águas e orações.`, 'gm');
        break;
      }
      default:
        throw Error('Ação desconhecida.');
    }

    s.logs = s.logs.slice(-200);
    const result = await db
      .prepare('UPDATE rooms SET state=?,version=version+1 WHERE id=? AND version=?')
      .bind(JSON.stringify(s), r.id, r.version)
      .run();

    if (!result.meta.changes) {
      return NextResponse.json({ error: 'Outra ação chegou primeiro. Atualize e tente novamente.' }, { status: 409 });
    }

    const updatedRoom: Room = {
      ...r,
      state: JSON.stringify(s),
      version: r.version + 1
    };

    return NextResponse.json({
      ok: true,
      room: { ...updatedRoom, state: s },
      attackResult: clientAttackResult,
      healResult: clientHealResult
    });
  } catch (e) {
    console.error('[API Error]:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Não foi possível salvar. Seu conteúdo foi preservado.' },
      { status: 400 }
    );
  }
}

function advance(s: State) {
  if (s.enemies.every((x) => x.hp <= 0)) {
    s.combat = false;
    s.order = [];
    s.actionUsed = false;
    s.logs.push(entry('Vitória! Todos os inimigos foram derrotados na masmorra.', 'gm'));
    return;
  }
  if (s.characters.every((x) => x.hp <= 0)) {
    s.combat = false;
    s.actionUsed = false;
    s.logs.push(entry('O grupo caiu inconsciente. A aventura precisa de socorro ou descanso!', 'gm'));
    return;
  }
  do {
    s.turn = (s.turn + 1) % s.order.length;
    if (s.turn === 0) s.round++;
  } while ([...s.characters, ...s.enemies].find((x) => x.id === s.order[s.turn])!.hp <= 0);

  // Ready action for newly active entity
  s.actionUsed = false;
}

function executeEnemyAI(s: State) {
  let safety = 0;
  const attackedTargets = new Set<string>(); // Track who was already attacked this round for target distribution
  while (s.combat && safety < 10) {
    safety++;
    const curId = s.order[s.turn];
    const enemy = s.enemies.find((e) => e.id === curId && e.hp > 0);
    if (!enemy) break;
    const activeHeroes = s.characters.filter((c) => c.hp > 0);
    if (activeHeroes.length === 0) break;

    // Smart target selection: distribute attacks among different heroes
    // Prefer heroes NOT already attacked this round, unless only 1 hero remains
    const notYetAttacked = activeHeroes.filter((h) => !attackedTargets.has(h.id));
    const candidates = notYetAttacked.length > 0 ? notYetAttacked : activeHeroes;
    const target = candidates.sort((a, b) => {
      const distA = Math.abs(a.x - enemy.x) + Math.abs(a.y - enemy.y);
      const distB = Math.abs(b.x - enemy.x) + Math.abs(b.y - enemy.y);
      return distA - distB;
    })[0];
    attackedTargets.add(target.id);

    const dist = Math.max(Math.abs(target.x - enemy.x), Math.abs(target.y - enemy.y));
    if (dist > 1) {
      const nextX = enemy.x + Math.sign(target.x - enemy.x);
      const nextY = enemy.y + Math.sign(target.y - enemy.y);
      if (nextX >= 0 && nextX <= 15 && nextY >= 0 && nextY <= 15) {
        enemy.x = nextX;
        enemy.y = nextY;
      }
    }
    const attackLog = attack(enemy, target);
    s.logs.push(entry(attackLog, 'roll'));
    advance(s);
  }
  if (s.combat) {
    s.actionUsed = false;
  }
}
