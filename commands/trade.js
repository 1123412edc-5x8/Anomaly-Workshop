const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const db = require('../utils/db');

module.exports = {
    name: 'trade',
    aliases: ['trade', '交易'],
    execute: async (message, args = []) => {
        const userId = message.author.id;
        let data = db.read();

        // 初始化玩家數據
        if (!data.players) data.players = {};
        if (!data.players[userId]) {
            return message.reply('🎒 請先使用 `~s` 拾荒獲得零件！');
        }

        const player = data.players[userId];

        if (!args[0]) {
            // 顯示交易菜單
            const embed = new EmbedBuilder()
                .setTitle('💱 玩家交易系統')
                .setColor(0x00CED1)
                .setDescription('選擇你要進行的交易操作：')
                .addFields(
                    { name: '📤 列出我要交易的物品', value: '使用 `~trade list` 查看你的物品列表' },
                    { name: '🤝 發起交易請求', value: '使用 `~trade request [@玩家] [我的物品] [@玩家的物品]`' },
                    { name: '💼 查看待交易', value: '使用 `~trade pending` 查看收到的交易請求' },
                    { name: '📋 交易紀錄', value: '使用 `~trade history` 查看過去的交易紀錄' }
                )
                .setFooter({ text: '交易系統正式開啟' });

            return message.reply({ embeds: [embed] });
        }

        const subcommand = args[0];

        if (subcommand === 'list') {
            // 列出用戶的物品
            if (player.inventory.length === 0) {
                return message.reply('🎒 你的背包是空的，無法進行交易。');
            }

            const embed = new EmbedBuilder()
                .setTitle(`🎒 ${message.author.username} 的物品列表`)
                .setColor(0x00CED1)
                .setDescription('以下是你可以交易的物品：');

            player.inventory.forEach((item, index) => {
                const durBar = '█'.repeat(Math.floor(item.durability / 10)) + 
                              '░'.repeat(10 - Math.floor(item.durability / 10));
                
                embed.addFields({
                    name: `【${index}】${item.name}`,
                    value: `> 🛠️ 耐久：\`${durBar}\` (${item.durability}%)\n> 🌀 熵值：\`${item.entropy}\``,
                    inline: false
                });
            });

            embed.setFooter({ text: '編號從 0 開始 | 在交易時使用編號' });

            message.reply({ embeds: [embed] });

        } else if (subcommand === 'request') {
            // 發起交易請求
            const targetUser = message.mentions.users.first();
            const myItemIndex = parseInt(args[2]);
            const theirItemIndex = parseInt(args[4]);

            if (!targetUser || isNaN(myItemIndex) || isNaN(theirItemIndex)) {
                return message.reply('❌ 格式錯誤！\n使用：`~trade request [@玩家] [我的物品編號] [@玩家] [他們的物品編號]`\n例：`~trade request @玩家A 0 @玩家A 1`');
            }

            if (!data.players[targetUser.id]) {
                return message.reply('❌ 目標玩家還沒開始遊戲！');
            }

            const targetPlayer = data.players[targetUser.id];
            const myItem = player.inventory[myItemIndex];
            const theirItem = targetPlayer.inventory[theirItemIndex];

            if (!myItem || !theirItem) {
                return message.reply('❌ 物品編號無效！');
            }

            // 初始化交易待轉
            if (!data.pending_trades) data.pending_trades = [];

            const tradeOffer = {
                id: Date.now(),
                from_user: userId,
                from_username: message.author.username,
                to_user: targetUser.id,
                to_username: targetUser.username,
                from_item: {
                    index: myItemIndex,
                    name: myItem.name,
                    durability: myItem.durability,
                    entropy: myItem.entropy
                },
                to_item: {
                    index: theirItemIndex,
                    name: theirItem.name,
                    durability: theirItem.durability,
                    entropy: theirItem.entropy
                },
                status: 'pending',
                created_at: new Date().toISOString()
            };

            data.pending_trades.push(tradeOffer);
            db.write(data);

            const embed = new EmbedBuilder()
                .setTitle('💱 交易請求已發送')
                .setColor(0x00FF00)
                .setDescription(`已向 **${targetUser.username}** 發起交易請求！`)
                .addFields(
                    { name: '你提供的物品', value: `**${myItem.name}**\n耐久：${myItem.durability}% | 熵值：${myItem.entropy}` },
                    { name: '對方提供的物品', value: `**${theirItem.name}**\n耐久：${theirItem.durability}% | 熵值：${theirItem.entropy}` }
                );

            message.reply({ embeds: [embed] });

            // 通知對方
            try {
                const targetMember = await message.guild.members.fetch(targetUser.id);
                const notifyEmbed = new EmbedBuilder()
                    .setTitle('🔔 新的交易請求')
                    .setColor(0xFF8C00)
                    .setDescription(`**${message.author.username}** 希望與你進行交易！`)
                    .addFields(
                        { name: '他們要求', value: `**${theirItem.name}** (編號 ${theirItemIndex})\n耐久：${theirItem.durability}% | 熵值：${theirItem.entropy}` },
                        { name: '他們提供', value: `**${myItem.name}**\n耐久：${myItem.durability}% | 熵值：${myItem.entropy}` }
                    )
                    .setFooter({ text: `交易 ID：${tradeOffer.id} | 使用 ~trade accept/reject 接受或拒絕` });

                await targetMember.send({ embeds: [notifyEmbed] });
            } catch (err) {
                console.log('無法發送私訊給對方');
            }

        } else if (subcommand === 'pending') {
            // 查看待處理交易
            if (!data.pending_trades || data.pending_trades.length === 0) {
                return message.reply('📭 你沒有待處理的交易請求。');
            }

            const myPending = data.pending_trades.filter(trade => trade.to_user === userId && trade.status === 'pending');

            if (myPending.length === 0) {
                return message.reply('📭 你沒有待處理的交易請求。');
            }

            const embed = new EmbedBuilder()
                .setTitle('💼 待交易請求')
                .setColor(0xFF8C00);

            myPending.forEach((trade, idx) => {
                embed.addFields({
                    name: `【${idx}】來自 ${trade.from_username}`,
                    value: `要求你的：**${trade.to_item.name}** (編號 ${trade.to_item.index})\n他提供：**${trade.from_item.name}**\n\n使用 \`~trade accept ${trade.id}\` 或 \`~trade reject ${trade.id}\``,
                    inline: false
                });
            });

            message.reply({ embeds: [embed] });

        } else if (subcommand === 'accept') {
            // 接受交易
            const tradeId = parseInt(args[1]);

            if (!data.pending_trades) {
                return message.reply('❌ 交易記錄不存在。');
            }

            const trade = data.pending_trades.find(t => t.id === tradeId);

            if (!trade || trade.to_user !== userId) {
                return message.reply('❌ 找不到該交易請求。');
            }

            if (trade.status !== 'pending') {
                return message.reply('❌ 該交易已經處理過了。');
            }

            // 執行交易
            const sender = data.players[trade.from_user];
            const receiver = data.players[trade.to_user];

            const senderItem = sender.inventory[trade.from_item.index];
            const receiverItem = receiver.inventory[trade.to_item.index];

            if (!senderItem || !receiverItem) {
                return message.reply('❌ 物品已不存在，交易無法進行。');
            }

            // 交換物品
            sender.inventory[trade.from_item.index] = receiverItem;
            receiver.inventory[trade.to_item.index] = senderItem;

            // 記錄交易歷史
            if (!data.trade_history) data.trade_history = [];
            data.trade_history.push({
                ...trade,
                status: 'completed',
                completed_at: new Date().toISOString()
            });

            // 更新交易狀態
            trade.status = 'completed';
            data.pending_trades = data.pending_trades.filter(t => t.id !== tradeId);
            db.write(data);

            const embed = new EmbedBuilder()
                .setTitle('✅ 交易成功！')
                .setColor(0x00FF00)
                .addFields(
                    { name: '你獲得', value: `**${trade.from_item.name}**` },
                    { name: '你失去', value: `**${trade.to_item.name}**` }
                );

            message.reply({ embeds: [embed] });

        } else if (subcommand === 'reject') {
            // 拒絕交易
            const tradeId = parseInt(args[1]);

            if (!data.pending_trades) {
                return message.reply('❌ 交易記錄不存在。');
            }

            const tradeIndex = data.pending_trades.findIndex(t => t.id === tradeId);
            const trade = data.pending_trades[tradeIndex];

            if (!trade || trade.to_user !== userId) {
                return message.reply('❌ 找不到該交易請求。');
            }

            data.pending_trades.splice(tradeIndex, 1);
            db.write(data);

            const embed = new EmbedBuilder()
                .setTitle('❌ 交易已拒絕')
                .setColor(0xFF0000)
                .setDescription(`已拒絕 **${trade.from_username}** 的交易請求。`);

            message.reply({ embeds: [embed] });

        } else if (subcommand === 'history') {
            // 查看交易歷史
            if (!data.trade_history || data.trade_history.length === 0) {
                return message.reply('📭 你還沒有完成過任何交易。');
            }

            const myHistory = data.trade_history.filter(
                trade => trade.from_user === userId || trade.to_user === userId
            ).slice(-10);

            const embed = new EmbedBuilder()
                .setTitle('📋 交易歷史')
                .setColor(0x00CED1)
                .setDescription(`顯示最近的 ${myHistory.length} 次交易：`);

            myHistory.forEach((trade) => {
                const direction = trade.from_user === userId ? '發送' : '接收';
                embed.addFields({
                    name: `${direction} - ${trade.from_username} ↔️ ${trade.to_username}`,
                    value: `交換：**${trade.from_item.name}** → **${trade.to_item.name}**\n時間：${new Date(trade.completed_at).toLocaleString('zh-TW')}`,
                    inline: false
                });
            });

            message.reply({ embeds: [embed] });

        } else {
            message.reply('❌ 無效的子命令。使用 `~trade` 查看帮助。');
        }
    }
};
