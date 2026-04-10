const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/db');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deconstruct')
        .setDescription('分解基礎材料以獲取資源')
        // 設定 item 選項，並開啟 autocomplete
        .addStringOption(option => 
            option.setName('item')
                .setDescription('選擇要分解的物品')
                .setRequired(true)
                .setAutocomplete(true))
        // 設定 amount 選項，提供單選或全選
        .addStringOption(option =>
            option.setName('amount')
                .setDescription('選擇分解數量')
                .setRequired(true)
                .addChoices(
                    { name: '單個分解', value: 'single' },
                    { name: '全部分解', value: 'all' }
                )),

    // --- 自動補齊選單的邏輯 ---
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const userId = interaction.user.id;
        let data = db.read();
        const player = data.players[userId];

        // 如果沒玩家資料或沒背包，回傳空選單
        if (!player || !player.inventory) return await interaction.respond([]);

        // 讀取分解規則，過濾掉不能分解的物品
        const rulePath = path.join(__dirname, '../data/deconstruct.json');
        let rules = {};
        if (fs.existsSync(rulePath)) rules = JSON.parse(fs.readFileSync(rulePath, 'utf8'));

        // 統計背包內「可分解」物品的數量
        const itemCounts = {};
        player.inventory.forEach(item => {
            const name = typeof item === 'string' ? item : item.name;
            if (rules[name]) {
                itemCounts[name] = (itemCounts[name] || 0) + 1;
            }
        });

        // 轉換成 Discord 選單格式 [{ name: '生鏽齒輪 (x5)', value: '生鏽齒輪' }]
        const choices = Object.entries(itemCounts).map(([name, count]) => ({
            name: `${name} (x${count})`,
            value: name 
        }));

        // 根據玩家打的字進行模糊搜尋，Discord 限制最多顯示 25 個選項
        const filtered = choices.filter(choice => choice.name.includes(focusedValue)).slice(0, 25);
        await interaction.respond(filtered);
    },

    // --- 實際執行的邏輯 ---
    async execute(interaction) {
        const userId = interaction.user.id;
        const itemName = interaction.options.getString('item');
        const amountType = interaction.options.getString('amount');
        
        const rulePath = path.join(__dirname, '../data/deconstruct.json');
        if (!fs.existsSync(rulePath)) return interaction.reply({ content: '❌ 分解機台設定缺失。', ephemeral: true });
        const rules = JSON.parse(fs.readFileSync(rulePath, 'utf8'));
        const rule = rules[itemName];

        if (!rule) return interaction.reply({ content: `⚠️ \`${itemName}\` 無法被分解。`, ephemeral: true });

        let data = db.read();
        const player = data.players[userId];
        if (!player || !player.inventory) return interaction.reply({ content: '❌ 背包空空如也。', ephemeral: true });

        // 找出背包裡該物品的所有索引位置
        const indices = [];
        player.inventory.forEach((item, index) => {
            const name = typeof item === 'string' ? item : item.name;
            if (name === itemName) indices.push(index);
        });

        if (indices.length === 0) return interaction.reply({ content: `❌ 你背包裡已經沒有 \`${itemName}\` 了。`, ephemeral: true });

        // 決定要分解幾個 (單個 = 1, 全部 = 全部索引數量)
        const decomposeCount = amountType === 'all' ? indices.length : 1;
        
        // 為了避免刪除陣列元素時索引大亂，我們從後面往前刪
        const targetIndices = indices.slice(0, decomposeCount).sort((a, b) => b - a);
        targetIndices.forEach(idx => {
            player.inventory.splice(idx, 1); // 刪除物品
        });

        // 計算獲得的獎勵總和
        const totalCrystals = (rule.crystals || 0) * decomposeCount;
        player.entropy_crystal = (player.entropy_crystal || 0) + totalCrystals;
        
        // 統計獲得的材料
        const yieldCounts = {};
        const yields = rule.yield || [];
        for (let i = 0; i < decomposeCount; i++) {
            yields.forEach(mat => {
                player.inventory.push(mat);
                yieldCounts[mat] = (yieldCounts[mat] || 0) + 1;
            });
        }

        db.write(data); // 存檔

        // 格式化顯示文字
        const yieldText = Object.keys(yieldCounts).length > 0 
            ? Object.entries(yieldCounts).map(([name, count]) => `• **${name}** x${count}`).join('\n')
            : '無';

        const embed = new EmbedBuilder()
            .setTitle('♻️ 分解作業完成')
            .setColor(0xFFA500)
            .setDescription(`成功分解了 **${decomposeCount}** 個 **${itemName}**。`)
            .addFields(
                { name: '💎 獲得結晶', value: `+${totalCrystals}`, inline: true },
                { name: '📦 獲得零件', value: yieldText, inline: true }
            );

        await interaction.reply({ embeds: [embed] });
    }
};