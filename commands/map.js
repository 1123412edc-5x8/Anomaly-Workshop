const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('map')
        .setDescription('移動到指定地區')
        .addStringOption(option =>
            option.setName('region')
                .setDescription('要移動到的地區')
                .setRequired(true)
                .addChoices(
                    { name: '🏭 工廠', value: '工廠' },
                    { name: '🌿 荒野', value: '荒野' },
                    { name: '🧪 實驗室', value: '實驗室' },
                    { name: '📚 圖書館', value: '圖書館' }
                )),
    execute: async (interaction) => {
        const region = interaction.options.getString('region');
        const userId = interaction.user.id;
        const data = db.read() || { players: {} };
        
        if (!data.players[userId]) {
            data.players[userId] = { inventory: [], currentLocation: '工廠', weekly_points: 0 };
        }
        
        data.players[userId].currentLocation = region;
        db.write(data);

        const regionInfo = {
            '工廠': { color: 0x7f8c8d, desc: '充滿廢鐵與零件的工業廢墟' },
            '荒野': { color: 0x27ae60, desc: '雜草叢生，或許能找到有機素材' },
            '實驗室': { color: 0x2980b9, desc: '充滿精密儀器與危險氣息' },
            '圖書館': { color: 0x8e44ad, desc: '古老的知識寶庫，充滿神秘書籍' }
        };

        const embed = new EmbedBuilder()
            .setTitle(`📍 已移動到：${region}`)
            .setDescription(regionInfo[region].desc)
            .setColor(regionInfo[region].color)
            .setFooter({ text: '使用 /scavenge 在此地區拾荒' });

        interaction.reply({ embeds: [embed] });
    }
};