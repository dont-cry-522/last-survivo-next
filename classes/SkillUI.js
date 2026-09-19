/**
 * ============================================================
 *  SkillUI.js - 技能选择界面渲染
 * ============================================================
 *  绘制升级时展示的技能卡片，支持：
 *    - 4 张卡片布局
 *    - 稀有度颜色边框
 *    - 进化进度条（复选时）
 *    - 联动提示
 *    - 键盘/鼠标选择
 *    - 动画淡入
 * ============================================================
 */

class SkillUI {
    constructor() {
        this.isVisible = false;
        this.choices = [];
        this.selectedIndex = 0;
        this.skillManager = null;

        // 动画
        this.alpha = 0;
        this.scale = 0.85;
        this.animationSpeed = 0.12;

        // 布局
        this.cardWidth = 210;
        this.cardHeight = 330;
        this.cardGap = 25;
        this.cardRadius = 12;
    }

    /**
     * 绑定技能管理器
     */
    bind(skillManager) {
        this.skillManager = skillManager;
    }

    /**
     * 打开选择面板
     * @param {Array} choices - 来自 skillManager.generateChoices()
     */
    open(choices) {
        this.choices = choices;
        this.isVisible = true;
        this.selectedIndex = 0;
        this.alpha = 1;
        this.scale = 1;
    }

    /**
     * 关闭面板
     */
    close() {
        this.isVisible = false;
        this.choices = [];
    }

    /**
     * 更新动画
     */
    update(deltaTime) {
        if (this.isVisible) {
            this.alpha = Math.min(1, this.alpha + this.animationSpeed * deltaTime * 60);
            this.scale = Utils.lerp(this.scale, 1, 0.08 * deltaTime * 60);
        }
    }

    /**
     * 键盘操作
     */
    handleKey(key) {
        if (!this.isVisible) return;

        switch (key.toLowerCase()) {
            case 'arrowleft':
            case 'a':
                this.selectedIndex = Math.max(0, this.selectedIndex - 1);
                break;
            case 'arrowright':
            case 'd':
                this.selectedIndex = Math.min(this.choices.length - 1, this.selectedIndex + 1);
                break;
            case 'enter':
            case ' ':
                return this._selectCurrent();
            case '1':
                return this._selectIndex(0);
            case '2':
                return this._selectIndex(1);
            case '3':
                return this._selectIndex(2);
            case '4':
                return this._selectIndex(3);
        }
        return null;
    }

    /**
     * 鼠标点击选择
     * @returns {string|null} 选中的 skillId
     */
    handleClick(mouseX, mouseY, canvasWidth, canvasHeight) {
        if (!this.isVisible) return null;

        const totalWidth = this.cardWidth * this.choices.length + this.cardGap * (this.choices.length - 1);
        const startX = (canvasWidth - totalWidth) / 2;
        const startY = (canvasHeight - this.cardHeight) / 2;

        // Reroll button
        if (this.skillManager && this.skillManager.rerollsRemaining > 0) {
            const btnW = 120, btnH = 30;
            const btnX = canvasWidth / 2 - btnW / 2;
            const btnY = startY + this.cardHeight + 20;
            if (mouseX >= btnX && mouseX <= btnX + btnW && mouseY >= btnY && mouseY <= btnY + btnH) {
                const newChoices = this.skillManager.reroll();
                if (newChoices) this.open(newChoices);
                return null;
            }
        }

        for (let i = 0; i < this.choices.length; i++) {
            const cx = startX + i * (this.cardWidth + this.cardGap);
            if (mouseX >= cx && mouseX <= cx + this.cardWidth &&
                mouseY >= startY && mouseY <= startY + this.cardHeight) {
                return this._selectIndex(i);
            }
        }
        return null;
    }

    static describeChoice(choice) {
        const current=choice.instance?.getCurrentEffect();
        const next=choice.evolution || choice.config.tiers[0];
        return {before:current?.desc||'尚未获得',after:next?.desc||choice.config.description,
            label:current?`第 ${choice.instance.currentTier} 阶 → 第 ${choice.evolution?.tier||choice.instance.currentTier+1} 阶`:'新技能 · 第 1 阶'};
    }

    _selectIndex(index) {
        if (index < 0 || index >= this.choices.length) return null;
        this.selectedIndex = index;
        return this._selectCurrent();
    }

    _selectCurrent() {
        const choice = this.choices[this.selectedIndex];
        if (!choice) return null;
        return choice.config.id;
    }

    // ================================================================
    //  渲染
    // ================================================================

    draw(ctx, canvasWidth, canvasHeight) {
        if (!this.isVisible) return;

        ctx.save();
        ctx.globalAlpha = this.alpha;

        // 遮罩
        ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        const totalWidth = this.cardWidth * this.choices.length + this.cardGap * (this.choices.length - 1);
        const startX = (canvasWidth - totalWidth) / 2;
        const startY = (canvasHeight - this.cardHeight) / 2;

        // 标题
        ctx.fillStyle = '#e7cd94';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'rgba(0, 212, 255, 0.7)';
        ctx.fillText('等级提升!', canvasWidth / 2, startY - 45);
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        const lvText = this.skillManager
            ? `已掌握 ${this.skillManager.getSkillCount()} 种技能 · 选择一项成长`
            : '选择技能';
        ctx.fillText(lvText, canvasWidth / 2, startY - 18);

        // 流派分布条
        this._drawCategoryBar(ctx, canvasWidth, startY - 8);

        // 卡片
        for (let i = 0; i < this.choices.length; i++) {
            this._drawCard(ctx, i, startX, startY, totalWidth);
        }

        // 刷新按钮
        this._drawRerollButton(ctx, canvasWidth, startY + this.cardHeight + 20);

        // 底部提示
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '13px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('A/D 或 ← → 选择    Enter 确认    1~4 快速选择', canvasWidth / 2, canvasHeight - 40);

        ctx.restore();
    }

    _drawCard(ctx, index, startX, startY, totalWidth) {
        const choice = this.choices[index];
        const config = choice.config;
        const isSelected = index === this.selectedIndex;
        const rarityColor = SkillRarity.getColor(config.rarity);

        const cx = startX + index * (this.cardWidth + this.cardGap);
        const cy = startY;
        const centerX = cx + this.cardWidth / 2;
        const centerY = cy + this.cardHeight / 2;

        ctx.save();

        // 选中缩放
        const scale = this.scale * (isSelected ? 1.015 : 1);
        ctx.translate(centerX, centerY);
        ctx.scale(scale, scale);
        ctx.translate(-centerX, -centerY);

        // 选中发光
        if (isSelected) {
            ctx.shadowBlur = 8;
            ctx.shadowColor = rarityColor;
        }

        // 卡片背景
        ctx.fillStyle = '#24382b';
        ctx.strokeStyle = rarityColor;
        ctx.lineWidth = isSelected ? 3 : 1.5;

        Utils.roundRect ? Utils.roundRect(ctx, cx, cy, this.cardWidth, this.cardHeight, this.cardRadius)
            : this._roundRect(ctx, cx, cy, this.cardWidth, this.cardHeight, this.cardRadius);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 稀有度标签
        ctx.fillStyle = rarityColor;
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(SkillRarity.getName(config.rarity), centerX, cy + 22);

        // 流派色线
        const catColor = SkillCategory.getColor(config.category);
        ctx.strokeStyle = catColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx + 15, cy + 35);
        ctx.lineTo(cx + this.cardWidth - 15, cy + 35);
        ctx.stroke();

        // 图标（使用首字符或自定义）
        ctx.fillStyle = catColor;
        ctx.font = '42px Arial';
        ctx.fillText(this._getSkillIcon(config), centerX, cy + 90);

        // 技能名
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px Arial';
        ctx.fillText(config.name, centerX, cy + 130);

        const detail=SkillUI.describeChoice(choice);
        ctx.font='bold 13px Arial';ctx.fillStyle=catColor;
        ctx.fillText(detail.label,centerX,cy+153);
        ctx.textAlign='left';ctx.font='12px Arial';ctx.fillStyle='#aeb8a2';
        ctx.fillText('当前',cx+16,cy+177);
        ctx.textAlign='center';this._wrapText(ctx,detail.before,centerX,cy+195,this.cardWidth-32,16);
        ctx.textAlign='left';ctx.fillStyle='#e8d6a5';ctx.font='bold 12px Arial';ctx.fillText('获得后',cx+16,cy+242);
        ctx.textAlign='center';ctx.font='12px Arial';this._wrapText(ctx,detail.after,centerX,cy+260,this.cardWidth-32,16);

        // 快捷键
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.font = '12px Arial';
        ctx.fillText(`[${index + 1}]`, centerX, cy + this.cardHeight - 14);

        ctx.restore();
    }

    _drawCategoryBar(ctx, canvasWidth, y) {
        if (!this.skillManager) return;
        const summary = this.skillManager.getCategorySummary();
        const categories = Object.values(summary);
        if (categories.length === 0) return;

        const barW = 200;
        const barH = 3;
        const barX = canvasWidth / 2 - barW / 2;

        let offset = 0;
        const total = categories.reduce((s, c) => s + c.count, 0);
        for (const cat of categories) {
            const segW = (cat.count / total) * barW;
            ctx.fillStyle = cat.color;
            ctx.fillRect(barX + offset, y, segW, barH);
            offset += segW;
        }
    }

    _drawRerollButton(ctx, canvasWidth, y) {
        if (!this.skillManager || this.skillManager.rerollsRemaining <= 0) return;

        const btnW = 120;
        const btnH = 30;
        const btnX = canvasWidth / 2 - btnW / 2;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        this._roundRect(ctx, btnX, y, btnW, btnH, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`刷新 (剩余 ${this.skillManager.rerollsRemaining})`, canvasWidth / 2, y + 20);
    }

    // ================================================================
    //  辅助
    // ================================================================

    _getSkillIcon(config) {
        const icons = {
            bullet_storm: '🎯',
            inferno: '🔥',
            frost: '❄️',
            storm: '⚡',
            shadow: '🌑',
            bastion: '🛡️',
            reaper: '💀',
            summoner: '🤖',
        };
        return icons[config.category] || '⭐';
    }

    _wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const chars = text.split('');
        let line = '';
        let currentY = y;
        for (let i = 0; i < chars.length; i++) {
            const test = line + chars[i];
            if (ctx.measureText(test).width > maxWidth && i > 0) {
                ctx.fillText(line, x, currentY);
                line = chars[i];
                currentY += lineHeight;
            } else {
                line = test;
            }
        }
        if (line) ctx.fillText(line, x, currentY);
    }

    _roundRect(ctx, x, y, w, h, r) {
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
}

if (typeof window !== 'undefined') {
    window.SkillUI = SkillUI;
}
