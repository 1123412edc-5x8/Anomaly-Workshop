const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const db = require('../utils/db');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('decompose')
        .setDescription('分解特定基礎材料（高級物品不會出現在選單中）'),

    // --- 自動選單：只顯示「背包有」且「可分解」的特定物品 ---
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const userId = interaction.user.id;
        const data = db.read();
        const player = data.players?.[userId];

        if (!player || !player.inventory) return await interaction.respond([]);

        // 讀取特定名單
        const rulePath = path.join(__dirname, '../data/deconstruct.json');
        if (!fs.existsSync(rulePath)) return await interaction.respond([]);
        const rules = JSON.parse(fs.readFileSync(rulePath, 'utf8'));
        const allowedItems = Object.keys(rules);

        // 統計背包中符合名單的數量
        const itemCounts = {};
        player.inventory.forEach(item => {
            const name = typeof item === 'string' ? item : item.name;
            if (allowedItems.includes(name)) {
                itemCounts[name] = (itemCounts[name] || 0) + 1;
            }
        });

        const choices = Object.entries(itemCounts).map(([name, count]) => ({
            name: `${name} (持有 x${count})`,
            value: name 
        }));

        const filtered = choices.filter(c => c.name.includes(focusedValue)).slice(0, 25);
        await interaction.respond(filtered);
    },

    // --- 執行動作：發放特定獎勵與積分 ---
    async execute(interaction) {
        const userId = interaction.user.id;
        let data = db.read();
        const player = data.players?.[userId];

        if (!player || !player.inventory) {
            return interaction.reply({ content: '❌ 玩家數據錯誤。', ephemeral: true });
        }

        // 讀取可分解物品名單
        const rulePath = path.join(__dirname, '../data/deconstruct.json');
        if (!fs.existsSync(rulePath)) {
            return interaction.reply({ content: '❌ 分解規則文件不存在。', ephemeral: true });
        }
        const rules = JSON.parse(fs.readFileSync(rulePath, 'utf8'));
        const allowedItems = Object.keys(rules);

        // 統計背包中可分解的物品
        const itemCounts = {};
        player.inventory.forEach(item => {
            const name = typeof item === 'string' ? item : item.name;
            if (allowedItems.includes(name)) {
                itemCounts[name] = (itemCounts[name] || 0) + 1;
            }
        });

        if (Object.keys(itemCounts).length === 0) {
            return interaction.reply({ content: '❌ 背包中沒有可分解的物品。', ephemeral: true });
        }

        // 創建選擇菜單
        const options = Object.entries(itemCounts).map(([name, count]) => {
            return new StringSelectMenuOptionBuilder()
                .setLabel(`${name} (持有 x${count})`)
                .setValue(`decompose_single_${name}`)
                .setDescription(`分解 1 個 ${name}`);
        });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('decompose_select')
            .setPlaceholder('選擇要分解的物品')
            .addOptions(options.slice(0, 25)); // Discord 限制最多 25 個選項

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const embed = new EmbedBuilder()
            .setTitle('🔧 分解物品')
            .setDescription('請選擇要分解的物品：\n• 你可以選擇分解單個或全部同類物品')
            .setColor(0xFFA500);

        await interaction.reply({ embeds: [embed], components: [row] });
    }
};