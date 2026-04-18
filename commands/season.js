const { EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../utils/db');

const SEASONS = {
    spring: {
        name: '春季',
        theme: '重生與成長',
        events: ['花開富貴', '春雨綿綿', '新生力量'],
        bonuses: { scavenging: 1.2, synthesis: 1.1 },
        color: 0x98FB98
    },
    summer: {
        name: '夏季',
        theme: '活力與冒險',
        events: ['夏日狂歡', '烈日挑戰', '海灘派對'],
        bonuses: { combat: 1.3, exploration: 1.2 },
        color: 0xFFD700
    },
    autumn: {
        name: '秋季',
        theme: '豐收與反思',
        events: ['豐收節慶', '落葉紛飛', '智慧累積'],
        bonuses: { entropy_control: 1.2, trading: 1.1 },
        color: 0xFF6347
    },
    winter: {
        name: '冬季',
        theme: '堅韌與團結',
        events: ['冰雪節日', '寒冬試煉', '溫暖守護'],
        bonuses: { defense: 1.2, guild_bonuses: 1.1 },
        color: 0x87CEEB
    }
};

const CURRENT_SEASON = 'summer'; // 可以根據實際日期動態設定

module.exports = {
    data: new SlashCommandBuilder()
        .setName('season')
        .setDescription('季節性活動系統')
        .addSubcommand(subcommand =>
            subcommand.setName('info')
                .setDescription('查看當前季節資訊'))
        .addSubcommand(subcommand =>
            subcommand.setName('events')
                .setDescription('查看季節活動'))
        .addSubcommand(subcommand =>
            subcommand.setName('claim')
                .setDescription('領取季節獎勵')),
    execute: async (interaction) => {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        let data = db.read();

        if (!data.players) data.players = {};
        if (!data.players[userId]) {
            return interaction.reply({ content: '請先開始遊戲！', ephemeral: true });
        }

        const player = data.players[userId];
        const season = SEASONS[CURRENT_SEASON];

        if (!player.seasonData) {
            player.seasonData = {
                season: CURRENT_SEASON,
                points: 0,
                claimedRewards: [],
                completedEvents: []
            };
        }

        // 檢查是否需要重置季節數據
        if (player.seasonData.season !== CURRENT_SEASON) {
            player.seasonData = {
                season: CURRENT_SEASON,
                points: 0,
                claimedRewards: [],
                completedEvents: []
            };
        }

        switch (subcommand) {
            case 'info':
                const infoEmbed = new EmbedBuilder()
                    .setTitle(`🌸 ${season.name}季節`)
                    .setDescription(`**主題：**${season.theme}\n\n**季節加成：**\n${formatBonuses(season.bonuses)}`)
                    .setColor(season.color)
                    .addFields(
                        { name: '你的季節點數', value: player.seasonData.points.toString(), inline: true },
                        { name: '已完成活動', value: player.seasonData.completedEvents.length.toString(), inline: true },
                        { name: '已領取獎勵', value: player.seasonData.claimedRewards.length.toString(), inline: true }
                    );

                interaction.reply({ embeds: [infoEmbed] });
                break;

            case 'events':
                const eventsEmbed = new EmbedBuilder()
                    .setTitle(`🎉 ${season.name}季節活動`)
                    .setDescription('參與活動獲得季節點數和特殊獎勵！')
                    .setColor(season.color);

                season.events.forEach((eventName, index) => {
                    const completed = player.seasonData.completedEvents.includes(eventName);
                    const status = completed ? '✅ 已完成' : '🎯 可參與';

                    eventsEmbed.addFields({
                        name: `${index + 1}. ${eventName}`,
                        value: `${getEventDescription(eventName)}\n${status}`,
                        inline: false
                    });
                });

                const eventButtons = season.events.map((eventName, index) => {
                    const completed = player.seasonData.completedEvents.includes(eventName);
                    return new ButtonBuilder()
                        .setCustomId(`season_event_${index}`)
                        .setLabel(eventName)
                        .setStyle(completed ? ButtonStyle.Secondary : ButtonStyle.Primary)
                        .setDisabled(completed);
                });

                const row = new ActionRowBuilder().addComponents(eventButtons);
                interaction.reply({ embeds: [eventsEmbed], components: [row] });
                break;

            case 'claim':
                const availableRewards = getAvailableRewards(player.seasonData.points);

                if (availableRewards.length === 0) {
                    return interaction.reply({ content: '你還沒有足夠的季節點數來領取獎勵！', ephemeral: true });
                }

                const claimEmbed = new EmbedBuilder()
                    .setTitle('🎁 季節獎勵')
                    .setDescription('選擇要領取的獎勵：')
                    .setColor(season.color);

                availableRewards.forEach(reward => {
                    claimEmbed.addFields({
                        name: `${reward.name} (${reward.points} 點)`,
                        value: reward.description,
                        inline: false
                    });
                });

                const claimButtons = availableRewards.map((reward, index) =>
                    new ButtonBuilder()
                        .setCustomId(`claim_reward_${index}`)
                        .setLabel(`領取 ${reward.name}`)
                        .setStyle(ButtonStyle.Success)
                );

                const claimRow = new ActionRowBuilder().addComponents(claimButtons);
                interaction.reply({ embeds: [claimEmbed], components: [claimRow] });
                break;
        }
    }
};

function formatBonuses(bonuses) {
    const bonusTexts = {
        scavenging: '拾荒效率',
        synthesis: '合成成功率',
        combat: '戰鬥傷害',
        exploration: '探索效率',
        entropy_control: '熵值控制',
        trading: '交易效率',
        defense: '防禦力',
        guild_bonuses: '公會加成'
    };

    return Object.entries(bonuses)
        .map(([key, value]) => `${bonusTexts[key] || key}: +${Math.round((value - 1) * 100)}%`)
        .join('\n');
}

function getEventDescription(eventName) {
    const descriptions = {
        '花開富貴': '拾荒 10 次獲得額外獎勵',
        '春雨綿綿': '合成物品獲得品質加成',
        '新生力量': '完成所有春季任務',
        '夏日狂歡': '參與競技場戰鬥',
        '烈日挑戰': '挑戰高難度地下城',
        '海灘派對': '與公會成員組隊探險',
        '豐收節慶': '大量交易獲得額外收益',
        '落葉紛飛': '清理熵值獲得獎勵',
        '智慧累積': '完成所有任務',
        '冰雪節日': '參與公會活動',
        '寒冬試煉': '在惡劣條件下生存',
        '溫暖守護': '幫助其他玩家'
    };

    return descriptions[eventName] || '特殊季節活動';
}

function getAvailableRewards(points) {
    const rewards = [
        { points: 100, name: '季節禮包', description: '獲得隨機季節物品' },
        { points: 250, name: '經驗加成', description: '獲得 500 經驗值' },
        { points: 500, name: '稀有寵物蛋', description: '獲得稀有寵物蛋' },
        { points: 1000, name: '傳說裝備', description: '獲得傳說級裝備藍圖' },
        { points: 2000, name: '季節稱號', description: '獲得專屬季節稱號' }
    ];

    return rewards.filter(reward => points >= reward.points);
}

// 處理季節事件完成
function completeSeasonEvent(player, eventName) {
    if (!player.seasonData.completedEvents.includes(eventName)) {
        player.seasonData.completedEvents.push(eventName);
        player.seasonData.points += 50; // 完成事件獲得點數
    }
}

module.exports.completeSeasonEvent = completeSeasonEvent;
