const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function setup(code) {
    const c = vm.createContext({window:{},Math,console});
    for (const name of ['Config','Utils','ObjectPool','EnemyConfig','StatusSystem','Enemy','Player']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname,'../classes',name+'.js'),'utf8'),c);
    }
    vm.runInContext(`
        Enemy._statusSystem = new StatusSystem();
        const m = new EnemyManager(1);
        let hits = 0;
        const p = {x:50,y:0,size:20,takeDamage(){hits++},addKill(){}};
        const particles = {spawnExplosion(){}};
        const exp = {spawnOrb(){}};
        function tick(dt=1/60) {m.update(dt,p,particles,exp,null)}
        function advance(seconds) {for(let t=0;t<seconds-1e-8;t+=1/120)tick(1/120)}
    `+code,c);
    return c.result;
}
test('mushroom contact is harmless during windup, then one hit per attack',()=>{
    const r=setup(`const e=m.spawn('normal',0,0);p.x=10;tick();const before=hits;const state=e.combatState;advance(.95);result={before,state,hits};`);
    assert.equal(r.before,0);assert.equal(r.state,'windup');assert.equal(r.hits,1);
});
test('fast attack locks direction and has recovery after missing',()=>{
    const r=setup(`const e=m.spawn('fast',0,0);p.x=200;tick();p.y=220;advance(.72);const y=e.y;advance(.35);result={y,state:e.combatState,hits};`);
    assert.equal(r.y,0);assert.equal(r.state,'recover');assert.equal(r.hits,0);
});
test('telegraphed slam does not follow the escaping player',()=>{
    const r=setup(`const e=m.spawn('tank',0,0);tick();const x=e.attackX,y=e.attackY;p.x=500;p.y=400;advance(1.1);result={hits,x,y,afterX:e.attackX,afterY:e.attackY,state:e.combatState};`);
    assert.equal(r.hits,0);assert.equal(r.x,r.afterX);assert.equal(r.y,r.afterY);assert.equal(r.state,'recover');
});
test('slam hits once and never repeatedly during recovery',()=>{
    const r=setup(`const e=m.spawn('tank',0,0);tick();p.x=e.attackX;p.y=e.attackY;advance(1.7);result=hits;`);
    assert.equal(r,1);
});
test('dead enemies cannot complete an attack',()=>{
    const r=setup(`const e=m.spawn('tank',0,0);tick();advance(.8);e.hp=0;tick(.1);result={hits,active:e.active,corpses:m.deathPoses.length};`);
    assert.equal(r.hits,0);assert.equal(r.active,false);assert.equal(r.corpses,1);
});
test('freezing suspends the attack clock and damage',()=>{
    const r=setup(`const e=m.spawn('tank',0,0);tick();const time=e.combatTimer;Enemy._statusSystem.applyFrost(e,0,2);advance(1);result={hits,time,after:e.combatTimer};`);
    assert.equal(r.hits,0);assert.ok(Number.isFinite(r.time));assert.equal(r.time,r.after);
});
test('pooled enemies reset combat state, target and status effects',()=>{
    const r=setup(`let e=m.spawn('tank',0,0);tick();Enemy._statusSystem.applyFrost(e,0,2);e.die();e=m.spawn('normal',0,0);result={state:e.combatState,hit:e.attackHasHit,frozen:e.frozen};`);
    assert.equal(r.state,'approach');assert.equal(r.hit,false);assert.equal(r.frozen,false);
});
test('a fast charge cannot tunnel through the player at 30 fps',()=>{
    const r=setup(`const e=m.spawn('fast',0,0);p.x=130;tick();for(let i=0;i<32;i++)tick(1/30);result=hits;`);
    assert.equal(r,1);
});
test('dash invulnerability protects health and shields',()=>{
    const r=setup(`const hero=new Player(0,0);hero.shield=20;hero.dashCooldown=0;hero.tryDash();hero.takeDamage(60);result={hp:hero.hp,shield:hero.shield};`);
    assert.equal(r.hp,120);assert.equal(r.shield,20);
});
test('a normal hit grants a short grace period against overlapping monsters',()=>{
    const r=setup(`const hero=new Player(0,0);hero.takeDamage(10);hero.takeDamage(10);result=hero.hp;`);
    assert.equal(r,110);
});

test('charge distance and phase agree at 30, 60 and 120 fps',()=>{
    for (const fps of [30,60,120]) {
        const r=setup(`const e=m.spawn('fast',0,0);p.x=200;tick();p.y=500;for(let i=0;i<${fps};i++)tick(1/${fps});result={x:e.x,y:e.y,state:e.combatState};`);
        assert.ok(Math.abs(r.x-280)<1e-6);assert.equal(r.y,0);assert.equal(r.state,'recover');
    }
});

test('impact feedback is bounded and cleared for a new run',()=>{
    const r=setup(`for(let i=0;i<100;i++)m.addImpact(i,0,'crit');const count=m.impactMarks.length;m.updateDeathPoses(1);const expired=m.impactMarks.length;m.addImpact(0,0,'slam');m.clear();result={count,expired,cleared:m.impactMarks.length};`);
    assert.equal(r.count,64);assert.equal(r.expired,0);assert.equal(r.cleared,0);
});
