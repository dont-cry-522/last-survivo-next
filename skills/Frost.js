/** Frost Skills */
class FrostSkills {
    static POOL = [
        //  冰霜流 Frost
        // ==============================================================

        {
            id: 'frost_rounds',
            name: '霜弹',
            rarity: SkillRarity.COMMON,
            category: SkillCategory.FROST,
            effectType: SkillEffectType.ON_HIT,
            description: '子弹减速敌人',
            synergies: ['freeze', 'shatter'],
            evolveCondition: { type: EvolutionCondition.KILL_COUNT, value: 30 },
            tiers: [
                { desc: '命中减速 30%，持续 2 秒，额外 10% 伤害', params: { slow: 0.3, duration: 2, dmgBonus: 0.1 } },
                { desc: '减速 50%，持续 3 秒，+20% 伤害', params: { slow: 0.5, duration: 3, dmgBonus: 0.2 } },
                { desc: '减速 70%，首次命中冻结 0.5 秒，+30% 伤害', params: { slow: 0.7, duration: 3, freeze: 0.5, dmgBonus: 0.3 } },
            ],
            apply: function(player, sm, params, prevParams) {
                sm.registerHandler(SkillEffectType.ON_HIT, 'frost_rounds', function(ctx) {
                    const inst = sm.getSkill('frost_rounds');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    ctx.enemy.slowAmount = Math.max(ctx.enemy.slowAmount || 0, p.slow);
                    sm.visuals.emit('ice',ctx.enemy.x,ctx.enemy.y,{radius:18});
                    ctx.bullet.damage *= (1 + p.dmgBonus);
                    if (p.freeze && !ctx.enemy.slowAmount) {
                        ctx.enemy.frozen = true;
                        ctx.enemy.frozenTimer = p.freeze;
                    }
                });
            },
        },
        {
            id: 'freeze',
            name: '冻结',
            rarity: SkillRarity.RARE,
            category: SkillCategory.FROST,
            effectType: SkillEffectType.ON_HIT,
            description: '多次命中冻结敌人',
            synergies: ['frost_rounds', 'shatter'],
            evolveCondition: { type: EvolutionCondition.DAMAGE_ELITE, value: 1 },
            tiers: [
                { desc: '减速敌人 1 秒内被命中 3 次 → 冻结 1.5 秒', params: { hitsNeeded: 3, window: 1, freezeDuration: 1.5 } },
                { desc: '命中 2 次 → 冻结 2.5 秒', params: { hitsNeeded: 2, window: 1, freezeDuration: 2.5 } },
            ],
            apply: function(player, sm, params, prevParams) {
                sm.registerHandler(SkillEffectType.ON_HIT, 'freeze', function(ctx) {
                    const inst = sm.getSkill('freeze');
                    if (!inst) return;
                    if (!ctx.enemy.slowAmount) return;
                    const p = inst.getCurrentEffect().params;
                    if (!sm.runtimeState._freezeHits) sm.runtimeState._freezeHits = {};
                    const key = ctx.enemy.x.toFixed(0) + ',' + ctx.enemy.y.toFixed(0);
                    const now = performance.now() / 1000;
                    if (!sm.runtimeState._freezeHits[key]) sm.runtimeState._freezeHits[key] = { hits: 0, time: now };
                    const h = sm.runtimeState._freezeHits[key];
                    if (now - h.time > p.window) { h.hits = 0; h.time = now; }
                    h.hits++;
                    if (h.hits >= p.hitsNeeded) {
                        ctx.enemy.frozen = true;
                        ctx.enemy.frozenTimer = p.freezeDuration;
                        sm.visuals.emit('ice',ctx.enemy.x,ctx.enemy.y,{radius:35});
                        h.hits = 0;
                    }
                });
            },
        },
        {
            id: 'shatter',
            name: '碎冰',
            rarity: SkillRarity.RARE,
            category: SkillCategory.FROST,
            effectType: SkillEffectType.ON_CRIT,
            description: '冻结敌人受伤加倍',
            synergies: ['frost_rounds', 'freeze'],
            evolveCondition: { type: EvolutionCondition.DAMAGE_ELITE, value: 1 },
            tiers: [
                { desc: '攻击冻结敌人必定暴击，暴击伤害 +150%', params: { critDmgBonus: 1.5 } },
                { desc: '暴击伤害 +300%，碎冰时冰环（180 范围 120% 伤害）', params: { critDmgBonus: 3.0, novaRadius: 180, novaDmg: 1.2 } },
            ],
            apply: function(player, sm, params, prevParams) {
                sm.registerHandler(SkillEffectType.ON_HIT, 'shatter', function(ctx) {
                    const inst = sm.getSkill('shatter');
                    if (!inst) return;
                    if (!ctx.enemy.frozen) return;
                    const p = inst.getCurrentEffect().params;
                    ctx.bullet.isCrit = true;
                    sm.visuals.emit('ice',ctx.enemy.x,ctx.enemy.y,{radius:p.novaRadius||35});
                    ctx.bullet.damage *= (1 + p.critDmgBonus);
                    if (p.novaRadius) {
                        for (const e of ctx.enemies) {
                            if (!e.active || e === ctx.enemy) continue;
                            if ((ctx.enemy.x - e.x) ** 2 + (ctx.enemy.y - e.y) ** 2 < p.novaRadius * p.novaRadius) {
                                e.takeDamage(ctx.bullet.damage * p.novaDmg);
                                e.slowAmount = 0.5;
                            }
                        }

                    }
                });
            },
        },
        {
            id: 'frost_aura',
            name: '冰霜光环',
            rarity: SkillRarity.EPIC,
            category: SkillCategory.FROST,
            effectType: SkillEffectType.AURA,
            description: '周围敌人持续减速',
            synergies: ['freeze', 'deep_freeze'],
            evolveCondition: { type: EvolutionCondition.KILL_COUNT, value: 50 },
            tiers: [
                { desc: '自身周围 250 范围敌人每秒增加 20% 减速', params: { radius: 250, slowPerSec: 0.2 } },
                { desc: '范围 350，每秒 30% 减速', params: { radius: 350, slowPerSec: 0.3 } },
            ],
            apply: function(player, sm, params, prevParams) {
                _ensureBurnProcessor(sm);
                sm.registerHandler(SkillEffectType.PERIODIC, 'frost_aura', function(dt, ctx) {
                    const inst = sm.getSkill('frost_aura');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    for (const e of ctx.enemies) {
                        if (!e.active) continue;
                        const d2 = (ctx.player.x - e.x) ** 2 + (ctx.player.y - e.y) ** 2;
                        if (d2 < p.radius * p.radius) {
                            e.slowAmount = Math.min(0.8, (e.slowAmount || 0) + p.slowPerSec * dt);
                        }
                    }
                });
            },
        },
        {
            id: 'ice_nova',
            name: '冰爆',
            rarity: SkillRarity.COMMON,
            category: SkillCategory.FROST,
            effectType: SkillEffectType.ON_KILL,
            description: '击杀触发冰环',
            synergies: ['frost_rounds', 'absolute_zero'],
            evolveCondition: { type: EvolutionCondition.KILL_COUNT, value: 40 },
            tiers: [
                { desc: '每击杀 8 个敌人释放冰环（200 范围，减速 80%+60% 伤害）', params: { killsNeeded: 8, radius: 200, slow: 0.8, dmgMul: 0.6 } },
                { desc: '每 6 个，范围 250，80% 伤害', params: { killsNeeded: 6, radius: 250, slow: 0.8, dmgMul: 0.8 } },
                { desc: '每 4 个，范围 300，120% 伤害', params: { killsNeeded: 4, radius: 300, slow: 0.8, dmgMul: 1.2 } },
            ],
            apply: function(player, sm, params, prevParams) {
                if (!sm.runtimeState._iceNova) sm.runtimeState._iceNova = { kills: 0 };
                sm.runtimeState._iceNova.kills = 0;
                sm.registerHandler(SkillEffectType.ON_KILL, 'ice_nova', function(ctx) {
                    const inst = sm.getSkill('ice_nova');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    if (!sm.runtimeState._iceNova) sm.runtimeState._iceNova = { kills: 0 };
                    sm.runtimeState._iceNova.kills += ctx.count || 1;
                    if (sm.runtimeState._iceNova.kills >= p.killsNeeded) {
                        sm.runtimeState._iceNova.kills = 0;
                        for (const e of ctx.enemies) {
                            if (!e.active) continue;
                            const d2 = (ctx.player.x - e.x) ** 2 + (ctx.player.y - e.y) ** 2;
                            if (d2 < p.radius * p.radius) {
                            e.slowAmount = p.slow;
                            e.takeDamage(ctx.player.bulletDamage * p.dmgMul);
                            }
                        }
                        sm.visuals.emit('ice',ctx.player.x,ctx.player.y,{radius:p.radius});
                    }
                });
            },
        },
        {
            id: 'absolute_zero',
            name: '绝对零度',
            rarity: SkillRarity.LEGENDARY,
            category: SkillCategory.FROST,
            effectType: SkillEffectType.PERIODIC,
            description: '冻结死亡链式爆炸',
            synergies: ['ice_nova', 'deep_freeze'],
            evolveCondition: null,
            tiers: [
                { desc: '冻结敌人死亡时爆炸冻结周围 200 范围敌人 2 秒', params: { radius: 200, freezeDuration: 2 } },
            ],
            apply: function(player, sm, params, prevParams) {
                sm.registerHandler(SkillEffectType.PERIODIC, 'absolute_zero', function(dt, ctx) {
                    const inst = sm.getSkill('absolute_zero');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    for (const e of ctx.enemies) {
                        if (!e.active || !e.frozen || e.hp > 0) continue;
                        e.hp = 0; e.active = false;
                        sm.visuals.emit('ice',e.x,e.y,{radius:p.radius});
                        for (const t of ctx.enemies) {
                            if (!t.active || t === e) continue;
                            if ((e.x - t.x) ** 2 + (e.y - t.y) ** 2 < p.radius * p.radius) {
                                t.frozen = true;
                                t.frozenTimer = p.freezeDuration;
                                t.slowAmount = 0.5;
                            }
                        }
                    }
                });
            },
        },
        {
            id: 'ice_armor',
            name: '寒冰护甲',
            rarity: SkillRarity.RARE,
            category: SkillCategory.FROST,
            effectType: SkillEffectType.ON_DAMAGED,
            description: '周期性获得冰甲',
            synergies: ['frost_aura', 'deep_freeze'],
            evolveCondition: { type: EvolutionCondition.SURVIVAL_TIME, value: 120 },
            tiers: [
                { desc: '每 10 秒获得冰甲，抵消一次伤害并冻结攻击者 1 秒', params: { interval: 10, freezeDuration: 1 } },
                { desc: '每 7 秒，冻结 2 秒 + 减速 50%', params: { interval: 7, freezeDuration: 2, slow: 0.5 } },
            ],
            apply: function(player, sm, params, prevParams) {
                if (!sm.runtimeState._iceArmor) sm.runtimeState._iceArmor = { timer: 0, active: false };
                sm.runtimeState._iceArmor._timer = 0;
                sm.registerHandler(SkillEffectType.ON_DAMAGED, 'ice_armor', function(ctx) {
                    const inst = sm.getSkill('ice_armor');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    if (!sm.runtimeState._iceArmor) sm.runtimeState._iceArmor = { timer: 0, active: false };
                    const ia = sm.runtimeState._iceArmor;
                    if (ia.active) {
                        ia.active = false;
                        sm.visuals.emit('ice',ctx.player.x,ctx.player.y,{radius:150});
                        ctx.player.hp = Math.min(ctx.player.maxHp, ctx.player.hp + ctx.amount);
                        ctx.player.hp = Math.max(ctx.player.hp, 1);
                        for (const e of ctx.enemies) {
                            if (!e.active) continue;
                            const d2 = (ctx.player.x - e.x) ** 2 + (ctx.player.y - e.y) ** 2;
                            if (d2 < 150 * 150) {
                                e.frozen = true;
                                e.frozenTimer = p.freezeDuration;
                                if (p.slow) e.slowAmount = p.slow;
                            }
                        }
                        return;
                    }
                });
                sm.registerHandler(SkillEffectType.PERIODIC, 'ice_armor_timer', function(dt) {
                    const inst = sm.getSkill('ice_armor');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    if (!sm.runtimeState._iceArmor) sm.runtimeState._iceArmor = { timer: 0, active: false };
                    const ia = sm.runtimeState._iceArmor;
                    if (!ia.active) {
                        ia.timer -= dt;
                        if (ia.timer <= 0) { ia.active = true; ia.timer = p.interval; }
                    }
                });
            },
        },
        {
            id: 'deep_freeze',
            name: '深寒',
            rarity: SkillRarity.EPIC,
            category: SkillCategory.FROST,
            effectType: SkillEffectType.STAT_MODIFIER,
            description: '强化冻结效果',
            synergies: ['freeze', 'absolute_zero'],
            evolveCondition: { type: EvolutionCondition.KILL_COUNT, value: 50 },
            tiers: [
                { desc: '冻结时间 +1 秒，冻结敌人每秒受到 4% 最大生命伤害', params: { freezeBonus: 1, hpDps: 0.04 } },
                { desc: '冻结时间 +2 秒，每秒 6% 最大生命伤害', params: { freezeBonus: 2, hpDps: 0.06 } },
            ],
            apply: function(player, sm, params, prevParams) {
                _ensureBurnProcessor(sm);
                sm.runtimeState._deepFreeze = params;
                sm.registerHandler(SkillEffectType.PERIODIC, 'deep_freeze', function(dt, ctx) {
                    const inst = sm.getSkill('deep_freeze');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    for (const e of ctx.enemies) {
                        if (!e.active || !e.frozen) continue;
                        e.takeDamage(e.maxHp * p.hpDps * dt,0,false);
                    }
                });
            },
        },

        // ==============================================================
    ];
}
if (typeof window !== 'undefined') { window.FrostSkills = FrostSkills; }
