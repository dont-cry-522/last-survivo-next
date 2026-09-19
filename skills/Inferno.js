/** Inferno Skills */
class InfernoSkills {
    static POOL = [
        //  火焰流 Inferno
        // ==============================================================

        {
            id: 'spark',
            name: '火种',
            rarity: SkillRarity.COMMON,
            category: SkillCategory.INFERNO,
            effectType: SkillEffectType.ON_HIT,
            description: '子弹几率点燃敌人',
            synergies: ['incendiary', 'scorched_earth'],
            evolveCondition: { type: EvolutionCondition.KILL_COUNT, value: 30 },
            tiers: [
                { desc: '30% 概率附加灼烧（2 层，每秒 10% 伤害，持续 2 秒）', params: { chance: 0.3, stacks: 2, dps: 0.10, duration: 2 } },
                { desc: '50% 概率，灼烧 3 层，15% 伤害', params: { chance: 0.5, stacks: 3, dps: 0.12, duration: 3 } },
                { desc: '100% 概率，灼烧 5 层，每秒 18% 伤害', params: { chance: 1.0, stacks: 5, dps: 0.18, duration: 3 } },
            ],
            apply: function(player, sm, params, prevParams) {
                _ensureBurnProcessor(sm);
                sm.registerHandler(SkillEffectType.ON_HIT, 'spark', function(ctx) {
                    const inst = sm.getSkill('spark');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    if (Math.random() < p.chance) {
                        ctx.enemy.burnStacks = Math.min(p.stacks, (ctx.enemy.burnStacks || 0) + 1);
                        ctx.enemy.burnDmgPerStack = player.bulletDamage * p.dps;
                        ctx.enemy.burnTimer = p.duration;
                        sm.visuals.emit('fire',ctx.enemy.x,ctx.enemy.y,{radius:22});
                    }
                });
            },
        },
        {
            id: 'incendiary',
            name: '灼烧弹',
            rarity: SkillRarity.COMMON,
            category: SkillCategory.INFERNO,
            effectType: SkillEffectType.ON_HIT,
            description: '每颗子弹必定灼烧',
            synergies: ['spark', 'chain_burn'],
            evolveCondition: { type: EvolutionCondition.KILL_COUNT, value: 30 },
            tiers: [
                { desc: '每次命中叠加 1 层灼烧（上限 4，每秒 12% 伤害，3 秒）', params: { stacks: 1, maxStacks: 4, dps: 0.12, duration: 3 } },
                { desc: '上限 6 层，每秒 15%', params: { stacks: 1, maxStacks: 6, dps: 0.15, duration: 4 } },
                { desc: '上限 8 层，每秒 18%', params: { stacks: 1, maxStacks: 8, dps: 0.18, duration: 4 } },
            ],
            apply: function(player, sm, params, prevParams) {
                _ensureBurnProcessor(sm);
                sm.registerHandler(SkillEffectType.ON_HIT, 'incendiary', function(ctx) {
                    const inst = sm.getSkill('incendiary');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    const cur = ctx.enemy.burnStacks || 0;
                    ctx.enemy.burnStacks = Math.min(p.maxStacks, cur + p.stacks);
                    ctx.enemy.burnDmgPerStack = player.bulletDamage * p.dps;
                    ctx.enemy.burnTimer = p.duration;
                        sm.visuals.emit('fire',ctx.enemy.x,ctx.enemy.y,{radius:22});
                });
            },
        },
        {
            id: 'scorched_earth',
            name: '燃烧地面',
            rarity: SkillRarity.RARE,
            category: SkillCategory.INFERNO,
            effectType: SkillEffectType.ON_CRIT,
            description: '暴击留下火焰区域',
            synergies: ['spark', 'hellfire'],
            evolveCondition: { type: EvolutionCondition.KILL_COUNT, value: 50 },
            tiers: [
                { desc: '暴击时在命中位置生成火焰区域（100 范围，持续 3 秒，每秒 15% 伤害）', params: { radius: 100, duration: 3, dps: 0.15 } },
                { desc: '范围 140，持续 4 秒，20% 伤害', params: { radius: 140, duration: 4, dps: 0.20 } },
            ],
            apply: function(player, sm, params, prevParams) {
                _ensureBurnProcessor(sm);
                sm.registerHandler(SkillEffectType.ON_CRIT, 'scorched_earth', function(ctx) {
                    const inst = sm.getSkill('scorched_earth');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    if (!sm.runtimeState._fireZones) sm.runtimeState._fireZones = [];
                    sm.visuals.emit('fire',ctx.enemy.x,ctx.enemy.y,{radius:p.radius});
                    sm.runtimeState._fireZones.push({
                        x: ctx.enemy.x, y: ctx.enemy.y,
                        radius: p.radius, life: p.duration,
                        dps: player.bulletDamage * p.dps,
                    });
                });
            },
        },
        {
            id: 'chain_burn',
            name: '连锁灼烧',
            rarity: SkillRarity.RARE,
            category: SkillCategory.INFERNO,
            effectType: SkillEffectType.PERIODIC,
            description: '灼烧敌人向附近传播',
            synergies: ['incendiary', 'firestorm'],
            evolveCondition: { type: EvolutionCondition.KILL_COUNT, value: 40 },
            tiers: [
                { desc: '每 2 秒，灼烧敌人向 150 范围内敌人传播 1 层灼烧', params: { interval: 2, range: 150, spreadStacks: 1 } },
                { desc: '每 1 秒，范围 200，传播 2 层', params: { interval: 1, range: 200, spreadStacks: 2 } },
            ],
            apply: function(player, sm, params, prevParams) {
                _ensureBurnProcessor(sm);
                sm.registerHandler(SkillEffectType.PERIODIC, 'chain_burn', function(dt, ctx) {
                    const inst = sm.getSkill('chain_burn');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    if (!sm.runtimeState._burnSpread) sm.runtimeState._burnSpread = { timer: 0 };
                    const bs = sm.runtimeState._burnSpread;
                    bs.timer -= dt;
                    if (bs.timer > 0) return;
                    bs.timer = p.interval;
                    for (const e of ctx.enemies) {
                        if (!e.active || !e.burnStacks) continue;
                        for (const t of ctx.enemies) {
                            if (!t.active || t === e || t.burnStacks) continue;
                            const d2 = (e.x - t.x) ** 2 + (e.y - t.y) ** 2;
                            if (d2 < p.range * p.range) {
                                t.burnStacks = p.spreadStacks;
                                t.burnDmgPerStack = e.burnDmgPerStack;
                                t.burnTimer = 2;
                                sm.visuals.emit('fire',e.x,e.y,{x2:t.x,y2:t.y,radius:12});
                                break;
                            }
                        }
                    }
                });
            },
        },
        {
            id: 'firestorm',
            name: '火焰风暴',
            rarity: SkillRarity.EPIC,
            category: SkillCategory.INFERNO,
            effectType: SkillEffectType.PERIODIC,
            description: '定时召唤陨石',
            synergies: ['chain_burn', 'hellfire'],
            evolveCondition: { type: EvolutionCondition.KILL_COUNT, value: 60 },
            tiers: [
                { desc: '每 4 秒在周围随机区域降下陨石（150 范围，200% 伤害 + 灼烧 3 层）', params: { cooldown: 4, radius: 150, dmgMul: 2, burnStacks: 3 } },
                { desc: '每 3 秒，范围 180，250% 伤害', params: { cooldown: 3, radius: 180, dmgMul: 2.5, burnStacks: 5 } },
            ],
            apply: function(player, sm, params, prevParams) {
                _ensureBurnProcessor(sm);
                sm.registerHandler(SkillEffectType.PERIODIC, 'firestorm', function(dt, ctx) {
                    const inst = sm.getSkill('firestorm');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    if (!sm.runtimeState._firestormTimer) sm.runtimeState._firestormTimer = 0;
                    sm.runtimeState._firestormTimer -= dt;
                    if (sm.runtimeState._firestormTimer > 0) return;
                    sm.runtimeState._firestormTimer = p.cooldown;
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 80 + Math.random() * 200;
                    const fx = ctx.player.x + Math.cos(angle) * dist;
                    const fy = ctx.player.y + Math.sin(angle) * dist;
                    for (const e of ctx.enemies) {
                        if (!e.active) continue;
                        if ((fx - e.x) ** 2 + (fy - e.y) ** 2 < p.radius * p.radius) {
                            e.takeDamage(player.bulletDamage * p.dmgMul);
                            e.burnStacks = p.burnStacks;
                            e.burnDmgPerStack = player.bulletDamage * 0.1;
                            e.burnTimer = 3;
                        }
                    }
                    if (!sm.runtimeState._fireZones) sm.runtimeState._fireZones = [];
                    sm.runtimeState._fireZones.push({ x: fx, y: fy, radius: p.radius, life: 3, dps: player.bulletDamage * p.dmgMul * 0.1 });
                    sm.visuals.emit('meteor',fx,fy,{radius:p.radius});
                });
            },
        },
        {
            id: 'hellfire',
            name: '焦土',
            rarity: SkillRarity.EPIC,
            category: SkillCategory.INFERNO,
            effectType: SkillEffectType.STAT_MODIFIER,
            description: '强化所有火焰区域',
            synergies: ['scorched_earth', 'firestorm'],
            evolveCondition: { type: EvolutionCondition.DAMAGE_ELITE, value: 1 },
            tiers: [
                { desc: '火焰区域范围 +30%，伤害 +30%，持续时间 +1 秒', params: { radiusMul: 1.3, dpsMul: 1.3, lifeBonus: 1 } },
                { desc: '范围 +60%，伤害 +60%，持续时间 +2 秒', params: { radiusMul: 1.6, dpsMul: 1.6, lifeBonus: 2 } },
            ],
            apply: function(player, sm, params, prevParams) {
                _ensureBurnProcessor(sm);
                sm.runtimeState._hellfire = params;
            },
        },
        {
            id: 'supernova',
            name: '超新星',
            rarity: SkillRarity.LEGENDARY,
            category: SkillCategory.INFERNO,
            effectType: SkillEffectType.PERIODIC,
            description: '全屏火焰环清场',
            synergies: ['firestorm', 'hellfire'],
            evolveCondition: null,
            tiers: [
                { desc: '每 60 秒，火焰环从屏幕边缘收缩到中心，灼烧所有敌人 3 层 + 200% 伤害', params: { cooldown: 60, dmgMul: 2, burnStacks: 3 } },
            ],
            apply: function(player, sm, params, prevParams) {
                _ensureBurnProcessor(sm);
                sm.registerHandler(SkillEffectType.PERIODIC, 'supernova', function(dt, ctx) {
                    const inst = sm.getSkill('supernova');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    if (!sm.runtimeState._supernova) sm.runtimeState._supernova = { timer: 0 };
                    sm.runtimeState._supernova.timer -= dt;
                    if (sm.runtimeState._supernova.timer > 0) return;
                    sm.runtimeState._supernova.timer = p.cooldown;
                    for (const e of ctx.enemies) {
                        if (!e.active) continue;
                        e.takeDamage(player.bulletDamage * p.dmgMul);
                        e.burnStacks = p.burnStacks;
                        e.burnDmgPerStack = player.bulletDamage * 0.3;
                        e.burnTimer = 5;
                    }
                    sm.visuals.emit('nova',ctx.player.x,ctx.player.y,{radius:600});
                });
            },
        },
        {
            id: 'phoenix',
            name: '浴火重生',
            rarity: SkillRarity.EPIC,
            category: SkillCategory.INFERNO,
            effectType: SkillEffectType.ON_DAMAGED,
            description: '致命伤害时复活',
            synergies: ['supernova', 'hellfire'],
            evolveCondition: { type: EvolutionCondition.BOSS_KILLED, value: 1 },
            tiers: [
                { desc: '受到致命伤害时爆炸（200 范围 300% 伤害），回复 40% HP，冷却 240 秒', params: { radius: 200, dmgMul: 3, healPct: 0.4, cooldown: 240 } },
                { desc: '回复 60% HP，冷却 180 秒，范围 250', params: { radius: 250, dmgMul: 4, healPct: 0.6, cooldown: 180 } },
            ],
            apply: function(player, sm, params, prevParams) {
                _ensureBurnProcessor(sm);
                sm.registerHandler(SkillEffectType.ON_DAMAGED, 'phoenix', function(ctx) {
                    const inst = sm.getSkill('phoenix');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    if (!sm.runtimeState._phoenix) sm.runtimeState._phoenix = { onCd: false, timer: 0 };
                    const px = sm.runtimeState._phoenix;
                    if (px.onCd) { px.timer -= 0.016; if (px.timer <= 0) px.onCd = false; return; }
                    if (ctx.player.hp <= 0) {
                        px.onCd = true;
                        px.timer = p.cooldown;
                        ctx.player.hp = Math.floor(ctx.player.maxHp * p.healPct);
                        sm.visuals.emit('phoenix',ctx.player.x,ctx.player.y,{radius:p.radius});
                        const x = ctx.player.x, y = ctx.player.y;
                        for (const e of ctx.game?.enemyManager?.pool || []) {
                            if (!e.active) continue;
                            if ((x - e.x) ** 2 + (y - e.y) ** 2 < p.radius * p.radius) {
                                e.takeDamage(ctx.player.bulletDamage * p.dmgMul);
                            }
                        }
                    }
                });
            },
        },

        // ==============================================================
    ];
}
if (typeof window !== 'undefined') { window.InfernoSkills = InfernoSkills; }
