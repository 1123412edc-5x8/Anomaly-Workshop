const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const items = require('../utils/items');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('recipes')
        .setDescription('查看合成表'),
    execute: async (interaction) => {
        const recipes = items.recipes;
        const recipeList = Object.entries(recipes).map(([key, value]) => `${key} → ${value}`).join('\n');

        const embed = new EmbedBuilder()
            .setTitle('🌀 合成表')
            .setDescription(recipeList || '目前沒有合成配方。')
            .setColor(0x00FFFF);

        interaction.reply({ embeds: [embed] });
    }
};