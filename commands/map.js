const { EmbedBuilder } = require('discord.js');
const db = require('../utils/db');

module.exports = {
    name: 'map',
    aliases: ['m', '地圖'],
    execute: async (message, args = []) => {
        const userId = message.author.id;
        const data = db.read() || { players: {} };
        
        // 確保玩家資料存在
        if (!data.players[userId]) {
            data.players[userId] = { inventory: [], currentLocation: '工廠', weekly_points: 0 };
        }

        const availableMaps = ['工廠', '荒野', '實驗室'];
        const targetMap = args[0]; // 取得玩家輸入的地圖名稱

        // 情況 A：玩家沒輸入地圖，顯示目前位置
        if (!targetMap || !availableMaps.includes(targetMap)) {
            const current = data.players[userId].currentLocation || '工廠';
            const embed = new EmbedBuilder()
                .setTitle('📍 地區導航')
                .setDescription(`你目前在：**【${current}】**\n\n**可用地區：**\n\` ${availableMaps.join('、 ')} \`\n\n**移動指令：**\n\` ~m [地區] \``)
                .setColor(0x2980b9);
            return message.reply({ embeds: [embed] });
        }

        // 情況 B：移動成功
        data.players[userId].currentLocation = targetMap;
        db.write(data);

        const embed = new EmbedBuilder()
            .setTitle('✅ 移動成功')
            .setDescription(`你已抵達 **【${targetMap}】**！`)
            .setColor(0x00FF00);
            
        message.reply({ embeds: [embed] });
    }
};