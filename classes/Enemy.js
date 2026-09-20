/**
 * ============================================================
 *  Enemy.js - 敌人系统
 * ============================================================
 *  五种敌人均使用预警和独立出招；自爆怪引爆后退出
 *  Enemy 实体是纯数据+行为，不直接调用任何外部系统。
 *  所有跨系统效果（粒子/音效/经验/伤害）由 EnemyManager 统一处理。
 * ============================================================
 */

class Enemy {
    constructor() {
        this.active = false;
        this.type = 'normal';
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.maxHp = 30;
        this.hp = 30;
        this.speed = 1.5;
        this.damage = 10;
        this.size = 15;
        this.exp = 5;
        this.gold = 1;
        this.color = '#ff6b6b';
        this.glowColor = 'rgba(255, 107, 107, 0.5)';

        this.explodeRadius = 0;
        this.isExploder = false;
        this.explodeTriggerDistance = EnemyConfig.EXPLODE_TRIGGER_DISTANCE;
        this._triggeredExplode = false;

        this.hitFlash = 0;
        this.impactTimer=0;this.impactStrength=0;
        this.hurtAngle = 0;

        this.knockbackX = 0;
        this.knockbackY = 0;
        this.knockbackDecay = EnemyConfig.KNOCKBACK_DECAY;

        this.contactCooldown = 0;
        this.attackPose = 0;

        this.hpMultiplier = 1;
        this.speedMultiplier = 1;

        this.animTimer = Math.random() * Math.PI * 2;
        this.angle = 0;
    }

    /**
     * 初始化敌人
     */
    init(type, x, y, hpMultiplier = 1, speedMultiplier = 1) {
        this.ruinGuard=null;this._forestDetour=null;this.terrainAware=false;
        const cfg = EnemyConfig.TYPES[type];
        if (!cfg) return;

        this.active = true;
        if (Enemy._statusSystem) Enemy._statusSystem.reset(this);
        this.combatState = 'approach';
        this.combatTimer = 0;
        this.attackHasHit = false;
        this.attackStartX = this.attackX = x;
        this.attackStartY = this.attackY = y;
        this.attackAngle = 0;
        this.strikeThisFrame = false;
        this.attackCue = null;
        this.type = type;
        this.x = x;
        this.y = y;
        this.maxHp = cfg.hp * hpMultiplier;
        this.hp = this.maxHp;
        this.speed = cfg.speed * speedMultiplier;
        this.damage = cfg.damage;
        this.size = cfg.size;
        this.exp = cfg.exp;
        this.gold = cfg.gold;
        this.color = cfg.color;
        this.glowColor = cfg.glowColor;
        this.hitFlash = 0;
        this.impactTimer=0;this.impactStrength=0;
        this.hurtAngle = 0;
        this.knockbackX = 0;
        this.knockbackY = 0;
        this._triggeredExplode = false;
        this.contactCooldown = 0;
        this.attackPose = 0;

        this.hpMultiplier = hpMultiplier;
        this.speedMultiplier = speedMultiplier;

        if (type === 'exploder') {
            this.isExploder = true;
            this.explodeRadius = cfg.explodeRadius;
            this.explodeTriggerDistance = EnemyConfig.EXPLODE_TRIGGER_DISTANCE;
        } else {
            this.isExploder = false;
            this.explodeRadius = 0;
        }
    }

    /**
     * 受到伤害（纯数据变更，不产生外部效果）
     * @returns {boolean} 是否死亡
     */
    takeDamage(amount, bulletAngle = 0, showImpact = true) {
        this.hp -= amount;
        if(showImpact) {
            this.hitFlash = EnemyConfig.HIT_FLASH_DURATION;
            this.hurtAngle = bulletAngle;
            this.impactTimer=.18;this.impactStrength=Math.min(1.6,.45+amount/Math.max(1,this.maxHp)*4);
        }

        const knockbackForce = amount * EnemyConfig.KNOCKBACK_FORCE_COEFFICIENT;
        this.knockbackX += Math.cos(bulletAngle) * knockbackForce;
        this.knockbackY += Math.sin(bulletAngle) * knockbackForce;

        if (this.hp <= 0) {
            this.hp = 0;
            return true;
        }
        return false;
    }

    /**
     * 死亡（纯状态变更，外部效果由 EnemyManager 处理）
     */
    die() {
        this.active = false;
    }

    /**
     * 更新移动AI（不调用任何外部系统）
     * 处理追踪、锁定预警和出招时序
     */
    update(deltaTime, player, terrainTime = null) {
        this.terrainAware=terrainTime!==null;
        this.strikeThisFrame = false;
        this.attackCue = null;
        if (!this.active || this.hp <= 0) return;
        this.hitFlash = Math.max(0, this.hitFlash - deltaTime);
        this.impactTimer=Math.max(0,this.impactTimer-deltaTime);
        this.attackPose = Math.max(0, this.attackPose - deltaTime);
        this.contactCooldown = Math.max(0, this.contactCooldown - deltaTime);
        if (Enemy._statusSystem) Enemy._statusSystem.update(this, deltaTime);
        const speedMul = Enemy._statusSystem ? Enemy._statusSystem.getSpeedMultiplier(this) : 1;
        if (speedMul <= 0) return;
        const terrainSpeed=terrainTime===null?1:(WoodlandScene.surfaceAt(this.x,this.y,terrainTime)?.speed ?? 1);
        this.animTimer += deltaTime * speedMul * (this.combatState==='approach'?terrainSpeed:1);
        const decay = Math.pow(this.knockbackDecay, deltaTime * 60);
        this.knockbackX *= decay;
        this.knockbackY *= decay;
        const attack = EnemyConfig.ATTACKS[this.type];
        if (attack && this.combatState !== 'approach') {
            const startX=this.x,startY=this.y;
            this.advanceAttack(deltaTime * speedMul, attack);
            if(terrainTime!==null)ForestMap.resolve(this,startX,startY);
            return;
        }
        this.angle = Utils.angle(this.x, this.y, player.x, player.y);
        if (attack && Utils.distanceSq(this.x,this.y,player.x,player.y) <= attack.trigger ** 2 && (!this.terrainAware||ForestMap.firstHit(this.x,this.y,player.x,player.y)===null)) {
            this.combatState = 'windup';
            this.combatTimer = attack.windup;
            this.attackHasHit = false;
            this.attackAngle = this.angle;
            this.attackStartX = this.x;
            this.attackStartY = this.y;
            this.attackX = this.x + Math.cos(this.angle) * attack.distance;
            this.attackY = this.y + Math.sin(this.angle) * attack.distance;
            this.attackCue = 'windup';
            return;
        }
        if(terrainTime!==null)this.angle=ForestMap.steer(this,player);
        const startX=this.x,startY=this.y;
        this.x += (Math.cos(this.angle) * this.speed * speedMul * terrainSpeed + this.knockbackX) * deltaTime * 60;
        this.y += (Math.sin(this.angle) * this.speed * speedMul * terrainSpeed + this.knockbackY) * deltaTime * 60;
        if(terrainTime!==null)ForestMap.resolve(this,startX,startY);
    }

    advanceAttack(dt, attack) {
        // Carry time across phase boundaries, including the last active strike frame.
        let remaining = dt;
        this.attackFromX = this.x;
        this.attackFromY = this.y;
        while (remaining > 1e-8 && this.combatState !== 'approach') {
            const step = Math.min(remaining, this.combatTimer);
            this.combatTimer -= step;
            remaining -= step;
            if (this.combatState === 'strike') {
                this.strikeThisFrame = true;
                this.attackPose = 0.24;
                if (this.type !== 'tank') {
                    const progress = 1 - this.combatTimer / attack.strike;
                    this.x = this.attackStartX + Math.cos(this.attackAngle) * attack.distance * progress;
                    this.y = this.attackStartY + Math.sin(this.attackAngle) * attack.distance * progress;
                }
            }
            if (this.combatTimer > 1e-8) break;
            if (this.combatState === 'windup') {
                this.combatState = 'strike'; this.combatTimer = attack.strike;
                this.attackCue = 'strike';
                if (this.isExploder) {
                    this._triggeredExplode = true;
                    this.active = false;
                    return;
                }
            } else if (this.combatState === 'strike') {
                this.combatState = 'recover'; this.combatTimer = attack.recover;
            } else {
                this.combatState = 'approach'; this.combatTimer = 0;
            }
        }
    }

    attackTouches(player) {
        if(this.terrainAware&&ForestMap.firstHit(this.x,this.y,player.x,player.y)!==null)return false;
        if (!this.strikeThisFrame || this.attackHasHit || this.hp <= 0 || this.frozen || this.paralyzed) return false;
        const attack = EnemyConfig.ATTACKS[this.type];
        if (!attack) return false;
        if (this.type === 'tank') return Utils.circleCollision(this.attackX,this.attackY,attack.radius,player.x,player.y,player.size);
        if (this.type === 'elite') {
            // Circle against a closed sector, including its two radial edges.
            const dx=player.x-this.attackStartX, dy=player.y-this.attackStartY;
            const distance=Math.hypot(dx,dy);
            const relative=Math.atan2(Math.sin(Math.atan2(dy,dx)-this.attackAngle),Math.cos(Math.atan2(dy,dx)-this.attackAngle));
            if (Math.abs(relative)<=attack.halfArc) return distance<=attack.radius+player.size;
            const edge=this.attackAngle+Math.sign(relative)*attack.halfArc;
            const projection=Math.max(0,Math.min(attack.radius,dx*Math.cos(edge)+dy*Math.sin(edge)));
            return Math.hypot(dx-Math.cos(edge)*projection,dy-Math.sin(edge)*projection)<=player.size;
        }
        // Swept circle: a fast lunge must not jump over the player at low frame rates.
        const dx = this.x - this.attackFromX, dy = this.y - this.attackFromY;
        const lengthSq = dx*dx + dy*dy;
        const t = lengthSq ? Math.max(0,Math.min(1,((player.x-this.attackFromX)*dx+(player.y-this.attackFromY)*dy)/lengthSq)) : 0;
        return Utils.circleCollision(this.attackFromX+dx*t,this.attackFromY+dy*t,attack.radius,player.x,player.y,player.size);
    }

    /**
     * 绘制敌人
     */
    draw(ctx, cameraX, cameraY) {
        if (this.active) ForestArt.enemy(ctx, this, cameraX, cameraY);
    }
}

// StatusSystem 委托 getter/setter（向后兼容技能直接读写）
Object.defineProperties(Enemy.prototype, {
    burnStacks: {
        get() { return Enemy._statusSystem ? Enemy._statusSystem.burnStacks(this) : 0; },
        set(v) { if (Enemy._statusSystem) Enemy._statusSystem.setBurnStacks(this, v); }
    },
    burnTimer: {
        get() { return Enemy._statusSystem ? Enemy._statusSystem.burnTimer(this) : 0; },
        set(v) { if (Enemy._statusSystem) Enemy._statusSystem.setBurnTimer(this, v); }
    },
    burnDmgPerStack: {
        get() { return Enemy._statusSystem ? Enemy._statusSystem.burnDmgPerStack(this) : 0; },
        set(v) { if (Enemy._statusSystem) Enemy._statusSystem.setBurnDmgPerStack(this, v); }
    },
    slowAmount: {
        get() { return Enemy._statusSystem ? Enemy._statusSystem.slowAmount(this) : 0; },
        set(v) { if (Enemy._statusSystem) Enemy._statusSystem.setSlowAmount(this, v); }
    },
    frozen: {
        get() { return Enemy._statusSystem ? Enemy._statusSystem.frozen(this) : false; },
        set(v) { if (Enemy._statusSystem) Enemy._statusSystem.setFrozen(this, v); }
    },
    frozenTimer: {
        get() { return Enemy._statusSystem ? Enemy._statusSystem.frozenTimer(this) : 0; },
        set(v) { if (Enemy._statusSystem) Enemy._statusSystem.setFrozenTimer(this, v); }
    },
    paralyzed: {
        get() { return Enemy._statusSystem ? Enemy._statusSystem.paralyzed(this) : false; },
        set(v) { if (Enemy._statusSystem) Enemy._statusSystem.setParalyzed(this, v); }
    },
    paralyzeTimer: {
        get() { return Enemy._statusSystem ? Enemy._statusSystem.paralyzeTimer(this) : 0; },
        set(v) { if (Enemy._statusSystem) Enemy._statusSystem.setParalyzeTimer(this, v); }
    },
});

Enemy._statusSystem = null;

/**
 * 敌人管理器
 * 所有跨系统效果（粒子/经验/音效/伤害）在此集中处理，
 * 而非分散在 Enemy 实体中。未来迁移到 EventBus 监听模式。
 */
class EnemyManager extends ObjectPool {
    constructor(maxEnemies = 500) {
        super(() => new Enemy(), maxEnemies);
        this.events = null;
        this.deathPoses = [];
        this.drawOrder = [];
        this.impactMarks = [];
    }

    /**
     * 生成敌人
     */
    spawn(type, x, y, hpMultiplier = 1, speedMultiplier = 1) {
        const enemy = this.acquire();
        if (enemy) {
            enemy.init(type, x, y, hpMultiplier, speedMultiplier);
        }
        return enemy;
    }

    /**
     * 获取所有活跃敌人数组
     */
    getActiveEnemies() {
        const result = [];
        for (let i = 0; i < this.pool.length; i++) {
            if (this.pool[i].active) {
                result.push(this.pool[i]);
            }
        }
        return result;
    }

    update(deltaTime, player, particleManager, experienceManager, audio, terrainTime = null) {
        this.updateDeathPoses(deltaTime);
        for (let i = 0; i < this.pool.length; i++) {
            const e = this.pool[i];
            if (!e.active) continue;

            if (e.hp <= 0) {
                this._handleDeath(e, player, particleManager, experienceManager, audio);
                continue;
            }
            e.update(deltaTime, player, terrainTime);

            if (!e.active) {
                this._handleDeath(e, player, particleManager, experienceManager, audio);
                continue;
            }

            if (e.hp <= 0) {
                this._handleDeath(e, player, particleManager, experienceManager, audio);
                continue;
            }

            if (EnemyConfig.ATTACKS[e.type]) {
                if (e.attackCue && audio && Utils.distanceSq(e.x,e.y,player.x,player.y)<650*650) audio.enemyAttackCue(e.type,e.attackCue);
                if (e.attackCue === 'strike' && e.type === 'tank') {
                    this.addImpact(e.attackX,e.attackY,'slam',0,EnemyConfig.ATTACKS.tank.radius);
                    particleManager.spawnExplosion(e.attackX,e.attackY,'#c5ad7a',8);
                }
                if (e.attackCue === 'strike' && e.type === 'elite') {
                    this.addImpact(e.attackStartX,e.attackStartY,'sweep',e.attackAngle,EnemyConfig.ATTACKS.elite.radius);
                }
                if (e.attackTouches(player)) {
                    e.attackHasHit = true;
                    player.takeDamage(e.damage);
                }
                continue;
            }
            if (!e.isExploder && !e.frozen && !e.paralyzed && e.contactCooldown <= 0 && Utils.circleCollision(e.x, e.y, e.size, player.x, player.y, player.size)) {
                player.takeDamage(e.damage);
                e.attackPose = 0.24;
                e.contactCooldown = EnemyConfig.CONTACT_DAMAGE_COOLDOWN;
            }
        }
    }

    /**
     * 统一处理敌人死亡效果
     */
    _handleDeath(e, player, particleManager, experienceManager, audio) {
        // Snapshot values: pooled enemies can respawn before this pose fades.
        if (this.deathPoses.length >= 48) this.deathPoses.shift();
        this.deathPoses.push({x:e.x, y:e.y, type:e.type, size:e.size,
            angle:e.angle, hurtAngle:e.hurtAngle, detonated:e._triggeredExplode,
            animTimer:e.animTimer, hp:0, maxHp:e.maxHp, life:0.55});
        if (this.events) {
            this.events.emit('enemy:dead', {
                x: e.x, y: e.y,
                color: e.color,
                isExploder: e.isExploder,
                type: e.type,
                exp: e.exp, gold: e.gold,
                proximityExplode: e._triggeredExplode,
            });
        }

        particleManager.spawnExplosion(e.x, e.y, e.color, EnemyConfig.DEATH_PARTICLE_COUNT);
        experienceManager.spawnOrb(e.x, e.y, e.exp, e.gold);
        player.addKill(e.type === 'elite');

        if (e.isExploder && e._triggeredExplode) {
            this.addImpact(e.x,e.y,'burst',0,e.explodeRadius);
            particleManager.spawnExplosion(e.x, e.y, EnemyConfig.EXPLODE_PARTICLE_COLOR, EnemyConfig.EXPLODE_PROXIMITY_PARTICLE_COUNT);
            particleManager.spawnExplosion(e.x, e.y, EnemyConfig.EXPLODE_PARTICLE_COLOR, EnemyConfig.EXPLODE_PARTICLE_COUNT);
            const dist = Utils.distance(e.x, e.y, player.x, player.y);
            if (dist < e.explodeRadius + player.size) {
                player.takeDamage(e.damage);
            }
        }

        if (audio) {
            if (e.isExploder && e._triggeredExplode) {
                audio.exploderExplode();
            } else if (e.type === 'tank' || e.type === 'elite') {
                audio.enemyDeadBig();
            } else {
                audio.enemyDead();
            }
        }

        e.die();
    }

    addImpact(x,y,kind,angle=0,radius=0) {
        if (this.impactMarks.length >= 64) this.impactMarks.shift();
        const duration = ['rifle-hit','armor-hit','ember-hit'].includes(kind) ? .18 : kind==='shotgun-hit' ? .25 : kind === 'burst' ? 0.5 : kind === 'sweep' ? 0.28 : kind === 'slam' ? 0.42 : kind === 'crit' ? 0.23 : 0.12;
        this.impactMarks.push({x,y,kind,angle,radius,life:duration,duration});
    }

    updateDeathPoses(dt) {
        for (let i=this.impactMarks.length-1;i>=0;i--) {
            this.impactMarks[i].life-=dt;
            if(this.impactMarks[i].life<=0) this.impactMarks.splice(i,1);
        }
        for (let i = this.deathPoses.length - 1; i >= 0; i--) {
            this.deathPoses[i].life -= dt;
            if (this.deathPoses[i].life <= 0) this.deathPoses.splice(i, 1);
        }
    }

    clear() {
        super.clear();
        this.deathPoses.length = 0;
        this.impactMarks.length = 0;
        this.drawOrder.length = 0;
    }

    draw(ctx, cameraX, cameraY, player = null, boss = null) {
        for (const pose of this.deathPoses) ForestArt.enemy(ctx, pose, cameraX, cameraY, 1 - pose.life / 0.55);
        this.drawOrder.length = 0;
        const w = ctx.canvas.width, h = ctx.canvas.height;
        for (const enemy of this.pool) {
            const cfg=EnemyConfig.ATTACKS[enemy.type];
            const margin=enemy.combatState==='windup' && cfg ? Math.max(100,cfg.distance+cfg.radius) : 100;
            if (enemy.active && enemy.x > cameraX - margin && enemy.x < cameraX + w + margin &&
                enemy.y > cameraY - margin && enemy.y < cameraY + h + margin) this.drawOrder.push(enemy);
        }
        if (player) this.drawOrder.push(player);
        if (boss && boss.active) this.drawOrder.push(boss);
        for (const actor of this.drawOrder) if (EnemyConfig.ATTACKS[actor.type]) ForestArt.telegraph(ctx,actor,cameraX,cameraY);
        for (const mark of this.impactMarks) if(mark.kind==='slam') ForestArt.impact(ctx,mark,cameraX,cameraY);
        this.drawOrder.sort((a,b) => a.y - b.y);
        for (const actor of this.drawOrder) actor.draw(ctx, cameraX, cameraY);
        for (const mark of this.impactMarks) if(mark.kind!=='slam') ForestArt.impact(ctx,mark,cameraX,cameraY);
    }
}

if (typeof window !== 'undefined') {
    window.Enemy = Enemy;
    window.EnemyManager = EnemyManager;
}
