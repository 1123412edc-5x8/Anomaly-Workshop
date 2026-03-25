const { EmbedBuilder } = require('discord.js');
const db = require('../utils/db');

module.exports = {
    name: 'rank',
    aliases: ['rank', '排行榜'],
    execute: async (message) => {
        const data = db.read();
        
        const players = Object.entries(data.players || {}).map(([userId, player]) => ({
            userId,
            weekly_points: player.weekly_points || 0,
            inventory_count: player.inventory?.length || 0,
            collected_items: player.collected_items?.length || 0
        }));

        // 按周積分排序
        const weeklyRank = players.sort((a, b) => b.weekly_points - a.weekly_points).slice(0, 10);
        
        // 藏品最多
        const collectorRank = players.sort((a, b) => b.collected_items - a.collected_items).slice(0, 5);

        const embed = new EmbedBuilder()
            .setTitle('🏆 本週排行榜')
            .setDescription('積分將在每週一 UTC+8 00:00 重置')
            .setColor(0xFFD700);

        // 本週積分排名
        let rankText = '';
        weeklyRank.forEach((p, idx) => {
            const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'][idx];
            rankText += `${medal} 玩家 #${p.userId.slice(0, 4)} - **${p.weekly_points}** 積分\n`;
        });
        embed.addFields({ name: '📊 本週積分榜', value: rankText || '暫無數據', inline: false });

        // 道具收集最多
        let collectorText = '';
        collectorRank.forEach((p, idx) => {
            collectorText += `${idx + 1}. 玩家 #${p.userId.slice(0, 4)} - **${p.collected_items}** 個\n`;
        });
        embed.addFields({ name: '📖 圖鑑收集榜', value: collectorText || '暫無數據', inline: true });

        embed.setFooter({ text: '🥇 第 1 名: 500 金幣 | 🥈 第 2-5 名: 300 金幣 | 🥉 第 6-10 名: 100 金幣' });

        message.reply({ embeds: [embed] });
    }
};
        let entropyText = '';
        entropyRank.forEach((p, idx) => {
            entropyText += `${idx + 1}. 玩家 #${p.userId.slice(0, 4)} - 平均 \`${p.avg_entropy}\`\n`;
        });
        embed.addFields({ name: '🌀 熵值高手', value: entropyText || '暫無數據', inline: true });

        embed.setFooter({ text: '每小時更新一次' });

        message.reply({ embeds: [embed] });
    }
};
