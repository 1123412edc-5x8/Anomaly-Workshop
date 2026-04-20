const { EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../utils/db');

const QUEST_TYPES = {
    daily: '每日任務',
    weekly: '週任務',
    achievement: '成就任務',
    seasonal: '季節任務',
    special: '特殊任務'
};

const QUESTS = [
    // 每日任務
    {
        id: 'daily_scavenge_5',
        name: '拾荒新手',
        description: '進行 5 次拾荒',
        type: 'daily',
        requirements: { action: 'scavenge', count: 5 },
        rewards: { crystals: 25, exp: 50 },
        icon: '🔍'
    },
    {
        id: 'daily_combine_3',
        name: '合成學徒',
        description: '成功合成 3 次物品',
        type: 'daily',
        requirements: { action: 'combine_success', count: 3 },
        rewards: { crystals: 30, exp: 60 },
        icon: '⚗️'
    },
    {
        id: 'daily_battle_3',
        name: '戰鬥練習',
        description: '贏得 3 場戰鬥',
        type: 'daily',
        requirements: { action: 'battle_win', count: 3 },
        rewards: { crystals: 40, exp: 75 },
        icon: '⚔️'
    },

    // 週任務
    {
        id: 'weekly_collect_50',
        name: '收藏家之路',
        description: '收集 50 個不同物品',
        type: 'weekly',
        requirements: { action: 'collect_unique', count: 50 },
        rewards: { crystals: 200, exp: 300 },
        icon: '📚'
    },
    {
        id: 'weekly_battle_20',
        name: '戰場老兵',
        description: '贏得 20 場戰鬥',
        type: 'weekly',
        requirements: { action: 'battle_win', count: 20 },
        rewards: { crystals: 150, exp: 250 },
        icon: '🏆'
    },
    {
        id: 'weekly_guild_contribute',
        name: '公會貢獻者',
        description: '為公會貢獻 500 結晶',
        type: 'weekly',
        requirements: { action: 'guild_contribute', count: 500 },
        rewards: { crystals: 100, exp: 200, guild_points: 50 },
        icon: '🏰'
    },

    // 成就任務
    {
        id: 'achievement_first_legendary',
        name: '傳說誕生',
        description: '獲得第一件傳說級裝備',
        type: 'achievement',
        requirements: { action: 'get_legendary_equipment', count: 1 },
        rewards: { crystals: 500, exp: 1000, title: '傳說獵人' },
        icon: '👑'
    },
    {
        id: 'achievement_pet_master',
        name: '寵物大師',
        description: '將寵物提升到等級 10',
        type: 'achievement',
        requirements: { action: 'pet_level_10', count: 1 },
        rewards: { crystals: 300, exp: 600, pet_skill: 'master_training' },
        icon: '🐾'
    },
    {
        id: 'achievement_guild_leader',
        name: '公會領袖',
        description: '成為公會會長',
        type: 'achievement',
        requirements: { action: 'become_guild_leader', count: 1 },
        rewards: { crystals: 400, exp: 800, guild_benefits: true },
        icon: '👑'
    },

    // 特殊任務
    {
        id: 'special_dungeon_master',
        name: '地下城征服者',
        description: '完成 10 層地下城挑戰',
        type: 'special',
        requirements: { action: 'dungeon_complete', count: 10 },
        rewards: { crystals: 1000, exp: 1500, special_item: 'dungeon_key' },
        icon: '🏰'
    },
    {
        id: 'special_trader',
        name: '交易大師',
        description: '完成 50 筆玩家交易',
        type: 'special',
        requirements: { action: 'player_trade', count: 50 },
        rewards: { crystals: 750, exp: 1200, trade_discount: 10 },
        icon: '💱'
    }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quest')
        .setDescription('任務系統')
        .addSubcommand(subcommand =>
            subcommand.setName('list')
                .setDescription('查看任務列表')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('任務類型')
                        .setRequired(false)
                        .addChoices(
                            { name: '全部', value: 'all' },
                            { name: '每日任務', value: 'daily' },
                            { name: '週任務', value: 'weekly' },
                            { name: '成就任務', value: 'achievement' },
                            { name: '特殊任務', value: 'special' }
                        )))
        .addSubcommand(subcommand =>
            subcommand.setName('progress')
                .setDescription('查看任務進度')
                .addStringOption(option =>
                    option.setName('quest_id')
                        .setDescription('任務ID')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('claim')
                .setDescription('領取任務獎勵')
                .addStringOption(option =>
                    option.setName('quest_id')
                        .setDescription('任務ID')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        let data = db.read();

        if (!data.players) data.players = {};
        if (!data.players[userId]) {
            return interaction.reply({ content: '請先開始遊戲！', ephemeral: true });
        }

        const player = data.players[userId];

        // 初始化任務數據
        if (!player.quests) {
            player.quests = {
                completed: [],
                active: {},
                lastReset: {
                    daily: 0,
                    weekly: 0
                }
            };
        }

        // 檢查任務重置
        checkQuestResets(player);

        if (subcommand === 'list') {
            const type = interaction.options.getString('type') || 'all';
            await showQuestList(interaction, player, type);
        } else if (subcommand === 'progress') {
            const questId = interaction.options.getString('quest_id');
            await showQuestProgress(interaction, player, questId);
        } else if (subcommand === 'claim') {
            const questId = interaction.options.getString('quest_id');
            await claimQuestReward(interaction, player, questId, data);
        }
    }
};

function checkQuestResets(player) {
    const now = Date.now();
    const today = new Date(now).toDateString();
    const thisWeek = getWeekStart(now);

    // 每日重置
    if (player.quests.lastReset.daily !== today) {
        // 重置每日任務進度
        QUESTS.filter(q => q.type === 'daily').forEach(quest => {
            if (player.quests.active[quest.id]) {
                player.quests.active[quest.id].progress = 0;
            }
        });
        player.quests.lastReset.daily = today;
    }

    // 週重置
    if (player.quests.lastReset.weekly !== thisWeek) {
        // 重置週任務進度
        QUESTS.filter(q => q.type === 'weekly').forEach(quest => {
            if (player.quests.active[quest.id]) {
                player.quests.active[quest.id].progress = 0;
            }
        });
        player.quests.lastReset.weekly = thisWeek;
    }
}

function getWeekStart(timestamp) {
    const date = new Date(timestamp);
    const day = date.getDay();
    const diff = date.getDate() - day;
    return new Date(date.setDate(diff)).toDateString();
}

async function showQuestList(interaction, player, type) {
    const filteredQuests = type === 'all' ?
        QUESTS :
        QUESTS.filter(q => q.type === type);

    const embed = new EmbedBuilder()
        .setTitle('📋 任務列表')
        .setDescription(`選擇任務類型查看詳細內容\n使用 \`/quest progress <任務ID>\` 查看進度`)
        .setColor(0xFFD700);

    // 按類型分組
    const groupedQuests = {};
    filteredQuests.forEach(quest => {
        if (!groupedQuests[quest.type]) groupedQuests[quest.type] = [];
        groupedQuests[quest.type].push(quest);
    });

    Object.keys(groupedQuests).forEach(typeKey => {
        const quests = groupedQuests[typeKey];
        const questList = quests.map(quest => {
            const isCompleted = player.quests.completed.includes(quest.id);
            const isActive = player.quests.active[quest.id];
            const status = isCompleted ? '✅' : (isActive ? '🔄' : '🔒');

            return `${status} ${quest.icon} **${quest.name}** (${quest.id})`;
        }).join('\n');

        embed.addFields({
            name: `📌 ${QUEST_TYPES[typeKey]}`,
            value: questList || '無任務',
            inline: false
        });
    });

    // 創建任務選擇按鈕
    const buttons = filteredQuests.slice(0, 5).map(quest => {
        const isCompleted = player.quests.completed.includes(quest.id);
        const isActive = player.quests.active[quest.id];
        const label = isCompleted ? `${quest.icon} ${quest.name} (已完成)` :
                   isActive ? `${quest.icon} ${quest.name} (進行中)` :
                   `${quest.icon} ${quest.name}`;

        return new ButtonBuilder()
            .setCustomId(`quest_select_${quest.id}`)
            .setLabel(label.substring(0, 80)) // Discord按鈕標籤長度限制
            .setStyle(isCompleted ? ButtonStyle.Success :
                     isActive ? ButtonStyle.Primary : ButtonStyle.Secondary);
    });

    const row = new ActionRowBuilder().addComponents(buttons);

    const response = await interaction.reply({ embeds: [embed], components: [row] });

    // 處理任務選擇
    const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000
    });

    collector.on('collect', async (i) => {
        if (i.user.id !== interaction.user.id) return;

        const questId = i.customId.replace('quest_select_', '');
        const quest = QUESTS.find(q => q.id === questId);

        if (!quest) return;

        // 激活任務
        if (!player.quests.active[quest.id] && !player.quests.completed.includes(quest.id)) {
            player.quests.active[quest.id] = {
                progress: 0,
                started: Date.now()
            };
            db.write(db.read()); // 保存數據
        }

        await showQuestProgress(i, player, questId);
    });
}

async function showQuestProgress(interaction, player, questId) {
    const quest = QUESTS.find(q => q.id === questId);
    if (!quest) {
        return interaction.reply({ content: '找不到該任務！', ephemeral: true });
    }

    const isCompleted = player.quests.completed.includes(quest.id);
    const activeQuest = player.quests.active[quest.id];

    const progress = isCompleted ? quest.requirements.count :
                   (activeQuest ? activeQuest.progress : 0);

    const progressPercent = Math.min(100, (progress / quest.requirements.count) * 100);
    const progressBar = '█'.repeat(Math.floor(progressPercent / 10)) +
                       '░'.repeat(10 - Math.floor(progressPercent / 10));

    const embed = new EmbedBuilder()
        .setTitle(`${quest.icon} ${quest.name}`)
        .setDescription(quest.description)
        .addFields(
            {
                name: '📊 進度',
                value: `\`${progressBar}\` ${progress}/${quest.requirements.count} (${Math.floor(progressPercent)}%)`,
                inline: false
            },
            {
                name: '🎯 要求',
                value: `${quest.requirements.action.replace('_', ' ')} x${quest.requirements.count}`,
                inline: true
            },
            {
                name: '💝 獎勵',
                value: formatRewards(quest.rewards),
                inline: true
            },
            {
                name: '📋 狀態',
                value: isCompleted ? '✅ 已完成' :
                       activeQuest ? '🔄 進行中' : '🔒 未激活',
                inline: true
            }
        )
        .setColor(isCompleted ? 0x00FF00 : activeQuest ? 0xFFFF00 : 0xFF0000);

    if (isCompleted) {
        const claimButton = new ButtonBuilder()
            .setCustomId(`quest_claim_${quest.id}`)
            .setLabel('領取獎勵')
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(claimButton);
        await interaction.reply({ embeds: [embed], components: [row] });
    } else {
        await interaction.reply({ embeds: [embed] });
    }
}

async function claimQuestReward(interaction, player, questId, data) {
    const quest = QUESTS.find(q => q.id === questId);
    if (!quest) {
        return interaction.reply({ content: '找不到該任務！', ephemeral: true });
    }

    if (!player.quests.completed.includes(quest.id)) {
        return interaction.reply({ content: '該任務尚未完成！', ephemeral: true });
    }

    // 移除已完成的任務
    player.quests.completed = player.quests.completed.filter(id => id !== questId);

    // 發放獎勵
    const rewards = quest.rewards;

    if (rewards.crystals) {
        player.crystals = (player.crystals || 0) + rewards.crystals;
    }

    if (rewards.exp) {
        player.exp = (player.exp || 0) + rewards.exp;
        // 檢查升級
        checkLevelUp(player);
    }

    if (rewards.guild_points && player.guild) {
        // 公會點數邏輯
        const guild = data.guilds[player.guild];
        if (guild) {
            guild.points = (guild.points || 0) + rewards.guild_points;
        }
    }

    if (rewards.title) {
        if (!player.titles) player.titles = [];
        player.titles.push(rewards.title);
    }

    if (rewards.pet_skill && player.pet) {
        if (!player.pet.skills) player.pet.skills = [];
        player.pet.skills.push(rewards.pet_skill);
    }

    if (rewards.special_item) {
        if (!player.inventory) player.inventory = [];
        player.inventory.push({
            name: rewards.special_item,
            type: 'special',
            rarity: 'legendary'
        });
    }

    db.write(data);

    const embed = new EmbedBuilder()
        .setTitle('🎉 獎勵領取成功！')
        .setDescription(`恭喜完成任務 **${quest.name}**！`)
        .addFields({
            name: '💝 獲得獎勵',
            value: formatRewards(rewards),
            inline: false
        })
        .setColor(0x00FF00);

    await interaction.reply({ embeds: [embed] });
}

function formatRewards(rewards) {
    const rewardTexts = [];

    if (rewards.crystals) rewardTexts.push(`💎 ${rewards.crystals} 結晶`);
    if (rewards.exp) rewardTexts.push(`⭐ ${rewards.exp} 經驗值`);
    if (rewards.guild_points) rewardTexts.push(`🏰 ${rewards.guild_points} 公會點數`);
    if (rewards.title) rewardTexts.push(`👑 稱號: ${rewards.title}`);
    if (rewards.pet_skill) rewardTexts.push(`🐾 寵物技能: ${rewards.pet_skill}`);
    if (rewards.special_item) rewardTexts.push(`🎁 特殊物品: ${rewards.special_item}`);
    if (rewards.trade_discount) rewardTexts.push(`💱 ${rewards.trade_discount}% 交易折扣`);

    return rewardTexts.join('\n');
}

function checkLevelUp(player) {
    const expNeeded = player.level * 100;
    if (player.exp >= expNeeded) {
        player.level = (player.level || 1) + 1;
        player.exp -= expNeeded;

        // 升級獎勵
        player.skillPoints = (player.skillPoints || 0) + 1;

        // 檢查是否需要再次升級
        checkLevelUp(player);
    }
}

// 導出任務更新函數供其他模組使用
module.exports.updateQuestProgress = function(userId, action, count = 1) {
    const data = db.read();
    const player = data.players[userId];

    if (!player || !player.quests) return;

    // 檢查所有活躍任務
    Object.keys(player.quests.active).forEach(questId => {
        const quest = QUESTS.find(q => q.id === questId);
        if (!quest || quest.requirements.action !== action) return;

        const activeQuest = player.quests.active[questId];
        activeQuest.progress = Math.min(quest.requirements.count, activeQuest.progress + count);

        // 檢查任務完成
        if (activeQuest.progress >= quest.requirements.count) {
            if (!player.quests.completed.includes(questId)) {
                player.quests.completed.push(questId);
            }
            delete player.quests.active[questId];
        }
    });

    db.write(data);
};
