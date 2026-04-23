const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('market')
        .setDescription('工作坊動態交易市場')
        // 子指令 1: 查看價格
        .addSubcommand(sub => 
            sub.setName('prices')
                .setDescription('查看當前物資動態匯率'))
        // 子指令 2: 買入 (漲價邏輯)
        .addSubcommand(sub => 
            sub.setName('buy')
                .setDescription('購買物資（需求增加會導致價格上漲）')
                .addStringOption(o => o.setName('item').setDescription('選擇物品').setRequired(true).setAutocomplete(true))
                .addIntegerOption(o => o.setName('amount').setDescription('購買數量').setMinValue(1).setRequired(true)))
        // 子指令 3: 賣出 (跌價邏輯)
        .addSubcommand(sub => 
            sub.setName('sell')
                .setDescription('售出物資（供應增加會導致價格下跌）')
                .addStringOption(o => o.setName('item').setDescription('選擇物品').setRequired(true).setAutocomplete(true))
                .addStringOption(o => o.setName('amount').setDescription('數量').setRequired(true).addChoices(
                    { name: '售出一個', value: 'single' },
                    { name: '全部售出', value: 'all' }
                ))),

    // --- 自動補齊選單 (買賣共用邏輯) ---
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const sub = interaction.options.getSubcommand();
        const data = db.read();
        const prices = data.market_prices || {};

        if (sub === 'buy') {
            // 買入選單：顯示市場現有的定價
            const choices = Object.keys(prices).map(name => ({
                name: `${name} (單價: 💰${prices[name]})`,
                value: name
            }));
            return await interaction.respond(choices.filter(c => c.name.includes(focusedValue)).slice(0, 25));
        }

        if (sub === 'sell') {
            // 賣出選單：顯示背包有的物品與預計回收價
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
        if (!player) return interaction.reply({ content: '❌ 找不到玩家存檔', ephemeral: true });

        // 初始化價格表
        if (!data.market_prices) data.market_prices = {};

        // --- 功能 A: 查看價格 (Prices) ---
        if (sub === 'prices') {
            const embed = new EmbedBuilder()
                .setTitle('📊 異常工作坊 - 即時匯率')
                .setColor(0x3498db)
                .setTimestamp();
            
            const priceList = Object.entries(data.market_prices)
                .map(([n, p]) => `**${n}**: 💰 \`${p}\``)
                .join('\n') || "市場目前平穩，尚無波動。";
                
            embed.setDescription(priceList);
            return await interaction.reply({ embeds: [embed] });
        }

        const itemName = interaction.options.getString('item');
        let currentPrice = data.market_prices[itemName] || 100;

        // --- 功能 B: 買入 (Buy) ---
        if (sub === 'buy') {
            const amount = interaction.options.getInteger('amount');
            const totalCost = currentPrice * amount;

            if ((player.entropy_crystal || 0) < totalCost) {
                return interaction.reply({ content: `❌ 結晶不足！需 ${totalCost}，你只有 ${player.entropy_crystal}`, ephemeral: true });
            }

            // 價格上漲：每買一個漲 2%
            const priceIncrease = Math.ceil(currentPrice * 0.02 * amount);
            data.market_prices[itemName] = currentPrice + priceIncrease;

            player.entropy_crystal -= totalCost;
            for (let i = 0; i < amount; i++) player.inventory.push(itemName);

            db.write(data);
            return interaction.reply(`✅ 購買成功！\n💸 花費：${totalCost} 結晶\n📈 價格波動：${itemName} 漲至 \`${data.market_prices[itemName]}\``);
        }

        // --- 功能 C: 賣出 (Sell) ---
        if (sub === 'sell') {
            const amtType = interaction.options.getString('amount');
            const indices = [];
            player.inventory.forEach((it, idx) => {
                if ((typeof it === 'string' ? it : it.name) === itemName) indices.push(idx);
            });

            if (indices.length === 0) return interaction.reply({ content: '❌ 背包裡沒有這個物品', ephemeral: true });

            const sellCount = amtType === 'all' ? indices.length : 1;
            const sellUnitPrice = Math.floor(currentPrice * 0.8);
            const totalProfit = sellUnitPrice * sellCount;

            // 價格下跌：每賣一個跌 2%
            const priceDecrease = Math.ceil(currentPrice * 0.02 * sellCount);
            data.market_prices[itemName] = Math.max(10, currentPrice - priceDecrease);

            // 移除物品
            indices.slice(0, sellCount).sort((a,b)=>b-a).forEach(i => player.inventory.splice(i, 1));
            player.entropy_crystal = (player.entropy_crystal || 0) + totalProfit;

            db.write(data);
            return interaction.reply(`💰 售出成功！\n💵 獲得：${totalProfit} 結晶\n📉 價格波動：${itemName} 跌至 \`${data.market_prices[itemName]}\``);
        }
    }
};