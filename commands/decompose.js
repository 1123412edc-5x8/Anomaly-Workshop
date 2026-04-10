const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/db');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('decompose')
        .setDescription('分解特定基礎材料（高級物品不會出現在選單中）')
        .addStringOption(option => 
            option.setName('item')
                .setDescription('選擇要分解的材料')
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
        const itemName = interaction.options.getString('item');
        const amountType = interaction.options.getString('amount');

        const rulePath = path.join(__dirname, '../data/deconstruct.json');
        const rules = JSON.parse(fs.readFileSync(rulePath, 'utf8'));
        const rule = rules[itemName];

        if (!rule) return interaction.reply({ content: '❌ 此物品不可分解。', ephemeral: true });

        let data = db.read();
        const player = data.players?.[userId];
        
        // 找出所有符合的物品索引
        const indices = [];
        player.inventory.forEach((item, index) => {
            const name = typeof item === 'string' ? item : item.name;
            if (name === itemName) indices.push(index);
        });

        if (indices.length === 0) return interaction.reply({ content: '❌ 背包裡找不到該物品。', ephemeral: true });

        const count = amountType === 'all' ? indices.length : 1;
        const targets = indices.slice(0, count).sort((a, b) => b - a);

        let totalCrystals = 0;
        let totalPoints = 0;
        let allGainedItems = [];

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

        await interaction.reply({ embeds: [embed] });
    }
};