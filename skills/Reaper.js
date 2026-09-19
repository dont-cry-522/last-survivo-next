/** Reaper Skills */
class ReaperSkills {
    static POOL = [
        //  死亡收割 Reaper
        // ==============================================================

        {
            id: 'weakness_exploit',
            name: '弱点洞悉',
            rarity: SkillRarity.COMMON,
            category: SkillCategory.REAPER,
            effectType: SkillEffectType.CRIT_MODIFIER,
            description: '低血量必定暴击',
            synergies: ['execute', 'death_mark'],
            evolveCondition: { type: EvolutionCondition.KILL_COUNT, value: 30 },
            tiers: [
                { desc: '暴击率 +10%，生命低于 30% 敌人必定暴击', params: { critBonus: 0.1, threshold: 0.3 } },
                { desc: '暴击率 +15%，阈值 40%', params: { critBonus: 0.15, threshold: 0.4 } },
                { desc: '暴击率 +20%，阈值 50%，暴击伤害 +40%', params: { critBonus: 0.2, threshold: 0.5, critDmgBonus: 0.4 } },
            ],
            apply: function(player, sm, params, prevParams) {
                if (prevParams) player.critRate -= prevParams.critBonus;
                player.critRate += params.critBonus;
                sm.runtimeState._weakness = { threshold: params.threshold, critDmgBonus: params.critDmgBonus || 0 };
            },
        },
        {
            id: 'execute',
            name: '处决',
            rarity: SkillRarity.RARE,
            category: SkillCategory.REAPER,
            effectType: SkillEffectType.ON_HIT,
            description: '低血量敌人受伤加倍',
            synergies: ['weakness_exploit', 'soul_harvest'],
            evolveCondition: { type: EvolutionCondition.KILL_COUNT, value: 40 },
            tiers: [
                { desc: '生命低于 20% 敌人受到 3 倍伤害', params: { threshold: 0.2, dmgMul: 3 } },
                { desc: '阈值 28%，4 倍伤害 + 击杀回复 8% 最大生命', params: { threshold: 0.28, dmgMul: 4, healPct: 0.08 } },
            ],
            apply: function(player, sm, params, prevParams) {
                sm.registerHandler(SkillEffectType.ON_HIT, 'execute', function(ctx) {
                    const inst = sm.getSkill('execute');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    const hpPct = ctx.enemy.hp / ctx.enemy.maxHp;
                    if (hpPct <= p.threshold) {
                        ctx.bullet.damage *= p.dmgMul;
                        sm.visuals.emit('mark',ctx.enemy.x,ctx.enemy.y,{radius:32});
                        if (p.healPct && ctx.enemy.hp <= 0) {
                            player.hp = Math.min(player.maxHp, player.hp + player.maxHp * p.healPct);
                        }
                    }
                });
            },
        },
        {
            id: 'death_mark',
            name: '死亡印记',
            rarity: SkillRarity.EPIC,
            category: SkillCategory.REAPER,
            effectType: SkillEffectType.ON_CRIT,
            description: '暴击标记，死亡传染',
            synergies: ['weakness_exploit', 'reap'],
            evolveCondition: { type: EvolutionCondition.DAMAGE_ELITE, value: 1 },
            tiers: [
                { desc: '暴击施加死亡印记（5 秒，受伤 +50%），死亡跳向 200 范围最近敌人', params: { duration: 5, dmgAmp: 0.5, range: 200 } },
                { desc: '受伤 +80%，范围 250，跳转数量 +1', params: { duration: 5, dmgAmp: 0.8, range: 250, spread: 1 } },
            ],
            apply: function(player, sm, params, prevParams) {
                if (!sm.runtimeState._marks) sm.runtimeState._marks = {};
                sm.registerHandler(SkillEffectType.ON_CRIT, 'death_mark', function(ctx) {
                    const inst = sm.getSkill('death_mark');
                    if (!inst) return;
                    sm.runtimeState._marks[ctx.enemy] = true;
                    sm.visuals.emit('mark',ctx.enemy.x,ctx.enemy.y,{radius:26});
                });
                sm.registerHandler(SkillEffectType.ON_HIT, 'death_mark_amp', function(ctx) {
                    const inst = sm.getSkill('death_mark');
                    if (!inst || !sm.runtimeState._marks[ctx.enemy]) return;
                    const p = inst.getCurrentEffect().params;
                    ctx.bullet.damage *= (1 + p.dmgAmp);
                });
                sm.registerHandler(SkillEffectType.PERIODIC, 'death_mark_spread', function(dt, ctx) {
                    const inst = sm.getSkill('death_mark');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    const marks = sm.runtimeState._marks || {};
                    for (const key in marks) {
                        const e = key; // key is object reference string
                        for (const enemy of ctx.enemies) {
                            if (!enemy.active || enemy.hp > 0) continue;
                            if (marks[enemy]) {
                                delete marks[enemy];
                                let nearest = null, nd2 = p.range * p.range;
                                for (const t of ctx.enemies) {
                                    if (!t.active || t === enemy || marks[t]) continue;
                                    const d2 = (enemy.x - t.x) ** 2 + (enemy.y - t.y) ** 2;
                                    if (d2 < nd2) { nd2 = d2; nearest = t; }
                                }
                                if (nearest) marks[nearest] = true;
                            }
                        }
                    }
                });
            },
        },
        {
            id: 'reap',
            name: '收割',
            rarity: SkillRarity.LEGENDARY,
            category: SkillCategory.REAPER,
            effectType: SkillEffectType.ON_KILL,
            description: '处决重置冲刺',
            synergies: ['execute', 'death_mark'],
            evolveCondition: null,
            tiers: [
                { desc: '击杀低血量（20%）敌人重置冲刺冷却 + 攻速 +50% 持续 2 秒', params: { threshold: 0.2, atkBoost: 0.5, duration: 2 } },
            ],
            apply: function(player, sm, params, prevParams) {
                sm.registerHandler(SkillEffectType.ON_KILL, 'reap', function(ctx) {
                    const inst = sm.getSkill('reap');
                    if (!inst) return;
                    player.dashCooldown = 0;
                    sm.visuals.emit('soul',player.x,player.y,{radius:44});
                    player.attackSpeed *= (1 + inst.getCurrentEffect().params.atkBoost);
                    setTimeout(() => { player.attackSpeed /= (1 + inst.getCurrentEffect().params.atkBoost); }, inst.getCurrentEffect().params.duration * 1000);
                });
            },
        },
        {
            id: 'blood_frenzy',
            name: '鲜血狂怒',
            rarity: SkillRarity.COMMON,
            category: SkillCategory.REAPER,
            effectType: SkillEffectType.ON_KILL,
            description: '击杀叠加暴伤',
            synergies: ['weakness_exploit', 'soul_harvest'],
            evolveCondition: { type: EvolutionCondition.KILL_COUNT, value: 40 },
            tiers: [
                { desc: '击杀叠 1 层狂怒（上限 5，每层 +30% 暴击伤害，持续 3 秒）', params: { maxStacks: 5, perStack: 0.3, duration: 3 } },
                { desc: '上限 8 层，每层 +40%', params: { maxStacks: 8, perStack: 0.4, duration: 4 } },
                { desc: '上限 10 层，3 层时全攻击必暴击 1 秒（15 秒 CD）', params: { maxStacks: 10, perStack: 0.5, duration: 4, furyCD: 15 } },
            ],
            apply: function(player, sm, params, prevParams) {
                if (!sm.runtimeState._frenzy) sm.runtimeState._frenzy = { stacks: 0, timer: 0 };
                sm.runtimeState._frenzy.stacks = 0; sm.runtimeState._frenzy.timer = 0;
                sm.registerHandler(SkillEffectType.ON_KILL, 'blood_frenzy', function() {
                    const inst = sm.getSkill('blood_frenzy');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    const f = sm.runtimeState._frenzy;
                    f.stacks = Math.min(p.maxStacks, f.stacks + 1);
                    f.timer = p.duration;
                    sm.visuals.emit('soul',player.x,player.y,{radius:26});
                });
                sm.registerHandler(SkillEffectType.PERIODIC, 'blood_frenzy', function(dt) {
                    const f = sm.runtimeState._frenzy;
                    if (!f) return;
                    f.timer -= dt; if (f.timer <= 0) f.stacks = 0;
                });
            },
        },
        {
            id: 'curse',
            name: '咒怨',
            rarity: SkillRarity.RARE,
            category: SkillCategory.REAPER,
            effectType: SkillEffectType.ON_HIT,
            description: '首击施加永久易伤',
            synergies: ['death_mark', 'assassinate'],
            evolveCondition: { type: EvolutionCondition.KILL_COUNT, value: 40 },
            tiers: [
                { desc: '对每个敌人的首次攻击施加咒怨（永久 +25% 受伤）', params: { dmgAmp: 0.25 } },
                { desc: '+40% 受伤，每个咒怨敌人 +5% 移速', params: { dmgAmp: 0.4, speedPerCurse: 0.05 } },
            ],
            apply: function(player, sm, params, prevParams) {
                if (!sm.runtimeState._cursed) sm.runtimeState._cursed = new Set();
                sm.registerHandler(SkillEffectType.ON_HIT, 'curse', function(ctx) {
                    const inst = sm.getSkill('curse');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    if (!sm.runtimeState._cursed.has(ctx.enemy)) {
                        sm.runtimeState._cursed.add(ctx.enemy);
                        sm.visuals.emit('mark',ctx.enemy.x,ctx.enemy.y,{radius:20});
                    } else {
                        ctx.bullet.damage *= (1 + p.dmgAmp);
                    }
                });
            },
        },
        {
            id: 'soul_harvest',
            name: '灵魂收割',
            rarity: SkillRarity.EPIC,
            category: SkillCategory.REAPER,
            effectType: SkillEffectType.ON_KILL,
            description: '击杀收集灵魂增伤',
            synergies: ['blood_frenzy', 'execute'],
            evolveCondition: { type: EvolutionCondition.KILL_COUNT, value: 50 },
            tiers: [
                { desc: '击杀收集灵魂（上限 20），每层 +1.5% 暴击伤害', params: { maxSouls: 20, perStack: 0.015 } },
                { desc: '上限 40，每层 +2%，死亡消耗全部灵魂复活（每层 3% HP）', params: { maxSouls: 40, perStack: 0.02, revive: 0.03 } },
            ],
            apply: function(player, sm, params, prevParams) {
                if (!sm.runtimeState._souls) sm.runtimeState._souls = 0;
                sm.runtimeState._souls = 0;
                sm.registerHandler(SkillEffectType.ON_KILL, 'soul_harvest', function() {
                    const inst = sm.getSkill('soul_harvest');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    sm.runtimeState._souls = Math.min(p.maxSouls, (sm.runtimeState._souls || 0) + 1);
                    sm.visuals.emit('soul',player.x,player.y,{radius:35});
                });
            },
        },
        {
            id: 'assassinate',
            name: '暗杀',
            rarity: SkillRarity.COMMON,
            category: SkillCategory.REAPER,
            effectType: SkillEffectType.ON_HIT,
            description: '满血敌人首击爆发',
            synergies: ['curse', 'execute'],
            evolveCondition: { type: EvolutionCondition.KILL_COUNT, value: 30 },
            tiers: [
                { desc: '满血敌人首次攻击 300% 伤害 + 必暴击', params: { dmgMul: 3 } },
                { desc: '400% 伤害 + 减速 80% 1 秒', params: { dmgMul: 4, slow: 0.8 } },
                { desc: '500% 伤害 + 立即施加 1 层灼烧 5 层', params: { dmgMul: 5, burn: 5 } },
            ],
            apply: function(player, sm, params, prevParams) {
                if (!sm.runtimeState._assassinated) sm.runtimeState._assassinated = new Set();
                sm.registerHandler(SkillEffectType.ON_HIT, 'assassinate', function(ctx) {
                    const inst = sm.getSkill('assassinate');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    if (ctx.enemy.hp >= ctx.enemy.maxHp && !sm.runtimeState._assassinated.has(ctx.enemy)) {
                        sm.runtimeState._assassinated.add(ctx.enemy);
                        ctx.bullet.isCrit = true;
                        ctx.bullet.damage *= p.dmgMul;
                        sm.visuals.emit('mark',ctx.enemy.x,ctx.enemy.y,{radius:32});
                        if (p.slow) { ctx.enemy.slowAmount = p.slow; }
                        if (p.burn) { ctx.enemy.burnStacks = p.burn; ctx.enemy.burnDmgPerStack = player.bulletDamage * 0.15; ctx.enemy.burnTimer = 3; }
                    }
                });
            },
        },

        // ==============================================================
    ];
}
if (typeof window !== 'undefined') { window.ReaperSkills = ReaperSkills; }
