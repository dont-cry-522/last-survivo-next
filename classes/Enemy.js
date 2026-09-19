/**
 * ============================================================
 *  Enemy.js - 敌人系统
 * ============================================================
 *  四种敌人类型：普通、快速、坦克、自爆
 *  统一AI：追踪玩家移动
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
        const cfg = EnemyConfig.TYPES[type];
        if (!cfg) return;

        this.active = true;
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
    takeDamage(amount, bulletAngle = 0) {
        this.hp -= amount;
        this.hitFlash = EnemyConfig.HIT_FLASH_DURATION;

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
     * 仅处理：移动追踪 + 自爆接近标记
     */
    update(deltaTime, player) {
        if (!this.active) return;

        this.animTimer += this.frozen ? 0 : deltaTime;
        this.attackPose = Math.max(0, this.attackPose - deltaTime);

        if (this.hitFlash > 0) {
            this.hitFlash -= deltaTime;
        }

        if (this.contactCooldown > 0) {
            this.contactCooldown -= deltaTime;
        }

        if (Enemy._statusSystem) Enemy._statusSystem.update(this, deltaTime);

        this.knockbackX *= this.knockbackDecay;
        this.knockbackY *= this.knockbackDecay;

        const angle = Utils.angle(this.x, this.y, player.x, player.y);
        this.angle = angle;
        const speedMul = Enemy._statusSystem ? Enemy._statusSystem.getSpeedMultiplier(this) : 1;
        const moveX = Math.cos(angle) * this.speed * speedMul * deltaTime * 60;
        const moveY = Math.sin(angle) * this.speed * speedMul * deltaTime * 60;

        this.x += moveX + this.knockbackX;
        this.y += moveY + this.knockbackY;

        if (this.isExploder) {
            const dist = Utils.distance(this.x, this.y, player.x, player.y);
            if (dist < this.explodeTriggerDistance) {
                this._triggeredExplode = true;
                this.active = false;
            }
        }
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

    update(deltaTime, player, particleManager, experienceManager, audio) {
        this.updateDeathPoses(deltaTime);
        for (let i = 0; i < this.pool.length; i++) {
            const e = this.pool[i];
            if (!e.active) continue;

            e.update(deltaTime, player);

            if (!e.active) {
                this._handleDeath(e, player, particleManager, experienceManager, audio);
                continue;
            }

            if (e.hp <= 0) {
                this._handleDeath(e, player, particleManager, experienceManager, audio);
                continue;
            }

            if (!e.isExploder && e.contactCooldown <= 0 && Utils.circleCollision(e.x, e.y, e.size, player.x, player.y, player.size)) {
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
            angle:e.angle, animTimer:e.animTimer, hp:0, maxHp:e.maxHp, life:0.55});
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

        if (e.isExploder) {
            if (e._triggeredExplode) {
                particleManager.spawnExplosion(e.x, e.y, EnemyConfig.EXPLODE_PARTICLE_COLOR, EnemyConfig.EXPLODE_PROXIMITY_PARTICLE_COUNT);
            }
            particleManager.spawnExplosion(e.x, e.y, EnemyConfig.EXPLODE_PARTICLE_COLOR, EnemyConfig.EXPLODE_PARTICLE_COUNT);
            const dist = Utils.distance(e.x, e.y, player.x, player.y);
            if (dist < e.explodeRadius + player.size) {
                player.takeDamage(e.damage);
            }
        }

        if (audio) {
            if (e.isExploder) {
                audio.exploderExplode();
            } else if (e.type === 'tank' || e.type === 'elite') {
                audio.enemyDeadBig();
            } else {
                audio.enemyDead();
            }
        }

        e.die();
    }

    updateDeathPoses(dt) {
        for (let i = this.deathPoses.length - 1; i >= 0; i--) {
            this.deathPoses[i].life -= dt;
            if (this.deathPoses[i].life <= 0) this.deathPoses.splice(i, 1);
        }
    }

    clear() {
        super.clear();
        this.deathPoses.length = 0;
        this.drawOrder.length = 0;
    }

    draw(ctx, cameraX, cameraY, player = null, boss = null) {
        for (const pose of this.deathPoses) ForestArt.enemy(ctx, pose, cameraX, cameraY, 1 - pose.life / 0.55);
        this.drawOrder.length = 0;
        const w = ctx.canvas.width, h = ctx.canvas.height;
        for (const enemy of this.pool) {
            if (enemy.active && enemy.x > cameraX - 100 && enemy.x < cameraX + w + 100 &&
                enemy.y > cameraY - 100 && enemy.y < cameraY + h + 100) this.drawOrder.push(enemy);
        }
        if (player) this.drawOrder.push(player);
        if (boss && boss.active) this.drawOrder.push(boss);
        this.drawOrder.sort((a,b) => a.y - b.y);
        for (const actor of this.drawOrder) actor.draw(ctx, cameraX, cameraY);
    }
}

if (typeof window !== 'undefined') {
    window.Enemy = Enemy;
    window.EnemyManager = EnemyManager;
}
