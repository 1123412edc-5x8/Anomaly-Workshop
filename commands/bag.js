const { EmbedBuilder } = require('discord.js');
const db = require('../utils/db');

module.exports = {
    name: 'bag',
    aliases: ['b', '背包', 'inventory'],
    execute: async (message) => {
        const userId = message.author.id;
        let data = db.read() || { players: {} };

        // 🛡️ 安全檢查：如果玩家完全沒資料，幫他建立一個空的
        if (!data.players[userId]) {
            data.players[userId] = { 
                inventory: [], 
                entropy_crystal: 0, 
                currentLocation: '工廠' 
            };
            db.write(data);
        }

        const player = data.players[userId];
        
        // 🛡️ 再次確保 inventory 是一個陣列，防止 push 報錯
        if (!Array.isArray(player.inventory)) {
            player.inventory = [];
            db.write(data);
        }

        const embed = new EmbedBuilder()
            .setTitle('🎒 隨身背包')
            .setColor(0x2ecc71)
            .setDescription(`結晶：\`${player.entropy_crystal || 0}\` 💎\n目前位置：\`${player.currentLocation || '工廠'}\``);

        if (player.inventory.length === 0) {
            embed.addFields({ name: '狀態', value: '背包空空如也，快去拾荒吧！' });
        } else {
            // 將物品分組顯示 (例如：零件 x3)
            const itemCounts = {};
            player.inventory.forEach(item => {
                const name = typeof item === 'string' ? item : item.name;
                itemCounts[name] = (itemCounts[name] || 0) + 1;
            });

            const itemList = Object.entries(itemCounts)
                .map(([name, count]) => `📦 **${name}** x${count}`)
                .join('\n');

            embed.addFields({ name: '擁有的物品', value: itemList });
        }

        message.reply({ embeds: [embed] });
    }
};