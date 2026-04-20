const { EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const db = require('../utils/db');
const items = require('../utils/items');

const COMBINE_LOCATIONS = ['工廠', '實驗室', '圖書館'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('combine')
        .setDescription('合成物品'),
    execute: async (interaction) => {
        const userId = interaction.user.id;
        let data = db.read();
        const player = data.players?.[userId];
        const location = player?.currentLocation || '工廠';

        if (!COMBINE_LOCATIONS.includes(location)) {
            return interaction.reply({ content: `❌ 目前無法在 ${location} 進行合成。請使用 /map 前往 ${COMBINE_LOCATIONS.join('、')} 之一天。`, ephemeral: true });
        }

        if (!player || !player.inventory || player.inventory.length < 2) {
            return interaction.reply({ content: '❌ 背包物品不足 2 個，無法合成。', ephemeral: true });
        }

        // 找出可能的合成配方
        const possibleRecipes = [];
        const inventoryNames = player.inventory.map(item => item.name);

        for (const [recipeKey, result] of Object.entries(items.recipes)) {
            const [item1, item2] = recipeKey.split('+');
            const count1 = inventoryNames.filter(name => name === item1).length;
            const count2 = inventoryNames.filter(name => name === item2).length;

            if (count1 > 0 && count2 > 0) {
                // 檢查是否是同一個物品（如果是，需要至少2個）
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

        if (possibleRecipes.length === 0) {
            return interaction.reply({ content: '❌ 沒有可用的合成配方。請檢查背包物品和合成表。', ephemeral: true });
        }

        // 創建選擇菜單
        const options = possibleRecipes.map((recipe, index) => {
            const [materialA, materialB] = recipe.key.split('+');
            return new StringSelectMenuOptionBuilder()
                .setLabel(`${materialA} + ${materialB} → ${recipe.result}`)
                .setDescription(`可合成 ${recipe.maxCombines} 次，材料：${materialA} x${countItem(player.inventory, materialA)} / ${materialB} x${countItem(player.inventory, materialB)}`)
                .setValue(`combine_${index}`);
        });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('combine_select')
            .setPlaceholder('選擇要合成的配方')
            .addOptions(options.slice(0, 25)); // Discord 限制最多 25 個選項

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const embed = new EmbedBuilder()
            .setTitle('🌀 合成物品')
            .setDescription('選擇配方後，系統會顯示可合成次數及更多細節。\n• 每次合成可獲得積分\n• 相同材料可合成多次\n• 系統會自動移除所需材料')
            .setColor(0x00FFFF)
            .addFields(
                { name: '🔍 可用配方數量', value: `${possibleRecipes.length} 種可合成配方`, inline: true },
                { name: '📌 提示', value: '若有相同材料，可選擇合成多次以一次獲得更多成品。', inline: true }
            );

        await interaction.reply({ embeds: [embed], components: [row] });
    }
};

function countItem(inventory, name) {
    return inventory.filter(item => item.name === name).length;
}