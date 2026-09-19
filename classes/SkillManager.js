/**
 * ============================================================
 *  SkillManager.js - 技能系统核心管理器
 * ============================================================
 *  管理所有已获得技能、生成升级选项、处理进化、维护效果注册表
 *
 *  职责：
 *    1. 持有所有 SkillInstance
 *    2. 按权重随机生成升级选项
 *    3. 获取技能（首次获得 → T1 / 复选 → 进化或强化）
 *    4. 维护 effectType → [SkillInstance] 注册表
 *    5. 检测技能间联动（Synergy）
 *    6. 提供 getActiveEffects(type) 给游戏系统查询
 * ============================================================
 */

class SkillManager {
    constructor() {
        this.skills = [];
        this.effectRegistry = {};
        this.activeSynergies = [];
        this.rerollsRemaining = 1;
        this.lastChoices = [];

        this.runtimeState = {};
        this.activeBuffs = [];

        this.dispatcher = new EffectDispatcher(this);
        this.visuals = new SkillVisuals();
    }

    // ================================================================
    //  升级选项生成
    // ================================================================

    /**
     * 生成新一轮升级选项
     * @param {number} count - 展示数量（默认4）
     * @returns {Array<{config: SkillDefinition, instance: SkillInstance|null, isEvolution: boolean, evolution: object|null}>}
     */
    generateChoices(count = 4) {
        if (SkillConfig.POOL.length === 0) {
            return [];
        }

        const choices = [];
        const ownedIds = new Set(this.skills.map(s => s.id));
        const ownedCategories = new Set(this.skills.map(s => s.category));

        // 构建权重池
        const weightedPool = this._buildWeightedPool(ownedIds, ownedCategories);

        // 抽取不重复的选项
        const selected = new Set();
        let attempts = 0;
        while (choices.length < count && attempts < 100) {
            attempts++;
            const candidate = this._weightedRandom(weightedPool);
            if (!candidate || selected.has(candidate.id)) continue;
            selected.add(candidate.id);

            const existing = this._findOwned(candidate.id);
            choices.push({
                config: candidate,
                instance: existing,
                isEvolution: existing !== null,
                evolution: existing ? existing.getNextEvolution() : null,
            });
        }

        this.lastChoices = choices;
        return choices;
    }

    /**
     * 构建按稀有度加权的技能池
     * 优先展示：已有流派的下一阶进化 > 新流派 T1 > 通用强化
     */
    _buildWeightedPool(ownedIds, ownedCategories) {
        const pool = [];

        for (const def of SkillConfig.POOL) {
            let weight = SkillRarity.getWeight(def.rarity);

            // 已有流派 → 权重翻倍（鼓励深度发展）
            if (ownedCategories.has(def.category)) {
                weight *= 2;
            }

            // 已有技能 → 大幅提权（鼓励复选进化）
            if (ownedIds.has(def.id)) {
                const existing = this._findOwned(def.id);
                if (existing && !existing.isMaxed) {
                    weight *= 4;
                }
            }

            // 新流派 T1 → 基础权重（鼓励探索）
            // 已是最高阶 → 权重降为0（不再出现）
            if (ownedIds.has(def.id)) {
                const existing = this._findOwned(def.id);
                if (existing && existing.isMaxed) {
                    weight = 0;
                }
            }

            if (weight > 0) {
                pool.push({ def, weight });
            }
        }

        return pool;
    }

    _weightedRandom(pool) {
        const total = pool.reduce((sum, p) => sum + p.weight, 0);
        let r = Math.random() * total;
        for (const p of pool) {
            r -= p.weight;
            if (r <= 0) return p.def;
        }
        return pool.length > 0 ? pool[pool.length - 1].def : null;
    }

    // ================================================================
    //  技能获取
    // ================================================================

    /**
     * 获取一个技能（首次获得 / 复选进化）
     * @param {string} skillId
     * @param {Object} gameState - { survivalTime, player }
     * @returns {{ action: 'added'|'evolved'|'enhanced'|'maxed', instance: SkillInstance }}
     */
    acquire(skillId, gameState) {
        const existing = this._findOwned(skillId);
        const player = gameState ? gameState.player : null;
        const definition=existing?.config||SkillConfig.POOL.find(d=>d.id===skillId);
        if(player && definition && !existing?.isMaxed) {
            this.visuals.audio=player.audio;
            this.visuals.emit('pickup',player.x,player.y,{radius:40,color:SkillVisuals.COLORS[definition.category]});
        }

        if (existing) {
            if (existing.isMaxed) {
                return { action: 'maxed', instance: existing };
            }

            const check = existing.checkEvolution(gameState);
            const prevParams = existing.getCurrentEffect().params;
            if (check.canEvolve) {
                existing.evolve();
                this._updateRegistry(existing);
                if (existing.config.apply && player) {
                    existing.config.apply(player, this, existing.getCurrentEffect().params, prevParams);
                }
                return { action: 'evolved', instance: existing };
            } else {
                existing.evolve();
                this._updateRegistry(existing);
                if (existing.config.apply && player) {
                    existing.config.apply(player, this, existing.getCurrentEffect().params, prevParams);
                }
                return { action: 'enhanced', instance: existing };
            }
        }

        const def = SkillConfig.POOL.find(d => d.id === skillId);
        if (!def) return null;

        const instance = new SkillInstance(def);
        this.skills.push(instance);
        this._updateRegistry(instance);

        if (def.apply && player) {
            def.apply(player, this, instance.getCurrentEffect().params);
        }

        this._checkSynergies();
        return { action: 'added', instance };
    }

    // ================================================================
    //  效果注册表
    // ================================================================

    _updateRegistry(instance) {
        const type = instance.effectType;
        if (!this.effectRegistry[type]) {
            this.effectRegistry[type] = [];
        }
        const list = this.effectRegistry[type];
        const existing = list.findIndex(s => s.id === instance.id);
        if (existing >= 0) {
            list[existing] = instance;
        } else {
            list.push(instance);
        }
    }

    /**
     * 获取指定类型的所有活跃效果
     * @param {string} effectType - SkillEffectType 之一
     * @returns {SkillInstance[]}
     */
    getActiveEffects(effectType) {
        return this.effectRegistry[effectType] || [];
    }

    /**
     * 检查是否拥有某个技能
     */
    hasSkill(id) {
        return this._findOwned(id) !== null;
    }

    /**
     * 获取指定技能实例
     */
    getSkill(id) {
        return this._findOwned(id);
    }

    // ================================================================
    //  联动检测
    // ================================================================

    /**
     * 检查所有技能对之间的联动
     */
    _checkSynergies() {
        this.activeSynergies = [];
        for (let i = 0; i < this.skills.length; i++) {
            for (let j = i + 1; j < this.skills.length; j++) {
                const a = this.skills[i];
                const b = this.skills[j];
                if (a.synergies.includes(b.id) || b.synergies.includes(a.id)) {
                    this.activeSynergies.push({ skillA: a, skillB: b });
                }
            }
        }
    }

    /**
     * 获取当前激活的联动
     */
    getActiveSynergies() {
        return this.activeSynergies;
    }

    // ================================================================
    //  辅助方法
    // ================================================================

    _findOwned(id) {
        return this.skills.find(s => s.id === id) || null;
    }

    /**
     * 获取已获得的技能数量
     */
    getSkillCount() {
        return this.skills.length;
    }

    /**
     * 获取某流派的技能数量
     */
    getCategoryCount(category) {
        return this.skills.filter(s => s.category === category).length;
    }

    /**
     * 重置（新游戏开始时调用）
     */
    reset() {
        this.visuals.clear();
        this.skills = [];
        this.effectRegistry = {};
        this.activeSynergies = [];
        this.rerollsRemaining = 1;
        this.lastChoices = [];
        this.runtimeState = {};
        this.activeBuffs = [];
        this.dispatcher.reset();
    }

    /**
     * 刷新当前升级选项（消耗 reroll 次数）
     */
    reroll() {
        if (this.rerollsRemaining <= 0) return null;
        this.rerollsRemaining--;
        return this.generateChoices(4);
    }

    /**
     * 获取当前流派分布（供 UI 展示）
     */
    getCategorySummary() {
        const summary = {};
        for (const s of this.skills) {
            if (!summary[s.category]) {
                summary[s.category] = { count: 0, color: SkillCategory.getColor(s.category) };
            }
            summary[s.category].count++;
        }
        return summary;
    }

    // ================================================================
    //  效果触发系统
    // ================================================================

    /**
     * 追踪击杀（进化条件用）
     */
    trackKill() {
        for (const inst of this.skills) {
            inst.onKill();
        }
    }

    /**
     * 追踪精英伤害（进化条件用）
     */
    trackEliteHit() {
        for (const inst of this.skills) {
            inst.onDamageElite();
        }
    }

    /**
     * 注册技能效果处理器（由 apply 函数调用）
     * @param {string} effectType - SkillEffectType
     * @param {string} skillId
     * @param {Function} handler - 回调函数，接收 context 参数
     */
    registerHandler(effectType, skillId, handler) {
        this.dispatcher.registerHandler(effectType, skillId, handler);
    }

    trigger(effectType, context) {
        this.dispatcher.trigger(effectType, context);
    }

    update(deltaTime, gameContext) {
        this.visuals.audio=gameContext.player.audio;
        this.visuals.update(deltaTime);
        if (!this.runtimeState._visualsReady) {
            this.runtimeState._visualsReady = true;
            this.dispatcher.ensureSystemEffects();
        }
        this.dispatcher.update(deltaTime, gameContext);
    }

    // ================================================================
    //  Buff 显示
    // ================================================================

    getActiveBuffs() {
        return this.skills.map(s => ({
            id: s.id,
            name: s.name,
            tier: s.currentTier,
            category: s.category,
            rarity: s.rarity,
        }));
    }

    // ================================================================
    //  存档接口（预留）
    // ================================================================

    serialize() {
        return {
            skills: this.skills.map(s => ({
                id: s.id, currentTier: s.currentTier,
                killCount: s.killCount, hasDamagedElite: s.hasDamagedElite,
            })),
            rerollsRemaining: this.rerollsRemaining,
        };
    }

    deserialize(data) {
        this.reset();
        if (!data || !data.skills) return;
        for (const saved of data.skills) {
            const def = SkillConfig.POOL.find(d => d.id === saved.id);
            if (!def) continue;
            const inst = new SkillInstance(def);
            inst.currentTier = saved.currentTier;
            inst.killCount = saved.killCount || 0;
            inst.hasDamagedElite = saved.hasDamagedElite || false;
            inst.isMaxed = inst.currentTier >= inst.maxTier;
            this.skills.push(inst);
            this._updateRegistry(inst);
            if (def.apply) {
                def.apply(null, this, inst.getCurrentEffect().params);
            }
        }
        this.rerollsRemaining = data.rerollsRemaining || 1;
        this._checkSynergies();
    }

    registerDraw(name, fn) { this.dispatcher.registerDraw(name, fn); }

    drawSkillVisuals(ctx, cameraX, cameraY, player) {
        this.visuals.draw(ctx,cameraX,cameraY,player,this);
        this.dispatcher.drawSkillVisuals(ctx, cameraX, cameraY, player);
    }
}

if (typeof window !== 'undefined') {
    window.SkillManager = SkillManager;
}
