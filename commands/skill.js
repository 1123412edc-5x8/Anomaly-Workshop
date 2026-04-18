const { EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../utils/db');

const SKILLS = {
    combat: {
        name: '戰鬥精通',
        description: '提升戰鬥傷害和防禦',
        maxLevel: 10,
        cost: (level) => level * 100,
        effect: (level) => ({ damage: level * 5, defense: level * 3 })
    },
    scavenging: {
        name: '拾荒大師',
        description: '提升拾荒效率和稀有物品機率',
        maxLevel: 10,
        cost: (level) => level * 80,
        effect: (level) => ({ efficiency: level * 2, rarity: level * 1 })
    },
    synthesis: {
        name: '合成專家',
        description: '提升合成成功率和品質',
        maxLevel: 10,
        cost: (level) => level * 120,
        effect: (level) => ({ success: level * 3, quality: level * 2 })
    },
    entropy: {
        name: '熵值控制',
        description: '降低物品熵值累積速度',
        maxLevel: 10,
        cost: (level) => level * 150,
        effect: (level) => ({ control: level * 4 })
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skill')
        .setDescription('技能系統')
        .addSubcommand(subcommand =>
            subcommand.setName('info')
                .setDescription('查看技能資訊'))
        .addSubcommand(subcommand =>
            subcommand.setName('upgrade')
                .setDescription('升級技能')
                .addStringOption(option =>
                    option.setName('skill')
                        .setDescription('要升級的技能')
                        .setRequired(true)
                        .addChoices(
                            { name: '戰鬥精通', value: 'combat' },
                            { name: '拾荒大師', value: 'scavenging' },
                            { name: '合成專家', value: 'synthesis' },
                            { name: '熵值控制', value: 'entropy' }))),
    execute: async (interaction) => {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        let data = db.read();

        if (!data.players) data.players = {};
        if (!data.players[userId]) {
            return interaction.reply({ content: '請先開始遊戲！', ephemeral: true });
        }

        const player = data.players[userId];
        if (!player.skills) {
            player.skills = {
                combat: 0,
                scavenging: 0,
                synthesis: 0,
                entropy: 0
            };
        }
        if (!player.skillPoints) {
            player.skillPoints = 0;
        }

        switch (subcommand) {
            case 'info':
                const infoEmbed = new EmbedBuilder()
                    .setTitle('🧠 技能系統')
                    .setDescription(`可用技能點：${player.skillPoints}`)
                    .setColor(0x9B59B6);

                for (const [skillKey, skillData] of Object.entries(SKILLS)) {
                    const currentLevel = player.skills[skillKey] || 0;
                    const nextLevel = currentLevel + 1;
                    const canUpgrade = nextLevel <= skillData.maxLevel;
                    const cost = canUpgrade ? skillData.cost(nextLevel) : '已滿級';

                    infoEmbed.addFields({
                        name: `${skillData.name} (Lv.${currentLevel}/${skillData.maxLevel})`,
                        value: `${skillData.description}\n升級費用：${cost} 💎`,
                        inline: false
                    });
                }

                const buttons = Object.keys(SKILLS).map(skillKey => {
                    const currentLevel = player.skills[skillKey] || 0;
                    const canUpgrade = currentLevel < SKILLS[skillKey].maxLevel && player.skillPoints >= SKILLS[skillKey].cost(currentLevel + 1);

                    return new ButtonBuilder()
                        .setCustomId(`upgrade_${skillKey}`)
                        .setLabel(`${SKILLS[skillKey].name} +1`)
                        .setStyle(canUpgrade ? ButtonStyle.Success : ButtonStyle.Secondary)
                        .setDisabled(!canUpgrade);
                });

                const row = new ActionRowBuilder().addComponents(buttons);
                interaction.reply({ embeds: [infoEmbed], components: [row] });
                break;

            case 'upgrade':
                const skillKey = interaction.options.getString('skill');
                const skill = SKILLS[skillKey];
                const currentLevel = player.skills[skillKey] || 0;

                if (currentLevel >= skill.maxLevel) {
                    return interaction.reply({ content: '這個技能已經滿級了！', ephemeral: true });
                }

                const upgradeCost = skill.cost(currentLevel + 1);
                if (player.skillPoints < upgradeCost) {
                    return interaction.reply({ content: `技能點不足！需要 ${upgradeCost} 點，你只有 ${player.skillPoints} 點。`, ephemeral: true });
                }

                player.skillPoints -= upgradeCost;
                player.skills[skillKey] = currentLevel + 1;

                db.write(data);

                const upgradeEmbed = new EmbedBuilder()
                    .setTitle('⬆️ 技能升級成功！')
                    .setDescription(`**${skill.name}** 提升到等級 ${currentLevel + 1}！`)
                    .setColor(0x00FF00);
                interaction.reply({ embeds: [upgradeEmbed] });
                break;
        }
    }
};
