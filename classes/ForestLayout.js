/** Seeded layouts are generated once per endless run, never during drawing. */
class ForestLayout {
    static distance(x,y,a,b){const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/l)):0;return Math.hypot(x-a.x-dx*t,y-a.y-dy*t);}
    static generate(seed,map){
        let state=seed>>>0;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
        const angle=random()*Math.PI*2,spawn={x:Math.cos(angle)*1550,y:Math.sin(angle)*850};
        const ruin={x:-spawn.x*.9,y:-spawn.y*.9},hub={x:(random()-.5)*450,y:(random()-.5)*300};
        const nodes=[spawn,ruin,{x:-1900+random()*3800,y:-1000},{x:-1900+random()*3800,y:1000}];
        const roads=nodes.map(n=>[n,{x:(n.x+hub.x)/2+(random()-.5)*260,y:(n.y+hub.y)/2+(random()-.5)*180},hub]);
        const roadDistance=(x,y)=>Math.min(...roads.flatMap(r=>r.slice(1).map((b,i)=>this.distance(x,y,r[i],b))));
        const safe=(x,y,r)=>nodes.some(n=>Math.hypot(x-n.x,y-n.y)<r+330)||Math.hypot(x-hub.x,y-hub.y)<r+150||roadDistance(x,y)<r+85;
        const patches=[];
        for(let i=0;i<180&&patches.length<24;i++){
            const x=-2200+random()*4400,y=-1100+random()*2200,rx=100+random()*140,ry=65+random()*100;
            if(safe(x,y,Math.max(rx,ry)))continue;
            const kinds=map==='snow'?[3,3,4]:map==='ash'?[5,5,2]:[0,1,2];
            patches.push({x,y,rx,ry,kind:kinds[Math.floor(random()*kinds.length)]});
        }
        const trees=[];
        for(let cluster=0;cluster<30;cluster++){
            const cx=-2250+random()*4500,cy=-1150+random()*2300;
            for(let i=0;i<(map==='ash'?12:22);i++){
                const a=random()*Math.PI*2,d=Math.sqrt(random())*(160+random()*260),x=cx+Math.cos(a)*d,y=cy+Math.sin(a)*d,r=18+random()*15;
                if(Math.abs(x)>2450||Math.abs(y)>1320||safe(x,y,r)||patches.some(p=>((x-p.x)/(p.rx+r))**2+((y-p.y)/(p.ry+r))**2<1))continue;
                if(trees.some(t=>Math.hypot(t.x-x,t.y-y)<t.r+r+45))continue;
                trees.push({x,y,r,crown:65+random()*40});
            }
        }
        return {seed,spawn,ruin,hub,nodes,roads,patches,trees:trees.sort((a,b)=>a.y-b.y),roadDistance};
    }
}
