const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const db = require('../utils/db');

const DUNGEON_EVENTS = {
    combat: {
        name: '戰鬥事件',
        description: '遭遇強敵，需要戰鬥才能通過！',
        success_rate: 0.7,
        rewards: { exp: 50, crystals: 10 },
        penalty: { damage: 15, stamina_loss: 10 }
    },
    treasure: {
        name: '寶藏事件',
        description: '發現隱藏的寶藏！',
        success_rate: 1.0,
        rewards: { exp: 25, crystals: 25, items: ['稀有零件', '能量核心'] },
        penalty: null
    },
    trap: {
        name: '陷阱事件',
        description: '觸發危險陷阱！',
        success_rate: 0.5,
        rewards: null,
        penalty: { damage: 25, stamina_loss: 15, item_loss: true }
    },
    rest: {
        name: '休息事件',
        description: '找到安全的休息點，可以恢復體力！',
        success_rate: 1.0,
        rewards: { stamina_restore: 30 },
        penalty: null
    },
    puzzle: {
        name: '謎題事件',
        description: '遇到需要解決的謎題！',
        success_rate: 0.6,
        rewards: { exp: 75, crystals: 20, items: ['智慧水晶'] },
        penalty: { stamina_loss: 5 }
    },
    merchant: {
        name: '商人事件',
        description: '遇到地下城商人，可以購買特殊物品！',
        success_rate: 1.0,
        rewards: { merchant_access: true },
        penalty: null
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
                player.dungeon.events = [];
                player.stamina -= 20;

                db.write(data);

                // 立即處理第一層事件
                const firstEvent = processDungeonEvent(player, dungeon, 1);
                player.dungeon.events.push({
                    level: 1,
                    type: firstEvent.type,
                    resolved: false
                });

                const enterEmbed = new EmbedBuilder()
                    .setTitle(`🏰 進入 ${dungeon.name}！`)
                    .setDescription(`你開始挑戰 ${dungeon.name}！\n\n**第 1 層**\n${dungeon.description}\n\n**遭遇事件：${firstEvent.description}**`)
                    .setColor(0xFF6347)
                    .setFooter({ text: '選擇你的行動' });

                const eventButtons = createEventButtons(firstEvent.type);
                interaction.reply({ embeds: [enterEmbed], components: [eventButtons] });
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
        { type: 'combat', chance: 0.4 },
        { type: 'treasure', chance: 0.2 },
        { type: 'trap', chance: 0.15 },
        { type: 'rest', chance: 0.1 },
        { type: 'puzzle', chance: 0.1 },
        { type: 'merchant', chance: 0.05 }
    ];

    const roll = Math.random();
    let cumulativeChance = 0;

    for (const event of events) {
        cumulativeChance += event.chance;
        if (roll <= cumulativeChance) {
            return {
                type: event.type,
                ...DUNGEON_EVENTS[event.type]
            };
        }
    }

    return {
        type: 'combat',
        ...DUNGEON_EVENTS.combat
    };
}

function createEventButtons(eventType) {
    const buttons = [];

    switch (eventType) {
        case 'combat':
            buttons.push(
                new ButtonBuilder()
                    .setCustomId('dungeon_fight')
                    .setLabel('戰鬥')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('⚔️'),
                new ButtonBuilder()
                    .setCustomId('dungeon_flee')
                    .setLabel('逃跑')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🏃‍♂️‍➡️')
            );
            break;
        case 'treasure':
            buttons.push(
                new ButtonBuilder()
                    .setCustomId('dungeon_collect')
                    .setLabel('收集')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💰')
            );
            break;
        case 'trap':
            buttons.push(
                new ButtonBuilder()
                    .setCustomId('dungeon_disarm')
                    .setLabel('解除')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔧'),
                new ButtonBuilder()
                    .setCustomId('dungeon_ignore')
                    .setLabel('無視')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🚶')
            );
            break;
        case 'rest':
            buttons.push(
                new ButtonBuilder()
                    .setCustomId('dungeon_rest')
                    .setLabel('休息')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('😴')
            );
            break;
        case 'puzzle':
            buttons.push(
                new ButtonBuilder()
                    .setCustomId('dungeon_solve')
                    .setLabel('解謎')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🧠'),
                new ButtonBuilder()
                    .setCustomId('dungeon_skip')
                    .setLabel('跳過')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⏭️')
            );
            break;
        case 'merchant':
            buttons.push(
                new ButtonBuilder()
                    .setCustomId('dungeon_trade')
                    .setLabel('交易')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💼'),
                new ButtonBuilder()
                    .setCustomId('dungeon_leave')
                    .setLabel('離開')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('👋')
            );
            break;
    }

    return new ActionRowBuilder().addComponents(...buttons);
}

function resolveDungeonEvent(player, eventType, action, data) {
    const event = DUNGEON_EVENTS[eventType];
    const success = Math.random() < event.success_rate;

    let result = {
        success: success,
        rewards: null,
        penalty: null,
        message: ''
    };

    if (success) {
        if (event.rewards) {
            result.rewards = event.rewards;
            result.message = `✅ ${event.name}成功！`;

            // 應用獎勵
            if (event.rewards.exp) {
                // 這裡可以添加經驗系統
                result.message += `\n獲得 ${event.rewards.exp} 經驗值！`;
            }
            if (event.rewards.crystals) {
                player.entropy_crystal = (player.entropy_crystal || 0) + event.rewards.crystals;
                result.message += `\n獲得 ${event.rewards.crystals} 💎！`;
            }
            if (event.rewards.stamina_restore) {
                player.stamina = Math.min(100, player.stamina + event.rewards.stamina_restore);
                result.message += `\n恢復 ${event.rewards.stamina_restore} 點體力！`;
            }
            if (event.rewards.items) {
                event.rewards.items.forEach(item => {
                    player.inventory.push(item);
                });
                result.message += `\n獲得物品：${event.rewards.items.join(', ')}`;
            }
        }
    } else {
        if (event.penalty) {
            result.penalty = event.penalty;
            result.message = `❌ ${event.name}失敗！`;

            // 應用懲罰
            if (event.penalty.damage) {
                // 這裡可以添加生命值系統
                result.message += `\n受到 ${event.penalty.damage} 點傷害！`;
            }
            if (event.penalty.stamina_loss) {
                player.stamina = Math.max(0, player.stamina - event.penalty.stamina_loss);
                result.message += `\n失去 ${event.penalty.stamina_loss} 點體力！`;
            }
            if (event.penalty.item_loss && player.inventory.length > 0) {
                const lostItem = player.inventory.pop();
                result.message += `\n失去物品：${lostItem}`;
            }
        }
    }

    return result;
}

function generateDungeonRewards(dungeon, level) {
    const rewards = [];
    const rewardCount = Math.floor(Math.random() * 3) + 1;

    for (let i = 0; i < rewardCount; i++) {
        const randomReward = dungeon.rewards[Math.floor(Math.random() * dungeon.rewards.length)];
        rewards.push(randomReward);
    }

    return rewards;
}

module.exports.processDungeonEvent = processDungeonEvent;
module.exports.resolveDungeonEvent = resolveDungeonEvent;
module.exports.generateDungeonRewards = generateDungeonRewards;