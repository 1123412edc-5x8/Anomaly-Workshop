const { EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../utils/db');

const PETS = {
    scrap_collector: {
        name: '廢鐵收集者',
        description: '自動收集廢鐵零件',
        rarity: 'common',
        baseStats: { scavenging: 5, luck: 2 },
        evolution: 'mechanical_assistant'
    },
    anomaly_detector: {
        name: '異常探測器',
        description: '提升稀有物品發現機率',
        rarity: 'rare',
        baseStats: { detection: 8, entropy_control: 3 },
        evolution: 'entropy_scanner'
    },
    combat_drone: {
        name: '戰鬥無人機',
        description: '在戰鬥中提供支援',
        rarity: 'epic',
        baseStats: { attack: 12, defense: 6 },
        evolution: 'battle_suit'
    },
    synthesis_aide: {
        name: '合成助手',
        description: '提升合成成功率',
        rarity: 'legendary',
        baseStats: { synthesis: 15, quality: 10 },
        evolution: null
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pet')
        .setDescription('寵物系統')
        .addSubcommand(subcommand =>
            subcommand.setName('adopt')
                .setDescription('領養寵物')
                .addStringOption(option =>
                    option.setName('pet')
                        .setDescription('要領養的寵物')
                        .setRequired(true)
                        .addChoices(
                            { name: '廢鐵收集者', value: 'scrap_collector' },
                            { name: '異常探測器', value: 'anomaly_detector' },
                            { name: '戰鬥無人機', value: 'combat_drone' },
                            { name: '合成助手', value: 'synthesis_aide' })))
        .addSubcommand(subcommand =>
            subcommand.setName('info')
                .setDescription('查看寵物資訊'))
        .addSubcommand(subcommand =>
            subcommand.setName('feed')
                .setDescription('餵食寵物')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('餵食數量')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('evolve')
                .setDescription('寵物進化')),
    execute: async (interaction) => {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        let data = db.read();

        if (!data.players) data.players = {};
        if (!data.players[userId]) {
            return interaction.reply({ content: '請先開始遊戲！', ephemeral: true });
        }

        const player = data.players[userId];
        if (!player.pet) {
            player.pet = { type: null, level: 0, exp: 0, hunger: 100 };
        }

        switch (subcommand) {
            case 'adopt':
                if (player.pet.type) {
                    return interaction.reply({ content: '你已經有寵物了！', ephemeral: true });
                }

                const petType = interaction.options.getString('pet');
                const petData = PETS[petType];

                // 檢查領養費用
                const adoptCost = getAdoptCost(petData.rarity);
                if (!player.entropy_crystal || player.entropy_crystal < adoptCost) {
                    return interaction.reply({ content: `領養費用不足！需要 ${adoptCost} 💎。`, ephemeral: true });
                }

                player.entropy_crystal -= adoptCost;
                player.pet = {
                    type: petType,
                    level: 1,
                    exp: 0,
                    hunger: 100,
                    stats: { ...petData.baseStats }
                };

                db.write(data);

                const adoptEmbed = new EmbedBuilder()
                    .setTitle('🐾 領養成功！')
                    .setDescription(`你領養了 **${petData.name}**！\n${petData.description}`)
                    .setColor(0x00FF00);
                interaction.reply({ embeds: [adoptEmbed] });
                break;

            case 'info':
                if (!player.pet.type) {
                    return interaction.reply({ content: '你還沒有寵物！', ephemeral: true });
                }

                const currentPet = PETS[player.pet.type];
                const infoEmbed = new EmbedBuilder()
                    .setTitle(`🐾 ${currentPet.name}`)
                    .setDescription(currentPet.description)
                    .setColor(getRarityColor(currentPet.rarity))
                    .addFields(
                        { name: '等級', value: player.pet.level.toString(), inline: true },
                        { name: '經驗值', value: `${player.pet.exp}/100`, inline: true },
                        { name: '飢餓度', value: `${player.pet.hunger}/100`, inline: true },
                        { name: '稀有度', value: currentPet.rarity, inline: true }
                    );

                // 顯示寵物屬性
                let statsText = '';
                for (const [stat, value] of Object.entries(player.pet.stats)) {
                    statsText += `${stat}: +${value}\n`;
                }
                infoEmbed.addFields({ name: '屬性加成', value: statsText, inline: false });

                // 進化資訊
                if (currentPet.evolution && player.pet.level >= 10) {
                    infoEmbed.addFields({ name: '進化', value: `可以進化為 ${PETS[currentPet.evolution].name}！`, inline: false });
                }

                interaction.reply({ embeds: [infoEmbed] });
                break;

            case 'feed':
                if (!player.pet.type) {
                    return interaction.reply({ content: '你還沒有寵物！', ephemeral: true });
                }

                const feedAmount = interaction.options.getInteger('amount');
                if (!player.inventory || player.inventory.length < feedAmount) {
                    return interaction.reply({ content: '你的背包中沒有足夠的物品！', ephemeral: true });
                }

                // 餵食增加飢餓度和經驗值
                player.pet.hunger = Math.min(100, player.pet.hunger + feedAmount * 10);
                player.pet.exp += feedAmount * 5;

                // 檢查升級
                if (player.pet.exp >= 100) {
                    player.pet.level++;
                    player.pet.exp -= 100;

                    // 升級時提升屬性
                    const petData = PETS[player.pet.type];
                    for (const stat in player.pet.stats) {
                        player.pet.stats[stat] += petData.baseStats[stat] || 1;
                    }
                }

                // 移除餵食的物品
                player.inventory.splice(0, feedAmount);

                db.write(data);

                const feedEmbed = new EmbedBuilder()
                    .setTitle('🍖 餵食成功！')
                    .setDescription(`寵物飢餓度 +${feedAmount * 10}，經驗值 +${feedAmount * 5}！`)
                    .setColor(0xFFA500);
                interaction.reply({ embeds: [feedEmbed] });
                break;

            case 'evolve':
                if (!player.pet.type) {
                    return interaction.reply({ content: '你還沒有寵物！', ephemeral: true });
                }

                const evolvePet = PETS[player.pet.type];
                if (!evolvePet.evolution || player.pet.level < 10) {
                    return interaction.reply({ content: '寵物還不能進化！需要達到10級。', ephemeral: true });
                }

                const evolveCost = 500; // 進化費用
                if (!player.entropy_crystal || player.entropy_crystal < evolveCost) {
                    return interaction.reply({ content: `進化費用不足！需要 ${evolveCost} 💎。`, ephemeral: true });
                }

                player.entropy_crystal -= evolveCost;
                const newPetType = evolvePet.evolution;
                player.pet.type = newPetType;
                player.pet.level = 1;
                player.pet.exp = 0;
                player.pet.stats = { ...PETS[newPetType].baseStats };

                db.write(data);

                const evolveEmbed = new EmbedBuilder()
                    .setTitle('✨ 寵物進化！')
                    .setDescription(`你的寵物進化為 **${PETS[newPetType].name}**！`)
                    .setColor(0xFFD700);
                interaction.reply({ embeds: [evolveEmbed] });
                break;
        }
    }
};

function getAdoptCost(rarity) {
    const costs = { common: 100, rare: 250, epic: 500, legendary: 1000 };
    return costs[rarity] || 100;
}

function getRarityColor(rarity) {
    const colors = { common: 0x95A5A6, rare: 0x3498DB, epic: 0x9B59B6, legendary: 0xF1C40F };
    return colors[rarity] || 0x95A5A6;
}
