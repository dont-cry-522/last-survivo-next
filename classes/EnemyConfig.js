/**
 * ============================================================
 *  EnemyConfig.js - 敌人配置中心
 * ============================================================
 *  所有敌人相关数值：类型属性表、行为参数、视觉效果
 *  从 Config.ENEMY_TYPES 迁移 + Enemy.js 硬编码提取
 * ============================================================
 */

class EnemyConfig {
    // ================================================================
    //  敌人类型属性表（迁移自 Config.ENEMY_TYPES）
    //  所有五种敌人的基础数值 + 视觉颜色
    // ================================================================
    static TYPES = {
        normal: {
            name: '赤帽菇',
            color: '#6b7b7b',
            glowColor: 'rgba(107,123,123,0.3)',
            eyeColor: '#882222',
            hp: 30,
            speed: 1.5,
            damage: 10,
            size: 15,
            exp: 5,
            gold: 1,
        },
        fast: {
            name: '灰爪兽',
            color: '#382840',
            glowColor: 'rgba(56,40,64,0.3)',
            boneColor: '#c8c0b8',
            hp: 15,
            speed: 3.0,
            damage: 8,
            size: 12,
            exp: 8,
            gold: 2,
        },
        tank: {
            name: '岩甲兽',
            color: '#4a1818',
            glowColor: 'rgba(74,24,24,0.3)',
            boneColor: '#c8b898',
            hp: 120,
            speed: 0.8,
            damage: 20,
            size: 25,
            exp: 15,
            gold: 5,
        },
        exploder: {
            name: '爆燃菇',
            color: '#8a7a20',
            glowColor: 'rgba(138,122,32,0.35)',
            veinColor: '#6a1010',
            coreColor: '#ff6600',
            hp: 20,
            speed: 2.2,
            damage: 35,
            size: 14,
            exp: 10,
            gold: 3,
            explodeRadius: 60,
        },
        elite: {
            name: '岩冠督军',
            color: '#3a4038',
            glowColor: 'rgba(58,64,56,0.3)',
            crestColor: '#8a8040',
            eyeColor: '#44ccdd',
            hp: 300,
            speed: 1.8,
            damage: 25,
            size: 30,
            exp: 50,
            gold: 20,
        },
    };

    // ================================================================
    //  行为参数
    // ================================================================

    /** 自爆敌人触发距离 */
    static EXPLODE_TRIGGER_DISTANCE = 50;

    /** 接触伤害倍率：damage * dt * MULTIPLIER */
    static CONTACT_DAMAGE_MULTIPLIER = 2;

    /** 同一敌人的接触伤害冷却（秒） */
    static CONTACT_DAMAGE_COOLDOWN = 1.5;

    /** 击退衰减系数 */
    static KNOCKBACK_DECAY = 0.9;

    /** 击退力 = 受到伤害 * 系数 */
    static KNOCKBACK_FORCE_COEFFICIENT = 0.3;

    /** 受击闪烁持续时间（秒） */
    static HIT_FLASH_DURATION = 0.1;

    // ================================================================
    //  视觉效果
    // ================================================================

    /** 绘制时的发光模糊半径 */
    static GLOW_BLUR = 10;

    /** 自爆敌人脉动速度 */
    static EXPLODER_PULSE_SPEED = 0.01;

    /** 自爆敌人脉动幅度 */
    static EXPLODER_PULSE_AMPLITUDE = 0.15;

    /** 自爆敌人内部白圈半径比例 */
    static EXPLODER_INNER_RATIO = 0.4;

    /** 精英怪星形内外径比 */
    static ELITE_STAR_INNER_RATIO = 0.6;

    // ================================================================
    //  HP 血条
    // ================================================================

    /** 血条宽度 = 敌人 size * RATIO */
    static HP_BAR_WIDTH_RATIO = 2;

    /** 血条高度（像素） */
    static HP_BAR_HEIGHT = 4;

    /** 血条在敌人上方的偏移量 */
    static HP_BAR_OFFSET_Y = 8;

    /** 血条背景色 */
    static HP_BAR_BG = 'rgba(0, 0, 0, 0.5)';

    /** 血量 > 50% 颜色 */
    static HP_COLOR_HIGH = '#4ade80';

    /** 血量 > 25% 颜色 */
    static HP_COLOR_MID = '#fbbf24';

    /** 血量 <= 25% 颜色 */
    static HP_COLOR_LOW = '#ef4444';

    /** 高血量阈值 */
    static HP_THRESHOLD_HIGH = 0.5;

    /** 中血量阈值 */
    static HP_THRESHOLD_MID = 0.25;

    // ================================================================
    //  死亡粒子效果
    // ================================================================

    /** 普通死亡爆炸粒子数 */
    static DEATH_PARTICLE_COUNT = 12;

    /** 自爆爆炸粒子数 */
    static EXPLODE_PARTICLE_COUNT = 30;

    /** 近距触发自爆额外粒子数 */
    static EXPLODE_PROXIMITY_PARTICLE_COUNT = 25;

    /** 自爆粒子颜色 */
    static EXPLODE_PARTICLE_COLOR = '#ff9ff3';
}

if (typeof window !== 'undefined') {
    window.EnemyConfig = EnemyConfig;
}
