const { EmbedBuilder } = require('discord.js');
const db = require('../utils/db');

function getCollectedCount(player) {
    if (Array.isArray(player?.collected_items)) return player.collected_items.length;
    return 0;
}

module.exports = {
    name: 'progress',
    aliases: ['p', 'progress', '進度'],
    execute: async (message, args = []) => {
        const userId = message.author.id;

        let data;
        try {
            data = db.read();
        } catch (error) {
            console.error('讀取資料失敗 [progress]:', error);
            return message.reply('❌ 讀取進度資料失敗，請稍後再試。');
        }

        if (!data || typeof data !== 'object') {
            return message.reply('❌ 玩家資料格式異常，請通知管理員檢查 data.json。');
        }

        const players = (data.players && typeof data.players === 'object') ? data.players : {};
        const player = players[userId];
        if (!player) {
            return message.reply('🎮 你還沒有開始遊戲！使用 `~s` 開始拾荒吧！');
        }

        const weeklyPoints = Number(player.weekly_points) || 0;
        const inventory = Array.isArray(player.inventory) ? player.inventory : [];
        const collected = getCollectedCount(player);

        const rarityCount = {
            common: inventory.filter(i => (i?.rarity || 'common') === 'common').length,
            rare: inventory.filter(i => i?.rarity === 'rare').length,
            epic: inventory.filter(i => i?.rarity === 'epic').length,
            legendary: inventory.filter(i => i?.rarity === 'legendary').length
        };

        const embed = new EmbedBuilder()
            .setTitle('📊 你的進度')
            .setColor(0x00BFFF)
            .setThumbnail(message.author.displayAvatarURL())
            .addFields(
                {
                    name: '📈 本週積分',
                    value: `積分：\`${weeklyPoints}\`\n排名會在週一重置`
                },
                {
                    name: '🎒 背包',
                    value: `物品數量：\`${inventory.length}\`\n⚪ 普通: ${rarityCount.common}\n💜 稀有: ${rarityCount.rare}\n🔴 史詩: ${rarityCount.epic}\n👑 傳說: ${rarityCount.legendary}`
                },
                {
                    name: '📖 圖鑑進度',
                    value: `已收集：\`${collected}/150\` (${Math.floor((collected / 150) * 100)}%)\n使用 ~codex 查看詳詳細進度`
                },
                {
                    name: '🗺️ 地區探索',
                    value: `當前位置：\`${player.currentLocation || '工廠'}\`\n使用 ~map 切換地區`
                }
            )
            .setFooter({ text: '繼續冒險，尋求更稀有的物品！' });

        message.reply({ embeds: [embed] });
    }
};

        message.reply({ embeds: [embed] });
    }
};
