const { EmbedBuilder } = require('discord.js');
const db = require('../utils/db');

// 製作一個進度條函數
const createBar = (current, max) => {
    const size = 10;
    const line = '█';
    const empty = '░';
    const progress = Math.round((current / max) * size);
    return line.repeat(progress) + empty.repeat(size - progress);
};

module.exports = {
    name: 'bag',
    aliases: ['b', '背包', 'ls', 'bag'],
    execute: async (message) => {
        const data = db.read();
        const userId = message.author.id;

        // 初始化玩家數據
        if (!data.players) data.players = {};
        if (!data.players[userId]) {
            data.players[userId] = {
                inventory: [{ name: "老舊鐵鎚", durability: 30, entropy: 5 }],
                currentLocation: '工廠'
            };
            db.write(data);
        }

        const items = data.players[userId].inventory;
        
        const embed = new EmbedBuilder()
            .setAuthor({ name: `${message.author.username} 的私人維修間`, iconURL: message.author.displayAvatarURL() })
            .setTitle('🎒 存放中的異常碎片')
            .setColor(0x2f3136) // Discord 暗色主題色
            .setThumbnail('https://i.imgur.com/8N69y7v.png') // 找張鐵鎚或工坊的 icon
            .setTimestamp();

        if (items.length === 0) {
            embed.setDescription('*你的背包空空如也，看來得去撿點垃圾了...*');
        } else {
            // 列出所有物品
            items.forEach((item, index) => {
                const durBar = createBar(item.durability, 100);
                const entropyWarn = item.entropy > 50 ? '⚠️ 嚴重變異' : '🟢 穩定';
                
                embed.addFields({
                    name: `【${index}】${item.name}`,
                    value: `> 🛠️ **耐久：** \`${durBar}\` (${item.durability}%)\n> 🌀 **狀態：** ${entropyWarn} (熵值: ${item.entropy})`,
                    inline: false
                });
            });
        }

        embed.setFooter({ text: '輸入 !repair 進行維護 | !combine 合成新物品' });

        message.reply({ embeds: [embed] });
    }
};