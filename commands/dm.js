const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// 管理員 ID 列表 (可根據需要修改)
const ADMINS = ['1292424394957918248'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dm')
        .setDescription('發送私人訊息給指定用戶 (限管理員)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('目標用戶')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('要發送的訊息內容')
                .setRequired(true)),
    execute: async (interaction) => {
        // 檢查管理員權限
        if (!ADMINS.includes(interaction.user.id) && !interaction.member?.permissions.has('ADMINISTRATOR')) {
            const embed = new EmbedBuilder()
                .setTitle('❌ 權限不足')
                .setDescription('你沒有管理員權限！')
                .setColor(0xFF0000);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const targetUser = interaction.options.getUser('user');
        const messageContent = interaction.options.getString('message');

        try {
            // 嘗試發送DM
            await targetUser.send(messageContent);

            // 回覆確認訊息
            const embed = new EmbedBuilder()
                .setTitle('✅ DM 已發送')
                .setDescription(`已成功發送私人訊息給 ${targetUser.username}。`)
                .setColor(0x00FF00);
            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('發送DM時發生錯誤:', error);
            const embed = new EmbedBuilder()
                .setTitle('❌ 發送失敗')
                .setDescription('無法發送私人訊息。該用戶可能已關閉DM或封鎖了機器人。')
                .setColor(0xFF0000);
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
};