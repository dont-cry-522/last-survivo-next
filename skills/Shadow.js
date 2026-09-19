/** Shadow Skills */
class ShadowSkills {
    static POOL = [
        //  暗影行者 Shadow
        // ==============================================================

        {
            id: 'afterimage_blast',
            name: '残影爆破',
            rarity: SkillRarity.COMMON,
            category: SkillCategory.SHADOW,
            effectType: SkillEffectType.ON_DASH,
            description: '冲刺留下爆炸残影',
            synergies: ['quantum_dash', 'void_walker'],
            evolveCondition: { type: EvolutionCondition.KILL_COUNT, value: 30 },
            tiers: [
                { desc: '冲刺路径留下 3 个残影，各 80% 伤害爆炸（100 范围）', params: { count: 3, dmgMul: 0.8, radius: 100 } },
                { desc: '5 个残影，120% 伤害', params: { count: 5, dmgMul: 1.2, radius: 100 } },
                { desc: '7 个残影，150% 伤害 + 残影区留伤害场（1 秒 50%/秒）', params: { count: 7, dmgMul: 1.5, radius: 120, field: true } },
            ],
            apply: function(player, sm, params, prevParams) {
                _ensureBurnProcessor(sm);
                if (!sm.runtimeState._afterimages) sm.runtimeState._afterimages = [];
                sm.registerHandler(SkillEffectType.ON_DASH, 'afterimage_blast', function(ctx) {
                    const inst = sm.getSkill('afterimage_blast');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    for (let i = 0; i < p.count; i++) {
                        const t = (i / (p.count - 1)) * 0.4 - 0.2;
                        const ax = ctx.player.x - ctx.player.dashDirection.x * 40 + (Math.random() - 0.5) * 60;
                        const ay = ctx.player.y - ctx.player.dashDirection.y * 40 + (Math.random() - 0.5) * 60;
                        sm.runtimeState._afterimages.push({ x: ax, y: ay, life: 0.4 + t, radius: p.radius, dmg: ctx.player.bulletDamage * p.dmgMul, field: p.field });
                    }
                });
                sm.registerHandler(SkillEffectType.PERIODIC, 'afterimage_blast', function(dt, ctx) {
                    const inst = sm.getSkill('afterimage_blast');
                    if (!inst) return;
                    const images = sm.runtimeState._afterimages || [];
                    for (let i = images.length - 1; i >= 0; i--) {
                        const im = images[i];
                        im.life -= dt;
                        if (im.life <= 0) {
                            for (const e of ctx.enemies) {
                                if (!e.active) continue;
                                if ((im.x - e.x) ** 2 + (im.y - e.y) ** 2 < im.radius * im.radius) {
                                    e.takeDamage(im.dmg);
                                }
                            }
                            sm.visuals.emit('shadow',im.x,im.y,{radius:im.radius});
                            images.splice(i, 1);
                        }
                    }
                });
            },
        },
        {
            id: 'quantum_dash',
            name: '量子穿梭',
            rarity: SkillRarity.RARE,
            category: SkillCategory.SHADOW,
            effectType: SkillEffectType.ON_DASH,
            description: '冲刺穿过敌人造成伤害',
            synergies: ['afterimage_blast', 'blink'],
            evolveCondition: { type: EvolutionCondition.KILL_COUNT, value: 30 },
            tiers: [
                { desc: '冲刺穿过敌人造成 150% 伤害 + 标记 5 秒（伤害 +30%）', params: { dmgMul: 1.5, markMul: 0.3, markDuration: 5 } },
                { desc: '伤害 250%，标记 +50%', params: { dmgMul: 2.5, markMul: 0.5, markDuration: 5 } },
            ],
            apply: function(player, sm, params, prevParams) {
                if (!sm.runtimeState._marked) sm.runtimeState._marked = {};
                sm.registerHandler(SkillEffectType.ON_DASH, 'quantum_dash', function(ctx) {
                    const inst = sm.getSkill('quantum_dash');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    const dashLen = 120;
                    for (const e of ctx.enemies || []) {
                        if (!e.active || sm.runtimeState._marked[e]) continue;
                        const d2 = (ctx.player.x - e.x) ** 2 + (ctx.player.y - e.y) ** 2;
                        if (d2 < dashLen * dashLen) {
                            e.takeDamage(ctx.player.bulletDamage * p.dmgMul);
                            sm.visuals.emit('shadow',e.x,e.y,{radius:28});
                            sm.runtimeState._marked[e] = p.markDuration;
                        }
                    }
                });
                sm.registerHandler(SkillEffectType.ON_HIT, 'quantum_mark', function(ctx) {
                    const inst = sm.getSkill('quantum_dash');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    const marked = sm.runtimeState._marked;
                    if (marked && marked[ctx.enemy]) {
                        ctx.bullet.damage *= (1 + p.markMul);
                    }
                });
                sm.registerHandler(SkillEffectType.PERIODIC, 'quantum_tick', function(dt) {
                    const marked = sm.runtimeState._marked;
                    if (!marked) return;
                    for (const key in marked) { marked[key] -= dt; if (marked[key] <= 0) delete marked[key]; }
                });
            },
        },
        {
            id: 'shadow_step',
            name: '暗影步',
            rarity: SkillRarity.EPIC,
            category: SkillCategory.SHADOW,
            effectType: SkillEffectType.STAT_MODIFIER,
            description: '冲刺 CD 降至 1 秒',
            synergies: ['void_walker', 'afterimage_blast'],
            evolveCondition: { type: EvolutionCondition.KILL_COUNT, value: 50 },
            tiers: [
                { desc: '冲刺冷却降为 1 秒，每次冲刺消耗 3% 当前生命，落点 200% 暗影冲击', params: { cd: 1, hpCost: 0.03, blastDmg: 2 } },
                { desc: '冲刺冷却 0.7 秒，消耗 2%，冲击 300%', params: { cd: 0.7, hpCost: 0.02, blastDmg: 3 } },
            ],
            apply: function(player, sm, params, prevParams) {
                player.dashCooldownMax = params.cd;
                sm.runtimeState._shadowStep = params;
                sm.registerHandler(SkillEffectType.ON_DASH, 'shadow_step_blast', function(ctx) {
                    const inst = sm.getSkill('shadow_step');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    ctx.player.hp = Math.max(1, ctx.player.hp - ctx.player.maxHp * p.hpCost);
                    for (const e of ctx.enemies || []) {
                        if (!e.active) continue;
                        if ((ctx.player.x - e.x) ** 2 + (ctx.player.y - e.y) ** 2 < 150 * 150) {
                            e.takeDamage(ctx.player.bulletDamage * p.blastDmg);
                        }
                    }
                    sm.visuals.emit('shadow',ctx.player.x,ctx.player.y,{radius:150});
                });
            },
        },
        {
            id: 'time_echo',
            name: '时间幻象',
            rarity: SkillRarity.LEGENDARY,
            category: SkillCategory.SHADOW,
            effectType: SkillEffectType.ON_DASH,
            description: '冲刺召唤反向分身',
            synergies: ['phantom_gunner', 'shadow_step'],
            evolveCondition: null,
            tiers: [
                { desc: '冲刺后分身沿路径反向攻击（继承 60% 伤害），持续 4 秒', params: { duration: 4, dmgMul: 0.6 } },
            ],
            apply: function(player, sm, params, prevParams) {
                _ensureBurnProcessor(sm);
                if (!sm.runtimeState._echoes) sm.runtimeState._echoes = [];
                sm.registerHandler(SkillEffectType.ON_DASH, 'time_echo', function(ctx) {
                    const inst = sm.getSkill('time_echo');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    sm.runtimeState._echoes.push({
                        x: ctx.player.x, y: ctx.player.y,
                        life: p.duration, dmgMul: p.dmgMul, fireTimer: 0
                    });
                });
                sm.registerHandler(SkillEffectType.PERIODIC, 'time_echo', function(dt, ctx) {
                    const inst = sm.getSkill('time_echo');
                    if (!inst) return;
                    const echoes = sm.runtimeState._echoes || [];
                    for (let i = echoes.length - 1; i >= 0; i--) {
                        const ec = echoes[i];
                        ec.life -= dt; if (ec.life <= 0) { echoes.splice(i, 1); continue; }
                        ec.fireTimer -= dt;
                        if (ec.fireTimer <= 0) {
                            ec.fireTimer = 0.5;
                            let nearest = null, nd = 400 * 400;
                            for (const e of ctx.enemies) {
                                if (!e.active) continue;
                                const d2 = (ec.x - e.x) ** 2 + (ec.y - e.y) ** 2;
                                if (d2 < nd) { nd = d2; nearest = e; }
                            }
                            if (nearest) {
                                ec.aimAngle=Math.atan2(nearest.y-ec.y,nearest.x-ec.x);
                                ctx.bulletManager.fire(ec.x, ec.y, Math.atan2(nearest.y - ec.y, nearest.x - ec.x), ctx.player.bulletDamage * ec.dmgMul, ctx.player.bulletSpeed, ctx.player.pierce, nearest);
                            }
                        }
                    }
                });
            },
        },
        {
            id: 'trap_rune',
            name: '残影陷阱',
            rarity: SkillRarity.COMMON,
            category: SkillCategory.SHADOW,
            effectType: SkillEffectType.ON_DASH,
            description: '冲刺留下爆炸陷阱',
            synergies: ['afterimage_blast', 'void_walker'],
            evolveCondition: { type: EvolutionCondition.KILL_COUNT, value: 30 },
            tiers: [
                { desc: '冲刺留下陷阱（6 秒，100% 伤害，120 范围）', params: { life: 6, dmgMul: 1, radius: 120 } },
                { desc: '陷阱持续 10 秒，150% 伤害', params: { life: 10, dmgMul: 1.5, radius: 120 } },
                { desc: '陷阱击杀敌人也留陷阱', params: { life: 10, dmgMul: 1.5, radius: 140, chain: true } },
            ],
            apply: function(player, sm, params, prevParams) {
                _ensureBurnProcessor(sm);
                if (!sm.runtimeState._traps) sm.runtimeState._traps = [];
                sm.registerHandler(SkillEffectType.ON_DASH, 'trap_rune', function(ctx) {
                    const inst = sm.getSkill('trap_rune');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    sm.runtimeState._traps.push({
                        x: ctx.player.x, y: ctx.player.y, life: p.life, dmgMul: p.dmgMul, radius: p.radius, chain: p.chain
                    });
                });
                sm.registerHandler(SkillEffectType.PERIODIC, 'trap_rune', function(dt, ctx) {
                    const inst = sm.getSkill('trap_rune');
                    if (!inst) return;
                    const traps = sm.runtimeState._traps || [];
                    for (let i = traps.length - 1; i >= 0; i--) {
                        const tr = traps[i];
                        tr.life -= dt; if (tr.life <= 0) { traps.splice(i, 1); continue; }
                        let triggered = false;
                        for (const e of ctx.enemies) {
                            if (!e.active) continue;
                            if ((tr.x - e.x) ** 2 + (tr.y - e.y) ** 2 < tr.radius * tr.radius) {
                                e.takeDamage(ctx.player.bulletDamage * tr.dmgMul);
                                triggered = true;
                                if (tr.chain) traps.push({ x: e.x, y: e.y, life: tr.life, dmgMul: tr.dmgMul, radius: tr.radius });
                                break;
                            }
                        }
                        if (triggered) {
                            sm.visuals.emit('shadow',tr.x,tr.y,{radius:tr.radius});
                            traps.splice(i, 1);
                        }
                    }
                });
            },
        },
        {
            id: 'blink',
            name: '闪现',
            rarity: SkillRarity.RARE,
            category: SkillCategory.SHADOW,
            effectType: SkillEffectType.ON_DASH,
            description: '闪现后必暴击',
            synergies: ['quantum_dash', 'phantom_gunner'],
            evolveCondition: { type: EvolutionCondition.KILL_COUNT, value: 30 },
            tiers: [
                { desc: '冲刺后 1 秒内下次攻击必暴击 + 暴击伤害 +100%', params: { duration: 1, critBonus: 1 } },
                { desc: '2 秒内必暴击 + 暴击伤害 +200%', params: { duration: 2, critBonus: 2 } },
            ],
            apply: function(player, sm, params, prevParams) {
                sm.registerHandler(SkillEffectType.ON_DASH, 'blink', function(ctx) {
                    const inst = sm.getSkill('blink');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    player._blinkCrit = { timer: p.duration, bonus: p.critBonus };
                    sm.visuals.emit('shadow',player.x,player.y,{radius:40});
                });
            },
        },
        {
            id: 'phantom_gunner',
            name: '幻影射手',
            rarity: SkillRarity.EPIC,
            category: SkillCategory.SHADOW,
            effectType: SkillEffectType.SUMMON,
            description: '周期召唤幻影射击',
            synergies: ['blink', 'time_echo'],
            evolveCondition: { type: EvolutionCondition.KILL_COUNT, value: 50 },
            tiers: [
                { desc: '每 5 秒召唤幻影（继承 50% 伤害，持续 3 秒）', params: { cooldown: 5, duration: 3, dmgMul: 0.5 } },
                { desc: '每 3 秒，伤害 70%，持续 4 秒', params: { cooldown: 3, duration: 4, dmgMul: 0.7 } },
            ],
            apply: function(player, sm, params, prevParams) {
                _ensureBurnProcessor(sm);
                if (!sm.runtimeState._phantoms2) sm.runtimeState._phantoms2 = [];
                sm.registerHandler(SkillEffectType.PERIODIC, 'phantom_gunner', function(dt, ctx) {
                    const inst = sm.getSkill('phantom_gunner');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    if (!sm.runtimeState._pgTimer) sm.runtimeState._pgTimer = 0;
                    sm.runtimeState._pgTimer -= dt;
                    if (sm.runtimeState._pgTimer <= 0) {
                        sm.runtimeState._pgTimer = p.cooldown;
                        sm.runtimeState._phantoms2.push({
                            x: ctx.player.x + (Math.random() - 0.5) * 100, y: ctx.player.y + (Math.random() - 0.5) * 100,
                            life: p.duration, dmgMul: p.dmgMul, fireTimer: 0
                        });
                    }
                    const p2 = sm.runtimeState._phantoms2;
                    for (let i = p2.length - 1; i >= 0; i--) {
                        const ph = p2[i];
                        ph.life -= dt; if (ph.life <= 0) { p2.splice(i, 1); continue; }
                        ph.fireTimer -= dt;
                        if (ph.fireTimer <= 0) {
                            ph.fireTimer = 0.4;
                            let nearest = null, nd = 350 * 350;
                            for (const e of ctx.enemies) {
                                if (!e.active) continue;
                                const d2 = (ph.x - e.x) ** 2 + (ph.y - e.y) ** 2;
                                if (d2 < nd) { nd = d2; nearest = e; }
                            }
                            if (nearest) {
                                ph.aimAngle=Math.atan2(nearest.y-ph.y,nearest.x-ph.x);
                                ctx.bulletManager.fire(ph.x, ph.y, Math.atan2(nearest.y - ph.y, nearest.x - ph.x), ctx.player.bulletDamage * ph.dmgMul, ctx.player.bulletSpeed, 0, nearest);
                            }
                        }
                    }
                });
            },
        },
        {
            id: 'void_walker',
            name: '虚空行走',
            rarity: SkillRarity.COMMON,
            category: SkillCategory.SHADOW,
            effectType: SkillEffectType.ON_DASH,
            description: 'Dash 叠加伤害层数',
            synergies: ['shadow_step', 'afterimage_blast'],
            evolveCondition: { type: EvolutionCondition.KILL_COUNT, value: 30 },
            tiers: [
                { desc: '每次冲刺叠 1 层虚空能量（上限 5），每层 +20% 伤害，攻击后清零', params: { maxStacks: 5, perStack: 0.2 } },
                { desc: '上限 8 层，每层 +25%', params: { maxStacks: 8, perStack: 0.25 } },
                { desc: '上限 10 层，每层 +30%，Dash 后自动发射满层攻击', params: { maxStacks: 10, perStack: 0.3, autoFire: true } },
            ],
            apply: function(player, sm, params, prevParams) {
                if (!sm.runtimeState._voidStacks) sm.runtimeState._voidStacks = 0;
                sm.runtimeState._voidStacks = 0;
                sm.registerHandler(SkillEffectType.ON_DASH, 'void_walker', function(ctx) {
                    const inst = sm.getSkill('void_walker');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    sm.runtimeState._voidStacks = Math.min(p.maxStacks, (sm.runtimeState._voidStacks || 0) + 1);
                    sm.visuals.emit('pickup',player.x,player.y,{radius:30,color:'#b6a3ce'});
                });
            },
        },

        // ==============================================================
    ];
}
if (typeof window !== 'undefined') { window.ShadowSkills = ShadowSkills; }
