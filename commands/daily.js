const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../utils/db');

// 每日任務池
const DAILY_TASKS = [
    { name: '拾荒探險家', description: '在任意地區拾荒 3 次', action: 'scavenge', target: 3, reward: 50, points: 50 },
    { name: '合成工程師', description: '執行升級 2 次', action: 'upgrade', target: 2, reward: 75, points: 75 },
    { name: '異常獵人', description: '戰鬥贏 1 次', action: 'battle_win', target: 1, reward: 100, points: 100 },
    { name: '全域漫遊者', description: '訪問所有 3 個地區', action: 'visit_all_regions', target: 3, reward: 60, points: 80 },
    { name: '稀有發現者', description: '拾荒獲得 1 個稀有物品', action: 'find_rare', target: 1, reward: 120, points: 150 }
];

function getDailyTasks(userId) {
    const data = db.read();
    if (!data.dailyTasks) data.dailyTasks = {};
    
    const today = new Date().toDateString();
    
    // 如果今天沒有生成任務，就生成新的
    if (!data.dailyTasks[userId] || data.dailyTasks[userId].date !== today) {
        const shuffled = DAILY_TASKS.sort(() => 0.5 - Math.random()).slice(0, 3);
        data.dailyTasks[userId] = {
            date: today,
            tasks: shuffled.map(t => ({ ...t, progress: 0 }))
        };
        db.write(data);
    }
    
    return data.dailyTasks[userId].tasks;
}

module.exports = {
    name: 'daily',
    aliases: ['d', '日挑', 'daily'],
    execute: async (message) => {
        const userId = message.author.id;
        const data = db.read();
        
        if (!data.players) data.players = {};
        if (!data.players[userId]) {
            const embed = new EmbedBuilder()
                .setTitle('❌ 無法查看日挑')
                .setDescription('🎮 請先使用 `~s` 拾荒開始遊戲！')
                .setColor(0xFF0000);
            return message.reply({ embeds: [embed] });
        }

        const tasks = getDailyTasks(userId);
        const player = data.players[userId];
        const weeklyPoints = player.weekly_points || 0;

        const embed = new EmbedBuilder()
            .setTitle('📋 每日挑戰')
            .setDescription(`本週積分：\`${weeklyPoints}\` 📊\n\n完成任務獲得獎勵和積分！`)
            .setColor(0xFFD700);

        let totalPoints = 0;
        let completedCount = 0;

        tasks.forEach((task, index) => {
            const isComplete = task.progress >= task.target;
            const progressBar = '█'.repeat(Math.floor(task.progress / task.target * 10)) + 
                               '░'.repeat(10 - Math.floor(task.progress / task.target * 10));
            const status = isComplete ? '✅ 已完成' : '⏳ 進行中';
            
            if (isComplete) {
                completedCount++;
                totalPoints += task.points;
            }
            
            embed.addFields({
                name: `【${index + 1}】${task.name} ${status}`,
                value: `${task.description}\n進度：\`${progressBar}\` (${task.progress}/${task.target})\n獎勵：${task.reward} 金幣 + ${task.points} 積分`,
                inline: false
            });
        });

        embed.addFields({
            name: '🎁 今日獎勵預覽',
            value: `完成 ${completedCount}/3 個任務\n將獲得 ${totalPoints} 積分`
        });

        embed.setFooter({ text: '明天 UTC+8 00:00 刷新 | 連續 7 天完成 → 傳說護符' });

        message.reply({ embeds: [embed] });
    }
};
