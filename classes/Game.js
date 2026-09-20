/**
 * ============================================================
 *  Game.js - 主游戏控制器
 * ============================================================
 *  管理所有游戏系统、主循环、状态切换
 *  包含：相机系统、碰撞检测、敌人生成、难度曲线
 *  游戏状态：start / playing / paused / upgrading / gameover
 *  TODO: 可以加入存档系统（本地存储最高分）
 *  TODO: 可以加入成就系统
 *  TODO: 可以加入难度选择
 *  TODO: 可以加入角色选择
 * ============================================================
 */

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // 画布尺寸
        this.canvas.width = Config.CANVAS_WIDTH;
        this.canvas.height = Config.CANVAS_HEIGHT;

        this.statusSystem = new StatusSystem();
        Enemy._statusSystem = this.statusSystem;

        // 游戏状态: start, playing, paused, upgrading, gameover
        this.state = 'start';

        // 相机
        this.cameraX = 0;
        this.cameraY = 0;
        this.screenShake = 0;
        this.impactKick=null;this.lastImpactAt=-1;

        // 时间
        this.survivalTime = 0;
        this.lastTime = 0;
        this.deltaTime = 0;
        this.fps = 60;
        this.fpsTimer = 0;
        this.fpsFrames = 0;

        // 波次
        this.wave = 1;

        // 敌人生成
        this.spawnTimer = 0;
        this.spawnInterval = Config.DIFFICULTY.spawnIntervalStart;
        this.eliteTimer = Config.DIFFICULTY.eliteInterval;
        this.bossTimer = Config.DIFFICULTY.bossInterval;

        // 难度系数
        this.hpMultiplier = 1;
        this.speedMultiplier = 1;

        // 统计
        this.enemyCount = 0;
        this.bulletCount = 0;

        // 游戏系统
        this.player = null;
        this.enemyManager = null;
        this.bulletManager = null;
        this.boss = null;
        this.particleManager = null;
        this.experienceManager = null;
        this.upgradeManager = null;
        this.uiManager = null;

        // 输入
        this.keys = {};
        this.mouseX = 0;
        this.mouseY = 0;

        // 背景网格偏移
        this.gridOffsetX = 0;
        this.gridOffsetY = 0;

        // 音效接口预留
        this.audio = null;

        this.init();
    }

    /**
     * 初始化游戏系统
     */
    init() {
        // 音效系统（需要用户交互后初始化）
        this.audio = new SoundManager();

        // 创建各个管理器
        this.particleManager = new ParticleManager(Config.PARTICLES.maxCount);
        this.bulletManager = new BulletManager(200);
        this.enemyManager = new EnemyManager(500);
        this.experienceManager = new ExperienceManager(300);
        this.upgradeManager = new UpgradeManager();
        this.uiManager = new UIManager();
        this.skillManager = new SkillManager();
        this.skillUI = new SkillUI();
        this.skillUI.bind(this.skillManager);
        this.boss = new Boss();
        this.boss.audio = this.audio;

        // 创建玩家
        this.player = new Player(0, 0);
        this.player.audio = this.audio;
        this.player._onShieldHit=()=>this.skillManager.visuals.emit('pickup',this.player.x,this.player.y,{radius:42,color:'#b4d3b5',duration:.28});
        this.player._onDamaged = (amount) => {
            this.skillManager.trigger(SkillEffectType.ON_DAMAGED, { amount, player: this.player, game: this, enemies: this.enemyManager.getActiveEnemies() });
        };
        this.player._onDash = () => {
            this.skillManager.trigger(SkillEffectType.ON_DASH, { player: this.player, particleManager: this.particleManager, enemies: this.enemyManager.getActiveEnemies(), dashDirection: this.player.dashDirection });
        };

        // 绑定事件
        this.bindEvents();

        // 开始主循环
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    /**
     * 绑定输入事件
     */
    bindEvents() {
        // 键盘
        window.addEventListener('keydown', (e) => {
            this.onKeyDown(e.key.toLowerCase());
            // 阻止方向键滚动页面
            if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.onKeyUp(e.key.toLowerCase());
        });

        // 鼠标与触摸共用画布坐标；CSS 缩放不改变游戏世界。
        const updatePointer = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = (e.clientX - rect.left) * this.canvas.width / rect.width;
            this.mouseY = (e.clientY - rect.top) * this.canvas.height / rect.height;
        };

        this.canvas.addEventListener('mousemove', (e) => {
            updatePointer(e);
        });

        this.canvas.addEventListener('click', (e) => {
            updatePointer(e);
            this.onClick();
        });
    }

    /**
     * 按键按下
     */
    onKeyDown(key) {
        // 全局按键
        if (key === 'escape') {
            this.togglePause();
            return;
        }
        if (key === 'r') {
            this.restart();
            return;
        }
        if (key === 'm') {
            this.audio.toggleMute();
            return;
        }

        // 升级面板中
        if (this.state === 'upgrading') {
            const selected = this.skillUI.handleKey(key);
            if (selected) {
                this.skillManager.acquire(selected, { survivalTime: this.survivalTime, player: this.player });
                this.skillUI.close();
                this.state = 'playing';
            }
            return;
        }

        // 开始界面
        if (this.state === 'start') {
            if(['1','2','3'].includes(key)) this.loadout?.select(['rifle','shotgun','fireball'][Number(key)-1]);
            if (key === 'enter' || key === ' ') {
                this.startGame();
            }
            return;
        }

        // 游戏结束
        if (this.state === 'gameover') {
            return;
        }

        // 暂停中
        if (this.state === 'paused') {
            return;
        }

        // 游戏中 - 玩家输入
        this.player.onKeyDown(key);
    }

    /**
     * 按键抬起
     */
    onKeyUp(key) {
        this.player.onKeyUp(key);
    }

    /**
     * 鼠标点击
     */
    onClick() {
        this.audio.init();
        if (this.state === 'start') {
            // 检查是否点击开始按钮
            const btnW = 200, btnH = 60;
            const btnX = this.canvas.width / 2 - btnW / 2;
            const btnY = this.canvas.height / 2 + 20;
            if (this.mouseX >= btnX && this.mouseX <= btnX + btnW &&
                this.mouseY >= btnY && this.mouseY <= btnY + btnH) {
                this.startGame();
            }
            return;
        }

        if (this.state === 'upgrading') {
            const selected = this.skillUI.handleClick(
                this.mouseX, this.mouseY,
                this.canvas.width, this.canvas.height
            );
            if (selected) {
                this.skillManager.acquire(selected, { survivalTime: this.survivalTime, player: this.player });
                this.skillUI.close();
                this.state = 'playing';
            }
            return;
        }

        if (this.state === 'gameover') {
            // 检查重新开始按钮
            const btnW = 180, btnH = 50;
            const btnX = this.canvas.width / 2 - btnW / 2;
            const btnY = this.canvas.height / 2 + 225;
            if (this.mouseX >= btnX && this.mouseX <= btnX + btnW &&
                this.mouseY >= btnY && this.mouseY <= btnY + btnH) {
                this.restart();
            }
            return;
        }
    }

    /**
     * 开始游戏
     */
    startGame() {
        this.audio.init();
        this.audio.gameStart();
        this.resetGame();
        this.state = 'playing';
    }

    /**
     * 重置游戏
     */
    resetGame() {
        // 重置玩家
        this.player.reset(0, 0);
        this.player.setWeapon(this.selectedWeapon||'rifle');
        if(this.loadout) this.loadout.hide();

        // 重置管理器
        this.enemyManager.clear();
        this.bulletManager.clear();
        this.experienceManager.clear();
        this.particleManager = new ParticleManager(Config.PARTICLES.maxCount);

        // 重置Boss
        this.boss.active = false;

        // 重置时间
        this.survivalTime = 0;
        this.spawnTimer = 0;
        this.spawnInterval = Config.DIFFICULTY.spawnIntervalStart;
        this.eliteTimer = Config.DIFFICULTY.eliteInterval;
        this.bossTimer = Config.DIFFICULTY.bossInterval;

        // 重置难度
        this.hpMultiplier = 1;
        this.speedMultiplier = 1;
        this.wave = 1;

        // 重置相机
        this.cameraX = 0;
        this.cameraY = 0;
        this.screenShake = 0;
        this.impactKick=null;this.lastImpactAt=-1;

        // 重置UI
        this.uiManager.reset();
        this.skillManager.reset();
        this.skillUI.close();
        this._announced = {};
        this._announcements = [];
        this.statusSystem = new StatusSystem();
        Enemy._statusSystem = this.statusSystem;
    }

    /**
     * 重新开始
     */
    restart() {
        this.resetGame();
        this.state = 'playing';
    }

    /**
     * 切换暂停
     */
    togglePause() {
        if (this.state === 'playing') {
            this.state = 'paused';
            this.audio.pause();
        } else if (this.state === 'paused') {
            this.state = 'playing';
            this.audio.resume();
        }
    }

    /**
     * 主游戏循环
     */
    gameLoop(currentTime) {
        // 计算deltaTime
        this.deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // 限制最大deltaTime（防止切屏后大跳）
        if (this.deltaTime > 0.1) this.deltaTime = 0.1;

        // FPS计算
        this.fpsTimer += this.deltaTime;
        this.fpsFrames++;
        if (this.fpsTimer >= 0.5) {
            this.fps = this.fpsFrames / this.fpsTimer;
            this.fpsTimer = 0;
            this.fpsFrames = 0;
        }

        if (this.mobileControls) this.mobileControls.update();
        this.skillInventory?.update();
        this.audio.music?.update(this.state);

        // 更新
        if (this.state === 'playing') {
            this.update(this.deltaTime);
        } else if (this.state === 'upgrading') {
            this.skillUI.update(this.deltaTime);
        }

        // UI动画始终更新
        this.uiManager.update(this.deltaTime, this.player, this.state);

        // 公告更新
        if (this._announcements) {
            for (let i = this._announcements.length - 1; i >= 0; i--) {
                this._announcements[i].life -= this.deltaTime;
                if (this._announcements[i].life <= 0) this._announcements.splice(i, 1);
            }
        }

        // 渲染
        this.render();

        // 继续循环
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    /**
     * 更新游戏逻辑
     */
    update(deltaTime) {
        if(this.impactKick){this.impactKick.life-=deltaTime;if(this.impactKick.life<=0)this.impactKick=null;}
        // 存活时间
        this.survivalTime += deltaTime;

        // 难度递增
        this.updateDifficulty(deltaTime);

        // 敌人生成
        this.updateSpawning(deltaTime);

        // 更新玩家
        const enemies = this.enemyManager.getActiveEnemies();
        if (this.boss.active) enemies.push(this.boss);

        this.player.update(deltaTime, enemies, this.bulletManager, this.particleManager, this.survivalTime);

        // 更新子弹
        this.bulletManager.update(deltaTime, enemies, this.particleManager);

        // 子弹碰撞检测
        this.checkBulletCollisions();

        const killsBefore = this.player.kills;

        // 更新敌人
        this.enemyManager.update(deltaTime, this.player, this.particleManager, this.experienceManager, this.audio, this.survivalTime);

        // 更新Boss
        if (this.boss.active) {
            this.boss.update(deltaTime, this.player, this.particleManager, this);
            if (this.boss.hp <= 0) {
                this.boss.die(this.particleManager, this.experienceManager, this);
                this.player.addKill(true);
                this.screenShake = Math.max(this.screenShake, 20);
                this.audio.bossDead();
            }
        }

        // 技能进化追踪：击杀
        const newKills = this.player.kills - killsBefore;
        for (let k = 0; k < newKills; k++) {
            this.skillManager.trackKill();
        }
        if (newKills > 0) {
            this.skillManager.trigger(SkillEffectType.ON_KILL, { count: newKills, player: this.player, enemies: this.enemyManager.getActiveEnemies(), particleManager: this.particleManager, bulletManager: this.bulletManager });
        }

        // 更新经验球
        const leveledUp = this.experienceManager.update(deltaTime, this.player, this.particleManager);

        // 技能周期效果
        this.skillManager.update(deltaTime, {
            player: this.player,
            enemies: this.enemyManager.getActiveEnemies(),
            bulletManager: this.bulletManager,
            particleManager: this.particleManager,
        });

        // 检查升级
        if (leveledUp || this.player.exp >= this.player.expToNext) {
            while (this.player.exp >= this.player.expToNext) {
                this.player.exp -= this.player.expToNext;
                this.player.level++;
                this.player.expToNext = Config.getExpForLevel(this.player.level);
            }
            this.triggerUpgrade();
        }

        // 更新粒子
        this.particleManager.update(deltaTime);

        // 更新相机
        this.updateCamera(deltaTime);

        // 震屏衰减
        if (this.screenShake > 0) {
            this.screenShake = Utils.shake(this.screenShake, 0.92, deltaTime);
            if (this.screenShake < 0.1) this.screenShake = 0;
        }

        // 更新统计
        this.enemyCount = this.enemyManager.getActiveCount() + (this.boss.active ? 1 : 0);
        this.bulletCount = this.bulletManager.getActiveCount();

        // 检查游戏结束
        if (this.player.hp <= 0) {
            this.gameOver();
        }
    }

    /**
     * 难度曲线更新
     */
    updateDifficulty(deltaTime) {
        // 生成间隔逐渐缩短
        this.spawnInterval = Math.max(
            Config.DIFFICULTY.spawnIntervalMin,
            Config.DIFFICULTY.spawnIntervalStart - this.survivalTime * Config.DIFFICULTY.spawnRateIncrease
        );

        // 敌人属性逐渐增强
        this.hpMultiplier = 1 + this.survivalTime * Config.DIFFICULTY.enemyHpMultiplier;
        this.speedMultiplier = 1 + this.survivalTime * Config.DIFFICULTY.enemySpeedMultiplier;

        // 波次（每30秒一波）
        this.wave = Math.floor(this.survivalTime / 30) + 1;
    }

    /**
     * 敌人生成
     */
    updateSpawning(deltaTime) {
        // 普通敌人
        this.spawnTimer -= deltaTime;
        if (this.spawnTimer <= 0) {
            this.spawnTimer = this.spawnInterval;
            this.spawnEnemy();
        }

        // 精英怪
        this.eliteTimer -= deltaTime;
        if (this.eliteTimer <= 0) {
            this.eliteTimer = Config.DIFFICULTY.eliteInterval;
            this.spawnElite();
        }

        // Boss
        this.bossTimer -= deltaTime;
        if (this.bossTimer <= 0) {
            this.bossTimer = Config.DIFFICULTY.bossInterval;
            this.spawnBoss();
        }
    }

    /**
     * 生成普通敌人
     */
    spawnEnemy() {
        const types = ['normal'];
        if (this.survivalTime > 30) types.push('fast');
        if (this.survivalTime > 60) types.push('tank');
        if (this.survivalTime > 90) types.push('exploder');

        // 波次公告
        this._checkWaveAnnounce();

        const type = Utils.randomChoice(types);
        const pos = Utils.spawnPositionAround(
            this.player.x, this.player.y,
            this.canvas.width, this.canvas.height
        );

        this.enemyManager.spawn(type, pos.x, pos.y, this.hpMultiplier, this.speedMultiplier);
    }

    _checkWaveAnnounce() {
        if (!this._announced) this._announced = {};
        if (this.survivalTime > 30 && !this._announced.fast) {
            this._announced.fast = true; this._announce('灰爪兽 出现了！', '#c8c0b8');
        }
        if (this.survivalTime > 60 && !this._announced.tank) {
            this._announced.tank = true; this._announce('岩甲兽 出现了！', '#c8b898');
        }
        if (this.survivalTime > 90 && !this._announced.exploder) {
            this._announced.exploder = true; this._announce('爆燃菇 出现了！', '#ff6600');
        }
    }

    _announce(text, color) {
        if (!this._announcements) this._announcements = [];
        this._announcements.push({ text, color, life: 3 });
    }

    /**
     * 生成精英怪
     */
    spawnElite() {
        this._announce('岩冠督军 出现了！', '#44ccdd');
        const pos = Utils.spawnPositionAround(
            this.player.x, this.player.y,
            this.canvas.width, this.canvas.height
        );
        this.enemyManager.spawn('elite', pos.x, pos.y, this.hpMultiplier * 2, this.speedMultiplier);
        // 精英出现警告
        // TODO: 屏幕边缘警告箭头
    }

    /**
     * 生成Boss
     */
    spawnBoss() {
        if (this.boss.active) return;
        this._announce('BOSS 出现了！', '#ee5253');

        const pos = Utils.spawnPositionAround(
            this.player.x, this.player.y,
            this.canvas.width, this.canvas.height
        );
        const bossIndex = Math.floor(this.survivalTime / Config.DIFFICULTY.bossInterval);
        this.boss.init(pos.x, pos.y, this.hpMultiplier * (1 + bossIndex * 0.5));
        this.screenShake = Math.max(this.screenShake, 15);
        this.audio.bossAppear();
    }

    /**
     * 子弹碰撞检测
     */
    checkBulletCollisions() {
        const bullets = this.bulletManager.pool;
        const enemies = this.enemyManager.pool;

        for (let i = 0; i < bullets.length; i++) {
            const bullet = bullets[i];
            if (!bullet.active) continue;

            // 检测普通敌人
            for (let j = 0; j < enemies.length; j++) {
                const enemy = enemies[j];
                if (!enemy.active) continue;

                if (bullet.touches(enemy)) {
                    if (bullet.onHit(enemy, this.particleManager)) {
                        this.audio.beginImpact?.();
                        const dead = enemy.takeDamage(bullet.damage,
                            Utils.angle(bullet.x, bullet.y, enemy.x, enemy.y));
                        this.applyWeaponImpact(bullet,enemy);

                        this.enemyManager.addImpact(enemy.x,enemy.y,bullet.weaponType==='shotgun'?'shotgun-hit':bullet.weaponType==='fireball'?'ember-hit':['tank','elite'].includes(enemy.type)?'armor-hit':'rifle-hit',Math.atan2(bullet.vy,bullet.vx));
                        this.uiManager.addDamageNumber(
                            enemy.x, enemy.y - enemy.size,
                            bullet.damage, bullet.isCrit
                        );

                        if (bullet.generation === 0) {
                            if (bullet.isCrit) {
                                this.skillManager.trigger(SkillEffectType.ON_CRIT, { bullet, enemy, enemies: this.enemyManager.pool, bulletManager: this.bulletManager, particleManager: this.particleManager });
                            }
                        }

                        if (enemy.type === 'elite') {
                            this.skillManager.trackEliteHit();
                        }

                        if (bullet.generation === 0) {
                            this.skillManager.trigger(SkillEffectType.ON_HIT, {
                                bullet, enemy,
                                enemies: this.enemyManager.pool,
                                bulletManager: this.bulletManager,
                                particleManager: this.particleManager,
                            });
                        }
                        this.audio.endImpact?.();
                    }
                    if (!bullet.active) break;
                }
            }

            // 检测Boss
            if (bullet.active && this.boss.active) {
                if (bullet.touches(this.boss)) {
                    if (bullet.onHit(this.boss, this.particleManager)) {
                        this.boss.takeDamage(bullet.damage);
                        this.applyWeaponImpact(bullet,this.boss);
                        this.uiManager.addDamageNumber(
                            this.boss.x, this.boss.y - this.boss.size,
                            bullet.damage, bullet.isCrit
                        );
                    }
                }
            }
        }
    }

    /**
     * 触发升级
     */
    applyWeaponImpact(bullet,primary) {
        if((bullet.weaponType==='shotgun'||bullet.weaponType==='fireball'||bullet.isCrit) && (this.survivalTime||0)-(this.lastImpactAt??-1)>.12){
            this.lastImpactAt=this.survivalTime||0;this.impactKick={life:.09,angle:Math.atan2(bullet.vy,bullet.vx),strength:bullet.weaponType==='shotgun'?2.8:2};
        }
        if(bullet.weaponType==='fireball' ? !bullet.exploded : bullet.generation===0) {
            if(bullet.soundKind)this.audio.skillCue(bullet.soundKind);
            else this.audio.weaponImpact(bullet.weaponType||'rifle',bullet.isCrit,primary.type);
        }
        if(bullet.weaponType==='shotgun') {
            const angle=Math.atan2(bullet.vy,bullet.vx);
            if(primary!==this.boss) {primary.knockbackX+=Math.cos(angle)*3;primary.knockbackY+=Math.sin(angle)*3;}
        }
        if(bullet.weaponType!=='fireball'||bullet.exploded) return;
        bullet.exploded=true;
        this.enemyManager.addImpact(bullet.x,bullet.y,'burst',0,65);
        this.particleManager.spawnExplosion(bullet.x,bullet.y,'#edaa55',12);
        for(const enemy of this.enemyManager.pool) {
            if(!enemy.active||enemy.hp<=0||!Utils.circleCollision(bullet.x,bullet.y,65,enemy.x,enemy.y,enemy.size))continue;
            if(enemy!==primary) {
                enemy.takeDamage(bullet.damage*.6,Utils.angle(bullet.x,bullet.y,enemy.x,enemy.y));
                this.uiManager.addDamageNumber(enemy.x,enemy.y-enemy.size,bullet.damage*.6,false);
            }
            this.statusSystem.applyBurn(enemy,Math.max(1,enemy.burnStacks),Math.max(enemy.burnDmgPerStack,bullet.damage*.12),2);
        }
        if(this.boss.active && this.boss!==primary && Utils.circleCollision(bullet.x,bullet.y,65,this.boss.x,this.boss.y,this.boss.size))this.boss.takeDamage(bullet.damage*.6);
    }

    triggerUpgrade() {
        this.state = 'upgrading';
        this.player.keys.w = this.player.keys.a = this.player.keys.s = this.player.keys.d = this.player.keys.shift = false;
        const choices = this.skillManager.generateChoices(4);
        this.skillUI.open(choices);
    }

    /**
     * 游戏结束
     */
    gameOver() {
        this.state = 'gameover';
        this.audio.gameOver();
    }

    /**
     * 更新相机（跟随玩家）
     */
    updateCamera(deltaTime) {
        const targetX = this.player.x - this.canvas.width / 2;
        const targetY = this.player.y - this.canvas.height / 2;

        // 平滑跟随
        this.cameraX = Utils.lerp(this.cameraX, targetX, 0.1 * deltaTime * 60);
        this.cameraY = Utils.lerp(this.cameraY, targetY, 0.1 * deltaTime * 60);
    }

    /**
     * 渲染
     */
    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // 震屏偏移
        let shakeX = 0, shakeY = 0;
        if (this.screenShake > 0) {
            shakeX = Utils.random(-this.screenShake, this.screenShake);
            shakeY = Utils.random(-this.screenShake, this.screenShake);
        }

        ctx.save();
        const kick=this.impactKick;
        const pulse=kick?Math.sin(kick.life/.09*Math.PI)*kick.strength:0;
        ctx.translate(shakeX+(kick?Math.cos(kick.angle)*pulse:0),shakeY+(kick?Math.sin(kick.angle)*pulse:0));

        // 清空画布
        ctx.fillStyle = Config.COLORS.background;
        ctx.fillRect(0, 0, w, h);

        // 开始界面
        if (this.state === 'start') {
            this.uiManager.drawStartScreen(ctx, w, h);
            ctx.restore();
            return;
        }

        // 绘制背景网格
        this.drawGrid(ctx);

        // 相机变换
        ctx.save();

        // 绘制经验球（底层）
        this.experienceManager.draw(ctx, this.cameraX, this.cameraY);

        // 绘制粒子
        this.particleManager.draw(ctx, this.cameraX, this.cameraY);

        // Ground effects sit below feet; actors overlap according to world Y.
        this.skillManager.drawSkillVisuals(ctx, this.cameraX, this.cameraY, this.player);
        WoodlandScene.drawFooting(ctx,this.player,this.cameraX,this.cameraY,this.survivalTime,this.player.moving);
        for(const enemy of this.enemyManager.pool){
            if(enemy.active)WoodlandScene.drawFooting(ctx,enemy,this.cameraX,this.cameraY,this.survivalTime,enemy.combatState==='approach'&&!enemy.frozen&&!enemy.paralyzed);
        }
        if(this.boss.active)WoodlandScene.drawFooting(ctx,this.boss,this.cameraX,this.cameraY,this.survivalTime,!this.boss.spawnWarning);
        this.enemyManager.draw(ctx, this.cameraX, this.cameraY, this.player, this.boss);

        // 绘制子弹（顶层）
        this.bulletManager.draw(ctx, this.cameraX, this.cameraY);
        WoodlandScene.drawPlayerStatus(ctx,this.player,this.cameraX,this.cameraY,this.survivalTime);

        ctx.restore();

        WoodlandScene.foreground(ctx,w,h,this.survivalTime);
        ctx.save();ctx.font='16px "Microsoft YaHei"';ctx.fillStyle='#e2d2a9';ctx.fillText(WoodlandScene.THEMES[WoodlandScene.phase(this.survivalTime)].name,20,h-18);ctx.restore();
        // 波次公告
        if (this._announcements) {
            for (const a of this._announcements) {
                const alpha = Math.min(1, a.life);
                ctx.save(); ctx.globalAlpha = alpha;
                ctx.fillStyle = a.color; ctx.font = 'bold 28px Arial'; ctx.textAlign = 'center';
                ctx.shadowBlur = 10; ctx.shadowColor = a.color;
                ctx.fillText(a.text, w / 2, h / 2 - 50);
                ctx.restore();
            }
        }

        // ===== 屏幕空间UI =====

        // Boss血条
        if (this.boss.active) {
            this.boss.drawHealthBar(ctx, w);
        }

        // HUD
        this.uiManager.drawHUD(ctx, this.player, this, w, h);

        // 升级面板
        if (this.state === 'upgrading') {
            this.skillUI.draw(ctx, w, h);
        }

        // 暂停界面
        if (this.state === 'paused') {
            this.uiManager.drawPauseScreen(ctx, w, h);
        }

        // 游戏结束界面
        if (this.state === 'gameover') {
            this.uiManager.drawGameOverScreen(ctx, this.player, this, w, h);
        }

        ctx.restore();
    }

    /**
     * 绘制背景网格
     */
    drawGrid(ctx) {
        WoodlandScene.draw(ctx, this.cameraX, this.cameraY, this.canvas.width, this.canvas.height,this.survivalTime);
    }

}

if (typeof window !== 'undefined') {
    window.Game = Game;
}
