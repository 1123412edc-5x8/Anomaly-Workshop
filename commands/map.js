const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const db = require('../utils/db');

module.exports = {
    name: 'map',
    aliases: ['m', '地圖'],
    execute: async (message) => {
        const userId = message.author.id;
        const data = db.read() || { players: {} };
        const player = data.players[userId] || { currentLocation: '工廠' };
        
        const maps = [
            { label: '工廠', value: '工廠', description: '充滿廢鐵與零件的工業廢墟', emoji: '🏭' },
            { label: '荒野', value: '荒野', description: '雜草叢生，或許能找到有機素材', emoji: '🌿' },
            { label: '實驗室', value: '實驗室', description: '充滿精密儀器與危險氣息', emoji: '🧪' },
            { label: '圖書館', value: '圖書館', description: '古老的知識寶庫，充滿神秘書籍', emoji: '📚' }
        ];

        const embed = new EmbedBuilder()
            .setTitle('📍 地區導航系統')
            .setDescription(`你目前位於：**【${player.currentLocation || '工廠'}】**\n\n請選擇你要前往的目的地：`)
            .setColor(0x2980b9);

        const select = new StringSelectMenuBuilder()
            .setCustomId('map_select')
            .setPlaceholder('選擇一個地點進行移動...')
            .addOptions(
                maps.map(m => 
                    new StringSelectMenuOptionBuilder()
                        .setLabel(m.label)
                        .setValue(m.value)
                        .setDescription(m.description)
                        .setEmoji(m.emoji)
                )
            );

        const row = new ActionRowBuilder().addComponents(select);

        message.reply({ embeds: [embed], components: [row] });
    }
};