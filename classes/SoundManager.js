/**
 * ============================================================
 *  SoundManager.js - 音效系统
 * ============================================================
 *  使用 Web Audio API 程序化生成音效，无需外部文件
 *  完全零依赖，符合项目设计理念
 * ============================================================
 */

class SoundManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.masterVolume = 0.5;
        this.initialized = false;
        this.lastAttackCue = -Infinity;
        this.lastWeaponImpact = {};
        this.lastSkillCue=-Infinity;
        this.music=typeof MusicController!=='undefined'?new MusicController(this):null;
        try{const saved=localStorage.getItem('woodland-effects-volume');if(saved!==null&&Number.isFinite(Number(saved)))this.masterVolume=Math.max(0,Math.min(1,Number(saved)));}catch{}
    }

    /**
     * 初始化 AudioContext（需要用户交互后调用）
     */
    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
            this.music?.start();
        } catch (e) {
            console.warn('Web Audio API 不可用:', e);
            this.enabled = false;
        }
    }

    /**
     * 确保已初始化
     */
    _ensureInit() {
        if (!this.initialized) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    /**
     * 创建增益节点
     */
    _gain(volume = 1) {
        const g = this.ctx.createGain();
        g.gain.value = volume * this.masterVolume;
        g.connect(this.ctx.destination);
        return g;
    }

    /**
     * 播放一个音调
     */
    _playTone(freq, duration, type = 'square', volume = 0.3, rampDown = true) {
        if (!this.enabled || !this.ctx) return;
        this._ensureInit();

        const osc = this.ctx.createOscillator();
        const gain = this._gain(volume);

        osc.type = type;
        osc.frequency.value = freq;
        osc.connect(gain);

        const now = this.ctx.currentTime;
        if (rampDown) {
            gain.gain.setValueAtTime(volume * this.masterVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        }

        osc.start(now);
        osc.stop(now + duration);
    }

    /**
     * 播放噪声
     */
    _playNoise(duration, volume = 0.2, filterFreq = 1000) {
        if (!this.enabled || !this.ctx) return;

        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = filterFreq;

        const gain = this._gain(volume);
        const now = this.ctx.currentTime;
        gain.gain.setValueAtTime(volume * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        noise.connect(filter);
        filter.connect(gain);

        noise.start(now);
        noise.stop(now + duration);
    }

    // ==================== 玩家音效 ====================

    /** 射击音效 */
    weaponShoot(kind,path=null) {
        if(!this.enabled||!this.ctx)return;
        this._playElement(['rapid','heavy','wide','focus','ground','split'].includes(path)?path:kind==='fireball'?'fire_cast':kind==='shotgun'?'shotgun':'rifle');
    }

    // Resolve a collision's sound after its real on-hit skill procs.
    beginImpact(){this.pendingImpact={element:false,weapon:null};}
    endImpact(){const pending=this.pendingImpact;this.pendingImpact=null;if(pending?.weapon&&!pending.element)this.weaponImpact(...pending.weapon);}

    /** Noise grains and physical envelopes instead of pitched notification tones. */
    _playElement(kind) {
        this._ensureInit();
        this.elementBuffers ||= {};
        let buffer=this.elementBuffers[kind];
        if(!buffer){
            const rate=this.ctx.sampleRate,duration=({rapid:.075,heavy:.32,wide:.28,focus:.18,ground:.42,split:.30,fire:.48,ice:.30,lightning:.19,shadow:.22,mark:.24,soul:.38,bastion:.25,mechanical:.15,beam:.4,explosion:.36,rifle:.09,shotgun:.22,fire_cast:.25,gun:.08})[kind]||.2;
            buffer=this.ctx.createBuffer(1,Math.ceil(rate*duration),rate);
            const data=buffer.getChannelData(0);let seed=317,low=0,previous=0;
            for(let i=0;i<data.length;i++){
                seed=(Math.imul(seed,1664525)+1013904223)>>>0;
                const noise=seed/2147483648-1,t=i/rate;low+=.035*(noise-low);
                let value;
                if(kind==='rapid'){
                    value=(noise-low)*.65*Math.exp(-t*95)+noise*.2*Math.exp(-Math.abs(t-.025)*550);
                }else if(kind==='heavy'){
                    value=Math.sin(2*Math.PI*(92*t-90*t*t))*.52*Math.exp(-t*13)+low*2.2*Math.exp(-t*8)+noise*.22*Math.exp(-t*65);
                }else if(kind==='wide'){
                    value=noise*.7*Math.exp(-t*28)+low*2*Math.exp(-t*10)+noise*.15*Math.exp(-Math.abs(t-.13)*90);
                }else if(kind==='focus'){
                    value=(noise-low)*.65*Math.exp(-t*65)+Math.sin(2*Math.PI*125*t)*.45*Math.exp(-t*28);
                }else if(kind==='ground'){
                    value=(low*3+noise*.27)*Math.sin(Math.PI*t/duration)*Math.exp(-t*4)+noise*.12*Math.exp(-(t%.06)*100);
                }else if(kind==='split'){
                    value=noise*.42*Math.sin(Math.PI*t/duration)*(1+.5*Math.sin(t*100))+Math.sin(2*Math.PI*(180*t+800*t*t))*.14*Math.exp(-t*12);
                }else if(kind==='ice'){
                    // Brittle initial crack followed by scattered, irregular shard ticks.
                    const grain=t% .037,burst=Math.exp(-grain*430)*Math.exp(-t*10);
                    const high=noise-previous;previous=noise;
                    value=high*(.32*Math.exp(-t*85)+.42*burst);
                }else if(kind==='lightning'){
                    // Gated broadband arc with a descending electrical rasp.
                    const gate=Math.sin(t*690+Math.sin(t*93)*3)>-.15?1:.12;
                    value=(noise*.65+Math.sin(2*Math.PI*(160*t-250*t*t))*.18)*gate*Math.exp(-t*23);
                }else if(kind==='shadow'){
                    value=(noise-low)*.5*Math.sin(Math.PI*t/duration)**2*Math.exp(-t*7);
                }else if(kind==='mark'){
                    value=(noise*.45*(.4+.6*Math.abs(Math.sin(t*430)))+low)*Math.exp(-t*18);
                }else if(kind==='soul'){
                    value=(low*1.4+Math.sin(t*2*Math.PI*(95-t*100))*.22)*Math.sin(Math.PI*t/duration)*Math.exp(-t*6);
                }else if(kind==='bastion'){
                    value=(Math.sin(t*2*Math.PI*115)*.5+Math.sin(t*2*Math.PI*287)*.16+noise*.18)*Math.exp(-t*24);
                }else if(kind==='mechanical'){
                    value=(noise*.7*Math.exp(-(t%.045)*170)+Math.sin(t*2*Math.PI*190)*.15)*Math.exp(-t*26);
                }else if(kind==='beam'){
                    value=(noise*.25+Math.sin(2*Math.PI*(210*t+650*t*t))*.22)*Math.sin(Math.PI*t/duration)*Math.exp(-t*4);
                }else if(kind==='armor'){
                    value=(noise*.32+Math.sin(t*2*Math.PI*173)*.3+Math.sin(t*2*Math.PI*391)*.12)*Math.exp(-t*38);
                }else if(kind==='flesh'){
                    value=(low*2.3+noise*.22+Math.sin(t*2*Math.PI*94)*.22)*Math.exp(-t*35);
                }else if(kind==='rifle'||kind==='gun'){
                    value=(noise*.6+low*.7)*Math.exp(-t*65);
                }else if(kind==='shotgun'||kind==='explosion'){
                    value=(low*2+noise*.25+Math.sin(2*Math.PI*72*t)*.45)*Math.exp(-t*19);
                }else if(kind==='fire_cast'){
                    value=(low*2+noise*.15)*Math.sin(Math.PI*t/duration)*Math.exp(-t*6);
                }else{
                    // A pressure thump, turbulent body and a fading flame tail.
                    value=(Math.sin(2*Math.PI*(78*t-58*t*t))*.58*Math.exp(-t*17)+low*2.4*Math.exp(-t*7)+noise*.15*Math.exp(-t*65));
                }
                data[i]=Math.max(-.9,Math.min(.9,value))*Math.min(1,t*2500)*Math.min(1,(duration-t)*150);
            }
            this.elementBuffers[kind]=buffer;
        }
        const source=this.ctx.createBufferSource();source.buffer=buffer;
        source.connect(this._gain(kind==='fire'?.48:.36));source.start();
        source.onended=()=>source.disconnect();
    }

    skillCue(kind) {
        const elemental=['fire','meteor','nova','phoenix','ice','lightning','beam','shadow','mark','soul','bastion','mechanical','explosion','gun'].includes(kind);
        if(elemental&&this.pendingImpact)this.pendingImpact.element=true;
        if(!this.enabled||!this.ctx)return;
        const family=['fire','meteor','nova','phoenix'].includes(kind)?'fire':kind;
        this.skillCueTimes ||= {};
        if(this.ctx.currentTime-(this.skillCueTimes[family]??-Infinity)<.18)return;
        this.skillCueTimes[family]=this.ctx.currentTime;
        if(elemental)this._playElement(family);
        else if(kind==='heal'||kind==='pickup'){this._playTone(660,.14,'sine',.035);this._playTone(990,.18,'sine',.02);}
        else if(kind==='shadow'||kind==='soul'||kind==='mark')this._playNoise(.10,.035,750);
    }

    weaponImpact(kind, crit=false, material=null,path=null) {
        if(this.pendingImpact){this.pendingImpact.weapon=[kind,crit,material,path];return;}
        if(kind==='fireball'){this.skillCue('fire');return;}
        if(!this.enabled || !this.ctx) return;
        kind=['rifle','shotgun','fireball'].includes(kind)?kind:'rifle';
        const now=this.ctx.currentTime;
        const spacing=kind==='shotgun'?.09:kind==='fireball'?.12:.045;
        if(now-(this.lastWeaponImpact[kind]??-Infinity)<spacing)return;
        this.lastWeaponImpact[kind]=now;
        this._playElement(path==='heavy'?'heavy':kind==='shotgun'?'shotgun':material==='tank'||material==='elite'?'armor':material?'flesh':'gun');
        if(crit)this._playNoise(.035,.035,1700);
    }

    shoot() {
        this._playTone(800, 0.08, 'square', 0.08);
        // 叠加一个低音增加层次感
        this._playTone(400, 0.06, 'sawtooth', 0.05);
    }

    /** 冲刺音效 */
    dash() {
        this._playCreature('dash','move');
    }

    /** Material and breath transients, rather than pitched UI oscillators. */
    _playCreature(type,phase){
        if(!this.enabled||!this.ctx)return;this._ensureInit();
        const key=type+':'+phase,now=this.ctx.currentTime;
        this.creatureTimes ||= {};this.creatureBuffers ||= {};this.creatureVariants ||= {};
        if(now-(this.creatureTimes[key]??-Infinity)<(phase==='death'?.14:.1))return;
        if((this.creatureVoices||0)>=(phase==='death'?6:type==='dash'?12:10))return;
        this.creatureTimes[key]=now;
        let buffer=this.creatureBuffers[key];
        if(!buffer){
            const duration=type==='dash'?.23:phase==='windup'?.38:phase==='death'?.28:type==='exploder'?.48:type==='tank'?.38:.24;
            const rate=this.ctx.sampleRate;buffer=this.ctx.createBuffer(1,Math.ceil(duration*rate),rate);
            const data=buffer.getChannelData(0);let seed=917,low=0,body=0;
            for(let i=0;i<data.length;i++){
                seed=(Math.imul(seed,1664525)+1013904223)>>>0;const n=seed/2147483648-1,t=i/rate,u=t/duration;
                low+=.025*(n-low);body+=.22*(n-body);const air=body-low,thud=Math.sin(2*Math.PI*(75*t-45*t*t))*Math.exp(-t*24);
                let v=0;
                if(type==='dash')v=air*2.4*Math.sin(Math.PI*u)**1.6+thud*.32+low*.5*Math.exp(-Math.abs(t-.17)*75);
                else if(type==='normal')v=(low*2.2+air*.45)*Math.exp(-t*10)+thud*.45+air*.6*Math.exp(-Math.abs(t-.08)*80);
                else if(type==='fast')v=phase==='windup'?(low*3+air*.45)*(1+.4*Math.sin(t*115))*Math.sin(Math.PI*u):air*2*Math.sin(Math.PI*u)+low*Math.exp(-t*12);
                else if(type==='tank')v=low*3.6*Math.exp(-t*7)+thud*.8+air*.7*(Math.exp(-Math.abs(t-.07)*100)+Math.exp(-Math.abs(t-.17)*130));
                else if(type==='elite')v=low*2.5*Math.sin(Math.PI*u)+air*1.2*Math.sin(Math.PI*u)**.7*(.7+.3*Math.sin(t*190))+thud*.5;
                else if(type==='exploder')v=phase==='windup'?air*(.4+u)*1.7+ n*.4*Math.exp(-(t%.047)*210):low*4*Math.exp(-t*6)+air*.6*Math.exp(-t*11)+thud*.9;
                if(phase==='death')v*=Math.exp(-t*5);
                if(phase==='windup'&&type!=='fast'&&type!=='exploder')v=(v*.6+low*Math.sin(Math.PI*u))*Math.sin(Math.PI*u);
                data[i]=Math.tanh(v)*.8*Math.min(1,t/.004)*Math.min(1,(duration-t)/.018);
            }this.creatureBuffers[key]=buffer;
        }
        const source=this.ctx.createBufferSource(),gain=this._gain(type==='dash'?.55:phase==='windup'?.44:phase==='death'?.3:.55);
        const variant=this.creatureVariants[key]||0;this.creatureVariants[key]=(variant+1)%3;
        source.buffer=buffer;source.playbackRate.value=[1,.975,1.025][variant];source.connect(gain);this.creatureVoices=(this.creatureVoices||0)+1;
        source.onended=()=>{source.disconnect();gain.disconnect();this.creatureVoices=Math.max(0,this.creatureVoices-1);};source.start();
    }

    /** 受击音效 */
    playerHit() {
        this._playTone(150, 0.3, 'sawtooth', 0.2);
        this._playTone(100, 0.25, 'square', 0.15);
    }

    // ==================== 子弹音效 ====================

    /** 子弹命中敌人 */
    hit() {
        this._playTone(1200, 0.06, 'square', 0.06);
        this._playNoise(0.05, 0.04, 3000);
    }

    /** 暴击命中 */
    critHit() {
        this._playTone(1800, 0.08, 'square', 0.1);
        this._playTone(900, 0.06, 'sawtooth', 0.06);
        this._playNoise(0.06, 0.06, 4000);
    }

    /** Readable attack cues, rate limited when many creatures attack together. */
    enemyAttackCue(type, phase) {
        this._playCreature(type,phase);
    }

    // ==================== 敌人音效 ====================

    /** 普通敌人死亡 */
    enemyDead(type='normal') {
        this._playCreature(type,'death');
    }

    /** 精英/坦克死亡 */
    enemyDeadBig(type='tank') {
        this._playCreature(type,'death');
    }

    /** 自爆敌人爆炸 */
    exploderExplode() {
        this._playCreature('exploder','strike');
    }

    // ==================== Boss音效 ====================

    /** Boss出场 */
    bossAppear() {
        if (!this.enabled || !this.ctx) return;
        this._ensureInit();

        // 低频轰鸣
        for (let i = 0; i < 3; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this._gain(0.2);
            osc.type = 'sawtooth';
            const now = this.ctx.currentTime + i * 0.3;
            osc.frequency.setValueAtTime(80, now);
            osc.frequency.setValueAtTime(60, now + 0.15);
            osc.frequency.setValueAtTime(40, now + 0.3);
            osc.connect(gain);
            gain.gain.setValueAtTime(0.2 * this.masterVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc.start(now);
            osc.stop(now + 0.35);
        }
        this._playNoise(0.8, 0.15, 500);
    }

    /** Boss冲撞前摇 */
    bossChargeWindup() {
        if (!this.enabled || !this.ctx) return;
        this._ensureInit();
        const osc = this.ctx.createOscillator();
        const gain = this._gain(0.12);
        osc.type = 'sawtooth';
        const now = this.ctx.currentTime;
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.linearRampToValueAtTime(300, now + 1);
        osc.connect(gain);
        gain.gain.setValueAtTime(0.12 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
        osc.start(now);
        osc.stop(now + 1.1);
    }

    /** Boss冲撞 */
    bossCharge() {
        this._playNoise(0.5, 0.15, 3000);
        this._playTone(100, 0.5, 'sawtooth', 0.15);
    }

    /** Boss AOE */
    bossAOE() {
        this._playNoise(0.5, 0.25, 2000);
        if (this.enabled && this.ctx) {
            this._ensureInit();
            const osc = this.ctx.createOscillator();
            const gain = this._gain(0.2);
            osc.type = 'sawtooth';
            const now = this.ctx.currentTime;
            osc.frequency.setValueAtTime(60, now);
            osc.frequency.exponentialRampToValueAtTime(30, now + 0.6);
            osc.connect(gain);
            gain.gain.setValueAtTime(0.2 * this.masterVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
            osc.start(now);
            osc.stop(now + 0.65);
        }
    }

    /** Boss死亡 */
    bossDead() {
        this._playNoise(0.8, 0.3, 1500);
        if (this.enabled && this.ctx) {
            this._ensureInit();
            for (let i = 0; i < 4; i++) {
                const osc = this.ctx.createOscillator();
                const gain = this._gain(0.15);
                osc.type = 'sawtooth';
                const now = this.ctx.currentTime + i * 0.2;
                osc.frequency.setValueAtTime(300 - i * 70, now);
                osc.frequency.exponentialRampToValueAtTime(20, now + 0.5);
                osc.connect(gain);
                gain.gain.setValueAtTime(0.15 * this.masterVolume, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
                osc.start(now);
                osc.stop(now + 0.55);
            }
        }
    }

    // ==================== 系统音效 ====================

    /** 升级 */
    levelUp() {
        if (!this.enabled || !this.ctx) return;
        this._ensureInit();

        const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this._gain(0.15);
            osc.type = 'sine';
            osc.frequency.value = freq;
            osc.connect(gain);
            const now = this.ctx.currentTime + i * 0.1;
            gain.gain.setValueAtTime(0.15 * this.masterVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.25);
        });
    }

    /** 拾取经验 */
    pickup() {
        if(!this.enabled||!this.ctx)return;
        const now=this.ctx.currentTime;
        if(now-(this.lastPickup??-Infinity)<.15)return;
        this.lastPickup=now;
        this._playNoise(.045,.018,1100);
    }

    /** UI点击 */
    uiClick() {
        this._playTone(600, 0.05, 'square', 0.05);
    }

    /** UI悬停 */
    uiHover() {
        this._playTone(800, 0.03, 'sine', 0.03);
    }

    /** 游戏结束 */
    gameOver() {
        if (!this.enabled || !this.ctx) return;
        this._ensureInit();

        const notes = [392, 349, 330, 262]; // G4 F4 E4 C4 下行
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this._gain(0.2);
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            osc.connect(gain);
            const now = this.ctx.currentTime + i * 0.25;
            gain.gain.setValueAtTime(0.2 * this.masterVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
        });
    }

    /** 游戏开始 */
    gameStart() {
        if (!this.enabled || !this.ctx) return;
        this._ensureInit();

        const notes = [262, 330, 392, 523]; // C4 E4 G4 C5 上行
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this._gain(0.15);
            osc.type = 'sine';
            osc.frequency.value = freq;
            osc.connect(gain);
            const now = this.ctx.currentTime + i * 0.12;
            gain.gain.setValueAtTime(0.15 * this.masterVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        });
    }

    /** 暂停 */
    pause() {
        this._playTone(500, 0.1, 'sine', 0.08);
    }

    /** 继续 */
    resume() {
        this._playTone(700, 0.1, 'sine', 0.08);
    }

    /** 错误/无效操作 */
    error() {
        this._playTone(200, 0.15, 'sawtooth', 0.1);
        this._playTone(150, 0.2, 'square', 0.08);
    }

    // ==================== 工具方法 ====================

    /** 设置主音量 0-1 */
    setVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        try{localStorage.setItem('woodland-effects-volume',String(this.masterVolume));}catch{}
    }

    /** 静音/取消静音 */
    toggleMute() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    /** 是否静音 */
    isMuted() {
        return !this.enabled;
    }
}

if (typeof window !== 'undefined') {
    window.SoundManager = SoundManager;
}
