const { EmbedBuilder } = require('discord.js');
const db = require('../utils/db');

module.exports = {
    name: 'progress',
    aliases: ['progress', '進度'],
    execute: async (message) => {
        const userId = message.author.id;
        let data = db.read();

        // 初始化玩家數據
        if (!data.players) data.players = {};
        if (!data.players[userId]) {
            return message.reply('🎮 你還沒有開始遊戲！使用 `~s` 開始拾荒吧！');
        }

        const player = data.players[userId];
        const level = player.level || 1;
        const exp = player.exp || 0;
        const nextLevelExp = level * 100;
        const expProgress = Math.floor((exp / nextLevelExp) * 20);

        const embed = new EmbedBuilder()
            .setTitle('📊 角色進度')
            .setColor(0x00BFFF)
            .setThumbnail(message.author.displayAvatarURL())
            .addFields(
                { 
                    name: '🎯 等級進度',
                    value: `等級：\`Lv. ${level}\`\n經驗：\`${exp}/${nextLevelExp}\`\n${'█'.repeat(expProgress)}${'░'.repeat(20 - expProgress)}`
                },
                { 
                    name: '🎒 背包',
                    value: `物品數量：\`${player.inventory?.length || 0}\` / 20\n平均耐久：\`${player.inventory?.length > 0 ? Math.floor(player.inventory.reduce((sum, item) => sum + item.durability, 0) / player.inventory.length) : 0}%\``
                },
                { 
                    name: '🌀 熵值統計',
                    value: `平均熵值：\`${player.inventory?.length > 0 ? Math.floor(player.inventory.reduce((sum, item) => sum + item.entropy, 0) / player.inventory.length) : 0}\`\n最高熵值：\`${player.inventory?.length > 0 ? Math.max(...player.inventory.map(item => item.entropy)) : 0}\``
                },
                { 
                    name: '🗺️ 地區探索',
                    value: `當前位置：\`${player.currentLocation || '工廠'}\`\n已訪問地區：\`${player.visited_locations?.join('、') || '工廠'}\``
                },
                { 
                    name: '💎 資源',
                    value: `熵結晶：\`${player.entropy_crystal || 0}\`\n維修次數：\`${player.repair_count || 0}\`\n合成次數：\`${player.combine_count || 0}\``
                }
            )
            .setFooter({ text: '繼續冒險，突破自己的極限！' });

        message.reply({ embeds: [embed] });
    }
};
