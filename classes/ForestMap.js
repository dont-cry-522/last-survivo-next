/** One finite forest, with shared visible obstacles and swept actor movement. */
class ForestMap {
    static selected='forest';
    static MAPS={
        forest:{name:'古木林地',desc:'树木掩护 · 泥地与浅溪减速',base:'#486443',path:'#a59c6c',camp:'#8c895d',leaf:'#78905c'},
        snow:{name:'霜雪山谷',desc:'积雪减速 35% · 冰面加速 12%',base:'#91adb0',path:'#c2d5cd',camp:'#b5bfb0',leaf:'#dae6d6'},
        ash:{name:'赤岩荒原',desc:'灰烬减速 30% · 岩柱阻挡弹道',base:'#674e42',path:'#ad8160',camp:'#927453',leaf:'#ba8a61'}
    };
    static get theme(){return this.MAPS[this.selected];}
    static enemyTypes(time){
        const types=['normal'];
        if(time>30)types.push('fast');if(time>60)types.push('tank');if(time>90)types.push('exploder');
        if(this.selected==='snow'&&time>30)types.push('fast','fast');
        if(this.selected==='ash'){if(time>60)types.push('tank');if(time>90)types.push('exploder');}
        return types;
    }
    static vents=[{x:420,y:280},{x:1250,y:330},{x:800,y:1000}];
    static eventAt(time){
        if(this.selected==='snow'&&time>=30){
            const cycle=Math.floor((time-30)/30),t=(time-30)%30;
            return {kind:'snow',cycle,phase:t<2?'warning':t<8?'active':'rest',progress:Math.min(1,t/2)};
        }
        if(this.selected==='ash'&&time>=45){
            const cycle=Math.floor((time-45)/18),t=(time-45)%18;
            return {kind:'ash',cycle,...this.vents[cycle%this.vents.length],r:80,phase:t<1.6?'warning':t<2?'active':'rest',progress:Math.min(1,t/1.6)};
        }
        return null;
    }
    static updateEnvironment(g){
        if(g.state!=='playing'||g.player.hp<=0)return;
        const e=this.eventAt(g.survivalTime);if(!e||e.phase==='rest')return;
        const nearby=e.kind==='snow'||Math.hypot(g.player.x-e.x,g.player.y-e.y)<650;
        if(nearby&&g.mapEventNotice!==e.cycle){g.mapEventNotice=e.cycle;g._announce(e.kind==='snow'?'风雪将至：离开积雪，沿主路移动':'地热预警：避开橙色喷口圈',e.kind==='snow'?'#caeee7':'#f3bd85');}
        if(e.kind!=='ash'||e.phase!=='active'||g.mapEventHit===e.cycle)return;
        g.mapEventHit=e.cycle;
        const inside=a=>Math.hypot(a.x-e.x,a.y-e.y)<=e.r+(a.size||0);
        if(inside(g.player))g.player.takeDamage(18,{x:e.x,y:e.y,kind:'地热'});
        for(const enemy of g.enemyManager.pool)if(enemy.active&&enemy.hp>0&&inside(enemy))enemy.takeDamage(36,0,false);
        if(g.boss.active&&inside(g.boss))g.boss.takeDamage(36);
        if(nearby)g.audio.skillCue('explosion');
    }
    static drawEnvironment(c,cx,cy,w,h,time){
        const e=this.eventAt(time);
        if(this.selected==='ash')for(const vent of this.vents){
            const x=vent.x-cx,y=vent.y-cy;if(x<-120||x>w+120||y<-120||y>h+120)continue;
            ForestArt.oval(c,x,y,28,18,'#322d31','#c39065',2);
            for(let j=0;j<3;j++)ForestArt.line(c,[[x-17+j*14,y+4],[x-10+j*10,y-3],[x-14+j*15,y-9]],'#da9b63',2);
        }
        if(!e||e.phase==='rest')return;
        c.save();
        if(e.kind==='snow'){
            for(const p of this.patches.filter(p=>p.kind===3)){
                if(p.x+p.rx<cx||p.x-p.rx>cx+w||p.y+p.ry<cy||p.y-p.ry>cy+h)continue;
                c.strokeStyle='#e2fbf3';c.lineWidth=3;c.setLineDash(e.phase==='warning'?[8,6]:[]);c.beginPath();c.ellipse(p.x-cx,p.y-cy,p.rx,p.ry,0,0,Math.PI*2);c.stroke();
            }
        }else{
            const x=e.x-cx,y=e.y-cy;
            if(x>=-100&&x<=w+100&&y>=-100&&y<=h+100){
                c.globalAlpha=.22;ForestArt.oval(c,x,y,e.r,e.r,e.phase==='warning'?'#ffb85b':'#ffdb90',null);c.globalAlpha=1;
                c.strokeStyle='#ffe0a3';c.lineWidth=3;c.setLineDash(e.phase==='warning'?[9,6]:[]);c.beginPath();c.arc(x,y,e.r,0,Math.PI*2);c.stroke();c.setLineDash([]);
                if(e.phase==='warning'){c.lineWidth=5;c.strokeStyle='#f5a65d';c.beginPath();c.arc(x,y,e.r-7,-Math.PI/2,-Math.PI/2+e.progress*Math.PI*2);c.stroke();}
                else for(let i=0;i<8;i++){const a=i*Math.PI/4,px=x+Math.cos(a)*45,py=y+Math.sin(a)*45;ForestArt.shape(c,[[px-9,py+12],[px-4,py-20],[px+3,py-40],[px+12,py+12]],'#f6b969',null);}
                c.font='bold 15px "Microsoft YaHei"';c.textAlign='center';c.fillStyle='#fff0c6';c.fillText(e.phase==='warning'?'即将喷发':'地热喷发',x,y-e.r-12);
            }
        }c.restore();
    }
    static select(id){
        this._forest ||= {regions:this.regions,patches:this.patches};
        this.selected=this.MAPS[id]?id:'forest';this._trees=null;this.layout=null;this.vents=[{x:420,y:280},{x:1250,y:330},{x:800,y:1000}];
        if(this.selected==='forest'){this.regions=this._forest.regions;this.patches=this._forest.patches;return;}
        const snow=this.selected==='snow';
        this.regions=[{name:snow?'避风营地':'岩间营地',color:snow?'#bbc8b9':'#9a7755',x:0,y:0},
            {name:snow?'雪松高地':'黑岩石林',color:snow?'#739c9c':'#594840',x:0,y:-950},
            {name:snow?'冰镜湖':'灰烬盆地',color:snow?'#73b5bf':'#8c6350',x:1500,y:0},
            {name:snow?'霜封遗迹':'赤岩遗迹',color:snow?'#a4b7b5':'#af815a',x:-1500,y:0}];
        this.patches=[{x:420,y:280,rx:170,ry:75,kind:snow?3:5},{x:-340,y:-700,rx:230,ry:150,kind:snow?3:5},
            {x:1250,y:330,rx:340,ry:180,kind:snow?4:5},{x:1850,y:-350,rx:300,ry:200,kind:snow?4:2},
            {x:-1500,y:340,rx:260,ry:150,kind:snow?3:2},{x:800,y:1000,rx:260,ry:120,kind:snow?3:5}];
    }
    static randomize(seed){
        this.layout=ForestLayout.generate(seed,this.selected);const l=this.layout;
        this._trees=l.trees;this.patches=l.patches;
        this.regions=this.regions.map((r,i)=>({...r,...[l.spawn,l.nodes[2],l.nodes[3],l.ruin][i]}));
        if(this.selected==='forest')this.regions[0].name='出发营地';
        this.vents=l.patches.slice(0,3).map(p=>({x:p.x,y:p.y}));
        return l;
    }
    static width=5120;
    static height=2880;
    static regions=[
        {name:'中央营地',color:'#687b48',x:0,y:0},
        {name:'古木密林',color:'#35543c',x:0,y:-950},
        {name:'雾溪湿地',color:'#416963',x:1500,y:0},
        {name:'断墙遗迹',color:'#77794f',x:-1500,y:0}
    ];
    static patches=[
        {x:420,y:640,rx:145,ry:52,kind:0},
        {x:-300,y:-820,rx:180,ry:90,kind:0},
        {x:1350,y:300,rx:300,ry:160,kind:1},
        {x:1850,y:-330,rx:250,ry:150,kind:1},
        {x:2000,y:780,rx:240,ry:130,kind:1},
        {x:-1400,y:300,rx:270,ry:150,kind:2},
        {x:-1950,y:-380,rx:230,ry:110,kind:2}
    ];
    static region(x,y){if(this.layout)return this.regions.reduce((a,b)=>Math.hypot(x-a.x,y-a.y)<Math.hypot(x-b.x,y-b.y)?a:b);return Math.abs(x)<600&&Math.abs(y)<400?this.regions[0]:x>650?this.regions[2]:x<-650?this.regions[3]:this.regions[1];}
    static get trees(){
        if(this._trees)return this._trees;
        const trees=[];
        for(let row=0;row<12;row++)for(let col=0;col<24;col++){
            const n=row*24+col,offset=this.selected==='snow'?57:this.selected==='ash'?111:0,x=-2420+col*210+Math.sin(n*17+offset)*24,y=-1260+row*230+Math.cos(n*13+offset)*22;
            if(Math.abs(x)<150||Math.abs(y)<145||(Math.abs(x)<610&&Math.abs(y)<410))continue;
            // Snow groves leave diagonal clearings; ash pillars form smaller clusters.
            if(this.selected==='snow'&&(row+col)%5===0)continue;
            if(this.selected==='ash'&&(row%3===1||col%4===1))continue;
            if(this.patches.some(p=>((x-p.x)/(p.rx+90))**2+((y-p.y)/(p.ry+90))**2<1))continue;
            trees.push({x,y,r:22+n%9,crown:75+n%25});
        }
        if(this.selected!=='ash')for(const [x,y]of [[-400,-550],[460,1050]])for(let part=0;part<3;part++)trees.push({x:x+part*25,y,r:20,crown:0,fallen:true,part});
        return this._trees=trees.sort((a,b)=>a.y-b.y);
    }
    static blockingTree(actor,target){
        if(this.selected==='ash'||!['tank','elite'].includes(actor.type))return null;
        let best=null,near=Infinity;
        for(const t of this.trees){
            if(t.destroyed||t.fallen)continue;
            const d=Math.hypot(t.x-actor.x,t.y-actor.y);
            if(d>EnemyConfig.ATTACKS[actor.type].trigger||d>=near)continue;
            if(this.firstHit(actor.x,actor.y,target.x,target.y,actor.size,[t])!==null){best=t;near=d;}
        }return best;
    }
    static strikeTrees(e){
        if(this.selected==='ash'||!['tank','elite'].includes(e.type))return [];
        const attack=EnemyConfig.ATTACKS[e.type],hits=[];
        for(const t of this.trees){
            if(t.destroyed||t.fallen)continue;
            let touches;
            if(e.type==='tank')touches=Math.hypot(t.x-e.attackX,t.y-e.attackY)<=attack.radius+t.r;
            else{
                const dx=t.x-e.attackStartX,dy=t.y-e.attackStartY,d=Math.hypot(dx,dy);
                const relative=Math.atan2(Math.sin(Math.atan2(dy,dx)-e.attackAngle),Math.cos(Math.atan2(dy,dx)-e.attackAngle));
                const edge=e.attackAngle+Math.sign(relative)*attack.halfArc;
                const projection=Math.max(0,Math.min(attack.radius,dx*Math.cos(edge)+dy*Math.sin(edge)));
                touches=Math.abs(relative)<=attack.halfArc?d<=attack.radius+t.r:Math.hypot(dx-Math.cos(edge)*projection,dy-Math.sin(edge)*projection)<=t.r;
            }
            if(touches){t.hp=Math.max(0,(t.hp??120)-40);t.destroyed=t.hp===0;hits.push(t);}
        }return hits;
    }
    static clear(x,y,r){
        return Math.abs(x)<=2560-r&&Math.abs(y)<=1440-r&&!this.trees.some(t=>!t.destroyed&&(x-t.x)**2+(y-t.y)**2<(r+t.r)**2);
    }
    static move(actor,dx,dy){
        const r=actor.size||20,steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/10));
        for(let i=0;i<steps;i++){
            const x=Math.max(-2560+r,Math.min(2560-r,actor.x+dx/steps));
            if(this.clear(x,actor.y,r))actor.x=x;
            const y=Math.max(-1440+r,Math.min(1440-r,actor.y+dy/steps));
            if(this.clear(actor.x,y,r))actor.y=y;
        }
    }
    static resolve(actor,x,y){const dx=actor.x-x,dy=actor.y-y;actor.x=x;actor.y=y;this.move(actor,dx,dy);}
    static firstHit(x,y,endX,endY,r=0,obstacles=this.trees){
        const dx=endX-x,dy=endY-y,a=dx*dx+dy*dy;let first=null;
        for(const t of obstacles){
            if(t.destroyed)continue;
            const ox=x-t.x,oy=y-t.y,rr=t.r+r,c=ox*ox+oy*oy-rr*rr;
            if(c<=0)return 0;if(!a)continue;
            const b=2*(ox*dx+oy*dy),disc=b*b-4*a*c;if(disc<0)continue;
            const hit=(-b-Math.sqrt(disc))/(2*a);
            if(hit>=0&&hit<=1&&(first===null||hit<first))first=hit;
        }return first;
    }
    static steer(actor,target){
        const angle=Math.atan2(target.y-actor.y,target.x-actor.x);
        const ux=Math.cos(angle),uy=Math.sin(angle),r=actor.size||20;
        if(this.firstHit(actor.x,actor.y,target.x,target.y,r+4)===null){actor._forestDetour=null;return angle;}
        if(actor._forestDetour&&Math.hypot(actor.x-actor._forestDetour.x,actor.y-actor._forestDetour.y)>12)
            return Math.atan2(actor._forestDetour.y-actor.y,actor._forestDetour.x-actor.x);
        actor._forestDetour=null;
        for(const t of this.trees){
            if(t.destroyed)continue;
            const dx=t.x-actor.x,dy=t.y-actor.y,ahead=dx*ux+dy*uy,lateral=dx*uy-dy*ux;
            if(ahead>0&&ahead<r+t.r+100&&Math.abs(lateral)<r+t.r+12){
                const sides=lateral>=0?[1,-1]:[-1,1];
                for(const side of sides){const gap=r+t.r+35,p={x:t.x-uy*gap*side,y:t.y+ux*gap*side};
                    if(this.clear(p.x,p.y,r)&&this.firstHit(actor.x,actor.y,p.x,p.y,r+2)===null){actor._forestDetour=p;return Math.atan2(p.y-actor.y,p.x-actor.x);}
                }
            }
        }
        return angle;
    }
    static spawn(player,r,w,h){
        const start=Math.random()*Math.PI*2;
        for(let i=0;i<80;i++){
            const a=start+i*2.4,x=player.x+Math.cos(a)*(w*.6+100),y=player.y+Math.sin(a)*(h*.6+100);
            if(this.clear(x,y,r)&&Math.hypot(x-player.x,y-player.y)>350)return {x,y};
        }
        // The clear central trails provide a bounded fallback even at a corner.
        const candidates=[{x:0,y:0},{x:1200,y:0},{x:-1200,y:0},{x:0,y:1000},{x:0,y:-1000}];
        return candidates.sort((a,b)=>Math.hypot(b.x-player.x,b.y-player.y)-Math.hypot(a.x-player.x,a.y-player.y))[0];
    }
    static ground(c,cx,cy,w,h,time){
        c.fillStyle='#172b24';c.fillRect(0,0,w,h);c.save();c.translate(-cx,-cy);
        c.beginPath();c.rect(-2560,-1440,5120,2880);c.clip();
        c.fillStyle=this.theme.base;c.fillRect(-2560,-1440,5120,2880);
        // Soft region stains blend into each other instead of switching on a timer.
        for(const z of this.regions){const g=c.createRadialGradient(z.x,z.y,80,z.x,z.y,1100);g.addColorStop(0,z.color);g.addColorStop(1,'rgba(40,70,45,0)');c.fillStyle=g;c.fillRect(z.x-1100,z.y-1100,2200,2200);}
        for(let y=Math.floor(cy/100)*100;y<cy+h+100;y+=100)for(let x=Math.floor(cx/100)*100;x<cx+w+100;x+=100){
            const n=Math.sin(x*13+y*17),px=x+n*30,py=y+Math.cos(x+y)*25;
            c.globalAlpha=.07;ForestArt.oval(c,px,py,35+n*12,16,'#91a16b',null);c.globalAlpha=.5;
            for(let i=0;i<4;i++){
                const gx=px+Math.sin(x+y+i*7)*35,gy=py+Math.cos(x-y+i*13)*30;
                ForestArt.line(c,[[gx-3,gy],[gx,gy-5-i],[gx+3,gy-2]],i%2?this.theme.leaf:this.theme.base,1);
            }
            if(n>.7&&this.selected==='forest'){c.save();c.translate(px,py);for(let i=0;i<5;i++){c.rotate(1.25);ForestArt.oval(c,0,-6,3,9,'#527543','#2f5035',.6);}c.restore();}
        }c.globalAlpha=1;
        c.strokeStyle='#a59c6c';c.lineWidth=130;c.globalAlpha=.4;
        if(this.layout){for(const road of this.layout.roads)ForestArt.line(c,road.map(p=>[p.x,p.y]),this.theme.path,130);}
        else {
        ForestArt.line(c,[[-2560,0],[-1500,15],[-600,0],[0,0],[800,-10],[1600,0],[2560,0]],this.theme.path,130);
        ForestArt.line(c,[[0,-1440],[20,-650],[0,0],[-15,800],[0,1440]],this.theme.path,120);}
        c.globalAlpha=1;
        ForestArt.oval(c,this.layout?.spawn.x||0,this.layout?.spawn.y||0,290,190,this.theme.camp,null);
        for(const p of this.patches){
            if(p.x+p.rx<cx||p.x-p.rx>cx+w||p.y+p.ry<cy||p.y-p.ry>cy+h)continue;
            WoodlandScene.drawPatches(c,p.kind,[p]);
            if(p.kind===1)for(let j=0;j<12;j++){
                const a=j*2.4,x=p.x+Math.cos(a)*(p.rx+8),y=p.y+Math.sin(a)*(p.ry+8);
                ForestArt.line(c,[[x-6,y-9],[x,y+2],[x+3,y-19]],'#afbb77',2);
            }
        }
        // Camp landmarks remain passable; only the clearly drawn tree bases collide.
        c.save();if(this.layout)c.translate(this.layout.spawn.x,this.layout.spawn.y);
        ForestArt.shape(c,[[-240,-65],[-170,-165],[-100,-65]],'#c4ac6f','#4d5439',3);
        ForestArt.shape(c,[[-205,-66],[-170,-132],[-148,-66]],'#495741',null);
        ForestArt.line(c,[[130,-90],[180,-100]],'#674c32',17);
        for(let i=0;i<9;i++){const a=i*Math.PI*2/9;ForestArt.oval(c,Math.cos(a)*35,70+Math.sin(a)*20,8,5,'#b0ae88','#53634c');}
        ForestArt.shape(c,[[-14,72],[1,38+Math.sin(time*6)*3],[8,57],[17,44],[17,74]],'#e7a654',null);
        ForestArt.shape(c,[[-5,72],[3,55],[10,73]],'#f7d680',null);
        c.restore();c.save();if(this.layout)c.translate(this.layout.ruin.x+1500,this.layout.ruin.y);
        for(let j=0;j<18;j++){const x=-1650+(j%6)*57,y=-180+Math.floor(j/6)*42;ForestArt.shape(c,[[x,y],[x+48,y-2],[x+51,y+30],[x-3,y+32]],'#a09a78','#576347',2);}
        for(const x of [-1710,-1300]){ForestArt.shape(c,[[x,-260],[x+55,-265],[x+47,-170],[x-8,-165]],'#96987a','#46543d',3);ForestArt.line(c,[[x+10,-240],[x+30,-218],[x+13,-193]],'#59664e',3);}
        c.restore();
        // Boundary rock belt sits outside the walkable rectangle, not over hidden floor.
        for(let x=-2640;x<=2640;x+=90)for(const y of [-1475,1475])ForestArt.oval(c,x,y,60,48,'#465446','#263c30',3);
        for(let y=-1440;y<=1440;y+=90)for(const x of [-2595,2595])ForestArt.oval(c,x,y,50,60,'#465446','#263c30',3);
        c.restore();
    }
    static trunks(c,cx,cy,w,h){
        for(const t of this.trees){if(t.x<cx-130||t.x>cx+w+130||t.y<cy-130||t.y>cy+h+160)continue;
            const x=t.x-cx,y=t.y-cy;
            if(t.destroyed){ForestArt.oval(c,x,y,t.r,t.r*.48,'#876a42','#493f30',2);ForestArt.oval(c,x,y-2,t.r*.68,t.r*.27,'#c8ad75','#745b39',1);ForestArt.line(c,[[x-t.r,y+12],[x-t.r-12,y+18]],'#a98c56',4);continue;}
            if(this.selected==='ash'){
                ForestArt.oval(c,x+14,y+10,t.r+14,18,'rgba(24,19,20,.28)',null);
                ForestArt.shape(c,[[x-t.r,y],[x-t.r+3,y-55],[x-4,y-78],[x+t.r-2,y-57],[x+t.r,y+3],[x,y+12]],'#55494a','#302f34',3);
                ForestArt.shape(c,[[x-4,y-78],[x+4,y-28],[x+t.r,y+3],[x+t.r-2,y-57]],'#8a6960',null);
                ForestArt.line(c,[[x-10,y-45],[x-3,y-27],[x-8,y-10]],'#b58461',2);continue;
            }
            if(t.fallen){
                if(t.part===0){ForestArt.line(c,[[x,y],[x+50,y]],'#473c2d',40);ForestArt.line(c,[[x,y-5],[x+50,y-5]],'#8a6a42',24);ForestArt.oval(c,x+52,y,10,18,'#c0a271','#564b33',2);}
                continue;
            }
            ForestArt.oval(c,x+20,y+12,t.crown*.8,27,'rgba(14,30,22,.22)',null);
            ForestArt.oval(c,x,y,t.r,t.r,'#594633','#a39162',2);
            ForestArt.shape(c,[[x-t.r,y+5],[x-14,y-80],[x+15,y-80],[x+t.r,y+5]],'#76593a','#394431',3);
            ForestArt.line(c,[[x-5,y],[x-3,y-70]],'#b29359',3);
            if(t.hp<120){ForestArt.line(c,[[x+10,y-60],[x-4,y-42],[x+6,y-25],[x-8,y-5]],'#302b25',t.hp<=40?5:3);}
        }
    }
    static crowns(c,cx,cy,w,h,actors,time){
        for(const t of this.trees){if(t.x<cx-130||t.x>cx+w+130||t.y<cy-40||t.y>cy+h+180)continue;
            if(t.fallen||t.destroyed)continue;
            const x=t.x-cx,y=t.y-cy-85,r=t.crown;
            const covered=actors.some(a=>Math.abs(a.x-t.x)<r+a.size&&Math.abs(a.y-(t.y-85))<r*.7+a.size);
            c.save();c.globalAlpha=covered?.075:1;
            if(this.selected==='ash'){c.restore();continue;}
            if(this.selected==='snow'){
                for(let layer=0;layer<3;layer++){const top=y-65+layer*35,span=r*(.45+layer*.17);
                    ForestArt.shape(c,[[x,top],[x+span,top+68],[x,top+55],[x-span,top+68]],'#3c6865','#34514f',2);
                    ForestArt.shape(c,[[x,top],[x+span*.72,top+47],[x+12,top+39],[x-3,top+48],[x-span*.72,top+47]],'#dbe6dd','#aec8c3',1);
                }c.restore();continue;
            }
            for(let i=0;i<5;i++){const a=i*2.4,dx=Math.cos(a)*r*.4,dy=Math.sin(a)*r*.24;
                ForestArt.oval(c,x+dx+Math.sin(time*.7+t.x)*2,y+dy,r*.63,r*.46,i%2?'#446b42':'#355b39','#284b32',2);
            }
            ForestArt.oval(c,x-14,y-20,r*.47,r*.28,'#5a7d49',null);
            for(let i=0;i<12;i++){
                const a=i*2.4,rr=r*.65*Math.sqrt((i+.5)/12),lx=x+Math.cos(a)*rr,ly=y+Math.sin(a)*rr*.6;
                ForestArt.line(c,[[lx-5,ly+2],[lx,ly-2],[lx+5,ly]],i%3?'#70905a':'#294c34',2);
            }c.restore();
        }
    }
    static minimap(c,player,time=0){
        const w=c.canvas.width,h=c.canvas.height;
        c.clearRect(0,0,w,h);c.fillStyle=this.theme.base;c.fillRect(0,0,w,h);
        if(this.layout){
            const px=x=>(x+2560)/5120*w,py=y=>(y+1440)/2880*h;
            for(const t of this.trees)if(!t.destroyed){c.fillStyle='#315447';c.fillRect(px(t.x),py(t.y),2,2);}
            for(const road of this.layout.roads)ForestArt.line(c,road.map(p=>[px(p.x),py(p.y)]),'#bdb285',2);
            c.font='10px sans-serif';c.textAlign='center';c.fillStyle='#f1dfac';
            for(const [n,label]of [[this.layout.spawn,'营地'],[this.layout.ruin,'遗迹']]){c.fillRect(px(n.x)-2,py(n.y)-2,4,4);c.fillText(label,px(n.x),py(n.y)-6);}
        }else{
        c.fillStyle=this.regions[2].color;c.fillRect(w*.63,0,w*.37,h);c.fillStyle=this.regions[3].color;c.fillRect(0,0,w*.37,h);
        c.strokeStyle='#a39e70';c.lineWidth=3;ForestArt.line(c,[[0,h/2],[w,h/2]],'#a39e70',3);ForestArt.line(c,[[w/2,0],[w/2,h]],'#a39e70',3);
        c.font='11px sans-serif';c.textAlign='center';c.fillStyle='#e4dfb8';
        c.fillText(this.regions[1].name.slice(0,2),w/2,14);c.fillText(this.regions[1].name.slice(0,2),w/2,h-7);c.fillText('营地',w/2,h/2-6);c.fillText('遗迹',w*.17,h/2-6);c.fillText(this.regions[2].name.slice(0,2),w*.83,h/2-6);
        c.fillStyle='#e1b653';c.fillRect((1060/5120)*w-3,h/2-3,6,6);
        }
        const x=(player.x+2560)/5120*w,y=(player.y+1440)/2880*h;
        if(this.selected==='ash'){
            const e=this.eventAt(time);
            for(const [i,v]of this.vents.entries()){
                const active=e&&e.phase!=='rest'&&e.cycle%this.vents.length===i;
                ForestArt.oval(c,(v.x+2560)/5120*w,(v.y+1440)/2880*h,active?4:2,active?4:2,active?'#ffb76b':'#b8784e','#402f2b',1);
            }
        }
        ForestArt.oval(c,x,y,4,4,'#fff2aa','#263d2d',1);
        c.strokeStyle='#b4b888';c.lineWidth=2;c.strokeRect(1,1,w-2,h-2);
    }
    static weather(c,w,h,time){
        if(this.selected==='forest')return;
        const snow=this.selected==='snow';c.save();c.globalAlpha=snow?.48:.4;
        const storm=snow&&this.eventAt(time)?.phase==='active';
        for(let i=0;i<(storm?54:36);i++){
            const x=((i*173+Math.sin(time*.5+i)*25+time*(storm?95:snow?12:7))%(w+30)+w+30)%(w+30)-15;
            const y=((i*97+time*(snow?20:-16))%(h+30)+h+30)%(h+30)-15;
            ForestArt.oval(c,x,y,snow?1.5:1,snow?2:2.5,snow?'#edf8f3':'#edac65',null);
        }c.restore();
    }
}
