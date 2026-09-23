/** DOM controls keep weapon selection readable and keyboard/touch accessible. */
class Loadout {
    constructor(game) {
        this.game=game;
        this.panel=document.createElement('section');
        this.panel.className='loadout';this.panel.setAttribute('aria-label','出发前选择角色、地图与武器');
        this.panel.innerHTML=`<div class="loadout-inner"><p class="loadout-eyebrow">林地远征 / 冒险打磨 35</p><h1>这次，去哪里远征？</h1><p class="loadout-intro">选好角色、地图和武器。无尽模式每局重绘地形，从不同营地出发。环境影响你，也影响怪物。2 级强化武器，3 级选择分支。</p><p class="loadout-guide"><a href="skills.html">查看 64 个技能特效 ↗</a></p><div class="weapon-choices" role="group" aria-label="武器"></div><button class="loadout-start" type="button">带上连发枪 · 出发</button><p class="loadout-help">电脑：1 / 2 / 3 选择 · Enter 出发 · WASD 移动 · Shift 翻滚 / 瞬移<br>手机：点选角色、地图与武器 · 左侧摇杆移动 · 右侧翻滚 / 瞬移</p></div>`;
        const descriptions={pistol:['精准点射','直线高速 · 单发重击','预判走位，把握射击路线'],shuriken:['穿透投掷','三枚扇形 · 穿透一敌','旋转月刃，覆盖追击路线'],dark:['暗能爆裂','追踪暗球 · 范围伤害','聚集敌人，用暗月爆裂清场'],rifle:['持续压制','射速快 · 中远距离','适合边移动边持续输出'],shotgun:['近身爆发','五发散射 · 强击退','贴近时伤害更集中'],fireball:['范围灼烧','火球爆炸 · 持续燃烧','适合应对聚集的怪群']};
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
        this.mapNotes=document.createElement('p');this.mapNotes.className='map-notes';this.mapNotes.setAttribute('aria-live','polite');maps.after(this.mapNotes);
        const modes=document.createElement('div');modes.className='expedition-modes';
        modes.innerHTML='<button data-mode="chapter" type="button">林地闯关 · 有终点</button><button data-mode="endless" type="button">无尽生存 · 三张地图</button>';
        maps.before(modes);game.selectedMode='chapter';
        for(const b of modes.children)b.onclick=()=>{game.selectedMode=b.dataset.mode;this.selectMap(b.dataset.mode==='chapter'?'forest':game.selectedMap);};
        const characters=document.createElement('div');characters.className='character-choices';characters.setAttribute('role','group');characters.setAttribute('aria-label','角色');
        for(const [id,name,copy]of [['scout','林地游侠','原主角 · 战术翻滚'],['silver','霜影','白发面具 · 暗影瞬移']]){
            const b=document.createElement('button');b.type='button';b.dataset.character=id;
            b.innerHTML=`<canvas width="160" height="180" aria-hidden="true"></canvas><span><strong>${name}</strong><small>${copy}</small></span>`;
            b.onclick=()=>this.selectCharacter(id);characters.append(b);
        }
        modes.before(characters);
        let saved='scout';try{saved=localStorage.getItem('forest-character')||'scout';}catch{}
        this.selectCharacter(saved);
        this.selectMap('forest');
        this.panel.querySelector('.loadout-start').addEventListener('click',()=>{this.returnState=null;this.back.hidden=true;this.pauseDialog.close();game.startGame();});
        this.back=document.createElement('button');this.back.className='loadout-back';this.back.type='button';this.back.textContent='返回当前对局';this.back.hidden=true;this.back.onclick=()=>this.resumeRun();this.panel.querySelector('.loadout-inner').prepend(this.back);
        this.pauseDialog=document.createElement('dialog');this.pauseDialog.className='run-pause';this.pauseDialog.innerHTML='<h2>游戏已暂停</h2><p>当前对局已保留</p><button class="pause-resume" type="button">继续当前对局</button><button class="pause-new" type="button">设置下一局</button>';document.body.append(this.pauseDialog);
        this.pauseDialog.querySelector('.pause-resume').onclick=()=>this.resumeRun();this.pauseDialog.querySelector('.pause-new').onclick=()=>this.openSetup();
        this.pauseDialog.addEventListener('cancel',e=>{e.preventDefault();this.resumeRun();});
        if(game.mobileControls?.enabled){
            const settings=document.createElement('div');settings.className='control-settings';
            settings.innerHTML='<label>摇杆大小<input data-control-setting="size" type="range" min="88" max="144" step="4"></label><label>按键透明度<input data-control-setting="opacity" type="range" min="0.35" max="1" step="0.05"></label>';
            for(const input of settings.querySelectorAll('input')){const key=input.dataset.controlSetting;input.value=game.mobileControls.preferences?.[key]??(key==='size'?108:.78);input.oninput=()=>game.mobileControls.setPreference(key,input.value);}
            this.pauseDialog.append(settings);
        }

        this.menu=document.createElement('button');this.menu.type='button';this.menu.className='loadout-menu';this.menu.textContent='暂停 / 菜单';
        this.menu.addEventListener('click',()=>this.pauseRun());document.body.append(this.menu);
        this.select(this.game.selectedCharacter==='silver'?'pistol':'rifle');
    }
    pauseRun(){
        const g=this.game;
        if(this.returnState){if(!this.panel.hidden)this.resumeRun();return;}
        if(['gameover','victory','start'].includes(g.state)){this.openSetup();return;}
        if(g.weaponPaths?.dialog.open)return;
        this.returnState=g.state==='paused'?'playing':g.state;
        this.savedSelection={character:g.selectedCharacter,weapon:g.selectedWeapon,map:g.selectedMap,mode:g.selectedMode};
        g.state='paused';for(const key of Object.keys(g.player.keys))g.player.keys[key]=false;g.player.touchKeys={};g.mobileControls?.release();g.audio.pause();
        this.pauseDialog.showModal();this.pauseDialog.querySelector('.pause-resume').focus();
    }
    openSetup(){
        this.pauseDialog.close();this.game.state='start';this.panel.hidden=false;this.back.hidden=!this.returnState;this.select(this.game.selectedWeapon||'rifle');this.panel.scrollTop=0;
        if(this.returnState)this.panel.querySelector('.loadout-start').textContent='结束本局并开始新远征';
    }
    resumeRun(){
        if(!this.returnState)return;
        const state=this.returnState,s=this.savedSelection;this.pauseDialog.close();
        this.game.selectedMode=s.mode;this.selectCharacter(s.character);this.select(s.weapon);this.selectMap(s.map);
        this.returnState=null;this.back.hidden=true;this.hide();this.game.state=state;this.game.audio.resume();
        for(const key of Object.keys(this.game.player.keys))this.game.player.keys[key]=false;this.game.player.touchKeys={};
    }
    select(kind) {
        if(!this.availableWeapons.includes(kind))return;
        this.game.selectedWeapon=kind;
        for(const button of this.panel.querySelectorAll('[data-weapon]'))button.setAttribute('aria-pressed',String(button.dataset.weapon===kind));
        this.paintCharacters();
        this.panel.querySelector('.loadout-start').textContent=this.returnState?'结束本局并开始新远征':`带上${Player.WEAPONS[kind].name} · 出发`;
    }
    get availableWeapons(){return this.game.selectedCharacter==='silver'?['pistol','shuriken','dark']:['rifle','shotgun','fireball'];}
    selectCharacter(id){
        this.game.selectedCharacter=id==='silver'?'silver':'scout';
        for(const b of this.panel.querySelectorAll('[data-character]'))b.setAttribute('aria-pressed',String(b.dataset.character===this.game.selectedCharacter));
        try{localStorage.setItem('forest-character',this.game.selectedCharacter);}catch{}
        for(const b of this.panel.querySelectorAll('[data-weapon]'))b.hidden=!this.availableWeapons.includes(b.dataset.weapon);
        this.select(this.availableWeapons.includes(this.game.selectedWeapon)?this.game.selectedWeapon:this.availableWeapons[0]);
    }
    paintCharacters(){
        for(const b of this.panel.querySelectorAll('[data-character], [data-weapon]')){
            const canvas=b.querySelector('canvas'),c=canvas.getContext('2d');c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,canvas.width,canvas.height);
            const portrait=!!b.dataset.character;c.translate(canvas.width*.43,portrait?128:108);c.scale(portrait?2.5:2.4,portrait?2.5:2.4);
            ForestArt.player(c,{x:0,y:0,size:20,hp:100,animTimer:0,walkCycle:0,aimAngle:-.12,characterId:b.dataset.character||this.game.selectedCharacter,weaponType:b.dataset.weapon||(b.dataset.character==='scout'?'rifle':b.dataset.character==='silver'?'pistol':this.game.selectedWeapon)||'rifle'});
        }
    }
    selectMap(id){
        if(!ForestMap.MAPS[id])return;this.game.selectedMap=id;
        if(id!=='forest')this.game.selectedMode='endless';
        for(const b of this.panel.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b.dataset.mode===this.game.selectedMode));
        for(const b of this.panel.querySelectorAll('[data-map]'))b.setAttribute('aria-pressed',String(b.dataset.map===id));
        this.mapNotes.textContent={forest:'林地：敌人组合均衡，利用树木挡住追击。',snow:'雪谷：灰爪兽更多；间歇风雪使积雪减速 50%，主路和冰面不受风雪影响。',ash:'荒原：岩甲兽与爆燃菇更多；橙圈倒计时后喷发，可以引怪进入。'}[id];
        if(this.game.selectedMode==='endless')this.mapNotes.textContent+=' 限时补给可选争夺，注意射手与治疗祭司。';
        if(this.game.selectedMode==='chapter')this.mapNotes.textContent='林地闯关：清理两处巢穴 → 选择补给或精英路线 → 击败首领，完成远征。';
    }
    hide(){this.panel.hidden=true;document.activeElement?.blur();}
}
