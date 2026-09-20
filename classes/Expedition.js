/** Finite forest chapter; ordinary endless spawning remains in Game. */
class Expedition {
    constructor(game){
        this.game=game;this.stage='nests';this.index=0;this.wave=0;this.guards=[];this.token={};this.route=null;
        this.nodes=[{x:0,y:-850,name:'北林巢穴'},{x:1250,y:0,name:'溪边巢穴'}];
        this.dialog=document.createElement('dialog');this.dialog.className='expedition-dialog';document.body.append(this.dialog);
        this.dialog.addEventListener('cancel',e=>e.preventDefault());
        this.keyHandler=e=>{if(this.dialog.open&&!['Tab','Enter',' '].includes(e.key)){e.stopImmediatePropagation();e.preventDefault();}};
        window.addEventListener('keydown',this.keyHandler,true);
    }
    dispose(){this.dialog.close();this.dialog.remove();window.removeEventListener('keydown',this.keyHandler,true);}
    release(){for(const key of Object.keys(this.game.player.keys))this.game.player.keys[key]=false;this.game.player.touchKeys={};this.game.mobileControls?.release();}
    get target(){return this.stage==='nests'?this.nodes[this.index]:this.stage==='elite'?{x:0,y:0,name:'营地精英'}:{x:-1500,y:0,name:'遗迹首领'};}
    get remaining(){return this.guards.filter(e=>e.chapterGuard===this.token&&e.active&&e.hp>0).length;}
    get fighting(){return this.remaining>0||this.stage==='boss';}
    get objective(){
        if(this.stage==='choose')return '两处巢穴已清理 · 选择前进路线';
        if(this.stage==='complete')return '林地远征完成';
        const t=this.target,p=this.game.player,d=Math.round(Math.hypot(p.x-t.x,p.y-t.y));
        const direction=(t.y-p.y<-100?'北':t.y-p.y>100?'南':'')+(t.x-p.x<-100?'西':t.x-p.x>100?'东':'');
        return this.stage==='boss'?'最终目标 · 击败遗迹首领':`${this.stage==='nests'?`巢穴 ${this.index+1}/2 · `:''}${t.name} · ${this.remaining?`第 ${this.wave} 波，剩余 ${this.remaining}`:`${direction||'附近'} ${d} 米 · 靠近挑战`}`;
    }
    spawnAmbient(dt){if(this.fighting||this.stage==='choose')return;const g=this.game;g.spawnTimer-=dt;if(g.spawnTimer<=0){g.spawnTimer=4;if(g.enemyManager.getActiveCount()<18)g.spawnEnemy();}}
    spawnGuards(types){
        const g=this.game,t=this.target,spawned=[];
        for(let i=0;i<types.length;i++){
            let pos=null;
            for(let k=0;k<24;k++){const a=i/types.length*Math.PI*2+k*.3,r=210+k*8,x=t.x+Math.cos(a)*r,y=t.y+Math.sin(a)*r;if(ForestMap.clear(x,y,45)&&Math.hypot(x-g.player.x,y-g.player.y)>140){pos={x,y};break;}}
            const e=pos&&g.enemyManager.spawn(types[i],pos.x,pos.y,g.hpMultiplier*(this.stage==='elite'?1.4:1),g.speedMultiplier);
            if(!e){spawned.forEach(v=>{v.active=false;v.chapterGuard=null;});return false;}
            e.chapterGuard=this.token;e.combatState='recover';e.combatTimer=1.2;spawned.push(e);
        }
        this.guards=spawned;return true;
    }
    update(){
        const g=this.game;if(g.state!=='playing'||g.player.hp<=0)return;
        if(this.stage==='choose'){this.showRoutes();return;}
        if(this.stage==='boss'||this.stage==='complete')return;
        if(this.remaining)return;
        if(this.guards.length){
            this.guards=[];
            if(this.stage==='elite'){g.player.bulletDamage*=1.25;this.stage='gate';g._announce('精英已击败 · 武器伤害 +25%');g.triggerUpgrade();return;}
            if(this.wave===3){this.nodes[this.index].done=true;this.index++;this.wave=0;if(this.index===2)this.stage='choose';g._announce('巢穴已清理 · 选择一项技能');g.triggerUpgrade();return;}
            this.nextWaveAt=g.survivalTime+3;
        }
        const t=this.target;if(Math.hypot(g.player.x-t.x,g.player.y-t.y)>190&&this.wave===0)return;
        if(g.survivalTime<(this.nextWaveAt||0))return;
        if(this.stage==='gate'){g.spawnBoss();if(g.boss.active)this.stage='boss';return;}
        const types=this.stage==='elite'?['elite','fast','fast']:this.wave===0?['normal','normal','fast','normal']:this.wave===1?['tank','normal','fast','normal','fast']:['tank','exploder','fast','normal','normal','fast'];
        if(this.spawnGuards(types)){this.wave++;g._announce(`${t.name} · 第 ${this.wave} 波`);}
    }
    modal(title,copy,buttons){
        this.release();this.dialog.innerHTML=`<p class="loadout-eyebrow">林地远征 · 第一章</p><h2>${title}</h2><p>${copy}</p><div class="expedition-options"></div>`;
        for(const [label,action]of buttons){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{this.dialog.close();this.release();action();};this.dialog.querySelector('div').append(b);}
        this.dialog.showModal();this.dialog.querySelector('button').focus();
    }
    showRoutes(){this.game.state='paused';this.modal('下一段路，怎么走？','巢穴已清理。补给路线恢复状态；精英路线风险更高，胜利后获得额外技能与武器伤害 +25%。',[
        ['补给路线 · 恢复 40% 生命 + 15% 护盾',()=>this.choose('supply')],['精英路线 · 回营地挑战精英',()=>this.choose('elite')]
    ]);}
    choose(route){if(this.stage!=='choose')return;this.route=route;this.wave=0;this.nextWaveAt=0;this.stage=route==='elite'?'elite':'gate';const p=this.game.player;if(route==='supply'){p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.4);p.shield+=p.maxHp*.15;}this.game.state='playing';}
    win(){
        const g=this.game;if(this.stage!=='boss'||g.player.hp<=0)return false;
        this.stage='complete';g.state='victory';const seconds=Math.floor(g.survivalTime);
        this.modal('林地已平息 · 远征成功',`用时 ${Math.floor(seconds/60)} 分 ${seconds%60} 秒 · 击败 ${g.player.kills} 名敌人 · 等级 ${g.player.level}。${this.route==='elite'?'精英':'补给'}路线完成。`,[
            ['再来一局',()=>g.restart()],['返回地图与武器选择',()=>g.loadout.menu.click()]
        ]);return true;
    }
    draw(c,cx,cy,time){
        c.save();
        for(const n of this.nodes){const x=n.x-cx,y=n.y-cy;c.strokeStyle=n.done?'#657457':'#a27749';c.lineWidth=7;c.beginPath();c.ellipse(x,y,45,27,0,0,Math.PI*2);c.stroke();if(!n.done){for(let i=-1;i<=1;i++){c.fillStyle='#dbb87b';c.beginPath();c.ellipse(x+i*17,y-9,10,15,i*.3,0,Math.PI*2);c.fill();}}}
        if(this.stage!=='complete'&&this.stage!=='choose'){
            const t=this.target,x=t.x-cx,y=t.y-cy;c.strokeStyle='#f3d484';c.lineWidth=3;c.setLineDash([8,7]);c.beginPath();c.arc(x,y,70+Math.sin(time*3)*4,0,Math.PI*2);c.stroke();c.setLineDash([]);
            const sx=Math.max(65,Math.min(c.canvas.width-65,x)),sy=Math.max(130,Math.min(c.canvas.height-150,y));c.fillStyle='#20382de8';c.fillRect(sx-60,sy-20,120,30);c.fillStyle='#ffe3a0';c.textAlign='center';c.font='bold 14px sans-serif';c.fillText(t.name, sx,sy);
            if(sx!==x||sy!==y){c.translate(sx,sy+18);c.rotate(Math.atan2(y-sy,x-sx));c.beginPath();c.moveTo(12,0);c.lineTo(-7,-7);c.lineTo(-7,7);c.closePath();c.fill();}
        }c.restore();
    }
}
