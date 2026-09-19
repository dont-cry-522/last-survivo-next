const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function run(code){
 const c=vm.createContext({Math:Object.create(Math),console,performance:{now:()=>1000},setTimeout:()=>0});c.window=c;
 const files=['classes/Config','classes/Utils','classes/ObjectPool','classes/EnemyConfig','classes/StatusSystem','classes/Enemy','classes/Bullet','classes/Player','classes/ForestArt','classes/SkillTypes',...['BulletStorm','Inferno','Frost','Storm','Bastion','Shadow','Reaper','Summoner'].map(n=>'skills/'+n),'classes/SkillConfig','classes/SkillInstance','classes/SkillVisuals','classes/EffectDispatcher','classes/SkillManager'];
 for(const file of files){const f=path.join(__dirname,'../',file+'.js');if(fs.existsSync(f))vm.runInContext(fs.readFileSync(f,'utf8'),c);}
 vm.runInContext(`const sm=new SkillManager(),p=new Player(0,0);p.setWeapon('rifle');Enemy._statusSystem=new StatusSystem();const manager=new EnemyManager(6);
 const enemies=[manager.spawn('tank',80,0),manager.spawn('tank',130,0),manager.spawn('tank',180,0)];
 const ctx={player:p,enemies,bulletManager:new BulletManager(100,100),particleManager:{spawnExplosion(){},spawnHit(){},spawnTrail(){}}};
 function own(id){return sm.acquire(id,{player:p,survivalTime:999}).instance;}
 `+code,c);return c.result;
}
test('lightning draws each actual source-target hop instead of unrelated sparks',()=>{
 const r=run(`own('chain_lightning');sm.trigger(SkillEffectType.ON_HIT,{...ctx,enemy:enemies[0],bullet:{damage:12}});result=sm.visuals.events.filter(e=>e.kind==='lightning').map(e=>[e.x,e.x2]);`);
 assert.deepEqual(JSON.parse(JSON.stringify(r)),[[80,130],[130,180]]);
});
test('ice nova visual occurs only when the kill threshold is reached',()=>{
 const r=run(`own('ice_nova');sm.visuals.clear();sm.trigger(SkillEffectType.ON_KILL,{...ctx,count:7});const before=sm.visuals.events.length;sm.trigger(SkillEffectType.ON_KILL,{...ctx,count:1});result={before,after:sm.visuals.events.filter(e=>e.kind==='ice').length};`);
 assert.equal(r.before,0);assert.equal(r.after,1);
});
test('visual queue bounds bursts, snapshots endpoints and expires on game time',()=>{
 const r=run(`for(let i=0;i<300;i++)sm.visuals.emit('lightning',i*50,0,{x2:i*50+30,y2:10});const count=sm.visuals.events.length;sm.visuals.update(3);const after=sm.visuals.events.length;sm.visuals.emit('ice',0,0);sm.reset();result={count,after,reset:sm.visuals.events.length};`);
 assert(r.count<=96);assert(r.count>0);assert.equal(r.after,0);assert.equal(r.reset,0);
});
test('ice armor auxiliary timer activates only when owned',()=>{
 const r=run(`own('ice_armor');sm.update(.1,ctx);result=sm.runtimeState._iceArmor.active;`);assert.equal(r,true);
});

test('continuous burn damages without holding the target in a white impact flash',()=>{
 const r=run(`sm.update(.01,ctx);enemies[0].burnStacks=2;enemies[0].burnDmgPerStack=3;enemies[0].burnTimer=2;sm.update(.1,ctx);result={hp:enemies[0].hp,flash:enemies[0].hitFlash};`);
 assert(r.hp<120);assert.equal(r.flash,0);
});
test('drawing cannot consume gameplay randomness or alter timers',()=>{
 const r=run(`own('rotary_turret');sm.update(.1,ctx);sm.visuals.emit('lightning',0,0,{x2:100,y2:100});
 const calls=[];const canvas={width:1280,height:720};const draw=new Proxy({canvas},{get(o,k){if(k in o)return o[k];return (...args)=>{calls.push(k)}},set(o,k,v){o[k]=v;return true}});
 const snapshot=JSON.stringify(sm.runtimeState);const times=JSON.stringify(sm.visuals.events);Math.random=()=>{throw Error('drawing consumed randomness')};
 sm.drawSkillVisuals(draw,0,0,p);result={same:snapshot===JSON.stringify(sm.runtimeState)&&times===JSON.stringify(sm.visuals.events),drawn:calls.length};`);
 assert(r.same);assert(r.drawn>10);
});

test('all 64 skills and their maximum tiers render and process isolated activation scenarios',()=>{
 const r=run(`let tested=0;const draw=new Proxy({canvas:{width:1280,height:720},globalAlpha:1},{get(o,k){if(k in o)return o[k];return (...args)=>{if(args.some(a=>typeof a==='number'&&!Number.isFinite(a)))throw Error('Invalid '+k)}},set(o,k,v){o[k]=v;return true}});
 for(const def of SkillConfig.POOL){
   sm.reset();p.reset(0,0);p.setWeapon('rifle');const instance=own(def.id);
   const old=instance.getCurrentEffect().params;instance.currentTier=def.tiers.length;sm._updateRegistry(instance);def.apply(p,sm,instance.getCurrentEffect().params,old);
   const hit={...ctx,enemy:enemies[0],bullet:{damage:12,vx:8,vy:0,speed:8},amount:80,count:8};
   sm.update(.1,ctx);sm.trigger(SkillEffectType.ON_HIT,hit);sm.trigger(SkillEffectType.ON_CRIT,hit);sm.trigger(SkillEffectType.ON_DASH,hit);sm.trigger(SkillEffectType.ON_DAMAGED,hit);sm.trigger(SkillEffectType.ON_KILL,hit);
   sm.update(.1,ctx);sm.drawSkillVisuals(draw,0,0,p);tested++;
 }result=tested;`);assert.equal(r,64);
});
