/** Summoner Skills */
class SummonerSkills {
    static POOL = [
        //  召唤流 Summoner
        // ==============================================================

        {
            id: 'drone',
            name: '浮游炮',
            rarity: SkillRarity.COMMON,
            category: SkillCategory.SUMMONER,
            effectType: SkillEffectType.SUMMON,
            description: '自动攻击的浮游炮',
            synergies: ['swarm', 'laser_target'],
            evolveCondition: { type: EvolutionCondition.KILL_COUNT, value: 30 },
            tiers: [
                { desc: '召唤 1 个浮游炮（继承 40% 伤害，每 0.8 秒射击）', params: { count: 1, dmgMul: 0.4, fireRate: 0.8 } },
                { desc: '2 个浮游炮，伤害 50%', params: { count: 2, dmgMul: 0.5, fireRate: 0.7 } },
                { desc: '3 个浮游炮，伤害 60%，发射穿透弹', params: { count: 3, dmgMul: 0.6, fireRate: 0.6, pierce: true } },
            ],
            apply: function(player, sm, params, prevParams) {
                _ensureBurnProcessor(sm);
                if (!sm.runtimeState._drones) sm.runtimeState._drones = [];
                const drones = sm.runtimeState._drones;
                while (drones.length < params.count) drones.push({ angle: Math.random() * Math.PI * 2, orbitR: 60, fireTimer: 0 });
                while (drones.length > params.count) drones.pop();
                sm.registerHandler(SkillEffectType.PERIODIC, 'drone', function(dt, ctx) {
                    const inst = sm.getSkill('drone');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    const drones = sm.runtimeState._drones || [];
                    while (drones.length < p.count) drones.push({ angle: Math.random() * Math.PI * 2, orbitR: 60, fireTimer: 0 });
                    while (drones.length > p.count) drones.pop();
                    for (const d of drones) {
                        d.angle += 1.5 * dt;
                        d.fireTimer -= dt;
                        if (d.fireTimer > 0) continue;
                        d.fireTimer = p.fireRate;
                        const dx = ctx.player.x + Math.cos(d.angle) * d.orbitR;
                        const dy = ctx.player.y + Math.sin(d.angle) * d.orbitR;
                        let nearest = null, nd = 400 * 400;
                        for (const e of ctx.enemies) {
                            if (!e.active) continue;
                            const d2 = (dx - e.x) ** 2 + (dy - e.y) ** 2;
                            if (d2 < nd) { nd = d2; nearest = e; }
                        }
                        if (nearest) {
                            d.aimAngle=Math.atan2(nearest.y-dy,nearest.x-dx);
                            const soundShot=ctx.bulletManager.fire(dx, dy, Math.atan2(nearest.y - dy, nearest.x - dx), ctx.player.bulletDamage * p.dmgMul, ctx.player.bulletSpeed, p.pierce ? ctx.player.pierce : 0, nearest);
                            if(soundShot)soundShot.soundKind='mechanical';
                        }
                    }
                });
            },
        },
        {
            id: 'swarm',
            name: '无人机群',
            rarity: SkillRarity.EPIC,
            category: SkillCategory.SUMMONER,
            effectType: SkillEffectType.SUMMON,
            description: '无人机群 + 扫射',
            synergies: ['drone', 'laser_target'],
            evolveCondition: { type: EvolutionCondition.KILL_COUNT, value: 50 },
            tiers: [
                { desc: '无人机数量上限 +2（总计 5），每 5 秒齐射一轮（300%×5）', params: { extraCount: 2, strafeCD: 5, strafeMul: 3 } },
                { desc: '+3 无人机（总计 6），齐射 400%，每 4 秒', params: { extraCount: 3, strafeCD: 4, strafeMul: 4 } },
            ],
            apply: function(player, sm, params, prevParams) {
                _ensureBurnProcessor(sm);
                if (!sm.runtimeState._swarm) sm.runtimeState._swarm = { timer: 0 };
                sm.runtimeState._swarm.timer = 0;
                sm.runtimeState._swarmConfig = params;
                sm.registerHandler(SkillEffectType.PERIODIC, 'swarm', function(dt, ctx) {
                    const inst = sm.getSkill('swarm');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    const sw = sm.runtimeState._swarm || {};
                    sw.timer -= dt;
                    if (sw.timer > 0) return;
                    sw.timer = p.strafeCD;
                    const drones = sm.runtimeState._drones || [];
                    for (const d of drones) {
                        const dx = ctx.player.x + Math.cos(d.angle) * 60;
                        const dy = ctx.player.y + Math.sin(d.angle) * 60;
                        const a = Math.random() * Math.PI * 2;
                        for (let i = 0; i < 3; i++) {
                            const soundShot=ctx.bulletManager.fire(dx, dy, a + (i - 1) * 0.3, ctx.player.bulletDamage * p.strafeMul * 0.3, ctx.player.bulletSpeed, 0, null);
                            if(soundShot)soundShot.soundKind='mechanical';
                        }
                    }
                });
            },
        },
        {
            id: 'laser_target',
            name: '激光瞄准',
            rarity: SkillRarity.RARE,
            category: SkillCategory.SUMMONER,
            effectType: SkillEffectType.ON_HIT,
            description: '标记敌人被集火',
            synergies: ['drone', 'swarm'],
            evolveCondition: { type: EvolutionCondition.KILL_COUNT, value: 30 },
            tiers: [
                { desc: '命中敌人标记 3 秒，无人机优先攻击标记目标 + 伤害 +40%', params: { duration: 3, dmgBonus: 0.4 } },
                { desc: '标记 5 秒，伤害 +70%', params: { duration: 5, dmgBonus: 0.7 } },
            ],
            apply: function(player, sm, params, prevParams) {
                if (!sm.runtimeState._laserTarget) sm.runtimeState._laserTarget = { target: null, timer: 0 };
                sm.registerHandler(SkillEffectType.ON_HIT, 'laser_target', function(ctx) {
                    const inst = sm.getSkill('laser_target');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    sm.runtimeState._laserTarget = { target: ctx.enemy, timer: p.duration, dmgBonus: p.dmgBonus };
                });
                sm.registerHandler(SkillEffectType.PERIODIC, 'laser_target', function(dt) {
                    const lt = sm.runtimeState._laserTarget;
                    if (!lt || !lt.timer) return;
                    lt.timer -= dt; if (lt.timer <= 0) lt.target = null;
                });
            },
        },
        {
            id: 'bomber',
            name: '轰炸编队',
            rarity: SkillRarity.EPIC,
            category: SkillCategory.SUMMONER,
            effectType: SkillEffectType.SUMMON,
            description: '无人机定期投弹',
            synergies: ['swarm', 'orbital'],
            evolveCondition: { type: EvolutionCondition.KILL_COUNT, value: 50 },
            tiers: [
                { desc: '无人机数量 +1，每 3 秒投弹（150 范围，200% 伤害）', params: { extraCount: 1, bombCD: 3, bombDmg: 2, bombRadius: 150 } },
                { desc: '+2 无人机，每 2 秒，250% 伤害', params: { extraCount: 2, bombCD: 2, bombDmg: 2.5, bombRadius: 170 } },
            ],
            apply: function(player, sm, params, prevParams) {
                _ensureBurnProcessor(sm);
                if (!sm.runtimeState._bomber) sm.runtimeState._bomber = { timer: 0 };
                sm.runtimeState._bomberConfig = params;
                sm.registerHandler(SkillEffectType.PERIODIC, 'bomber', function(dt, ctx) {
                    const inst = sm.getSkill('bomber');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    const bm = sm.runtimeState._bomber || {};
                    bm.timer -= dt;
                    if (bm.timer > 0) return;
                    bm.timer = p.bombCD;
                    const drones = sm.runtimeState._drones || [];
                    for (const d of drones) {
                        const dx = ctx.player.x + Math.cos(d.angle) * 60;
                        const dy = ctx.player.y + Math.sin(d.angle) * 60;
                        for (const e of ctx.enemies) {
                            if (!e.active) continue;
                            if ((dx - e.x) ** 2 + (dy - e.y) ** 2 < p.bombRadius * p.bombRadius) {
                                e.takeDamage(ctx.player.bulletDamage * p.bombDmg);
                            }
                        }
                        sm.visuals.emit('fire',dx,dy,{sound:'explosion',radius:p.bombRadius,color:'#ddbd80'});
                    }
                });
            },
        },
        {
            id: 'mothership',
            name: '母舰',
            rarity: SkillRarity.LEGENDARY,
            category: SkillCategory.SUMMONER,
            effectType: SkillEffectType.SUMMON,
            description: '空投拦截机',
            synergies: ['swarm', 'orbital'],
            evolveCondition: null,
            tiers: [
                { desc: '每 6 秒空投 3 架拦截机（持续 8 秒，60% 伤害），可超上限', params: { cooldown: 6, count: 3, life: 8, dmgMul: 0.6 } },
            ],
            apply: function(player, sm, params, prevParams) {
                _ensureBurnProcessor(sm);
                if (!sm.runtimeState._mothership) sm.runtimeState._mothership = { timer: 0, interceptors: [] };
                sm.registerHandler(SkillEffectType.PERIODIC, 'mothership', function(dt, ctx) {
                    const inst = sm.getSkill('mothership');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    const ms = sm.runtimeState._mothership || {};
                    ms.timer -= dt;
                    if (ms.timer <= 0) {
                        ms.timer = p.cooldown;
                        for (let i = 0; i < p.count; i++) {
                            ms.interceptors.push({
                                x: ctx.player.x + (Math.random() - 0.5) * 200, y: ctx.player.y + (Math.random() - 0.5) * 200,
                                life: p.life, dmgMul: p.dmgMul, fireTimer: 0
                            });
                        }
                    }
                    for (let i = ms.interceptors.length - 1; i >= 0; i--) {
                        const ic = ms.interceptors[i];
                        ic.life -= dt; if (ic.life <= 0) { ms.interceptors.splice(i, 1); continue; }
                        ic.fireTimer -= dt;
                        if (ic.fireTimer <= 0) {
                            ic.fireTimer = 0.5;
                            let nearest = null, nd = 350 * 350;
                            for (const e of ctx.enemies) {
                                if (!e.active) continue;
                                const d2 = (ic.x - e.x) ** 2 + (ic.y - e.y) ** 2;
                                if (d2 < nd) { nd = d2; nearest = e; }
                            }
                            if (nearest) {
                                ic.aimAngle=Math.atan2(nearest.y-ic.y,nearest.x-ic.x);
                                const soundShot=ctx.bulletManager.fire(ic.x, ic.y, Math.atan2(nearest.y - ic.y, nearest.x - ic.x), ctx.player.bulletDamage * ic.dmgMul, ctx.player.bulletSpeed, 0, nearest);
                                if(soundShot)soundShot.soundKind='mechanical';
                            }
                        }
                    }
                });
            },
        },
        {
            id: 'orbital',
            name: '轨道打击',
            rarity: SkillRarity.LEGENDARY,
            category: SkillCategory.SUMMONER,
            effectType: SkillEffectType.PERIODIC,
            description: '从天而降的激光',
            synergies: ['mothership', 'bomber'],
            evolveCondition: null,
            tiers: [
                { desc: '每 20 秒从屏幕顶端射下激光（200 范围，600% 伤害），沿玩家位置横扫', params: { cooldown: 20, radius: 200, dmgMul: 6 } },
            ],
            apply: function(player, sm, params, prevParams) {
                _ensureBurnProcessor(sm);
                if (!sm.runtimeState._orbital) sm.runtimeState._orbital = { timer: 0 };
                sm.registerHandler(SkillEffectType.PERIODIC, 'orbital', function(dt, ctx) {
                    const inst = sm.getSkill('orbital');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    const ob = sm.runtimeState._orbital || {};
                    ob.timer -= dt;
                    if (ob.timer > 0) return;
                    ob.timer = p.cooldown;
                    for (const e of ctx.enemies) {
                        if (!e.active) continue;
                        if (Math.abs(ctx.player.x - e.x) < p.radius) {
                            e.takeDamage(ctx.player.bulletDamage * p.dmgMul);
                        }
                    }
                    sm.visuals.emit('beam',ctx.player.x,ctx.player.y,{radius:p.radius});
                    for (let i = -1; i <= 1; i++) {
                        ctx.particleManager.spawnExplosion(ctx.player.x + i * 40, ctx.player.y - 300, '#ffdd44', 5);
                    }
                });
            },
        },
        {
            id: 'repair_drone',
            name: '修理机器人',
            rarity: SkillRarity.COMMON,
            category: SkillCategory.SUMMONER,
            effectType: SkillEffectType.PERIODIC,
            description: '无人机周期性回血',
            synergies: ['drone', 'mothership'],
            evolveCondition: { type: EvolutionCondition.SURVIVAL_TIME, value: 120 },
            tiers: [
                { desc: '每有 1 架无人机，每秒回复 0.5 HP', params: { regenPerDrone: 0.5 } },
                { desc: '每架回复 1 HP，无人机总数 +1', params: { regenPerDrone: 1, extraDrone: 1 } },
                { desc: '每架回复 1.5 HP，无人机 +2', params: { regenPerDrone: 1.5, extraDrone: 2 } },
            ],
            apply: function(player, sm, params, prevParams) {
                _ensureBurnProcessor(sm);
                sm.runtimeState._repairDrone = params;
                sm.registerHandler(SkillEffectType.PERIODIC, 'repair_drone', function(dt, ctx) {
                    const inst = sm.getSkill('repair_drone');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    const count = (sm.runtimeState._drones?.length || 0) + (sm.runtimeState._mothership?.interceptors?.length || 0);
                    ctx.player.hp = Math.min(ctx.player.maxHp, ctx.player.hp + count * p.regenPerDrone * dt);
                });
            },
        },
        {
            id: 'overcharge',
            name: '过载',
            rarity: SkillRarity.RARE,
            category: SkillCategory.SUMMONER,
            effectType: SkillEffectType.STAT_MODIFIER,
            description: '强化所有无人机',
            synergies: ['drone', 'swarm', 'bomber'],
            evolveCondition: { type: EvolutionCondition.DAMAGE_ELITE, value: 1 },
            tiers: [
                { desc: '无人机伤害 +30%，射速 +30%，环绕半径 +20', params: { dmgBonus: 0.3, speedBonus: 0.3, rangeBonus: 20 } },
                { desc: '伤害 +60%，射速 +50%，半径 +30', params: { dmgBonus: 0.6, speedBonus: 0.5, rangeBonus: 30 } },
            ],
            apply: function(player, sm, params, prevParams) {
                sm.runtimeState._overcharge = params;
            },
        },
    ];
}
if (typeof window !== 'undefined') { window.SummonerSkills = SummonerSkills; }
