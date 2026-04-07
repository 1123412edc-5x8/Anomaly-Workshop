const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../utils/db');

module.exports = {
    name: 'shop',
    aliases: ['shop', '商店'],
    execute: async (message) => {
        const userId = message.author.id;
        let data = db.read();

        // 確保資料存在
        if (!data.players) data.players = {};
        const player = data.players[userId] || { entropy_crystal: 0 };
        const entropy_crystal = player.entropy_crystal || 0;

        const shopItems = [
            { id: 1, name: '維修工具', cost: 50 },
            { id: 2, name: '穩定劑', cost: 100 },
            { id: 3, name: '背包擴展', cost: 150 },
            { id: 4, name: '稀有配方', cost: 200 },
            { id: 5, name: '傳說碎片', cost: 300 },
            { id: 6, name: '恢復藥劑', cost: 75 },
            { id: 7, name: '感知增幅', cost: 120 },
            { id: 8, name: '加速器', cost: 250 }
        ];

        const embed = new EmbedBuilder()
            .setTitle('🏪 異常工坊黑市')
            .setColor(0x8B008B)
            .setDescription(`你的熵結晶：\`${entropy_crystal}\` 💎\n\n點擊下方按鈕直接購買物品`)
            .setFooter({ text: '每日拾荒和戰鬥可獲得熵結晶' });

        // 建立按鈕列 (第一列 1-4, 第二列 5-8)
        const row1 = new ActionRowBuilder();
        const row2 = new ActionRowBuilder();

        shopItems.forEach((item, index) => {
            const btn = new ButtonBuilder()
                .setCustomId(`buy_${item.id}`) // 設定按鈕 ID 供後續判斷
                .setLabel(`購買 ${item.id}`)
                .setStyle(ButtonStyle.Primary);

            if (index < 4) row1.addComponents(btn);
            else row2.addComponents(btn);

            embed.addFields({
                name: `【${item.id}】${item.name}`,
                value: `> 💎 價格：\`${item.cost}\``,
                inline: true
            });
        });

        message.reply({ 
            embeds: [embed], 
            components: [row1, row2] 
        });
    }
};