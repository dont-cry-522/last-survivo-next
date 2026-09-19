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
        c.save(); c.translate(290,246); c.scale(3.4,3.4);
        const phase = time % 1.6;
        const hurt = pose === 'hurt' && phase < .28;
        const attacking = pose === 'attack' && phase < .2;
        if (canvas.dataset.kind === 'player') {
            ForestArt.player(c, {x:0,y:0,size:20,hp:pose==='death'?0:100,animTimer:time,
                walkCycle:time*13,moving:pose==='walk',aimAngle:-.16,
                recoilTimer:attacking?.14:0,muzzleFlash:attacking?.05:0,hurtTimer:hurt?.18:0});
        } else {
            ForestArt.enemy(c, {x:0,y:0,size:20,type:canvas.dataset.kind,hp:30,maxHp:30,
                angle:0,animTimer:pose==='idle'?Math.sin(time*2)*.04:time,hitFlash:hurt?.1:0,
                attackPose:attacking?.24:0},0,0,pose==='death'?Math.min(.99,phase/.8):0);
        }
        c.restore();
    });
    requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
