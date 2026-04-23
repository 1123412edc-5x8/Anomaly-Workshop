const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/db');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('market')
        .setDescription('工作坊動態交易市場')
        // 1. 查看價格
        .addSubcommand(sub => sub.setName('prices').setDescription('查看當前物資動態匯率'))
        // 2. 買入
        .addSubcommand(sub => 
            sub.setName('buy')
                .setDescription('購買物資')
                .addStringOption(o => o.setName('item').setDescription('物品').setRequired(true).setAutocomplete(true))
                .addIntegerOption(o => o.setName('amount').setDescription('購買數量').setMinValue(1).setRequired(true)))
        // 3. 賣出 (修正後的選項結構)
        .addSubcommand(sub => 
            sub.setName('sell')
                .setDescription('售出物資')
                .addStringOption(o => o.setName('item').setDescription('選擇物品').setRequired(true).setAutocomplete(true))
                .addIntegerOption(o => o.setName('amount').setDescription('出售數量 (若選擇全部出售則此項無效)').setMinValue(1))
                .addBooleanOption(o => o.setName('sell_all').setDescription('是否出售全部？').setRequired(true))),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const sub = interaction.options.getSubcommand();
        const data = db.read();
        
        // 確保價格表有基礎資料，否則選單會是空的
        const defaultPrices = { "生鏽齒輪": 100, "廢棄鋼板": 150, "變異幾何體": 300 }; 
        const prices = data.market_prices || defaultPrices;

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
                name: `${name} (持有 x${count} | 回收價: 💰${Math.floor((prices[name] || 100) * 0.8)})`,
                value: name
            }));
            return await interaction.respond(choices.filter(c => c.name.includes(focusedValue)).slice(0, 25));
        }
    },

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        let data = db.read();
        const userId = interaction.user.id;
        const player = data.players?.[userId];
        if (!player) return interaction.reply({ content: '❌ 找不到存檔', ephemeral: true });

        if (!data.market_prices) data.market_prices = { "生鏽齒輪": 100, "廢棄鋼板": 150, "變異幾何體": 300 };

        if (sub === 'prices') {
            const embed = new EmbedBuilder()
                .setTitle('📊 異常工作坊 - 即時匯率')
                .setColor(0x3498db)
                .setDescription(Object.entries(data.market_prices).map(([n, p]) => `**${n}**: 💰 \`${p}\``).join('\n'));
            return await interaction.reply({ embeds: [embed] });
        }

        const itemName = interaction.options.getString('item');
        let currentPrice = data.market_prices[itemName] || 100;

        if (sub === 'buy') {
            const amount = interaction.options.getInteger('amount');
            const totalCost = currentPrice * amount;
            if ((player.entropy_crystal || 0) < totalCost) return interaction.reply({ content: '❌ 結晶不足', ephemeral: true });

            data.market_prices[itemName] = currentPrice + Math.ceil(currentPrice * 0.02 * amount);
            player.entropy_crystal -= totalCost;
            for (let i = 0; i < amount; i++) player.inventory.push(itemName);
            db.write(data);
            return interaction.reply(`✅ 購入 ${amount} 個 ${itemName}，價格漲至 \`${data.market_prices[itemName]}\``);
        }

        if (sub === 'sell') {
            const sellAll = interaction.options.getBoolean('sell_all');
            const inputAmount = interaction.options.getInteger('amount');
            
            const indices = [];
            player.inventory.forEach((it, idx) => {
                if ((typeof it === 'string' ? it : it.name) === itemName) indices.push(idx);
            });

            if (indices.length === 0) return interaction.reply({ content: '❌ 你沒有這個物品', ephemeral: true });

            // 判斷數量：若選「全部」則無視輸入數字
            const sellCount = sellAll ? indices.length : Math.min(inputAmount || 1, indices.length);
            const profit = Math.floor(currentPrice * 0.8) * sellCount;

            data.market_prices[itemName] = Math.max(10, currentPrice - Math.ceil(currentPrice * 0.02 * sellCount));
            
            indices.slice(0, sellCount).sort((a,b)=>b-a).forEach(i => player.inventory.splice(i, 1));
            player.entropy_crystal = (player.entropy_crystal || 0) + profit;
            
            db.write(data);
            return interaction.reply(`💰 賣出 ${sellCount} 個 ${itemName}，獲得 ${profit} 結晶，價格跌至 \`${data.market_prices[itemName]}\``);
        }
    }
};