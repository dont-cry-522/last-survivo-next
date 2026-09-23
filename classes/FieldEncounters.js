/** Endless-only pincer groups and optional exploration sites, driven by game time. */
class FieldEncounters {
    constructor(g){this.g=g;this.nextWave=32;this.wave=null;this.zones=[];this.sites=(ForestMap.layout?.nodes.slice(2)||[]).map((p,i)=>({...p,name:i?'远古祭坛':'猎人补给站',state:'sealed',guards:[],token:{},reward:i?'skill':'supply'}));}
    planWave(){
        const g=this.g,p=g.player,points=[],start=Math.random()*Math.PI*2,count=Math.min(12,6+Math.floor(g.survivalTime/70));
        // Keep an angular escape lane; all entry points have clear routes and visible warnings.
        for(let i=0;i<count;i++)for(let attempt=0;attempt<10;attempt++){
            const angle=start+i/count*Math.PI*1.6+(attempt-4)*.055,r=320+attempt*18,x=p.x+Math.cos(angle)*r,y=p.y+Math.sin(angle)*r;
            if(!ForestMap.clear(x,y,35)||ForestMap.firstHit(x,y,p.x,p.y,20)!==null)continue;
            points.push({x,y,type:i%4===0?'tank':i%4===1?'spitter':'fast'});break;
        }
        if(points.length){this.wave={points,at:g.survivalTime+2.2};g._announce('兽群包抄 · 找空隙突围！','#f0b877');g.audio.encounterAlert?.();}
        this.nextWave=g.survivalTime+24;
    }
    lob(e){if(this.zones.length>=8)return;const p=this.g.player;this.zones.push({x:p.x,y:p.y,r:70,warning:1.4,life:3.6});}
    update(dt){
        const g=this.g;if(g.state!=='playing'||g.player.hp<=0)return;
        if(g.survivalTime>=this.nextWave&&!g.boss.active&&g.ruins.state!=='guarded'&&!this.sites.some(s=>s.state==='guarded'))this.planWave();
        if(this.wave&&g.survivalTime>=this.wave.at){
            for(const p of this.wave.points)if(Math.hypot(p.x-g.player.x,p.y-g.player.y)>150&&g.enemyManager.getActiveCount()<90){const e=g.enemyManager.spawn(p.type,p.x,p.y,g.hpMultiplier,g.speedMultiplier);if(e){e.combatState='recover';e.combatTimer=.35;}}
            this.wave=null;
        }
        for(const z of this.zones){z.warning-=dt;z.life-=dt;if(z.warning<=0&&Math.hypot(g.player.x-z.x,g.player.y-z.y)<z.r+g.player.size)g.player.takeDamage(9,{x:z.x,y:z.y,kind:'孢子毒地'});}
        this.zones=this.zones.filter(z=>z.life>0);
        for(const s of this.sites){
            const distance=Math.hypot(g.player.x-s.x,g.player.y-s.y);
            if(s.state==='sealed'&&distance<230){s.state='warning';s.at=g.survivalTime+2;g._announce(s.name+' · 守卫即将苏醒','#ecd08b');}
            if(s.state==='warning'&&g.survivalTime>=s.at){
                const spawned=[];for(const [i,type]of ['tank','spitter','fast','fast'].entries()){
                    const a=i*Math.PI/2,x=s.x+Math.cos(a)*180,y=s.y+Math.sin(a)*180;
                    if(g.enemyManager.getActiveCount()>=90||!ForestMap.clear(x,y,35)||Math.hypot(x-g.player.x,y-g.player.y)<100)continue;
                    const e=g.enemyManager.spawn(type,x,y,g.hpMultiplier,g.speedMultiplier);if(e){e.fieldGuard=s.token;e.combatState='recover';e.combatTimer=.7;spawned.push(e);}
                }
                if(spawned.length){s.guards=spawned;s.state='guarded';}else s.at=g.survivalTime+2;
            }
            if(s.state==='guarded'&&!s.guards.some(e=>e.fieldGuard===s.token&&e.active&&e.hp>0)){s.state='ready';g._announce(s.name+' · 已解锁，靠近领取');}
            if(s.state==='ready'&&distance<70&&g.state==='playing'){
                s.state='claimed';
                if(s.reward==='skill'){g._announce('祭坛祝福 · 选择一项技能');g.triggerUpgrade();}
                else{g.player.hp=Math.min(g.player.maxHp,g.player.hp+g.player.maxHp*.3);g.player.shield=(g.player.shield||0)+25;for(const orb of g.experienceManager.pool)if(orb.active)orb.isAttracting=true;g._announce('猎人补给 · 治疗 30%、护盾 25、吸引遗落经验');}
            }
        }
    }
    draw(c,cx,cy,time){
        c.save();
        for(const p of this.wave?.points||[]){const x=p.x-cx,y=p.y-cy;c.strokeStyle='#ffbd75';c.lineWidth=3;c.setLineDash([7,5]);c.beginPath();c.arc(x,y,30,0,Math.PI*2);c.stroke();c.setLineDash([]);c.fillStyle='#ffe3ad';c.font='bold 22px sans-serif';c.textAlign='center';c.fillText('!',x,y+7);}
        for(const z of this.zones){const x=z.x-cx,y=z.y-cy;c.fillStyle=z.warning>0?'rgba(211,101,160,.12)':'rgba(118,57,141,.32)';c.strokeStyle=z.warning>0?'#ffadca':'#dc9fdf';c.lineWidth=3;c.beginPath();c.arc(x,y,z.r,0,Math.PI*2);c.fill();c.stroke();c.font='bold 15px sans-serif';c.fillStyle='#ffe0ec';c.textAlign='center';c.fillText(z.warning>0?'孢子将落 · 离开圆圈':'毒地',x,y-8);}
        for(const s of this.sites){const x=s.x-cx,y=s.y-cy;if(x< -150||y< -150||x>c.canvas.width+150||y>c.canvas.height+150)continue;
            c.globalAlpha=s.state==='claimed'?.45:1;ForestArt.oval(c,x,y+10,45,22,'#334435','#c7b47d',2);
            if(s.reward==='skill'){ForestArt.shape(c,[[x-20,y+8],[x-15,y-38],[x+15,y-38],[x+20,y+8]],'#817f69','#d6cca0',3);SkillVisuals.rune(c,x,y-20,12,'#9ed6cf');}
            else{ForestArt.shape(c,[[x-27,y-20],[x+27,y-20],[x+27,y+9],[x-27,y+9]],'#9e7950','#e0c897',3);ForestArt.line(c,[[x-9,y-6],[x+9,y-6]],'#d4e8b2',5);ForestArt.line(c,[[x,y-15],[x,y+3]],'#d4e8b2',5);}
            c.fillStyle='#fff0c6';c.textAlign='center';c.font='bold 15px sans-serif';c.fillText(s.name+' · '+({sealed:'靠近挑战',warning:'守卫苏醒',guarded:'击败守卫',ready:'领取奖励',claimed:'已领取'}[s.state]),x,y+40);
        }c.restore();
    }
}
