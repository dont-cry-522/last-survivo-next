/**
 * ============================================================
 *  game.js - 游戏入口
 * ============================================================
 *  页面加载完成后初始化游戏
 * ============================================================
 */

window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');

    // 创建游戏实例
    const game = new Game(canvas);

    // 挂载到window方便调试
    window.game = game;
    game.mobileControls = new MobileControls(game);
    game.loadout = new Loadout(game);
    game.skillInventory = new SkillInventory(game);
    game.audioSettings = new AudioSettings(game);

    console.log('%c末日幸存者 Last Survivor', 'color: #00d4ff; font-size: 20px; font-weight: bold;');
    console.log('%c游戏已加载完成，点击开始游戏', 'color: #7bed9f; font-size: 14px;');
    console.log('%c操作: WASD移动 | Shift冲刺 | ESC暂停 | R重开 | M静音', 'color: #a0aec0; font-size: 12px;');
});
