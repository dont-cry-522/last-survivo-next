/** Weapon branches share combat data, with a small keyboard/touch choice dialog. */
class WeaponPaths {
    static PATHS={
        duelist:{weapon:'pistol',name:'决斗点射',desc:'单发伤害 +45%，射速 −15%，额外穿透 2 个目标。'},
        quickdraw:{weapon:'pistol',name:'疾速拔枪',desc:'射速 +45%，单发伤害 −15%；移动射击额外加速 25%。'},
        crescent:{weapon:'shuriken',name:'穿月刃',desc:'穿透 +2，单枚伤害 +15%。'},
        fan:{weapon:'shuriken',name:'五刃齐发',desc:'额外飞镖 +2，单枚伤害 −20%。'},
        eclipse:{weapon:'dark',name:'月蚀爆裂',desc:'爆裂半径扩大到 105，直击伤害 +15%。'},
        midnight:{weapon:'dark',name:'暗夜连咒',desc:'射速 +50%，伤害 −20%。'} ,
        rapid:{weapon:'rifle',name:'疾风扫射',desc:'射速 +65%，单发伤害 −28%。密集弹线，持续压制。'},
        heavy:{weapon:'rifle',name:'蓄力重弹',desc:'射速 −50%，单发伤害 +160%，额外穿透 +1。蓄力后打出重弹。'},
        wide:{weapon:'shotgun',name:'扩散弹幕',desc:'额外弹丸 +2，散射角 +65%，单颗伤害 −18%。适合清理近处怪群。'},
        focus:{weapon:'shotgun',name:'集中爆破',desc:'散射角 −60%，伤害 +50%，射速 −20%。集中攻击单个目标。'},
        ground:{weapon:'fireball',name:'灼热火径',desc:'直击伤害 −20%，命中铺出三段持续 3 秒的火径，封住追击路线。'},
        split:{weapon:'fireball',name:'陨火爆裂',desc:'射速 −40%，直击伤害 +60%，爆炸半径 145，散出 4 枚小火球。慢速重爆。'}
    };
    static choose(p,id){
        const d=this.PATHS[id];if(!d||d.weapon!==p.weaponType||p.weaponPath)return false;
        p.weaponPath=id;
        if(id==='duelist'){p.bulletDamage*=1.45;p.attackSpeed*=.85;p.pierce+=2;}
        if(id==='quickdraw'){p.attackSpeed*=1.45;p.bulletDamage*=.85;}
        if(id==='crescent'){p.pierce+=2;p.bulletDamage*=1.15;}
        if(id==='fan'){p.bulletCount+=2;p.bulletDamage*=.8;}
        if(id==='eclipse')p.bulletDamage*=1.15;
        if(id==='midnight'){p.attackSpeed*=1.5;p.bulletDamage*=.8;}
        if(id==='rapid'){p.attackSpeed*=1.65;p.bulletDamage*=.72;}
        if(id==='heavy'){p.attackSpeed*=.5;p.bulletDamage*=2.6;p.pierce++;}
        if(id==='wide'){p.bulletCount+=2;p.bulletDamage*=.82;}
        if(id==='focus'){p.bulletDamage*=1.5;p.attackSpeed*=.8;}
        if(id==='ground')p.bulletDamage*=.8;
        if(id==='split'){p.bulletDamage*=1.6;p.attackSpeed*=.6;p.blastRadius=145;}
        p.attackTimer=id==='heavy'?.4:0;return true;
    }
    constructor(game){
        this.game=game;this.dialog=document.createElement('dialog');this.dialog.className='weapon-path-dialog';this.dialog.setAttribute('aria-labelledby','weapon-path-title');
        document.body.append(this.dialog);
        this.dialog.addEventListener('cancel',e=>e.preventDefault());
        window.addEventListener('keydown',e=>{if(this.dialog.open){e.stopImmediatePropagation();if(e.key==='Escape')e.preventDefault();}},true);
    }
    reset(){this.dialog.close();}
    update(){
        const g=this.game;if(g.state!=='playing'||g.player.level<3||g.player.weaponPath||this.dialog.open)return;
        g.state='paused';for(const key of Object.keys(g.player.keys))g.player.keys[key]=false;g.mobileControls?.release();
        this.dialog.innerHTML='<small>武器进阶 · 本局选择一次</small><h2 id="weapon-path-title">这把武器，走哪条路线？</h2><p>选择期间战斗暂停。后续技能强化继续生效。</p><div class="weapon-path-options"></div>';
        for(const [id,d]of Object.entries(WeaponPaths.PATHS))if(d.weapon===g.player.weaponType){
            const b=document.createElement('button');b.type='button';b.dataset.path=id;b.innerHTML=`<strong>${d.name}</strong><canvas width="180" height="105" aria-hidden="true"></canvas><span>${d.desc}</span>`;
            const c=b.querySelector('canvas').getContext('2d');c.scale(1.8,1.8);ForestArt.player(c,{x:43,y:37,size:20,hp:100,animTimer:0,walkCycle:0,aimAngle:0,characterId:g.player.characterId,weaponType:d.weapon,weaponPath:id,chargeLevel:id==='heavy'?.7:0});
            b.addEventListener('click',()=>{if(WeaponPaths.choose(g.player,id)){this.dialog.close();g.state='playing';g._announce('进阶：'+d.name,'#ecd299');}});this.dialog.querySelector('div').append(b);
        }
        this.dialog.showModal();this.dialog.querySelector('button').focus();
    }
    static impact(g,b){
        if(b.branchDone)return;b.branchDone=true;
        if(b.weaponPath==='ground'){
            const a=Math.atan2(b.vy||0,b.vx||1);
            for(const offset of [-70,0,70])g.weaponFields.push({x:b.x+Math.cos(a)*offset,y:b.y+Math.sin(a)*offset,r:48,life:3,tick:0,damage:b.damage*.18});
            while(g.weaponFields.length>12)g.weaponFields.shift();
        }
        if(b.weaponPath==='split')for(const offset of [-1.1,-.4,.4,1.1]){
            const a=Math.atan2(b.vy,b.vx)+offset,c=g.bulletManager.fire(b.x,b.y,a,b.damage*.28,6,0,null,1);
            if(c){c.weaponType='fireball';c.weaponPath='split-child';c.blastRadius=30;c.size=5;c.life=.6;}
        }
    }
    static updateFields(g,dt){
        for(const f of g.weaponFields){
            const step=Math.min(dt,f.life);f.life-=dt;f.tick-=step;
            while(f.tick<=0&&step>0){f.tick+=.3;
                for(const e of g.enemyManager.pool)if(e.active&&e.hp>0&&Math.hypot(e.x-f.x,e.y-f.y)<f.r+e.size)g.statusSystem.applyBurn(e,1,Math.max(e.burnDmgPerStack||0,f.damage/.3),.4);
                if(g.boss.active&&Math.hypot(g.boss.x-f.x,g.boss.y-f.y)<f.r+g.boss.size)g.boss.takeDamage(f.damage);
            }
        }g.weaponFields=g.weaponFields.filter(f=>f.life>0);
    }
    static drawFields(c,g){
        for(const f of g.weaponFields){const x=f.x-g.cameraX,y=f.y-g.cameraY;
            c.save();c.globalAlpha=Math.min(1,f.life)*.7;ForestArt.oval(c,x,y,f.r,f.r,'rgba(116,49,25,.4)','#c97638',1);
            for(let i=0;i<12;i++){const a=i*2.4,r=45*Math.sqrt((i+.5)/12),px=x+Math.cos(a)*r,py=y+Math.sin(a)*r*.65,h=10+Math.sin(g.survivalTime*12+i)*5;ForestArt.shape(c,[[px-5,py],[px-1,py-h-8],[px+3,py-h],[px+6,py]],'#e99a43',null);}
            c.restore();
        }
    }
}
