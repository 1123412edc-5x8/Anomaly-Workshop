const { EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const db = require('../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('market')
        .setDescription('黑市交易系統')
        .addSubcommand(subcommand =>
            subcommand.setName('prices')
                .setDescription('查看市場價格'))
        .addSubcommand(subcommand =>
            subcommand.setName('sell')
                .setDescription('出售物品')
                .addStringOption(option =>
                    option.setName('item')
                        .setDescription('要出售的物品名稱')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('quantity')
                        .setDescription('出售數量')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('buy')
                .setDescription('購買物品')
                .addStringOption(option =>
                    option.setName('item')
                        .setDescription('要購買的物品名稱')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('quantity')
                        .setDescription('購買數量')
                        .setRequired(true))),
    execute: async (interaction) => {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        let data = db.read();

        if (!data.players) data.players = {};
        if (!data.players[userId]) {
            return interaction.reply({ content: '請先開始遊戲！', ephemeral: true });
        }

        if (!data.market) {
            data.market = {
                prices: {},
                volatility: 0.1, // 價格波動率
                lastUpdate: Date.now()
            };
        }

        // 更新市場價格
        updateMarketPrices(data.market);

        const player = data.players[userId];

        switch (subcommand) {
            case 'prices':
                const pricesEmbed = new EmbedBuilder()
                    .setTitle('💰 黑市價格表')
                    .setDescription('實時波動的市場價格')
                    .setColor(0x2ECC71);

                const marketItems = [
                    '精密螺栓', '液壓活塞', '銅製線圈', '生鏽齒輪', '廢棄鋼板',
                    '脈衝電容', '冷凍液管', '樣本試管', '破碎記憶體', '能量核心',
                    '變異幾何體', '發光真菌絲', '硬化甲殼', '不明結晶', '焦黑骨架'
                ];

                marketItems.forEach(item => {
                    const price = data.market.prices[item] || 10;
                    const trend = getPriceTrend(item, data.market);
                    pricesEmbed.addFields({
                        name: item,
                        value: `${price} 💎 ${trend}`,
                        inline: true
                    });
                });

                pricesEmbed.setFooter({ text: '價格每小時更新 | 📈 上漲 📉 下跌 📊 穩定' });
                interaction.reply({ embeds: [pricesEmbed] });
                break;

            case 'sell':
                const sellItem = interaction.options.getString('item');
                const sellQuantity = interaction.options.getInteger('quantity');

                // 檢查玩家是否有足夠物品
                const itemCount = player.inventory.filter(i => i === sellItem || (i.name && i.name === sellItem)).length;
                if (itemCount < sellQuantity) {
                    return interaction.reply({ content: `你沒有足夠的 ${sellItem}！`, ephemeral: true });
                }

                const sellPrice = (data.market.prices[sellItem] || 10) * sellQuantity;
                player.entropy_crystal = (player.entropy_crystal || 0) + sellPrice;

                // 移除物品
                let removed = 0;
                player.inventory = player.inventory.filter(item => {
                    if (removed < sellQuantity && (item === sellItem || (item.name && item.name === sellItem))) {
                        removed++;
                        return false;
                    }
                    return true;
                });

                // 出售影響市場價格（供應增加，價格下跌）
                adjustMarketPrice(data.market, sellItem, -0.05 * sellQuantity);

                db.write(data);

                const sellEmbed = new EmbedBuilder()
                    .setTitle('💰 出售成功！')
                    .setDescription(`你出售了 ${sellQuantity} 個 ${sellItem}，獲得 ${sellPrice} 💎！`)
                    .setColor(0x27AE60);
                interaction.reply({ embeds: [sellEmbed] });
                break;

            case 'buy':
                const buyItem = interaction.options.getString('item');
                const buyQuantity = interaction.options.getInteger('quantity');

                const buyPrice = (data.market.prices[buyItem] || 10) * buyQuantity;
                if (!player.entropy_crystal || player.entropy_crystal < buyPrice) {
                    return interaction.reply({ content: `你的熵結晶不足！需要 ${buyPrice} 💎。`, ephemeral: true });
                }

                player.entropy_crystal -= buyPrice;

                // 添加物品到背包
                for (let i = 0; i < buyQuantity; i++) {
                    player.inventory.push(buyItem);
                }

                // 購買影響市場價格（需求增加，價格上漲）
                adjustMarketPrice(data.market, buyItem, 0.05 * buyQuantity);

                db.write(data);

                const buyEmbed = new EmbedBuilder()
                    .setTitle('🛒 購買成功！')
                    .setDescription(`你購買了 ${buyQuantity} 個 ${buyItem}，花費 ${buyPrice} 💎！`)
                    .setColor(0x3498DB);
                interaction.reply({ embeds: [buyEmbed] });
                break;
        }
    }
};

function updateMarketPrices(market) {
    const now = Date.now();
    const hoursSinceUpdate = (now - market.lastUpdate) / (1000 * 60 * 60);

    if (hoursSinceUpdate >= 1) {
        // 每小時更新價格
        const basePrices = {
            '精密螺栓': 5, '液壓活塞': 8, '銅製線圈': 6, '生鏽齒輪': 4, '廢棄鋼板': 7,
            '脈衝電容': 12, '冷凍液管': 15, '樣本試管': 10, '破碎記憶體': 18, '能量核心': 25,
            '變異幾何體': 20, '發光真菌絲': 16, '硬化甲殼': 22, '不明結晶': 30, '焦黑骨架': 14
        };

        for (const [item, basePrice] of Object.entries(basePrices)) {
            if (!market.prices[item]) {
                market.prices[item] = basePrice;
            }

            // 添加隨機波動
            const volatility = market.volatility;
            const change = (Math.random() - 0.5) * 2 * volatility;
            market.prices[item] = Math.max(1, Math.round(market.prices[item] * (1 + change)));
        }

        market.lastUpdate = now;
    }
}

function getPriceTrend(item, market) {
    // 簡化的趨勢指示器
    const price = market.prices[item] || 10;
    const basePrice = 10; // 假設基準價格

    if (price > basePrice * 1.1) return '📈';
    if (price < basePrice * 0.9) return '📉';
    return '📊';
}

function adjustMarketPrice(market, item, adjustment) {
    if (!market.prices[item]) market.prices[item] = 10;
    market.prices[item] = Math.max(1, Math.round(market.prices[item] * (1 + adjustment)));
}
