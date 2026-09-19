/**
 * ============================================================
 *  Particle.js - 粒子系统
 * ============================================================
 *  统一管理所有粒子特效：尾焰、爆炸、命中、残影等
 *  使用对象池复用粒子，避免频繁GC
 *  TODO: 可以按类型分层渲染，优化绘制顺序
 *  TODO: 可以加入粒子纹理，提升视觉效果
 * ============================================================
 */

class Particle {
    constructor() {
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.life = 0;
        this.maxLife = 1;
        this.size = 2;
        this.color = '#ffffff';
        this.alpha = 1;
        this.gravity = 0;
        this.friction = 0.98;
        this.glow = false;
        this.type = 'default'; // default / trail / explosion / hit / afterimage
    }

    /**
     * 初始化粒子（对象池复用）
     */
    init(x, y, vx, vy, options = {}) {
        this.active = true;
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.maxLife = options.life || 0.5;
        this.life = this.maxLife;
        this.size = options.size || 3;
        this.color = options.color || '#ffffff';
        this.gravity = options.gravity || 0;
        this.friction = options.friction || 0.98;
        this.glow = options.glow || false;
        this.type = options.type || 'default';
        this.alpha = 1;
    }

    update(deltaTime) {
        if (!this.active) return;

        this.life -= deltaTime;
        if (this.life <= 0) {
            this.active = false;
            return;
        }

        // 生命百分比
        const t = this.life / this.maxLife;
        this.alpha = t;

        // 速度更新
        this.vy += this.gravity * deltaTime;
        this.vx *= this.friction;
        this.vy *= this.friction;

        // 位置更新
        this.x += this.vx * deltaTime * 60;
        this.y += this.vy * deltaTime * 60;

        // 残影类型不移动，只淡出
        if (this.type === 'afterimage') {
            this.alpha = t * 0.5;
        }
    }

    draw(ctx, cameraX, cameraY) {
        if (!this.active) return;

        const screenX = this.x - cameraX;
        const screenY = this.y - cameraY;

        ctx.save();
        ctx.globalAlpha = this.alpha;

        if (this.glow) {
            ctx.shadowBlur = this.size * 2;
            ctx.shadowColor = this.color;
        }

        ctx.fillStyle = this.color;

        if (this.type === 'afterimage') {
            // 残影画成圆环
            ctx.beginPath();
            ctx.arc(screenX, screenY, this.size, 0, Math.PI * 2);
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if(this.type==='casing') {
            ctx.translate(screenX,screenY);ctx.rotate(this.life*12);ctx.fillRect(-3,-1,6,2);
        } else {
            ctx.beginPath();
            ctx.arc(screenX, screenY, this.size * this.alpha, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

/**
 * 粒子管理器 - 对象池模式
 */
class ParticleManager extends ObjectPool {
    constructor(maxCount = 500) {
        super(() => new Particle(), maxCount);
    }

    /**
     * 生成尾焰粒子
     */
    spawnCasing(x,y,angle) {
        const p=this.acquire();if(!p)return;
        p.init(x,y,Math.cos(angle+Math.PI/2)*2,Math.sin(angle+Math.PI/2)*2,
            {life:.32,size:2,color:'#cba76b',friction:.94,glow:false,type:'casing',gravity:8});
    }

    spawnTrail(x, y, angle, color) {
        const p = this.acquire();
        const spread = 0.3;
        const speed = Utils.random(1, 3);
        const a = angle + Math.PI + Utils.random(-spread, spread);
        p.init(x, y,
            Math.cos(a) * speed,
            Math.sin(a) * speed,
            {
                life: Utils.random(0.2, 0.4),
                size: Utils.random(2, 4),
                color: color,
                friction: 0.92,
                glow: true,
                type: 'trail',
            }
        );
    }

    /**
     * 生成爆炸粒子
     */
    spawnExplosion(x, y, color, count = 15) {
        for (let i = 0; i < count; i++) {
            const p = this.acquire();
            const angle = (i / count) * Math.PI * 2 + Utils.random(-0.2, 0.2);
            const speed = Utils.random(2, 6);
            p.init(x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                {
                    life: Utils.random(0.3, 0.7),
                    size: Utils.random(2, 5),
                    color: color,
                    friction: 0.94,
                    glow: true,
                    type: 'explosion',
                }
            );
        }
    }

    /**
     * 生成命中粒子
     */
    spawnHit(x, y, color, count = 5) {
        for (let i = 0; i < count; i++) {
            const p = this.acquire();
            const angle = Math.random() * Math.PI * 2;
            const speed = Utils.random(1, 4);
            p.init(x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                {
                    life: Utils.random(0.15, 0.3),
                    size: Utils.random(1.5, 3),
                    color: color,
                    friction: 0.9,
                    glow: true,
                    type: 'hit',
                }
            );
        }
    }

    /**
     * 生成玩家残影
     */
    spawnAfterimage(x, y, size, color) {
        const p = this.acquire();
        p.init(x, y, 0, 0, {
            life: 0.3,
            size: size,
            color: color,
            type: 'afterimage',
            glow: true,
        });
    }

    /**
     * 生成经验吸取粒子效果
     */
    spawnExpPickup(x, y, color) {
        const p = this.acquire();
        const angle = Math.random() * Math.PI * 2;
        p.init(x, y,
            Math.cos(angle) * 2,
            Math.sin(angle) * 2,
            {
                life: 0.4,
                size: 3,
                color: color,
                glow: true,
                type: 'default',
            }
        );
    }

    update(deltaTime) {
        for (let i = 0; i < this.pool.length; i++) {
            this.pool[i].update(deltaTime);
        }
    }

    draw(ctx, cameraX, cameraY) {
        for (let i = 0; i < this.pool.length; i++) {
            this.pool[i].draw(ctx, cameraX, cameraY);
        }
    }
}

if (typeof window !== 'undefined') {
    window.Particle = Particle;
    window.ParticleManager = ParticleManager;
}
