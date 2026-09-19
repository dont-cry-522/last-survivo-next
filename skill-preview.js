/** Isolated demonstration. Fixtures and shortened cooldowns never enter the game. */
const canvas=document.querySelector('#preview'),ctx=canvas.getContext('2d');
const familyNames={bullet_storm:'枪弹',inferno:'火焰',frost:'冰霜',storm:'雷电',bastion:'防御',shadow:'暗影',reaper:'收割',summoner:'召唤'};
const audio=new SoundManager();audio.enabled=false;
const preview={player:new Player(0,0),skillManager:new SkillManager(),enemyManager:new EnemyManager(20),bulletManager:new BulletManager(160,100),particleManager:new ParticleManager(300),boss:{active:false},audio,
 uiManager:{addDamageNumber(){}},applyWeaponImpact:Game.prototype.applyWeaponImpact};
window.game=preview;
let selected=SkillConfig.POOL.find(s=>s.id===new URLSearchParams(location.search).get('skill'))||SkillConfig.POOL.find(s=>s.id==='chain_lightning');
let tier=selected.tiers.length,paused=false,age=0,triggerTimer=0,previous=performance.now();
const skillSelect=document.querySelector('#skill'),tierSelect=document.querySelector('#tier');
for(const [id,name] of Object.entries(familyNames)){
 const b=document.createElement('button');b.textContent=name;b.dataset.category=id;b.addEventListener('click',()=>choose(SkillConfig.POOL.find(s=>s.category===id)));document.querySelector('#categories').append(b);
}
function choose(def){selected=def;tier=def.tiers.length;
 for(const b of document.querySelectorAll('[data-category]'))b.setAttribute('aria-pressed',String(b.dataset.category===def.category));
 skillSelect.replaceChildren();for(const s of SkillConfig.POOL.filter(s=>s.category===def.category)){const option=new Option(s.name,s.id);skillSelect.add(option);}skillSelect.value=def.id;
 tierSelect.replaceChildren();def.tiers.forEach((_,i)=>tierSelect.add(new Option('第 '+(i+1)+' 阶',String(i+1))));tierSelect.value=String(tier);reset();
}
skillSelect.addEventListener('change',()=>choose(SkillConfig.POOL.find(s=>s.id===skillSelect.value)));
tierSelect.addEventListener('change',()=>{tier=Number(tierSelect.value);reset();});
document.querySelector('#replay').addEventListener('click',reset);
document.querySelector('#pause').addEventListener('click',e=>{paused=!paused;e.target.setAttribute('aria-pressed',String(paused));e.target.textContent=paused?'继续':'暂停';});
document.querySelector('#sound').addEventListener('click',e=>{audio.init();audio.enabled=!audio.enabled;e.target.textContent=audio.enabled?'关闭声音':'开启声音';e.target.setAttribute('aria-pressed',String(audio.enabled));});
const prerequisites={swarm:['drone'],bomber:['drone'],overcharge:['drone'],repair_drone:['drone'],hellfire:['scorched_earth'],ion_cannon:['chain_lightning','storm_cloud'],absolute_zero:['freeze'],deep_freeze:['freeze'],freeze:['frost_rounds'],shatter:['freeze']};
function grant(id,level){const def=SkillConfig.POOL.find(s=>s.id===id),sm=preview.skillManager,p=preview.player;const inst=new SkillInstance(def);inst.currentTier=level||def.tiers.length;sm.skills.push(inst);sm._updateRegistry(inst);def.apply(p,sm,inst.getCurrentEffect().params);}
function reset(){
 const p=preview.player,sm=preview.skillManager;p.reset(0,0);p.setWeapon('rifle');p.audio=audio;p.hp=75;p.dashDirection={x:1,y:0};sm.reset();sm.visuals.audio=audio;
 preview.statusSystem=new StatusSystem();Enemy._statusSystem=preview.statusSystem;preview.enemyManager.clear();preview.bulletManager.clear();preview.particleManager=new ParticleManager(300);
 for(let i=0;i<12;i++){const a=i*Math.PI/6,e=preview.enemyManager.spawn(['normal','fast','tank','exploder','elite'][i%5],Math.cos(a)*(150+i%3*60),Math.sin(a)*(110+i%3*40));e.hp=e.maxHp=10000;e.angle=Math.atan2(-e.y,-e.x);}
 for(const id of prerequisites[selected.id]||[])grant(id);grant(selected.id,tier);
 document.querySelector('#name').textContent=selected.name+' · 第 '+tier+' 阶';document.querySelector('#description').textContent=selected.tiers[tier-1].desc;
 document.querySelector('#companions').textContent=(prerequisites[selected.id]||[]).length?'搭配演示：'+prerequisites[selected.id].map(id=>SkillConfig.POOL.find(s=>s.id===id).name).join('、'):'独立技能演示';
 age=0;triggerTimer=.3;sm.update(.01,context());for(const key of ['_wrath','_supernova','_thunder','_orbital'])if(sm.runtimeState[key])sm.runtimeState[key].timer=.7;
}
function context(){return{player:preview.player,enemies:preview.enemyManager.getActiveEnemies(),particleManager:preview.particleManager,bulletManager:preview.bulletManager,game:preview};}
function stimulate(){
 const sm=preview.skillManager,p=preview.player,contextNow=context(),enemy=contextNow.enemies[0];if(!enemy)return;
 const bullet=new Bullet();bullet.init(enemy.x,enemy.y,0,12,8,0);bullet.isCrit=true;
 if(['freeze','shatter','deep_freeze','absolute_zero'].includes(selected.id)){for(const e of contextNow.enemies){e.slowAmount=.5;e.frozen=true;e.frozenTimer=3;}}
 if(selected.id==='absolute_zero')enemy.hp=0;
 if(selected.id==='execute')enemy.hp=enemy.maxHp*.15;
 if(selected.id==='assassinate')enemy.hp=enemy.maxHp;
 const event={...contextNow,enemy,bullet,count:8,amount:80};
 if(selected.id==='phoenix')p.hp=0;
 if(selected.category==='shadow'||selected.id==='counter_stance')sm.trigger(SkillEffectType.ON_DASH,event);
 sm.trigger(SkillEffectType.ON_HIT,event);sm.trigger(SkillEffectType.ON_CRIT,event);
 sm.trigger(SkillEffectType.ON_KILL,event);sm.trigger(SkillEffectType.ON_DAMAGED,event);
 if(selected.id==='terminator_barrage'){p.moving=true;p.keys.d=true;}else{p.moving=false;p.keys.d=false;}
}
function frame(now){
 const dt=Math.min(.04,(now-previous)/1000);previous=now;
 if(!paused&&!document.hidden){age+=dt;triggerTimer-=dt;if(age>7)reset();if(triggerTimer<=0){stimulate();triggerTimer=1.6;}
  const p=preview.player;p.animTimer+=dt;p.recoilTimer=Math.max(0,p.recoilTimer-dt);p.muzzleFlash=Math.max(0,p.muzzleFlash-dt);p.walkCycle+=dt*(p.moving?13:0);p.runBlend=p.moving?1:0;
  const info=context();p.autoAttack(dt,info.enemies,preview.bulletManager,preview.particleManager);preview.bulletManager.update(dt,info.enemies,preview.particleManager);
  Game.prototype.checkBulletCollisions.call(preview);preview.skillManager.update(dt,info);
  for(const e of info.enemies){e.hitFlash=Math.max(0,e.hitFlash-dt);e.animTimer+=dt*.15;preview.statusSystem.update(e,dt);if(e.hp<=0)e.hp=e.maxHp;}
  preview.enemyManager.updateDeathPoses(dt);preview.particleManager.update(dt);
 }
 ForestArt.terrain(ctx,-640,-360,1280,720);preview.particleManager.draw(ctx,-640,-360);preview.skillManager.drawSkillVisuals(ctx,-640,-360,preview.player);
 preview.enemyManager.draw(ctx,-640,-360,preview.player);preview.bulletManager.draw(ctx,-640,-360);
 requestAnimationFrame(frame);
}
choose(selected);requestAnimationFrame(frame);
