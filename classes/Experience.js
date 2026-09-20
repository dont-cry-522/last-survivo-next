/**
 * ============================================================
 *  Experience.js - 经验球系统
 * ============================================================
 *  敌人死亡掉落经验球，玩家靠近自动吸取
 *  支持磁铁效果（升级后扩大吸取范围）
 *  使用对象池优化性能
 *  TODO: 可以加入不同品质的经验球（绿/蓝/紫/金）
 *  TODO: 可以加入金币独立掉落
 *  TODO: 可以加入吸引粒子特效
 * ============================================================
 */

class ExperienceOrb {
    constructor() {
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.exp = 5;
        this.gold = 0;
        this.size = 6;
        this.color = Config.COLORS.expOrb;
        this.glowColor = Config.COLORS.expGlow;

        // 被吸引状态
        this.isAttracting = false;
        this.attractSpeed = 8;

        // 掉落弹跳
        this.vx = 0;
        this.vy = 0;
        this.bounceDecay = 0.9;
        this.isBouncing = false;

        // 脉动动画
        this.pulseOffset = Math.random() * Math.PI * 2;
    }

    /**
     * 初始化经验球
     */
    init(x, y, exp, gold = 0) {
        this.active = true;
        this.x = x;
        this.y = y;
        this.exp = exp;
        this.gold = gold;
        this.isAttracting = false;
        this.isBouncing = true;

        // 随机弹跳方向
        const angle = Math.random() * Math.PI * 2;
        const speed = Utils.random(1, 3);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        // 根据经验值调整大小
        this.size = 5 + Math.min(exp / 10, 8);
    }

    /**
     * 更新
     */
    update(deltaTime, player, particleManager) {
        if (!this.active) return;

        // 弹跳衰减
        if (this.isBouncing) {
            this.vx *= this.bounceDecay;
            this.vy *= this.bounceDecay;
            this.x += this.vx;
            this.y += this.vy;

            if (Math.abs(this.vx) < 0.1 && Math.abs(this.vy) < 0.1) {
                this.isBouncing = false;
            }
        }

        // 磁铁检测
        const dist = Utils.distance(this.x, this.y, player.x, player.y);
        if (dist < (player.level===1?Math.max(140,player.magnetRange):player.magnetRange)) {
            this.isAttracting = true;
        }

        // 被吸引向玩家
        if (this.isAttracting) {
            const angle = Utils.angle(this.x, this.y, player.x, player.y);
            // 越近越快
            const speedMultiplier = Utils.clamp(1 + (player.magnetRange - dist) / player.magnetRange, 1, 3);
            this.x += Math.cos(angle) * this.attractSpeed * speedMultiplier * deltaTime * 60;
            this.y += Math.sin(angle) * this.attractSpeed * speedMultiplier * deltaTime * 60;

            // 吸引粒子轨迹
            if (Math.random() < 0.3) {
                particleManager.spawnExpPickup(this.x, this.y, this.color);
            }
        }

        // 被玩家拾取
        if (dist < player.size + this.size) {
            this.pickup(player);
            return true; // 标记需要移除
        }

        return false;
    }

    /**
     * 被拾取
     */
    pickup(player) {
        this.active = false;
        player.addExp(this.exp);
        if (this.gold > 0) {
            player.addGold(this.gold);
        }
        if (player.audio) player.audio.pickup();
    }

    /**
     * 绘制
     */
    draw(ctx, cameraX, cameraY) {
        if (!this.active) return;

        const screenX = this.x - cameraX;
        const screenY = this.y - cameraY;
        const pulse = 1 + Math.sin(Date.now() * 0.005 + this.pulseOffset) * 0.2;

        ctx.save();

        // 发光
        ctx.shadowBlur = 12;
        ctx.shadowColor = this.glowColor;

        // 外圈光晕
        ctx.fillStyle = this.glowColor;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size * pulse * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // 核心
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size * pulse, 0, Math.PI * 2);
        ctx.fill();

        // 高光
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(screenX - this.size * 0.3, screenY - this.size * 0.3, this.size * 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

/**
 * 经验球管理器
 */
class ExperienceManager extends ObjectPool {
    constructor(maxOrbs = 300) {
        super(() => new ExperienceOrb(), maxOrbs);
    }

    /**
     * 生成经验球
     */
    spawnOrb(x, y, exp, gold = 0) {
        const orb = this.acquire();
        if (orb) {
            orb.init(x, y, exp, gold);
        }
        return orb;
    }

    /**
     * 更新所有经验球
     * @returns {boolean} 是否有升级
     */
    update(deltaTime, player, particleManager) {
        let leveledUp = false;
        const prevLevel = player.level;
        for (let i = 0; i < this.pool.length; i++) {
            const orb = this.pool[i];
            if (!orb.active) continue;
            orb.update(deltaTime, player, particleManager);
        }
        if (player.level > prevLevel) {
            leveledUp = true;
        }
        return leveledUp;
    }

    draw(ctx, cameraX, cameraY) {
        for (let i = 0; i < this.pool.length; i++) {
            this.pool[i].draw(ctx, cameraX, cameraY);
        }
    }
}

if (typeof window !== 'undefined') {
    window.ExperienceOrb = ExperienceOrb;
    window.ExperienceManager = ExperienceManager;
}
