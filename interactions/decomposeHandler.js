const db = require('../utils/db');
const fs = require('fs');
const path = require('path');
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');

// 處理分解物品選擇
async function handleDecomposeSelect(interaction) {
    const selectedValue = interaction.values[0];
    const itemName = selectedValue.split('_').slice(2).join('_');

    const userId = interaction.user.id;
    const rulePath = path.join(__dirname, '../data/deconstruct.json');
    if (!fs.existsSync(rulePath)) {
        return interaction.reply({ content: '❌ 分解規則文件不存在。', ephemeral: true });
    }
    const rules = JSON.parse(fs.readFileSync(rulePath, 'utf8'));
    const rule = rules[itemName];

    if (!rule) {
        return interaction.reply({ content: '❌ 此物品不可分解。', ephemeral: true });
    }

    let data = db.read();
    const player = data.players?.[userId];

    if (!player || !player.inventory) {
        return interaction.reply({ content: '❌ 玩家數據錯誤。', ephemeral: true });
    }

    // 找出所有符合的物品索引
    const indices = [];
    player.inventory.forEach((item, index) => {
        const name = typeof item === 'string' ? item : item.name;
        if (name === itemName) indices.push(index);
    });

    if (indices.length === 0) {
        return interaction.reply({ content: '❌ 背包裡找不到該物品。', ephemeral: true });
    }

    // 顯示單個或全部選擇
    const options = [
        new StringSelectMenuOptionBuilder()
            .setLabel(`分解 1 個 ${itemName}`)
            .setValue(`decompose_confirm_1_${itemName}`),
    ];

    if (indices.length > 1) {
        options.push(
            new StringSelectMenuOptionBuilder()
                .setLabel(`分解全部 (${indices.length} 個 ${itemName})`)
                .setValue(`decompose_confirm_${indices.length}_${itemName}`)
        );
    }

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('decompose_amount_select')
        .setPlaceholder('選擇分解數量')
        .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const embed = new EmbedBuilder()
        .setTitle('🔧 選擇分解數量')
        .setDescription(`**${itemName}** (持有 ${indices.length} 個)\n請選擇要分解多少個：`)
        .setColor(0xFFA500);

    await interaction.update({ embeds: [embed], components: [row] });
}

// 處理分解數量選擇
async function handleDecomposeAmountSelect(interaction) {
    const selectedValue = interaction.values[0];
    const parts = selectedValue.split('_');
    const count = parseInt(parts[2]);
    const itemName = parts.slice(3).join('_');

    const userId = interaction.user.id;
    const rulePath = path.join(__dirname, '../data/deconstruct.json');
    if (!fs.existsSync(rulePath)) {
        return interaction.reply({ content: '❌ 分解規則文件不存在。', ephemeral: true });
    }
    const rules = JSON.parse(fs.readFileSync(rulePath, 'utf8'));
    const rule = rules[itemName];

    if (!rule) {
        return interaction.reply({ content: '❌ 此物品不可分解。', ephemeral: true });
    }

    let data = db.read();
    const player = data.players?.[userId];

    if (!player || !player.inventory) {
        return interaction.reply({ content: '❌ 玩家數據錯誤。', ephemeral: true });
    }

    // 找出所有符合的物品索引
    const indices = [];
    player.inventory.forEach((item, index) => {
        const name = typeof item === 'string' ? item : item.name;
        if (name === itemName) indices.push(index);
    });

    if (indices.length === 0) {
        return interaction.reply({ content: '❌ 背包裡找不到該物品。', ephemeral: true });
    }

    if (count > indices.length) {
        return interaction.reply({ content: '❌ 分解數量超過背包數量。', ephemeral: true });
    }

    // 從大到小排序索引，確保移除時不影響其他索引
    const targets = indices.slice(0, count).sort((a, b) => b - a);

    let totalCrystals = 0;
    let totalPoints = 0;
    let allGainedItems = [];

    // 執行分解
    targets.forEach(idx => {
        player.inventory.splice(idx, 1); // 移除
        totalCrystals += (rule.crystals || 0);
        totalPoints += 10; // 每個給 10 積分
        
        // 給予特定產出物
        if (rule.fixed_yield) {
            rule.fixed_yield.forEach(y => {
                player.inventory.push(y);
                allGainedItems.push(y);
            });
        }
    });

    player.entropy_crystal = (player.entropy_crystal || 0) + totalCrystals;
    player.weekly_points = (player.weekly_points || 0) + totalPoints;
    db.write(data);

    const embed = new EmbedBuilder()
        .setTitle('🔧 特定材料分解成功')
        .setColor(0x2ecc71)
        .setDescription(`你將 **${count}** 個 **${itemName}** 投入分解機。`)
        .addFields(
            { name: '💎 獲得結晶', value: `+${totalCrystals}`, inline: true },
            { name: '📈 每週積分', value: `+${totalPoints}`, inline: true },
            { name: '📦 回收產物', value: allGainedItems.length > 0 ? [...new Set(allGainedItems)].join('、') : '無' }
        );

    await interaction.update({ embeds: [embed], components: [] });
}

module.exports = {
    execute: handleDecomposeSelect,
    executeAmountSelect: handleDecomposeAmountSelect
};