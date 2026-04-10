// 處理分解選擇
async function handleDecomposeSelect(interaction) {
    const selectedValue = interaction.values[0];
    const parts = selectedValue.split('_');
    const action = parts[1]; // 'single' or 'all'

    const userId = interaction.user.id;
    const db = require('../utils/db');
    const items = require('../utils/items');
    let data = db.read();
    const player = data.players?.[userId];

    if (!player || !player.inventory) {
        return interaction.reply({ content: '❌ 玩家數據錯誤。', ephemeral: true });
    }

    let itemsToDecompose = [];
    let decomposeMessage = '';

    if (action === 'single') {
        const idx = parseInt(parts[2]);
        if (idx < 0 || idx >= player.inventory.length) {
            return interaction.reply({ content: '❌ 無效的選擇。', ephemeral: true });
        }
        itemsToDecompose = [idx];
        decomposeMessage = `分解 **${player.inventory[idx].name}**`;
    } else if (action === 'all') {
        const itemName = parts.slice(2).join('_'); // 處理物品名稱中可能有空格
        const indices = [];
        player.inventory.forEach((item, index) => {
            if (item.name === itemName) {
                indices.push(index);
            }
        });
        if (indices.length === 0) {
            return interaction.reply({ content: '❌ 找不到指定的物品。', ephemeral: true });
        }
        itemsToDecompose = indices;
        decomposeMessage = `分解所有 **${itemName}** (${indices.length} 個)`;
    } else {
        return interaction.reply({ content: '❌ 無效的操作。', ephemeral: true });
    }

    // 從大到小排序索引，確保移除時不影響其他索引
    itemsToDecompose.sort((a, b) => b - a);

    const decomposedItems = [];
    let totalPoints = 0;

    // 處理每個要分解的物品
    for (const idx of itemsToDecompose) {
        if (idx >= player.inventory.length) continue; // 防止索引超出範圍

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

        decomposedItems.push(...newItems);
        totalPoints += 10;
    }

    // 添加新物品到背包
    player.inventory.push(...decomposedItems);
    player.weekly_points = (player.weekly_points || 0) + totalPoints;

    db.write(data);

    const { EmbedBuilder } = require('discord.js');
    const res = new EmbedBuilder()
        .setTitle('🔧 分解成功！')
        .setDescription(`${decomposeMessage}\n獲得 ${decomposedItems.length} 個新零件：\n${decomposedItems.map(i => `• ${i.name}`).join('\n')}\n獲得 ${totalPoints} 積分`)
        .setColor(0xFFA500);

    await interaction.update({ content: '', embeds: [res], components: [] });
}

module.exports = {
    execute: handleDecomposeSelect
};