const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function run(code){const c=vm.createContext({Math});for(const f of ['ForestMap','RuinEncounter'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../classes',f+'.js'),'utf8'),c);vm.runInContext(code,c);return c.result;}
test('tree intersection clips the first obstruction and leaves an unobstructed lane alone',()=>{
 const r=run(`const t=ForestMap.trees.find(t=>Math.abs(t.x)<2000&&!t.fallen);result={hit:ForestMap.firstHit(t.x-100,t.y,t.x+100,t.y,5),clear:ForestMap.firstHit(-400,0,400,0,5)};`);assert(r.hit>0&&r.hit<.5);assert.equal(r.clear,null);
});
test('ruins require living guards to die and reward only once, waiting for other upgrades',()=>{
 const r=run(`const e=new RuinEncounter();let rewards=0;const pool=[];const g={state:'playing',player:{x:-1500,y:0,hp:120},enemyManager:{pool,spawn(type,x,y){const a={active:true,hp:100,x,y};pool.push(a);return a;}},triggerUpgrade(){rewards++;this.state='upgrading'},_announce(){}};
 e.update(g);const active=e.state;pool[0].hp=0;e.update(g);const partial=e.state;pool.forEach(a=>a.hp=0);g.state='upgrading';e.update(g);const waiting=e.state;g.state='playing';e.update(g);g.state='playing';e.update(g);result={active,partial,waiting,rewards,state:e.state};`);
 assert.equal(r.active,'guarded');assert.equal(r.partial,'guarded');assert.equal(r.waiting,'ready');assert.equal(r.rewards,1);assert.equal(r.state,'claimed');
});
test('a pursuer rounds a trunk instead of oscillating against it',()=>{
 const r=run(`const t=ForestMap.trees.find(t=>!t.fallen&&Math.abs(t.x)<1800&&ForestMap.clear(t.x-120,t.y,20)&&ForestMap.clear(t.x+120,t.y,20));const a={x:t.x-120,y:t.y,size:20},target={x:t.x+120,y:t.y};let clear=true;for(let i=0;i<220&&Math.hypot(a.x-target.x,a.y-target.y)>10;i++){const angle=ForestMap.steer(a,target);ForestMap.move(a,Math.cos(angle)*3,Math.sin(angle)*3);clear&&=ForestMap.clear(a.x,a.y,a.size);}result={clear,distance:Math.hypot(a.x-target.x,a.y-target.y)};`);
 assert(r.clear);assert(r.distance<15,JSON.stringify(r));
});
