const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../utils/db');

// 異常事件池
const EVENTS = [
    {
        id: 'earthquake',
        name: '🌀 地震',
        description: '工廠區暫時封閉，物品稀缺度 2 倍！',
        area: '工廠',
        rarity_multiplier: 2,
        duration: 6
    },
    {
        id: 'lava_flow',
        name: '🔥 熔岩流',
        description: '荒野危險等級上升，物品掉落 50% 更稀有！',
        area: '荒野',
        rarity_multiplier: 1.5,
        duration: 6
    },
    {
        id: 'freeze',
        name: '❄️ 凍結',
        description: '實驗室故障，升級成本減少 50%！',
        area: '實驗室',
        cost_reduction: 0.5,
        duration: 6
    },
    {
        id: 'flood',
        name: '🌊 洪水',
        description: '隨機地區涌現新物品，掉率翻倍！',
        area: 'random',
        drop_rate_multiplier: 2,
        duration: 4
    },
    {
        id: 'magnetic_storm',
        name: '⚡ 磁暴',
        description: '排行榜排名打亂！所有人積分翻倍！',
        area: 'global',
        points_multiplier: 2,
        duration: 4
    }
];

function getActiveEvents() {
    const data = db.read();
    if (!data.events) {
        data.events = [];
        // 生成 2-3 個隨機事件
        const eventCount = Math.floor(Math.random() * 2) + 2;
        for (let i = 0; i < eventCount; i++) {
            const event = EVENTS[Math.floor(Math.random() * EVENTS.length)];
            const startTime = Date.now() - Math.random() * 24 * 60 * 60 * 1000;
            data.events.push({
                ...event,
                startTime,
                endTime: startTime + event.duration * 60 * 60 * 1000
            });
        }
        db.write(data);
    }

    // 清理已過期的事件
    data.events = data.events.filter(e => e.endTime > Date.now());
    if (data.events.length < 2) {
        const event = EVENTS[Math.floor(Math.random() * EVENTS.length)];
        const startTime = Date.now();
        data.events.push({
            ...event,
            startTime,
            endTime: startTime + event.duration * 60 * 60 * 1000
        });
    }
    
    db.write(data);
    return data.events;
}

module.exports = {
    name: 'event',
    aliases: ['e', '事件', 'event'],
    execute: async (message) => {
        const events = getActiveEvents();

        const embed = new EmbedBuilder()
            .setTitle('🌍 異常事件播報')
            .setDescription('當前世界發生的異常現象')
            .setColor(0xFF6B6B);

        events.forEach(event => {
            const remainingHours = Math.floor((event.endTime - Date.now()) / (60 * 60 * 1000));
            const remainingMins = Math.floor(((event.endTime - Date.now()) % (60 * 60 * 1000)) / (60 * 1000));

            let bonus = '';
            if (event.rarity_multiplier) bonus = `稀有度 ×${event.rarity_multiplier}`;
            if (event.cost_reduction) bonus += `升級成本 ×${event.cost_reduction}`;
            if (event.drop_rate_multiplier) bonus += `掉率 ×${event.drop_rate_multiplier}`;
            if (event.points_multiplier) bonus += `積分 ×${event.points_multiplier}`;

            embed.addFields({
                name: event.name,
                value: `${event.description}\n📍 影響區域：${event.area}\n⏱️ 剩餘：${remainingHours}h ${remainingMins}m\n🎁 加成：${bonus}`,
                inline: false
            });
        });

        embed.setFooter({ text: '事件每 12 小時刷新一次 | 完成事件挑戰獲得事件點數' });

        message.reply({ embeds: [embed] });
    },
    
    // 導出函數供其他命令使用
    getActiveEvents
};
