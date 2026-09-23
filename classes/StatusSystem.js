/**
 * ============================================================
 *  StatusSystem.js - 状态系统
 * ============================================================
 *  统一管理敌人身上的 Burn / Freeze / Shock 状态。
 *  Enemy 不直接持有状态字段，全部委托给 StatusSystem。
 *  技能通过 Enemy 属性读写状态（向后兼容 getter/setter）。
 * ============================================================
 */

class StatusSystem {
    constructor() {
        /** Map<Enemy, { burn, frost, shock }> */
        this._data = new Map();
    }

    // ================================================================
    //  初始化 / 清理
    // ================================================================

    _ensure(enemy) {
        if (!this._data.has(enemy)) {
            this._data.set(enemy, {
                burnStacks: 0, burnTimer: 0, burnDmgPerStack: 0,
                slowAmount: 0, frozen: false, frozenTimer: 0,
                paralyzed: false, paralyzeTimer: 0,
            });
        }
        return this._data.get(enemy);
    }

    reset(enemy) {
        this._data.delete(enemy);
    }

    // ================================================================
    //  每帧更新
    // ================================================================

    update(enemy, deltaTime) {
        const s = this._data.get(enemy);
        if (!s) return;

        s.controlRecovery=Math.max(0,(s.controlRecovery||0)-deltaTime);
        if(s.frozen||s.paralyzed){
            s.controlTime=(s.controlTime||0)+deltaTime;
            if(s.controlTime>=2.5){s.frozen=false;s.paralyzed=false;s.frozenTimer=0;s.paralyzeTimer=0;s.controlTime=0;s.controlRecovery=1.5;}
        }else s.controlTime=0;
        if (s.burnStacks > 0) {
            s.burnTimer -= deltaTime;
            if (s.burnTimer <= 0) { s.burnStacks = 0; s.burnTimer = 0; }
        }
        if (s.frozen) {
            s.frozenTimer -= deltaTime;
            if (s.frozenTimer <= 0) { s.frozen = false; }
        }
        if (!s.frozen && s.slowAmount > 0) {
            s.slowAmount = Math.max(0, s.slowAmount - deltaTime * 0.5);
        }
        if (s.paralyzed) {
            s.paralyzeTimer -= deltaTime;
            if (s.paralyzeTimer <= 0) { s.paralyzed = false; }
        }
    }

    // ================================================================
    //  Burn
    // ================================================================

    burnStacks(enemy) { return this._data.get(enemy)?.burnStacks || 0; }
    setBurnStacks(enemy, v) { this._ensure(enemy).burnStacks = v; }

    burnTimer(enemy) { return this._data.get(enemy)?.burnTimer || 0; }
    setBurnTimer(enemy, v) { this._ensure(enemy).burnTimer = v; }

    burnDmgPerStack(enemy) { return this._data.get(enemy)?.burnDmgPerStack || 0; }
    setBurnDmgPerStack(enemy, v) { this._ensure(enemy).burnDmgPerStack = v; }

    applyBurn(enemy, stacks, dmgPerStack, duration) {
        const s = this._ensure(enemy);
        s.burnStacks = Math.max(s.burnStacks, stacks);
        s.burnDmgPerStack = dmgPerStack;
        s.burnTimer = Math.max(s.burnTimer, duration);
    }

    getBurnDPS(enemy) {
        const s = this._data.get(enemy);
        if (!s || !s.burnStacks) return 0;
        return s.burnDmgPerStack * s.burnStacks;
    }

    // ================================================================
    //  Freeze / Slow
    // ================================================================

    slowAmount(enemy) { return this._data.get(enemy)?.slowAmount || 0; }
    setSlowAmount(enemy, v) { this._ensure(enemy).slowAmount = v; }

    frozen(enemy) { return this._data.get(enemy)?.frozen || false; }
    setFrozen(enemy, v) { const s=this._ensure(enemy);if(!v||!s.controlRecovery)s.frozen=v; }

    frozenTimer(enemy) { return this._data.get(enemy)?.frozenTimer || 0; }
    setFrozenTimer(enemy, v) { this._ensure(enemy).frozenTimer = v; }

    applyFrost(enemy, slow, freezeDuration) {
        const s = this._ensure(enemy);
        if (slow > 0) {
            s.slowAmount = Math.max(s.slowAmount, slow);
        }
        if (freezeDuration > 0 && !s.controlRecovery) {
            s.frozen = true;
            s.frozenTimer = Math.max(s.frozenTimer, freezeDuration);
        }
    }

    // ================================================================
    //  Shock / Paralyze
    // ================================================================

    paralyzed(enemy) { return this._data.get(enemy)?.paralyzed || false; }
    setParalyzed(enemy, v) { const s=this._ensure(enemy);if(!v||!s.controlRecovery)s.paralyzed=v; }

    paralyzeTimer(enemy) { return this._data.get(enemy)?.paralyzeTimer || 0; }
    setParalyzeTimer(enemy, v) { this._ensure(enemy).paralyzeTimer = v; }

    applyShock(enemy, duration) {
        const s = this._ensure(enemy);
        if(s.controlRecovery)return;
        s.paralyzed = true;
        s.paralyzeTimer = Math.max(s.paralyzeTimer, duration);
    }

    // ================================================================
    //  综合查询（移动逻辑用）
    // ================================================================

    getSpeedMultiplier(enemy) {
        const s = this._data.get(enemy);
        if (!s) return 1;
        if (s.frozen || s.paralyzed) return 0;
        return 1 - Math.min(.6,s.slowAmount);
    }

    // ================================================================
    //  视觉效果查询
    // ================================================================

    getVisualState(enemy) {
        const s = this._data.get(enemy);
        if (!s) return { burn: false, frozen: false, slow: false, paralyzed: false, hasBurn: 0 };
        return {
            hasBurn: s.burnStacks,
            burn: s.burnStacks > 0 && s.hitFlash <= 0,
            frozen: s.frozen,
            slow: !s.frozen && s.slowAmount > 0,
            paralyzed: s.paralyzed,
        };
    }
}

if (typeof window !== 'undefined') {
    window.StatusSystem = StatusSystem;
}
