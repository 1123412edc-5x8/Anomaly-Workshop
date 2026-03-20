const db = require('../utils/db');
const itemWiki = require('../utils/items');

module.exports = {
    name: 'map',
    aliases: ['m', '地圖'],
    execute: async (message, args) => {
        const userId = message.author.id;
        let data = db.read();
        
        // --- 核心防呆 ---
        if (!data.players) data.players = {};
        if (!data.players[userId]) {
            data.players[userId] = { inventory: [], currentLocation: '工廠' };
        }

        const targetMap = args[0];
        const availableMaps = Object.keys(itemWiki);

        // 如果玩家沒輸入地圖，或者輸入的地圖不在清單裡
        if (!targetMap || !itemWiki[targetMap]) {
            return message.reply(`📍 **請選擇正確的區域：** \`${availableMaps.join('、')}\` (例如: \`~map 荒野\`)`);
        }

        data.players[userId].currentLocation = targetMap;
        db.write(data);

        message.reply(`✅ **區域切換成功！** 你已抵達 **【${targetMap}】**。`);
    }
};