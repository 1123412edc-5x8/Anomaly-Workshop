const { EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('查看各種排行榜')
        .addSubcommand(subcommand =>
            subcommand.setName('leaderboard')
                .setDescription('查看綜合排行榜'))
        .addSubcommand(subcommand =>
            subcommand.setName('weekly')
                .setDescription('查看本週積分排行榜'))
        .addSubcommand(subcommand =>
            subcommand.setName('level')
                .setDescription('查看等級排行榜'))
        .addSubcommand(subcommand =>
            subcommand.setName('crystals')
                .setDescription('查看水晶排行榜'))
        .addSubcommand(subcommand =>
            subcommand.setName('guild')
                .setDescription('查看公會排行榜'))
        .addSubcommand(subcommand =>
            subcommand.setName('player')
                .setDescription('查看指定玩家的排名')
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('要查詢的玩家')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        let data = db.read();

        if (!data.players) data.players = {};

        switch (subcommand) {
            case 'leaderboard':
                await showLeaderboard(interaction, data);
                break;
            case 'weekly':
                await showWeeklyRank(interaction, data);
                break;
            case 'level':
                await showLevelRank(interaction, data);
                break;
            case 'crystals':
                await showCrystalsRank(interaction, data);
                break;
            case 'guild':
                await showGuildRank(interaction, data);
                break;
            case 'player':
                const target = interaction.options.getUser('target');
                await showPlayerRank(interaction, target, data);
                break;
        }
    }
};

async function showLeaderboard(interaction, data) {
    const players = Object.entries(data.players).map(([userId, player]) => ({
        userId,
        level: player.level || 1,
        exp: player.exp || 0,
        crystals: player.crystals || 0,
        weekly_points: player.weekly_points || 0,
        guild: player.guild || null
    }));

    if (players.length === 0) {
        const embed = new EmbedBuilder()
            .setTitle('🏆 排行榜')
            .setDescription('目前還沒有任何玩家數據。')
            .setColor(0xFFD700);
        return interaction.reply({ embeds: [embed] });
    }

    // 計算綜合分數 (等級 * 100 + exp/10 + crystals/100)
    players.forEach(player => {
        player.score = (player.level * 100) + Math.floor(player.exp / 10) + Math.floor(player.crystals / 100);
    });

    const sortedPlayers = players.sort((a, b) => b.score - a.score).slice(0, 10);

    const embed = new EmbedBuilder()
        .setTitle('🏆 綜合排行榜')
        .setDescription('基於等級、經驗值和水晶的綜合評分')
        .setColor(0xFFD700);

    let rankText = '';
    sortedPlayers.forEach((player, idx) => {
        const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'][idx] || `${idx + 1}.`;
        const username = interaction.guild.members.cache.get(player.userId)?.user.username || `ID: ${player.userId}`;
        rankText += `${medal} **${username}**\n`;
        rankText += `   等級 ${player.level} • ${player.score} 分\n`;
    });

    embed.addFields({
        name: '📊 綜合排名',
        value: rankText || '暫無數據',
        inline: false
    });

    // 添加按鈕切換不同排行榜
    const buttons = [
        new ButtonBuilder()
            .setCustomId('rank_weekly')
            .setLabel('本週積分')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('rank_level')
            .setLabel('等級榜')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('rank_crystals')
            .setLabel('水晶榜')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('rank_guild')
            .setLabel('公會榜')
            .setStyle(ButtonStyle.Primary)
    ];

    const row = new ActionRowBuilder().addComponents(buttons);

    const response = await interaction.reply({ embeds: [embed], components: [row] });

    // 處理按鈕點擊
    const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000
    });

    collector.on('collect', async (i) => {
        if (i.user.id !== interaction.user.id) return;

        const rankType = i.customId.split('_')[1];
        let newEmbed;

        switch (rankType) {
            case 'weekly':
                newEmbed = await createWeeklyEmbed(interaction, data);
                break;
            case 'level':
                newEmbed = await createLevelEmbed(interaction, data);
                break;
            case 'crystals':
                newEmbed = await createCrystalsEmbed(interaction, data);
                break;
            case 'guild':
                newEmbed = await createGuildEmbed(interaction, data);
                break;
        }

        if (newEmbed) {
            await i.update({ embeds: [newEmbed], components: [row] });
        }
    });
}

async function showWeeklyRank(interaction, data) {
    const embed = await createWeeklyEmbed(interaction, data);
    await interaction.reply({ embeds: [embed] });
}

async function showLevelRank(interaction, data) {
    const embed = await createLevelEmbed(interaction, data);
    await interaction.reply({ embeds: [embed] });
}

async function showCrystalsRank(interaction, data) {
    const embed = await createCrystalsEmbed(interaction, data);
    await interaction.reply({ embeds: [embed] });
}

async function showGuildRank(interaction, data) {
    const embed = await createGuildEmbed(interaction, data);
    await interaction.reply({ embeds: [embed] });
}

async function showPlayerRank(interaction, target, data) {
    const player = data.players[target.id];

    if (!player) {
        const embed = new EmbedBuilder()
            .setTitle('❌ 找不到玩家')
            .setDescription(`${target.username} 還沒有開始遊戲。`)
            .setColor(0xFF0000);
        return interaction.reply({ embeds: [embed] });
    }

    // 計算各種排名
    const allPlayers = Object.entries(data.players).map(([userId, p]) => ({
        userId,
        level: p.level || 1,
        exp: p.exp || 0,
        crystals: p.crystals || 0,
        weekly_points: p.weekly_points || 0
    }));

    const levelRank = allPlayers.sort((a, b) => b.level - a.level).findIndex(p => p.userId === target.id) + 1;
    const expRank = allPlayers.sort((a, b) => b.exp - a.exp).findIndex(p => p.userId === target.id) + 1;
    const crystalsRank = allPlayers.sort((a, b) => b.crystals - a.crystals).findIndex(p => p.userId === target.id) + 1;
    const weeklyRank = allPlayers.sort((a, b) => b.weekly_points - a.weekly_points).findIndex(p => p.userId === target.id) + 1;

    const embed = new EmbedBuilder()
        .setTitle(`🎯 ${target.username} 的排名`)
        .setThumbnail(target.displayAvatarURL())
        .setColor(0x00CED1);

    embed.addFields(
        {
            name: '📊 等級排名',
            value: `第 **${levelRank}** 名\n等級：**${player.level || 1}**`,
            inline: true
        },
        {
            name: '⭐ 經驗值排名',
            value: `第 **${expRank}** 名\n經驗值：**${player.exp || 0}**`,
            inline: true
        },
        {
            name: '💎 水晶排名',
            value: `第 **${crystalsRank}** 名\n水晶：**${player.crystals || 0}**`,
            inline: true
        },
        {
            name: '📅 本週積分排名',
            value: `第 **${weeklyRank}** 名\n積分：**${player.weekly_points || 0}**`,
            inline: true
        }
    );

    // 添加成就徽章
    const badges = [];
    if (levelRank === 1) badges.push('👑 等級王者');
    if (crystalsRank === 1) badges.push('💎 水晶大亨');
    if (weeklyRank <= 3) badges.push('🏆 週冠軍');

    if (badges.length > 0) {
        embed.addFields({
            name: '🏅 成就徽章',
            value: badges.join(' • '),
            inline: false
        });
    }

    await interaction.reply({ embeds: [embed] });
}

async function createWeeklyEmbed(interaction, data) {
    const players = Object.entries(data.players).map(([userId, player]) => ({
        userId,
        weekly_points: player.weekly_points || 0
    })).sort((a, b) => b.weekly_points - a.weekly_points).slice(0, 10);

    const embed = new EmbedBuilder()
        .setTitle('📅 本週積分排行榜')
        .setDescription('基於本週活動獲得的積分排名')
        .setColor(0xFF8C00);

    let rankText = '';
    players.forEach((player, idx) => {
        const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'][idx] || `${idx + 1}.`;
        const username = interaction.guild.members.cache.get(player.userId)?.user.username || `ID: ${player.userId}`;
        rankText += `${medal} **${username}** - **${player.weekly_points}** 積分\n`;
    });

    embed.addFields({
        name: '🏃 本週活躍玩家',
        value: rankText || '暫無數據',
        inline: false
    });

    embed.setFooter({ text: '每週一重置 • 積分用於競賽和獎勵' });

    return embed;
}

async function createLevelEmbed(interaction, data) {
    const players = Object.entries(data.players).map(([userId, player]) => ({
        userId,
        level: player.level || 1,
        exp: player.exp || 0
    })).sort((a, b) => b.level - a.level || b.exp - a.exp).slice(0, 10);

    const embed = new EmbedBuilder()
        .setTitle('⭐ 等級排行榜')
        .setDescription('基於玩家等級和經驗值的排名')
        .setColor(0x9932CC);

    let rankText = '';
    players.forEach((player, idx) => {
        const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'][idx] || `${idx + 1}.`;
        const username = interaction.guild.members.cache.get(player.userId)?.user.username || `ID: ${player.userId}`;
        rankText += `${medal} **${username}**\n`;
        rankText += `   等級 ${player.level} • ${player.exp} 經驗值\n`;
    });

    embed.addFields({
        name: '🎖️ 實力排名',
        value: rankText || '暫無數據',
        inline: false
    });

    return embed;
}

async function createCrystalsEmbed(interaction, data) {
    const players = Object.entries(data.players).map(([userId, player]) => ({
        userId,
        crystals: player.crystals || 0
    })).sort((a, b) => b.crystals - a.crystals).slice(0, 10);

    const embed = new EmbedBuilder()
        .setTitle('💎 水晶排行榜')
        .setDescription('基於玩家水晶持有量的排名')
        .setColor(0x00CED1);

    let rankText = '';
    players.forEach((player, idx) => {
        const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'][idx] || `${idx + 1}.`;
        const username = interaction.guild.members.cache.get(player.userId)?.user.username || `ID: ${player.userId}`;
        rankText += `${medal} **${username}** - **${player.crystals.toLocaleString()}** 💎\n`;
    });

    embed.addFields({
        name: '💰 富豪榜',
        value: rankText || '暫無數據',
        inline: false
    });

    return embed;
}

async function createGuildEmbed(interaction, data) {
    // 計算公會排名
    const guildStats = {};

    Object.values(data.players).forEach(player => {
        if (player.guild) {
            if (!guildStats[player.guild]) {
                guildStats[player.guild] = {
                    name: player.guild,
                    memberCount: 0,
                    totalLevel: 0,
                    totalCrystals: 0,
                    totalWeeklyPoints: 0
                };
            }
            guildStats[player.guild].memberCount++;
            guildStats[player.guild].totalLevel += player.level || 1;
            guildStats[player.guild].totalCrystals += player.crystals || 0;
            guildStats[player.guild].totalWeeklyPoints += player.weekly_points || 0;
        }
    });

    const guilds = Object.values(guildStats)
        .sort((a, b) => b.totalLevel - a.totalLevel)
        .slice(0, 10);

    const embed = new EmbedBuilder()
        .setTitle('🏰 公會排行榜')
        .setDescription('基於公會成員總等級的排名')
        .setColor(0x8B4513);

    let rankText = '';
    guilds.forEach((guild, idx) => {
        const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'][idx] || `${idx + 1}.`;
        rankText += `${medal} **${guild.name}**\n`;
        rankText += `   ${guild.memberCount} 成員 • 總等級 ${guild.totalLevel}\n`;
    });

    embed.addFields({
        name: '⚔️ 公會實力',
        value: rankText || '暫無公會數據',
        inline: false
    });

    return embed;
}
