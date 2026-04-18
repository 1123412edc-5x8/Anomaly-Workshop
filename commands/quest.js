const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../utils/db');

module.exports = {
    name: 'quest',
    aliases: ['q', '任務'],
    execute: async (message) => {
        const userId = message.author.id;
        let data = db.read();

        // 初始化玩家數據
        if (!data.players) data.players = {};
        if (!data.players[userId]) {
            data.players[userId] = { inventory: [], currentLocation: '工廠', quests: [] };
            db.write(data);
        }

        const player = data.players[userId];
        
        const quests = [
            { id: 1, name: '初心者的考驗', description: '拾荒 5 次', progress: 0, target: 5, reward: 50 },
            { id: 2, name: '維修大師', description: '成功維修 10 次', progress: 0, target: 10, reward: 100 },
            { id: 3, name: '完美合成', description: '合成 3 個物品不失敗', progress: 0, target: 3, reward: 150 },
            { id: 4, name: '全地圖探險', description: '訪問所有 3 個地區', progress: 0, target: 3, reward: 200 },
            { id: 5, name: '怪物獵人', description: '贏得 5 場戰鬥', progress: 0, target: 5, reward: 250 }
        ];

        const embed = new EmbedBuilder()
            .setTitle('📋 任務列表')
            .setColor(0xFFD700)
            .setDescription('完成任務獲得經驗值和獎勵！');

        quests.forEach(quest => {
            const progressBar = '█'.repeat(Math.floor(quest.progress / quest.target * 10)) + 
                               '░'.repeat(10 - Math.floor(quest.progress / quest.target * 10));
            
            embed.addFields({
                name: `【${quest.id}】${quest.name}`,
                value: `${quest.description}\n進度：\`${progressBar}\` (${quest.progress}/${quest.target})\n獎勵：${quest.reward} 經驗值`,
                inline: false
            });
        });

        embed.setFooter({ text: '完成任務後自動提交並獲得獎勵' });

        message.reply({ embeds: [embed] });
    }
};
