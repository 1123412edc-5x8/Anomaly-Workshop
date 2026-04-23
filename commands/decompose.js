const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/db');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('decompose')
        .setDescription('分解指定材料（僅限基礎材料）')
        .addStringOption(option => 
            option.setName('item')
                .setDescription('請選擇要分解的物品')
                .setRequired(true)
                .setAutocomplete(true))
        .addStringOption(option =>
            option.setName('amount')
                .setDescription('分解數量')
                .setRequired(true)
                .addChoices(
                    { name: '單個分解', value: 'single' },
                    { name: '全部分解', value: 'all' }
                )),

    // --- 自動補齊選單：確保玩家只能選到「有規則」且「背包有」的物品 ---
    async autocomplete(interaction) {
        try {
            const focusedValue = interaction.options.getFocused();
            const userId = interaction.user.id;
            const data = db.read();
            const player = data.players?.[userId];

            if (!player || !player.inventory) return await interaction.respond([]);

            // 讀取分解規則
            const rulePath = path.join(process.cwd(), 'data', 'deconstruct.json');
            if (!fs.existsSync(rulePath)) return await interaction.respond([]);
            
            const rules = JSON.parse(fs.readFileSync(rulePath, 'utf8'));
            const allowedNames = Object.keys(rules);

            const itemCounts = {};
            player.inventory.forEach(item => {
                const name = typeof item === 'string' ? item : item.name;
                if (allowedNames.includes(name)) {
                    itemCounts[name] = (itemCounts[name] || 0) + 1;
                }
            });

            const choices = Object.entries(itemCounts).map(([name, count]) => ({
                name: `${name} (持有 x${count})`,
                value: name 
            }));

            const filtered = choices
                .filter(choice => choice.name.includes(focusedValue))
                .slice(0, 25);

            await interaction.respond(filtered);
        } catch (err) {
            console.error('Autocomplete 錯誤:', err);
            await interaction.respond([]);
        }
    },

    // --- 執行邏輯：包含 8 個問題的修正 ---
    async execute(interaction) {
        try {
            const itemName = interaction.options.getString('item');
            const amountType = interaction.options.getString('amount');
            const userId = interaction.user.id;

            const data = db.read();
            const player = data.players?.[userId];

            if (!player) return await interaction.reply({ content: '❌ 找不到玩家資料。', ephemeral: true });

            // 1. 讀取分解規則 (加入錯誤捕捉)
            const rulePath = path.join(process.cwd(), 'data', 'deconstruct.json');
            if (!fs.existsSync(rulePath)) return await interaction.reply({ content: '❌ 伺服器遺失分解規則檔案。', ephemeral: true });
            
            const rules = JSON.parse(fs.readFileSync(rulePath, 'utf8'));
            const rule = rules[itemName];

            if (!rule) return await interaction.reply({ content: `❌ \`${itemName}\` 不可分解。`, ephemeral: true });

            // 2. 統計物品數量
            const itemsInInv = player.inventory.filter(item => (typeof item === 'string' ? item : item.name) === itemName);
            if (itemsInInv.length === 0) return await interaction.reply({ content: `❌ 你背包裡沒有 \`${itemName}\`。`, ephemeral: true });

            const decomposeCount = amountType === 'all' ? itemsInInv.length : 1;

            // 3. 移除物品邏輯 (使用倒序移除以確保索引安全)
            let removedCount = 0;
            for (let i = player.inventory.length - 1; i >= 0; i--) {
                const name = typeof player.inventory[i] === 'string' ? player.inventory[i] : player.inventory[i].name;
                if (name === itemName && removedCount < decomposeCount) {
                    player.inventory.splice(i, 1);
                    removedCount++;
                }
            }

            // 4. 計算獎勵 (修正變數名為 entropy_crystal 並增加積分)
            const totalCrystals = (rule.crystals || 0) * decomposeCount;
            const totalPoints = 10 * decomposeCount;
            const totalGainedItems = [];

            for (let i = 0; i < decomposeCount; i++) {
                if (rule.yield) {
                    rule.yield.forEach(y => {
                        player.inventory.push(y);
                        totalGainedItems.push(y);
                    });
                }
            }

            // 5. 更新玩家數據
            player.entropy_crystal = (player.entropy_crystal || 0) + totalCrystals;
            player.weekly_points = (player.weekly_points || 0) + totalPoints;

            db.write(data);

            // 6. 整理顯示資訊 (避免文字過長爆掉)
            const summary = {};
            totalGainedItems.forEach(item => summary[item] = (summary[item] || 0) + 1);
            const yieldText = Object.entries(summary)
                .map(([name, count]) => `• **${name}** x${count}`)
                .join('\n');

            const embed = new EmbedBuilder()
                .setTitle('🔧 分解成功')
                .setColor(0x2ecc71)
                .setDescription(`你分解了 **${decomposeCount}** 個 **${itemName}**`)
                .addFields(
                    { name: '💎 獲得結晶', value: `+${totalCrystals}`, inline: true },
                    { name: '📈 每週積分', value: `+${totalPoints}`, inline: true },
                    { name: '📦 獲得零件', value: yieldText || '無額外產出' }
                )
                .setFooter({ text: '異常工作坊 | 分解系統' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (err) {
            console.error('分解執行出錯:', err);
            if (!interaction.replied) {
                await interaction.reply({ content: '❌ 分解過程中發生未知錯誤。', ephemeral: true });
            }
        }
    }
};