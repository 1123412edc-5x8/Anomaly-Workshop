const { EmbedBuilder } = require('discord.js');
const db = require('../utils/db');

module.exports = {
    name: 'rank',
    aliases: ['rank', '排行榜'],
    execute: async (message) => {
        const data = db.read();
        
        const players = Object.entries(data.players || {}).map(([userId, player]) => ({
            userId,
            level: player.level || 1,
            exp: player.exp || 0,
            inventory_count: player.inventory?.length || 0,
            avg_entropy: player.inventory?.length > 0 
                ? Math.floor(player.inventory.reduce((sum, item) => sum + item.entropy, 0) / player.inventory.length)
                : 0
        }));

        const levelRank = players.sort((a, b) => b.level - a.level).slice(0, 5);
        const expRank = players.sort((a, b) => b.exp - a.exp).slice(0, 5);
        const collectorRank = players.sort((a, b) => b.inventory_count - a.inventory_count).slice(0, 5);
        const entropyRank = players.sort((a, b) => b.avg_entropy - a.avg_entropy).slice(0, 5);

        const embed = new EmbedBuilder()
            .setTitle('🏆 全球排行榜')
            .setColor(0xFFD700);

        // 最高等級
        let levelText = '';
        levelRank.forEach((p, idx) => {
            levelText += `${idx + 1}. 玩家 #${p.userId.slice(0, 4)} - Lv. **${p.level}**\n`;
        });
        embed.addFields({ name: '⭐ 最高等級', value: levelText || '暫無數據', inline: true });

        // 最多經驗
        let expText = '';
        expRank.forEach((p, idx) => {
            expText += `${idx + 1}. 玩家 #${p.userId.slice(0, 4)} - \`${p.exp}\` EXP\n`;
        });
        embed.addFields({ name: '📈 經驗排名', value: expText || '暫無數據', inline: true });

        // 最多收集
        let collectorText = '';
        collectorRank.forEach((p, idx) => {
            collectorText += `${idx + 1}. 玩家 #${p.userId.slice(0, 4)} - **${p.inventory_count}** 件\n`;
        });
        embed.addFields({ name: '🎒 藏品最多', value: collectorText || '暫無數據', inline: true });

        // 熵值控制
        let entropyText = '';
        entropyRank.forEach((p, idx) => {
            entropyText += `${idx + 1}. 玩家 #${p.userId.slice(0, 4)} - 平均 \`${p.avg_entropy}\`\n`;
        });
        embed.addFields({ name: '🌀 熵值高手', value: entropyText || '暫無數據', inline: true });

        embed.setFooter({ text: '每小時更新一次' });

        message.reply({ embeds: [embed] });
    }
};
