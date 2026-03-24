const { EmbedBuilder } = require('discord.js');
const db = require('../utils/db');
const itemWiki = require('../utils/items');

module.exports = {
    name: 'scavenge',
    aliases: ['s', '拾荒'],
    execute: async (message) => {
        const userId = message.author.id;
        let data = db.read();

        // 初始化玩家數據
        if (!data.players) data.players = {};
        if (!data.players[userId]) {
            data.players[userId] = { inventory: [], currentLocation: '工廠' };
        }
        const loc = data.players[userId].currentLocation || '工廠';
        
        // 2. 從對應地圖的 50 種物品中抽一個
        const region = itemWiki[loc];
        const randomItemName = region.items[Math.floor(Math.random() * region.items.length)];

        // 3. 建立物品物件
        const newItem = {
            name: randomItemName,
            origin: loc, // 紀錄產地，合成時會用到
            durability: Math.floor(Math.random() * 41) + 20, // 20~60%
            entropy: Math.floor(Math.random() * 11)         // 0~10
        };

        // 4. 存入背包
        data.players[userId].inventory.push(newItem);
        db.write(data);

        // 5. 顯示精美 Embed
        const embed = new EmbedBuilder()
            .setTitle(`🔍 拾荒回報：${loc}`)
            .setDescription(`你在廢墟中翻找，尋獲了 **${newItem.name}**！`)
            .addFields(
                { name: '🔋 耐久度', value: `\`${newItem.durability}%\``, inline: true },
                { name: '🌀 熵值', value: `\`${newItem.entropy}\``, inline: true }
            )
            .setColor(region.color)
            .setFooter({ text: `輸入 ~map 切換地區 | 目前地區物品數：${region.items.length}` });

        message.reply({ embeds: [embed] });
    }
};