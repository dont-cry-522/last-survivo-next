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
    }

    /**
     * 初始化 AudioContext（需要用户交互后调用）
     */
    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
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
    shoot() {
        this._playTone(800, 0.08, 'square', 0.08);
        // 叠加一个低音增加层次感
        this._playTone(400, 0.06, 'sawtooth', 0.05);
    }

    /** 冲刺音效 */
    dash() {
        if (!this.enabled || !this.ctx) return;
        this._ensureInit();

        const osc = this.ctx.createOscillator();
        const gain = this._gain(0.15);

        osc.type = 'sawtooth';
        const now = this.ctx.currentTime;
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
        osc.connect(gain);

        gain.gain.setValueAtTime(0.15 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.start(now);
        osc.stop(now + 0.2);

        // 加点噪声
        this._playNoise(0.15, 0.06, 2000);
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
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        if (now - this.lastAttackCue < 0.10) return;
        this.lastAttackCue = now;
        if (phase === 'windup') {
            if(type === 'exploder') {
                this._playNoise(.35,.055,1800);
                this._playTone(540,.2,'sine',.045);
            } else this._playTone(type === 'elite' ? 180 : type === 'tank' ? 130 : type === 'fast' ? 420 : 260, 0.16, 'triangle', 0.065);
        } else if (type === 'elite') {
            this._playNoise(.24,.12,1600);
            this._playTone(210,.12,'triangle',.075);
        } else if (type === 'tank') {
            this._playTone(65, 0.30, 'sine', 0.22);
            this._playTone(115, 0.14, 'triangle', 0.12);
            this._playNoise(0.20, 0.13, 700);
        } else {
            this._playNoise(0.10, 0.065, type === 'fast' ? 2400 : 1400);
        }
    }

    // ==================== 敌人音效 ====================

    /** 普通敌人死亡 */
    enemyDead() {
        this._playTone(300, 0.15, 'sawtooth', 0.08);
        this._playNoise(0.1, 0.06, 1500);
    }

    /** 精英/坦克死亡 */
    enemyDeadBig() {
        this._playTone(200, 0.25, 'sawtooth', 0.12);
        this._playTone(100, 0.3, 'triangle', 0.1);
        this._playNoise(0.2, 0.1, 1000);
    }

    /** 自爆敌人爆炸 */
    exploderExplode() {
        this._playNoise(0.3, 0.2, 2000);
        this._playTone(150, 0.4, 'sawtooth', 0.15);
        if (this.enabled && this.ctx) {
            this._ensureInit();
            const osc = this.ctx.createOscillator();
            const gain = this._gain(0.12);
            osc.type = 'sawtooth';
            const now = this.ctx.currentTime;
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
            osc.connect(gain);
            gain.gain.setValueAtTime(0.12 * this.masterVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc.start(now);
            osc.stop(now + 0.35);
        }
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
        this._playTone(1000, 0.06, 'sine', 0.04);
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
