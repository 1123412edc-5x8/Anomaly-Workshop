const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('market')
        .setDescription('工作坊動態交易市場')
        // 1. 查看價格
        .addSubcommand(sub => sub.setName('prices').setDescription('查看目前即時匯率'))
        // 2. 購買
        .addSubcommand(sub => 
            sub.setName('buy')
                .setDescription('購買物資')
                .addStringOption(o => o.setName('item').setDescription('物品名稱').setRequired(true).setAutocomplete(true))
                .addIntegerOption(o => o.setName('amount').setDescription('購買數量').setMinValue(1).setRequired(true)))
        // 3. 賣出單一物品 (維持原本邏輯)
        .addSubcommand(sub => 
            sub.setName('sell')
                .setDescription('售出特定物資')
                .addStringOption(o => o.setName('item').setDescription('選擇出售物品').setRequired(true).setAutocomplete(true))
                .addIntegerOption(o => o.setName('amount').setDescription('出售數量 (不填則預設賣出 1 個)').setMinValue(1)))
        // 4. 全部售出 (新增！這就是你要的「一鍵清空」)
        .addSubcommand(sub => 
            sub.setName('sell_all')
                .setDescription('一鍵售出背包內所有可交易物資')),

    async autocomplete(interaction) {
        try {
            const focusedValue = interaction.options.getFocused();
            const sub = interaction.options.getSubcommand();
            const data = db.read();
            const prices = data.market_prices || { "預言水晶": 100, "生鏽齒輪": 100 };

            if (sub === 'buy') {
                const choices = Object.keys(prices).map(name => ({
                    name: `${name} (單價: 💰${prices[name]})`,
                    value: name
                }));
                return await interaction.respond(choices.filter(c => c.name.includes(focusedValue)).slice(0, 25));
            }

            if (sub === 'sell') {
                const player = data.players?.[interaction.user.id];
                if (!player?.inventory) return await interaction.respond([]);
                const counts = {};
                player.inventory.forEach(i => {
                    const name = typeof i === 'string' ? i : i.name;
                    counts[name] = (counts[name] || 0) + 1;
                });
                const choices = Object.entries(counts).map(([name, count]) => ({
                    name: `${name} (持有 x${count} | 單價: 💰${Math.floor((prices[name] || 100) * 0.8)})`,
                    value: name
                }));
                return await interaction.respond(choices.filter(c => c.name.includes(focusedValue)).slice(0, 25));
            }
        } catch (e) { console.error(e); }
    },

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        let data = db.read();
        const player = data.players?.[interaction.user.id];
        if (!player) return interaction.reply({ content: '❌ 找不到存檔。', ephemeral: true });

        if (!data.market_prices) data.market_prices = {};

        // --- 1. 查看價格 ---
        if (sub === 'prices') {
            const list = Object.entries(data.market_prices).map(([n, p]) => `**${n}**: 💰 \`${p}\``).join('\n');
            return await interaction.reply({ embeds: [new EmbedBuilder().setTitle('📊 市場匯率').setDescription(list || "尚無波動").setColor(0x3498db)] });
        }

        // --- 2. 全部售出 (一鍵清空) ---
        if (sub === 'sell_all') {
            if (!player.inventory || player.inventory.length === 0) return interaction.reply({ content: '📭 背包是空的，沒什麼好賣的。', ephemeral: true });

            let totalProfit = 0;
            let soldItems = {};

            // 處理所有物品
            player.inventory.forEach(item => {
                const name = typeof item === 'string' ? item : item.name;
                const price = data.market_prices[name] || 100;
                const sellPrice = Math.floor(price * 0.8);
                
                totalProfit += sellPrice;
                soldItems[name] = (soldItems[name] || 0) + 1;
                
                // 每賣一個跌 2%
                data.market_prices[name] = Math.max(10, price - Math.ceil(price * 0.02));
            });

            player.inventory = []; // 清空背包
            player.entropy_crystal = (player.entropy_crystal || 0) + totalProfit;
            
            db.write(data);
            
            const summary = Object.entries(soldItems).map(([n, c]) => `${n} x${c}`).join(', ');
            return interaction.reply(`♻️ **一鍵回收成功！**\n📦 售出：${summary}\n💰 總計獲得：**${totalProfit}** 結晶。`);
        }

        // --- 3. 買入 & 4. 單一賣出 (略，維持原本優化後的邏輯) ---
        const itemName = interaction.options.getString('item');
        let currentPrice = data.market_prices[itemName] || 100;

        if (sub === 'buy') {
            const amount = interaction.options.getInteger('amount');
            const cost = currentPrice * amount;
            if (player.entropy_crystal < cost) return interaction.reply({ content: '❌ 結晶不足。', ephemeral: true });
            data.market_prices[itemName] = currentPrice + Math.ceil(currentPrice * 0.02 * amount);
            player.entropy_crystal -= cost;
            for (let i = 0; i < amount; i++) player.inventory.push(itemName);
            db.write(data);
            return interaction.reply(`✅ 買入成功！${itemName} 單價漲至 \`${data.market_prices[itemName]}\``);
        }

        if (sub === 'sell') {
            const amount = interaction.options.getInteger('amount') || 1;
            const indices = [];
            player.inventory.forEach((it, idx) => { if ((typeof it === 'string' ? it : it.name) === itemName) indices.push(idx); });

            if (indices.length === 0) return interaction.reply({ content: `❌ 你沒有 ${itemName}。`, ephemeral: true });

            const sellCount = Math.min(amount, indices.length);
            const profit = Math.floor(currentPrice * 0.8) * sellCount;

            data.market_prices[itemName] = Math.max(10, currentPrice - Math.ceil(currentPrice * 0.02 * sellCount));
            indices.slice(0, sellCount).sort((a,b)=>b-a).forEach(i => player.inventory.splice(i, 1));
            player.entropy_crystal = (player.entropy_crystal || 0) + profit;
            
            db.write(data);
            return interaction.reply(`💰 售出成功！獲得 **${profit}** 結晶。跌至 \`${data.market_prices[itemName]}\``);
        }
    }
};