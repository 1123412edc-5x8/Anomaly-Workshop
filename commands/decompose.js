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

        // 創建選擇菜單
        const options = player.inventory.map((item, index) => {
            return new StringSelectMenuOptionBuilder()
                .setLabel(`${index}: ${item.name}`)
                .setDescription(`稀有度: ${item.rarity || 'common'}`)
                .setValue(`decompose_${index}`);
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
            .setDescription('請選擇要分解的物品：')
            .setColor(0xFFA500);

        await interaction.reply({ embeds: [embed], components: [row] });
    }
};