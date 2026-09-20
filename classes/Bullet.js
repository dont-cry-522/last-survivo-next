/**
 * ============================================================
 *  Bullet.js - 子弹系统
 * ============================================================
 *  自动追踪最近敌人的能量子弹
 *  支持穿透、暴击、多发射击
 *  使用对象池避免频繁创建销毁
 *  TODO: 可以加入不同子弹类型（激光、散弹、导弹等）
 *  TODO: 可以加入子弹弹跳、分裂等特殊效果
 * ============================================================
 */

class Bullet {
    constructor() {
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.speed = 8;
        this.damage = 10;
        this.size = 5;
        this.pierce = 0;          // 剩余穿透次数
        this.hitEnemies = [];     // 已经命中过的敌人（防止穿透时重复伤害）
        this.target = null;       // 追踪目标
        this.trackingStrength = 0.1; // 追踪强度
        this.trailTimer = 0;
        this.color = Config.COLORS.bullet;
        this.glowColor = Config.COLORS.bulletGlow;
        this.isCrit = false;      // 本次是否暴击
        this.generation = 0;      // 子弹代际（0=原生，>0=分裂/召唤，不触发 ON_HIT）
        this.life = 3;            // 最大存活时间（防止飞出地图不消失）
    }

    /**
     * 初始化子弹（对象池复用）
     */
    init(x, y, angle, damage, speed, pierce, target = null, generation = 0) {
        this.active = true;
        this.weaponType='rifle';this.soundKind=null;
        this.exploded=false;
        this.blastRadius=65;
        this.size=5;
        this.color=Config.COLORS.bullet;
        this.glowColor=Config.COLORS.bulletGlow;
        this.x = x;
        this.y = y;
        this.previousX=x;this.previousY=y;
        this.speed = speed;
        this.damage = damage;
        this.pierce = pierce;
        this.hitEnemies = [];
        this.target = target;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.trailTimer = 0;
        this.life = 3;
        this.isCrit = false;
        this.generation = generation;
    }

    /**
     * 更新子弹
     */
    update(deltaTime, enemies, particleManager) {
        if (!this.active) return;

        this.life -= deltaTime;
        if (this.life <= 0) {
            this.active = false;
            return;
        }

        // 追踪目标逻辑
        if (this.target && this.target.active) {
            const angleToTarget = Utils.angle(this.x, this.y, this.target.x, this.target.y);
            const currentAngle = Math.atan2(this.vy, this.vx);

            // 平滑转向
            let angleDiff = angleToTarget - currentAngle;
            // 归一化角度差到 [-PI, PI]
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

            const turnRate = this.trackingStrength * deltaTime * 60;
            const newAngle = currentAngle + Utils.clamp(angleDiff, -turnRate, turnRate);

            this.vx = Math.cos(newAngle) * this.speed;
            this.vy = Math.sin(newAngle) * this.speed;
        } else if (!this.target || !this.target.active) {
            // 目标丢失，尝试找新目标（弱追踪）
            // TODO: 可以配置是否自动切换目标
        }

        // 移动
        this.previousX=this.x;this.previousY=this.y;
        this.x += this.vx * deltaTime * 60;
        this.y += this.vy * deltaTime * 60;

        // 拖尾粒子
        this.trailTimer -= deltaTime;
        if (this.trailTimer <= 0) {
            this.trailTimer = 0.02;
            const angle = Math.atan2(this.vy, this.vx);
            particleManager.spawnTrail(this.x, this.y, angle, this.color);
        }
    }

    /**
     * 命中敌人处理
     * @returns {boolean} 是否造成了有效命中
     */
    touches(enemy) {
        const dx=this.x-this.previousX,dy=this.y-this.previousY,length=dx*dx+dy*dy;
        const t=length?Math.max(0,Math.min(1,((enemy.x-this.previousX)*dx+(enemy.y-this.previousY)*dy)/length)):0;
        return Utils.circleCollision(this.previousX+dx*t,this.previousY+dy*t,this.size,enemy.x,enemy.y,enemy.size);
    }

    onHit(enemy, particleManager) {
        // 已经命中过的不再伤害（穿透用）
        if (this.hitEnemies.includes(enemy)) return false;
        this.hitEnemies.push(enemy);

        // 命中特效
        particleManager.spawnHit(this.x, this.y, this.color, 4);

        // 穿透处理
        if (this.pierce > 0) {
            this.pierce--;
        } else {
            this.active = false;
        }

        return true;
    }

    /**
     * 绘制子弹
     */
    draw(ctx, cameraX, cameraY) {
        if (!this.active) return;
        if(this.weaponType) {
            ctx.save();ctx.translate(this.x-cameraX,this.y-cameraY);ctx.rotate(Math.atan2(this.vy,this.vx));
            if(this.weaponType==='fireball') {
                ForestArt.shape(ctx,[[-24,-4],[-9,-9],[5,-6],[10,0],[4,7],[-10,8],[-29,3],[-17,0]],'#de7840',null);
                ForestArt.oval(ctx,0,0,9,7,'#ffc666',null);ForestArt.oval(ctx,2,0,5,4,'#fff1b5',null);
            } else {
                ForestArt.line(ctx,[[-(this.weaponType==='shotgun'?6:13),0],[3,0]],'#edc87f',this.weaponType==='shotgun'?3:2);
                ForestArt.oval(ctx,2,0,2,1.5,'#fff4cb',null);
            }
            ctx.restore();return;
        }

        const screenX = this.x - cameraX;
        const screenY = this.y - cameraY;

        ctx.save();

        // 发光效果
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.glowColor;

        // 子弹主体 - 拉长的椭圆
        const angle = Math.atan2(this.vy, this.vx);
        ctx.translate(screenX, screenY);
        ctx.rotate(angle);

        // 外发光
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size * 2);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(0.5, this.glowColor);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size * 2, this.size * 1.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // 核心
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size * 0.8, this.size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

/**
 * 子弹管理器 - 对象池
 */
class BulletManager extends ObjectPool {
    constructor(maxBullets = 200, maxActive = 20) {
        super(() => new Bullet(), maxBullets);
        this.maxActive = maxActive;
    }

    fire(x, y, angle, damage, speed, pierce, target = null, generation = 0) {
        if (this.getActiveCount() >= this.maxActive) return null;
        const bullet = this.acquire();
        if (bullet) {
            bullet.init(x, y, angle, damage, speed, pierce, target, generation);
        }
        return bullet;
    }

    update(deltaTime, enemies, particleManager) {
        for (let i = 0; i < this.pool.length; i++) {
            this.pool[i].update(deltaTime, enemies, particleManager);
        }
    }

    draw(ctx, cameraX, cameraY) {
        for (let i = 0; i < this.pool.length; i++) {
            this.pool[i].draw(ctx, cameraX, cameraY);
        }
    }
}

if (typeof window !== 'undefined') {
    window.Bullet = Bullet;
    window.BulletManager = BulletManager;
}
