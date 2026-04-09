const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../utils/db');
const items = require('../utils/items');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('decompose')
        .setDescription('分解物品')
        .addIntegerOption(option =>
            option.setName('index')
                .setDescription('物品編號')
                .setRequired(true)
        ),
    execute: async (interaction) => {
        const idx = interaction.options.getInteger('index');

        const userId = interaction.user.id;
        let data = db.read();
        const player = data.players?.[userId];

        if (!player || !player.inventory || player.inventory.length < 1) {
            return interaction.reply({ content: '❌ 背包沒有物品，無法分解。', ephemeral: true });
        }

        if (isNaN(idx) || idx < 0 || idx >= player.inventory.length) {
            return interaction.reply({ content: '❌ 序號無效或超出了背包範圍！', ephemeral: true });
        }

        const item = player.inventory[idx];

        // 移除物品
        player.inventory.splice(idx, 1);

        // 添加三個隨機物品
        const allItems = [];
        Object.values(items).forEach(map => {
            if (map.items) allItems.push(...map.items);
            if (map.decomposable) allItems.push(...map.decomposable);
        });
        if (items.usable) allItems.push(...items.usable);

        const newItems = [];
        for (let i = 0; i < 3; i++) {
            const randomItem = allItems[Math.floor(Math.random() * allItems.length)];
            newItems.push({
                name: randomItem,
                origin: item.origin || '未知',
                rarity: 'common'
            });
        }

        player.inventory.push(...newItems);
        player.weekly_points = (player.weekly_points || 0) + 10;

        db.write(data);

        const res = new EmbedBuilder()
            .setTitle('🔧 分解成功！')
            .setDescription(`**${item.name}** 已分解為：\n${newItems.map(i => `• ${i.name}`).join('\n')}`)
            .setColor(0xFFA500);

        interaction.reply({ embeds: [res] });
    }
};