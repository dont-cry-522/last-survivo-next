/** Cached scenery; visible terrain footprints also define movement effects. */
class WoodlandScene {
    static GROUND = [
        {name:'泥地',speed:.75,fill:'#74533b',edge:'#b49365',fleck:'#c49c63'},
        {name:'浅水',speed:.8,fill:'#386e71',edge:'#9bc9b8',fleck:'#c0e7d3'},
        {name:'碎石',speed:.85,fill:'#726f5c',edge:'#c7b78a',fleck:'#d9cba3'},
        {name:'积雪',speed:.65,fill:'#d4e1da',edge:'#eef6e7',fleck:'#9ebcbf'},
        {name:'冰面',speed:1.12,fill:'#6faab9',edge:'#d2f4ea',fleck:'#d8f9f2'},
        {name:'灰烬',speed:.7,fill:'#48434a',edge:'#be8e67',fleck:'#d5ab81'}
    ];
    // Identical footprints in each phase prevent hazards appearing underfoot at transitions.
    static PATCHES = [
        {x:420,y:640,rx:145,ry:52},
        {x:180,y:180,rx:105,ry:70},
        {x:840,y:880,rx:110,ry:65}
    ];
    static surfaceAt(x,y,time) {
        const patch=ForestMap.patches.find(p=>((x-p.x)/p.rx)**2+((y-p.y)/p.ry)**2<=1);
        return patch?this.GROUND[patch.kind]:null;
    }
    static THEMES=[
        {name:'晨光林地',base:'#56764d',patch:'#688450',path:'#a29568',leaf:'#385d40',light:'#dae8a6',stone:'#a4aa87',accent:'#e4ba72'},
        {name:'幽蓝深林',base:'#344f4b',patch:'#42645c',path:'#697c6a',leaf:'#224439',light:'#96d4bb',stone:'#758e87',accent:'#9edbc7'},
        {name:'黄昏遗迹',base:'#656b42',patch:'#7a7d4b',path:'#b29868',leaf:'#485b39',light:'#f0d19a',stone:'#b3a77c',accent:'#e6a669'}
    ];
    static phase(time){return Math.min(2,Math.floor(Math.max(0,time)/90));}
    static tile(index){
        this.tiles ||= [];if(this.tiles[index])return this.tiles[index];
        const tile=document.createElement('canvas');tile.width=tile.height=1024;const c=tile.getContext('2d'),p=this.THEMES[index];
        c.fillStyle=p.base;c.fillRect(0,0,1024,1024);
        for(const ox of [-1024,0,1024])for(const oy of [-1024,0,1024]){
        c.save();c.translate(ox,oy);
        let seed=715;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
        for(let i=0;i<180;i++){const x=rand()*1024,y=rand()*1024;c.globalAlpha=.18+rand()*.2;ForestArt.oval(c,x,y,20+rand()*65,10+rand()*26,p.patch,null);}c.globalAlpha=1;
        // Broad worn paths meet at tile borders; shallow stones lie flush with the soil.
        for(const [dx,dy]of [[0,0],[-1024,0],[1024,0]]){c.save();c.translate(dx,dy);c.strokeStyle=p.path;c.globalAlpha=.3;c.lineWidth=92;c.beginPath();c.moveTo(0,640);c.bezierCurveTo(300,590,720,690,1024,640);c.stroke();c.globalAlpha=.12;c.lineWidth=126;c.stroke();c.restore();}
        for(let i=0;i<90;i++){const x=rand()*1024,y=600+rand()*75;c.globalAlpha=.25;ForestArt.oval(c,x,y,3+rand()*9,2+rand()*3,p.stone,null);}c.globalAlpha=1;
        // Low ferns, clover, fallen leaves and mushrooms provide different silhouettes.
        for(let i=0;i<95;i++){
            const x=rand()*1024,y=rand()*1024;if(y>580&&y<715)continue;
            c.save();c.translate(x,y);c.rotate(rand()*6.28);const scale=.6+rand()*.7;c.scale(scale,scale);
            if(i%3===0){ForestArt.line(c,[[0,7],[0,-24]],p.leaf,2);for(let j=0;j<5;j++)for(const side of [-1,1])ForestArt.shape(c,[[0,4-j*5],[side*(14-j*2),-3-j*5],[side*3,-7-j*5]],p.leaf,null);}
            else if(i%3===1){for(let j=0;j<4;j++){c.rotate(1.57);ForestArt.oval(c,0,-7,5,9,p.patch,p.leaf,.7);}}
            else{ForestArt.line(c,[[0,1],[0,-7]],p.stone,2);ForestArt.oval(c,0,-9,6,4,index===1?'#78b5aa':'#bb8957',p.leaf,1);ForestArt.oval(c,2,-10,1.5,1,p.light,null);}
            c.restore();
        }
        // Large, low-profile stone mosaics are landmarks, not upright obstacles.
        for(const [x,y]of [[245,300],[790,870]]){
            c.save();c.translate(x,y);c.scale(1,.65);c.globalAlpha=.6;
            for(let j=0;j<10;j++){const a=j*Math.PI/5;c.save();c.rotate(a);ForestArt.shape(c,[[53,-14],[79,-14],[83,12],[57,15]],p.stone,p.leaf,1);c.restore();}
            if(index===2){ForestArt.shape(c,[[-40,-25],[12,-38],[42,-7],[27,32],[-33,29]],p.stone,p.leaf,2);ForestArt.line(c,[[-16,-24],[-3,-5],[-12,15],[11,23]],p.leaf,2);}
            else{ForestArt.oval(c,0,0,33,24,p.patch,null);}
            c.restore();
        }
        for(let i=0;i<250;i++){const x=rand()*1024,y=rand()*1024;c.globalAlpha=.25;ForestArt.line(c,[[x-3,y+3],[x,y-4],[x+2,y+1]],i%2?p.light:p.leaf,1);}c.globalAlpha=1;
        // Each region has its own ground landmarks, beyond a palette change.
        if(index===1){
            for(const [rx,ry]of [[90,440],[650,150]]){c.save();c.translate(rx,ry);c.globalAlpha=.5;
                for(let branch=0;branch<4;branch++){c.strokeStyle='#273d35';c.lineWidth=12-branch*2;c.beginPath();c.moveTo(-70,0);c.bezierCurveTo(-30,20,30,-40+branch*24,120,branch*28);c.stroke();c.strokeStyle='#6c8870';c.lineWidth=2;c.stroke();}
                for(let j=0;j<6;j++)ForestArt.oval(c,j*24-40,Math.sin(j)*23,4,2,'#8fcbac',null);c.restore();}
        }else if(index===2){
            for(let j=0;j<12;j++){const x=420+(j%4)*43,y=300+Math.floor(j/4)*32;c.save();c.globalAlpha=.55;ForestArt.shape(c,[[x,y],[x+35,y-3],[x+39,y+22],[x-3,y+26]],p.stone,p.leaf,1);ForestArt.line(c,[[x+7,y+4],[x+20,y+9],[x+16,y+21]],p.path,1);c.restore();}
        }else{
            for(let j=0;j<18;j++){const x=600+Math.cos(j*2.4)*(25+j*2),y=420+Math.sin(j*2.4)*(15+j);ForestArt.line(c,[[x,y+5],[x,y-3]],p.leaf,1);ForestArt.oval(c,x,y-4,3,2,j%2?'#e2c17b':'#d3d9a0',null);}
        }
        // Draw last so foliage cannot hide the playable boundary. Art and physics share ellipses.
        this.drawPatches(c,index);
        c.restore();}
        this.tiles[index]=tile;return tile;
    }
    static drawPatches(c,index,patches=this.PATCHES) {
        const ground=this.GROUND[index];
        for(const p of patches){
            c.save();c.translate(p.x,p.y);
            ForestArt.oval(c,0,0,p.rx,p.ry,ground.fill,ground.edge,2);
            c.save();c.beginPath();c.ellipse(0,0,p.rx-2,p.ry-2,0,0,Math.PI*2);c.clip();
            for(let i=0;i<24;i++){
                const a=i*2.4,r=Math.sqrt((i+.5)/24),x=Math.cos(a)*p.rx*r,y=Math.sin(a)*p.ry*r;
                if(index===4){
                    c.globalAlpha=.6;ForestArt.line(c,[[x-12,y-7],[x,y],[x+14,y-4]],ground.fleck,1.2);
                }else if(index===3){
                    c.globalAlpha=.4;ForestArt.oval(c,x,y,16,4,ground.fleck,null);
                }else if(index===5){
                    c.globalAlpha=.5;ForestArt.oval(c,x,y,2+i%3,1,ground.fleck,null);
                }else if(index===2){
                    ForestArt.shape(c,[[x-5,y],[x-2,y-4],[x+5,y-3],[x+7,y+2],[x,y+4]],i%2?'#a89f83':'#565b51','#454b42',1);
                }else if(index===1){
                    c.globalAlpha=.35;ForestArt.line(c,[[x-9,y],[x,y+1],[x+8,y]],ground.fleck,1.4);
                }else{
                    c.globalAlpha=.35;ForestArt.oval(c,x,y,13+i%4,3+i%3,i%3?'#4b392c':'#b89665',null);
                }
            }
            c.restore();
            c.globalAlpha=.5;c.strokeStyle=ground.fleck;c.lineWidth=2;
            c.beginPath();c.ellipse(0,-3,p.rx*.78,p.ry*.72,0,Math.PI*1.1,Math.PI*1.65);c.stroke();
            c.restore();
        }
    }
    static drawFooting(c,entity,cx,cy,time,moving) {
        const ground=this.surfaceAt(entity.x,entity.y,time);
        const x=entity.x-cx,y=entity.y-cy;
        if(!ground||!moving||x<-80||y<-80||x>c.canvas.width+80||y>c.canvas.height+80)return;
        const phase=this.GROUND.indexOf(ground),cycle=((time*3+entity.x*.003)%1+1)%1;
        c.save();c.translate(x,y+entity.size*.5);c.globalAlpha=(1-cycle)*.6;
        if(phase===1){
            c.strokeStyle=ground.fleck;c.lineWidth=1.5;c.beginPath();c.ellipse(0,0,10+cycle*19,4+cycle*7,0,0,Math.PI*2);c.stroke();
        }else{
            for(let i=0;i<4;i++){
                const side=i%2?1:-1,dx=side*(8+cycle*(9+i*2)),dy=3-Math.sin(cycle*Math.PI)*9+i*2;
                ForestArt.oval(c,dx,dy,phase===0?3:2,2,ground.fleck,null);
            }
        }
        c.restore();
    }
    static drawPlayerStatus(c,player,cx,cy,time) {
        const ground=this.surfaceAt(player.x,player.y,time);
        if(!ground)return;
        const text=player.isDashing?'冲刺脱离':`${ground.name} · 移速 ${ground.speed>1?'+':'−'}${Math.round(Math.abs(1-ground.speed)*100)}%`;
        c.save();c.font='bold 13px "Microsoft YaHei"';c.textAlign='center';
        const width=c.measureText(text).width+20,x=player.x-cx,y=player.y-cy-player.size-30;
        c.fillStyle='rgba(21,34,28,.88)';c.fillRect(x-width/2,y-15,width,23);
        c.fillStyle='#eee1bc';c.fillText(text,x,y+1);c.restore();
    }
    static draw(c,cx,cy,w,h,time=0){
        const index=this.phase(time),blend=index===0?1:Math.min(1,(time-index*90)/8),p=this.THEMES[index];
        const layer=(n,alpha)=>{c.save();c.globalAlpha=alpha;const tile=this.tile(n);const x0=Math.floor(-((cx%1024)+1024)%1024),y0=Math.floor(-((cy%1024)+1024)%1024);for(let y=y0;y<h;y+=1024)for(let x=x0;x<w;x+=1024)c.drawImage(tile,x,y);c.restore();};
        if(blend<1)layer(index-1,1);layer(index,blend);
        // Dappled light and wind-blown leaves stay subdued beneath enemies and warnings.
        c.save();c.globalAlpha=.055;c.fillStyle=p.light;
        for(let i=0;i<4;i++){c.beginPath();c.moveTo(i*440-160-cx*.05,0);c.lineTo(i*440-35-cx*.05,0);c.lineTo(i*440+280-cx*.05,h);c.lineTo(i*440+120-cx*.05,h);c.fill();}c.restore();
        for(let i=0;i<18;i++){const x=((i*173+time*(5+i%3)-cx*.2)%(w+80)+w+80)%(w+80)-40,y=((i*137+time*8-cy*.2)%(h+60)+h+60)%(h+60)-30;c.save();c.translate(x,y);c.rotate(Math.sin(time+i)*.8);c.globalAlpha=.28;ForestArt.oval(c,0,0,index===1?1.4:4,index===1?1.4:1.7,p.accent,null);c.restore();}
        const shade=c.createRadialGradient(w/2,h/2,Math.min(w,h)*.28,w/2,h/2,w*.65);shade.addColorStop(0,'rgba(12,28,21,0)');shade.addColorStop(1,'rgba(12,28,21,.36)');c.fillStyle=shade;c.fillRect(0,0,w,h);
    }
    static foreground(c,w,h,time){
        const p=this.THEMES[this.phase(time)];c.save();c.globalAlpha=.22;
        for(const side of [-1,1]){c.save();c.translate(side<0?0:w,0);c.scale(side,1);for(let i=0;i<5;i++){const sway=Math.sin(time*.65+i)*5;ForestArt.shape(c,[[0,i*18],[70+i*9+sway,20+i*22],[30,50+i*20]],p.leaf,null);}c.restore();}c.restore();
    }
}
