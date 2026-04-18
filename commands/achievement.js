const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../utils/db');

module.exports = {
    name: 'achievement',
    aliases: ['ach', '成就'],
    execute: async (message) => {
        const userId = message.author.id;
        let data = db.read();

        // 初始化玩家數據
        if (!data.players) data.players = {};
        if (!data.players[userId]) {
            const embed = new EmbedBuilder()
                .setTitle('❌ 無法查看成就')
                .setDescription('🎮 你還沒有開始遊戲！')
                .setColor(0xFF0000);
            return message.reply({ embeds: [embed] });
        }

        const player = data.players[userId];
        const achievements = player.achievements || [];

        const allAchievements = [
            { id: 1, name: '初出茅廬', desc: '完成第一次拾荒', icon: '🌱' },
            { id: 2, name: '品味收藏', desc: '收集 10 個不同物品', icon: '📦' },
            { id: 3, name: '完美維護', desc: '將物品耐久修復至 100%', icon: '🔧' },
            { id: 4, name: '合成大師', desc: '成功合成 5 個物品', icon: '✨' },
            { id: 5, name: '全域遊歷', desc: '訪問所有地區', icon: '🗺️' },
            { id: 6, name: '戰鬥勇者', desc: '贏得 10 場戰鬥', icon: '⚔️' },
            { id: 7, name: '熵值控制者', desc: '將物品熵值控制在 5 以下', icon: '🌀' },
            { id: 8, name: '富豪', desc: '擁有 500 熵結晶', icon: '💎' },
            { id: 9, name: '傳說獵手', desc: '獲得傳說級物品', icon: '👑' },
            { id: 10, name: '無所不能', desc: '完成所有成就', icon: '🏆' }
        ];

        const embed = new EmbedBuilder()
            .setTitle('🏅 成就系統')
            .setColor(0xFFD700)
            .setDescription(`已解鎖：\`${achievements.length}\` / ${allAchievements.length}`);

        allAchievements.forEach(ach => {
            const unlocked = achievements.includes(ach.id);
            const status = unlocked ? '✅ 已解鎖' : '🔒 未解鎖';
            
            embed.addFields({
                name: `${ach.icon} ${ach.name}`,
                value: `${ach.desc}\n${status}`,
                inline: false
            });
        });

        message.reply({ embeds: [embed] });
    }
};
