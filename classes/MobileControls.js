/** Touch controls are separate from keyboard state and reuse the existing game actions. */
class MobileControls {
    constructor(game) {
        this.game = game;
        this.pointerId = null;
        this.previousState = null;
        this.enabled = matchMedia('(pointer: coarse)').matches;
        document.body.classList.toggle('touch-device', this.enabled);
        this.stick = document.getElementById('joystick');
        this.knob = document.getElementById('joystick-knob');
        this.action = document.getElementById('mobile-action');
        this.dash = document.getElementById('mobile-dash');
        this.mute = document.getElementById('mobile-mute');
        this.terrainTip=document.querySelector('.mobile-tip');
        if (!this.enabled) return;
        try{const prefs=JSON.parse(localStorage.getItem('forest-controls')||'{}');this.setPreference('size',prefs.size??108);this.setPreference('opacity',prefs.opacity??.78);}catch{}
        this.danger=document.createElement('div');this.danger.hidden=true;
        this.danger.style.cssText='position:fixed;left:50%;transform:translateX(-50%);z-index:25;pointer-events:none;border:1px solid #f19785;border-radius:8px;padding:7px 12px;color:#fff3df;background:#692831;font:bold 14px sans-serif;max-width:85vw;text-align:center';
        document.body.append(this.danger);

        this.stick.addEventListener('pointerdown', e => {
            if (this.pointerId !== null || game.state !== 'playing') return;
            e.preventDefault();
            this.pointerId = e.pointerId;
            this.stick.setPointerCapture(e.pointerId);
            this.move(e);
        });
        this.stick.addEventListener('pointermove', e => {
            if (e.pointerId === this.pointerId) this.move(e);
        });
        for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
            this.stick.addEventListener(event, e => {
                if (e.pointerId === this.pointerId) this.release();
            });
        }
        this.dash.addEventListener('pointerdown', e => {
            e.preventDefault();
            if (game.state === 'playing') game.player.tryDash();
        });
        this.action.addEventListener('click', () => {
            this.release();
            if (game.state === 'start') game.startGame();
            else if (game.state === 'gameover') game.restart();
            else game.togglePause();
            this.update();
        });
        document.getElementById('mobile-restart').addEventListener('click', () => {
            this.release();
            game.audio.init();
            game.restart();
            this.update();
        });
        this.mute.addEventListener('click', () => {
            game.audio.init();
            game.audio.toggleMute();
            this.update();
        });
        const suspend = () => {
            this.release();
            if (game.state === 'playing') game.togglePause();
        };
        window.addEventListener('blur', suspend);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) suspend();
        });
        window.addEventListener('resize', () => this.release());
        this.upgrades = document.createElement('section');
        this.upgrades.id = 'mobile-upgrades';
        this.upgrades.hidden = true;
        this.upgrades.setAttribute('aria-label', '选择升级技能');
        document.getElementById('mobile-controls').append(this.upgrades);
        this.hud=document.createElement('section');this.hud.id='mobile-hud';this.hud.setAttribute('aria-label','战斗状态');
        this.hud.innerHTML='<div class=mobile-hud-line><b></b><span></span></div><div class=mobile-hp><i></i><span></span></div><div class=mobile-xp><i></i></div>';
        document.getElementById('mobile-controls').append(this.hud);
        this.update();
    }

    setPreference(key,value){
        this.preferences ||= {size:108,opacity:.78};
        this.preferences[key]=key==='size'?Math.max(88,Math.min(144,Number(value)||108)):Math.max(.35,Math.min(1,Number(value)||.78));
        document.documentElement.style.setProperty(key==='size'?'--stick-size':'--control-opacity',this.preferences[key]+(key==='size'?'px':''));
        try{localStorage.setItem('forest-controls',JSON.stringify(this.preferences));}catch{}
    }
    showUpgrades() {
        const game = this.game;
        this.upgrades.replaceChildren();
        const heading = document.createElement('h2');
        heading.textContent = '选择一项升级';
        this.upgrades.append(heading);
        const list = document.createElement('div');
        list.className = 'mobile-skill-list';
        game.skillUI.choices.forEach((choice, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'mobile-skill';
            button.style.setProperty('--skill-color',SkillCategory.getColor(choice.config.category));
            const name = document.createElement('strong');
            name.textContent = choice.config.name;
            const rarity = document.createElement('small');
            rarity.textContent = SkillRarity.getName(choice.config.rarity);
            const description = document.createElement('span');
            const detail=SkillUI.describeChoice(choice);
            rarity.textContent += ' · '+detail.label;
            description.textContent='获得后：'+detail.after;description.className='skill-after';
            const before=document.createElement('span');before.className='skill-before';before.textContent='当前：'+detail.before;
            button.append(name, rarity, before, description);
            button.addEventListener('click', () => {
                if (game.state !== 'upgrading') return;
                game.onKeyDown(String(index + 1));
                this.update();
            });
            list.append(button);
        });
        this.upgrades.append(list);
        const reroll = document.createElement('button');
        reroll.type = 'button';
        reroll.textContent = `刷新选项（剩余 ${game.skillManager.rerollsRemaining} 次）`;
        reroll.disabled = game.skillManager.rerollsRemaining <= 0;
        reroll.addEventListener('click', () => {
            if (game.state !== 'upgrading') return;
            const choices = game.skillManager.reroll();
            if (choices) { game.skillUI.open(choices); this.showUpgrades(); }
        });
        this.upgrades.append(reroll);
    }

    move(e) {
        if (this.game.state !== 'playing') return this.release();
        const rect = this.stick.getBoundingClientRect();
        let x = e.clientX - rect.left - rect.width / 2;
        let y = e.clientY - rect.top - rect.height / 2;
        const distance = Math.hypot(x, y);
        const radius=rect.width*.3;
        if (distance > radius) { x *= radius / distance; y *= radius / distance; }
        this.knob.style.transform = `translate(${x}px, ${y}px)`;
        this.game.player.touchKeys = { w: y < -10, s: y > 10, a: x < -10, d: x > 10 };
    }

    release() {
        const id = this.pointerId;
        this.pointerId = null;
        if (id !== null && this.stick.hasPointerCapture(id)) this.stick.releasePointerCapture(id);
        this.game.player.touchKeys = {};
        this.knob.style.transform = '';
    }

    update() {
        if (!this.enabled) return;
        const state = this.game.state;
        if (state !== this.previousState) {
            this.release();
            this.previousState = state;
            this.action.textContent = { start: '开始游戏', playing: '暂停', paused: '继续游戏', upgrading: '点击卡片升级', gameover: '重新开始', victory:'远征成功' }[state];
            this.action.disabled = state === 'upgrading';
            this.upgrades.hidden = state !== 'upgrading';
            if (state === 'upgrading') this.showUpgrades();
        }
        const feedback=this.game.hitFeedback,low=this.game.player.hp>0&&this.game.player.hp/this.game.player.maxHp<=.3;
        this.danger.hidden=state!=='playing'||(!low&&!(feedback?.life>0));
        if(!this.danger.hidden){
            const rect=this.game.canvas.getBoundingClientRect();this.danger.style.top=`${innerWidth>innerHeight?rect.top+58:Math.min(rect.bottom+8,innerHeight-155)}px`;
            const direction=feedback?.angle==null?'':Math.abs(feedback.angle)<Math.PI/4?'右侧':Math.abs(feedback.angle)>Math.PI*.75?'左侧':feedback.angle>0?'下方':'上方';
            this.danger.textContent=feedback?.life>0?`${direction}${feedback.kind} −${Math.ceil(feedback.amount)}${low?' · 生命危险！':''}`:'生命危险 · 闪避并寻找补给';
        }
        document.body.dataset.gameState=state;
        const ground=WoodlandScene.surfaceAt(this.game.player.x,this.game.player.y,this.game.survivalTime);
        if(this.terrainTip)this.terrainTip.textContent=ground&&['playing','paused'].includes(state)
            ?`${ground.name}：双方移速 ${ground.speed>1?'+':'−'}${Math.round(Math.abs(1-ground.speed)*100)}% · 可冲刺脱离`
            :'自动攻击 · 绕开湿地和碎石，或利用它们牵制怪物';
        if(!this.game.expedition&&this.terrainTip&&this.game.ruins&&Math.hypot(this.game.player.x-this.game.ruins.x,this.game.player.y-this.game.ruins.y)<300)this.terrainTip.textContent=this.game.ruins.label;
        if(this.hud){
            this.hud.hidden=!['playing','paused','upgrading'].includes(state);
            const p=this.game.player;
            this.hud.querySelector('b').textContent=`等级 ${p.level} · 第 ${this.game.wave} 波`;
            this.hud.querySelector('.mobile-hud-line span').textContent=`${Utils.formatTime(this.game.survivalTime)} · 击败 ${p.kills}`;
            this.hud.querySelector('.mobile-hp i').style.background=p.hp/p.maxHp<=.3?'#ef454f':'#ae785c';
            this.hud.querySelector('.mobile-hp i').style.width=`${Math.max(0,Math.min(100,p.hp/p.maxHp*100))}%`;
            this.hud.querySelector('.mobile-hp span').textContent=`${p.hp/p.maxHp<=.3?'危险！ ':''}生命 ${Math.ceil(p.hp)} / ${p.maxHp}${p.shield>0?' · 护盾 '+Math.ceil(p.shield):''}`;
            this.hud.querySelector('.mobile-xp i').style.width=`${Math.max(0,Math.min(100,this.game.uiManager.expSmooth*100))}%`;
        }
        this.dash.disabled = state !== 'playing';
        const remaining = this.game.player.dashCooldown;
        this.dash.textContent = remaining > 0 && state === 'playing' ? `${remaining.toFixed(1)}秒` : this.game.player.dodgeName;
        const muted = this.game.audio.isMuted();
        this.mute.textContent = muted ? '开启声音' : '静音';
        this.mute.setAttribute('aria-pressed', String(Boolean(muted)));
    }
}
