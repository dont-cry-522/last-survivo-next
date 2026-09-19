/** BulletStorm Skills */
class BulletStormSkills {
    static POOL = [
        //  枪弹风暴 Bullet Storm
        // ==============================================================

        // ---- 普通 (Common) ----
        {
            id: 'spread_shot',
            name: '散射射击',
            rarity: SkillRarity.COMMON,
            category: SkillCategory.BULLET_STORM,
            effectType: SkillEffectType.PROJECTILE_MODIFIER,
            description: '子弹变为扇形散射',
            synergies: ['bounce', 'splitter'],
            evolveCondition: { type: EvolutionCondition.KILL_COUNT, value: 30 },
            tiers: [
                { desc: '同时发射 3 颗子弹，每颗伤害 60%', params: { bulletCount: 3, damageMul: 0.6, spread: 0.5 } },
                { desc: '5 颗子弹', params: { bulletCount: 5, damageMul: 0.65, spread: 0.5 } },
                { desc: '7 颗子弹，每颗伤害恢复至 80%', params: { bulletCount: 7, damageMul: 0.8, spread: 0.4 } },
            ],
            apply: function(player, sm, params, prevParams) {
                if (prevParams) {
                    player.bulletCount -= prevParams.bulletCount;
                    player.bulletDamage /= prevParams.damageMul;
                }
                player.bulletCount += params.bulletCount;
                player.bulletDamage *= params.damageMul;
                player._spreadAngle = params.spread;
            },
        },
        {
            id: 'dual_wield',
            name: '双持',
            rarity: SkillRarity.COMMON,
            category: SkillCategory.BULLET_STORM,
            effectType: SkillEffectType.PROJECTILE_MODIFIER,
            description: '多个方向同时射击',
            synergies: ['spread_shot', 'overheat'],
            evolveCondition: { type: EvolutionCondition.KILL_COUNT, value: 30 },
            tiers: [
                { desc: '从左右两侧同时发射，伤害 80%', params: { directions: 2, damageMul: 0.8 } },
                { desc: '伤害恢复至 100%', params: { directions: 2, damageMul: 1.0 } },
                { desc: '额外增加一个方向（3方向齐射）', params: { directions: 3, damageMul: 1.0 } },
            ],
            apply: function(player, sm, params, prevParams) {
                if (prevParams) {
                    player._dualWieldDirections = 0;
                }
                player._dualWieldDirections = params.directions;
                if (!prevParams || prevParams.damageMul !== params.damageMul) {
                    if (prevParams) player.bulletDamage /= prevParams.damageMul;
                    player.bulletDamage *= params.damageMul;
                }
            },
        },
        {
            id: 'armor_piercing',
            name: '穿甲弹',
            rarity: SkillRarity.COMMON,
            category: SkillCategory.BULLET_STORM,
            effectType: SkillEffectType.PROJECTILE_MODIFIER,
            description: '穿透并逐次增伤',
            synergies: ['splitter', 'bounce'],
            evolveCondition: { type: EvolutionCondition.KILL_COUNT, value: 30 },
            tiers: [
                { desc: '穿透 +2，每穿透一个伤害 +15%', params: { pierce: 2, dmgPerPierce: 0.15 } },
                { desc: '穿透 +3，+20%', params: { pierce: 3, dmgPerPierce: 0.2 } },
                { desc: '穿透 +5，+25%', params: { pierce: 5, dmgPerPierce: 0.25 } },
            ],
            apply: function(player, sm, params, prevParams) {
                if (prevParams) {
                    player.pierce -= prevParams.pierce;
                }
                player.pierce += params.pierce;
                player._pierceDmgBonus = params.dmgPerPierce;
            },
        },

        // ---- 稀有 (Rare) ----
        {
            id: 'bounce',
            name: '弹射',
            rarity: SkillRarity.RARE,
            category: SkillCategory.BULLET_STORM,
            effectType: SkillEffectType.ON_HIT,
            description: '子弹命中后弹向其他敌人',
            synergies: ['spread_shot', 'armor_piercing', 'splitter'],
            evolveCondition: { type: EvolutionCondition.DAMAGE_ELITE, value: 1 },
            tiers: [
                { desc: '命中后弹向 5m 内另一敌人，弹射 1 次，递减 20%', params: { bounces: 1, range: 250, decay: 0.2 } },
                { desc: '弹射 3 次，递减 10%', params: { bounces: 3, range: 300, decay: 0.1 } },
            ],
            apply: function(player, sm, params, prevParams) {
                sm.registerHandler(SkillEffectType.ON_HIT, 'bounce', function(ctx) {
                    const inst = sm.getSkill('bounce');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    let source = ctx.enemy;
                    for (let b = 0; b < p.bounces; b++) {
                        let nearest = null, nd2 = p.range * p.range;
                        for (let i = 0; i < ctx.enemies.length; i++) {
                            const e = ctx.enemies[i];
                            if (!e.active || e === source) continue;
                            const d2 = (source.x - e.x) ** 2 + (source.y - e.y) ** 2;
                            if (d2 < nd2) { nd2 = d2; nearest = e; }
                        }
                        if (!nearest) break;
                        const a = Math.atan2(nearest.y - source.y, nearest.x - source.x);
                        const dmg = ctx.bullet.damage * (1 - p.decay);
                        const shot=ctx.bulletManager.fire(source.x, source.y, a, dmg, ctx.bullet.speed, 0, nearest, 1);
                        if(shot)sm.visuals.emit('gun',source.x,source.y,{radius:18,angle:a});
                        source = nearest;
                    }
                });
            },
        },
        {
            id: 'splitter',
            name: '分裂弹头',
            rarity: SkillRarity.RARE,
            category: SkillCategory.BULLET_STORM,
            effectType: SkillEffectType.ON_HIT,
            description: '子弹命中时分裂',
            synergies: ['spread_shot', 'armor_piercing', 'bounce'],
            evolveCondition: { type: EvolutionCondition.DAMAGE_ELITE, value: 1 },
            tiers: [
                { desc: '命中时向扇形分裂 2 颗小子弹（50% 伤害）', params: { count: 2, spreadAngle: 0.8, damageMul: 0.5 } },
                { desc: '分裂 4 颗，伤害 60%', params: { count: 4, spreadAngle: 0.8, damageMul: 0.6 } },
            ],
            apply: function(player, sm, params, prevParams) {
                sm.registerHandler(SkillEffectType.ON_HIT, 'splitter', function(ctx) {
                    const inst = sm.getSkill('splitter');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    const baseAngle = Math.atan2(ctx.bullet.vy, ctx.bullet.vx);
                    for (let i = 0; i < p.count; i++) {
                        const spread = p.count > 1 ? (i - (p.count - 1) / 2) * p.spreadAngle / (p.count - 1) : 0;
                        const a = baseAngle + spread;
                        const dmg = ctx.bullet.damage * p.damageMul;
                        const shot=ctx.bulletManager.fire(ctx.enemy.x, ctx.enemy.y, a, dmg, ctx.bullet.speed * 0.7, 0, null, 1);
                        if(shot)sm.visuals.emit('gun',ctx.enemy.x,ctx.enemy.y,{radius:25,angle:a});
                    }
                });
            },
        },
        {
            id: 'overheat',
            name: '过热连射',
            rarity: SkillRarity.RARE,
            category: SkillCategory.BULLET_STORM,
            effectType: SkillEffectType.ON_KILL,
            description: '击杀后提升攻速',
            synergies: ['spread_shot', 'dual_wield'],
            evolveCondition: { type: EvolutionCondition.KILL_COUNT, value: 50 },
            tiers: [
                { desc: '击杀后 1 秒内攻速 +50%，可叠加 3 层', params: { maxStacks: 3, perStackAtkSpeed: 0.5, duration: 1 } },
                { desc: '可叠加 5 层，每层 +60%', params: { maxStacks: 5, perStackAtkSpeed: 0.6, duration: 1 } },
            ],
            apply: function(player, sm, params, prevParams) {
                player._overheat = { maxStacks: params.maxStacks, perStack: params.perStackAtkSpeed, duration: params.duration };
            },
        },

        // ---- 史诗 (Epic) ----
        {
            id: 'rotary_turret',
            name: '旋转枪阵',
            rarity: SkillRarity.EPIC,
            category: SkillCategory.BULLET_STORM,
            effectType: SkillEffectType.SUMMON,
            description: '环绕炮台自动射击',
            synergies: ['overheat', 'spread_shot'],
            evolveCondition: { type: EvolutionCondition.KILL_COUNT, value: 60 },
            tiers: [
                { desc: '召唤 2 个微型炮台（继承 30% 伤害）', params: { count: 2, damageMul: 0.3 } },
                { desc: '4 个炮台，伤害 40%', params: { count: 4, damageMul: 0.4 } },
            ],
            apply: function(player, sm, params, prevParams) {
                sm.registerHandler(SkillEffectType.SUMMON, 'rotary_turret', function(dt, ctx) {
                    const inst = sm.getSkill('rotary_turret');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    if (!sm.runtimeState._turrets) sm.runtimeState._turrets = [];
                    const turrets = sm.runtimeState._turrets;

                    while (turrets.length < p.count) {
                        const a = Math.random() * Math.PI * 2;
                        turrets.push({ angle: a, orbitR: 50, orbitSpeed: 2.5, fireTimer: 0, fireInterval: 0.6 });
                    }
                    while (turrets.length > p.count) turrets.pop();

                    for (const t of turrets) {
                        t.angle += t.orbitSpeed * dt;
                        const tx = ctx.player.x + Math.cos(t.angle) * t.orbitR;
                        const ty = ctx.player.y + Math.sin(t.angle) * t.orbitR;
                        t.fireTimer -= dt;
                        if (t.fireTimer <= 0) {
                            t.fireTimer = t.fireInterval;
                            let nearest = null, nd = 500 * 500;
                            for (const e of ctx.enemies) {
                                if (!e.active) continue;
                                const d2 = (tx - e.x) ** 2 + (ty - e.y) ** 2;
                                if (d2 < nd) { nd = d2; nearest = e; }
                            }
                            if (nearest) {
                                const a2 = Math.atan2(nearest.y - ty, nearest.x - tx);
                                t.aimAngle=a2;
                                const dmg = ctx.player.bulletDamage * p.damageMul;
                                ctx.bulletManager.fire(tx, ty, a2, dmg, ctx.player.bulletSpeed, ctx.player.pierce, nearest);
                            }
                        }
                    }
                });
            },
        },

        // ---- 传说 (Legendary) ----
        {
            id: 'terminator_barrage',
            name: '终结者弹幕',
            rarity: SkillRarity.LEGENDARY,
            category: SkillCategory.BULLET_STORM,
            effectType: SkillEffectType.PERIODIC,
            description: '移动时洒落地雷',
            synergies: ['spread_shot', 'overheat'],
            evolveCondition: null,
            tiers: [
                { desc: '移动时身后洒落地雷（每秒 3 颗），0.5 秒激活，100% 伤害，150 范围', params: { rate: 3, radius: 150, damageMul: 1.0, armTime: 0.5 } },
            ],
            apply: function(player, sm, params, prevParams) {
                sm.registerHandler(SkillEffectType.PERIODIC, 'terminator_barrage', function(dt, ctx) {
                    const inst = sm.getSkill('terminator_barrage');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    if (!sm.runtimeState._mines) sm.runtimeState._mines = { timer: 0, mines: [] };
                    const state = sm.runtimeState._mines;

                    const moving = ctx.player.moving;
                    if (moving) {
                        state.timer -= dt;
                        if (state.timer <= 0) {
                            state.timer = 1 / p.rate;
                            state.mines.push({
                                x: ctx.player.x, y: ctx.player.y,
                                timer: p.armTime, armed: false, life: 8,
                                radius: p.radius, damage: ctx.player.bulletDamage * p.damageMul,
                            });
                        }
                    }

                    for (let i = state.mines.length - 1; i >= 0; i--) {
                        const m = state.mines[i];
                        if (!m.armed) { m.timer -= dt; if (m.timer <= 0) m.armed = true; continue; }
                        m.life -= dt;
                        if (m.life <= 0) { state.mines.splice(i, 1); continue; }
                        let exploded = false;
                        for (const e of ctx.enemies) {
                            if (!e.active) continue;
                            if ((m.x - e.x) ** 2 + (m.y - e.y) ** 2 < m.radius * m.radius) {
                                e.takeDamage(m.damage);
                                exploded = true;
                                break;
                            }
                        }
                        if (exploded) {
                            sm.visuals.emit('fire',m.x,m.y,{radius:m.radius,color:'#d5bd82'});
                            state.mines.splice(i, 1);
                        }
                    }
                });
            },
        },

        // ==============================================================
    ];
}
if (typeof window !== 'undefined') { window.BulletStormSkills = BulletStormSkills; }
