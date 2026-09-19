const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function run(code){
 const c=vm.createContext({window:{},Math,console});
 for(const name of ['Config','Utils','ObjectPool','StatusSystem','EnemyConfig','Enemy','Bullet','Player','Game'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../classes',name+'.js'),'utf8'),c);
 vm.runInContext(`Enemy._statusSystem=new StatusSystem();const p=new Player(0,0);const m=new BulletManager(100,100);const target={x:150,y:0,active:true,hp:100,maxHp:100};const particles={spawnTrail(){},spawnHit(){},spawnExplosion(){}};`+code,c);return c.result;
}
test('three weapons fire distinct volleys and preserve straight shotgun spread',()=>{
 const r=run(`result=[];for(const kind of ['rifle','shotgun','fireball']){m.clear();p.setWeapon(kind);p.autoAttack(.01,[target],m,particles);const shots=m.pool.filter(b=>b.active);result.push({count:shots.length,kind:shots[0].weaponType,interval:p.attackInterval,spread:shots.every(b=>!b.target)});}`);
 assert.deepEqual(Array.from(r,x=>x.count),[1,5,1]);assert.equal(r[1].spread,true);assert(r[0].interval<r[1].interval);assert.equal(r[2].kind,'fireball');
});
test('reused bullets shed weapon fields and short range',()=>{
 const r=run(`p.setWeapon('shotgun');p.autoAttack(.01,[target],m,particles);const b=m.pool.find(b=>b.active);b.init(0,0,0,12,8,0);result={kind:b.weaponType,size:b.size,life:b.life};`);
 assert.equal(r.kind,'rifle');assert.equal(r.size,5);assert.equal(r.life,3);
});
test('weapon selection does not compound damage or retain the old firing cooldown',()=>{
 const r=run(`p.setWeapon('fireball');p.attackTimer=99;p.setWeapon('shotgun');const damage=p.bulletDamage;p.setWeapon('shotgun');result={damage,after:p.bulletDamage,timer:p.attackTimer};`);
 assert.equal(r.damage,r.after);assert.equal(r.timer,0);
});
test('fireball splash hits nearby enemies once, excludes primary direct damage and burns',()=>{
 const r=run(`const manager=new EnemyManager(3);const a=manager.spawn('tank',0,0),b=manager.spawn('tank',40,0),far=manager.spawn('tank',200,0);const g=Object.create(Game.prototype);g.enemyManager=manager;g.boss={active:false};g.statusSystem=Enemy._statusSystem;g.particleManager=particles;g.uiManager={addDamageNumber(){}};g.audio={weaponImpact(){}};const bullet=new Bullet();bullet.init(0,0,0,30,6,0);bullet.weaponType='fireball';g.applyWeaponImpact(bullet,a);g.applyWeaponImpact(bullet,a);result={a:a.hp,b:b.hp,far:far.hp,burn:a.burnStacks};`);
 assert.equal(r.a,120);assert.equal(r.b,102);assert.equal(r.far,120);assert.equal(r.burn,1);
});

test('fast pellets cannot pass through a small enemy between frames',()=>{
 const r=run(`const b=new Bullet();b.init(0,0,0,10,20,0);b.size=3;b.update(1/30,[],particles);result=b.touches({x:20,y:0,size:5});`);
 assert.equal(r,true);
});
