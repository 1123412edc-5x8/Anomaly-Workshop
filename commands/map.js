const db = require('../utils/db');

module.exports = {
    name: 'map',
    aliases: ['m', '地圖'],
    color: 0x2980b9,
    execute: async (message, args = []) => {
        const userId = message.author.id;
        let data = db.read();

        // 1. 強制初始化 (預防 data.json 讀取失敗)
        if (!data || typeof data !== 'object') data = { players: {} };
        if (!data.players) data.players = {};
        if (!data.players[userId]) {
            data.players[userId] = { inventory: [], currentLocation: '工廠' };
        }

        // 2. 如果沒輸入或地圖不對，直接回傳
        if (!targetMap || !maps.includes(targetMap)) {
            const current = data.players[userId].currentLocation || '工廠';
            const embed = new EmbedBuilder()
                .setTitle('📍 當前位置')
                .setDescription(`你目前在：**【${current}】**\n可用地區：\`工廠、荒野、實驗室\``)
                .setColor(0x2980b9);
            return message.reply({ embeds: [embed] });
        }

        // 3. 寫入資料
        data.players[userId].currentLocation = targetMap;
        db.write(data);

        const embed = new EmbedBuilder()
            .setTitle('✅ 移動成功')
            .setDescription(`已移動到 **【${targetMap}】**！`)
            .setColor(0x00FF00);
        message.reply({ embeds: [embed] });
    }
};