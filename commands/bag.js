const { EmbedBuilder } = require('discord.js');
const db = require('../utils/db');

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
                inventory: [],
                currentLocation: '工廠'
            };
            db.write(data);
        }

        const items = data.players[userId].inventory;
        const rarityIcons = { 'common': '⚪', 'rare': '💜', 'epic': '🔴', 'legendary': '👑' };
        
        const embed = new EmbedBuilder()
            .setAuthor({ name: `${message.author.username} 的私人維修間`, iconURL: message.author.displayAvatarURL() })
            .setTitle('🎒 存放中的異常碎片')
            .setColor(0x2f3136)
            .setThumbnail('https://i.imgur.com/8N69y7v.png')
            .setTimestamp();

        if (items.length === 0) {
            embed.setDescription('*你的背包空空如也，去 ~s 拾荒吧！*');
        } else {
            // 分類顯示
            const byRarity = {
                'common': [],
                'rare': [],
                'epic': [],
                'legendary': []
            };

            items.forEach((item, index) => {
                const rarity = item.rarity || 'common';
                byRarity[rarity].push({ item, index });
            });

            let description = '';
            Object.entries(byRarity).forEach(([rarity, itemList]) => {
                if (itemList.length > 0) {
                    description += `\n**${rarityIcons[rarity]} ${rarity.toUpperCase()}:**\n`;
                    itemList.forEach(({ item, index }) => {
                        description += `  [\`${index}\`] ${item.name}\n`;
                    });
                }
            });

            embed.setDescription(description);
            embed.addFields({
                name: '📊 統計',
                value: `總計：${items.length} 件物品\n${'⚪ 普通: ' + (byRarity.common.length)}\n${'💜 稀有: ' + (byRarity.rare.length)}\n${'🔴 史詩: ' + (byRarity.epic.length)}\n${'👑 傳說: ' + (byRarity.legendary.length)}`,
                inline: true
            });
        }

        embed.setFooter({ text: '使用 ~combine [序號1] [序號2] [序號3] 合成三個同名物品' });

        message.reply({ embeds: [embed] });
    }
};