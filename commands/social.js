const { EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('social')
        .setDescription('社交系統')
        .addSubcommand(subcommand =>
            subcommand.setName('friends')
                .setDescription('好友系統')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('動作')
                        .setRequired(true)
                        .addChoices(
                            { name: '查看好友', value: 'list' },
                            { name: '發送邀請', value: 'invite' },
                            { name: '接受邀請', value: 'accept' },
                            { name: '拒絕邀請', value: 'decline' })))
        .addSubcommand(subcommand =>
            subcommand.setName('profile')
                .setDescription('查看玩家資料')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('要查看的玩家')
                        .setRequired(false))),
    execute: async (interaction) => {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        let data = db.read();

        if (!data.players) data.players = {};
        if (!data.players[userId]) {
            return interaction.reply({ content: '請先開始遊戲！', ephemeral: true });
        }

        const player = data.players[userId];
        if (!player.social) {
            player.social = { friends: [], friendRequests: [], profile: {} };
        }

        switch (subcommand) {
            case 'friends':
                const action = interaction.options.getString('action');

                switch (action) {
                    case 'list':
                        const friends = player.social.friends;
                        const friendNames = friends.map(friendId => {
                            const member = interaction.guild.members.cache.get(friendId);
                            return member ? member.displayName : '未知玩家';
                        });

                        const friendsEmbed = new EmbedBuilder()
                            .setTitle('👥 你的好友')
                            .setColor(0x3498DB)
                            .setDescription(friendNames.length > 0 ? friendNames.join('\n') : '你還沒有好友，快去認識新朋友吧！');

                        if (player.social.friendRequests.length > 0) {
                            friendsEmbed.addFields({
                                name: '📨 待處理邀請',
                                value: `你有 ${player.social.friendRequests.length} 個好友邀請`,
                                inline: false
                            });
                        }

                        interaction.reply({ embeds: [friendsEmbed] });
                        break;

                    case 'invite':
                        // 這裡需要一個目標用戶，但由於選項限制，我們使用按鈕來處理
                        const inviteEmbed = new EmbedBuilder()
                            .setTitle('👋 發送好友邀請')
                            .setDescription('點擊按鈕選擇要邀請的玩家：')
                            .setColor(0x2ECC71);

                        // 獲取在線玩家列表（簡化版）
                        const onlineMembers = interaction.guild.members.cache
                            .filter(member => !member.user.bot && member.id !== userId)
                            .first(10); // 限制10個

                        const inviteButtons = onlineMembers.map(member =>
                            new ButtonBuilder()
                                .setCustomId(`invite_friend_${member.id}`)
                                .setLabel(member.displayName)
                                .setStyle(ButtonStyle.Secondary)
                        );

                        if (inviteButtons.length === 0) {
                            return interaction.reply({ content: '沒有可邀請的玩家！', ephemeral: true });
                        }

                        const inviteRow = new ActionRowBuilder().addComponents(inviteButtons.slice(0, 5)); // Discord限制5個按鈕
                        interaction.reply({ embeds: [inviteEmbed], components: [inviteRow] });
                        break;

                    case 'accept':
                    case 'decline':
                        if (player.social.friendRequests.length === 0) {
                            return interaction.reply({ content: '你沒有待處理的好友邀請！', ephemeral: true });
                        }

                        const requestButtons = player.social.friendRequests.map((requesterId, index) => {
                            const member = interaction.guild.members.cache.get(requesterId);
                            const name = member ? member.displayName : '未知玩家';
                            return new ButtonBuilder()
                                .setCustomId(`${action}_request_${index}`)
                                .setLabel(`${action === 'accept' ? '接受' : '拒絕'} ${name}`)
                                .setStyle(action === 'accept' ? ButtonStyle.Success : ButtonStyle.Danger);
                        });

                        const requestEmbed = new EmbedBuilder()
                            .setTitle('📨 處理好友邀請')
                            .setDescription('選擇要處理的邀請：')
                            .setColor(0xF39C12);

                        const requestRow = new ActionRowBuilder().addComponents(requestButtons.slice(0, 5));
                        interaction.reply({ embeds: [requestEmbed], components: [requestRow] });
                        break;
                }
                break;

            case 'profile':
                const targetUser = interaction.options.getUser('user') || interaction.user;
                const targetId = targetUser.id;
                const targetPlayer = data.players[targetId];

                if (!targetPlayer) {
                    return interaction.reply({ content: '這個玩家還沒有開始遊戲！', ephemeral: true });
                }

                const profileEmbed = new EmbedBuilder()
                    .setTitle(`👤 ${targetUser.displayName} 的資料`)
                    .setColor(0x9B59B6)
                    .setThumbnail(targetUser.displayAvatarURL())
                    .addFields(
                        { name: '等級', value: targetPlayer.level?.toString() || '1', inline: true },
                        { name: '經驗值', value: targetPlayer.exp?.toString() || '0', inline: true },
                        { name: '熵結晶', value: (targetPlayer.entropy_crystal || 0).toString(), inline: true },
                        { name: '拾荒次數', value: (targetPlayer.scavengeCount || 0).toString(), inline: true },
                        { name: '戰鬥勝利', value: (targetPlayer.battleWins || 0).toString(), inline: true },
                        { name: '物品數量', value: (targetPlayer.inventory?.length || 0).toString(), inline: true }
                    );

                // 添加公會資訊
                if (targetPlayer.guild) {
                    const guild = data.guilds?.[targetPlayer.guild];
                    if (guild) {
                        profileEmbed.addFields({
                            name: '公會',
                            value: `${guild.name} (Lv.${guild.level})`,
                            inline: true
                        });
                    }
                }

                // 添加裝備資訊
                if (targetPlayer.equipment) {
                    const equipped = Object.entries(targetPlayer.equipment)
                        .filter(([_, item]) => item)
                        .map(([slot, item]) => `${slot}: ${item.name || item}`)
                        .join('\n') || '無裝備';

                    profileEmbed.addFields({
                        name: '裝備',
                        value: equipped,
                        inline: false
                    });
                }

                // 添加成就徽章
                if (targetPlayer.achievements && targetPlayer.achievements.length > 0) {
                    const achievementEmojis = targetPlayer.achievements.map(id => {
                        const achievements = ['🌱', '📦', '🔧', '✨', '🗺️', '⚔️', '🌀', '💎', '👑', '🏆'];
                        return achievements[id - 1] || '🏅';
                    }).join(' ');

                    profileEmbed.addFields({
                        name: '成就',
                        value: achievementEmojis,
                        inline: false
                    });
                }

                interaction.reply({ embeds: [profileEmbed] });
                break;
        }
    }
};

// 處理好友邀請
function sendFriendRequest(fromId, toId, data) {
    if (!data.players[toId].social.friendRequests.includes(fromId)) {
        data.players[toId].social.friendRequests.push(fromId);
    }
}

function acceptFriendRequest(userId, requesterIndex, data) {
    const player = data.players[userId];
    const requesterId = player.social.friendRequests[requesterIndex];

    if (!player.social.friends.includes(requesterId)) {
        player.social.friends.push(requesterId);
        data.players[requesterId].social.friends.push(userId);
    }

    player.social.friendRequests.splice(requesterIndex, 1);
}

function declineFriendRequest(userId, requesterIndex, data) {
    const player = data.players[userId];
    player.social.friendRequests.splice(requesterIndex, 1);
}

module.exports.sendFriendRequest = sendFriendRequest;
module.exports.acceptFriendRequest = acceptFriendRequest;
module.exports.declineFriendRequest = declineFriendRequest;
