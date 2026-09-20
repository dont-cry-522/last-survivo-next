const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function run(code){const c=vm.createContext({Math});for(const f of ['Config','Utils','ForestMap','WoodlandScene','RuinEncounter','Player'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../classes/'+f+'.js'),'utf8'),c);vm.runInContext(code,c);return c.result;}
test('map enemy weights respect original unlock times',()=>{
 const r=run(`result=[];for(const map of ['forest','snow','ash']){ForestMap.select(map);result.push(ForestMap.enemyTypes(0).join(','));}ForestMap.select('snow');result.push(ForestMap.enemyTypes(100).filter(t=>t==='fast').length);ForestMap.select('ash');result.push(ForestMap.enemyTypes(100).filter(t=>t==='exploder').length);`);
 assert.deepEqual(Array.from(r),['normal','normal','normal',3,2]);
});
test('blizzard has warning, only slows snow, and returns to normal after six seconds',()=>{
 const r=run(`ForestMap.select('snow');result=[29,30,31.9,32,37.9,38].map(t=>WoodlandScene.surfaceAt(420,280,t).speed);result.push(WoodlandScene.surfaceAt(1250,330,33).speed);result.push(WoodlandScene.surfaceAt(0,0,33));`);
 assert.deepEqual(Array.from(r),[.65,.65,.65,.5,.5,.65,1.12,null]);
});
test('geothermal warning is harmless, one eruption hits both sides once, outside stays safe',()=>{
 const r=run(`ForestMap.select('ash');const e=ForestMap.eventAt(45),actor=(x)=>({x,y:e.y,size:15,hp:100,active:true,takeDamage(d){this.hp-=d}});const g={state:'playing',survivalTime:45,player:actor(e.x),enemyManager:{pool:[actor(e.x),actor(e.x+200)]},boss:actor(e.x),_announce(){},audio:{skillCue(){}}};ForestMap.updateEnvironment(g);const warning=g.player.hp;g.survivalTime=46.7;ForestMap.updateEnvironment(g);ForestMap.updateEnvironment(g);result={warning,hp:g.player.hp,enemies:g.enemyManager.pool.map(e=>e.hp),boss:g.boss.hp};`);
 assert.equal(r.warning,100);assert.equal(r.hp,82);assert.deepEqual(Array.from(r.enemies),[64,100]);assert.equal(r.boss,64);
});
test('paused and dead-player games cannot process an eruption',()=>{
 const r=run(`ForestMap.select('ash');let hits=0;const e=ForestMap.eventAt(46.7),g={state:'paused',survivalTime:46.7,player:{x:e.x,y:e.y,hp:100,size:15,takeDamage(){hits++}},enemyManager:{pool:[]},boss:{active:false},audio:{skillCue(){}},_announce(){}};ForestMap.updateEnvironment(g);g.state='playing';g.player.hp=0;ForestMap.updateEnvironment(g);result=hits;`);assert.equal(r,0);
});
test('eruption respects actual player shield and invulnerability',()=>{
 const r=run(`ForestMap.select('ash');const p=new Player(420,280);p.shield=10;const before=p.hp,g={state:'playing',survivalTime:46.7,player:p,enemyManager:{pool:[]},boss:{active:false},audio:{skillCue(){}},_announce(){}};ForestMap.updateEnvironment(g);const hit=p.hp;g.mapEventHit=-1;ForestMap.updateEnvironment(g);result={lost:before-hit,shield:p.shield,protected:p.hp===hit};`);assert.equal(r.lost,8);assert.equal(r.shield,0);assert(r.protected);
});
test('each map uses its own three ruin guards and clear spawn positions',()=>{
 const r=run(`result=[];for(const map of ['forest','snow','ash']){ForestMap.select(map);const types=[],ruins=new RuinEncounter(),g={state:'playing',player:{x:-1500,y:0,hp:100},enemyManager:{spawn(type,x,y){types.push(type);if(!ForestMap.clear(x,y,30))throw Error('blocked guard');return {x,y,hp:100,active:true};}},_announce(){}};ruins.update(g);result.push(types.join(','));}`);assert.deepEqual(Array.from(r),['elite,tank,tank','elite,fast,fast','elite,tank,exploder']);
});
