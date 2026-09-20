const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function run(code){const c=vm.createContext({Math});vm.runInContext(fs.readFileSync(path.join(__dirname,'../classes/WeaponPaths.js'),'utf8')+';'+code,c);return c.result;}
test('six paths apply tradeoffs only once and reject a path for the wrong weapon',()=>{
 const r=run(`result=[];for(const [weapon,ids]of [['rifle',['rapid','heavy']],['shotgun',['wide','focus']],['fireball',['ground','split']]])for(const id of ids){const p={weaponType:weapon,attackSpeed:1,bulletDamage:10,bulletCount:5,pierce:0,attackRange:500};const first=WeaponPaths.choose(p,id);const again=WeaponPaths.choose(p,id);result.push({first,again,...p});}const p={weaponType:'rifle'};result.push(WeaponPaths.choose(p,'ground'));`);
 assert(r.slice(0,6).every(p=>p.first&&!p.again));assert.equal(r[6],false);assert(r[0].attackSpeed>1&&r[0].bulletDamage<10);assert(r[1].attackSpeed<1&&r[1].bulletDamage>10);assert(r[2].bulletCount>5&&r[2].bulletDamage<10);assert(r[3].attackSpeed<1);
});
test('split children do not recursively split and ground fields have a bounded count',()=>{
 const r=run(`let shots=0;const g={weaponFields:[],bulletManager:{fire(){shots++;return {}}}};const b={weaponPath:'split',x:0,y:0,vx:1,vy:0,damage:20,speed:5};WeaponPaths.impact(g,b);WeaponPaths.impact(g,b);WeaponPaths.impact(g,{...b,weaponPath:'split-child',branchDone:false});for(let i=0;i<40;i++)WeaponPaths.impact(g,{weaponPath:'ground',x:i,y:0,damage:10});result={shots,fields:g.weaponFields.length};`);assert.equal(r.shots,4);assert.equal(r.fields,12);
});
test('ground fire burns only nearby enemies, preserves stronger burns and expires',()=>{
 const c=vm.createContext({Math});
 for(const file of ['StatusSystem','EffectDispatcher','WeaponPaths'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../classes/'+file+'.js'),'utf8'),c);
 vm.runInContext(`
 const SkillEffectType={PERIODIC:'periodic',ON_DAMAGED:'damaged',SUMMON:'summon'};
 const status=new StatusSystem(),sm={runtimeState:{},effectRegistry:{},getSkill(){},_findOwned(){}};
 const dispatcher=new EffectDispatcher(sm);sm.registerHandler=(...args)=>dispatcher.registerHandler(...args);dispatcher.ensureSystemEffects();
 const enemies=[0,200].map(x=>({x,y:0,size:10,hp:100,active:true,takeDamage(d){this.hp-=d},get burnStacks(){return status.burnStacks(this)},get burnDmgPerStack(){return status.burnDmgPerStack(this)}}));
 const g={weaponFields:[],enemyManager:{pool:enemies},statusSystem:status,boss:{active:false}};
 WeaponPaths.impact(g,{weaponPath:'ground',x:0,y:0,damage:10});
 WeaponPaths.updateFields(g,.1);dispatcher.update(.1,{enemies,player:{shield:0}});
 const hit=enemies[0].hp;status.applyBurn(enemies[0],1,20,2);WeaponPaths.updateFields(g,.3);
 const preserved=status.getBurnDPS(enemies[0]);
 for(let i=0;i<31;i++)WeaponPaths.updateFields(g,.1);
 status.update(enemies[0],3);
 result={hit,outside:enemies[1].hp,preserved,fields:g.weaponFields.length,burn:status.getBurnDPS(enemies[0])};`,c);
 assert(c.result.hit<100);assert.equal(c.result.outside,100);assert.equal(c.result.preserved,20);assert.equal(c.result.fields,0);assert.equal(c.result.burn,0);
});
