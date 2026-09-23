/**
 * ============================================================
 *  Boss.js - Boss 敌人
 * ============================================================
 *  每90秒出现的强力Boss
 *  技能：冲撞、范围AOE攻击
 *  特效：红色光圈、警告文字、震屏
 *  TODO: 可以加入更多Boss类型，每种有独特技能
 *  TODO: 可以加入Boss阶段转换（血量到阈值切换模式）
 *  TODO: 可以加入召唤小怪技能
 * ============================================================
 */

class Boss {
    constructor() {
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.maxHp = 2000;
        this.hp = 2000;
        this.speed = 1.2;
        this.damage = 40;
        this.size = 50;
        this.exp = 200;
        this.gold = 100;
        this.color = '#ee5253';
        this.glowColor = 'rgba(238, 82, 83, 0.8)';

        // 冲撞技能
        this.chargeSpeed = 6;
        this.chargeCooldown = 5;
        this.chargeTimer = 5;
        this.isCharging = false;
        this.chargeDuration = 0.8;
        this.chargeCurrentDuration = 0;
        this.chargeDirection = { x: 0, y: 0 };
        this.chargeWindup = 1; // 冲撞前摇
        this.chargeWindupTimer = 0;
        this.isWindup = false;

        // 范围攻击
        this.aoeRadius = 150;
        this.aoeDamage = 30;
        this.aoeCooldown = 8;
        this.aoeTimer = 8;
        this.isAoeWarning = false;
        this.aoeWarningDuration = 1.5;
        this.aoeWarningTimer = 0;
        this.aoeX = 0;
        this.aoeY = 0;

        // 受击闪烁
        this.hitFlash = 0;

        // 出现警告
        this.spawnWarning = true;
        this.spawnWarningTimer = 2;

        // 难度缩放
        this.hpMultiplier = 1;

        // 音频引用
        this.audio = null;

        this.animTimer = 0;
    }

    /**
     * 初始化Boss
     */
    init(x, y, hpMultiplier = 1) {
        this._forestDetour=null;
        const cfg = Config.BOSS;
        this.active = true;
        this.x = x;
        this.y = y;
        this.hpMultiplier = hpMultiplier;
        this.maxHp = cfg.hp * hpMultiplier;
        this.hp = this.maxHp;
        this.speed = cfg.speed;
        this.damage = cfg.damage;
        this.size = cfg.size;
        this.exp = cfg.exp;
        this.gold = cfg.gold;
        this.chargeSpeed = cfg.chargeSpeed;
        this.chargeCooldown = cfg.chargeCooldown;
        this.chargeTimer = cfg.chargeCooldown;
        this.aoeRadius = cfg.aoeRadius;
        this.aoeDamage = cfg.aoeDamage;
        this.aoeCooldown = cfg.aoeCooldown;
        this.aoeTimer = cfg.aoeCooldown;

        this.isCharging = false;
        this.isWindup = false;
        this.isAoeWarning = false;
        this.hitFlash = 0;
        this.spawnWarning = true;
        this.spawnWarningTimer = 2;
    }

    /**
     * 受到伤害
     */
    takeDamage(amount) {
        this.hp -= amount;
        this.hitFlash = 0.1;

        if (this.hp <= 0) {
            this.hp = 0;
            return true;
        }
        return false;
    }

    /**
     * 死亡
     */
    die(particleManager, experienceManager, game) {
        this.active = false;

        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                if (particleManager) {
                    particleManager.spawnExplosion(
                        this.x + Utils.random(-30, 30),
                        this.y + Utils.random(-30, 30),
                        this.color,
                        20
                    );
                }
            }, i * 100);
        }

        experienceManager.spawnOrb(this.x, this.y, this.exp, this.gold);

        if (game) {
            game.screenShake = 20;
        }
    }

    /**
     * 开始冲撞前摇
     */
    startCharge(player) {
        this.isWindup = true;
        this.chargeWindupTimer = this.chargeWindup;
        const angle = Utils.angle(this.x, this.y, player.x, player.y);
        this.chargeDirection.x = Math.cos(angle);
        this.chargeDirection.y = Math.sin(angle);
        if (this.audio) this.audio.bossChargeWindup();
    }

    /**
     * 执行冲撞
     */
    executeCharge() {
        this.isWindup = false;
        this.isCharging = true;
        this.chargeCurrentDuration = this.chargeDuration;
        if (this.audio) this.audio.bossCharge();
    }

    /**
     * 开始AOE警告
     */
    startAoe(player) {
        this.isAoeWarning = true;
        this.aoeWarningTimer = this.aoeWarningDuration;
        this.aoeX = player.x;
        this.aoeY = player.y;
    }

    /**
     * 执行AOE
     */
    executeAoe(particleManager, player, game) {
        this.isAoeWarning = false;

        particleManager.spawnExplosion(this.aoeX, this.aoeY, '#ff6b6b', 40);

        if (game) {
            game.screenShake = Math.max(game.screenShake, 10);
        }

        if (this.audio) this.audio.bossAOE();

        // 范围伤害
        const dist = Utils.distance(this.aoeX, this.aoeY, player.x, player.y);
        if (dist < this.aoeRadius + player.size) {
            player.takeDamage(this.aoeDamage,{x:this.x,y:this.y,kind:'首领'});
        }

        // TODO: playSound('aoe')
    }

    /**
     * 更新Boss
     */
    update(deltaTime, player, particleManager, game) {
        if (!this.active) return;
        const walkSpeed=this.speed*(game?.survivalTime==null?1:(WoodlandScene.surfaceAt(this.x,this.y,game.survivalTime)?.speed ?? 1));
        const move=(dx,dy)=>{if(game?.survivalTime!=null)ForestMap.move(this,dx,dy);else{this.x+=dx;this.y+=dy;}};

        this.animTimer += deltaTime;

        // 出现警告
        if (this.spawnWarning) {
            this.spawnWarningTimer -= deltaTime;
            if (this.spawnWarningTimer <= 0) {
                this.spawnWarning = false;
            }
            return; // 警告期间不移动
        }

        // 受击闪烁
        if (this.hitFlash > 0) {
            this.hitFlash -= deltaTime;
        }

        // 冲撞前摇
        if (this.isWindup) {
            this.chargeWindupTimer -= deltaTime;
            // 前摇期间缓慢跟随
            const angle = Utils.angle(this.x, this.y, player.x, player.y);
            move(Math.cos(angle)*walkSpeed*.3*deltaTime*60,Math.sin(angle)*walkSpeed*.3*deltaTime*60);

            if (this.chargeWindupTimer <= 0) {
                this.executeCharge();
            }
            return;
        }

        // 冲撞中
        if (this.isCharging) {
            this.chargeCurrentDuration -= deltaTime;
            move(this.chargeDirection.x*this.chargeSpeed*deltaTime*60,this.chargeDirection.y*this.chargeSpeed*deltaTime*60);

            // 冲撞接触伤害
            if (Utils.circleCollision(this.x, this.y, this.size, player.x, player.y, player.size) && (game?.survivalTime==null || ForestMap.firstHit(this.x,this.y,player.x,player.y)===null)) {
                player.takeDamage(this.damage * 1.5,{x:this.x,y:this.y,kind:'首领'});
            }

            // 冲刺残影
            if (Math.random() < 0.5) {
                particleManager.spawnAfterimage(this.x, this.y, this.size, this.color);
            }

            if (this.chargeCurrentDuration <= 0) {
                this.isCharging = false;
                this.chargeTimer = this.chargeCooldown;
            }
            return;
        }

        // AOE警告中
        if (this.isAoeWarning) {
            this.aoeWarningTimer -= deltaTime;
            if (this.aoeWarningTimer <= 0) {
                this.executeAoe(particleManager, player, game);
            }
            // 警告期间正常移动但减速
            const angle = Utils.angle(this.x, this.y, player.x, player.y);
            move(Math.cos(angle)*walkSpeed*.5*deltaTime*60,Math.sin(angle)*walkSpeed*.5*deltaTime*60);
            return;
        }

        // 普通追踪移动
        const angle = game?.survivalTime!=null?ForestMap.steer(this,player):Utils.angle(this.x, this.y, player.x, player.y);
        move(Math.cos(angle)*walkSpeed*deltaTime*60,Math.sin(angle)*walkSpeed*deltaTime*60);

        // 接触伤害
        if (Utils.circleCollision(this.x, this.y, this.size, player.x, player.y, player.size) && (game?.survivalTime==null || ForestMap.firstHit(this.x,this.y,player.x,player.y)===null)) {
            player.takeDamage(this.damage * deltaTime * 2,{x:this.x,y:this.y,kind:'首领'});
        }

        // 技能冷却
        this.chargeTimer -= deltaTime;
        this.aoeTimer -= deltaTime;

        // 释放技能
        if (this.chargeTimer <= 0) {
            this.startCharge(player);
        } else if (this.aoeTimer <= 0) {
            this.startAoe(player);
        }
    }

    /**
     * 绘制Boss
     */
    draw(ctx, cameraX, cameraY) {
        if (!this.active) return;

        const sx = this.x - cameraX;
        const sy = this.y - cameraY;
        const s = this.size;
        const t = this.animTimer;
        const hpPct = this.hp / this.maxHp;

        if (this.spawnWarning) {
            const alpha = 0.3 + Math.sin(Date.now() * 0.02) * 0.3;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#cc5500';
            ctx.beginPath();
            ctx.arc(sx, sy, s * 1.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            return;
        }

        ctx.save();

        const bodyColor = this.hitFlash > 0 ? '#ffffff' : '#181010';
        const boneColor = this.hitFlash > 0 ? '#ffffff' : '#6a2020';
        const coreColor = this.hitFlash > 0 ? '#ffffff' : `rgb(${Math.floor(180 + hpPct * 75)},${Math.floor(60 + hpPct * 25)},0)`;

        // 地面阴影
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(sx, sy + s * 0.7, s * 1.5, s * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        const stomp = Math.abs(Math.sin(t * 1.2)) * 2;

        // 腿（两根粗大柱状）
        ctx.fillStyle = bodyColor;
        ctx.fillRect(sx - s * 0.5, sy + s * 0.1 - stomp, s * 0.35, s * 0.7);
        ctx.fillRect(sx + s * 0.15, sy + s * 0.1 + stomp, s * 0.35, s * 0.7);
        // 腿上的骨板
        ctx.fillStyle = boneColor;
        ctx.fillRect(sx - s * 0.55, sy + s * 0.3, s * 0.4, s * 0.08);
        ctx.fillRect(sx + s * 0.1, sy + s * 0.4, s * 0.4, s * 0.08);

        // 主体（巨大不规则椭圆）
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        const bodyPts = 12;
        for (let i = 0; i < bodyPts; i++) {
            const a = (i / bodyPts) * Math.PI * 2;
            const noiseVal = Math.sin(i * 3.7 + t * 0.5) * s * 0.15;
            const r = s * 1.1 + noiseVal + (i >= 2 && i <= 7 ? s * 0.2 : 0);
            const px = sx + Math.cos(a) * r;
            const py = sy + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // 体内嵌入的人脸轮廓（3-4个）
        ctx.fillStyle = 'rgba(106,32,32,0.4)';
        const faces = [
            { x: -s * 0.5, y: -s * 0.5, r: s * 0.2 },
            { x: s * 0.55, y: -s * 0.3, r: s * 0.18 },
            { x: s * 0.1, y: -s * 0.9, r: s * 0.22 },
            { x: -s * 0.35, y: s * 0.2, r: s * 0.15 },
        ];
        for (const f of faces) {
            ctx.beginPath();
            ctx.ellipse(sx + f.x, sy + f.y, f.r, f.r * 1.2, 0, 0, Math.PI * 2);
            ctx.fill();
            // 眼窝（两个暗点）
            ctx.fillStyle = '#0a0505';
            ctx.beginPath();
            ctx.arc(sx + f.x - f.r * 0.3, sy + f.y - f.r * 0.1, f.r * 0.2, 0, Math.PI * 2);
            ctx.arc(sx + f.x + f.r * 0.3, sy + f.y - f.r * 0.1, f.r * 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(106,32,32,0.4)';
        }

        // 四只手臂
        const armWave = Math.sin(t * 1.5) * s * 0.2;
        ctx.fillStyle = bodyColor;
        this._drawBossArm(ctx, sx - s * 1.0, sy - s * 0.2, -1.2, 0.3, s, armWave, boneColor);
        this._drawBossArm(ctx, sx + s * 1.0, sy - s * 0.2, 1.2, -0.3, s, armWave, boneColor);
        this._drawBossArm(ctx, sx - s * 1.2, sy + s * 0.3, -0.9, 0.8, s, -armWave, boneColor);
        this._drawBossArm(ctx, sx + s * 1.2, sy + s * 0.3, 0.9, -0.8, s, -armWave, boneColor);

        // 骨板凸起（背部和肩部）
        ctx.fillStyle = boneColor;
        const spikes = [
            { ax: -1.1, ay: -0.6, h: 0.5 },
            { ax: 1.1, ay: -0.6, h: 0.5 },
            { ax: 0, ay: -1.2, h: 0.4 },
            { ax: -0.7, ay: 0.7, h: 0.3 },
            { ax: 0.7, ay: 0.7, h: 0.3 },
        ];
        for (const sp of spikes) {
            ctx.beginPath();
            ctx.moveTo(sx + sp.ax * s, sy + (sp.ay - 0.1) * s);
            ctx.lineTo(sx + (sp.ax + 0.15) * s, sy + (sp.ay - sp.h) * s);
            ctx.lineTo(sx + (sp.ax - 0.15) * s, sy + (sp.ay - sp.h) * s);
            ctx.closePath();
            ctx.fill();
        }

        // 胸部腐化核心（脉动）
        const corePulse = 1 + Math.sin(t * 3) * 0.15 + (1 - hpPct) * 0.2;
        const coreR = s * 0.35 * corePulse;
        ctx.fillStyle = coreColor;
        ctx.beginPath();
        ctx.arc(sx, sy + s * 0.05, coreR, 0, Math.PI * 2);
        ctx.fill();
        // 核心裂缝
        ctx.strokeStyle = `rgba(255,200,100,${0.5 + (1 - hpPct) * 0.5})`;
        ctx.lineWidth = 1.5 + (1 - hpPct) * 2;
        ctx.beginPath();
        ctx.moveTo(sx - coreR * 0.6, sy + s * 0.05 - coreR * 0.4);
        ctx.lineTo(sx + coreR * 0.4, sy + s * 0.05 + coreR * 0.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sx + coreR * 0.5, sy + s * 0.05 - coreR * 0.3);
        ctx.lineTo(sx - coreR * 0.5, sy + s * 0.05 + coreR * 0.4);
        ctx.stroke();

        // 冲撞前摇
        if (this.isWindup) {
            ctx.strokeStyle = 'rgba(255,200,80,0.7)';
            ctx.lineWidth = 3;
            ctx.setLineDash([12, 8]);
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + this.chargeDirection.x * 500, sy + this.chargeDirection.y * 500);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.restore();

        // AOE 警告圈
        if (this.isAoeWarning) {
            const aoeSx = this.aoeX - cameraX;
            const aoeSy = this.aoeY - cameraY;
            const wp = 1 - this.aoeWarningTimer / this.aoeWarningDuration;
            ctx.save();
            ctx.strokeStyle = `rgba(255,100,80,${0.4 + wp * 0.5})`;
            ctx.lineWidth = 2 + wp * 4;
            ctx.setLineDash([12, 8]);
            ctx.beginPath();
            ctx.arc(aoeSx, aoeSy, this.aoeRadius * (0.4 + wp * 0.6), 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = `rgba(255,80,60,${0.08 + wp * 0.2})`;
            ctx.fill();
            ctx.setLineDash([]);
            ctx.restore();
        }
    }

    _drawBossArm(ctx, x, y, dirAngle, droop, s, wave, boneColor) {
        const segs = 4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let i = 1; i <= segs; i++) {
            const t = i / segs;
            const px = x + Math.cos(dirAngle) * s * 1.2 * t;
            const py = y + Math.sin(dirAngle) * s * 0.6 * t + droop * s * t * t + (i % 2 === 0 ? wave : -wave) * t;
            ctx.lineTo(px, py);
        }
        ctx.lineWidth = s * 0.15;
        ctx.strokeStyle = '#181010';
        ctx.stroke();
        // 骨节突起
        for (let i = 1; i <= 2; i++) {
            const t = i / 3;
            const px = x + Math.cos(dirAngle) * s * 1.2 * t;
            const py = y + Math.sin(dirAngle) * s * 0.6 * t + droop * s * t * t;
            ctx.fillStyle = boneColor;
            ctx.beginPath();
            ctx.arc(px, py, s * 0.07, 0, Math.PI * 2);
            ctx.fill();
        }
        // 手爪
        const tipX = x + Math.cos(dirAngle) * s * 1.2;
        const tipY = y + Math.sin(dirAngle) * s * 0.6 + droop * s + wave;
        for (let ci = 0; ci < 3; ci++) {
            const ca = dirAngle + Math.PI + (ci - 1) * 0.3;
            ctx.beginPath();
            ctx.moveTo(tipX, tipY);
            ctx.lineTo(tipX + Math.cos(ca) * s * 0.2, tipY + Math.sin(ca) * s * 0.2);
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = boneColor;
            ctx.stroke();
        }
    }

    /**
     * 绘制Boss血条（顶部专用）
     */
    drawHealthBar(ctx, canvasWidth) {
        if (!this.active || this.spawnWarning) return;

        const barWidth = canvasWidth * 0.6;
        const barHeight = 12;
        const barX = (canvasWidth - barWidth) / 2;
        const barY = 20;

        ctx.save();

        // 背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);

        // 血条背景
        ctx.fillStyle = 'rgba(50, 50, 50, 0.8)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // 血量
        const hpPercent = this.hp / this.maxHp;
        const gradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
        gradient.addColorStop(0, '#ff4757');
        gradient.addColorStop(1, '#ff6b81');
        ctx.fillStyle = gradient;
        ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);

        // 边框
        ctx.strokeStyle = '#ff4757';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        // 文字
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('BOSS', canvasWidth / 2, barY + barHeight - 2);

        ctx.restore();
    }
}

if (typeof window !== 'undefined') {
    window.Boss = Boss;
}
