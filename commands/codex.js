const { EmbedBuilder } = require('discord.js');
const db = require('../utils/db');
const itemWiki = require('../utils/items');

// 生成所有收藏物品
function getAllCollectibles() {
    const items = [];
    
    // 每個地區生成 50 種物品，分配稀有度
    Object.entries(itemWiki).forEach(([region, data]) => {
        data.items.forEach(itemName => {
            const rand = Math.random();
            let rarity;
            if (rand > 0.95) rarity = 'legendary';     // 5%
            else if (rand > 0.8) rarity = 'epic';      // 15%
            else if (rand > 0.5) rarity = 'rare';      // 30%
            else rarity = 'common';                     // 50%

            items.push({
                id: `${region}_${itemName}`,
                name: itemName,
                region,
                rarity,
                icon: {
                    'common': '⚪',
                    'rare': '💜',
                    'epic': '🔴',
                    'legendary': '👑'
                }[rarity]
            });
        });
    });

    return items;
}

function getPlayerCodex(userId) {
    const data = db.read();
    if (!data.players) data.players = {};
    if (!data.players[userId]) {
        data.players[userId] = { inventory: [], collected_items: [] };
    }

    if (!data.players[userId].collected_items) {
        data.players[userId].collected_items = [];
    }

    return data.players[userId].collected_items;
}

function updateCodex(userId) {
    const data = db.read();
    const player = data.players[userId];
    
    // 掃描背包，更新已收藏物品
    const collectedIds = new Set(player.collected_items || []);
    
    if (player.inventory) {
        player.inventory.forEach(item => {
            const itemId = `${item.origin}_${item.name}`;
            collectedIds.add(itemId);
        });
    }
    
    player.collected_items = Array.from(collectedIds);
    db.write(data);
}

module.exports = {
    name: 'codex',
    aliases: ['c', '圖鑑', 'codex'],
    execute: async (message) => {
        const userId = message.author.id;
        const data = db.read();

        if (!data.players) data.players = {};
        if (!data.players[userId]) {
            const embed = new EmbedBuilder()
                .setTitle('❌ 無法查看圖鑑')
                .setDescription('🎮 請先使用 `~s` 拾荒開始遊戲！')
                .setColor(0xFF0000);
            return message.reply({ embeds: [embed] });
        }

        // 更新圖鑑
        updateCodex(userId);

        const allItems = getAllCollectibles();
        const collectedIds = new Set(data.players[userId].collected_items || []);

        // 統計
        const totalCommon = allItems.filter(i => i.rarity === 'common').length;
        const totalRare = allItems.filter(i => i.rarity === 'rare').length;
        const totalEpic = allItems.filter(i => i.rarity === 'epic').length;
        const totalLegendary = allItems.filter(i => i.rarity === 'legendary').length;

        const collectedCommon = allItems.filter(i => i.rarity === 'common' && collectedIds.has(i.id)).length;
        const collectedRare = allItems.filter(i => i.rarity === 'rare' && collectedIds.has(i.id)).length;
        const collectedEpic = allItems.filter(i => i.rarity === 'epic' && collectedIds.has(i.id)).length;
        const collectedLegendary = allItems.filter(i => i.rarity === 'legendary' && collectedIds.has(i.id)).length;

        const totalCollected = collectedIds.size;
        const totalItems = allItems.length;
        const percentage = Math.floor((totalCollected / totalItems) * 100);

        const embed = new EmbedBuilder()
            .setTitle('📖 異常工坊圖鑑')
            .setDescription(`已收集：**${totalCollected}/${totalItems}** (${percentage}%)`)
            .setColor(0x00BFFF);

        // 稀有度進度條
        embed.addFields({
            name: '⚪ 普通物品',
            value: `${collectedCommon}/${totalCommon} ${'█'.repeat(Math.floor(collectedCommon/totalCommon*10))}${'░'.repeat(10-Math.floor(collectedCommon/totalCommon*10))}`,
            inline: true
        }, {
            name: '💜 稀有物品',
            value: `${collectedRare}/${totalRare} ${'█'.repeat(Math.floor(collectedRare/totalRare*10))}${'░'.repeat(10-Math.floor(collectedRare/totalRare*10))}`,
            inline: true
        }, {
            name: '🔴 史詩物品',
            value: `${collectedEpic}/${totalEpic} ${'█'.repeat(Math.floor(collectedEpic/totalEpic*10))}${'░'.repeat(10-Math.floor(collectedEpic/totalEpic*10))}`,
            inline: true
        }, {
            name: '👑 傳說物品',
            value: `${collectedLegendary}/${totalLegendary} ${'█'.repeat(Math.floor(collectedLegendary/totalLegendary*10))}${'░'.repeat(10-Math.floor(collectedLegendary/totalLegendary*10))}`,
            inline: true
        });

        // 里程碑
        const milestones = [
            { target: 50, reward: '冒險者 稱號' },
            { target: 100, reward: '探險家 皮膚' },
            { target: 150, reward: '傳說 頭銜' }
        ];

        let milestoneText = '';
        milestones.forEach(m => {
            const achieved = totalCollected >= m.target ? '✅' : '🔒';
            milestoneText += `${achieved} ${m.target} 物品 → ${m.reward}\n`;
        });

        embed.addFields({
            name: '🎯 收集里程碑',
            value: milestoneText
        });

        embed.setFooter({ text: '使用 ~bag 查看背包中的物品' });

        message.reply({ embeds: [embed] });
    }
};
