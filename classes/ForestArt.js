/** Original Canvas character art. Drawing never changes combat state. */
class ForestArt {
    static oval(c, x, y, rx, ry, color, outline = '#26332b', width = 1.5) {
        c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
        c.fillStyle = color; c.fill();
        if (outline) { c.strokeStyle = outline; c.lineWidth = width; c.stroke(); }
    }
    static shape(c, points, fill, stroke = '#26332b', width = 1.5) {
        c.beginPath(); points.forEach(([x,y],i) => i ? c.lineTo(x,y) : c.moveTo(x,y));
        c.closePath(); c.fillStyle = fill; c.fill();
        if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
    }
    static line(c, points, color, width = 2) {
        c.beginPath(); points.forEach(([x,y],i) => i ? c.lineTo(x,y) : c.moveTo(x,y));
        c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
    }
    static shadow(c, size, alpha = 0.24) {
        this.oval(c, 0, size * 0.6, size * 0.86, size * 0.24, `rgba(14,27,19,${alpha})`, null);
    }
    static player(c, p, cameraX = 0, cameraY = 0) {
        if(p.blinkTrace){
            const t=p.blinkTrace,fade=Math.max(0,t.life/.28);c.save();c.globalAlpha=fade*.65;
            for(const [x,y]of [[t.x-cameraX,t.y-cameraY],[t.toX-cameraX,t.toY-cameraY]]){
                this.oval(c,x,y-8,18+(1-fade)*20,28,'rgba(83,68,117,.25)','#c0b8ef',2);
                for(let j=0;j<5;j++){const a=j*Math.PI*2/5;this.line(c,[[x+Math.cos(a)*20,y-8+Math.sin(a)*27],[x+Math.cos(a)*28,y-8+Math.sin(a)*38]],'#cfc7f6',1.5);}
            }c.restore();
        }
        c.save(); c.translate(p.x-cameraX,p.y-cameraY);
        if (p.isDashing && p.dashDirection && p.characterId!=='silver') {
            const a=Math.atan2(p.dashDirection.y,p.dashDirection.x);
            c.save();c.rotate(a);
            for(let i=0;i<3;i++) this.oval(c,-16-i*8,7+i*2,5+i*2,3+i,'rgba(183,166,120,.28)',null);
            c.restore();
        }
        const scale = p.size / 20;
        c.scale(scale,scale);
        this.shadow(c,20);
        if(p.isDashing){
            const progress=Number.isFinite(p.dashTimer)&&p.dashDuration>0?Math.max(0,Math.min(1,1-p.dashTimer/p.dashDuration)):((p.animTimer||0)%.2)/.2;
            if(p.characterId==='silver')c.globalAlpha=.25+.75*progress;
            else{
                // Tuck the knees and holster the weapon while rolling, rather than spin a standing sprite.
                c.translate(0,-3);c.rotate(progress*Math.PI*2*(p.dashDirection?.x<0?-1:1));
                this.oval(c,0,-5,15,15,'#4e8074');this.oval(c,-11,-5,7,11,'#82794c');
                this.line(c,[[5,4],[12,7],[7,15],[-3,12]],'#545b45',7);this.oval(c,-4,12,6,3.5,'#493a2d');
                this.oval(c,7,-14,8,8,'#efc38e');this.shape(c,[[0,-17],[2,-24],[10,-25],[16,-20],[14,-17]],'#8a6843');
                this.line(c,[[6,-16],[14,-15]],'#423d32',3);this.oval(c,11,-16,3,2.5,'#8ed1c8');
                this.line(c,[[6,-7],[13,-3],[11,5]],'#98b49a',5);this.line(c,[[-12,0],[-10,8]],'#bcb285',2);
                c.restore();return;
            }
        }
        const intensity = p.runBlend === undefined ? (p.moving || p.isDashing ? 1 : 0) : p.runBlend;
        const cycle = p.walkCycle || 0;
        const stride = Math.sin(cycle) * (p.isDashing ? 10 : 7) * intensity;
        const bob = -Math.abs(Math.sin(cycle))*1.7*intensity + Math.sin(p.animTimer*2.6)*0.7*(1-intensity);
        const hurt = p.hurtTimer > 0;
        if (p.invincibleTimer > 0 && Math.floor(p.animTimer*16)%2) c.globalAlpha = 0.65;
        if (p.hp <= 0) { c.translate(0,8); c.rotate(1.2); }
        const angle = Number.isFinite(p.aimAngle) ? p.aimAngle : 0;
        const face = Math.cos(angle) < 0 ? -1 : 1;
        c.scale(face,1);
        const silver=p.characterId==='silver';
        const skin = hurt ? '#fff3d3' : silver?'#ead3c1':'#efc38e';
        const travel=Math.cos(p.angle === undefined ? angle : p.angle)*face;
        // Each foot lifts on its return stroke; the planted foot supports the hips.
        for (const side of [-1,1]) {
            const swing=stride*side*(travel<-.2?-1:1);
            const lift=Math.max(0,Math.cos(cycle+(side<0?Math.PI:0)))*5*intensity;
            const hip=side*5, foot=side*6+swing;
            this.line(c,[[hip,3],[hip+swing*.4+2,10-lift*.5],[foot,17-lift]],silver?(side<0?'#252d34':'#404b54'):(side<0?'#454c3d':'#66684a'),silver?5.5:6.5);
            this.oval(c,foot+1,17-lift,5.7,3.4,silver?'#242d34':side<0?'#3b342c':'#57432e');
            this.line(c,[[foot-3,19-lift],[foot+5,19-lift]],'#bc9b64',1.4);
            this.line(c,[[foot,15-lift],[foot+3,15-lift]],'#c6ad77',1);
        }
        c.translate((hurt?-2:0)-Math.max(0,p.recoilTimer||0)*(p.weaponType==='shotgun'?10:4),bob);
        c.rotate((p.isDashing?.25:.055)*travel*intensity);
        if (p.isDashing) c.translate(travel*3,2);
        if(silver)this.silverOutfit(c,p,skin,hurt,cycle,intensity);
        else {
        // Backpack, rolled blanket and scarf have their own follow-through.
        this.oval(c,-10,-7,8,12,'#756f44');
        this.line(c,[[-15,-14],[-16,-3]],'#b4b078',3);
        this.shape(c,[[-17,-6],[-10,-5],[-10,2],[-16,1]],'#8f8956');
        this.oval(c,-13,-3,1.2,1.2,'#dfc488',null);
        this.oval(c,-12,-19,8,4,'#aab287');
        this.shape(c,[[-5,-16],[-23-(p.isDashing?9:0),-12+Math.sin(cycle-1)*3*intensity],[-18,-7],[-5,-10]],'#c5633d');
        this.shape(c,[[-10,-13],[7,-13],[11,2],[7,8],[-8,8],[-12,-1]],hurt?'#fff0c1':'#4e8074');
        this.shape(c,[[-9,-12],[-4,-12],[-2,5],[-8,4]],'#8eb29a',null);
        this.line(c,[[-9,4],[9,4]],'#704d32',4);
        this.oval(c,2,4,2.3,2.3,'#e7bb60',null);
        this.line(c,[[-7,-12],[-4,0]],'#b8af76',2.3);
        this.shape(c,[[5,1],[11,1],[11,7],[5,7]],'#8d6b43');
        // Face, hair, leather cap and two individually highlighted lenses.
        this.oval(c,1,-23,11,10,skin);
        this.oval(c,11,-21,3.4,3.1,skin);
        this.shape(c,[[-10,-23],[-11,-31],[-6,-36],[6,-36],[12,-29],[10,-26],[3,-29],[-4,-26]],'#634837');
        this.shape(c,[[-12,-29],[-10,-36],[-4,-39],[8,-37],[13,-31],[8,-28]],'#8a6843');
        this.line(c,[[-7,-35],[6,-34]],'#bda16a',2);
        this.line(c,[[-10,-27],[11,-27]],'#423d32',4);
        this.oval(c,-2,-27,5,4,'#73c5c1');
        this.oval(c,8,-27,4.2,3.7,'#98d9cc');
        this.line(c,[[-4,-29],[-1,-29]],'#eaffdb',1.4);
        this.line(c,[[6,-29],[8,-29]],'#eaffdb',1.2);
        this.line(c,[[3,-18],[7,-18]],'#9a674c',1.3);
        this.shape(c,[[-8,-15],[9,-16],[8,-11],[-6,-10]],'#da7747');
        }
        // Gun pivots independently of movement. Muzzle flash follows the same aim.
        c.save(); c.translate(6,-6);
        c.rotate(Math.atan2(Math.sin(angle),Math.abs(Math.cos(angle))));
        const recoil=p.recoilTimer||0;
        if(p.weaponType==='fireball')c.rotate(-.3*(p.chargeLevel||0)+Math.sin(Math.min(1,recoil/.18)*Math.PI)*.2);
        else if(p.weaponType==='shotgun')c.rotate(-Math.sin(Math.min(1,recoil/.22)*Math.PI)*.15);
        c.translate(-Math.max(0,p.recoilTimer||0)*22,0);
        if(p.chargeLevel>0){c.save();c.globalAlpha=p.chargeLevel*.55;this.oval(c,30,-6,8+p.chargeLevel*7,8+p.chargeLevel*7,'#f5c978',null);c.restore();}
        if(['pistol','shuriken','dark'].includes(p.weaponType))this.silverWeapon(c,p,skin);
        else {
        // Supporting forearm follows the barrel, so both hands stay on the weapon.
        this.line(c,[[-12,-2],[-7,8],[14,4]],silver?'#35434a':'#3d625b',6);
        this.line(c,[[-6,8],[14,4]],skin,4);
        if(p.weaponType==='fireball') {
            this.line(c,[[-7,5],[28,-3]],'#6f5038',6);
            this.line(c,[[-5,3],[27,-5]],'#ba9761',2);
            this.shape(c,[[21,-3],[24,-15],[33,-18],[39,-7],[32,3]],'#a97843');
            this.oval(c,30,-7,7,8,'#f6ad51','#efd18a',1.5);
            this.shape(c,[[27,-6],[30,-14],[33,-7],[31,-2]],'#fff1bd',null);
            if(p.muzzleFlash>0) this.oval(c,31,-7,13,12,'rgba(255,195,95,.35)',null);
        } else {
        this.shape(c,[[-5,-4],[4,-3],[5,5],[-3,6],[-7,1]],'#8f6041');
        this.shape(c,[[0,-5],[17,-5],[18,1],[1,2]],'#526562');
        this.line(c,[[5,-5],[19,-5]],'#bec9aa',2);
        this.shape(c,[[16,-4],[28,-4],[28,0],[16,0]],'#394c47');
        this.line(c,[[25,-5],[25,1]],'#d9be73',3);
        if(p.weaponType==='shotgun') {
            this.shape(c,[[7,-6],[31,-6],[31,3],[7,3]],'#665c48');
            this.line(c,[[9,-5],[30,-5]],'#c6bd95',2);
            this.line(c,[[9,1],[30,1]],'#aea788',2);
            this.shape(c,[[10,3],[22,3],[22,7],[10,7]],'#9b673c');
            if(p.muzzleFlash>0) this.shape(c,[[31,-4],[44,-12],[41,-2],[50,2],[41,4],[44,11],[31,3]],'#f7ba63',null);
        }
        }
        this.oval(c,2,3,4,3.2,skin);
        if(p.weaponPath==='heavy'){this.line(c,[[4,-8],[31,-8]],'#b6ac81',4);this.oval(c,10,-10,3,3,'#bf7843');}
        if(p.weaponPath==='rapid')this.shape(c,[[1,5],[10,5],[8,13],[0,12]],'#535d4b');
        if(p.weaponPath==='focus')this.line(c,[[28,-4],[37,-4]],'#aead88',5);
        if(p.weaponPath==='wide')this.line(c,[[26,-9],[26,7]],'#aa8760',4);
        this.oval(c,15,2,3.5,2.7,skin);
        this.line(c,[[14,1],[16,1]],'#fff0bc',1);
        if (p.muzzleFlash>0 && p.weaponType!=='fireball') {
            this.shape(c,[[28,-2],[37,-7],[34,-2],[42,0],[34,2],[36,6],[28,1]],'#ffca63','#e4933d',1);
            this.oval(c,31,-1,5,2,'#fff6ca',null);
        }
        }
        c.restore();
        if (p.shield>0) { c.strokeStyle='#a5e2d0'; c.lineWidth=1.5; c.beginPath(); c.ellipse(0,-8,25,34,0,0,Math.PI*2); c.stroke(); }
        c.restore();
    }
    static silverWeapon(c,p,skin){
        const cast=Math.sin(Math.min(1,(p.recoilTimer||0)/.09)*Math.PI);
        if(p.weaponType!=='pistol'){c.rotate(-.35*cast);c.translate(-cast*3,-cast*2);}
        this.line(c,[[-9,-2],[-2,4],[11,1]],'#35434a',6);this.oval(c,10,1,3.5,3,skin);
        if(p.weaponType==='pistol'){
            this.shape(c,[[8,-4],[13,-4],[14,7],[9,8],[7,3]],'#34343a');
            this.shape(c,[[8,-9],[27,-9],[29,-4],[10,-3]],'#65777a');
            this.line(c,[[11,-9],[26,-9]],'#cedbd1',1.8);this.line(c,[[24,-8],[24,-4]],'#363c45',3);
            if(p.muzzleFlash>0)this.shape(c,[[28,-7],[40,-12],[36,-6],[44,-3],[34,-2],[28,-4]],'#ffe2a2',null);
        }else if(p.weaponType==='shuriken'){
            c.save();c.translate(16,-2);c.rotate(-cast*2);
            for(let j=0;j<4;j++){c.rotate(Math.PI/2);this.shape(c,[[0,-2],[11,-4],[4,2],[0,3]],'#cadbd6','#485d67',1);}
            this.oval(c,0,0,2,2,'#42495c',null);c.restore();
        }else{
            this.shape(c,[[12,3],[14,-13],[25,-17],[32,-9],[26,2]],'#433b58','#bdafcf',1.5);
            this.oval(c,22,-7,5,6,'#b5a3e2',null);this.oval(c,23,-8,2,3,'#eee4ff',null);
            if(p.muzzleFlash>0||p.recoilTimer>0){c.strokeStyle='#c1a8ef';c.lineWidth=1.6;c.beginPath();c.ellipse(23,-7,17+cast*4,13,cast,0,Math.PI*2);c.stroke();}
        }
    }
    static silverOutfit(c,p,skin,hurt,cycle,intensity){
        const sway=Math.sin(cycle-.8)*intensity*4+Math.sin((p.animTimer||0)*2)*1.5;
        // White tied hair and split coat tails follow the body's motion.
        this.shape(c,[[-6,-32],[-17,-31],[-22-sway,-21],[-18-sway,-9],[-11-sway,-16],[-12,-27]],'#c6d5d3');
        this.line(c,[[-16,-29],[-18-sway,-20],[-16-sway,-14]],'#f1f1df',2);
        this.shape(c,[[-10,-9],[-18-sway,15],[-6,10],[0,-3]],'#283940');
        this.shape(c,[[2,-8],[11,1],[15-sway,14],[3,10]],'#354a50');
        this.line(c,[[-15-sway,12],[-7,8]],'#9ab7b3',1.3);
        this.shape(c,[[-8,-15],[6,-15],[10,-5],[6,5],[-6,5],[-10,-5]],hurt?'#eaf0db':'#303d46');
        this.shape(c,[[-8,-14],[-3,-13],[0,-3],[-5,2],[-9,-5]],'#607b7d');
        this.shape(c,[[1,-14],[6,-15],[9,-5],[4,-3]],'#465c65');
        this.line(c,[[-6,4],[7,4]],'#8e8063',3);this.oval(c,2,4,2,2,'#d0d9bf',null);
        this.shape(c,[[5,2],[11,3],[10,10],[5,9]],'#333438');
        this.line(c,[[-7,-11],[6,2]],'#a0b5aa',1.8);
        this.oval(c,0,-24,10,11,skin);this.oval(c,10,-22,2.5,3,skin);
        this.shape(c,[[-11,-24],[-12,-33],[-7,-40],[3,-42],[11,-35],[12,-27],[7,-31],[3,-30],[-1,-34],[-6,-25],[-7,-18]],'#dbe5df');
        this.shape(c,[[-8,-35],[-2,-40],[7,-36],[2,-34],[-3,-29]],'#faf8e9',null);
        this.line(c,[[0,-37],[-3,-30]],'#a8bfc0',1);
        this.line(c,[[3,-27],[8,-28]],'#343e47',1.4);this.oval(c,6,-26,1.4,1.8,'#82c5bf',null);
        this.shape(c,[[-7,-23],[1,-21],[10,-23],[9,-16],[2,-13],[-5,-16]],'#232e36');
        this.line(c,[[-3,-19],[6,-18]],'#6c8389',1);
        this.shape(c,[[-6,-15],[8,-15],[6,-10],[-6,-11]],'#4b7172');
        this.shape(c,[[-7,-14],[-24-(p.isDashing?12:0),-9+sway],[-19,-5+sway],[-4,-10]],'#6e9793');
        this.oval(c,11,-20,1.2,1.8,'#d2c691',null);
    }
    static enemy(c,e,cameraX=0,cameraY=0,death=0) {
        c.save(); c.translate(e.x-cameraX,e.y-cameraY);
        this.shadow(c,e.size,.24*(1-death));
        if (death) {
            c.globalAlpha*=Math.max(0,1-death);
            const direction=Number.isFinite(e.hurtAngle)?Math.cos(e.hurtAngle):Math.cos(e.angle);
            c.translate(death*direction*18,death*8);
            if(e.type==='tank'||e.type==='elite') {
                c.translate(0,death*10);c.rotate(direction*death*.45);c.scale(1+death*.12,1-death*.55);
            } else if(e.type==='fast') {
                c.rotate(direction*death*.8);c.scale(1+death*.2,1-death*.6);
            } else if(e.type==='exploder' && e.detonated) {
                c.scale(1+death*.7,1+death*.4);
            } else {
                c.rotate(direction*death*1.5);c.scale(1-death*.25,1-death*.3);
            }
        }
        if((e.impactTimer||e.hitFlash)>0 && !death) {
            const recoil=Math.sin(Math.min(1,(e.impactTimer||e.hitFlash)/.18)*Math.PI)*(e.impactStrength||1);
            const heavy=e.type==='tank'||e.type==='elite';
            const kick=recoil*(heavy?2:6);
            c.translate(Math.cos(e.hurtAngle||0)*kick,Math.sin(e.hurtAngle||0)*kick);
            // Visual deformation only: heavy armor rocks, beasts flinch, caps compress.
            if(heavy)c.rotate(Math.cos(e.hurtAngle||0)*recoil*.045);
            else if(e.type==='fast'){c.rotate(Math.cos(e.hurtAngle||0)*recoil*.12);c.scale(1+recoil*.08,1-recoil*.08);}
            else c.scale(1+recoil*.14,1-recoil*.13);
        }
        const scale=e.size/18;
        c.scale((Math.cos(e.angle)<0?-1:1)*scale,scale);
        const state=e.combatState || 'approach';
        const cfg=typeof EnemyConfig!=='undefined' ? EnemyConfig.ATTACKS[e.type] : null;
        const windup=cfg && state==='windup' ? Math.max(0,Math.min(1,1-e.combatTimer/cfg.windup)) : 0;
        const strike=cfg && state==='strike' ? Math.max(0,Math.min(1,1-e.combatTimer/cfg.strike)) : 0;
        const recovery=cfg && state==='recover' ? Math.max(0,Math.min(1,1-e.combatTimer/cfg.recover)) : 0;
        const resting=state==='windup'||state==='recover'||death>0;
        const motion=resting?0:e.locomotion===undefined?1:e.locomotion;
        const t=e.animTimer || 0;
        const hurt=e.hitFlash>0;
        const attack=Math.max(0,e.attackPose||0)/0.24;
        c.translate(attack*2,0);
        if (hurt) c.rotate(-0.06);
        if(state==='windup' && (e.type==='normal'||e.type==='fast')) {
            const squeeze=windup*(e.type==='fast'?.24:.22);
            c.translate(-windup*3,12*squeeze);c.scale(1+squeeze*.45,1-squeeze);
        }
        if(e.type==='exploder' && state==='windup') {
            const pulse=Math.sin(windup*windup*65)*.035*windup;
            c.translate(Math.sin(windup*75)*windup, -windup*3);
            c.scale(1+windup*.35+pulse,1+windup*.22+pulse);
        }
        if(state==='strike') {
            if(e.type==='normal') {c.translate(0,-Math.sin(strike*Math.PI)*12);c.rotate(.15);}
            else if(e.type==='fast') {c.translate(0,4);c.scale(1.18,.74);}
            else if(e.type==='tank') {c.translate(0,3);c.scale(1.08,.88);}
        }
        if(state==='recover') {c.translate(0,2*(1-recovery));c.rotate(.06*(1-recovery));}
        if(!death && state==='approach') c.translate(0,Math.sin(t*2.5)*.4);
        if(e.type==='fast') this.crawler(c,t,hurt,attack,motion);
        else if(e.type==='tank') this.brute(c,t,hurt,attack,false,windup,motion);
        else if(e.type==='elite') this.brute(c,t,hurt,attack,true,windup,motion,state,strike,recovery);
        else this.mushroom(c,t,hurt,e.type==='exploder',attack,motion,windup,death);
        if(e.frozen) {
            this.shape(c,[[-21,12],[-22,-12],[-10,-34],[10,-35],[22,-13],[20,13]],'rgba(70,170,255,.34)','#8ce5ff',2);
            this.line(c,[[-10,-34],[-5,-14],[-15,2],[-6,11]],'#cce8df',1);
            this.line(c,[[10,-35],[5,-16],[16,-8],[10,10]],'#a9d2d3',1);
            this.shape(c,[[-24,12],[-23,1],[-16,12]],'#acd1d5','#719c9e',.7);
            this.shape(c,[[15,12],[20,-2],[25,12]],'#c4dfdc','#719c9e',.7);
        }
        if(e.burnStacks>0) {
            for(let i=0;i<4;i++){const fx=-12+i*8,tip=17+Math.sin(t*9+i*2)*6;this.shape(c,[[fx-3,10],[fx-4,3],[fx,10-tip],[fx+2,4],[fx+4,10]],'#ff7433',null);}
            this.oval(c,Math.sin(t*4)*12,-15-(t*20)%17,1.3,2,'#ffe18a',null);
        }
        if(e.paralyzed) {
            const spark=Math.sin(t*24)*4;
            this.line(c,[[-17,-27+spark],[-7,-22],[0,-29],[7,-21],[18,-25-spark]],'#fff3ab',1.7);
            this.line(c,[[-19,-23],[-24,-13],[-18,-14],[-22,-5]],'#ffe650',3);
            this.line(c,[[22,-20],[18,-10],[24,-12],[20,-2]],'#ffe650',3);
        }
        c.restore();
        if(!death && e.hp<e.maxHp) {
            const x=e.x-cameraX, y=e.y-cameraY-e.size*2;
            c.fillStyle='#253c32'; c.fillRect(x-16,y,32,4);
            c.fillStyle='#eab766'; c.fillRect(x-15,y+1,30*Math.max(0,e.hp/e.maxHp),2);
        }
    }
    static mushroom(c,t,hurt,exploder,attack,motion=1,windup=0,death=0) {
        const step=Math.sin(t*(exploder?11:8))*motion,hop=Math.abs(step)*2.3;
        const body=hurt?'#fff4d2':exploder?'#d8b463':'#d2d398';
        this.line(c,[[-5,6],[-7+step*4,12]],'#888250',4);
        this.line(c,[[5,6],[8-step*4,12]],'#888250',4);
        this.oval(c,-7+step*4,12-Math.max(0,step)*2,5.5,3.5,'#777647');
        this.oval(c,8-step*4,12-Math.max(0,-step)*2,5.5,3.5,'#777647');
        c.save(); c.translate(0,-hop);
        this.line(c,[[-10,-3],[-16,-1+step*2],[-17,3]],body,4);
        this.line(c,[[10,-3],[16+attack*5,-4-step*2],[18+attack*5,0]],body,4);
        this.oval(c,0,0,11,13,body);
        this.oval(c,-3,1,5,9,'#e7e6b7',null);
        c.save();c.translate(Math.sin(t*8-.5)*motion*1.2-death*10,-death*13);
        c.rotate(Math.sin(t*8)*motion*.025-death*.5);
        this.oval(c,0,-11,20,6,exploder?'#835130':'#805c42');
        for(let i=-12;i<=12;i+=6) this.line(c,[[i,-12],[i*.65,-6]],'#c7aa70',.8);
        c.beginPath(); c.moveTo(-21,-12); c.bezierCurveTo(-20,-36,17,-37,22,-12); c.quadraticCurveTo(0,-2,-21,-12);
        c.fillStyle=hurt?'#fff5dc':exploder?'#db8c3b':'#bf694e'; c.fill(); c.strokeStyle='#503f31';c.lineWidth=1.7;c.stroke();
        this.oval(c,-8,-22,5,3,'#f5dba0',null);
        this.oval(c,8,-18,4,3,'#f3d398',null);
        this.oval(c,3,-28,3.4,2,'#f6dfa9',null);
        this.line(c,[[-12,-12],[0,-9],[14,-12]],'#d5a477',1.2);
        this.line(c,[[-15,-23],[-10,-28],[-3,-30]],exploder?'#f1bb63':'#e39872',2.2);
        if(exploder) {
            this.line(c,[[-11,-15],[-7,-20],[-10,-25]],'#804f2e',1.5);
            this.line(c,[[10,-13],[8,-20],[13,-24]],'#804f2e',1.5);
            this.shape(c,[[0,-32],[-3,-39],[3,-37],[7,-42],[8,-35]],'#92a75b');
        }
        c.restore();
        this.oval(c,-3,-3,2.2,3.4,'#333e2b',null); this.oval(c,6,-3,2.2,3.4,'#333e2b',null);
        this.oval(c,-3.5,-4,0.8,1,'#ffffde',null); this.oval(c,5.5,-4,0.8,1,'#ffffde',null);
        this.line(c,[[0,4],[3,5],[5,3]],'#8b774d',1.2);
        if(exploder) {
            const hot=windup>0 && Math.sin(windup*windup*65)>0;
            this.oval(c,1,5,6+Math.sin(t*10)*0.5,5,hot?'#fff4ba':'#f5a548','#92552a');
            this.line(c,[[-2,2],[1,6],[4,2]],'#fff1ad',1.3);
            for(const side of [-1,1]) this.oval(c,side*10,2,3,4,hot?'#ffe397':'#c07a36');
            if(windup>0) for(let i=0;i<3;i++) {
                const a=t*4+i*2.1;
                this.oval(c,Math.sin(a)*15,-34-(t*18+i*9)%17,1.5,2.3,'#ffd080',null);
            }
        }
        c.restore();
    }
    static crawler(c,t,hurt,attack,motion=1) {
        const step=Math.sin(t*15)*6*motion;
        const hide=hurt?'#fff5d9':'#81969a';
        // Four alternating paws and a springing back distinguish the fast enemy.
        this.line(c,[[-10,0],[-14-step*.5,5],[-13+step,11]],'#485e66',5);
        this.line(c,[[10,0],[13+step*.5,6],[14-step,11]],'#485e66',5);
        const tail=Math.sin(t*9-.7)*3*motion;
        this.shape(c,[[-13,-4],[-25,-15+tail],[-28,-8+tail],[-22,-4],[-16,4]],hide);
        this.oval(c,-2,-3-Math.abs(step)*.2,16,9,hide);
        this.line(c,[[-10,3],[-7+step*.5,8],[-5-step,12]],hide,6);
        this.line(c,[[10,3],[9-step*.5,8],[11+step,12]],hide,6);
        for(const [x,y] of [[-5-step,12-Math.max(0,step)*.4],[11+step,12-Math.max(0,-step)*.4]]) {
            this.oval(c,x,y,4.3,2.5,'#b1b7a8');
            this.line(c,[[x+2,y],[x+4,y+1]],'#ecdfbc',1.4);
        }
        this.shape(c,[[-6,-12],[-2,-18],[2,-13],[5,-17],[10,-9],[6,-3]],'#526c72');
        this.oval(c,12,-10,11,10,hide);
        this.shape(c,[[3,-15],[2,-28],[12,-19]],'#71828b');
        this.shape(c,[[12,-18],[20,-28],[22,-12]],'#71828b');
        this.shape(c,[[5,-17],[5,-24],[10,-19]],'#c49e91',null);
        this.oval(c,20,-5,8,5,'#ccceb6');
        this.oval(c,26,-7,3,2.5,'#354a4b');
        this.oval(c,14,-12,3,3.3,'#e3bd66'); this.oval(c,15,-12,1.2,2.2,'#283d3e',null);
        this.line(c,[[18,-1],[25,0]],'#30474b',1.3);
        this.shape(c,[[19,-1],[21,4+attack*3],[23,-1]],'#f4e6bb',null);
        this.line(c,[[-8,-9],[-3,-12],[3,-10]],'#b3c1b8',2.4);
        this.line(c,[[6,-14],[12,-16]],'#425b60',2);
        this.oval(c,14,-13,1,1,'#fff6d2',null);
    }
    static brute(c,t,hurt,attack,elite=false,windup=0,motion=1,state='approach',strike=0,recovery=0) {
        const step=Math.sin(t*(elite?5.8:4.4))*3*motion;
        const hide=hurt?'#fff0d0':elite?'#857888':'#849070';
        this.line(c,[[-9,4],[-10+step,12]],'#596651',10);
        this.line(c,[[10,4],[11-step,12]],'#596651',10);
        this.oval(c,-9+step,13-Math.max(0,step),8,5,'#465447');
        this.oval(c,11-step,13-Math.max(0,-step),8,5,'#465447');
        c.save(); c.translate(0,-Math.abs(step)*.5);
        this.oval(c,0,-3,20,19,hide);
        this.oval(c,2,1,12,12,elite?'#b8a69a':'#b5b58a');
        if(elite) {
            this.shape(c,[[-15,-13],[15,-13],[12,4],[0,9],[-12,4]],'#666276');
            this.line(c,[[-12,-10],[0,3],[12,-10]],'#c8ad72',2);
            this.oval(c,0,-4,3,4,'#72bfb0');
            this.shape(c,[[-11,7],[12,7],[16,17],[0,13],[-13,17]],'#766277');
        } else {
            this.line(c,[[-5,-4],[0,0],[-2,7]],'#8c946f',1.4);
            this.line(c,[[8,0],[5,5],[8,8]],'#8c946f',1.2);
        }
        const lift=(elite?0:windup)*46;
        this.line(c,[[-15,-9],[-25,-1-step-lift*.55],[-22,9-step-lift]],hide,9);
        this.oval(c,-23,8-step-lift,6,6,'#677761');
        if(!elite) {
            this.line(c,[[15,-9],[25+attack*6,-2+step-lift*.55],[23+attack*6,8+step-lift]],hide,9);
            this.oval(c,24+attack*6,8+step-lift,6,6,'#677761');
        }
        for(const side of [-1,1]) this.shape(c,[[side*10,-16],[side*18,-23],[side*26,-14],[side*22,-7],[side*12,-8]],elite?'#777888':'#6b7e79');
        for(const side of [-1,1]) {
            this.line(c,[[side*13,-15],[side*18,-19],[side*23,-14]],elite?'#b1a3b2':'#a5b399',1.5);
            this.line(c,[[side*18,-17],[side*17,-12],[side*21,-10]],'#425953',1.2);
            this.line(c,[[side*8,14-Math.max(0,-side*step)],[side*14,14-Math.max(0,-side*step)]],'#bdba92',1.4);
        }
        this.oval(c,3,-20,14,12,hide);
        this.oval(c,7,-14,12,7,'#b3b18a');
        this.oval(c,9,-15,6,4,'#667459');
        this.oval(c,6,-15,1.3,1.5,'#3b4c3b',null); this.oval(c,12,-15,1.3,1.5,'#3b4c3b',null);
        this.shape(c,[[-4,-13],[-9,-20],[-7,-8],[0,-8]],'#e9d9a4');
        this.shape(c,[[13,-10],[21,-17],[19,-7],[13,-6]],'#e9d9a4');
        this.line(c,[[-6,-24],[0,-22]],'#344737',3); this.line(c,[[9,-24],[15,-26]],'#344737',3);
        this.oval(c,-1,-21,2,2,'#f2c674',null); this.oval(c,12,-23,2,2,'#f2c674',null);
        this.shape(c,[[-12,-29],[-16,-39],[-6,-31]],'#d9c38f');
        this.shape(c,[[11,-31],[21,-40],[18,-26]],'#d9c38f');
        if(elite) {
            this.shape(c,[[-8,-31],[-11,-44],[-2,-38],[4,-48],[9,-38],[17,-43],[14,-31]],'#d3a558');
            this.oval(c,4,-35,3,4,'#6bbdad');
            // A shoulder-mounted axe follows a full windup, sweep and return.
            let swing=-.12+Math.sin(t*5.8)*motion*.09;
            if(state==='windup') swing=-windup*1.6;
            else if(state==='strike') swing=-1.6+strike*3.5;
            else if(state==='recover') swing=1.9*(1-recovery)-.12*recovery;
            c.save();c.translate(18,-10);c.rotate(swing);
            this.line(c,[[0,0],[10,9],[16,2]],hide,8);
            this.line(c,[[15,16],[17,-23]],'#594c39',5);
            this.line(c,[[16,10],[17,-19]],'#af9460',1.5);
            this.shape(c,[[16,-24],[33,-29],[37,-20],[31,-9],[18,-7],[21,-17]],'#adbdb1','#354b47',1.7);
            this.line(c,[[34,-24],[33,-17],[29,-12]],'#f0e2b6',2.2);
            this.oval(c,17,-16,2.5,3,'#72bfb0');
            this.oval(c,16,4,5,4.5,hide);
            c.restore();
        }
        c.restore();
    }
    static telegraph(c,e,cameraX=0,cameraY=0) {
        if (e.combatState!=='windup' || e.hp<=0) return;
        const cfg=EnemyConfig.ATTACKS[e.type];
        if(!cfg) return;
        const p=Math.max(0,Math.min(1,1-e.combatTimer/cfg.windup));
        c.save();
        if(e.type==='elite') {
            c.translate(e.attackStartX-cameraX,e.attackStartY-cameraY);c.rotate(e.attackAngle);
            c.beginPath();c.moveTo(0,0);c.arc(0,0,cfg.radius,-cfg.halfArc,cfg.halfArc);c.closePath();
            c.fillStyle='rgba(193,171,226,.16)';c.fill();c.strokeStyle='#d2c0e6';c.lineWidth=2;c.stroke();
            c.beginPath();c.arc(0,0,cfg.radius*p,-cfg.halfArc,cfg.halfArc);c.strokeStyle='#f1d9a0';c.lineWidth=3;c.stroke();
            this.line(c,[[cfg.radius-12,-6],[cfg.radius,0],[cfg.radius-12,6]],'#ead6ad',2);
        } else if(e.type==='tank'||e.type==='exploder') {
            c.translate(e.attackX-cameraX,e.attackY-cameraY);
            c.beginPath();c.arc(0,0,cfg.radius,0,Math.PI*2);
            c.fillStyle='rgba(239,137,74,.13)';c.fill();c.strokeStyle='#f9ba7b';c.lineWidth=2;c.stroke();
            c.beginPath();c.arc(0,0,cfg.radius*p,0,Math.PI*2);c.fillStyle='rgba(246,150,73,.21)';c.fill();
            c.beginPath();c.arc(0,0,cfg.radius+4,-Math.PI/2,-Math.PI/2+p*Math.PI*2);c.strokeStyle='#ffdea0';c.lineWidth=3;c.stroke();
            this.line(c,[[-8,0],[8,0]],'#f5d59b',2);this.line(c,[[0,-8],[0,8]],'#f5d59b',2);
            if(e.type==='exploder') {
                c.strokeStyle=`rgba(255,225,164,${.35+p*.5})`;c.lineWidth=1.5;c.setLineDash([5,5]);
                c.beginPath();c.arc(0,0,cfg.radius+8,0,Math.PI*2);c.stroke();
            }
        } else {
            c.translate(e.attackStartX-cameraX,e.attackStartY-cameraY);c.rotate(e.attackAngle);
            c.beginPath();c.roundRect(-cfg.radius,-cfg.radius,cfg.distance+cfg.radius*2,cfg.radius*2,cfg.radius);
            c.fillStyle='rgba(231,205,133,.11)';c.fill();c.strokeStyle=e.type==='fast'?'#f3ce7c':'#dccc8b';c.lineWidth=1.5;c.stroke();
            this.line(c,[[0,0],[cfg.distance*p,0]],'rgba(255,223,150,.7)',2.5);
            this.line(c,[[cfg.distance-9,-6],[cfg.distance,0],[cfg.distance-9,6]],'#ffdea0',2);
        }
        c.restore();
    }
    static impact(c,m,cameraX=0,cameraY=0) {
        const p=1-m.life/m.duration;
        c.save();c.translate(m.x-cameraX,m.y-cameraY);c.globalAlpha=Math.max(0,1-p);
        if(['rifle-hit','armor-hit','shotgun-hit','ember-hit'].includes(m.kind)) {
            c.rotate(m.angle||0);
            const heavy=m.kind==='shotgun-hit',armor=m.kind==='armor-hit',fire=m.kind==='ember-hit';
            const size=heavy?28:armor?17:14,color=fire?'#ffac50':armor?'#e4dbb2':'#d5b17c';
            // Compact impact core and directional fragments, rather than a generic X.
            if(p<.35)ForestArt.shape(c,[[-5,-4],[5,-2],[9,0],[3,5],[-4,3]],fire?'#ffdf85':'#fff0c5',null);
            for(let i=0;i<(heavy?9:5);i++){
                const a=(i/(heavy?8:4)-.5)*2.7,dist=4+p*size*1.6,fx=Math.cos(a)*dist,fy=Math.sin(a)*dist+p*p*9;
                c.save();c.translate(fx,fy);c.rotate(i+p*5);
                if(armor)ForestArt.line(c,[[0,0],[6*(1-p),0]],color,1.5);
                else ForestArt.shape(c,[[-2,-1],[2,-2],[3,1],[-1,2]],color,null);
                c.restore();
            }
            if(heavy){c.globalAlpha*=.28;ForestArt.oval(c,10+p*18,0,6+p*20,5+p*14,'#c5ac80',null);}
        } else if(m.kind==='dark-burst'){
            const r=m.radius*(.2+p*.8);this.oval(c,0,0,r,r,'rgba(88,61,126,.22)','#c0a9e4',2);
            c.rotate(p*2);for(let j=0;j<6;j++){const a=j*Math.PI/3;this.line(c,[[Math.cos(a)*r*.6,Math.sin(a)*r*.6],[Math.cos(a+.2)*r,Math.sin(a+.2)*r]],'#d7c5f0',2);}
        } else if(m.kind==='sweep') {
            c.rotate(m.angle||0);
            const halfArc=EnemyConfig.ATTACKS.elite.halfArc;
            c.beginPath();c.arc(0,0,m.radius,-halfArc,-halfArc+2*halfArc*Math.min(1,p*2+.2));
            c.strokeStyle='#e4d7b1';c.lineWidth=9*(1-p)+2;c.stroke();
            c.beginPath();c.arc(0,0,m.radius*.87,-halfArc,halfArc);
            c.strokeStyle='#a3bdaa';c.lineWidth=3;c.stroke();
        } else if(m.kind==='burst') {
            this.oval(c,0,0,m.radius*(.4+p),m.radius*(.4+p),'rgba(230,163,77,.2)',null);
            c.strokeStyle='#ffd994';c.lineWidth=5*(1-p)+1;c.beginPath();c.arc(0,0,m.radius*(.3+p*.8),0,Math.PI*2);c.stroke();
            for(let i=0;i<9;i++) {
                const a=i*Math.PI*2/9, r=m.radius*(.2+p);
                this.oval(c,Math.cos(a)*r,Math.sin(a)*r,3*(1-p)+1,3*(1-p)+1,'#f6d599',null);
            }
        } else if(m.kind==='slam') {
            c.strokeStyle='#e1bd7e';c.lineWidth=4*(1-p)+1;c.beginPath();c.arc(0,0,m.radius*(.35+p*.8),0,Math.PI*2);c.stroke();
            for(let i=0;i<8;i++) {const a=i*Math.PI/4;c.save();c.rotate(a);this.line(c,[[12,0],[28,3],[m.radius*.75,0]],'#c9a574',2);c.restore();}
        } else {
            c.rotate(m.angle||0);
            const size=(m.kind==='crit'?25:12)*(1+p*.3);
            this.line(c,[[-size,-size*.4],[size,size*.4]],m.kind==='crit'?'#ffce71':'#fff1c3',m.kind==='crit'?3:2);
            this.line(c,[[-size*.35,size*.65],[size*.35,-size*.65]],'#fff3c5',2);
            if(m.kind==='crit') {c.strokeStyle='#ffd080';c.lineWidth=2;c.beginPath();c.arc(0,0,size*.65,0,Math.PI*2);c.stroke();}
        }
        c.restore();
    }
    static terrain(c,cameraX,cameraY,w,h) {
        // Cache a seamless illustrated tile; no per-frame grass/path generation.
        if(!this.tile) {
            const tile=document.createElement('canvas'); tile.width=tile.height=512;
            const g=tile.getContext('2d'); g.fillStyle='#526d52';g.fillRect(0,0,512,512);
            for(const tx of [-512,0,512]) for(const ty of [-512,0,512]) {
            g.save();g.translate(tx,ty);
            let seed=715;
            const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
            for(let i=0;i<110;i++) {
                const x=random()*512,y=random()*512;
                this.oval(g,x,y,8+random()*33,3+random()*12,['#597657','#577352','#4d684d','#607952'][i%4],null);
            }
            for(let i=0;i<260;i++) {
                const x=random()*512,y=random()*512;
                this.line(g,[[x-3,y+2],[x-1,y-3],[x,y+1],[x+4,y-5]],i%3?'#6b855d':'#405c48',1);
            }
            for(let i=0;i<24;i++) {
                const x=12+random()*488,y=12+random()*488;
                this.oval(g,x,y,4+random()*5,2+random()*2,'#7d8c73','#4c6251',.8);
                if(i%3===0) {this.oval(g,x+8,y-4,2,2,'#d5be78',null);this.oval(g,x+11,y,1.7,1.7,'#dbcea0',null);}
            }
            g.restore();
            }
            this.tile=tile;
        }
        const x0=Math.floor(-((cameraX%512)+512)%512), y0=Math.floor(-((cameraY%512)+512)%512);
        for(let y=y0;y<h;y+=512) for(let x=x0;x<w;x+=512)c.drawImage(this.tile,x,y);
        // Broken stone wayfinding rings anchor the clearing without creating fake walls.
        const cell=760;
        for(let gy=Math.floor(cameraY/cell);gy<=(cameraY+h)/cell;gy++) {
            for(let gx=Math.floor(cameraX/cell);gx<=(cameraX+w)/cell;gx++) {
                const x=gx*cell+250-cameraX,y=gy*cell+280-cameraY;
                c.save();c.translate(x,y);c.scale(1,.62);
                c.strokeStyle='rgba(194,190,139,.18)';c.lineWidth=12;c.setLineDash([28,8]);
                c.beginPath();c.arc(0,0,70,0,Math.PI*2);c.stroke();c.restore();
            }
        }
        const v=c.createRadialGradient(w/2,h/2,120,w/2,h/2,w*.68);
        v.addColorStop(0,'rgba(19,38,27,0)');v.addColorStop(1,'rgba(15,30,22,.35)');
        c.fillStyle=v;c.fillRect(0,0,w,h);
    }
    static start(c,w,h,t) {
        this.terrain(c,0,0,w,h);
        c.fillStyle='rgba(17,32,26,.58)';c.fillRect(0,0,w,h);
        c.save();c.textAlign='center';
        c.fillStyle='#b7c998';c.font='13px Georgia';c.fillText('L A S T   S U R V I V O R   /   N E X T',w/2,150);
        c.fillStyle='#f5e4b7';c.font='bold 58px "Microsoft YaHei", sans-serif';c.fillText('林地远征',w/2,239);
        c.fillStyle='#c7d0ac';c.font='17px "Microsoft YaHei",sans-serif';c.fillText('末日幸存者 · 冒险者与林地生灵',w/2,282);
        c.fillStyle='#e3ba72';c.beginPath();c.roundRect(w/2-100,h/2+20,200,60,12);c.fill();
        c.fillStyle='#293d30';c.font='bold 21px "Microsoft YaHei",sans-serif';c.fillText('出发探险',w/2,h/2+58);
        c.fillStyle='#c5cfb1';c.font='15px "Microsoft YaHei",sans-serif';
        const touch=document.body.classList.contains('touch-device');
        c.fillText(touch?'左侧摇杆移动 · 右侧按钮冲刺':'WASD 移动 · SHIFT 冲刺 · ESC 暂停',w/2,h/2+113);
        c.fillStyle='#9bad8d';c.font='13px "Microsoft YaHei",sans-serif';c.fillText('自动射击 · 侧移避开金色预警 · 收招时反击',w/2,h/2+142);
        c.save();c.translate(w*.21,h*.54);c.scale(2.5,2.5);
        this.player(c,{x:0,y:0,size:20,animTimer:t,walkCycle:t*10,moving:true,aimAngle:.1,recoilTimer:0,hp:100});c.restore();
        c.save();c.translate(w*.8,h*.55);c.scale(2.3,2.3);
        this.enemy(c,{x:0,y:0,size:18,type:'normal',angle:Math.PI,animTimer:t,hp:30,maxHp:30});c.restore();
        c.fillStyle='#a8b994';c.font='12px "Microsoft YaHei",sans-serif';c.fillText('生灵样稿 03 · 五种怪物，各有招式',w/2,h-55);
        c.restore();
    }
}
window.ForestArt=ForestArt;
