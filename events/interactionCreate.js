module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        // 處理斜線指令
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                }
            }
            return;
        }

        if (!interaction.isStringSelectMenu()) return;

        const { customId } = interaction;

        try {
            // 根據 ID 分流處理邏輯
            if (customId === 'shop_select') {
                const shopHandler = require('../interactions/shopHandler');
                await shopHandler.execute(interaction);
            } 
            else if (customId === 'map_select') {
                const mapHandler = require('../interactions/mapHandler');
                await mapHandler.execute(interaction);
            }
            else if (customId === 'decompose_select') {
                await handleDecomposeSelect(interaction);
            }
            else if (customId === 'combine_select') {
                await handleCombineSelect(interaction);
            }
            else if (customId === 'combine_quantity_select') {
                await handleCombineQuantitySelect(interaction);
            }
        } catch (error) {
            console.error('互動處理出錯:', error);
            await interaction.reply({ content: '❌ 執行互動時發生錯誤。', ephemeral: true });
        }
    }
};

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

// 處理合成數量選擇
async function handleCombineQuantitySelect(interaction) {
    const selectedValue = interaction.values[0];
    const parts = selectedValue.split('_');
    const recipeIndex = parseInt(parts[2]);
    const quantity = parseInt(parts[3]);

    const userId = interaction.user.id;
    const db = require('../utils/db');
    const items = require('../utils/items');
    let data = db.read();
    const player = data.players?.[userId];

    if (!player || !player.inventory) {
        return interaction.reply({ content: '❌ 玩家數據錯誤。', ephemeral: true });
    }

    // 重新計算可能的合成配方
    const possibleRecipes = [];
    const inventoryNames = player.inventory.map(item => item.name);

    for (const [recipeKey, result] of Object.entries(items.recipes)) {
        const [item1, item2] = recipeKey.split('+');
        const count1 = inventoryNames.filter(name => name === item1).length;
        const count2 = inventoryNames.filter(name => name === item2).length;

        if (count1 > 0 && count2 > 0) {
            const maxCombines = (item1 === item2) ? Math.floor(count1 / 2) : Math.min(count1, count2);
            if (maxCombines > 0) {
                possibleRecipes.push({
                    key: recipeKey,
                    result: result,
                    maxCombines: maxCombines
                });
            }
        }
    }

    if (recipeIndex < 0 || recipeIndex >= possibleRecipes.length) {
        return interaction.reply({ content: '❌ 無效的配方選擇。', ephemeral: true });
    }

    const recipe = possibleRecipes[recipeIndex];
    if (quantity < 1 || quantity > recipe.maxCombines) {
        return interaction.reply({ content: '❌ 無效的數量。', ephemeral: true });
    }

    const [item1, item2] = recipe.key.split('+');
    const synthesizedItems = [];
    let totalPoints = 0;

    // 執行多次合成
    for (let i = 0; i < quantity; i++) {
        // 找到要移除的物品索引（每次都要重新找，因為索引會改變）
        const indicesToRemove = [];
        let found1 = false, found2 = false;

        for (let j = 0; j < player.inventory.length; j++) {
            if (!found1 && player.inventory[j].name === item1) {
                indicesToRemove.push(j);
                found1 = true;
            } else if (!found2 && player.inventory[j].name === item2) {
                indicesToRemove.push(j);
                found2 = true;
            }
            if (found1 && found2) break;
        }

        if (!found1 || !found2) {
            return interaction.reply({ content: `❌ 合成失敗：第 ${i + 1} 次合成時缺少材料。`, ephemeral: true });
        }

        // 移除物品（從大到小排序）
        indicesToRemove.sort((a, b) => b - a);
        indicesToRemove.forEach(idx => player.inventory.splice(idx, 1));

        // 添加合成結果
        const newItem = {
            name: recipe.result,
            origin: '合成',
            rarity: 'rare'
        };

        player.inventory.push(newItem);
        synthesizedItems.push(newItem);
        totalPoints += 50;
    }

    player.weekly_points = (player.weekly_points || 0) + totalPoints;

    db.write(data);

    const { EmbedBuilder } = require('discord.js');
    const res = new EmbedBuilder()
        .setTitle('🌀 合成成功！')
        .setDescription(`成功合成 **${quantity}** 次\n配方：**${recipe.key} → ${recipe.result}**\n獲得 ${quantity} 個 **${recipe.result}**\n獲得 ${totalPoints} 積分`)
        .setColor(0x00FFFF);

    await interaction.update({ content: '', embeds: [res], components: [] });
}

// 處理合成選擇
async function handleCombineSelect(interaction) {
    const selectedValue = interaction.values[0];
    const recipeIndex = parseInt(selectedValue.split('_')[1]);

    const userId = interaction.user.id;
    const db = require('../utils/db');
    const items = require('../utils/items');
    let data = db.read();
    const player = data.players?.[userId];

    if (!player || !player.inventory) {
        return interaction.reply({ content: '❌ 玩家數據錯誤。', ephemeral: true });
    }

    // 重新計算可能的合成配方（以防數據改變）
    const possibleRecipes = [];
    const inventoryNames = player.inventory.map(item => item.name);

    for (const [recipeKey, result] of Object.entries(items.recipes)) {
        const [item1, item2] = recipeKey.split('+');
        const count1 = inventoryNames.filter(name => name === item1).length;
        const count2 = inventoryNames.filter(name => name === item2).length;

        if (count1 > 0 && count2 > 0) {
            const maxCombines = (item1 === item2) ? Math.floor(count1 / 2) : Math.min(count1, count2);
            if (maxCombines > 0) {
                possibleRecipes.push({
                    key: recipeKey,
                    result: result,
                    maxCombines: maxCombines
                });
            }
        }
    }

    if (recipeIndex < 0 || recipeIndex >= possibleRecipes.length) {
        return interaction.reply({ content: '❌ 無效的選擇。', ephemeral: true });
    }

    const recipe = possibleRecipes[recipeIndex];

    // 創建數量選擇菜單
    const quantityOptions = [];
    for (let i = 1; i <= Math.min(recipe.maxCombines, 10); i++) { // 最多顯示 10 個選項
        quantityOptions.push({
            label: `合成 ${i} 次`,
            value: `combine_quantity_${recipeIndex}_${i}`
        });
    }

    if (recipe.maxCombines > 10) {
        quantityOptions.push({
            label: `合成 ${recipe.maxCombines} 次 (全部)`,
            value: `combine_quantity_${recipeIndex}_${recipe.maxCombines}`
        });
    }

    const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');

    const quantityMenu = new StringSelectMenuBuilder()
        .setCustomId('combine_quantity_select')
        .setPlaceholder('選擇合成次數')
        .addOptions(quantityOptions.map(opt => ({
            label: opt.label,
            value: opt.value
        })));

    const row = new ActionRowBuilder().addComponents(quantityMenu);

    const embed = new EmbedBuilder()
        .setTitle('🌀 選擇合成數量')
        .setDescription(`配方：**${recipe.key} → ${recipe.result}**\n請選擇要合成多少次：`)
        .setColor(0x00FFFF);

    await interaction.update({ embeds: [embed], components: [row] });
}