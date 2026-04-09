const { EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const db = require('../utils/db');
const items = require('../utils/items');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('decompose')
        .setDescription('分解物品'),
    execute: async (interaction) => {
        const userId = interaction.user.id;
        let data = db.read();
        const player = data.players?.[userId];

        if (!player || !player.inventory || player.inventory.length < 1) {
            return interaction.reply({ content: '❌ 背包沒有物品，無法分解。', ephemeral: true });
        }

        // 創建選擇菜單，顯示物品數量
        const itemCounts = {};
        player.inventory.forEach(item => {
            itemCounts[item.name] = (itemCounts[item.name] || 0) + 1;
        });

        const options = [];
        player.inventory.forEach((item, index) => {
            const count = itemCounts[item.name];
            options.push(new StringSelectMenuOptionBuilder()
                .setLabel(`${index}: ${item.name} (${count}個)`)
                .setDescription(`稀有度: ${item.rarity || 'common'}`)
                .setValue(`decompose_single_${index}`));
        });

        // 添加全選選項（對於數量 > 1 的物品）
        Object.entries(itemCounts).forEach(([itemName, count]) => {
            if (count > 1) {
                options.push(new StringSelectMenuOptionBuilder()
                    .setLabel(`全選: ${itemName} (${count}個)`)
                    .setDescription(`分解所有 ${count} 個 ${itemName}`)
                    .setValue(`decompose_all_${itemName}`));
            }
        });

        if (options.length === 0) {
            return interaction.reply({ content: '❌ 背包沒有物品。', ephemeral: true });
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('decompose_select')
            .setPlaceholder('選擇要分解的物品')
            .addOptions(options.slice(0, 25)); // Discord 限制最多 25 個選項

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const embed = new EmbedBuilder()
            .setTitle('🔨 分解物品')
            .setDescription('請選擇要分解的物品：\n• 單個分解：選擇特定編號的物品\n• 全選分解：分解所有相同物品')
            .setColor(0xFFA500);

        await interaction.reply({ embeds: [embed], components: [row] });
    }
};