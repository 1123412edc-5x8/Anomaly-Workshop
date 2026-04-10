const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/db');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('decompose')
        .setDescription('分解指定材料')
        .addStringOption(option => 
            option.setName('item')
                .setDescription('請從清單中選擇要分解的物品')
                .setRequired(true)
                .setAutocomplete(true)) // 這裡開啟自動補齊
        .addStringOption(option =>
            option.setName('amount')
                .setDescription('分解數量')
                .setRequired(true)
                .addChoices(
                    { name: '單個分解', value: 'single' },
                    { name: '全部分解', value: 'all' }
                )),

    async autocomplete(interaction) {
        try {
            const focusedValue = interaction.options.getFocused();
            const userId = interaction.user.id;
            const data = db.read();
            const player = data.players?.[userId];

            // 1. 基本安全檢查
            if (!player || !player.inventory) {
                return await interaction.respond([{ name: '⚠️ 你的背包是空的', value: 'none' }]);
            }

            // 2. 讀取規則檔案 (確保路徑在 Termux 是正確的)
            const rulePath = path.join(process.cwd(), 'data', 'deconstruct.json');
            if (!fs.existsSync(rulePath)) {
                console.log('找不到規則檔於:', rulePath);
                return await interaction.respond([{ name: '⚠️ 伺服器遺失分解規則檔', value: 'none' }]);
            }
            
            const rules = JSON.parse(fs.readFileSync(rulePath, 'utf8'));
            const allowedNames = Object.keys(rules);

            // 3. 篩選玩家背包中「符合分解規則」的物品
            const itemCounts = {};
            player.inventory.forEach(item => {
                const name = typeof item === 'string' ? item : item.name;
                if (allowedNames.includes(name)) {
                    itemCounts[name] = (itemCounts[name] || 0) + 1;
                }
            });

            // 4. 轉換為 Discord 選項
            const choices = Object.entries(itemCounts).map(([name, count]) => ({
                name: `${name} (持有 x${count})`,
                value: name 
            }));

            // 5. 模糊搜尋過濾
            const filtered = choices
                .filter(choice => choice.name.toLowerCase().includes(focusedValue.toLowerCase()))
                .slice(0, 25);

            // 必須回傳，否則選單會一直轉圈圈或變空白框
            await interaction.respond(filtered);

        } catch (err) {
            console.error('Autocomplete Error:', err);
            // 發生錯誤時至少回傳一個提示
            await interaction.respond([{ name: '❌ 選單讀取發生異常', value: 'error' }]);
        }
    },

    async execute(interaction) {
        // ... (保持之前的 execute 邏輯)
        // 記得執行前判斷 if (itemName === 'none' || itemName === 'error') 直接 return
    }
};