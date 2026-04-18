const { EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guild')
        .setDescription('公會系統')
        .addSubcommand(subcommand =>
            subcommand.setName('create')
                .setDescription('創建公會')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('公會名稱')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('join')
                .setDescription('加入公會')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('公會名稱')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('info')
                .setDescription('查看公會資訊'))
        .addSubcommand(subcommand =>
            subcommand.setName('donate')
                .setDescription('捐獻資源')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('捐獻數量')
                        .setRequired(true))),
    execute: async (interaction) => {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        let data = db.read();

        if (!data.players) data.players = {};
        if (!data.players[userId]) {
            return interaction.reply({ content: '請先開始遊戲！', ephemeral: true });
        }

        if (!data.guilds) data.guilds = {};

        switch (subcommand) {
            case 'create':
                const guildName = interaction.options.getString('name');
                if (data.players[userId].guild) {
                    return interaction.reply({ content: '你已經加入公會了！', ephemeral: true });
                }
                if (data.guilds[guildName]) {
                    return interaction.reply({ content: '公會名稱已存在！', ephemeral: true });
                }

                data.guilds[guildName] = {
                    leader: userId,
                    members: [userId],
                    level: 1,
                    exp: 0,
                    treasury: 0,
                    created: Date.now()
                };
                data.players[userId].guild = guildName;
                db.write(data);

                const createEmbed = new EmbedBuilder()
                    .setTitle('🏰 公會創建成功！')
                    .setDescription(`公會 **${guildName}** 已創建！`)
                    .setColor(0x00FF00);
                interaction.reply({ embeds: [createEmbed] });
                break;

            case 'join':
                const joinName = interaction.options.getString('name');
                if (data.players[userId].guild) {
                    return interaction.reply({ content: '你已經加入公會了！', ephemeral: true });
                }
                if (!data.guilds[joinName]) {
                    return interaction.reply({ content: '公會不存在！', ephemeral: true });
                }

                data.guilds[joinName].members.push(userId);
                data.players[userId].guild = joinName;
                db.write(data);

                const joinEmbed = new EmbedBuilder()
                    .setTitle('🤝 加入公會成功！')
                    .setDescription(`歡迎加入 **${joinName}** 公會！`)
                    .setColor(0x00FF00);
                interaction.reply({ embeds: [joinEmbed] });
                break;

            case 'info':
                const playerGuild = data.players[userId].guild;
                if (!playerGuild) {
                    return interaction.reply({ content: '你還沒有加入公會！', ephemeral: true });
                }

                const guild = data.guilds[playerGuild];
                const memberNames = guild.members.map(id => {
                    const member = interaction.guild.members.cache.get(id);
                    return member ? member.displayName : '未知成員';
                });

                const infoEmbed = new EmbedBuilder()
                    .setTitle(`🏰 ${playerGuild}`)
                    .setColor(0x3498db)
                    .addFields(
                        { name: '等級', value: guild.level.toString(), inline: true },
                        { name: '經驗值', value: guild.exp.toString(), inline: true },
                        { name: '金庫', value: `${guild.treasury} 💎`, inline: true },
                        { name: '成員數', value: guild.members.length.toString(), inline: true },
                        { name: '會長', value: interaction.guild.members.cache.get(guild.leader)?.displayName || '未知', inline: true },
                        { name: '創建時間', value: `<t:${Math.floor(guild.created / 1000)}:F>`, inline: true },
                        { name: '成員列表', value: memberNames.join(', ') || '無成員', inline: false }
                    );
                interaction.reply({ embeds: [infoEmbed] });
                break;

            case 'donate':
                const amount = interaction.options.getInteger('amount');
                const donateGuild = data.players[userId].guild;
                if (!donateGuild) {
                    return interaction.reply({ content: '你還沒有加入公會！', ephemeral: true });
                }

                const player = data.players[userId];
                if (!player.entropy_crystal || player.entropy_crystal < amount) {
                    return interaction.reply({ content: '你的熵結晶不足！', ephemeral: true });
                }

                player.entropy_crystal -= amount;
                data.guilds[donateGuild].treasury += amount;
                data.guilds[donateGuild].exp += amount * 2; // 捐獻獲得雙倍經驗

                // 檢查升級
                const expNeeded = data.guilds[donateGuild].level * 1000;
                if (data.guilds[donateGuild].exp >= expNeeded) {
                    data.guilds[donateGuild].level++;
                    data.guilds[donateGuild].exp -= expNeeded;
                }

                db.write(data);

                const donateEmbed = new EmbedBuilder()
                    .setTitle('💝 捐獻成功！')
                    .setDescription(`你捐獻了 ${amount} 💎 給公會！\n公會獲得 ${amount * 2} 經驗值！`)
                    .setColor(0xFFD700);
                interaction.reply({ embeds: [donateEmbed] });
                break;
        }
    }
};
