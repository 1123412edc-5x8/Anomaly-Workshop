const db = require('../utils/db');
const itemWiki = require('../utils/items');

module.exports = {
    name: 'map',
    aliases: ['m', '地圖'],
    execute: async (message, args) => {
        const userId = message.author.id;
        let data = db.read();

        // 1. 確保基礎結構
        if (!data.players) data.players = {};
        if (!data.players[userId]) {
            data.players[userId] = { inventory: [], currentLocation: '工廠' };
        }

        // 2. 獲取可用地圖清單 (加上空值保護)
        const availableMaps = itemWiki ? Object.keys(itemWiki) : [];
        const targetMap = args[0];

        // 3. 如果沒輸入參數：顯示目前位置
        if (!targetMap) {
            const current = data.players[userId].currentLocation || '工廠';
            return message.reply(`📍 你目前位於：**【${current}】**\n可用地區：\`${availableMaps.join('、') || '載入中...'}\`\n用法：\`~map 荒野\``);
        }

        // 4. 如果地圖不存在
        if (!availableMaps.includes(targetMap)) {
            return message.reply(`❌ 找不到地區「${targetMap}」。\n請選擇：\`${availableMaps.join('、')}\``);
        }

        // 5. 執行切換
        data.players[userId].currentLocation = targetMap;
        db.write(data);

        message.reply(`✅ **移動成功！** 你已抵達 **【${targetMap}】**。`);
    }
};