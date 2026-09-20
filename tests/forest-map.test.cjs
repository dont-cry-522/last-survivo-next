const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function run(code){const c=vm.createContext({Math});vm.runInContext(fs.readFileSync(path.join(__dirname,'../classes/ForestMap.js'),'utf8')+';'+code,c);return c.result;}
test('a long dash cannot tunnel through a tree or leave the map',()=>{
 const r=run(`const tree=ForestMap.trees.find(t=>ForestMap.clear(t.x-100,t.y,20)),p={x:tree.x-100,y:tree.y,size:20};ForestMap.move(p,300,0);const stopped=p.x<tree.x;ForestMap.move(p,10000,10000);result={stopped,clear:ForestMap.clear(p.x,p.y,20),x:p.x,y:p.y};`);
 assert(r.stopped);assert(r.clear);assert(r.x<=2540&&r.y<=1420);
});
test('camp and each regional landmark are connected by a clear walking route',()=>{
 const r=run(`result=true;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])for(let d=0;d<=1100;d+=20)if(!ForestMap.clear(dx*d,dy*d,50))result=false;`);assert.equal(r,true);
});
test('spawn positions stay inside bounds, clear of trees and away from the player at edges',()=>{
 const r=run(`result=[];for(const [x,y]of [[0,0],[2500,1380],[-2500,-1380]])for(let i=0;i<30;i++){const p=ForestMap.spawn({x,y},50,1280,720);result.push(ForestMap.clear(p.x,p.y,50)&&Math.hypot(p.x-x,p.y-y)>350);}`);assert(r.every(Boolean));
});
test('regions depend on world position and distinguish forest from the camp',()=>{
 const r=run(`result=[[0,0],[0,-900],[1400,0],[-1400,0]].map(([x,y])=>ForestMap.region(x,y).name);`);assert.deepEqual(Array.from(r),['中央营地','古木密林','雾溪湿地','断墙遗迹']);
});
