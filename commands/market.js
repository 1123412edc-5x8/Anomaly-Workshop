const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('market')
        .setDescription('工作坊動態交易市場')
        // 1. 價格查詢
        .addSubcommand(sub => sub.setName('prices').setDescription('查看目前即時匯率'))
        // 2. 購買
        .addSubcommand(sub => 
            sub.setName('buy')
                .setDescription('購買物資')
                .addStringOption(o => o.setName('item').setDescription('物品名稱').setRequired(true).setAutocomplete(true))
                .addIntegerOption(o => o.setName('amount').setDescription('購買數量').setMinValue(1).setRequired(true)))
        // 3. 賣出 (優化後的選項順序)
        .addSubcommand(sub => 
            sub.setName('sell')
                .setDescription('售出物資')
                .addStringOption(o => o.setName('item').setDescription('選擇出售物品').setRequired(true).setAutocomplete(true)) // 必填放在最前
                .addIntegerOption(o => o.setName('amount').setDescription('出售數量 (若全選則不需填寫)').setMinValue(1)) // 選填
                .addBooleanOption(o => o.setName('sell_all').setDescription('是否全部售出？'))), // 選填放在最後

    async autocomplete(interaction) {
        try {
            const focusedValue = interaction.options.getFocused();
            const sub = interaction.options.getSubcommand();
            const data = db.read();
            
            // 初始化價格資料防止空白
            const defaultPrices = { "生鏽齒輪": 100, "廢棄鋼板": 150, "變異幾何體": 300, "精密螺栓": 200, "預言水晶": 100 };
            if (!data.market_prices || Object.keys(data.market_prices).length === 0) {
                data.market_prices = defaultPrices;
                db.write(data);
            }
            const prices = data.market_prices;

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
                    name: `${name} (持有 x${count} | 回收單價: 💰${Math.floor((prices[name] || 100) * 0.8)})`,
                    value: name
                }));
                return await interaction.respond(choices.filter(c => c.name.includes(focusedValue)).slice(0, 25));
            }
        } catch (e) { console.error(e); }
    },

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        let data = db.read();
        const userId = interaction.user.id;
        const player = data.players?.[userId];
        if (!player) return interaction.reply({ content: '❌ 找不到您的存檔。', ephemeral: true });

        if (!data.market_prices) data.market_prices = {};

        // --- 查詢價格 ---
        if (sub === 'prices') {
            const list = Object.entries(data.market_prices).map(([n, p]) => `**${n}**: 💰 \`${p}\``).join('\n');
            const embed = new EmbedBuilder()
                .setTitle('📊 市場即時匯率')
                .setColor(0x3498db)
                .setDescription(list || "市場目前平穩，尚無波動。")
                .setTimestamp();
            return await interaction.reply({ embeds: [embed] });
        }

        const itemName = interaction.options.getString('item');
        let currentPrice = data.market_prices[itemName] || 100;

        // --- 購買 ---
        if (sub === 'buy') {
            const amount = interaction.options.getInteger('amount');
            const totalCost = currentPrice * amount;
            if ((player.entropy_crystal || 0) < totalCost) return interaction.reply({ content: '❌ 結晶不足。', ephemeral: true });

            data.market_prices[itemName] = currentPrice + Math.ceil(currentPrice * 0.02 * amount);
            player.entropy_crystal -= totalCost;
            for (let i = 0; i < amount; i++) player.inventory.push(itemName);
            
            db.write(data);
            return interaction.reply(`✅ 購買成功！購入 **${amount}** 個 **${itemName}**。漲至 \`${data.market_prices[itemName]}\``);
        }

        // --- 賣出 ---
        if (sub === 'sell') {
            const sellAll = interaction.options.getBoolean('sell_all') || false; // 預設為 False
            const amountInput = interaction.options.getInteger('amount');
            
            // 找出玩家背包中所有該物品的索引
            const indices = [];
            player.inventory.forEach((it, idx) => {
                if ((typeof it === 'string' ? it : it.name) === itemName) indices.push(idx);
            });

            if (indices.length === 0) return interaction.reply({ content: `❌ 你沒有 \`${itemName}\`。`, ephemeral: true });

            // 核心邏輯：如果選 sell_all 就全賣，否則看 amountInput，如果都沒填就賣 1 個
            const sellCount = sellAll ? indices.length : Math.min(amountInput || 1, indices.length);
            const unitSellPrice = Math.floor(currentPrice * 0.8);
            const profit = unitSellPrice * sellCount;

            // 價格下跌 (保底 10)
            data.market_prices[itemName] = Math.max(10, currentPrice - Math.ceil(currentPrice * 0.02 * sellCount));
            
            // 移除物品 (從後往前刪除避免索引偏移)
            indices.slice(0, sellCount).sort((a, b) => b - a).forEach(i => player.inventory.splice(i, 1));
            player.entropy_crystal = (player.entropy_crystal || 0) + profit;
            
            db.write(data);
            return interaction.reply(`💰 賣出成功！賣出 **${sellCount}** 個 **${itemName}**，獲得 **${profit}** 結晶。跌至 \`${data.market_prices[itemName]}\``);
        }
    }
};