/** Optional timed encounters for endless runs. All clocks use simulation time. */
class EndlessEvents {
    constructor(game){this.game=game;this.shots=[];this.event=null;this.nextAt=55;this.dangerUntil=0;this.lastAlert=-99;}
    get intensity(){const g=this.game;return this.event?.phase==='warning'||g.survivalTime<this.dangerUntil?1.22:this.event?1.04:.88;}
    get objective(){const e=this.event;if(!e)return '';const left=Math.max(0,Math.ceil(e.ends-this.game.survivalTime));return e.phase==='warning'?`补给信号 · ${Math.max(0,Math.ceil(e.starts-this.game.survivalTime))} 秒后守卫来袭`:`限时补给 · 剩余 ${left} 秒 · ${e.contested?'先清理附近守卫':`靠近驻守 ${Math.floor(e.progress)}/5 秒`}`;}
    begin(){
        const g=this.game;
        for(let i=0;i<24;i++){
            const a=Math.random()*Math.PI*2,x=g.player.x+Math.cos(a)*420,y=g.player.y+Math.sin(a)*420;
            if(!ForestMap.clear(x,y,75))continue;
            this.event={x,y,phase:'warning',starts:g.survivalTime+4,ends:g.survivalTime+44,progress:0};
            g._announce('发现限时补给 · 后排守卫正在集结');g.audio.encounterAlert?.();return true;
        }return false;
    }
    cast(e){
        const g=this.game;
        if(e.type==='spitter'&&this.shots.length<80){
            this.shots.push({x:e.x,y:e.y,vx:Math.cos(e.attackAngle)*220,vy:Math.sin(e.attackAngle)*220,life:3,damage:e.damage});
        }
        if(e.type==='shaman'){
            e.supportGlow=.6;
            for(const ally of g.enemyManager.pool)if(ally!==e&&ally.active&&ally.hp>0&&Math.hypot(ally.x-e.x,ally.y-e.y)<190){ally.hp=Math.min(ally.maxHp,ally.hp+ally.maxHp*.08);ally.supportGlow=.6;}
        }
    }
    update(dt){
        const g=this.game;if(g.state!=='playing'||g.player.hp<=0)return;
        let pressure=0,danger=false,support=false;
        for(const e of g.enemyManager.pool){
            if(!e.active||e.hp<=0)continue;
            if(e.attackCue==='strike'&&!e.frozen&&!e.paralyzed)this.cast(e);
            if(Math.hypot(e.x-g.player.x,e.y-g.player.y)<600){pressure++;if(e.type==='elite')danger=true;if(e.type==='shaman')support=true;}
        }
        if(danger||support&&pressure>=6||pressure>18){
            if(g.survivalTime>this.dangerUntil&&g.survivalTime-this.lastAlert>20){g.audio.encounterAlert?.();this.lastAlert=g.survivalTime;}
            this.dangerUntil=g.survivalTime+6;
        }
        for(const s of this.shots){
            const x=s.x,y=s.y;s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;
            if(ForestMap.firstHit(x,y,s.x,s.y,7)!==null){s.life=0;continue;}
            const dx=s.x-x,dy=s.y-y,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((g.player.x-x)*dx+(g.player.y-y)*dy)/l)):0;
            if(Math.hypot(g.player.x-x-dx*t,g.player.y-y-dy*t)<g.player.size+7){g.player.takeDamage(s.damage);s.life=0;}
        }
        this.shots=this.shots.filter(s=>s.life>0);
        if(!this.event){if(g.survivalTime>=this.nextAt&&!g.boss.active&&g.ruins.state!=='guarded'){this.begin();this.nextAt=g.survivalTime+10;}return;}
        const e=this.event;
        if(g.survivalTime>=e.ends){this.event=null;this.nextAt=g.survivalTime+70+Math.random()*25;g._announce('补给信号消失 · 继续探索');return;}
        if(e.phase==='warning'){
            if(g.survivalTime<e.starts)return;
            e.phase='active';
            const types=['tank','fast','fast','spitter','shaman'];
            for(let i=0;i<types.length;i++){
                const a=i/types.length*Math.PI*2,x=e.x+Math.cos(a)*200,y=e.y+Math.sin(a)*200;
                if(types[i]==='shaman'&&g.enemyManager.pool.filter(a=>a.active&&a.hp>0&&a.type==='shaman').length>=2)continue;
                if(ForestMap.clear(x,y,40)&&Math.hypot(x-g.player.x,y-g.player.y)>140&&g.enemyManager.getActiveCount()<90)g.enemyManager.spawn(types[i],x,y,g.hpMultiplier,g.speedMultiplier);
            }g._announce('补给已落地 · 清场后靠近驻守');
        }
        e.contested=g.enemyManager.pool.some(a=>a.active&&a.hp>0&&Math.hypot(a.x-e.x,a.y-e.y)<135);
        if(Math.hypot(g.player.x-e.x,g.player.y-e.y)<70&&!e.contested)e.progress+=dt;
        else e.progress=Math.max(0,e.progress-dt*.5);
        if(e.progress>=5){this.event=null;this.nextAt=g.survivalTime+70+Math.random()*25;g.player.hp=Math.min(g.player.maxHp,g.player.hp+g.player.maxHp*.25);g._announce('补给到手 · 恢复 25% 生命，选择额外技能');g.triggerUpgrade();}
    }
    draw(c,cx,cy,time){
        c.save();
        for(const s of this.shots){const x=s.x-cx,y=s.y-cy;if(x< -30||y< -30||x>c.canvas.width+30||y>c.canvas.height+30)continue;ForestArt.oval(c,x,y,8,8,'#815599','#e4b2e3',2);ForestArt.oval(c,x-2,y-2,2,2,'#fff0d1',null);}
        const e=this.event;
        if(e){
            const x=e.x-cx,y=e.y-cy;
            if(x> -100&&y> -100&&x<c.canvas.width+100&&y<c.canvas.height+100){
                c.strokeStyle=e.contested?'#e0a476':'#c9d8a1';c.lineWidth=2;c.setLineDash(e.phase==='warning'?[7,7]:[]);c.beginPath();c.ellipse(x,y,70,45,0,0,Math.PI*2);c.stroke();c.setLineDash([]);
                ForestArt.shape(c,[[x-20,y-17],[x+20,y-17],[x+20,y+12],[x-20,y+12]],'#866e46','#dfc896',2);
                ForestArt.line(c,[[x-21,y-7],[x+21,y-7]],'#d9c58d',3);ForestArt.line(c,[[x,y-16],[x,y+10]],'#d9c58d',4);
                c.strokeStyle='#d2e9aa';c.lineWidth=4;c.beginPath();c.arc(x,y,52,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,e.progress/5));c.stroke();
            }
            const sx=Math.max(80,Math.min(c.canvas.width-80,x)),sy=Math.max(145,Math.min(c.canvas.height-145,y-75));c.fillStyle='#20382dee';c.fillRect(sx-76,sy-20,152,32);c.fillStyle='#f6dea4';c.font='bold 13px sans-serif';c.textAlign='center';c.fillText(`补给 · ${Math.ceil(Math.hypot(e.x-this.game.player.x,e.y-this.game.player.y))} 米`,sx,sy);
        }c.restore();
    }
}
