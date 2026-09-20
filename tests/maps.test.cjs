const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function run(code){const c=vm.createContext({Math});for(const f of ['ForestMap','WoodlandScene'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../classes/'+f+'.js'),'utf8'),c);vm.runInContext(code,c);return c.result;}
test('each map has clear camp, connected landmarks and bounded spawns',()=>{
 const r=run(`result=[];for(const id of ['forest','snow','ash']){ForestMap.select(id);let clear=true;for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]])for(let d=0;d<=1500;d+=25){if(Math.abs(dy*d)>1300)continue;clear&&=ForestMap.clear(dx*d,dy*d,50);}for(let i=0;i<20;i++){const p={x:2450,y:1320},s=ForestMap.spawn(p,50,1280,720);clear&&=ForestMap.clear(s.x,s.y,50)&&Math.hypot(s.x-p.x,s.y-p.y)>350;}result.push(clear);}`);assert(r.every(Boolean));
});
test('switching maps resets geometry and terrain; invalid selection returns to forest',()=>{
 const r=run(`ForestMap.select('forest');const original=JSON.stringify(ForestMap.trees);ForestMap.select('snow');const snow=JSON.stringify(ForestMap.trees);const snowSurface=WoodlandScene.surfaceAt(420,280,0);ForestMap.select('ash');const ashSurface=WoodlandScene.surfaceAt(420,280,0);ForestMap.select('invalid');result={different:original!==snow,restored:JSON.stringify(ForestMap.trees)===original,snow:snowSurface.speed,ash:ashSurface.speed,outside:WoodlandScene.surfaceAt(0,0,0)};`);
 assert(r.different);assert(r.restored);assert.equal(r.snow,.65);assert.equal(r.ash,.7);assert.equal(r.outside,null);
});
test('snow trees and ash pillars stop both swept movement and bullets',()=>{
 const r=run(`result=[];for(const id of ['snow','ash']){ForestMap.select(id);const t=ForestMap.trees.find(t=>ForestMap.clear(t.x-100,t.y,20));const p={x:t.x-100,y:t.y,size:20};const hit=ForestMap.firstHit(p.x,p.y,t.x+100,t.y,4);ForestMap.move(p,200,0);result.push(hit!==null&&p.x<t.x&&ForestMap.clear(p.x,p.y,20));}`);assert(r.every(Boolean));
});
