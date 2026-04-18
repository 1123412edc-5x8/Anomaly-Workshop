const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const db = require('../utils/db');

const DUNGEONS = {
    scrap_yard: {
        name: '廢鐵場',
        description: '充滿危險機械的廢棄工廠',
        difficulty: '簡單',
        levels: 5,
        rewards: ['工業零件', '機械組件', '稀有金屬'],
        enemies: ['廢鐵守衛', '生鏽機器人', '異常電磁場']
    },
    anomaly_lab: {
        name: '異常實驗室',
        description: '充滿未知危險的地下實驗室',
        difficulty: '中等',
        levels: 8,
        rewards: ['精密組件', '實驗數據', '能量核心'],
        enemies: ['變異生物', '實驗失敗品', 'AI守護者']
    },
    entropy_core: {
        name: '熵值核心',
        description: '通往熵值核心的危險通道',
        difficulty: '困難',
        levels: 12,
        rewards: ['熵結晶', '神話級零件', '未知科技'],
        enemies: ['熵值守衛', '時空異常', '核心守護者']
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dungeon')
        .setDescription('地下城探險系統')
        .addSubcommand(subcommand =>
            subcommand.setName('list')
                .setDescription('查看可用地下城'))
        .addSubcommand(subcommand =>
            subcommand.setName('enter')
                .setDescription('進入地下城')
                .addStringOption(option =>
                    option.setName('dungeon')
                        .setDescription('要進入的地下城')
                        .setRequired(true)
                        .addChoices(
                            { name: '廢鐵場', value: 'scrap_yard' },
                            { name: '異常實驗室', value: 'anomaly_lab' },
                            { name: '熵值核心', value: 'entropy_core' })))
        .addSubcommand(subcommand =>
            subcommand.setName('status')
                .setDescription('查看探險狀態')),
    execute: async (interaction) => {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        let data = db.read();

        if (!data.players) data.players = {};
        if (!data.players[userId]) {
            return interaction.reply({ content: '請先開始遊戲！', ephemeral: true });
        }

        const player = data.players[userId];
        if (!player.dungeon) {
            player.dungeon = { current: null, progress: 0, completed: [] };
        }

        switch (subcommand) {
            case 'list':
                const listEmbed = new EmbedBuilder()
                    .setTitle('🏰 地下城列表')
                    .setDescription('選擇要挑戰的地下城：')
                    .setColor(0x8B4513);

                for (const [key, dungeon] of Object.entries(DUNGEONS)) {
                    const completed = player.dungeon.completed.includes(key);
                    const status = completed ? '✅ 已完成' : '🔒 未完成';

                    listEmbed.addFields({
                        name: `${dungeon.name} (${dungeon.difficulty})`,
                        value: `${dungeon.description}\n層數：${dungeon.levels} | ${status}`,
                        inline: false
                    });
                }

                const dungeonSelect = new StringSelectMenuBuilder()
                    .setCustomId('select_dungeon')
                    .setPlaceholder('選擇要進入的地下城...')
                    .addOptions(
                        Object.entries(DUNGEONS).map(([key, dungeon]) => 
                            new StringSelectMenuOptionBuilder()
                                .setLabel(dungeon.name)
                                .setDescription(`${dungeon.difficulty} | ${dungeon.levels} 層`)
                                .setValue(key)
                        )
                    );

                const row = new ActionRowBuilder().addComponents(dungeonSelect);
                interaction.reply({ embeds: [listEmbed], components: [row] });
                break;

            case 'enter':
                if (player.dungeon.current) {
                    return interaction.reply({ content: '你已經在探險中了！使用 `/dungeon status` 查看狀態。', ephemeral: true });
                }

                const dungeonKey = interaction.options.getString('dungeon');
                const dungeon = DUNGEONS[dungeonKey];

                // 檢查體力
                if (!player.stamina) player.stamina = 100;
                if (player.stamina < 20) {
                    return interaction.reply({ content: '體力不足！需要至少 20 點體力。', ephemeral: true });
                }

                player.dungeon.current = dungeonKey;
                player.dungeon.progress = 1;
                player.stamina -= 20;

                db.write(data);

                const enterEmbed = new EmbedBuilder()
                    .setTitle(`🏰 進入 ${dungeon.name}！`)
                    .setDescription(`你開始挑戰 ${dungeon.name}！\n\n**第 1 層**\n${dungeon.description}`)
                    .setColor(0xFF6347)
                    .setFooter({ text: '使用按鈕繼續探險' });

                const actionRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('dungeon_continue')
                        .setLabel('繼續前進')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🏃'),
                    new ButtonBuilder()
                        .setCustomId('dungeon_retreat')
                        .setLabel('撤退')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🏃‍♂️‍➡️')
                );

                interaction.reply({ embeds: [enterEmbed], components: [actionRow] });
                break;

            case 'status':
                if (!player.dungeon.current) {
                    return interaction.reply({ content: '你目前沒有在探險中。', ephemeral: true });
                }

                const currentDungeon = DUNGEONS[player.dungeon.current];
                const statusEmbed = new EmbedBuilder()
                    .setTitle('🗺️ 探險狀態')
                    .setColor(0x4169E1)
                    .addFields(
                        { name: '當前地下城', value: currentDungeon.name, inline: true },
                        { name: '當前層數', value: `${player.dungeon.progress}/${currentDungeon.levels}`, inline: true },
                        { name: '剩餘體力', value: `${player.stamina}/100`, inline: true }
                    );

                interaction.reply({ embeds: [statusEmbed] });
                break;
        }
    }
};

// 處理地下城事件
function processDungeonEvent(player, dungeon, level) {
    const events = [
        { type: 'combat', chance: 0.6, description: '遭遇敵人！' },
        { type: 'treasure', chance: 0.2, description: '發現寶藏！' },
        { type: 'trap', chance: 0.15, description: '觸發陷阱！' },
        { type: 'rest', chance: 0.05, description: '找到休息點！' }
    ];

    const roll = Math.random();
    let cumulativeChance = 0;

    for (const event of events) {
        cumulativeChance += event.chance;
        if (roll <= cumulativeChance) {
            return event;
        }
    }

    return events[0]; // fallback
}

function generateDungeonRewards(dungeon, level) {
    const rewards = [];
    const rewardCount = Math.floor(Math.random() * 3) + 1; // 1-3 個獎勵

    for (let i = 0; i < rewardCount; i++) {
        const randomReward = dungeon.rewards[Math.floor(Math.random() * dungeon.rewards.length)];
        rewards.push(randomReward);
    }

    return rewards;
}

module.exports.processDungeonEvent = processDungeonEvent;
module.exports.generateDungeonRewards = generateDungeonRewards;