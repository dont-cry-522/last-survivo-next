/** Optional, once-per-run encounter; guard tokens survive enemy-pool reuse safely. */
class RuinEncounter {
    constructor(){this.x=-1500;this.y=0;this.state='sealed';this.guards=[];this.token={};}
    get remaining(){return this.guards.filter(e=>e.ruinGuard===this.token&&e.active&&e.hp>0).length;}
    get label(){return {sealed:'遗迹宝箱 · 靠近挑战',guarded:`遗迹守卫 · 剩余 ${this.remaining}/3`,ready:'宝箱已解锁 · 靠近领取',claimed:'遗迹宝箱 · 已领取'}[this.state];}
    update(game){
        const distance=Math.hypot(game.player.x-this.x,game.player.y-this.y);
        if(this.state==='sealed'&&distance<180&&game.state==='playing'&&game.player.hp>0){
            const spawned=[];
            const types=ForestMap.selected==='snow'?['elite','fast','fast']:ForestMap.selected==='ash'?['elite','tank','exploder']:['elite','tank','tank'];
            for(const [i,[dx,dy]]of [[-220,0],[30,-120],[30,120]].entries()){
                const type=types[i];
                const e=game.enemyManager.spawn(type,this.x+dx,this.y+dy,1,1);
                if(!e){spawned.forEach(a=>{a.active=false;a.ruinGuard=null;});return;}
                e.ruinGuard=this.token;e.combatState='recover';e.combatTimer=1.2;spawned.push(e);
            }
            this.guards=spawned;this.state='guarded';game._announce('遗迹守卫苏醒！击败 3 名守卫解锁宝箱','#ead090');
        }
        if(this.state==='guarded'&&this.remaining===0){this.state='ready';game._announce('遗迹宝箱已解锁，返回领取技能','#e6c77e');}
        if(this.state==='ready'&&distance<85&&game.state==='playing'&&game.player.hp>0){this.state='claimed';game.triggerUpgrade();}
    }
    draw(c,cx,cy,time){
        for(const e of this.guards){if(e.ruinGuard!==this.token||!e.active||e.hp<=0)continue;
            const x=e.x-cx,y=e.y-cy;if(x<-50||y<-50||x>c.canvas.width+50||y>c.canvas.height+50)continue;
            c.save();c.strokeStyle='#e9c77e';c.lineWidth=2;c.beginPath();c.ellipse(x,y+e.size*.5,e.size+5,9,0,0,Math.PI*2);c.stroke();c.restore();
        }
        const x=this.x-cx,y=this.y-cy;if(x<-250||y<-100||x>c.canvas.width+250||y>c.canvas.height+100)return;
        c.save();c.translate(x,y);
        if(this.state==='ready'){c.globalAlpha=.25;ForestArt.oval(c,0,0,45+Math.sin(time*4)*4,25,'#f0d57d',null);c.globalAlpha=1;}
        ForestArt.oval(c,0,14,35,12,'#263a2c',null);
        ForestArt.shape(c,[[-27,-9],[26,-9],[26,15],[-27,15]],'#86613b','#343d2c',3);
        ForestArt.shape(c,[[-27,-9],[-22,-25],[21,-25],[26,-9]],this.state==='claimed'?'#4a4430':'#be944e','#343d2c',3);
        ForestArt.line(c,[[-13,-22],[-13,14]],'#ddbe70',4);ForestArt.line(c,[[13,-22],[13,14]],'#ddbe70',4);
        c.fillStyle=this.state==='claimed'?'#443e29':'#f4dfa0';c.fillRect(-5,-9,10,12);
        c.font='bold 14px "Microsoft YaHei"';c.textAlign='center';const width=c.measureText(this.label).width+16;c.fillStyle='#1b302de8';c.fillRect(-width/2,35,width,23);c.fillStyle='#edd9a0';c.fillText(this.label,0,52);c.restore();
    }
}
