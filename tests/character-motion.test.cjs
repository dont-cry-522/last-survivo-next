const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function world() {
    const c = vm.createContext({ window: {}, console, Math });
    for (const file of ['Config', 'Utils', 'ObjectPool', 'EnemyConfig', 'Player', 'Enemy']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, '../classes', file + '.js'), 'utf8'), c);
    }
    return c;
}

test('running left does not rotate the shot away from a target on the right', () => {
    const c = world();
    vm.runInContext(`
        const p = new Player(0, 0);
        p.keys.a = true;
        const particles = { spawnAfterimage() {}, spawnTrail() {} };
        const shots = [];
        p.update(1 / 60, [{ active: true, x: 100, y: 0 }], {fire(x,y,angle) { shots.push(angle); return {}; }}, particles);
        result = { moving: p.x < 0, aim: p.aimAngle, shot: shots[0], recoil: p.recoilTimer };
    `, c);
    assert.equal(c.result.moving, true);
    assert.equal(c.result.aim, c.result.shot);
    assert.ok(c.result.recoil > 0);
});

test('an idle adventurer emits no engine exhaust', () => {
    const c = world();
    vm.runInContext(`
        const p = new Player(0,0); let trails = 0;
        p.update(1 / 60, [], {fire(){}}, {spawnTrail(){trails++}, spawnAfterimage(){}});
        result = trails;
    `, c);
    assert.equal(c.result, 0);
});

test('death poses survive pool reuse, expire, and clear on restart', () => {
    const c = world();
    vm.runInContext(`
        const manager = new EnemyManager(1);
        const e = manager.spawn('normal', 40, 50);
        manager._handleDeath(e, {addKill(){}, x:999, y:999, size:20}, {spawnExplosion(){}}, {spawnOrb(){}}, null);
        const corpse = manager.deathPoses[0];
        manager.spawn('tank', 200, 300);
        result = {x: corpse.x, type: corpse.type, same: corpse === e};
        manager.updateDeathPoses(2);
        result.remaining = manager.deathPoses.length;
        manager.deathPoses.push({life:1}); manager.clear();
        result.cleared = manager.deathPoses.length;
    `, c);
    assert.equal(c.result.x, 40);
    assert.equal(c.result.type, 'normal');
    assert.equal(c.result.same, false);
    assert.equal(c.result.remaining, 0);
    assert.equal(c.result.cleared, 0);
});
