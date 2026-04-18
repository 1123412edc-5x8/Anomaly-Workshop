const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('me')
        .setDescription('查看個人狀態'),
    execute: async (interaction) => {
        const data = db.read();
        const userId = interaction.user.id;

        if (!data.players || !data.players[userId]) {
            return interaction.reply({
                content: '❌ 你還沒有開始遊戲！請先使用其他指令開始冒險。',
                ephemeral: true
            });
        }

        const player = data.players[userId];

        // 基本信息
        const crystalBalance = player.entropy_crystal || 0;
        const inventoryCount = player.inventory ? player.inventory.length : 0;
        const guildName = player.guild || '無';
        const redeemedCodes = player.redeemed_codes ? player.redeemed_codes.length : 0;

        // 技能信息
        const skills = player.skills || {};
        const combatLevel = skills.combat || 0;
        const scavengingLevel = skills.scavenging || 0;
        const synthesisLevel = skills.synthesis || 0;
        const entropyLevel = skills.entropy || 0;

        // 寵物信息
        const pet = player.pet;
        const petInfo = pet ? `${pet.name} (等級 ${pet.level})` : '無';

        // 裝備信息
        const equipment = player.equipment || {};
        const weapon = equipment.weapon || '無';
        const armor = equipment.armor || '無';
        const accessory = equipment.accessory || '無';

        // 成就統計
        const achievements = player.achievements || [];
        const achievementCount = achievements.length;

        // 創建嵌入
        const embed = new EmbedBuilder()
            .setTitle(`👤 ${interaction.user.username} 的個人狀態`)
            .setColor(0x3498DB)
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields(
                {
                    name: '💎 資源',
                    value: `**結晶值**: ${crystalBalance} 💎\n**背包物品**: ${inventoryCount} 個`,
                    inline: true
                },
                {
                    name: '🏰 社群',
                    value: `**公會**: ${guildName}\n**寵物**: ${petInfo}`,
                    inline: true
                },
                {
                    name: '⚔️ 技能等級',
                    value: `**戰鬥**: ${combatLevel}/10\n**掘進**: ${scavengingLevel}/10\n**合成**: ${synthesisLevel}/10\n**控制**: ${entropyLevel}/10`,
                    inline: true
                },
                {
                    name: '🛡️ 裝備',
                    value: `**武器**: ${weapon}\n**護甲**: ${armor}\n**飾品**: ${accessory}`,
                    inline: true
                },
                {
                    name: '🏆 成就',
                    value: `**已解鎖**: ${achievementCount} 項\n**已兌換代碼**: ${redeemedCodes} 個`,
                    inline: true
                }
            )
            .setFooter({ text: '使用 /help 查看更多指令' })
            .setTimestamp();

        // 如果有公會，添加公會信息
        if (player.guild && data.guilds && data.guilds[player.guild]) {
            const guild = data.guilds[player.guild];
            const memberCount = guild.members ? guild.members.length : 0;
            const treasury = guild.treasury || 0;
            const level = guild.level || 1;

            embed.addFields({
                name: '🏰 公會詳情',
                value: `**等級**: ${level}\n**成員**: ${memberCount} 人\n**金庫**: ${treasury} 💎`,
                inline: false
            });
        }

        interaction.reply({ embeds: [embed] });
    }
};