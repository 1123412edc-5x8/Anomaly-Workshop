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
        try {
            const itemName = interaction.options.getString('item');
            const amountType = interaction.options.getString('amount');
            const userId = interaction.user.id;

            // 檢查錯誤狀態
            if (itemName === 'none') {
                return await interaction.reply({ content: '❌ 你的背包是空的，無法分解物品。', ephemeral: true });
            }
            if (itemName === 'error') {
                return await interaction.reply({ content: '❌ 系統發生錯誤，請稍後再試。', ephemeral: true });
            }

            const data = db.read();
            const player = data.players?.[userId];

            if (!player || !player.inventory) {
                return await interaction.reply({ content: '❌ 玩家資料異常。', ephemeral: true });
            }

            // 讀取分解規則
            const rulePath = path.join(process.cwd(), 'data', 'deconstruct.json');
            const rules = JSON.parse(fs.readFileSync(rulePath, 'utf8'));

            if (!rules[itemName]) {
                return await interaction.reply({ content: `❌ ${itemName} 無法分解。`, ephemeral: true });
            }

            const rule = rules[itemName];
            const itemCount = player.inventory.filter(item => 
                (typeof item === 'string' ? item : item.name) === itemName
            ).length;

            if (itemCount === 0) {
                return await interaction.reply({ content: `❌ 你沒有 ${itemName} 可以分解。`, ephemeral: true });
            }

            // 決定分解數量
            let decomposeCount;
            if (amountType === 'single') {
                decomposeCount = 1;
            } else if (amountType === 'all') {
                decomposeCount = itemCount;
            } else {
                return await interaction.reply({ content: '❌ 無效的分解數量選項。', ephemeral: true });
            }

            // 移除物品
            let removed = 0;
            player.inventory = player.inventory.filter(item => {
                const name = typeof item === 'string' ? item : item.name;
                if (name === itemName && removed < decomposeCount) {
                    removed++;
                    return false;
                }
                return true;
            });

            // 添加產出
            const totalCrystals = rule.crystals * decomposeCount;
            player.crystals = (player.crystals || 0) + totalCrystals;

            const yields = [];
            for (let i = 0; i < decomposeCount; i++) {
                rule.yield.forEach(yieldItem => {
                    yields.push(yieldItem);
                    player.inventory.push(yieldItem);
                });
            }

            // 保存資料
            db.write(data);

            // 創建嵌入消息
            const embed = new EmbedBuilder()
                .setTitle('🔧 分解完成')
                .setDescription(`成功分解了 ${decomposeCount} 個 ${itemName}！`)
                .setColor(0xFFA500)
                .addFields(
                    { name: '📦 分解數量', value: `${decomposeCount} 個`, inline: true },
                    { name: '💎 獲得晶體', value: `${totalCrystals} 個`, inline: true },
                    { name: '🎁 獲得物品', value: yields.join(', '), inline: true }
                )
                .setFooter({ text: '分解系統' });

            await interaction.reply({ embeds: [embed] });

        } catch (err) {
            console.error('Decompose Execute Error:', err);
            await interaction.reply({ content: '❌ 分解過程中發生錯誤，請聯繫管理員。', ephemeral: true });
        }
    }
};