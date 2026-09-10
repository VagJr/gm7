import assert from 'node:assert/strict';
import {mod,prof,roll,d20,newCharacter,validateCharacter,attack} from '../lib/game-engine.ts';
assert.equal(mod(9),-1);assert.equal(mod(20),5);assert.equal(prof(1),2);assert.equal(prof(20),6);
for(let i=0;i<200;i++){const d=d20('advantage');assert.equal(d.raw,Math.max(...d.dice));const r=roll('2d6+3');assert(r.total>=5&&r.total<=15);}
assert.throws(()=>roll('0d20'));assert.throws(()=>roll('100d20'));assert.throws(()=>roll('oops'));
const c=newCharacter();c.name='Teste';assert.equal(validateCharacter(c).name,'Teste');assert.throws(()=>validateCharacter({...c,level:21}));
const target={name:'Alvo',ac:1,hp:30};for(let i=0;i<100;i++)attack({name:'Teste',attack:5,damage:'1d8+3'},target);assert.equal(target.hp,0);
assert.equal(roll('2d6+3',true).results.length,4);
console.log('Engine: modifiers, proficiency, dice bounds, advantage, critical dice, validation and HP floor passed.');
