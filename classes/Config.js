/**
 * ============================================================
 *  Config.js - 游戏全局配置中心
 * ============================================================
 *  所有数值平衡、常量参数集中在这里，方便调优
 *  TODO: 可以扩展为难度配置系统（简单/普通/困难）
 *  TODO: 可以加入存档系统，读取玩家自定义配置
 * ============================================================
 */

class Config {
    // ========== 画布与地图 ==========
    static CANVAS_WIDTH = 1280;
    static CANVAS_HEIGHT = 720;
    static MAP_SIZE = 5000; // 无限地图逻辑边界（实际可超出，用于生成参考）
    static GRID_SIZE = 100; // 背景网格大小

    // ========== 玩家初始属性 ==========
    static PLAYER = {
        maxHp: 120,
        speed: 4,
        attackSpeed: 1.0,      // 每秒攻击次数
        attackRange: 500,      // 自动索敌范围
        bulletDamage: 12,
        bulletSpeed: 8,
        bulletCount: 1,        // 同时发射子弹数
        pierce: 0,             // 穿透数量
        critRate: 0.05,        // 暴击率 5%
        critDamage: 2.0,       // 暴击伤害 200%
        dashCooldown: 2.0,     // 冲刺冷却（秒）
        dashDuration: 0.2,     // 冲刺持续时间
        dashSpeedMultiplier: 3.5, // 冲刺速度倍率
        magnetRange: 140,       // 经验磁铁初始范围
        expMultiplier: 1.0,    // 经验获取倍率
        levelHpBonus: 5,       // 每次升级增加最大生命值
        levelDamageBonus: 1,   // 每次升级增加子弹伤害
        size: 20,              // 玩家碰撞半径
    };

    // ========== 敌人配置 → 已迁移至 EnemyConfig.js ==========

    // ========== Boss配置 ==========
    static BOSS = {
        hp: 2000,
        speed: 1.2,
        damage: 40,
        size: 50,
        exp: 200,
        gold: 100,
        color: '#ee5253',
        glowColor: 'rgba(238, 82, 83, 0.8)',
        chargeSpeed: 6,
        chargeCooldown: 5,
        aoeRadius: 150,
        aoeDamage: 30,
        aoeCooldown: 8,
    };

    // ========== 难度曲线 ==========
    static DIFFICULTY = {
        spawnIntervalStart: 1.8,   // 初始生成间隔（秒）
        spawnIntervalMin: 0.4,     // 最小生成间隔
        spawnRateIncrease: 0.015,  // 每秒生成速率增加
        enemyHpMultiplier: 0.008,  // 每秒敌人血量增加比例
        enemySpeedMultiplier: 0.004, // 每秒敌人速度增加比例
        eliteInterval: 35,         // 精英怪出现间隔（秒）
        bossInterval: 100,          // Boss出现间隔（秒）
    };

    // ========== 升级选项池 ==========
    static UPGRADES = [
        { id: 'attackSpeed', name: '攻击速度', desc: '攻击速度 +20%', icon: '⚡', rarity: 'common',
          apply: (p) => { p.attackSpeed *= 1.2; } },
        { id: 'moveSpeed', name: '移动速度', desc: '移动速度 +15%', icon: '👟', rarity: 'common',
          apply: (p) => { p.speed *= 1.15; } },
        { id: 'maxHp', name: '生命强化', desc: '最大生命值 +30', icon: '❤️', rarity: 'common',
          apply: (p) => { p.maxHp += 30; p.hp += 30; } },
        { id: 'critRate', name: '暴击率', desc: '暴击率 +10%', icon: '💥', rarity: 'uncommon',
          apply: (p) => { p.critRate += 0.10; } },
        { id: 'critDamage', name: '暴击伤害', desc: '暴击伤害 +50%', icon: '🔥', rarity: 'uncommon',
          apply: (p) => { p.critDamage += 0.5; } },
        { id: 'bulletCount', name: '多重射击', desc: '子弹数量 +1', icon: '🎯', rarity: 'rare',
          apply: (p) => { p.bulletCount += 1; } },
        { id: 'pierce', name: '穿透强化', desc: '穿透数量 +1', icon: '➡️', rarity: 'uncommon',
          apply: (p) => { p.pierce += 1; } },
        { id: 'attackRange', name: '攻击范围', desc: '攻击范围 +20%', icon: '📡', rarity: 'common',
          apply: (p) => { p.attackRange *= 1.2; } },
        { id: 'heal', name: '紧急修复', desc: '恢复 50% 生命值', icon: '💚', rarity: 'common',
          apply: (p) => { p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.5); } },
        { id: 'shield', name: '能量护盾', desc: '获得 50 点护盾', icon: '🛡️', rarity: 'uncommon',
          apply: (p) => { p.shield = (p.shield || 0) + 50; } },
        { id: 'magnet', name: '磁力强化', desc: '经验吸取范围 +50%', icon: '🧲', rarity: 'common',
          apply: (p) => { p.magnetRange *= 1.5; } },
        { id: 'expBoost', name: '经验增益', desc: '经验获取 +20%', icon: '⭐', rarity: 'common',
          apply: (p) => { p.expMultiplier *= 1.2; } },
        { id: 'damage', name: '伤害强化', desc: '子弹伤害 +25%', icon: '⚔️', rarity: 'common',
          apply: (p) => { p.bulletDamage *= 1.25; } },
        { id: 'bulletSpeed', name: '弹速提升', desc: '子弹速度 +30%', icon: '🚀', rarity: 'common',
          apply: (p) => { p.bulletSpeed *= 1.3; } },
        { id: 'dashCooldown', name: '冲刺精通', desc: '冲刺冷却 -25%', icon: '💨', rarity: 'uncommon',
          apply: (p) => { p.dashCooldown *= 0.75; } },
        // TODO: 添加更多升级：吸血、反弹、召唤物、元素伤害等
    ];

    // ========== 粒子配置 ==========
    static PARTICLES = {
        maxCount: 500,       // 最大粒子数（性能上限）
        trailRate: 0.1,      // 尾焰生成间隔
        explosionCount: 15,  // 爆炸粒子数
        hitCount: 5,         // 命中粒子数
    };

    // ========== 经验等级曲线 ==========
    static getExpForLevel(level) {
        // 指数增长：每级需要更多经验
        return Math.floor(20 + 5 * (level - 1) + 0.65 * (level - 1) ** 2);
    }

    // ========== 颜色主题（科技风） ==========
    static COLORS = {
        background: '#0a0a1a',
        grid: 'rgba(0, 200, 255, 0.08)',
        gridBright: 'rgba(0, 200, 255, 0.15)',
        player: '#00d4ff',
        playerGlow: 'rgba(0, 212, 255, 0.6)',
        bullet: '#00ffff',
        bulletGlow: 'rgba(0, 255, 255, 0.8)',
        expOrb: '#7bed9f',
        expGlow: 'rgba(123, 237, 159, 0.6)',
        uiText: '#ffffff',
        uiAccent: '#00d4ff',
        uiWarning: '#ff6b6b',
        uiGold: '#ffd700',
    };

    // TODO: 音效配置预留
    // static AUDIO = { ... }
}

// 导出（浏览器环境直接挂全局）
if (typeof window !== 'undefined') {
    window.Config = Config;
}
