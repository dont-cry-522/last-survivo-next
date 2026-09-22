/**
 * ============================================================
 *  UI.js - 游戏UI渲染
 * ============================================================
 *  HUD：生命值、经验条、等级、金币、击杀数、时间、波数
 *  右上角：FPS、敌人数、Boss状态、升级次数
 *  底部：Dash冷却、当前Buff
 *  游戏结束界面
 *  暂停界面
 *  TODO: 可以加入伤害数字飘字
 *  TODO: 可以加入小地图
 *  TODO: 可以加入技能图标栏
 * ============================================================
 */

class UIManager {
    constructor() {
        // 动画相关
        this.hpSmooth = 1; // 平滑血量显示
        this.expSmooth = 0; // 平滑经验显示

        // 伤害数字列表
        this.damageNumbers = [];

        // 游戏结束动画
        this.gameOverAlpha = 0;
        this.gameOverScale = 0.9;

        // 暂停动画
        this.pauseAlpha = 0;
    }

    /**
     * 添加伤害飘字
     */
    addDamageNumber(x, y, damage, isCrit = false) {
        this.damageNumbers.push({
            x, y,
            damage: Math.floor(damage),
            isCrit,
            life: 1,
            maxLife: 1,
            vy: -2,
        });
    }

    /**
     * 更新UI动画
     */
    update(deltaTime, player, gameState) {
        // 平滑血量
        const hpTarget = player.hp / player.maxHp;
        this.hpSmooth = Utils.lerp(this.hpSmooth, hpTarget, 0.1 * deltaTime * 60);

        // 平滑经验
        const expTarget = player.exp / player.expToNext;
        this.expSmooth = Utils.lerp(this.expSmooth, expTarget, 0.1 * deltaTime * 60);

        // 伤害飘字
        for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
            const dn = this.damageNumbers[i];
            dn.life -= deltaTime;
            dn.y += dn.vy * deltaTime * 60;
            dn.vy *= 0.98;
            if (dn.life <= 0) {
                this.damageNumbers.splice(i, 1);
            }
        }

        // 游戏结束动画
        if (gameState === 'gameover') {
            this.gameOverAlpha = Math.min(1, this.gameOverAlpha + 0.02 * deltaTime * 60);
            this.gameOverScale = Utils.lerp(this.gameOverScale, 1, 0.05 * deltaTime * 60);
        } else {
            this.gameOverAlpha = 0;
            this.gameOverScale = 0.9;
        }

        // 暂停动画
        if (gameState === 'paused') {
            this.pauseAlpha = Math.min(1, this.pauseAlpha + 0.1 * deltaTime * 60);
        } else {
            this.pauseAlpha = Math.max(0, this.pauseAlpha - 0.1 * deltaTime * 60);
        }
    }

    /**
     * 绘制全部HUD
     */
    drawHUD(ctx, player, game, canvasWidth, canvasHeight) {
        this.drawTopLeft(ctx, player, game);
        this.drawTopRight(ctx, player, game);
        this.drawBottom(ctx, player, canvasWidth, canvasHeight);
        this.drawDamageNumbers(ctx, game.cameraX, game.cameraY);
    }

    /**
     * 左上角：生命、经验、等级、金币、击杀、时间、波数
     */
    drawTopLeft(ctx, player, game) {
        if(game.mobileControls?.enabled)return;
        const x=20,y=18,w=282;
        ctx.save();ctx.fillStyle='rgba(24,42,31,.86)';this.roundRect(ctx,x-10,y-8,w+20,108,10);ctx.fill();
        ctx.textAlign='left';ctx.font='bold 14px Arial';ctx.fillStyle='#e7dab6';
        ctx.fillText(`等级 ${player.level}`,x,y+12);ctx.textAlign='right';ctx.fillText(Utils.formatTime(game.survivalTime),x+w,y+12);
        const hp=Math.max(0,Math.min(1,player.hp/player.maxHp));
        ctx.fillStyle='#433d32';ctx.fillRect(x,y+23,w,16);ctx.fillStyle=hp<.3?'#f07760':'#d49a75';ctx.fillRect(x,y+23,w*hp,16);
        ctx.fillStyle='#fff3d8';ctx.textAlign='center';ctx.font='bold 12px Arial';ctx.fillText(`生命 ${Math.ceil(player.hp)} / ${player.maxHp}${player.shield>0?'  护盾 '+Math.ceil(player.shield):''}`,x+w/2,y+35);
        ctx.fillStyle='#354b36';ctx.fillRect(x,y+45,w,5);ctx.fillStyle='#b7cd8b';ctx.fillRect(x,y+45,w*Math.max(0,Math.min(1,this.expSmooth)),5);
        ctx.textAlign='left';ctx.font='12px Arial';ctx.fillStyle='#c8cfb2';ctx.fillText(`第 ${game.wave} 波 · 击败 ${Utils.formatNumber(player.kills)} · 金币 ${Utils.formatNumber(player.gold)}`,x,y+72);
        if(player.combo>1){ctx.fillStyle='#e7c987';ctx.fillText(`连击 ×${player.combo}`,x,y+90);}
        ctx.restore();
    }

    /**
     * 右上角：FPS、敌人数、Boss状态、升级次数
     */
    drawTopRight(ctx, player, game) {
        if(game.mobileControls?.enabled)return;
        const x = game.canvas.width - 24;
        ctx.save(); ctx.textAlign = 'right';
        ctx.fillStyle = '#e1d7b2'; ctx.font = 'bold 16px "Microsoft YaHei", sans-serif';
        ctx.fillText('林地远征', x, 32);
        ctx.fillStyle = '#c4cfad'; ctx.font = '12px "Microsoft YaHei", sans-serif';
        ctx.fillText('存活 · 收集 · 成长', x, 54);
        if (game.boss && game.boss.active) {
            ctx.fillStyle = '#ffc58e'; ctx.fillText('首领正在接近', x, 80);
        }
        ctx.restore();
    }

    /**
     * 底部：Dash冷却、Buff图标
     */
    drawBottom(ctx, player, canvasWidth, canvasHeight) {
        if(document.body.classList.contains('touch-device'))return;
        const centerX = canvasWidth / 2;
        const y = canvasHeight - 65;

        ctx.save();

        // Dash冷却图标
        const iconSize = 40;
        const dashX = centerX - iconSize / 2;
        const dashY = y;

        // 背景圆
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.arc(centerX, dashY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
        ctx.fill();

        // 冷却遮罩
        if (player.dashCooldown > 0) {
            const cooldownPercent = player.dashCooldown / player.dashCooldownMax;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.beginPath();
            ctx.moveTo(centerX, dashY + iconSize / 2);
            ctx.arc(centerX, dashY + iconSize / 2, iconSize / 2,
                -Math.PI / 2,
                -Math.PI / 2 + Math.PI * 2 * cooldownPercent);
            ctx.closePath();
            ctx.fill();
        }

        // 图标
        ctx.fillStyle = player.dashCooldown > 0 ? '#666' : '#d9bb79';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('💨', centerX, dashY + iconSize / 2 + 7);

        // 快捷键提示
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '10px Arial';
        ctx.fillText('SHIFT', centerX, dashY + iconSize + 12);

        // 冷却时间文字
        if (player.dashCooldown > 0) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Arial';
            ctx.fillText(player.dashCooldown.toFixed(1), centerX, dashY + iconSize / 2 + 4);
        }

        // TODO: Buff图标栏（右侧）
        // 可以显示当前获得的增益效果图标

        ctx.restore();
    }

    /**
     * 绘制伤害飘字
     */
    drawDamageNumbers(ctx, cameraX, cameraY) {
        ctx.save();
        ctx.textAlign = 'center';

        for (let i = 0; i < this.damageNumbers.length; i++) {
            const dn = this.damageNumbers[i];
            const alpha = dn.life / dn.maxLife;
            const screenX = dn.x - cameraX;
            const screenY = dn.y - cameraY;

            ctx.globalAlpha = alpha;

            if (dn.isCrit) {
                ctx.font = 'bold 18px Arial';
                ctx.fillStyle = '#ffd700';
                ctx.shadowBlur = 5;
                ctx.shadowColor = '#ffd700';
                ctx.fillText(`${dn.damage}!`, screenX, screenY);
            } else {
                ctx.font = '14px Arial';
                ctx.fillStyle = '#ffffff';
                ctx.shadowBlur = 2;
                ctx.shadowColor = '#000000';
                ctx.fillText(dn.damage, screenX, screenY);
            }
        }

        ctx.restore();
    }

    /**
     * 绘制暂停界面
     */
    drawPauseScreen(ctx, canvasWidth, canvasHeight) {
        if (this.pauseAlpha <= 0) return;

        ctx.save();
        ctx.globalAlpha = this.pauseAlpha;

        // 半透明背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        const cx = canvasWidth / 2;

        // 标题
        ctx.fillStyle = '#d9bb79';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(217, 187, 121, 0.6)';
        ctx.fillText('游戏暂停', cx, 80);
        ctx.shadowBlur = 0;

        // 操作面板
        const panelW = 500;
        const panelH = 300;
        const panelX = cx - panelW / 2;
        const panelY = 110;

        ctx.fillStyle = 'rgba(20, 20, 40, 0.9)';
        ctx.strokeStyle = '#d9bb79';
        ctx.lineWidth = 1.5;
        this.roundRect(ctx, panelX, panelY, panelW, panelH, 10);
        ctx.fill();
        ctx.stroke();

        // 操作说明标题
        ctx.fillStyle = '#d9bb79';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('操作说明', cx, panelY + 28);

        // 操作列表
        const controls = document.body.classList.contains('touch-device') ? [
            { key: '左侧摇杆', desc: '八方向移动' },
            { key: '闪避按钮', desc: '翻滚 / 瞬移（短暂无敌）' },
            { key: '顶部按钮', desc: '暂停 / 继续、重开、静音' },
            { key: '升级卡片', desc: '点击选择技能或刷新选项' },
        ] : [
            { key: 'W A S D', desc: '八方向移动' },
            { key: 'Shift', desc: '翻滚 / 瞬移（短暂无敌）' },
            { key: 'ESC', desc: '暂停 / 继续游戏' },
            { key: 'R', desc: '重新开始游戏' },
            { key: 'M', desc: '静音 / 取消静音' },
            { key: '1 2 3', desc: '升级时直接选择对应选项' },
            { key: '← → + Enter', desc: '升级时方向键选择后确认' },
            { key: '鼠标点击', desc: '选择升级卡片 / 点击按钮' },
        ];

        ctx.textAlign = 'left';
        const startY = panelY + 60;
        const lineHeight = 28;
        const colX = panelX + 30;

        controls.forEach((ctrl, i) => {
            const y = startY + i * lineHeight;
            // 按键
            ctx.fillStyle = '#d9bb79';
            ctx.font = 'bold 13px "Consolas", "Courier New", monospace';
            ctx.fillText(ctrl.key, colX, y);

            // 分隔符
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillText('—', colX + 160, y);

            // 说明
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.font = '13px "Microsoft YaHei", Arial, sans-serif';
            ctx.fillText(ctrl.desc, colX + 190, y);
        });

        // 底部提示
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '15px Arial';
        ctx.fillText('按 ESC 继续游戏', cx, panelY + panelH + 35);
        ctx.fillText('按 R 重新开始', cx, panelY + panelH + 60);

        ctx.restore();
    }

    /**
     * 绘制游戏结束界面
     */
    drawGameOverScreen(ctx, player, game, canvasWidth, canvasHeight) {
        if (this.gameOverAlpha <= 0) return;

        ctx.save();
        ctx.globalAlpha = this.gameOverAlpha;

        // 渐暗背景
        const gradient = ctx.createRadialGradient(
            canvasWidth / 2, canvasHeight / 2, 0,
            canvasWidth / 2, canvasHeight / 2, canvasWidth / 2
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // 缩放中心
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;

        ctx.translate(centerX, centerY);
        ctx.scale(this.gameOverScale, this.gameOverScale);
        ctx.translate(-centerX, -centerY);

        // 游戏结束标题
        ctx.fillStyle = '#ff6b6b';
        ctx.font = 'bold 56px Arial';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 30;
        ctx.shadowColor = 'rgba(255, 107, 107, 0.8)';
        ctx.fillText('游戏结束', centerX, centerY - 120);
        ctx.shadowBlur = 0;

        // 统计面板
        const panelW = 320;
        const panelH = 280;
        const panelX = centerX - panelW / 2;
        const panelY = centerY - 80;

        ctx.fillStyle = 'rgba(20, 20, 40, 0.9)';
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 2;
        this.roundRect(ctx, panelX, panelY, panelW, panelH, 12);
        ctx.fill();
        ctx.stroke();

        // 统计数据
        ctx.fillStyle = '#ffffff';
        ctx.font = '18px Arial';
        ctx.textAlign = 'left';

        const stats = [
            { label: '存活时间', value: Utils.formatTime(game.survivalTime), color: '#d9bb79' },
            { label: '达到等级', value: `Lv.${player.level}`, color: '#7bed9f' },
            { label: '击杀敌人', value: Utils.formatNumber(player.kills), color: '#ff6b6b' },
            { label: '击败Boss', value: player.bossKills.toString(), color: '#ee5253' },
            { label: '升级次数', value: player.upgradeCount.toString(), color: '#a855f7' },
            { label: '最高连杀', value: player.maxCombo.toString(), color: '#ff9ff3' },
            { label: '获得金币', value: Utils.formatNumber(player.gold), color: '#ffd700' },
        ];

        stats.forEach((stat, i) => {
            const sy = panelY + 30 + i * 32;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fillText(stat.label, panelX + 30, sy);
            ctx.fillStyle = stat.color;
            ctx.textAlign = 'right';
            ctx.fillText(stat.value, panelX + panelW - 30, sy);
            ctx.textAlign = 'left';
        });

        // 重新开始按钮
        const btnW = 180;
        const btnH = 50;
        const btnX = centerX - btnW / 2;
        const btnY = panelY + panelH + 25;

        ctx.fillStyle = '#d9bb79';
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(217, 187, 121, 0.6)';
        this.roundRect(ctx, btnX, btnY, btnW, btnH, 8);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('重新开始 (R)', centerX, btnY + 32);

        ctx.restore();
    }

    /**
     * 绘制开始界面
     */
    drawStartScreen(ctx, canvasWidth, canvasHeight) {
        ForestArt.start(ctx, canvasWidth, canvasHeight, performance.now() / 1000);
    }

    /**
     * 圆角矩形辅助
     */
    roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    /**
     * 重置UI状态
     */
    reset() {
        this.damageNumbers = [];
        this.gameOverAlpha = 0;
        this.gameOverScale = 0.9;
        this.pauseAlpha = 0;
        this.hpSmooth = 1;
        this.expSmooth = 0;
    }
}

if (typeof window !== 'undefined') {
    window.UIManager = UIManager;
}
