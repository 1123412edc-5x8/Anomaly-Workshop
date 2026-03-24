const db = require('../utils/db');
const itemWiki = require('../utils/items');

module.exports = {
    name: 'map',
    aliases: ['m', '地圖'],
    execute: async (message, args) => {
        const userId = message.author.id;
        let data = db.read();

        // 初始化資料夾
        if (!data.players) data.players = {};
        if (!data.players[userId]) {
            data.players[userId] = { inventory: [], currentLocation: '工廠' };
        }

        const targetMap = args[0];
        // 寫死可用地圖，不依賴外部讀取
        const maps = ['工廠', '荒野', '實驗室'];

        if (!targetMap || !maps.includes(targetMap)) {
            const current = data.players[userId].currentLocation || '工廠';
            return message.reply(`📍 當前位置：**【${current}】**\n請輸入移動目的地：\`${maps.join('、')}\``);
        }

        data.players[userId].currentLocation = targetMap;
        db.write(data);

        message.reply(`✅ 你已成功移動至 **【${targetMap}】**！`);
    }
};