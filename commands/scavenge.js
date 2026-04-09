const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../utils/db');
const itemWiki = require('../utils/items');
const { getActiveEvents } = require('./event');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('scavenge')
        .setDescription('拾荒零件'),
    execute: async (interaction) => {
        const userId = interaction.user.id;
        let data = db.read();

        // 初始化玩家數據
        if (!data.players) data.players = {};
        if (!data.players[userId]) {
            data.players[userId] = { inventory: [], currentLocation: '工廠', weekly_points: 0 };
        }
        const loc = data.players[userId].currentLocation || '工廠';
        
        // 檢查異常事件加成
        const events = getActiveEvents();
        let rarityMultiplier = 1;
        let dropMultiplier = 1;
        let pointsBonus = 0;

        events.forEach(event => {
            if ((event.area === loc || event.area === 'global') && event.rarity_multiplier) {
                rarityMultiplier = event.rarity_multiplier;
            }
            if ((event.area === loc || event.area === 'global') && event.drop_rate_multiplier) {
                dropMultiplier = event.drop_rate_multiplier;
            }
            if (event.area === 'global' && event.points_multiplier) {
                pointsBonus = event.points_multiplier - 1;
            }
        });

        // 從對應地圖的 50 種物品中抽一個，或從 decomposable 中
        const region = itemWiki[loc];
        let itemPool = region.items;
        if (region.decomposable && Math.random() < 0.1) { // 10% 機率獲得可分解物品
            itemPool = region.decomposable;
        }
        const randomItemName = itemPool[Math.floor(Math.random() * itemPool.length)];

        // 決定稀有度
        let rarity = 'common';
        const rarityRoll = Math.random();
        if (rarityRoll > 0.95 * rarityMultiplier) rarity = 'legendary';
        else if (rarityRoll > 0.8 * rarityMultiplier) rarity = 'epic';
        else if (rarityRoll > 0.5 * rarityMultiplier) rarity = 'rare';

        // 建立物品物件 (簡化)
        const newItem = {
            name: randomItemName,
            origin: loc,
            rarity: rarity
        };

        // 存入背包
        data.players[userId].inventory.push(newItem);

        // 更新日任務進度
        if (!data.dailyTasks) data.dailyTasks = {};
        if (data.dailyTasks[userId]) {
            data.dailyTasks[userId].tasks.forEach(task => {
                if (task.action === 'scavenge') task.progress++;
                if (task.action === 'find_rare' && rarity !== 'common') task.progress++;
            });
        }

        // 增加積分
        const basePoints = { 'common': 5, 'rare': 20, 'epic': 50, 'legendary': 150 }[rarity];
        const points = Math.floor(basePoints * (1 + pointsBonus));
        data.players[userId].weekly_points = (data.players[userId].weekly_points || 0) + points;

        db.write(data);

        // 顯示 Embed
        const rarityIcons = { 'common': '⚪', 'rare': '💜', 'epic': '🔴', 'legendary': '👑' };
        const embed = new EmbedBuilder()
            .setTitle(`🔍 拾荒回報：${loc}`)
            .setDescription(`你在廢墟中翻找，尋獲了 **${rarityIcons[rarity]} ${newItem.name}**！`)
            .addFields(
                { name: '✨ 品質', value: `\`${rarity.toUpperCase()}\``, inline: true },
                { name: '📊 積分', value: `+${points} 分`, inline: true }
            )
            .setColor(region.color)
            .setFooter({ text: `使用 /map 切換地區 | 檢查 /event 查看當前加成！` });

        interaction.reply({ embeds: [embed] });
    }
};