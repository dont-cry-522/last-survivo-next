const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
for(const kind of ['weapon','inventory'])test(`${kind} dialog clears held input but preserves future movement keys`,()=>{
 const c=vm.createContext({Math});
 vm.runInContext(`const buttons=[];function element(){return {open:false,dataset:{},append(){},replaceChildren(){},focus(){},querySelector(){return element()},getContext(){return {scale(){}}},addEventListener(name,fn){this[name]=fn},showModal(){this.open=true},close(){this.open=false}};}const document={createElement(){const b=element();buttons.push(b);return b}},ForestArt={player(){}};`,c);
 for(const file of ['Config','Utils','Player','WeaponPaths','SkillInventory'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../classes',file+'.js'),'utf8'),c);
 vm.runInContext(`const player=new Player(0,0);player.setWeapon('rifle');player.level=3;player.onKeyDown('d');const game={player,state:'playing',mobileControls:{release(){}},skillManager:{skills:[]},_announce(){},togglePause(){this.state=this.state==='playing'?'paused':'playing'}};const ui={game,dialog:element(),button:element()};
 ${kind==='weapon'?'WeaponPaths.prototype.update.call(ui);':'SkillInventory.prototype.open.call(ui);'}
 const released=!player.keys.d;
 ${kind==='weapon'?'buttons[0].click();':'SkillInventory.prototype.close.call(ui);'}
 const moves=[];for(const key of ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d']){player.onKeyDown(key);moves.push(Object.values(player.keys).some(Boolean));player.onKeyUp(key);}result={released,moves,state:game.state,stuck:Object.values(player.keys).some(Boolean)};`,c);
 assert(c.result.released);assert(c.result.moves.every(Boolean));assert.equal(c.result.state,'playing');assert.equal(c.result.stuck,false);
});
