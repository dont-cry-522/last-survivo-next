/** Storm Skills */
class StormSkills {
    static POOL = [
        //  雷电流 Storm
        // ==============================================================

        {
            id: 'tesla_rounds',
            name: '电击弹',
            rarity: SkillRarity.COMMON,
            category: SkillCategory.STORM,
            effectType: SkillEffectType.ON_HIT,
            description: '子弹几率麻痹 + 额外电击伤害',
            synergies: ['chain_lightning', 'storm_cloud'],
            evolveCondition: { type: EvolutionCondition.KILL_COUNT, value: 30 },
            tiers: [
                { desc: '30% 概率附带 30% 电击伤害 + 麻痹 0.3 秒', params: { chance: 0.3, elecDmg: 0.3, paralyze: 0.3 } },
                { desc: '50% 概率，电击 40%，麻痹 0.5 秒', params: { chance: 0.5, elecDmg: 0.4, paralyze: 0.5 } },
                { desc: '70% 概率，电击 50%，麻痹 0.6 秒 + 传导 1m 内另一个敌人', params: { chance: 0.7, elecDmg: 0.5, paralyze: 0.6, spread: 1 } },
            ],
            apply: function(player, sm, params, prevParams) {
                _ensureBurnProcessor(sm);
                sm.registerHandler(SkillEffectType.ON_HIT, 'tesla_rounds', function(ctx) {
                    const inst = sm.getSkill('tesla_rounds');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    if (Math.random() >= p.chance) return;
                    ctx.enemy.paralyzed = true;
                    ctx.enemy.paralyzeTimer = p.paralyze;
                    ctx.enemy.takeDamage(player.bulletDamage * p.elecDmg);
                    if (p.spread) {
                        for (const e of ctx.enemies) {
                            if (!e.active || e === ctx.enemy) continue;
                            if ((ctx.enemy.x - e.x) ** 2 + (ctx.enemy.y - e.y) ** 2 < 100 * 100) {
                                e.paralyzed = true; e.paralyzeTimer = p.paralyze * 0.5;
                                e.takeDamage(player.bulletDamage * p.elecDmg * 0.5);
                                sm.visuals.emit('lightning',ctx.enemy.x,ctx.enemy.y,{x2:e.x,y2:e.y});
                                break;
                            }
                        }
                    }
                    sm.visuals.emit('lightning',ctx.enemy.x,ctx.enemy.y-26,{x2:ctx.enemy.x,y2:ctx.enemy.y});
                });
            },
        },
        {
            id: 'chain_lightning',
            name: '连锁闪电',
            rarity: SkillRarity.RARE,
            category: SkillCategory.STORM,
            effectType: SkillEffectType.ON_HIT,
            description: '闪电链传导',
            synergies: ['tesla_rounds', 'storm_cloud'],
            evolveCondition: { type: EvolutionCondition.DAMAGE_ELITE, value: 1 },
            tiers: [
                { desc: '命中后闪电跳向 180 内另一敌人，跳 2 次，每次 70% 伤害', params: { range: 180, bounces: 2, dmgMul: 0.7 } },
                { desc: '跳 4 次，范围 250，80% 伤害', params: { range: 250, bounces: 4, dmgMul: 0.8 } },
            ],
            apply: function(player, sm, params, prevParams) {
                _ensureBurnProcessor(sm);
                sm.registerHandler(SkillEffectType.ON_HIT, 'chain_lightning', function(ctx) {
                    const inst = sm.getSkill('chain_lightning');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    let source = ctx.enemy;
                    const hit = new Set();
                    hit.add(source);
                    for (let b = 0; b < p.bounces; b++) {
                        let nearest = null, nd2 = p.range * p.range;
                        for (const e of ctx.enemies) {
                            if (!e.active || hit.has(e)) continue;
                            const d2 = (source.x - e.x) ** 2 + (source.y - e.y) ** 2;
                            if (d2 < nd2) { nd2 = d2; nearest = e; }
                        }
                        if (!nearest) break;
                        hit.add(nearest);
                        nearest.takeDamage(player.bulletDamage * p.dmgMul);
                        nearest.paralyzed = true; nearest.paralyzeTimer = 0.3;
                        sm.visuals.emit('lightning',source.x,source.y,{x2:nearest.x,y2:nearest.y});
                        source = nearest;
                    }
                });
            },
        },
        {
            id: 'storm_cloud',
            name: '雷暴云',
            rarity: SkillRarity.RARE,
            category: SkillCategory.STORM,
            effectType: SkillEffectType.PERIODIC,
            description: '头顶雷云自动雷击',
            synergies: ['chain_lightning', 'ion_cannon'],
            evolveCondition: { type: EvolutionCondition.KILL_COUNT, value: 40 },
            tiers: [
                { desc: '每 2 秒对身下随机敌人释放闪电（120% 伤害 + 麻痹 0.5 秒）', params: { interval: 2, dmgMul: 1.2, paralyze: 0.5 } },
                { desc: '每 1 秒，150% 伤害，麻痹 0.8 秒', params: { interval: 1, dmgMul: 1.5, paralyze: 0.8 } },
            ],
            apply: function(player, sm, params, prevParams) {
                _ensureBurnProcessor(sm);
                sm.registerHandler(SkillEffectType.PERIODIC, 'storm_cloud', function(dt, ctx) {
                    const inst = sm.getSkill('storm_cloud');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    if (!sm.runtimeState._stormCloud) sm.runtimeState._stormCloud = { timer: 0 };
                    const sc = sm.runtimeState._stormCloud;
                    sc.timer -= dt;
                    if (sc.timer > 0) return;
                    const ion = sm.getSkill('ion_cannon');
                    sc.timer = ion ? p.interval * 0.6 : p.interval;
                    const candidates = [];
                    for (const e of ctx.enemies) {
                        if (!e.active) continue;
                        const d2 = (ctx.player.x - e.x) ** 2 + (ctx.player.y - e.y) ** 2;
                        if (d2 < 300 * 300) candidates.push(e);
                    }
                    if (candidates.length > 0) {
                        const t = candidates[Math.floor(Math.random() * candidates.length)];
                        t.takeDamage(ctx.player.bulletDamage * p.dmgMul);
                        t.paralyzed = true; t.paralyzeTimer = p.paralyze;
                        sm.visuals.emit('lightning',ctx.player.x,ctx.player.y-65,{x2:t.x,y2:t.y});
                    }
                });
            },
        },
        {
            id: 'thunder_strike',
            name: '落雷',
            rarity: SkillRarity.EPIC,
            category: SkillCategory.STORM,
            effectType: SkillEffectType.PERIODIC,
            description: '定时重雷打击',
            synergies: ['storm_cloud', 'wrath'],
            evolveCondition: { type: EvolutionCondition.KILL_COUNT, value: 50 },
            tiers: [
                { desc: '每 8 秒对最密敌人区域降下巨雷（250 范围，300% 伤害 + 麻痹 1 秒）', params: { cooldown: 8, radius: 250, dmgMul: 3, paralyze: 1 } },
                { desc: '每 5 秒，范围 300，400% 伤害', params: { cooldown: 5, radius: 300, dmgMul: 4, paralyze: 1 } },
            ],
            apply: function(player, sm, params, prevParams) {
                _ensureBurnProcessor(sm);
                sm.registerHandler(SkillEffectType.PERIODIC, 'thunder_strike', function(dt, ctx) {
                    const inst = sm.getSkill('thunder_strike');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    if (!sm.runtimeState._thunder) sm.runtimeState._thunder = { timer: 0 };
                    sm.runtimeState._thunder.timer -= dt;
                    if (sm.runtimeState._thunder.timer > 0) return;
                    sm.runtimeState._thunder.timer = p.cooldown;
                    const grid = {}; let best = null, bestN = 0;
                    for (const e of ctx.enemies) {
                        if (!e.active) continue;
                        const gx = Math.floor(e.x / 80), gy = Math.floor(e.y / 80), k = gx + ',' + gy;
                        grid[k] = (grid[k] || 0) + 1;
                        if (grid[k] > bestN) { bestN = grid[k]; best = { x: gx * 80 + 40, y: gy * 80 + 40 }; }
                    }
                    if (!best) return;
                    for (const e of ctx.enemies) {
                        if (!e.active) continue;
                        if ((best.x - e.x) ** 2 + (best.y - e.y) ** 2 < p.radius * p.radius) {
                            e.takeDamage(ctx.player.bulletDamage * p.dmgMul);
                            e.paralyzed = true; e.paralyzeTimer = p.paralyze;
                        }
                    }
                    sm.visuals.emit('lightning',best.x,best.y,{x2:best.x,y2:best.y-240,radius:p.radius});
                    for (let i = 0; i < 2; i++) {
                        ctx.particleManager.spawnTrail(
                            best.x + (Math.random() - 0.5) * p.radius, best.y + (Math.random() - 0.5) * p.radius,
                            Math.PI / 2 + Math.random() * 0.3, '#ffff66'
                        );
                    }
                });
            },
        },
        {
            id: 'ion_cannon',
            name: '离子炮',
            rarity: SkillRarity.EPIC,
            category: SkillCategory.STORM,
            effectType: SkillEffectType.STAT_MODIFIER,
            description: '强化所有雷电效果',
            synergies: ['chain_lightning', 'storm_cloud'],
            evolveCondition: { type: EvolutionCondition.DAMAGE_ELITE, value: 1 },
            tiers: [
                { desc: '连锁闪电 +2 跳，雷暴云 +40% 速度，所有电击伤害 +30%', params: { extraBounces: 2, cloudSpeedMul: 0.6, dmgBonus: 0.3 } },
                { desc: '连锁 +4 跳，雷云 +60% 速度，电击 +50%', params: { extraBounces: 4, cloudSpeedMul: 0.5, dmgBonus: 0.5 } },
            ],
            apply: function(player, sm, params, prevParams) {
                sm.runtimeState._ionCannon = params;
            },
        },
        {
            id: 'static_field',
            name: '静电领域',
            rarity: SkillRarity.EPIC,
            category: SkillCategory.STORM,
            effectType: SkillEffectType.AURA,
            description: '周围敌人自动连锁',
            synergies: ['chain_lightning', 'tesla_rounds'],
            evolveCondition: { type: EvolutionCondition.KILL_COUNT, value: 50 },
            tiers: [
                { desc: '周围 200 内超过 4 个敌人时自动释放闪电链（2 跳，80% 伤害）', params: { radius: 200, threshold: 4, bounces: 2, dmgMul: 0.8 } },
                { desc: '超过 3 个，范围 250，4 跳，100% 伤害', params: { radius: 250, threshold: 3, bounces: 4, dmgMul: 1.0 } },
            ],
            apply: function(player, sm, params, prevParams) {
                _ensureBurnProcessor(sm);
                sm.registerHandler(SkillEffectType.PERIODIC, 'static_field', function(dt, ctx) {
                    const inst = sm.getSkill('static_field');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    if (!sm.runtimeState._staticField) sm.runtimeState._staticField = { timer: 0 };
                    sm.runtimeState._staticField.timer -= dt;
                    if (sm.runtimeState._staticField.timer > 0) return;
                    sm.runtimeState._staticField.timer = 1.5;
                    const nearby = [];
                    for (const e of ctx.enemies) {
                        if (!e.active) continue;
                        if ((ctx.player.x - e.x) ** 2 + (ctx.player.y - e.y) ** 2 < p.radius * p.radius) nearby.push(e);
                    }
                    if (nearby.length < p.threshold) return;
                    let source = nearby[Math.floor(Math.random() * nearby.length)];
                    const hit = new Set(); hit.add(source);
                    for (let b = 0; b < p.bounces; b++) {
                        let nearest = null, nd2 = p.radius * p.radius;
                        for (const e of nearby) {
                            if (hit.has(e)) continue;
                            const d2 = (source.x - e.x) ** 2 + (source.y - e.y) ** 2;
                            if (d2 < nd2) { nd2 = d2; nearest = e; }
                        }
                        if (!nearest) break;
                        hit.add(nearest);
                        nearest.takeDamage(ctx.player.bulletDamage * p.dmgMul);
                        nearest.paralyzed = true; nearest.paralyzeTimer = 0.3;
                        sm.visuals.emit('lightning',source.x,source.y,{x2:nearest.x,y2:nearest.y});
                        source = nearest;
                    }
                });
            },
        },
        {
            id: 'emp',
            name: '电磁脉冲',
            rarity: SkillRarity.COMMON,
            category: SkillCategory.STORM,
            effectType: SkillEffectType.ON_KILL,
            description: '击杀释放电磁脉冲',
            synergies: ['chain_lightning', 'static_field'],
            evolveCondition: { type: EvolutionCondition.KILL_COUNT, value: 40 },
            tiers: [
                { desc: '击杀时对周围 180 敌人释放 60% 伤害 + 麻痹 0.5 秒', params: { radius: 180, dmgMul: 0.6, paralyze: 0.5 } },
                { desc: '范围 220，80% 伤害', params: { radius: 220, dmgMul: 0.8, paralyze: 0.6 } },
                { desc: '范围 280，100% 伤害 + 连锁 1 次', params: { radius: 280, dmgMul: 1.0, paralyze: 0.7, chain: 1 } },
            ],
            apply: function(player, sm, params, prevParams) {
                _ensureBurnProcessor(sm);
                sm.registerHandler(SkillEffectType.ON_KILL, 'emp', function(ctx) {
                    const inst = sm.getSkill('emp');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    const x = ctx.player.x, y = ctx.player.y;
                    for (const e of ctx.enemies) {
                        if (!e.active) continue;
                        if ((x - e.x) ** 2 + (y - e.y) ** 2 < p.radius * p.radius) {
                            e.takeDamage(ctx.player.bulletDamage * p.dmgMul);
                            e.paralyzed = true; e.paralyzeTimer = p.paralyze;
                        }
                    }
                    sm.visuals.emit('lightning',x,y,{x2:x,y2:y-70,radius:p.radius});
                });
            },
        },
        {
            id: 'wrath',
            name: '天罚',
            rarity: SkillRarity.LEGENDARY,
            category: SkillCategory.STORM,
            effectType: SkillEffectType.PERIODIC,
            description: '全屏雷击审判',
            synergies: ['thunder_strike', 'ion_cannon'],
            evolveCondition: null,
            tiers: [
                { desc: '每 45 秒，对全屏随机敌人连续降下 10 道巨雷（200 范围，300% 伤害 + 麻痹 1 秒）', params: { cooldown: 45, count: 10, radius: 200, dmgMul: 3, paralyze: 1 } },
            ],
            apply: function(player, sm, params, prevParams) {
                _ensureBurnProcessor(sm);
                sm.registerHandler(SkillEffectType.PERIODIC, 'wrath', function(dt, ctx) {
                    const inst = sm.getSkill('wrath');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    if (!sm.runtimeState._wrath) sm.runtimeState._wrath = { timer: p.cooldown };
                    const w = sm.runtimeState._wrath;
                    w.timer -= dt;
                    if (w.timer > 0) return;
                    w.timer = p.cooldown;
                    for (let i = 0; i < p.count; i++) {
                        const candidates = [];
                        for (const e of ctx.enemies) {
                            if (!e.active) continue;
                            candidates.push(e);
                        }
                        if (candidates.length === 0) break;
                        const t = candidates[Math.floor(Math.random() * candidates.length)];
                        for (const e of ctx.enemies) {
                            if (!e.active) continue;
                            if ((t.x - e.x) ** 2 + (t.y - e.y) ** 2 < p.radius * p.radius) {
                                e.takeDamage(ctx.player.bulletDamage * p.dmgMul);
                                e.paralyzed = true; e.paralyzeTimer = p.paralyze;
                            }
                        }
                        sm.visuals.emit('lightning',t.x,t.y,{x2:t.x,y2:t.y-260,radius:p.radius});
                    }
                });
            },
        },

        // ==============================================================
    ];
}
if (typeof window !== 'undefined') { window.StormSkills = StormSkills; }
