const { EmbedBuilder } = require('discord.js');
const itemWiki = require('../utils/items');

module.exports = {
    name: 'help',
    aliases: ['h', '幫助', 'wiki'],
    execute: async (message) => {
        const embed = new EmbedBuilder()
            .setTitle('🛠️ 異常工坊：手冊 & Wiki')
            .setColor(0x00FFCC)
            .addFields(
                { name: '📍 地圖系統', value: `目前開放：\`${Object.keys(itemWiki).join('、')}\`\n使用 \`~map [地圖名]\` 前往。` },
                { name: '📦 拾荒', value: '使用 \`~s\` 獲取該地專屬零件 (每區 50 種)。' },
                { name: '🔧 維修與合成', value: '\`~r [編號]\` 提升耐久度。\n\`~c [編號1] [編號2]\` 根據材料產地合成新物品。' },
                { name: '⚠️ 提醒', value: '合成失敗率取決於兩個零件的**總熵值**。' }
            );
        message.reply({ embeds: [embed] });
    }
};