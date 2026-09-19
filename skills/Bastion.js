/** Bastion Skills */
class BastionSkills {
    static POOL = [
        //  钢铁壁垒 Bastion
        // ==============================================================

        {
            id: 'reinforced_shield',
            name: '强化护盾',
            rarity: SkillRarity.COMMON,
            category: SkillCategory.BASTION,
            effectType: SkillEffectType.STAT_MODIFIER,
            description: '护盾吸收伤害 + 自动回复',
            synergies: ['thorns', 'sanctuary'],
            evolveCondition: { type: EvolutionCondition.SURVIVAL_TIME, value: 120 },
            tiers: [
                { desc: '获得 80 点护盾，护盾存在时每秒回复 3 点', params: { shield: 80, regen: 3 } },
                { desc: '120 护盾，回复 5/秒', params: { shield: 120, regen: 5 } },
                { desc: '180 护盾，回复 8/秒，护盾存在时攻击 +15%', params: { shield: 180, regen: 8, atkBonus: 0.15 } },
            ],
            apply: function(player, sm, params, prevParams) {
                if (prevParams) player.shield = Math.max(0, player.shield - prevParams.shield);
                player.shield += params.shield;
                sm.runtimeState._shieldRegen = params.regen;
                sm.runtimeState._shieldMax = player.shield;
                if (params.atkBonus) { player.attackSpeed *= (1 + params.atkBonus) / (1 + (prevParams?.atkBonus || 0)); }
            },
        },
        {
            id: 'thorns',
            name: '荆棘之甲',
            rarity: SkillRarity.RARE,
            category: SkillCategory.BASTION,
            effectType: SkillEffectType.ON_DAMAGED,
            description: '受伤反弹伤害',
            synergies: ['reinforced_shield', 'holy_aura'],
            evolveCondition: { type: EvolutionCondition.SURVIVAL_TIME, value: 180 },
            tiers: [
                { desc: '受到近战伤害时反弹 200% 给攻击者', params: { reflectMul: 2.0 } },
                { desc: '反弹 400%，范围伤害 150', params: { reflectMul: 4.0, radius: 150 } },
            ],
            apply: function(player, sm, params, prevParams) {
                sm.registerHandler(SkillEffectType.ON_DAMAGED, 'thorns', function(ctx) {
                    const inst = sm.getSkill('thorns');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    for (const e of ctx.enemies) {
                        if (!e.active) continue;
                        const d2 = (ctx.player.x - e.x) ** 2 + (ctx.player.y - e.y) ** 2;
                        if (d2 < (p.radius || 60) * (p.radius || 60)) {
                            e.takeDamage(ctx.amount * p.reflectMul);
                            sm.visuals.emit('shadow',e.x,e.y,{sound:'bastion',radius:30,color:'#b6ce9c'});
                        }
                    }
                });
            },
        },
        {
            id: 'sanctuary',
            name: '庇护所',
            rarity: SkillRarity.COMMON,
            category: SkillCategory.BASTION,
            effectType: SkillEffectType.STAT_MODIFIER,
            description: '站桩减伤回血',
            synergies: ['reinforced_shield', 'counter_stance'],
            evolveCondition: { type: EvolutionCondition.SURVIVAL_TIME, value: 120 },
            tiers: [
                { desc: '原地站立 1.5 秒后伤害减免 30%，移动后衰减', params: { reduction: 0.3, standTime: 1.5 } },
                { desc: '减免 50%，站立 0.8 秒', params: { reduction: 0.5, standTime: 0.8 } },
                { desc: '减免 65%，站立时每秒回复 2% 最大生命', params: { reduction: 0.65, standTime: 0.8, healPct: 0.02 } },
            ],
            apply: function(player, sm, params, prevParams) {
                _ensureBurnProcessor(sm);
                if (!sm.runtimeState._sanctuary) sm.runtimeState._sanctuary = { standTimer: 0, active: false };
                sm.runtimeState._sanctuary.active = false;
                sm.runtimeState._sanctuary.standTimer = 0;
                sm.registerHandler(SkillEffectType.PERIODIC, 'sanctuary', function(dt, ctx) {
                    const inst = sm.getSkill('sanctuary');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    if (!sm.runtimeState._sanctuary) sm.runtimeState._sanctuary = { standTimer: 0, active: false };
                    const s = sm.runtimeState._sanctuary;
                    const moving = ctx.player.moving;
                    if (moving) { s.standTimer = 0; s.active = false; }
                    else { s.standTimer += dt; }
                    s.active = s.standTimer >= p.standTime;
                    if (s.active && p.healPct) {
                        ctx.player.hp = Math.min(ctx.player.maxHp, ctx.player.hp + ctx.player.maxHp * p.healPct * dt);
                    }
                });
            },
        },
        {
            id: 'reflect_shield',
            name: '反弹护盾',
            rarity: SkillRarity.EPIC,
            category: SkillCategory.BASTION,
            effectType: SkillEffectType.PERIODIC,
            description: '周期性无敌反弹',
            synergies: ['reinforced_shield', 'thorns'],
            evolveCondition: { type: EvolutionCondition.BOSS_KILLED, value: 1 },
            tiers: [
                { desc: '每 15 秒获得 2 秒无敌，期间全额反弹伤害', params: { cooldown: 15, duration: 2 } },
                { desc: '每 10 秒，持续 3 秒 + 反弹 300%', params: { cooldown: 10, duration: 3, reflectMul: 3 } },
            ],
            apply: function(player, sm, params, prevParams) {
                _ensureBurnProcessor(sm);
                if (!sm.runtimeState._reflectShield) sm.runtimeState._reflectShield = { timer: 0, active: false, activeTimer: 0 };
                sm.registerHandler(SkillEffectType.PERIODIC, 'reflect_shield', function(dt) {
                    const inst = sm.getSkill('reflect_shield');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    const rs = sm.runtimeState._reflectShield;
                    if (rs.active) { rs.activeTimer -= dt; if (rs.activeTimer <= 0) rs.active = false; return; }
                    rs.timer -= dt;
                    if (rs.timer <= 0) { rs.active = true; rs.activeTimer = p.duration; rs.timer = p.cooldown; }
                });
            },
        },
        {
            id: 'unbreakable',
            name: '不坏金身',
            rarity: SkillRarity.LEGENDARY,
            category: SkillCategory.BASTION,
            effectType: SkillEffectType.ON_DAMAGED,
            description: '大伤害上限',
            synergies: ['reinforced_shield', 'holy_aura'],
            evolveCondition: null,
            tiers: [
                { desc: '受到超过 30% 最大生命伤害时，降至 30%，冷却 15 秒', params: { threshold: 0.3, cap: 0.3, cooldown: 15 } },
            ],
            apply: function(player, sm, params, prevParams) {
                if (!sm.runtimeState._unbreakable) sm.runtimeState._unbreakable = { onCd: false, timer: 0 };
                sm.registerHandler(SkillEffectType.ON_DAMAGED, 'unbreakable', function(ctx) {
                    const inst = sm.getSkill('unbreakable');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    const ub = sm.runtimeState._unbreakable;
                    if (ub.onCd) { ub.timer -= 0.016; if (ub.timer <= 0) ub.onCd = false; return; }
                    if (ctx.amount > ctx.player.maxHp * p.threshold) {
                        const capped = ctx.player.maxHp * p.cap;
                        ctx.player.hp = Math.max(1, ctx.player.hp + ctx.amount - capped);
                        ub.onCd = true; ub.timer = p.cooldown;
                        sm.visuals.emit('pickup',ctx.player.x,ctx.player.y,{sound:'bastion',radius:48,color:'#e0d49a'});
                    }
                });
            },
        },
        {
            id: 'life_leech',
            name: '生命汲取',
            rarity: SkillRarity.COMMON,
            category: SkillCategory.BASTION,
            effectType: SkillEffectType.ON_KILL,
            description: '击杀回复生命',
            synergies: ['thorns', 'holy_aura'],
            evolveCondition: { type: EvolutionCondition.KILL_COUNT, value: 50 },
            tiers: [
                { desc: '击杀回复 3 点生命', params: { heal: 3 } },
                { desc: '击杀回复 5 点', params: { heal: 5 } },
                { desc: '击杀回复 8 点，精英回复 30 点', params: { heal: 8, eliteHeal: 30 } },
            ],
            apply: function(player, sm, params, prevParams) {
                sm.registerHandler(SkillEffectType.ON_KILL, 'life_leech', function(ctx) {
                    const inst = sm.getSkill('life_leech');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    ctx.player.hp = Math.min(ctx.player.maxHp, ctx.player.hp + p.heal);
                    sm.visuals.emit('heal',ctx.player.x,ctx.player.y,{radius:28});
                });
            },
        },
        {
            id: 'counter_stance',
            name: '反击姿态',
            rarity: SkillRarity.EPIC,
            category: SkillCategory.BASTION,
            effectType: SkillEffectType.ON_DASH,
            description: '冲刺留嘲讽幻象 + 冲击波',
            synergies: ['sanctuary', 'reflect_shield'],
            evolveCondition: { type: EvolutionCondition.KILL_COUNT, value: 40 },
            tiers: [
                { desc: '冲刺留下嘲讽幻象（持续 2 秒，150 范围），结束时冲击波 200% 伤害', params: { duration: 2, radius: 150, dmgMul: 2 } },
                { desc: '幻象 4 秒，范围 200，冲击波 350%', params: { duration: 4, radius: 200, dmgMul: 3.5 } },
            ],
            apply: function(player, sm, params, prevParams) {
                _ensureBurnProcessor(sm);
                if (!sm.runtimeState._phantoms) sm.runtimeState._phantoms = [];
                sm.registerHandler(SkillEffectType.ON_DASH, 'counter_stance', function(ctx) {
                    const inst = sm.getSkill('counter_stance');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    sm.runtimeState._phantoms.push({
                        x: ctx.player.x, y: ctx.player.y, life: p.duration,
                    });
                    sm.visuals.emit('pickup',ctx.player.x,ctx.player.y,{sound:'bastion',radius:35,color:'#b4cfa5'});
                });
                sm.registerHandler(SkillEffectType.PERIODIC, 'counter_stance', function(dt, ctx) {
                    const inst = sm.getSkill('counter_stance');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    const phantoms = sm.runtimeState._phantoms;
                    for (let i = phantoms.length - 1; i >= 0; i--) {
                        const ph = phantoms[i];
                        ph.life -= dt;
                        if (ph.life <= 0) {
                            for (const e of ctx.enemies) {
                                if (!e.active) continue;
                                if ((ph.x - e.x) ** 2 + (ph.y - e.y) ** 2 < p.radius * p.radius) {
                                    e.takeDamage(ctx.player.bulletDamage * p.dmgMul);
                                }
                            }
                            sm.visuals.emit('shadow',ph.x,ph.y,{sound:'bastion',radius:p.radius,color:'#b4cfa5'});
                            phantoms.splice(i, 1);
                        }
                    }
                });
            },
        },
        {
            id: 'holy_aura',
            name: '神圣光环',
            rarity: SkillRarity.RARE,
            category: SkillCategory.BASTION,
            effectType: SkillEffectType.PERIODIC,
            description: '周期性回血 + 伤害波',
            synergies: ['life_leech', 'thorns'],
            evolveCondition: { type: EvolutionCondition.SURVIVAL_TIME, value: 180 },
            tiers: [
                { desc: '每 25 秒回复 25% 已损失生命', params: { cooldown: 25, healPct: 0.25 } },
                { desc: '每 18 秒，回复 35% + 冲击波（180 范围 150% 伤害）', params: { cooldown: 18, healPct: 0.35, waveDmg: 1.5, waveRadius: 180 } },
            ],
            apply: function(player, sm, params, prevParams) {
                _ensureBurnProcessor(sm);
                if (!sm.runtimeState._holyAura) sm.runtimeState._holyAura = { timer: 0 };
                sm.registerHandler(SkillEffectType.PERIODIC, 'holy_aura', function(dt, ctx) {
                    const inst = sm.getSkill('holy_aura');
                    if (!inst) return;
                    const p = inst.getCurrentEffect().params;
                    const ha = sm.runtimeState._holyAura;
                    ha.timer -= dt;
                    if (ha.timer > 0) return;
                    ha.timer = p.cooldown;
                    const lost = ctx.player.maxHp - ctx.player.hp;
                    ctx.player.hp = Math.min(ctx.player.maxHp, ctx.player.hp + lost * p.healPct);
                    sm.visuals.emit('heal',ctx.player.x,ctx.player.y,{radius:45});
                    if (p.waveDmg) {
                        for (const e of ctx.enemies) {
                            if (!e.active) continue;
                            if ((ctx.player.x - e.x) ** 2 + (ctx.player.y - e.y) ** 2 < p.waveRadius * p.waveRadius) {
                                e.takeDamage(ctx.player.bulletDamage * p.waveDmg);
                            }
                        }
                        sm.visuals.emit('pickup',ctx.player.x,ctx.player.y,{sound:'bastion',radius:p.waveRadius,color:'#b4cfa5'});
                    }
                });
            },
        },

        // ==============================================================
    ];
}
if (typeof window !== 'undefined') { window.BastionSkills = BastionSkills; }
