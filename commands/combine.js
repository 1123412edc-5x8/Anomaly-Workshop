const { EmbedBuilder } = require('discord.js');
const db = require('../utils/db');
const { getActiveEvents } = require('./event');

module.exports = {
    name: 'combine',
    aliases: ['c', '合成', 'upgrade'],
    execute: async (message) => {
        const args = message.content.split(' ');
        if (args.length < 3) {
            const embed = new EmbedBuilder()
                .setTitle('❌ 格式錯誤')
                .setDescription('請輸入 `~combine [物品序號1] [物品序號2] [物品序號3]`\n3個同名物品合成為稀有物品（序號從 0 開始）')
                .setColor(0xFF0000);
            return message.reply({ embeds: [embed] });
        }

        const userId = message.author.id;
        let data = db.read();

        // 初始化玩家數據
        if (!data.players) data.players = {};
        if (!data.players[userId]) {
            data.players[userId] = { inventory: [], currentLocation: '工廠', weekly_points: 0 };
            db.write(data);
            const embed = new EmbedBuilder()
                .setTitle('❌ 無法合成')
                .setDescription('🎒 你的背包是空的！請先使用 `~s` 拾荒獲得零件。')
                .setColor(0xFF0000);
            return message.reply({ embeds: [embed] });
        }

        const player = data.players[userId];

        if (player.inventory.length < 3) {
            const embed = new EmbedBuilder()
                .setTitle('❌ 無法合成')
                .setDescription('你背包裡的物品不足，需要 3 個同名物品才能合成。')
                .setColor(0xFF0000);
            return message.reply({ embeds: [embed] });
        }

        const idx1 = parseInt(args[1]);
        const idx2 = parseInt(args[2]);
        const idx3 = parseInt(args[3]);

        if (isNaN(idx1) || isNaN(idx2) || isNaN(idx3) || 
            !player.inventory[idx1] || !player.inventory[idx2] || !player.inventory[idx3] ||
            idx1 === idx2 || idx2 === idx3 || idx1 === idx3) {
            const embed = new EmbedBuilder()
                .setTitle('❌ 無效的序號')
                .setDescription('序號無效、重複或不存在！')
                .setColor(0xFF0000);
            return message.reply({ embeds: [embed] });
        }

        const item1 = player.inventory[idx1];
        const item2 = player.inventory[idx2];
        const item3 = player.inventory[idx3];

        // 驗證三個物品是否同名
        if (item1.name !== item2.name || item2.name !== item3.name) {
            const embed = new EmbedBuilder()
                .setTitle('❌ 物品不匹配')
                .setDescription('必須選擇 3 個**相同名稱**的物品才能合成！')
                .setColor(0xFF0000);
            return message.reply({ embeds: [embed] });
        }

        // 檢查事件加成
        const events = getActiveEvents();
        let costMultiplier = 1;
        let pointsMultiplier = 1;

        events.forEach(event => {
            if (event.cost_reduction) costMultiplier = event.cost_reduction;
            if (event.points_multiplier) pointsMultiplier = event.points_multiplier;
        });

        // 合成為稀有物品 (100% 成功！)
        const baseCost = Math.floor(3.5 * costMultiplier); // 3-4 點資源
        const baseReward = Math.floor(50 * pointsMultiplier);

        const newItem = {
            name: `✨ ${item1.name}`,
            origin: item1.origin,
            rarity: 'rare'
        };

        // 移除舊的三個 (倒序避免索引錯誤)
        const indices = [idx1, idx2, idx3].sort((a, b) => b - a);
        indices.forEach(idx => {
            player.inventory.splice(idx, 1);
        });

        // 添加新物品
        player.inventory.push(newItem);

        // 更新日任務進度
        if (!data.dailyTasks) data.dailyTasks = {};
        if (data.dailyTasks[userId]) {
            data.dailyTasks[userId].tasks.forEach(task => {
                if (task.action === 'upgrade') task.progress++;
            });
        }

        // 增加積分
        player.weekly_points = (player.weekly_points || 0) + baseReward;

        db.write(data);

        const resultEmbed = new EmbedBuilder()
            .setTitle('✨ 合成成功！')
            .setDescription(`3 個「${item1.name}」融合成了更強大的存在`)
            .addFields(
                { name: '🎁 新物品', value: `${newItem.name} (稀有)`, inline: true },
                { name: '📊 積分', value: `+${baseReward} 分`, inline: true }
            )
            .setColor(0x00FFFF)
            .setFooter({ text: '合成無失敗風險！' });

        message.reply({ embeds: [resultEmbed] });
    }
};