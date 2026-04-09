const { EmbedBuilder } = require('discord.js');
const db = require('../utils/db');
const items = require('../utils/items');

module.exports = {
    name: 'decompose',
    aliases: ['d', '分解'],
    execute: async (message, args) => {
        if (!args || args.length < 1) {
            const embed = new EmbedBuilder()
                .setTitle('❌ 格式錯誤')
                .setDescription('請輸入 `~d [序號]`\n例如：`~d 0`')
                .setColor(0xFF0000);
            return message.reply({ embeds: [embed] });
        }

        const userId = message.author.id;
        let data = db.read();
        const player = data.players?.[userId];

        if (!player || !player.inventory || player.inventory.length < 1) {
            return message.reply('❌ 背包沒有物品，無法分解。');
        }

        const idx = parseInt(args[0]);

        if (isNaN(idx) || idx < 0 || idx >= player.inventory.length) {
            return message.reply('❌ 序號無效或超出了背包範圍！');
        }

        const item = player.inventory[idx];

        // 檢查是否可分解 (假設所有物品都可以分解，或檢查 decomposable)
        // 為了簡單，所有物品都可以分解

        // 移除物品
        player.inventory.splice(idx, 1);

        // 添加三個隨機物品
        const allItems = [];
        Object.values(items).forEach(map => {
            if (map.items) allItems.push(...map.items);
            if (map.decomposable) allItems.push(...map.decomposable);
        });
        if (items.usable) allItems.push(...items.usable);

        const newItems = [];
        for (let i = 0; i < 3; i++) {
            const randomItem = allItems[Math.floor(Math.random() * allItems.length)];
            newItems.push({
                name: randomItem,
                origin: item.origin || '未知',
                rarity: 'common'
            });
        }

        player.inventory.push(...newItems);
        player.weekly_points = (player.weekly_points || 0) + 10; // 較少的點數

        db.write(data);

        const res = new EmbedBuilder()
            .setTitle('🔧 分解成功！')
            .setDescription(`**${item.name}** 已分解為：\n${newItems.map(i => `• ${i.name}`).join('\n')}`)
            .setColor(0xFFA500);

        message.reply({ embeds: [res] });
    }
};