const db = require('./db');

const COOLDOWN_TIMES = {
    scavenge: 30,      // 拾荒 30 秒
    repair: 20,        // 維修 20 秒
    combine: 45,       // 合成 45 秒
    battle: 60,        // 戰鬥 60 秒
    quest: 300,        // 任務 5 分鐘
    trade: 10          // 交易 10 秒
};

function getCooldown(userId, commandName) {
    const data = db.read();
    const cooldowns = data.cooldowns || {};
    const userCooldowns = cooldowns[userId] || {};
    const endTime = userCooldowns[commandName];

    if (!endTime) return 0;

    const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    return remaining;
}

function setCooldown(userId, commandName) {
    let data = db.read();
    
    if (!data.cooldowns) data.cooldowns = {};
    if (!data.cooldowns[userId]) data.cooldowns[userId] = {};

    const duration = (COOLDOWN_TIMES[commandName] || 60) * 1000;
    data.cooldowns[userId][commandName] = Date.now() + duration;

    db.write(data);
}

function clearCooldown(userId, commandName) {
    let data = db.read();
    
    if (data.cooldowns && data.cooldowns[userId]) {
        delete data.cooldowns[userId][commandName];
        db.write(data);
    }
}

module.exports = {
    getCooldown,
    setCooldown,
    clearCooldown,
    COOLDOWN_TIMES
};
