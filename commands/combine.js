const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../utils/db');
const items = require('../utils/items');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('combine')
        .setDescription('合成物品')
        .addIntegerOption(option =>
            option.setName('index1')
                .setDescription('第一個物品編號')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('index2')
                .setDescription('第二個物品編號')
                .setRequired(true)
        ),
    execute: async (interaction) => {
        const idx1 = interaction.options.getInteger('index1');
        const idx2 = interaction.options.getInteger('index2');

        const userId = interaction.user.id;
        let data = db.read();
        const player = data.players?.[userId];

        if (!player || !player.inventory || player.inventory.length < 2) {
            return interaction.reply({ content: '❌ 背包物品不足 2 個，無法合成。', ephemeral: true });
        }

        if (idx1 === idx2 || idx1 < 0 || idx1 >= player.inventory.length || idx2 < 0 || idx2 >= player.inventory.length) {
            return interaction.reply({ content: '❌ 序號無效、重複或超出了背包範圍！', ephemeral: true });
        }

        const item1 = player.inventory[idx1];
        const item2 = player.inventory[idx2];

        // 檢查合成表
        const recipeKey = `${item1.name}+${item2.name}`;
        const reverseKey = `${item2.name}+${item1.name}`;
        const result = items.recipes[recipeKey] || items.recipes[reverseKey];

        if (!result) {
            return interaction.reply({ content: '❌ 這兩個物品無法合成。請檢查合成表。', ephemeral: true });
        }

        // 移除物品（先移除較大的索引）
        const indices = [idx1, idx2].sort((a, b) => b - a);
        indices.forEach(idx => player.inventory.splice(idx, 1));

        // 添加合成結果
        const newItem = {
            name: result,
            origin: item1.origin || '合成',
            rarity: 'rare'
        };

        player.inventory.push(newItem);
        player.weekly_points = (player.weekly_points || 0) + 50;

        db.write(data);

        const res = new EmbedBuilder()
            .setTitle('🌀 合成成功！')
            .setDescription(`**${item1.name}** + **${item2.name}** 已合成為 **${newItem.name}**`)
            .setColor(0x00FFFF);

        interaction.reply({ embeds: [res] });
    }
};