const { EmbedBuilder } = require('discord.js');
const db = require('../utils/db');

module.exports = {
    name: 'shop',
    aliases: ['shop', '商店'],
    execute: async (message) => {
        const userId = message.author.id;
        let data = db.read();

        if (!data.players[userId]) {
            return message.reply('🎒 請先使用 `~s` 拾荒獲得零件！');
        }

        const player = data.players[userId];
        const entropy_crystal = player.entropy_crystal || 0;

        const shopItems = [
            { id: 1, name: '高級維修工具', cost: 50, desc: '增加維修效率 20%' },
            { id: 2, name: '熵值穩定劑', cost: 100, desc: '降低合成時 10% 失敗率' },
            { id: 3, name: '背包擴展模組', cost: 150, desc: '增加背包容量 5 個位置' },
            { id: 4, name: '稀有合成配方', cost: 200, desc: '解鎖新的合成食譜' },
            { id: 5, name: '傳說級零件碎片', cost: 300, desc: '集齊 3 個可合成傳說物品' },
            { id: 6, name: '快速恢復藥劑', cost: 75, desc: '戰鬥中立即回復 50 HP' },
            { id: 7, name: '感知增幅器', cost: 120, desc: '提升拾荒發現稀有物品機率' },
            { id: 8, name: '時空加速器', cost: 250, desc: '指令冷卻時間減少 50%' }
        ];

        const embed = new EmbedBuilder()
            .setTitle('🏪 異常工坊黑市')
            .setColor(0x8B008B)
            .setDescription(`你的熵結晶：\`${entropy_crystal}\`\n\n使用 \`~buy [編號]\` 購買物品`)
            .setThumbnail('https://i.imgur.com/6e8F5k2.png');

        shopItems.forEach((item) => {
            embed.addFields({
                name: `【${item.id}】${item.name}`,
                value: `> ${item.desc}\n> 💎 價格：\`${item.cost}\` 熵結晶`,
                inline: false
            });
        });

        embed.setFooter({ text: '每日拾荒和戰鬥可獲得熵結晶' });

        message.reply({ embeds: [embed] });
    }
};
