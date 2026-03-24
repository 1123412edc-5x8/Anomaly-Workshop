const db = require('../utils/db');
const itemWiki = require('../utils/items');

module.exports = {
    name: 'map',
    aliases: ['m', '地圖'],
    execute: async (message, args) => {
        const userId = message.author.id;
        let data = db.read();
        
        // --- 第一重防線：確保基礎結構存在 ---
        if (!data.players) data.players = {};
        if (!data.players[userId]) {
            data.players[userId] = { inventory: [], currentLocation: '工廠' };
        }

        const targetMap = args[0];
        const availableMaps = Object.keys(itemWiki);

        // --- 第二重防線：處理沒輸入參數的情況 ---
        if (!targetMap) {
            const currentLoc = data.players[userId].currentLocation || '工廠';
            return message.reply(`📍 你目前位於：**【${currentLoc}】**\n可用地區：\`${availableMaps.join('、')}\`\n用法範例：\`~map 荒野\``);
        }

        // --- 第三重防線：地圖不存在時的處理 ---
        if (!itemWiki[targetMap]) {
            return message.reply(`❌ 找不到地區「${targetMap}」。\n請選擇：\`${availableMaps.join('、')}\``);
        }

        // 執行切換並寫入
        data.players[userId].currentLocation = targetMap;
        db.write(data);

        message.reply(`✅ **成功移動！** 你現在已抵達 **【${targetMap}】**，拾荒物品已更新。`);
    }
};