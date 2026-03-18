const { EmbedBuilder } = require('discord.js');
const db = require('../utils/db');

module.exports = {
    name: 'combine',
    aliases: ['c', '合成', 'combine'],
    execute: async (message) => {
        const args = message.content.split(' ');
        if (args.length < 3) return message.reply('❌ 格式錯誤！請輸入 `!combine [物品1序號] [物品2序號]`（序號從 0 開始）');

        const userId = message.author.id;
        let data = db.read();
        const player = data.players[userId];

        if (!player || player.inventory.length < 2) return message.reply('❌ 你背包裡的零件不足，無法合成。');

        const idxA = parseInt(args[1]);
        const idxB = parseInt(args[2]);

        if (isNaN(idxA) || isNaN(idxB) || !player.inventory[idxA] || !player.inventory[idxB] || idxA === idxB) {
            return message.reply('❌ 序號無效或重複！');
        }

        const itemA = player.inventory[idxA];
        const itemB = player.inventory[idxB];

        // --- B 路線：屬性邏輯運算 ---
        const combinedEntropy = itemA.entropy + itemB.entropy;
        const avgDurability = Math.floor((itemA.durability + itemB.durability) / 2);
        
        // --- C 路線：混沌反噬判定 ---
        // 熵值越高，失敗率越高 (例如超過 80 開始危險)
        const failChance = combinedEntropy / 150; 
        const isExploded = Math.random() < failChance;

        let resultEmbed = new EmbedBuilder().setTitle('🌀 合成反應爐');

        if (isExploded) {
            // 刪除那兩個物品
            player.inventory = player.inventory.filter((_, index) => index !== idxA && index !== idxB);
            db.write(data);

            resultEmbed
                .setDescription(`💥 **發生崩潰！**\n由於熵值 (${combinedEntropy}) 過高，能量失去平衡。你的「${itemA.name}」與「${itemB.name}」已在火光中化為數位灰燼...`)
                .setColor(0xFF0000);
        } else {
            // 成功：產生新物品 (名字根據熵值變化)
            const newItem = {
                name: combinedEntropy > 50 ? `穩定態·異質零件` : `純淨·複合零件`,
                durability: Math.min(100, avgDurability + 10),
                entropy: Math.floor(combinedEntropy * 0.8) // 合成會稍微穩定一點點
            };

            // 移除舊的，加入新的
            player.inventory = player.inventory.filter((_, index) => index !== idxA && index !== idxB);
            player.inventory.push(newItem);
            db.write(data);

            resultEmbed
                .setDescription(`✅ **合成成功！**\n你將兩個零件融合成了一個新的存在。\n\n**新生產物：** ${newItem.name}\n**剩餘熵值：** ${newItem.entropy}`)
                .setColor(0x00FFFF);
        }

        message.reply({ embeds: [resultEmbed] });
    }
};