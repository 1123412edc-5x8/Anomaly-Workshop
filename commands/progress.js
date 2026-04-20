const { EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('progress')
        .setDescription('查看你的冒險進度')
        .addSubcommand(subcommand =>
            subcommand.setName('overview')
                .setDescription('查看整體進度總覽'))
        .addSubcommand(subcommand =>
            subcommand.setName('achievements')
                .setDescription('查看成就進度'))
        .addSubcommand(subcommand =>
            subcommand.setName('collection')
                .setDescription('查看收藏進度'))
        .addSubcommand(subcommand =>
            subcommand.setName('stats')
                .setDescription('查看詳細統計數據')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        let data = db.read();

        if (!data.players) data.players = {};
        const player = data.players[userId];

        if (!player) {
            return interaction.reply({ content: '請先開始遊戲！', ephemeral: true });
        }

        switch (subcommand) {
            case 'overview':
                await showProgressOverview(interaction, player);
                break;
            case 'achievements':
                await showAchievementProgress(interaction, player);
                break;
            case 'collection':
                await showCollectionProgress(interaction, player);
                break;
            case 'stats':
                await showDetailedStats(interaction, player);
                break;
        }
    }
};

async function showProgressOverview(interaction, player) {
    const embed = new EmbedBuilder()
        .setTitle('📊 冒險進度總覽')
        .setColor(0x00BFFF)
        .setThumbnail(interaction.user.displayAvatarURL());

    // 基本信息
    const level = player.level || 1;
    const exp = player.exp || 0;
    const crystals = player.crystals || 0;
    const weeklyPoints = player.weekly_points || 0;

    embed.addFields({
        name: '👤 角色資訊',
        value: `等級：**${level}**\n經驗值：**${exp.toLocaleString()}**\n水晶：**${crystals.toLocaleString()}** 💎`,
        inline: true
    });

    // 活動統計
    const inventory = Array.isArray(player.inventory) ? player.inventory : [];
    const totalItems = inventory.length;
    const uniqueItems = new Set(inventory.map(item => item.name)).size;

    embed.addFields({
        name: '🎒 物品收藏',
        value: `總物品：**${totalItems}**\n獨特物品：**${uniqueItems}**\n本週積分：**${weeklyPoints}**`,
        inline: true
    });

    // 進度條
    const expForNextLevel = calculateExpForLevel(level + 1);
    const expProgress = Math.min(exp / expForNextLevel, 1);
    const progressBar = createProgressBar(expProgress, 20);

    embed.addFields({
        name: '⭐ 等級進度',
        value: `${progressBar}\n${exp}/${expForNextLevel} XP (${Math.floor(expProgress * 100)}%)`,
        inline: false
    });

    // 成就進度
    const achievements = calculateAchievementProgress(player);
    const achievementProgress = achievements.completed / achievements.total;
    const achievementBar = createProgressBar(achievementProgress, 15);

    embed.addFields({
        name: '🏆 成就進度',
        value: `${achievementBar}\n${achievements.completed}/${achievements.total} 成就 (${Math.floor(achievementProgress * 100)}%)`,
        inline: false
    });

    // 稀有度統計
    const rarityStats = getRarityStats(inventory);
    embed.addFields({
        name: '💎 物品稀有度',
        value: `⚪ 普通: ${rarityStats.common}\n💜 稀有: ${rarityStats.rare}\n🔴 史詩: ${rarityStats.epic}\n👑 傳說: ${rarityStats.legendary}`,
        inline: true
    });

    // 遊戲統計
    const gameStats = getGameStats(player);
    embed.addFields({
        name: '🎮 遊戲統計',
        value: `地城探險: ${gameStats.dungeons}\n寵物訓練: ${gameStats.pets}\n公會活動: ${gameStats.guild}`,
        inline: true
    });

    embed.setFooter({ text: '使用 /progress achievements 查看詳細成就進度' });

    // 添加導航按鈕
    const buttons = [
        new ButtonBuilder()
            .setCustomId('progress_achievements')
            .setLabel('成就')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('progress_collection')
            .setLabel('收藏')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('progress_stats')
            .setLabel('統計')
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

        const viewType = i.customId.split('_')[1];
        let newEmbed;

        switch (viewType) {
            case 'achievements':
                newEmbed = await createAchievementEmbed(player);
                break;
            case 'collection':
                newEmbed = await createCollectionEmbed(player);
                break;
            case 'stats':
                newEmbed = await createStatsEmbed(player);
                break;
        }

        if (newEmbed) {
            await i.update({ embeds: [newEmbed], components: [row] });
        }
    });
}

async function showAchievementProgress(interaction, player) {
    const embed = await createAchievementEmbed(player);
    await interaction.reply({ embeds: [embed] });
}

async function showCollectionProgress(interaction, player) {
    const embed = await createCollectionEmbed(player);
    await interaction.reply({ embeds: [embed] });
}

async function showDetailedStats(interaction, player) {
    const embed = await createStatsEmbed(player);
    await interaction.reply({ embeds: [embed] });
}

function calculateExpForLevel(level) {
    return level * 100 + (level - 1) * 50; // 簡單的經驗值公式
}

function createProgressBar(progress, length) {
    const filled = Math.floor(progress * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}

function calculateAchievementProgress(player) {
    const achievements = [
        { id: 'first_level', name: '初學者', condition: (p) => p.level >= 1, completed: true },
        { id: 'level_10', name: '見習冒險者', condition: (p) => p.level >= 10 },
        { id: 'level_25', name: '資深冒險者', condition: (p) => p.level >= 25 },
        { id: 'level_50', name: '精英冒險者', condition: (p) => p.level >= 50 },
        { id: 'first_crystal', name: '水晶收藏家', condition: (p) => (p.crystals || 0) >= 100 },
        { id: 'rich', name: '富豪', condition: (p) => (p.crystals || 0) >= 1000 },
        { id: 'first_pet', name: '寵物訓練師', condition: (p) => p.pet },
        { id: 'guild_member', name: '公會成員', condition: (p) => p.guild },
        { id: 'first_equipment', name: '裝備大師', condition: (p) => p.equipment && Object.keys(p.equipment).length > 0 },
        { id: 'dungeon_explorer', name: '地城探險者', condition: (p) => (p.dungeonRuns || 0) >= 10 }
    ];

    let completed = 0;
    achievements.forEach(achievement => {
        if (achievement.condition(player)) {
            completed++;
        }
    });

    return { completed, total: achievements.length };
}

function getRarityStats(inventory) {
    const stats = { common: 0, rare: 0, epic: 0, legendary: 0 };

    inventory.forEach(item => {
        const rarity = item.rarity || 'common';
        if (stats[rarity] !== undefined) {
            stats[rarity]++;
        }
    });

    return stats;
}

function getGameStats(player) {
    return {
        dungeons: player.dungeonRuns || 0,
        pets: player.pet ? 1 : 0,
        guild: player.guild ? 1 : 0
    };
}

async function createAchievementEmbed(player) {
    const embed = new EmbedBuilder()
        .setTitle('🏆 成就系統')
        .setDescription('解鎖各種成就來證明你的實力！')
        .setColor(0xFFD700);

    const achievements = [
        { name: '🎯 初學者', desc: '達到等級 1', condition: player.level >= 1, reward: '基礎獎勵' },
        { name: '⚔️ 見習冒險者', desc: '達到等級 10', condition: player.level >= 10, reward: '100 水晶' },
        { name: '🛡️ 資深冒險者', desc: '達到等級 25', condition: player.level >= 25, reward: '500 水晶' },
        { name: '👑 精英冒險者', desc: '達到等級 50', condition: player.level >= 50, reward: '1000 水晶' },
        { name: '💎 水晶收藏家', desc: '收集 100 水晶', condition: (player.crystals || 0) >= 100, reward: '稀有物品' },
        { name: '🏦 富豪', desc: '收集 1000 水晶', condition: (player.crystals || 0) >= 1000, reward: '傳說物品' },
        { name: '🐾 寵物訓練師', desc: '獲得第一個寵物', condition: !!player.pet, reward: '寵物裝備' },
        { name: '🏰 公會成員', desc: '加入公會', condition: !!player.guild, reward: '公會徽章' },
        { name: '⚒️ 裝備大師', desc: '裝備第一件裝備', condition: player.equipment && Object.keys(player.equipment).length > 0, reward: '裝備升級卷' },
        { name: '🏰 地城探險者', desc: '完成 10 次地城探險', condition: (player.dungeonRuns || 0) >= 10, reward: '地城鑰匙' }
    ];

    let completedText = '';
    let inProgressText = '';

    achievements.forEach(achievement => {
        if (achievement.condition) {
            completedText += `✅ ${achievement.name}\n   ${achievement.desc}\n   獎勵：${achievement.reward}\n\n`;
        } else {
            inProgressText += `⏳ ${achievement.name}\n   ${achievement.desc}\n\n`;
        }
    });

    if (completedText) {
        embed.addFields({
            name: '🎉 已完成的成就',
            value: completedText,
            inline: false
        });
    }

    if (inProgressText) {
        embed.addFields({
            name: '🎯 進行中的成就',
            value: inProgressText,
            inline: false
        });
    }

    return embed;
}

async function createCollectionEmbed(player) {
    const embed = new EmbedBuilder()
        .setTitle('📚 收藏進度')
        .setDescription('追蹤你的物品收藏和稀有度統計')
        .setColor(0x9932CC);

    const inventory = Array.isArray(player.inventory) ? player.inventory : [];
    const rarityStats = getRarityStats(inventory);

    // 總收藏統計
    const totalItems = inventory.length;
    const uniqueItems = new Set(inventory.map(item => item.name)).size;

    embed.addFields({
        name: '📊 收藏統計',
        value: `總物品數：**${totalItems}**\n獨特物品：**${uniqueItems}**\n收藏率：**${Math.floor((uniqueItems / 150) * 100)}%**`,
        inline: false
    });

    // 稀有度分布
    const rarityProgress = {
        common: { current: rarityStats.common, max: 100, emoji: '⚪' },
        rare: { current: rarityStats.rare, max: 50, emoji: '💜' },
        epic: { current: rarityStats.epic, max: 20, emoji: '🔴' },
        legendary: { current: rarityStats.legendary, max: 5, emoji: '👑' }
    };

    Object.entries(rarityProgress).forEach(([rarity, data]) => {
        const progress = Math.min(data.current / data.max, 1);
        const bar = createProgressBar(progress, 15);
        embed.addFields({
            name: `${data.emoji} ${rarity.charAt(0).toUpperCase() + rarity.slice(1)}`,
            value: `${bar}\n${data.current}/${data.max} (${Math.floor(progress * 100)}%)`,
            inline: true
        });
    });

    // 最近獲得的物品
    const recentItems = inventory.slice(-5).reverse();
    if (recentItems.length > 0) {
        let recentText = '';
        recentItems.forEach(item => {
            const rarityEmoji = {
                common: '⚪',
                rare: '💜',
                epic: '🔴',
                legendary: '👑'
            }[item.rarity || 'common'];
            recentText += `${rarityEmoji} ${item.name}\n`;
        });

        embed.addFields({
            name: '🆕 最近獲得',
            value: recentText,
            inline: false
        });
    }

    return embed;
}

async function createStatsEmbed(player) {
    const embed = new EmbedBuilder()
        .setTitle('📈 詳細統計')
        .setDescription('你的遊戲數據統計')
        .setColor(0x00CED1);

    // 基本統計
    embed.addFields(
        {
            name: '🎮 遊戲數據',
            value: `等級：**${player.level || 1}**\n經驗值：**${(player.exp || 0).toLocaleString()}**\n水晶：**${(player.crystals || 0).toLocaleString()}**`,
            inline: true
        },
        {
            name: '⚔️ 戰鬥統計',
            value: `勝利場次：**${player.battlesWon || 0}**\n總場次：**${player.totalBattles || 0}**\n勝率：**${player.totalBattles ? Math.floor((player.battlesWon || 0) / player.totalBattles * 100) : 0}%**`,
            inline: true
        },
        {
            name: '🏰 冒險統計',
            value: `地城探險：**${player.dungeonRuns || 0}**\n地區探索：**${player.areasExplored || 0}**\n任務完成：**${player.questsCompleted || 0}**`,
            inline: true
        }
    );

    // 經濟統計
    embed.addFields(
        {
            name: '💰 經濟統計',
            value: `總收入：**${(player.totalEarned || 0).toLocaleString()}**\n總支出：**${(player.totalSpent || 0).toLocaleString()}**\n淨收益：**${((player.totalEarned || 0) - (player.totalSpent || 0)).toLocaleString()}**`,
            inline: true
        },
        {
            name: '📅 活動統計',
            value: `本週積分：**${player.weekly_points || 0}**\n每日登入：**${player.dailyLogins || 0}**\n連續登入：**${player.consecutiveLogins || 0}**`,
            inline: true
        }
    );

    // 時間統計
    const playTime = player.totalPlayTime || 0; // 分鐘
    const hours = Math.floor(playTime / 60);
    const minutes = playTime % 60;

    embed.addFields({
        name: '⏰ 遊戲時間',
        value: `總遊戲時間：**${hours}** 小時 **${minutes}** 分鐘\n平均每日：**${Math.floor(playTime / Math.max(player.dailyLogins || 1, 1))}** 分鐘`,
        inline: false
    });

    return embed;
}