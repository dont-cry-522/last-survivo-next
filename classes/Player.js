/**
 * ============================================================
 *  Player.js - 玩家飞船
 * ============================================================
 *  蓝色科技飞船，八方向移动，Shift冲刺，自动攻击
 *  支持：尾焰粒子、移动残影、冲刺残影
 *  技能系统通过修改 Player 属性实现效果
 * ============================================================
 */

class Player {
    static WEAPONS = {
        pistol:{name:'暮影手枪',rate:2,damage:1.7,count:1,speed:13,range:560,spread:0},
        shuriken:{name:'月刃飞镖',rate:1.5,damage:.85,count:3,speed:8,range:410,spread:.18},
        dark:{name:'暗月法器',rate:.9,damage:2.1,count:1,speed:6,range:440,spread:0},
        rifle: {name:'连发枪',rate:3,damage:1,count:1,speed:10,range:520,spread:0},
        shotgun: {name:'散弹枪',rate:.85,damage:.7,count:5,speed:9,range:240,spread:.12},
        fireball: {name:'火球法杖',rate:.85,damage:2.3,count:1,speed:5.5,range:420,spread:0},
    };

    setWeapon(kind) {
        this.weaponPath=null;this.chargeLevel=0;
        this.blastRadius=65;
        this.weaponType=Player.WEAPONS[kind]?kind:'rifle';
        const weapon=Player.WEAPONS[this.weaponType];
        this.attackSpeed=weapon.rate;this.bulletDamage=Config.PLAYER.bulletDamage*weapon.damage;
        this.bulletCount=weapon.count;this.bulletSpeed=weapon.speed;this.attackRange=weapon.range;
        this.attackTimer=0;this.attackInterval=1/this.attackSpeed;
    }
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.angle = -Math.PI / 2;

        const cfg = Config.PLAYER;
        this.maxHp = cfg.maxHp;
        this.hp = cfg.maxHp;
        this.speed = cfg.speed;
        this.baseSpeed = cfg.speed;
        this.attackSpeed = cfg.attackSpeed;
        this.attackRange = cfg.attackRange;
        this.bulletDamage = cfg.bulletDamage;
        this.bulletSpeed = cfg.bulletSpeed;
        this.bulletCount = cfg.bulletCount;
        this.pierce = cfg.pierce;
        this.critRate = cfg.critRate;
        this.critDamage = cfg.critDamage;
        this.magnetRange = cfg.magnetRange;
        this.expMultiplier = cfg.expMultiplier;
        this.size = cfg.size;
        this.shield = 0;

        this.dashCooldown = cfg.dashCooldown;
        this.dashCooldownMax = cfg.dashCooldown;
        this.dashDuration = cfg.dashDuration;
        this.dashSpeedMultiplier = cfg.dashSpeedMultiplier;
        this.isDashing = false;this.blinkTrace=null;
        this.dashTimer = 0;
        this.dashDirection = { x: 0, y: 0 };

        this.attackTimer = 0;
        this.attackInterval = 1 / this.attackSpeed;

        this.level = 1;
        this.exp = 0;
        this.expToNext = Config.getExpForLevel(1);
        this.gold = 0;

        this.invincibleTimer = 0;
        this.invincibleDuration = 0.5;

        this.afterimageTimer = 0;
        this.trailTimer = 0;

        this.touchKeys = {};
        this.keys = { w: false, a: false, s: false, d: false, shift: false };

        this.kills = 0;
        this.bossKills = 0;
        this.upgradeCount = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.comboTimer = 0;

        this.color = Config.COLORS.player;
        this.glowColor = Config.COLORS.playerGlow;
        this.audio = null;

        this.animTimer = 0;
        this.muzzleFlash = 0;
        this.walkCycle = 0;
        this.aimAngle = 0;
        this.recoilTimer = 0;
        this.hurtTimer = 0;
        this.moving = false;
        this.runBlend = 0;

        // 技能属性
        this._spreadAngle = null;
        this._dualWieldDirections = 0;
        this._overheat = null;
        this._overheatStacks = 0;
        this._overheatTimer = 0;
        this._pierceDmgBonus = 0;
        this._bounce = null;
        this._splitter = null;
        this._turrets = null;
        this._mines = null;
    }

    onKeyDown(key) {
        let k = key.toLowerCase();
        if (k === 'arrowup' || k === 'home' || k === 'pageup' || k === 'numpad8') k = 'w';
        if (k === 'arrowdown' || k === 'end' || k === 'pagedown' || k === 'numpad2') k = 's';
        if (k === 'arrowleft' || k === 'numpad4') k = 'a';
        if (k === 'arrowright' || k === 'numpad6') k = 'd';
        if (k in this.keys) this.keys[k] = true;
        if (k === 'shift') { this.keys.shift = true; this.tryDash(); }
    }

    onKeyUp(key) {
        let k = key.toLowerCase();
        if (k === 'arrowup' || k === 'home' || k === 'pageup' || k === 'numpad8') k = 'w';
        if (k === 'arrowdown' || k === 'end' || k === 'pagedown' || k === 'numpad2') k = 's';
        if (k === 'arrowleft' || k === 'numpad4') k = 'a';
        if (k === 'arrowright' || k === 'numpad6') k = 'd';
        if (k in this.keys) this.keys[k] = false;
        if (k === 'shift') this.keys.shift = false;
    }

    get dodgeName(){return this.characterId==='silver'?'瞬移':'翻滚';}
    tryDash() {
        if (this.dashCooldown > 0 || this.isDashing) return;

        let dx = 0, dy = 0;
        if (this.keys.w || this.touchKeys.w) dy -= 1;
        if (this.keys.s || this.touchKeys.s) dy += 1;
        if (this.keys.a || this.touchKeys.a) dx -= 1;
        if (this.keys.d || this.touchKeys.d) dx += 1;

        if (dx === 0 && dy === 0) {
            dx = Math.cos(this.angle);
            dy = Math.sin(this.angle);
        } else {
            const len = Math.sqrt(dx * dx + dy * dy);
            dx /= len;
            dy /= len;
        }

        this.dashDirection.x = dx;
        this.dashDirection.y = dy;
        this.isDashing = true;
        this.dashTimer = this.dashDuration;
        this.dashCooldown = this.dashCooldownMax;
        this.invincibleTimer = Math.max(this.invincibleTimer, this.dashDuration);

        this.blinkTrace=null;
        if(this.characterId==='silver'){
            const from={x:this.x,y:this.y},distance=this.speed*this.dashSpeedMultiplier*this.dashDuration*60;
            // Teleport ignores the route; search backward from full range for a safe landing.
            const steps=Math.max(1,Math.ceil(distance/5));
            for(let i=steps;i>=1;i--){
                const x=from.x+dx*distance*i/steps,y=from.y+dy*distance*i/steps;
                if(typeof ForestMap!=='undefined'&&!ForestMap.clear(x,y,this.size))continue;
                this.x=x;this.y=y;break;
            }
            this.blinkTrace={x:from.x,y:from.y,toX:this.x,toY:this.y,life:.28};
        }
        if (this.audio) this.audio.dash(this.characterId==='silver'?'blink':'roll');
        if (this._onDash) this._onDash();
    }

    takeDamage(amount, source = null) {
        if (this.hp <= 0 || amount <= 0 || this.invincibleTimer > 0 || this.isDashing) return false;
        this.invincibleTimer = this.invincibleDuration;
        if (this.shield > 0) {
            const d = Math.min(this.shield, amount);
            this.shield -= d;
            amount -= d;
            if(d>0)this._onShieldHit?.();
        }
        this.hp -= amount;
        this.combo = 0;
        this.hurtTimer = 0.32;
        if(amount>0)this._onHitFeedback?.(amount,source);
        if (this.audio) this.audio.playerHit();
        if (this._onDamaged && amount > 0) this._onDamaged(amount);
        if (this.hp <= 0) { this.hp = 0; return true; }
        return false;
    }

    addExp(amount) {
        this.exp += amount * this.expMultiplier;
        let leveledUp = false;
        while (this.exp >= this.expToNext) {
            this.exp -= this.expToNext;
            this.level++;
            this.expToNext = Config.getExpForLevel(this.level);
            this.maxHp += Config.PLAYER.levelHpBonus;
            this.hp = Math.min(this.maxHp, this.hp + 5);
            this.bulletDamage += 1 / ((Player.WEAPONS[this.weaponType]?.rate || 3) * (Player.WEAPONS[this.weaponType]?.count || 1));
            leveledUp = true;
        }
        return leveledUp;
    }

    addGold(amount) { this.gold += amount; }

    addKill(isBoss = false) {
        this.kills++;
        this.combo++;
        this.comboTimer = 3;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;
        if (isBoss) this.bossKills++;
        // 过热：击杀触发
        if (this._overheat) {
            this._overheatStacks = Math.min((this._overheatStacks || 0) + 1, this._overheat.maxStacks);
            this._overheatTimer = this._overheat.duration;
        }
    }

    findNearestEnemy(enemies) {
        let nearest = null;
        let nearestDist = this.attackRange * this.attackRange;
        for (let i = 0; i < enemies.length; i++) {
            const e = enemies[i];
            if (!e.active) continue;
            const dist = Utils.distanceSq(this.x, this.y, e.x, e.y);
            if (dist < nearestDist) {
                if(typeof ForestMap!=='undefined'&&ForestMap.firstHit(this.x,this.y,e.x,e.y,5)!==null)continue;
                nearestDist = dist; nearest = e;
            }
        }
        return nearest;
    }

    autoAttack(deltaTime, enemies, bulletManager, particleManager) {
        this.attackTimer -= deltaTime;

        // 过热计时
        if (this._overheat && this._overheatStacks > 0) {
            this._overheatTimer -= deltaTime;
            if (this._overheatTimer <= 0) this._overheatStacks = 0;
        }
        if (this._blinkCrit) {
            this._blinkCrit.timer -= deltaTime;
            if (this._blinkCrit.timer <= 0) this._blinkCrit = null;
        }
        const bonusAS = (this._overheatStacks || 0) * (this._overheat ? this._overheat.perStack : 0);
        const currentAS = this.attackSpeed * (1 + bonusAS);

        if (this.attackTimer > 0) return;

        const target = this.findNearestEnemy(enemies);
        if (!target) return;
        this.aimAngle = Utils.angle(this.x, this.y, target.x, target.y);
        this.recoilTimer = this.weaponType==='shotgun'?.22:this.weaponType==='fireball'?.18:.09;

        this.attackInterval = 1 / currentAS;
        this.attackTimer = this.attackInterval;

        const bulletCount = this.bulletCount;
        const weapon=Player.WEAPONS[this.weaponType||'rifle'];
        const spreadAngle = (this._spreadAngle !== null ? this._spreadAngle : (weapon.spread || (bulletCount > 1 ? 0.3 : 0)))*(this.weaponPath==='wide'?1.65:this.weaponPath==='focus'?.4:1);

        // 双持多方向
        const directions = this._dualWieldDirections || 1;
        const dirSpan = (directions - 1) * 0.4;
        const dirStart = -dirSpan / 2;

        for (let d = 0; d < directions; d++) {
            const dirOff = directions > 1 ? dirStart + d * 0.4 : 0;
            for (let i = 0; i < bulletCount; i++) {
                let angle = Utils.angle(this.x, this.y, target.x, target.y) + dirOff;
                if (bulletCount > 1) {
                    angle += (i - (bulletCount - 1) / 2) * spreadAngle;
                }
                let isCrit = Math.random() < this.critRate;
                let baseDmg = this.bulletDamage;
                // 弱点洞悉：低血量必暴
                const w = window.game?.skillManager?.runtimeState?._weakness;
                if (w && target && target.active && target.hp / target.maxHp <= w.threshold) {
                    isCrit = true;
                    baseDmg *= (1 + (w.critDmgBonus || 0));
                }
                // 鲜血狂怒 + 灵魂收割暴伤
                const frenzy = window.game?.skillManager?.runtimeState?._frenzy;
                const frenzyBonus = (frenzy && frenzy.timer > 0) ? frenzy.stacks * (window.game?.skillManager?.getSkill('blood_frenzy')?.getCurrentEffect()?.params?.perStack || 0) : 0;
                const soulBonus = (window.game?.skillManager?.runtimeState?._souls || 0) * (window.game?.skillManager?.getSkill('soul_harvest')?.getCurrentEffect()?.params?.perStack || 0);
                // 闪现暴伤
                if (this._blinkCrit && this._blinkCrit.timer > 0) {
                    isCrit = true;
                    baseDmg *= (1 + (this._blinkCrit.bonus || 0));
                }
                const voidBonus = (window.game?.skillManager?.runtimeState?._voidStacks || 0) * (window.game?.skillManager?.getSkill('void_walker')?.getCurrentEffect()?.params?.perStack || 0);
                const critDmg = this.critDamage * (1 + frenzyBonus + soulBonus);
                const damage = (isCrit ? baseDmg * critDmg : baseDmg) * (1 + voidBonus);
                const bullet = bulletManager.fire(this.x, this.y, angle, damage, this.bulletSpeed, this.pierce+(this.weaponType==='shuriken'?1:0), ['shotgun','pistol','shuriken'].includes(this.weaponType)?null:target);
                if (bullet) {
                    bullet.isCrit = isCrit;
                    bullet.weaponType=this.weaponType||'rifle';
                    bullet.weaponPath=this.weaponPath;
                    bullet.blastRadius=this.blastRadius||65;
                    bullet.size=['fireball','dark'].includes(this.weaponType)?9:this.weaponType==='shuriken'?7:this.weaponType==='shotgun'?3:4;
                    bullet.color=this.weaponType==='dark'?'#a599d7':this.weaponType==='shuriken'?'#bcd9d5':this.weaponType==='fireball'?'#f3a354':'#e5c783';
                    if(this.weaponPath==='heavy')bullet.size=7;
                    bullet.life=this.attackRange/(this.bulletSpeed*60);
                }
                this.muzzleFlash = this.weaponType==='fireball'?.12:this.weaponType==='shotgun'?.09:.035;
            }
        }

        if (this.audio) this.audio.weaponShoot(this.weaponType||'rifle',this.weaponPath);
        if(['rifle','shotgun','pistol'].includes(this.weaponType) && particleManager.spawnCasing) particleManager.spawnCasing(this.x,this.y,this.aimAngle);
    }

    update(deltaTime, enemies, bulletManager, particleManager, terrainTime = null) {
        const startX=this.x,startY=this.y;
        const ground=terrainTime===null?null:WoodlandScene.surfaceAt(this.x,this.y,terrainTime);
        const terrainSpeed=ground?.speed ?? 1;
        this.animTimer += deltaTime;
        if(this.blinkTrace){this.blinkTrace.life-=deltaTime;if(this.blinkTrace.life<=0)this.blinkTrace=null;}
        this.recoilTimer = Math.max(0, this.recoilTimer - deltaTime);
        this.hurtTimer = Math.max(0, this.hurtTimer - deltaTime);
        if (this.muzzleFlash > 0) this.muzzleFlash -= deltaTime;
        if (this.dashCooldown > 0) { this.dashCooldown -= deltaTime; if (this.dashCooldown < 0) this.dashCooldown = 0; }
        if (this.invincibleTimer > 0) this.invincibleTimer -= deltaTime;
        if (this.comboTimer > 0) { this.comboTimer -= deltaTime; if (this.comboTimer <= 0) this.combo = 0; }

        let moved = false;
        if (this.isDashing) {
            this.walkCycle += deltaTime * 22;
            const dashStep=Math.min(deltaTime,this.dashTimer);
            this.dashTimer -= deltaTime;
            if (this.dashTimer <= 0) this.isDashing = false;
            const dashSpeed = this.speed * this.dashSpeedMultiplier;
            if(this.characterId!=='silver'){
                this.x += this.dashDirection.x * dashSpeed * dashStep * 60;
                this.y += this.dashDirection.y * dashSpeed * dashStep * 60;
            }
            this.afterimageTimer -= deltaTime;
            if (this.afterimageTimer <= 0) {
                this.afterimageTimer = 0.03;
                particleManager.spawnTrail(this.x, this.y + this.size*.5, this.angle, "#d7c68d");
            }
        } else {
            let dx = 0, dy = 0;
            if (this.keys.w || this.touchKeys.w) dy -= 1;
            if (this.keys.s || this.touchKeys.s) dy += 1;
            if (this.keys.a || this.touchKeys.a) dx -= 1;
            if (this.keys.d || this.touchKeys.d) dx += 1;
            if (dx !== 0 && dy !== 0) { const len = Math.sqrt(dx * dx + dy * dy); dx /= len; dy /= len; }
            if (dx !== 0 || dy !== 0) this.angle = Math.atan2(dy, dx);
            this.x += dx * this.speed * terrainSpeed * deltaTime * 60;
            this.y += dy * this.speed * terrainSpeed * deltaTime * 60;
            if (dx !== 0 || dy !== 0) {
                moved = true;
                // Gait is advanced below using a blended locomotion weight;
            }
        }

        if(terrainTime!==null)ForestMap.resolve(this,startX,startY);
        this.moving = (moved || this.isDashing)&&Math.hypot(this.x-startX,this.y-startY)>.01;
        this.runBlend += ((this.moving ? 1 : 0) - this.runBlend) * (1-Math.exp(-deltaTime*16));
        if (!this.isDashing) this.walkCycle += deltaTime * 13 * this.runBlend * terrainSpeed;
        const aimTarget = this.findNearestEnemy(enemies);
        if (aimTarget) this.aimAngle = Utils.angle(this.x, this.y, aimTarget.x, aimTarget.y);
        else if (this.moving) this.aimAngle = this.angle;
        this.trailTimer -= deltaTime;
        if (this.moving && this.trailTimer <= 0) {
            this.trailTimer = 0.16;
            if(!ground)particleManager.spawnTrail(this.x, this.y + this.size * 0.65, this.angle, '#c9bd90');
        }

        if(!this.isDashing)this.autoAttack(deltaTime, enemies, bulletManager, particleManager);
        this.chargeLevel=(this.weaponPath==='heavy'||this.weaponType==='fireball')&&this.findNearestEnemy(enemies)?Math.max(0,1-this.attackTimer/.4):0;
    }

    draw(ctx, cameraX, cameraY) {
        ForestArt.player(ctx, this, cameraX, cameraY);
    }

    reset(x, y) {
        this.weaponPath=null;this.chargeLevel=0;
        this.blastRadius=65;
        const cfg = Config.PLAYER;
        this.x = x;
        this.y = y;
        this.maxHp = cfg.maxHp;
        this.hp = cfg.maxHp;
        this.speed = cfg.speed;
        this.attackSpeed = cfg.attackSpeed;
        this.attackRange = cfg.attackRange;
        this.bulletDamage = cfg.bulletDamage;
        this.bulletSpeed = cfg.bulletSpeed;
        this.bulletCount = cfg.bulletCount;
        this.pierce = cfg.pierce;
        this.critRate = cfg.critRate;
        this.critDamage = cfg.critDamage;
        this.magnetRange = cfg.magnetRange;
        this.expMultiplier = cfg.expMultiplier;
        this.dashCooldown = 0;
        this.dashCooldownMax = cfg.dashCooldown;
        this.level = 1;
        this.exp = 0;
        this.expToNext = Config.getExpForLevel(1);
        this.gold = 0;
        this.kills = 0;
        this.bossKills = 0;
        this.upgradeCount = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.shield = 0;
        this.angle = -Math.PI / 2;
        this.isDashing = false;this.blinkTrace=null;
        this.invincibleTimer = 0;
        this.aimAngle = 0;
        this.recoilTimer = 0;
        this.hurtTimer = 0;
        this.moving = false;
        this.runBlend = 0;
        this.walkCycle = 0;
        this.muzzleFlash = 0;
        this.animTimer = 0;
        // 技能属性重置
        this._spreadAngle = null;
        this._dualWieldDirections = 0;
        this._overheat = null;
        this._overheatStacks = 0;
        this._overheatTimer = 0;
        this._pierceDmgBonus = 0;
        this._bounce = null;
        this._splitter = null;
        this._turrets = null;
        this._mines = null;
    }
}

if (typeof window !== 'undefined') {
    window.Player = Player;
}
