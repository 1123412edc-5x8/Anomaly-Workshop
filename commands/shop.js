const { EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const db = require('../utils/db');

module.exports = {
    name: 'shop',
    aliases: ['商店'],
    execute: async (message) => {
        const data = db.read();
        const player = data.players[message.author.id] || { entropy_crystal: 0 };

        const shopItems = [
            { id: '1', name: '高級維修工具', cost: 50, desc: '增加維修效率 20%' },
            { id: '2', name: '熵值穩定劑', cost: 100, desc: '降低合成失敗率 10%' },
            { id: '3', name: '背包擴展模組', cost: 150, desc: '背包容量 +5' },
            { id: '4', name: '稀有合成配方', cost: 200, desc: '解鎖隱藏合成表' },
            { id: '5', name: '傳說級零件碎片', cost: 300, desc: '極其罕見的碎片' },
            { id: '6', name: '快速恢復藥劑', cost: 75, desc: '立即回復 50 HP' },
            { id: '7', name: '感知增幅器', cost: 120, desc: '提升拾荒稀有度' },
            { id: '8', name: '時空加速器', cost: 250, desc: '指令冷卻減少 50%' }
        ];

        const embed = new EmbedBuilder()
            .setTitle('🏪 異常工坊黑市')
            .setDescription(`你的結晶：\`${player.entropy_crystal || 0}\` 💎\n請從下方選單選擇要購買的物資：`)
            .setColor(0x8B008B);

        // 建立下拉選單
        const select = new StringSelectMenuBuilder()
            .setCustomId('shop_select')
            .setPlaceholder('選擇物品以查看詳情或購買...')
            .addOptions(
                shopItems.map(item => 
                    new StringSelectMenuOptionBuilder()
                        .setLabel(item.name)
                        .setDescription(`💎 價格：${item.cost} | ${item.desc}`)
                        .setValue(`buy_${item.id}`)
                )
            );

        const row = new ActionRowBuilder().addComponents(select);

        message.reply({ embeds: [embed], components: [row] });
    }
};