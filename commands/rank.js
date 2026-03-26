const { EmbedBuilder } = require('discord.js');
const db = require('../utils/db');

function parseTargetId(message, args = []) {
    if (!args.length) return message.author.id;

    const raw = String(args[0]).trim();
    const mentionMatch = raw.match(/^<@!?(\d+)>$/);
    if (mentionMatch) return mentionMatch[1];

    // 支援直接輸入玩家 ID（不限制長度與格式，避免舊資料鍵值無法查詢）
    if (raw.length > 0) return raw;

    return null;
}

module.exports = {
    name: 'rank',
    aliases: ['rank', '排行榜'],
    execute: async (message, args = []) => {
        const targetUserId = parseTargetId(message, args);
        if (!targetUserId) {
            return message.reply('❌ 用法：`~rank` 或 `~rank <玩家ID>`');
        }

        let data;
        try {
            data = db.read();
        } catch (error) {
            console.error('讀取資料失敗 [rank]:', error);
            return message.reply('❌ 讀取排行榜資料失敗，請稍後再試。');
        }

        if (!data || typeof data !== 'object') {
            return message.reply('❌ 排行榜資料格式異常，請通知管理員檢查 data.json。');
        }

        const playersObj = (data.players && typeof data.players === 'object') ? data.players : {};
        const players = Object.entries(playersObj).map(([userId, player]) => ({
            userId,
            weekly_points: Number(player?.weekly_points) || 0,
            collected_items: Array.isArray(player?.collected_items) ? player.collected_items.length : 0
        }));

        if (!players.length) {
            return message.reply('📭 目前還沒有任何玩家數據，先使用 `~s` 開始遊戲吧！');
        }

        const weeklySorted = [...players].sort((a, b) => b.weekly_points - a.weekly_points);
        const collectorSorted = [...players].sort((a, b) => b.collected_items - a.collected_items);

        const weeklyRank = weeklySorted.slice(0, 10);
        const collectorRank = collectorSorted.slice(0, 5);

        const targetStats = playersObj[targetUserId];
        const targetWeeklyPos = weeklySorted.findIndex((p) => p.userId === targetUserId);
        const targetCollectorPos = collectorSorted.findIndex((p) => p.userId === targetUserId);

        const embed = new EmbedBuilder()
            .setTitle('🏆 本週排行榜')
            .setDescription('可用 `~rank <玩家ID>` 查詢指定玩家排名')
            .setColor(0xFFD700);

        let rankText = '';
        weeklyRank.forEach((p, idx) => {
            const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'][idx] || `${idx + 1}.`;
            rankText += `${medal} ID: \`${p.userId}\` - **${p.weekly_points}** 積分\n`;
        });
        embed.addFields({ name: '📊 本週積分榜', value: rankText || '暫無數據', inline: false });

        let collectorText = '';
        collectorRank.forEach((p, idx) => {
            collectorText += `${idx + 1}. ID: \`${p.userId}\` - **${p.collected_items}** 個\n`;
        });
        embed.addFields({ name: '📖 圖鑑收集榜', value: collectorText || '暫無數據', inline: false });

        if (targetStats) {
            const targetWeeklyPoints = Number(targetStats.weekly_points) || 0;
            const targetCollected = Array.isArray(targetStats.collected_items) ? targetStats.collected_items.length : 0;
            embed.addFields({
                name: '🎯 指定玩家查詢',
                value: `ID: \`${targetUserId}\`\n本週積分：**${targetWeeklyPoints}**（第 **${targetWeeklyPos + 1}** 名）\n圖鑑收集：**${targetCollected}**（第 **${targetCollectorPos + 1}** 名）`,
                inline: false
            });
        } else {
            embed.addFields({
                name: '🎯 指定玩家查詢',
                value: `ID: \`${targetUserId}\` 尚無資料（請先使用 \`~s\` 建立玩家資料）。`,
                inline: false
            });
        }

        embed.setFooter({ text: '🥇 第 1 名: 500 金幣 | 🥈 第 2-5 名: 300 金幣 | 🥉 第 6-10 名: 100 金幣' });

        return message.reply({ embeds: [embed] });
    }
};
