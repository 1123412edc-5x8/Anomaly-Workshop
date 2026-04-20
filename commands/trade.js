const { EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('trade')
        .setDescription('玩家交易系統')
        .addSubcommand(subcommand =>
            subcommand.setName('list')
                .setDescription('列出你的交易物品'))
        .addSubcommand(subcommand =>
            subcommand.setName('offer')
                .setDescription('發起交易請求')
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('交易對象')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('your_item')
                        .setDescription('你提供的物品名稱')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('their_item')
                        .setDescription('你想要的物品名稱')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('pending')
                .setDescription('查看待處理的交易請求'))
        .addSubcommand(subcommand =>
            subcommand.setName('history')
                .setDescription('查看交易歷史'))
        .addSubcommand(subcommand =>
            subcommand.setName('cancel')
                .setDescription('取消交易請求')
                .addStringOption(option =>
                    option.setName('trade_id')
                        .setDescription('交易ID')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        let data = db.read();

        if (!data.players) data.players = {};
        if (!data.players[userId]) {
            return interaction.reply({ content: '請先開始遊戲！', ephemeral: true });
        }

        const player = data.players[userId];

        // 初始化交易數據
        if (!data.trades) data.trades = {};
        if (!player.tradeHistory) player.tradeHistory = [];

        switch (subcommand) {
            case 'list':
                await showTradeableItems(interaction, player);
                break;
            case 'offer':
                const target = interaction.options.getUser('target');
                const yourItem = interaction.options.getString('your_item');
                const theirItem = interaction.options.getString('their_item');
                await createTradeOffer(interaction, player, target, yourItem, theirItem, data);
                break;
            case 'pending':
                await showPendingTrades(interaction, userId, data);
                break;
            case 'history':
                await showTradeHistory(interaction, player);
                break;
            case 'cancel':
                const tradeId = interaction.options.getString('trade_id');
                await cancelTrade(interaction, userId, tradeId, data);
                break;
        }
    }
};

async function showTradeableItems(interaction, player) {
    if (!player.inventory || player.inventory.length === 0) {
        const embed = new EmbedBuilder()
            .setTitle('❌ 無法交易')
            .setDescription('你的背包是空的，沒有物品可以交易。')
            .setColor(0xFF0000);
        return interaction.reply({ embeds: [embed] });
    }

    const embed = new EmbedBuilder()
        .setTitle('📦 可交易物品')
        .setDescription('以下是你的背包中的物品，可以用於交易：')
        .setColor(0x00CED1);

    // 按稀有度分類顯示物品
    const itemsByRarity = {
        common: [],
        rare: [],
        epic: [],
        legendary: []
    };

    player.inventory.forEach((item, index) => {
        const rarity = item.rarity || 'common';
        itemsByRarity[rarity].push(`${index + 1}. ${item.name} (${item.type || '未知'})`);
    });

    Object.keys(itemsByRarity).forEach(rarity => {
        if (itemsByRarity[rarity].length > 0) {
            const rarityEmoji = {
                common: '⚪',
                rare: '💜',
                epic: '🔴',
                legendary: '👑'
            }[rarity];

            embed.addFields({
                name: `${rarityEmoji} ${rarity.charAt(0).toUpperCase() + rarity.slice(1)}`,
                value: itemsByRarity[rarity].join('\n'),
                inline: true
            });
        }
    });

    embed.setFooter({ text: '使用 /trade offer 發起交易請求' });

    await interaction.reply({ embeds: [embed] });
}

async function createTradeOffer(interaction, player, target, yourItem, theirItem, data) {
    if (target.id === interaction.user.id) {
        return interaction.reply({ content: '不能和自己交易！', ephemeral: true });
    }

    // 檢查玩家是否有該物品
    const yourItemIndex = findItemInInventory(player.inventory, yourItem);
    if (yourItemIndex === -1) {
        return interaction.reply({ content: `你在背包中沒有找到 "${yourItem}"！`, ephemeral: true });
    }

    // 創建交易請求
    const tradeId = generateTradeId();
    const tradeOffer = {
        id: tradeId,
        initiator: interaction.user.id,
        target: target.id,
        initiatorItem: yourItem,
        targetItem: theirItem,
        status: 'pending',
        created: Date.now(),
        expires: Date.now() + 24 * 60 * 60 * 1000 // 24小時後過期
    };

    data.trades[tradeId] = tradeOffer;

    // 添加到目標玩家的待處理交易
    const targetPlayer = data.players[target.id];
    if (!targetPlayer.pendingTrades) targetPlayer.pendingTrades = [];
    targetPlayer.pendingTrades.push(tradeId);

    db.write(data);

    const embed = new EmbedBuilder()
        .setTitle('📤 交易請求已發送')
        .setDescription(`你向 **${target.username}** 發起了交易請求：\n\n你提供：**${yourItem}**\n你想要：**${theirItem}**\n\n對方需要接受請求才能完成交易。`)
        .addFields({
            name: '⏰ 請求有效期',
            value: '24 小時',
            inline: true
        })
        .setColor(0x00CED1);

    await interaction.reply({ embeds: [embed] });

    // 通知目標玩家
    try {
        const dmEmbed = new EmbedBuilder()
            .setTitle('📨 新交易請求')
            .setDescription(`**${interaction.user.username}** 想要和你交易：\n\n他們提供：**${yourItem}**\n他們想要：**${theirItem}**`)
            .addFields({
                name: '💡 操作說明',
                value: '使用 `/trade pending` 查看並回應交易請求',
                inline: false
            })
            .setColor(0xFFFF00);

        await target.send({ embeds: [dmEmbed] });
    } catch (error) {
        // 如果無法發送DM，忽略錯誤
    }
}

async function showPendingTrades(interaction, userId, data) {
    const player = data.players[userId];
    const pendingTrades = player.pendingTrades || [];

    if (pendingTrades.length === 0) {
        const embed = new EmbedBuilder()
            .setTitle('📭 沒有待處理的交易')
            .setDescription('目前沒有任何交易請求。')
            .setColor(0xFFFF00);
        return interaction.reply({ embeds: [embed] });
    }

    const embed = new EmbedBuilder()
        .setTitle('📋 待處理的交易請求')
        .setDescription('選擇一個交易請求來查看詳情：')
        .setColor(0x00CED1);

    const buttons = [];
    pendingTrades.forEach(tradeId => {
        const trade = data.trades[tradeId];
        if (!trade || trade.status !== 'pending') return;

        const initiator = interaction.guild.members.cache.get(trade.initiator);
        const initiatorName = initiator ? initiator.user.username : '未知玩家';

        embed.addFields({
            name: `📝 交易 ${tradeId}`,
            value: `**${initiatorName}** 想要交易：\n提供：${trade.initiatorItem}\n想要：${trade.targetItem}`,
            inline: false
        });

        buttons.push(
            new ButtonBuilder()
                .setCustomId(`trade_accept_${tradeId}`)
                .setLabel(`接受 ${tradeId}`)
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`trade_decline_${tradeId}`)
                .setLabel(`拒絕 ${tradeId}`)
                .setStyle(ButtonStyle.Danger)
        );
    });

    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
        rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
    }

    const response = await interaction.reply({ embeds: [embed], components: rows });

    // 處理交易回應
    const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000
    });

    collector.on('collect', async (i) => {
        if (i.user.id !== userId) return;

        const [action, tradeId] = i.customId.split('_').slice(1);
        const trade = data.trades[tradeId];

        if (!trade || trade.target !== userId) return;

        if (action === 'accept') {
            await processTradeAcceptance(i, trade, data);
        } else if (action === 'decline') {
            await processTradeDecline(i, trade, data);
        }
    });
}

async function processTradeAcceptance(interaction, trade, data) {
    const initiator = data.players[trade.initiator];
    const target = data.players[trade.target];

    // 檢查雙方是否還有物品
    const initiatorItemIndex = findItemInInventory(initiator.inventory, trade.initiatorItem);
    const targetItemIndex = findItemInInventory(target.inventory, trade.targetItem);

    if (initiatorItemIndex === -1) {
        return interaction.reply({ content: `交易失敗：${trade.initiatorItem} 已不存在於發起者的背包中。`, ephemeral: true });
    }

    if (targetItemIndex === -1) {
        return interaction.reply({ content: `交易失敗：${trade.targetItem} 已不存在於你的背包中。`, ephemeral: true });
    }

    // 執行交易
    const initiatorItem = initiator.inventory.splice(initiatorItemIndex, 1)[0];
    const targetItem = target.inventory.splice(targetItemIndex, 1)[0];

    initiator.inventory.push(targetItem);
    target.inventory.push(initiatorItem);

    // 記錄交易歷史
    const tradeRecord = {
        id: trade.id,
        timestamp: Date.now(),
        initiator: trade.initiator,
        target: trade.target,
        initiatorItem: trade.initiatorItem,
        targetItem: trade.targetItem,
        status: 'completed'
    };

    initiator.tradeHistory.push(tradeRecord);
    target.tradeHistory.push(tradeRecord);

    // 清理交易數據
    delete data.trades[trade.id];
    initiator.pendingTrades = initiator.pendingTrades.filter(id => id !== trade.id);
    target.pendingTrades = target.pendingTrades.filter(id => id !== trade.id);

    db.write(data);

    const embed = new EmbedBuilder()
        .setTitle('✅ 交易完成！')
        .setDescription(`你成功與 **${interaction.guild.members.cache.get(trade.initiator)?.user.username || '玩家'}** 完成了交易！\n\n你獲得：**${trade.initiatorItem}**\n對方獲得：**${trade.targetItem}**`)
        .setColor(0x00FF00);

    await interaction.reply({ embeds: [embed] });

    // 通知發起者
    try {
        const initiatorUser = await interaction.guild.members.fetch(trade.initiator);
        const dmEmbed = new EmbedBuilder()
            .setTitle('✅ 交易完成')
            .setDescription(`你的交易請求已被接受！\n\n你獲得：**${trade.targetItem}**\n對方獲得：**${trade.initiatorItem}**`)
            .setColor(0x00FF00);

        await initiatorUser.send({ embeds: [dmEmbed] });
    } catch (error) {
        // 忽略DM發送錯誤
    }
}

async function processTradeDecline(interaction, trade, data) {
    const initiator = data.players[trade.initiator];
    const target = data.players[trade.target];

    // 清理交易數據
    delete data.trades[trade.id];
    initiator.pendingTrades = initiator.pendingTrades.filter(id => id !== trade.id);
    target.pendingTrades = target.pendingTrades.filter(id => id !== trade.id);

    db.write(data);

    const embed = new EmbedBuilder()
        .setTitle('❌ 交易已拒絕')
        .setDescription('你拒絕了這個交易請求。')
        .setColor(0xFF0000);

    await interaction.reply({ embeds: [embed] });

    // 通知發起者
    try {
        const initiatorUser = await interaction.guild.members.fetch(trade.initiator);
        const dmEmbed = new EmbedBuilder()
            .setTitle('❌ 交易被拒絕')
            .setDescription('你的交易請求被拒絕了。')
            .setColor(0xFF0000);

        await initiatorUser.send({ embeds: [dmEmbed] });
    } catch (error) {
        // 忽略DM發送錯誤
    }
}

async function showTradeHistory(interaction, player) {
    const history = player.tradeHistory || [];

    if (history.length === 0) {
        const embed = new EmbedBuilder()
            .setTitle('📚 交易歷史')
            .setDescription('你還沒有進行過任何交易。')
            .setColor(0xFFFF00);
        return interaction.reply({ embeds: [embed] });
    }

    const embed = new EmbedBuilder()
        .setTitle('📚 交易歷史')
        .setDescription(`總共完成 ${history.length} 筆交易`)
        .setColor(0x00CED1);

    // 顯示最近5筆交易
    const recentTrades = history.slice(-5).reverse();
    recentTrades.forEach(trade => {
        const date = new Date(trade.timestamp).toLocaleString('zh-TW');
        const partner = trade.initiator === interaction.user.id ? trade.target : trade.initiator;
        const partnerName = interaction.guild.members.cache.get(partner)?.user.username || '未知玩家';

        const gave = trade.initiator === interaction.user.id ? trade.initiatorItem : trade.targetItem;
        const received = trade.initiator === interaction.user.id ? trade.targetItem : trade.initiatorItem;

        embed.addFields({
            name: `📝 ${date}`,
            value: `與 **${partnerName}** 交易\n給出：${gave}\n獲得：${received}`,
            inline: false
        });
    });

    await interaction.reply({ embeds: [embed] });
}

async function cancelTrade(interaction, userId, tradeId, data) {
    const trade = data.trades[tradeId];

    if (!trade || trade.initiator !== userId) {
        return interaction.reply({ content: '找不到該交易或你沒有權限取消它。', ephemeral: true });
    }

    if (trade.status !== 'pending') {
        return interaction.reply({ content: '該交易已經完成或取消了。', ephemeral: true });
    }

    // 清理交易數據
    delete data.trades[tradeId];
    const targetPlayer = data.players[trade.target];
    if (targetPlayer.pendingTrades) {
        targetPlayer.pendingTrades = targetPlayer.pendingTrades.filter(id => id !== tradeId);
    }

    db.write(data);

    const embed = new EmbedBuilder()
        .setTitle('🗑️ 交易已取消')
        .setDescription('你成功取消了交易請求。')
        .setColor(0xFF6B6B);

    await interaction.reply({ embeds: [embed] });
}

function findItemInInventory(inventory, itemName) {
    if (!inventory) return -1;
    return inventory.findIndex(item =>
        item.name && item.name.toLowerCase().includes(itemName.toLowerCase())
    );
}

function generateTradeId() {
    return 'trade_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}