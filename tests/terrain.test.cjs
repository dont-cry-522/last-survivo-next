const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function run(code){
    const c=vm.createContext({window:{},Math,console});
    for(const name of ['Config','Utils','ObjectPool','StatusSystem','EnemyConfig','Enemy','Player','Boss','ForestMap','WoodlandScene'])
        vm.runInContext(fs.readFileSync(path.join(__dirname,'../classes',name+'.js'),'utf8'),c);
    vm.runInContext(`const particles={spawnTrail(){},spawnAfterimage(){}};
        Enemy._statusSystem=new StatusSystem();
        const hero=new Player(420,640);hero.keys.d=true;
        const target={x:2000,y:640,size:20,takeDamage(){}};
        const enemy=new Enemy();enemy.init('normal',420,640);
        const step=(time,dt=1/60)=>hero.update(dt,[],null,particles,time);
        `+code,c);
    return c.result;
}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('ground slows actual player and enemy travel equally in three spatial regions',()=>{
    for(const [x,y,mul] of [[420,640,.75],[1350,300,.8],[-1400,300,.85]]){
        const r=run(`hero.x=enemy.x=${x};hero.y=enemy.y=target.y=${y};const px=hero.x,ex=enemy.x;step(0);enemy.update(1/60,target,0);
            result={p:(hero.x-px)/hero.speed,e:(enemy.x-ex)/enemy.speed};`);
        near(r.p,mul);near(r.e,mul);
    }
});
test('leaving ground restores movement without overwriting speed upgrades or attack rate',()=>{
    const r=run(`hero.speed*=1.5;const speed=hero.speed,rate=hero.attackSpeed;
        step(0);hero.x=0;hero.y=0;step(0);
        result={distance:hero.x,speed,after:hero.speed,rate,afterRate:hero.attackSpeed};`);
    near(r.distance,r.speed);near(r.after,r.speed);near(r.afterRate,r.rate);
});
test('terrain no longer repeats at negative world coordinates and leaves a dry route',()=>{
    const r=run(`hero.x=-604;hero.y=-384;step(0);const wet=hero.x+604;
        hero.x=420;hero.y=720;step(0);result={wet,dry:hero.x-420,speed:hero.speed};`);
    near(r.wet,r.speed);near(r.dry,r.speed);
});
test('terrain stays fixed when time passes',()=>{
    const r=run(`result=[];for(const time of [89.99,90,94,98,180,184,188]){
        hero.x=420;hero.y=640;step(time);result.push((hero.x-420)/hero.speed);}`);
    [.75,.75,.75,.75,.75,.75,.75].forEach((want,i)=>near(r[i],want));
});
test('dash and committed enemy leap preserve their distance through mud',()=>{
    const r=run(`hero.dashCooldown=0;hero.tryDash();step(0);
        enemy.init('fast',420,640);target.x=550;enemy.update(1/60,target,0);
        for(let i=0;i<60;i++)enemy.update(1/60,target,0);
        result={dash:hero.x-420,wantDash:hero.speed*hero.dashSpeedMultiplier,
            leap:enemy.x-420,state:enemy.combatState};`);
    near(r.dash,r.wantDash);near(r.leap,280);assert.equal(r.state,'recover');
});
test('terrain combines with frost while freezing still stops enemies',()=>{
    const r=run(`Enemy._statusSystem.applyFrost(enemy,.5,0);enemy.update(1/60,target,0);
        const moved=enemy.x-420;const slow=Enemy._statusSystem.getSpeedMultiplier(enemy);
        Enemy._statusSystem.applyFrost(enemy,0,2);const x=enemy.x;enemy.update(1/60,target,0);
        result={moved,want:enemy.speed*slow*.75,frozenMove:enemy.x-x};`);
    near(r.moved,r.want);near(r.frozenMove,0);
});
test('boss pursuit slows on mud but its charge remains intact',()=>{
    const r=run(`const b=new Boss();b.init(420,640);b.spawnWarning=false;
        b.update(1/60,target,particles,{survivalTime:0});const walk=b.x-420;
        b.isCharging=true;b.chargeCurrentDuration=1;b.chargeDirection={x:1,y:0};const x=b.x;
        b.update(1/60,target,particles,{survivalTime:0});
        result={walk,speed:b.speed,charge:b.x-x,chargeSpeed:b.chargeSpeed};`);
    near(r.walk,r.speed*.75);near(r.charge,r.chargeSpeed);
});
