/** DOM controls keep weapon selection readable and keyboard/touch accessible. */
class Loadout {
    constructor(game) {
        this.game=game;
        this.panel=document.createElement('section');
        this.panel.className='loadout';this.panel.setAttribute('aria-label','出发前选择武器');
        this.panel.innerHTML=`<div class="loadout-inner"><p class="loadout-eyebrow">林地远征 / 三境远征 14</p><h1>这次，去哪里远征？</h1><p class="loadout-intro">先选地图，再选武器。环境影响你，也影响追来的怪物。2 级强化武器，3 级选择分支。</p><p class="loadout-guide"><a href="skills.html">查看 64 个技能特效 ↗</a></p><div class="weapon-choices" role="group" aria-label="武器"></div><button class="loadout-start" type="button">带上连发枪 · 出发</button><p class="loadout-help">电脑：1 / 2 / 3 选择 · Enter 出发 · WASD 移动 · Shift 冲刺<br>手机：点选地图与武器 · 左侧摇杆移动 · 右侧冲刺</p></div>`;
        const descriptions={rifle:['持续压制','射速快 · 中远距离','适合边移动边持续输出'],shotgun:['近身爆发','五发散射 · 强击退','贴近时伤害更集中'],fireball:['范围灼烧','火球爆炸 · 持续燃烧','适合应对聚集的怪群']};
        for(const [kind,weapon] of Object.entries(Player.WEAPONS)) {
            const button=document.createElement('button');button.type='button';button.dataset.weapon=kind;
            const copy=descriptions[kind];
            button.innerHTML=`<span class="weapon-role">${copy[0]}</span><canvas width="200" height="150" aria-hidden="true"></canvas><h2>${weapon.name}</h2><strong>${copy[1]}</strong><small>${copy[2]}</small>`;
            button.addEventListener('click',()=>this.select(kind));this.panel.querySelector('.weapon-choices').append(button);
            const c=button.querySelector('canvas').getContext('2d');c.scale(2.4,2.4);
            ForestArt.player(c,{x:38,y:45,size:20,hp:100,animTimer:0,walkCycle:0,aimAngle:-.12,weaponType:kind});
        }
        document.body.append(this.panel);
        const maps=document.createElement('div');maps.className='map-choices';maps.setAttribute('role','group');maps.setAttribute('aria-label','远征地图');
        for(const [id,map]of Object.entries(ForestMap.MAPS)){
            const b=document.createElement('button');b.type='button';b.dataset.map=id;
            b.innerHTML=`<span class="map-art map-art-${id}" aria-hidden="true"></span><strong>${map.name}</strong><small>${map.desc}</small>`;
            b.addEventListener('click',()=>this.selectMap(id));maps.append(b);
        }
        this.panel.querySelector('.weapon-choices').before(maps);
        this.selectMap('forest');
        this.panel.querySelector('.loadout-start').addEventListener('click',()=>game.startGame());
        this.menu=document.createElement('button');this.menu.type='button';this.menu.className='loadout-menu';this.menu.textContent='换地图 / 武器';
        this.menu.addEventListener('click',()=>{
            game.state='start';game.skillUI.close();for(const key of Object.keys(game.player.keys))game.player.keys[key]=false;game.player.touchKeys={};
            this.panel.hidden=false;this.select(game.selectedWeapon||'rifle');
            this.panel.querySelector('[aria-pressed="true"]').focus();
        });document.body.append(this.menu);
        this.select('rifle');
    }
    select(kind) {
        if(!Player.WEAPONS[kind])return;
        this.game.selectedWeapon=kind;
        for(const button of this.panel.querySelectorAll('[data-weapon]'))button.setAttribute('aria-pressed',String(button.dataset.weapon===kind));
        this.panel.querySelector('.loadout-start').textContent=`带上${Player.WEAPONS[kind].name} · 出发`;
    }
    selectMap(id){
        if(!ForestMap.MAPS[id])return;this.game.selectedMap=id;
        for(const b of this.panel.querySelectorAll('[data-map]'))b.setAttribute('aria-pressed',String(b.dataset.map===id));
    }
    hide(){this.panel.hidden=true;document.activeElement?.blur();}
}
