const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('arena')
        .setDescription('競技場系統')
        .addSubcommand(subcommand =>
            subcommand.setName('enter')
                .setDescription('進入競技場'))
        .addSubcommand(subcommand =>
            subcommand.setName('rankings')
                .setDescription('查看排行榜'))
        .addSubcommand(subcommand =>
            subcommand.setName('challenge')
                .setDescription('挑戰玩家')
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('要挑戰的玩家')
                        .setRequired(true))),
    execute: async (interaction) => {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        let data = db.read();

        if (!data.players) data.players = {};
        if (!data.players[userId]) {
            return interaction.reply({ content: '請先開始遊戲！', ephemeral: true });
        }

        if (!data.arena) {
            data.arena = { rankings: [], challenges: {} };
        }

        const player = data.players[userId];
        if (!player.arenaStats) {
            player.arenaStats = { wins: 0, losses: 0, rating: 1000 };
        }

        switch (subcommand) {
            case 'enter':
                const enterEmbed = new EmbedBuilder()
                    .setTitle('🏟️ 競技場')
                    .setDescription('歡迎來到異常工坊競技場！')
                    .setColor(0xE74C3C)
                    .addFields(
                        { name: '你的評分', value: player.arenaStats.rating.toString(), inline: true },
                        { name: '勝場', value: player.arenaStats.wins.toString(), inline: true },
                        { name: '敗場', value: player.arenaStats.losses.toString(), inline: true },
                        { name: '勝率', value: `${calculateWinRate(player.arenaStats)}%`, inline: true }
                    );

                const buttons = [
                    new ButtonBuilder()
                        .setCustomId('find_match')
                        .setLabel('尋找對手')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('⚔️'),
                    new ButtonBuilder()
                        .setCustomId('view_rankings')
                        .setLabel('查看排行')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🏆')
                ];

                const row = new ActionRowBuilder().addComponents(buttons);
                interaction.reply({ embeds: [enterEmbed], components: [row] });
                break;

            case 'rankings':
                // 獲取前10名玩家
                const sortedPlayers = Object.entries(data.players)
                    .filter(([id, p]) => p.arenaStats)
                    .sort(([, a], [, b]) => b.arenaStats.rating - a.arenaStats.rating)
                    .slice(0, 10);

                const rankingsEmbed = new EmbedBuilder()
                    .setTitle('🏆 競技場排行榜')
                    .setColor(0xF1C40F);

                let rankingsText = '';
                sortedPlayers.forEach(([id, p], index) => {
                    const member = interaction.guild.members.cache.get(id);
                    const name = member ? member.displayName : '未知玩家';
                    const rank = index + 1;
                    const emoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🏅';
                    rankingsText += `${emoji} ${rank}. ${name} - ${p.arenaStats.rating} 點\n`;
                });

                rankingsEmbed.setDescription(rankingsText || '還沒有玩家參與競技場！');
                interaction.reply({ embeds: [rankingsEmbed] });
                break;

            case 'challenge':
                const targetUser = interaction.options.getUser('target');
                const targetId = targetUser.id;

                if (targetId === userId) {
                    return interaction.reply({ content: '不能挑戰自己！', ephemeral: true });
                }

                if (!data.players[targetId] || !data.players[targetId].arenaStats) {
                    return interaction.reply({ content: '目標玩家還沒有參與競技場！', ephemeral: true });
                }

                // 創建挑戰
                const challengeId = `${userId}_${targetId}_${Date.now()}`;
                data.arena.challenges[challengeId] = {
                    challenger: userId,
                    target: targetId,
                    status: 'pending',
                    created: Date.now()
                };

                db.write(data);

                const challengeEmbed = new EmbedBuilder()
                    .setTitle('⚔️ 競技場挑戰！')
                    .setDescription(`${interaction.user} 向 ${targetUser} 發起挑戰！`)
                    .setColor(0xE67E22);

                // 通知目標玩家
                try {
                    await targetUser.send({
                        embeds: [challengeEmbed],
                        components: [
                            new ActionRowBuilder().addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`accept_challenge_${challengeId}`)
                                    .setLabel('接受挑戰')
                                    .setStyle(ButtonStyle.Success),
                                new ButtonBuilder()
                                    .setCustomId(`decline_challenge_${challengeId}`)
                                    .setLabel('拒絕挑戰')
                                    .setStyle(ButtonStyle.Danger)
                            )
                        ]
                    });
                } catch (error) {
                    return interaction.reply({ content: '無法向目標玩家發送挑戰訊息！', ephemeral: true });
                }

                interaction.reply({ content: '挑戰已發送！等待對方回應。', ephemeral: true });
                break;
        }
    }
};

function calculateWinRate(stats) {
    const total = stats.wins + stats.losses;
    return total === 0 ? 0 : Math.round((stats.wins / total) * 100);
}

// 競技場戰鬥處理函數（需要在 battle.js 中整合）
function processArenaBattle(player1, player2) {
    // 簡化的競技場戰鬥邏輯
    const p1Power = calculatePlayerPower(player1);
    const p2Power = calculatePlayerPower(player2);

    const winner = p1Power > p2Power ? player1 : player2;
    const loser = p1Power > p2Power ? player2 : player1;

    // 更新評分
    const ratingChange = calculateRatingChange(winner.arenaStats.rating, loser.arenaStats.rating);
    winner.arenaStats.rating += ratingChange;
    loser.arenaStats.rating = Math.max(0, loser.arenaStats.rating - ratingChange);

    winner.arenaStats.wins++;
    loser.arenaStats.losses++;

    return { winner, loser, ratingChange };
}

function calculatePlayerPower(player) {
    let power = 100; // 基礎戰力

    // 裝備加成
    if (player.equipmentStats) {
        power += player.equipmentStats.attack * 2;
        power += player.equipmentStats.defense;
        power += player.equipmentStats.hp * 0.5;
    }

    // 技能加成
    if (player.skills) {
        power += player.skills.combat * 10;
    }

    // 寵物加成
    if (player.pet && player.pet.stats) {
        power += player.pet.stats.attack || 0;
        power += player.pet.stats.defense || 0;
    }

    return power;
}

function calculateRatingChange(winnerRating, loserRating) {
    const expectedScore = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
    return Math.round(32 * (1 - expectedScore));
}

module.exports.processArenaBattle = processArenaBattle;