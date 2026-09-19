let pose = 'walk', paused = false, time = 0, previous = performance.now();
const canvases = Array.from(document.querySelectorAll('canvas'));
for (const button of document.querySelectorAll('[data-state]')) {
    button.addEventListener('click', () => {
        pose = button.dataset.state; time = 0;
        for (const choice of document.querySelectorAll('[data-state]')) choice.setAttribute('aria-pressed',String(choice === button));
    });
}
document.querySelector('#pause').addEventListener('click', event => {
    paused = !paused;
    event.target.textContent = paused ? '继续动画' : '暂停动画';
    event.target.setAttribute('aria-pressed',String(paused));
});
function draw(now) {
    if (!paused && !document.hidden) time += Math.min((now - previous) / 1000, 0.05);
    previous = now;
    canvases.forEach((canvas, index) => {
        const c = canvas.getContext('2d');
        ForestArt.terrain(c,index*180,60,600,370);
        const kind=canvas.dataset.kind;
        const config=EnemyConfig.ATTACKS[kind];
        const demo=pose==='attack' && config;
        const phase = time % 1.6;
        const hurt = pose === 'hurt' && phase < .28;
        const attacking = pose === 'attack' && phase < .2;
        c.save(); c.translate(290,demo?216:246); c.scale(demo?1.6:3.4,demo?1.6:3.4);
        let stateLabel='';
        if (kind === 'player') {
            ForestArt.player(c, {x:0,y:0,size:20,hp:pose==='death'?0:100,animTimer:time,
                walkCycle:time*13,moving:pose==='walk',aimAngle:-.16,
                recoilTimer:attacking?.14:0,muzzleFlash:attacking?.05:0,hurtTimer:hurt?.18:0});
        } else {
            const enemy={x:0,y:0,size:20,type:kind,hp:30,maxHp:30,
                angle:0,animTimer:pose==='idle'?Math.sin(time*2)*.04:time,hitFlash:hurt?.1:0,
                attackPose:attacking?.24:0};
            if(demo) {
                const phase=time%(config.windup+config.strike+config.recover);
                enemy.combatState=phase<config.windup?'windup':phase<config.windup+config.strike?'strike':'recover';
                enemy.combatTimer=enemy.combatState==='windup'?config.windup-phase:enemy.combatState==='strike'?config.windup+config.strike-phase:config.windup+config.strike+config.recover-phase;
                enemy.attackStartX=-config.distance/2;
                enemy.attackStartY=0;enemy.attackAngle=0;
                enemy.attackX=config.distance/2;enemy.attackY=0;
                const progress=enemy.combatState==='windup'?0:enemy.combatState==='strike'?1-enemy.combatTimer/config.strike:1;
                enemy.x=enemy.attackStartX+(kind==='tank'?0:progress*config.distance);
                enemy.attackPose=enemy.combatState==='strike'?.24:0;
                ForestArt.telegraph(c,enemy);
                if(kind==='tank' && phase>=config.windup && phase<config.windup+.42) ForestArt.impact(c,{x:enemy.attackX,y:0,kind:'slam',radius:config.radius,duration:.42,life:.42-(phase-config.windup)});
                stateLabel=enemy.combatState==='windup'?'蓄力 · 方向已经锁定':enemy.combatState==='strike'?'出招 · 避开预警范围':'收招 · 反击的好时机';
            }
            ForestArt.enemy(c,enemy,0,0,pose==='death'?Math.min(.99,phase/.8):0);
        }
        c.restore();
        if(stateLabel) {c.textAlign='center';c.font='22px "Microsoft YaHei", sans-serif';c.fillStyle='#f3deb0';c.fillText(stateLabel,300,338);}
    });
    requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
