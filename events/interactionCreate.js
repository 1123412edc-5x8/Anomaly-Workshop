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
        } catch (error) {
            console.error('互動處理出錯:', error);
            await interaction.reply({ content: '❌ 執行互動時發生錯誤。', ephemeral: true });
        }
    }
};

// 處理分解選擇
async function handleDecomposeSelect(interaction) {
    const selectedValue = interaction.values[0];
    const idx = parseInt(selectedValue.split('_')[1]);

    const userId = interaction.user.id;
    const db = require('../utils/db');
    const items = require('../utils/items');
    let data = db.read();
    const player = data.players?.[userId];

    if (!player || !player.inventory || idx < 0 || idx >= player.inventory.length) {
        return interaction.reply({ content: '❌ 無效的選擇。', ephemeral: true });
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

    const { EmbedBuilder } = require('discord.js');
    const res = new EmbedBuilder()
        .setTitle('🔧 分解成功！')
        .setDescription(`**${item.name}** 已分解為：\n${newItems.map(i => `• ${i.name}`).join('\n')}`)
        .setColor(0xFFA500);

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
    const [item1, item2] = recipe.key.split('+');

    // 找到要移除的物品索引
    const indicesToRemove = [];
    let count1 = 0, count2 = 0;

    for (let i = 0; i < player.inventory.length; i++) {
        if (player.inventory[i].name === item1 && count1 < 1) {
            indicesToRemove.push(i);
            count1++;
        } else if (player.inventory[i].name === item2 && count2 < 1) {
            indicesToRemove.push(i);
            count2++;
        }
        if (count1 >= 1 && count2 >= 1) break;
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
    player.weekly_points = (player.weekly_points || 0) + 50;

    db.write(data);

    const { EmbedBuilder } = require('discord.js');
    const res = new EmbedBuilder()
        .setTitle('🌀 合成成功！')
        .setDescription(`**${item1}** + **${item2}** 已合成為 **${newItem.name}**`)
        .setColor(0x00FFFF);

    await interaction.update({ content: '', embeds: [res], components: [] });
}