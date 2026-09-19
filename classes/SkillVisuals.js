/** Presentation only: effects use game time and never mutate combat or consume RNG. */
class SkillVisuals {
    static COLORS={bullet_storm:'#e5c98c',inferno:'#edab67',frost:'#afdcdf',storm:'#eadba2',bastion:'#a9d2aa',shadow:'#b8a4d2',reaper:'#d89194',summoner:'#cfbf86'};
    constructor(){this.events=[];this.time=0;this.audio=null;}
    clear(){this.events.length=0;this.time=0;}
    emit(kind,x,y,options={}) {
        if(!Number.isFinite(x)||!Number.isFinite(y))return false;
        const durations={lightning:.22,ice:.5,fire:.55,meteor:.65,nova:.8,phoenix:.85,beam:.5,shadow:.5,heal:.6,soul:.6,mark:.6,gun:.18,pickup:.8};
        const duration=options.duration||durations[kind]||.4;
        // Coalesce same-position multi-pellet procs, while retaining separate chain hops.
        if(this.events.some(e=>e.kind===kind && this.time-e.born<.06 && Math.abs(e.x-x)<12 && Math.abs(e.y-y)<12 && e.x2===options.x2 && e.y2===options.y2))return false;
        if(this.events.length>=96)this.events.shift();
        this.events.push({kind,x,y,x2:options.x2,y2:options.y2,radius:options.radius||24,color:options.color,
            life:duration,duration,born:this.time,angle:options.angle||0});
        this.audio?.skillCue(kind);
        return true;
    }
    update(dt){this.time+=dt;for(let i=this.events.length-1;i>=0;i--){this.events[i].life-=dt;if(this.events[i].life<=0)this.events.splice(i,1);}}
    static ring(c,x,y,r,color,width=1.5){c.beginPath();c.arc(x,y,Math.max(.1,r),0,Math.PI*2);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
    static crystal(c,x,y,r,color){ForestArt.shape(c,[[x,y-r],[x+r*.45,y],[x,y+r*.5],[x-r*.4,y]],color,'#658f91',.8);ForestArt.line(c,[[x,y-r],[x,y+r*.3]],'#e2f4e6',.8);}
    static rune(c,x,y,r,color,points=6){
        const vertices=[];for(let i=0;i<points;i++){const a=i*Math.PI*2/points;vertices.push([x+Math.cos(a)*r,y+Math.sin(a)*r]);}
        ForestArt.shape(c,vertices,'rgba(0,0,0,0)',color,1.2);
        for(let i=0;i<points;i++){const a=i*Math.PI*2/points;ForestArt.line(c,[[x+Math.cos(a)*r*.65,y+Math.sin(a)*r*.65],[x+Math.cos(a)*r*.9,y+Math.sin(a)*r*.9]],color,1.2);}
    }
    static bolt(c,x,y,x2,y2,color,seed=0,width=2){
        const dx=x2-x,dy=y2-y,len=Math.hypot(dx,dy)||1,n=Math.max(3,Math.min(14,Math.ceil(len/22))),points=[[x,y]];
        for(let i=1;i<n;i++){const f=i/n,offset=Math.sin(i*13.1+seed*8)*Math.min(13,len*.12);points.push([x+dx*f-dy/len*offset,y+dy*f+dx/len*offset]);}
        points.push([x2,y2]);ForestArt.line(c,points,color,width+2);ForestArt.line(c,points,'#f7eed1',width*.5);
        const mid=points[Math.floor(n/2)];ForestArt.line(c,[mid,[mid[0]+dy/len*12,mid[1]-dx/len*12],[mid[0]+dy/len*19+dx*.08,mid[1]-dx/len*19+dy*.08]],color,1);
    }
    static construct(c,x,y,angle,t,kind='drone',flash=false,charged=false){
        c.save();c.translate(x,y);ForestArt.shadow(c,12,.18);c.rotate(angle);
        const color=charged?'#eed397':'#c2b77e';
        if(kind==='turret'){
            ForestArt.shape(c,[[-10,-7],[1,-11],[11,-5],[11,6],[0,10],[-10,6]],'#637966');
            ForestArt.line(c,[[0,0],[19,0]],'#475e52',7);ForestArt.line(c,[[0,-2],[18,-2]],color,2);
        }else{
            ForestArt.shape(c,[[-10,0],[-5,-12],[2,-10],[7,-4],[15,0],[7,4],[2,10],[-5,12]],'#718572');
            ForestArt.shape(c,[[-8,-3],[5,-5],[10,0],[5,5],[-8,3]],color);
            for(const side of [-1,1])ForestArt.line(c,[[-8,side*9],[2+Math.sin(t*30)*5,side*9]],'#dfd2a2',1.5);
        }
        ForestArt.oval(c,1,0,3,3,'#c4e2bd','#607760',1);
        if(flash)ForestArt.shape(c,[[18,-2],[27,-6],[24,0],[29,3],[18,2]],'#f6d99d',null);
        c.restore();
    }
    draw(c,cx,cy,p,sm){
        const state=sm.runtimeState,t=this.time,w=c.canvas.width,h=c.canvas.height;
        const visible=(x,y,r=80)=>x+r>cx&&x-r<cx+w&&y+r>cy&&y-r<cy+h;
        const x=p.x-cx,y=p.y-cy;
        // Transparent ground fields leave hostile telegraphs and actors on top.
        const shownZones=[];
        for(const z of (state._fireZones||[]).slice().reverse()){
            const r=z.radius*(state._hellfire?.radiusMul||1);if(!visible(z.x,z.y,r)||shownZones.length>=16)continue;
            // Collapse near-identical art only; every gameplay zone still deals damage.
            if(shownZones.some(other=>Math.hypot(other.x-z.x,other.y-z.y)<r*.45&&Math.abs(other.radius-z.radius)<12))continue;
            shownZones.push(z);
            const zx=z.x-cx,zy=z.y-cy;c.save();c.globalAlpha=Math.min(1,z.life/.4);
            ForestArt.oval(c,zx,zy,r,r,'rgba(108,57,32,.045)',null);
            c.setLineDash([10,12]);SkillVisuals.ring(c,zx,zy,r,'rgba(226,157,92,.45)');c.setLineDash([]);
            for(let i=0;i<12;i++){const a=i*2.4,rr=r*(.3+(i%4)*.17),fx=zx+Math.cos(a)*rr,fy=zy+Math.sin(a)*rr,lift=9+Math.sin(t*7+i)*4;
                ForestArt.shape(c,[[fx-4,fy],[fx-5,fy-6],[fx-1,fy-lift],[fx+2,fy-5],[fx+5,fy-8],[fx+4,fy]],i%2?'#cd8956':'#e0a567',null);}
            c.restore();
        }
        const frost=sm.getSkill('frost_aura');if(frost){const r=frost.getCurrentEffect().params.radius;c.save();c.globalAlpha=.32;SkillVisuals.ring(c,x,y,r,'#b2d7d3');for(let i=0;i<12;i++){const a=i*Math.PI/6+t*.025;SkillVisuals.crystal(c,x+Math.cos(a)*r,y+Math.sin(a)*r,5,'#a8cecf');}c.restore();}
        const field=sm.getSkill('static_field');if(field){c.save();c.globalAlpha=.28;c.setLineDash([3,16]);SkillVisuals.ring(c,x,y,field.getCurrentEffect().params.radius,'#d7cd9a');c.restore();}
        for(const tr of (state._traps||[]).slice(-32)){if(!visible(tr.x,tr.y,tr.radius))continue;c.save();c.globalAlpha=Math.min(.38,tr.life);SkillVisuals.rune(c,tr.x-cx,tr.y-cy,tr.radius,'#b6a1ce',4);SkillVisuals.rune(c,tr.x-cx,tr.y-cy,12,'#d0b5df',4);c.restore();}
        for(const m of (state._mines?.mines||[]).slice(-32)){if(!visible(m.x,m.y))continue;c.save();c.globalAlpha=m.armed?.85:.4;ForestArt.oval(c,m.x-cx,m.y-cy,8,5,'#6b7051','#c3ab71',1);ForestArt.oval(c,m.x-cx,m.y-cy-2,2,2,m.armed?'#ebaa67':'#c8c39d',null);c.restore();}
        if(state._sanctuary?.active){c.save();c.globalAlpha=.55;SkillVisuals.rune(c,x,y+10,37,'#b1d3a3');c.restore();}
        if(state._reflectShield?.active || state._iceArmor?.active){
            const ice=state._iceArmor?.active;for(let i=0;i<6;i++){const a=i*Math.PI/3+t*.35;SkillVisuals.crystal(c,x+Math.cos(a)*31,y-8+Math.sin(a)*34,ice?8:6,ice?'#aad5df':'#c3d3a5');}
        }
        if(p._overheatStacks>0 || state._frenzy?.stacks>0 || state._voidStacks>0){const count=Math.min(8,p._overheatStacks||state._frenzy?.stacks||state._voidStacks);for(let i=0;i<count;i++){const a=t+i*Math.PI*2/count;ForestArt.oval(c,x+Math.cos(a)*27,y+Math.sin(a)*13,1.8,1.8,state._voidStacks?'#b5a1d0':'#d99571',null);}}
        // Read cooldowns for a small cast-ready rune; never delay or advance damage.
        const timers=[state._firestormTimer,state._thunder?.timer,state._supernova?.timer,state._wrath?.timer,state._orbital?.timer];
        if(timers.some(v=>v>0&&v<.5)){c.save();c.globalAlpha=.5;SkillVisuals.rune(c,x,y,25+Math.sin(t*15)*2,'#dac898',5);c.restore();}
        for(const turret of state._turrets||[])SkillVisuals.construct(c,x+Math.cos(turret.angle)*turret.orbitR,y+Math.sin(turret.angle)*turret.orbitR,turret.aimAngle||0,t,'turret',turret.fireTimer>.5);
        for(const drone of state._drones||[])SkillVisuals.construct(c,x+Math.cos(drone.angle)*drone.orbitR,y+Math.sin(drone.angle)*drone.orbitR,drone.aimAngle||0,t,'drone',drone.fireTimer>.6,!!state._overcharge);
        const mother=state._mothership;
        if(mother){c.save();c.globalAlpha=.7;const my=y-150+Math.sin(t)*3;
            ForestArt.oval(c,x,my,49,14,'#647667','#c1b17e',1.5);ForestArt.shape(c,[[x-27,my-3],[x-10,my-13],[x+24,my-8],[x+37,my+2],[x,my+7]],'#a79f70');
            ForestArt.line(c,[[x-30,my+10],[x+30,my+10]],'#d6c790',2);c.restore();
            for(const ic of mother.interceptors)if(visible(ic.x,ic.y))SkillVisuals.construct(c,ic.x-cx,ic.y-cy,ic.aimAngle||0,t,'drone',ic.fireTimer>.4);
        }
        for(const key of ['_afterimages','_phantoms','_phantoms2','_echoes'])for(const ph of (state[key]||[]).slice(-24)){
            if(!visible(ph.x,ph.y))continue;c.save();c.globalAlpha=Math.min(.46,Math.max(0,ph.life)*.6);
            ForestArt.player(c,{x:ph.x,y:ph.y,size:17,hp:100,aimAngle:ph.aimAngle??p.aimAngle,weaponType:p.weaponType,animTimer:t,walkCycle:0,moving:false,muzzleFlash:ph.fireTimer>.35?.03:0},cx,cy);
            SkillVisuals.rune(c,ph.x-cx,ph.y-cy+8,22,key==='_phantoms'?'#afd3ab':'#baa9d6',4);c.restore();
        }
        if(state._stormCloud){const cloudY=y-65;c.save();c.globalAlpha=.8;ForestArt.oval(c,x-12,cloudY,15,9,'#6e8285');ForestArt.oval(c,x+5,cloudY-5,19,12,'#829493');ForestArt.oval(c,x+21,cloudY+2,13,8,'#758a89');ForestArt.line(c,[[x-17,cloudY+6],[x+17,cloudY+8]],'#c4cba8',1.3);c.restore();}
        const lt=state._laserTarget;if(lt?.target?.active && lt.timer>0){const tx=lt.target.x-cx,ty=lt.target.y-cy;c.save();c.globalAlpha=.65;for(const side of [-1,1])ForestArt.line(c,[[tx+side*18,ty-14],[tx+side*23,ty-14],[tx+side*23,ty+14],[tx+side*18,ty+14]],'#e0cb85',1.5);c.restore();}
        if(state._repairDrone && (state._drones?.length||mother?.interceptors?.length) && p.hp<p.maxHp){c.save();c.globalAlpha=.4;ForestArt.line(c,[[x-27,y-3],[x-27,y-15]],'#bad6a7',2);ForestArt.line(c,[[x-32,y-9],[x-22,y-9]],'#bad6a7',2);c.restore();}
        for(const e of this.events){if(visible(e.x,e.y,e.radius+220)||e.kind==='beam'||(Number.isFinite(e.x2)&&visible(e.x2,e.y2)))this.drawEvent(c,e,cx,cy);}
    }
    drawEvent(c,e,cx,cy){
        const progress=1-e.life/e.duration,x=e.x-cx,y=e.y-cy,r=e.radius;
        c.save();c.globalAlpha=Math.min(1,e.life/e.duration*1.5);
        const palette={ice:'#b4dde0',fire:'#e9ae70',meteor:'#e6a16a',nova:'#e3a867',phoenix:'#ecc282',lightning:'#e3d39a',beam:'#d9dcb4',shadow:'#b8a3ce',heal:'#b8d5a3',soul:'#d7a0ae',mark:'#cf929a',gun:'#e6cd98',pickup:'#d6c793'};
        const color=e.color||palette[e.kind]||'#dccca1';
        if(e.kind==='lightning'){
            SkillVisuals.bolt(c,x,y,(e.x2??e.x)-cx,(e.y2??e.y-100)-cy,color,e.born,2);
            if(r>50){c.globalAlpha*=.45;SkillVisuals.ring(c,x,y,r*(.8+progress*.2),color);}
        }else if(e.kind==='fire' && Number.isFinite(e.x2)){
            for(let i=0;i<4;i++){const f=Math.max(0,Math.min(1,progress*1.4-i*.08));ForestArt.oval(c,x+(e.x2-e.x)*f,y+(e.y2-e.y)*f-Math.sin(f*Math.PI)*15,2.5,3,color,null);}
        }else if(e.kind==='beam'){
            c.globalAlpha*=.2; c.fillStyle=color;c.fillRect(x-r,0,r*2,c.canvas.height);c.globalAlpha*=3;
            ForestArt.line(c,[[x,0],[x,c.canvas.height]],'#efe9c6',8*(1-progress)+2);
            ForestArt.line(c,[[x-r,0],[x-r,c.canvas.height]],color,1);ForestArt.line(c,[[x+r,0],[x+r,c.canvas.height]],color,1);
        }else if(e.kind==='ice'){
            SkillVisuals.ring(c,x,y,r*(.35+progress*.65),color,2*(1-progress)+1);
            for(let i=0;i<8;i++){const a=i*Math.PI/4,rr=r*(.25+progress*.6);c.save();c.translate(x+Math.cos(a)*rr,y+Math.sin(a)*rr);c.rotate(a+Math.PI/2);SkillVisuals.crystal(c,0,0,(7+Math.min(8,r*.04))*(1-progress*.4),color);c.restore();}
        }else if(['fire','meteor','nova','phoenix'].includes(e.kind)){
            SkillVisuals.ring(c,x,y,r*(.35+progress*.65),color,3*(1-progress)+1);
            for(let i=0;i<10;i++){const a=i*Math.PI/5,rr=r*(.2+progress*.7),fx=x+Math.cos(a)*rr,fy=y+Math.sin(a)*rr;
                ForestArt.shape(c,[[fx-3,fy],[fx-5,fy-8],[fx,fy-17*(1-progress)],[fx+3,fy-6],[fx+5,fy]],color,null);}
            if(e.kind==='meteor'){ForestArt.line(c,[[x-75*(1-progress),y-130*(1-progress)],[x,y]],'#edbe7c',7*(1-progress)+1);ForestArt.oval(c,x,y,13*(1-progress)+1,9*(1-progress)+1,'#c48659',null);}
            if(e.kind==='phoenix')for(const side of [-1,1])ForestArt.shape(c,[[x,y],[x+side*r*.25,y-r*.5],[x+side*r*.8,y-r*.65],[x+side*r*.45,y-r*.2],[x+side*r*.2,y]],'#e4b47d',null);
        }else if(e.kind==='heal'||e.kind==='soul'){
            for(let i=0;i<5;i++){const a=i*2.4,px=x+Math.cos(a)*r*(1-progress*.65),py=y+Math.sin(a)*r*.45-progress*25;
                if(e.kind==='heal'){ForestArt.line(c,[[px-3,py],[px+3,py]],color,1.5);ForestArt.line(c,[[px,py-3],[px,py+3]],color,1.5);}
                else ForestArt.oval(c,px,py,2,5,color,null);}
        }else if(e.kind==='gun'){
            if(Number.isFinite(e.x2))ForestArt.line(c,[[x,y],[e.x2-cx,e.y2-cy]],color,1.5);
            for(let i=0;i<3;i++){const a=e.angle+(i-1)*.45;ForestArt.line(c,[[x,y],[x+Math.cos(a)*r*(.4+progress),y+Math.sin(a)*r*(.4+progress)]],color,1.6);}
        }else if(e.kind==='shadow'||e.kind==='mark'){
            c.translate(x,y);c.rotate(e.angle+progress*.4);c.beginPath();c.arc(0,0,r*(.4+progress*.6),-.9,1.6);c.strokeStyle=color;c.lineWidth=4*(1-progress)+1;c.stroke();
            ForestArt.line(c,[[-r*.4,-r*.4],[r*.4,r*.4]],color,2);if(e.kind==='mark')ForestArt.line(c,[[-r*.4,r*.4],[r*.4,-r*.4]],color,2);
        }else{SkillVisuals.rune(c,x,y,r*(.5+progress*.5),color);}
        c.restore();
    }
}
window.SkillVisuals=SkillVisuals;
