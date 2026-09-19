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
        c.save(); c.translate(p.x-cameraX,p.y-cameraY);
        if (p.isDashing && p.dashDirection) {
            const a=Math.atan2(p.dashDirection.y,p.dashDirection.x);
            c.save();c.rotate(a);
            for(let i=0;i<3;i++) this.line(c,[[-18-i*5,-10+i*10],[-50-i*7,-10+i*10]],'rgba(224,215,162,.55)',2-i*.4);
            c.restore();
        }
        const scale = p.size / 20;
        c.scale(scale,scale);
        this.shadow(c,20);
        const intensity = p.runBlend === undefined ? (p.moving || p.isDashing ? 1 : 0) : p.runBlend;
        const cycle = p.walkCycle || 0;
        const stride = Math.sin(cycle) * (p.isDashing ? 8 : 6) * intensity;
        const bob = -Math.abs(Math.cos(cycle))*2.2*intensity + Math.sin(p.animTimer*2.6)*0.7*(1-intensity);
        const hurt = p.hurtTimer > 0;
        if (p.invincibleTimer > 0 && Math.floor(p.animTimer*16)%2) c.globalAlpha = 0.65;
        if (p.hp <= 0) { c.translate(0,8); c.rotate(1.2); }
        const angle = Number.isFinite(p.aimAngle) ? p.aimAngle : 0;
        const face = Math.cos(angle) < 0 ? -1 : 1;
        c.scale(face,1);
        const skin = hurt ? '#fff3d3' : '#efc38e';
        // The feet stay under the body; knees bend instead of spinning the whole sprite.
        this.line(c,[[-6,3],[-8-stride*.35,10],[-7+stride,16]],'#463d32',7);
        this.line(c,[[6,3],[8+stride*.35,10],[7-stride,16]],'#604735',7);
        this.oval(c,-6+stride,16,6,3.6,'#3b342c');
        this.oval(c,8-stride,16,6,3.6,'#50402f');
        c.translate(hurt?-2:0,bob);
        if (p.isDashing) { c.rotate(0.27); c.translate(3,2); }
        // Backpack, rolled blanket and scarf have their own follow-through.
        this.oval(c,-10,-7,8,12,'#756f44');
        this.line(c,[[-15,-14],[-16,-3]],'#b4b078',3);
        this.oval(c,-12,-19,8,4,'#aab287');
        this.shape(c,[[-5,-16],[-23-(p.isDashing?9:0),-12+Math.sin(cycle-1)*3*intensity],[-18,-7],[-5,-10]],'#c5633d');
        this.shape(c,[[-10,-13],[7,-13],[11,2],[7,8],[-8,8],[-12,-1]],hurt?'#fff0c1':'#4e8074');
        this.shape(c,[[-9,-12],[-4,-12],[-2,5],[-8,4]],'#8eb29a',null);
        this.line(c,[[-9,4],[9,4]],'#704d32',4);
        this.oval(c,2,4,2.3,2.3,'#e7bb60',null);
        this.line(c,[[-8,-10],[-12,-2],[-10,2]],skin,5);
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
        // Gun pivots independently of movement. Muzzle flash follows the same aim.
        c.save(); c.translate(6,-6);
        c.rotate(Math.atan2(Math.sin(angle),Math.abs(Math.cos(angle))));
        c.translate(-Math.max(0,p.recoilTimer||0)*22,0);
        this.shape(c,[[-5,-4],[4,-3],[5,5],[-3,6],[-7,1]],'#8f6041');
        this.shape(c,[[0,-5],[17,-5],[18,1],[1,2]],'#526562');
        this.line(c,[[5,-5],[19,-5]],'#bec9aa',2);
        this.shape(c,[[16,-4],[28,-4],[28,0],[16,0]],'#394c47');
        this.line(c,[[25,-5],[25,1]],'#d9be73',3);
        this.oval(c,2,3,4,3.2,skin);
        if (p.muzzleFlash>0) {
            this.shape(c,[[28,-2],[37,-7],[34,-2],[42,0],[34,2],[36,6],[28,1]],'#ffca63','#e4933d',1);
            this.oval(c,31,-1,5,2,'#fff6ca',null);
        }
        c.restore();
        if (p.shield>0) { c.strokeStyle='#a5e2d0'; c.lineWidth=1.5; c.beginPath(); c.ellipse(0,-8,25,34,0,0,Math.PI*2); c.stroke(); }
        c.restore();
    }
    static enemy(c,e,cameraX=0,cameraY=0,death=0) {
        c.save(); c.translate(e.x-cameraX,e.y-cameraY);
        this.shadow(c,e.size);
        if (death) {
            c.globalAlpha*=Math.max(0,1-death);
            c.translate(death*12,death*8);
            c.rotate(death*(Math.cos(e.angle)<0?-1:1)*1.45);
            c.scale(1-death*.35,1-death*.45);
        }
        const scale=e.size/18;
        c.scale((Math.cos(e.angle)<0?-1:1)*scale,scale);
        const state=e.combatState || 'approach';
        const cfg=typeof EnemyConfig!=='undefined' ? EnemyConfig.ATTACKS[e.type] : null;
        const windup=cfg && state==='windup' ? Math.max(0,Math.min(1,1-e.combatTimer/cfg.windup)) : 0;
        const strike=cfg && state==='strike' ? Math.max(0,Math.min(1,1-e.combatTimer/cfg.strike)) : 0;
        const resting=state==='windup'||state==='recover';
        const t=resting ? 0 : e.animTimer || 0;
        const hurt=e.hitFlash>0;
        const attack=Math.max(0,e.attackPose||0)/0.24;
        c.translate(attack*4-(hurt?3:0),0);
        if (hurt) c.rotate(-0.1);
        if(state==='windup' && e.type!=='tank') {
            const squeeze=windup*(e.type==='fast'?.24:.22);
            c.translate(-windup*3,12*squeeze);c.scale(1+squeeze*.45,1-squeeze);
        }
        if(state==='strike') {
            if(e.type==='normal') {c.translate(0,-Math.sin(strike*Math.PI)*12);c.rotate(.15);}
            else if(e.type==='fast') {c.translate(0,4);c.scale(1.18,.74);}
            else if(e.type==='tank') {c.translate(0,3);c.scale(1.08,.88);}
        }
        if(state==='recover') {c.translate(0,2);c.rotate(.06);}
        if(e.type==='fast') this.crawler(c,t,hurt,attack);
        else if(e.type==='tank') this.brute(c,t,hurt,attack,false,windup);
        else if(e.type==='elite') this.brute(c,t,hurt,attack,true);
        else this.mushroom(c,t,hurt,e.type==='exploder',attack);
        if(e.frozen) {
            this.shape(c,[[-21,12],[-22,-12],[-10,-34],[10,-35],[22,-13],[20,13]],'rgba(165,232,245,.38)','#b0ebed',1);
        } else if(e.burnStacks>0) {
            this.shape(c,[[-13,8],[-16,-3],[-10,0],[-8,-12],[-2,-2],[3,-10],[7,1],[14,-5],[12,9]],'rgba(255,148,54,.65)',null);
        } else if(e.paralyzed) {
            this.line(c,[[-19,-23],[-24,-13],[-18,-14],[-22,-5]],'#ffe289',2);
            this.line(c,[[22,-20],[18,-10],[24,-12],[20,-2]],'#ffe289',2);
        }
        c.restore();
        if(!death && e.hp<e.maxHp) {
            const x=e.x-cameraX, y=e.y-cameraY-e.size*2;
            c.fillStyle='#253c32'; c.fillRect(x-16,y,32,4);
            c.fillStyle='#eab766'; c.fillRect(x-15,y+1,30*Math.max(0,e.hp/e.maxHp),2);
        }
    }
    static mushroom(c,t,hurt,exploder,attack) {
        const step=Math.sin(t*8),hop=Math.abs(Math.cos(t*8))*2.3;
        const body=hurt?'#fff4d2':exploder?'#d8b463':'#d2d398';
        this.oval(c,-7+step*3,12,5.5,3.5,'#777647');
        this.oval(c,8-step*3,12,5.5,3.5,'#777647');
        c.save(); c.translate(0,-hop);
        this.line(c,[[-10,-3],[-16,-1+step*2],[-17,3]],body,4);
        this.line(c,[[10,-3],[16+attack*5,-4-step*2],[18+attack*5,0]],body,4);
        this.oval(c,0,0,11,13,body);
        this.oval(c,-3,1,5,9,'#e7e6b7',null);
        this.oval(c,0,-11,20,6,exploder?'#835130':'#805c42');
        c.beginPath(); c.moveTo(-21,-12); c.bezierCurveTo(-20,-36,17,-37,22,-12); c.quadraticCurveTo(0,-2,-21,-12);
        c.fillStyle=hurt?'#fff5dc':exploder?'#db8c3b':'#bf694e'; c.fill(); c.strokeStyle='#503f31';c.lineWidth=1.7;c.stroke();
        this.oval(c,-8,-22,5,3,'#f5dba0',null);
        this.oval(c,8,-18,4,3,'#f3d398',null);
        this.oval(c,3,-28,3.4,2,'#f6dfa9',null);
        this.line(c,[[-12,-12],[0,-9],[14,-12]],'#d5a477',1.2);
        this.oval(c,-3,-3,2.2,3.4,'#333e2b',null); this.oval(c,6,-3,2.2,3.4,'#333e2b',null);
        this.oval(c,-3.5,-4,0.8,1,'#ffffde',null); this.oval(c,5.5,-4,0.8,1,'#ffffde',null);
        this.line(c,[[0,4],[3,5],[5,3]],'#8b774d',1.2);
        if(exploder) {
            this.oval(c,1,5,5+Math.sin(t*10)*0.7,4,'#f5a548','#92552a');
            this.shape(c,[[0,-32],[-3,-39],[3,-37],[7,-42],[8,-35]],'#92a75b');
        }
        c.restore();
    }
    static crawler(c,t,hurt,attack) {
        const step=Math.sin(t*15)*6;
        const hide=hurt?'#fff5d9':'#81969a';
        // Four alternating paws and a springing back distinguish the fast enemy.
        this.line(c,[[-10,0],[-14-step*.5,5],[-13+step,11]],'#485e66',5);
        this.line(c,[[10,0],[13+step*.5,6],[14-step,11]],'#485e66',5);
        this.shape(c,[[-13,-4],[-25,-15],[-22,-4],[-16,4]],hide);
        this.oval(c,-2,-3-Math.abs(step)*.2,16,9,hide);
        this.line(c,[[-10,3],[-7+step*.5,8],[-5-step,12]],hide,6);
        this.line(c,[[10,3],[9-step*.5,8],[11+step,12]],hide,6);
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
    }
    static brute(c,t,hurt,attack,elite=false,windup=0) {
        const step=Math.sin(t*4.4)*3;
        const hide=hurt?'#fff0d0':elite?'#857888':'#849070';
        this.oval(c,-9+step,13,8,5,'#465447');
        this.oval(c,11-step,13,8,5,'#465447');
        c.save(); c.translate(0,-Math.abs(step)*.5);
        this.oval(c,0,-3,20,19,hide);
        this.oval(c,2,1,12,12,elite?'#b8a69a':'#b5b58a');
        const lift=windup*46;
        this.line(c,[[-15,-9],[-25,-1-step-lift*.55],[-22,9-step-lift]],hide,9);
        this.line(c,[[15,-9],[25+attack*6,-2+step-lift*.55],[23+attack*6,8+step-lift]],hide,9);
        this.oval(c,-23,8-step-lift,6,6,'#677761');
        this.oval(c,24+attack*6,8+step-lift,6,6,'#677761');
        for(const side of [-1,1]) this.shape(c,[[side*10,-16],[side*18,-23],[side*26,-14],[side*22,-7],[side*12,-8]],elite?'#777888':'#6b7e79');
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
            this.line(c,[[28,11],[31,-19]],'#705c43',4);
            this.shape(c,[[28,-20],[43,-25],[40,-11],[30,-6]],'#bdc7b1');
        }
        c.restore();
    }
    static telegraph(c,e,cameraX=0,cameraY=0) {
        if (e.combatState!=='windup' || e.hp<=0) return;
        const cfg=EnemyConfig.ATTACKS[e.type];
        if(!cfg) return;
        const p=Math.max(0,Math.min(1,1-e.combatTimer/cfg.windup));
        c.save();
        if(e.type==='tank') {
            c.translate(e.attackX-cameraX,e.attackY-cameraY);
            c.beginPath();c.arc(0,0,cfg.radius,0,Math.PI*2);
            c.fillStyle='rgba(239,137,74,.13)';c.fill();c.strokeStyle='#f9ba7b';c.lineWidth=2;c.stroke();
            c.beginPath();c.arc(0,0,cfg.radius*p,0,Math.PI*2);c.fillStyle='rgba(246,150,73,.21)';c.fill();
            c.beginPath();c.arc(0,0,cfg.radius+4,-Math.PI/2,-Math.PI/2+p*Math.PI*2);c.strokeStyle='#ffdea0';c.lineWidth=3;c.stroke();
            this.line(c,[[-8,0],[8,0]],'#f5d59b',2);this.line(c,[[0,-8],[0,8]],'#f5d59b',2);
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
        if(m.kind==='slam') {
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
        c.fillStyle='#a8b994';c.font='12px "Microsoft YaHei",sans-serif';c.fillText('战斗样稿 02 · 观察预警，闪避后反击',w/2,h-55);
        c.restore();
    }
}
window.ForestArt=ForestArt;
