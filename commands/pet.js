const { EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../utils/db');

const PET_SKILLS = {
    scrap_collector: [
        { name: '自動收集', description: '每小時自動獲得廢鐵零件', level: 1, effect: { auto_scavenge: 1 } },
        { name: '效率提升', description: '提升拾荒效率10%', level: 3, effect: { scavenging_boost: 10 } },
        { name: '幸運光環', description: '提升稀有物品發現機率5%', level: 5, effect: { luck_boost: 5 } }
    ],
    anomaly_detector: [
        { name: '探測增強', description: '提升異常物品發現機率', level: 1, effect: { detection_boost: 15 } },
        { name: '熵值感知', description: '提升熵值控制5%', level: 3, effect: { entropy_boost: 5 } },
        { name: '預警系統', description: '降低戰鬥中突發事件機率', level: 5, effect: { event_reduction: 20 } }
    ],
    combat_drone: [
        { name: '戰鬥支援', description: '戰鬥中提供額外傷害', level: 1, effect: { combat_damage: 8 } },
        { name: '防禦矩陣', description: '提升防禦力10%', level: 3, effect: { defense_boost: 10 } },
        { name: '緊急維修', description: '戰鬥中自動恢復HP', level: 5, effect: { auto_heal: 5 } }
    ],
    synthesis_aide: [
        { name: '合成助手', description: '提升合成成功率15%', level: 1, effect: { synthesis_boost: 15 } },
        { name: '品質提升', description: '提升合成物品品質', level: 3, effect: { quality_boost: 10 } },
        { name: '完美合成', description: '小機率獲得完美品質物品', level: 5, effect: { perfect_chance: 3 } }
    ],
    mechanical_assistant: [
        { name: '機械大師', description: '大幅提升拾荒效率', level: 1, effect: { scavenging_boost: 25 } },
        { name: '資源優化', description: '降低合成材料消耗', level: 3, effect: { material_reduction: 15 } },
        { name: '全自動化', description: '每2小時自動獲得資源', level: 5, effect: { auto_scavenge: 3 } }
    ],
    entropy_scanner: [
        { name: '熵值掃描', description: '大幅提升異常物品發現', level: 1, effect: { detection_boost: 30 } },
        { name: '穩定場域', description: '提升熵值控制15%', level: 3, effect: { entropy_boost: 15 } },
        { name: '預知未來', description: '預測下一次拾荒結果', level: 5, effect: { prediction: true } }
    ],
    battle_suit: [
        { name: '戰鬥裝甲', description: '大幅提升戰鬥屬性', level: 1, effect: { combat_damage: 20, defense_boost: 15 } },
        { name: '能量護盾', description: '戰鬥中提供額外防禦', level: 3, effect: { shield: 25 } },
        { name: '終極形態', description: '戰鬥勝利後獲得額外獎勵', level: 5, effect: { victory_bonus: 50 } }
    ]
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
                .setDescription('寵物進化'))
        .addSubcommand(subcommand =>
            subcommand.setName('train')
                .setDescription('訓練寵物技能')
                .addStringOption(option =>
                    option.setName('skill')
                        .setDescription('要訓練的技能')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('skills')
                .setDescription('查看寵物技能')),
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

            case 'train':
                if (!player.pet.type) {
                    return interaction.reply({ content: '你還沒有寵物！', ephemeral: true });
                }

                const skillName = interaction.options.getString('skill');
                const petSkills = PET_SKILLS[player.pet.type];
                const skill = petSkills.find(s => s.name === skillName);

                if (!skill) {
                    return interaction.reply({ content: '這個寵物沒有這個技能！', ephemeral: true });
                }

                if (player.pet.level < skill.level) {
                    return interaction.reply({ content: `寵物需要達到 ${skill.level} 級才能學習這個技能！`, ephemeral: true });
                }

                if (!player.pet.learnedSkills) {
                    player.pet.learnedSkills = [];
                }

                if (player.pet.learnedSkills.includes(skillName)) {
                    return interaction.reply({ content: '寵物已經學會這個技能了！', ephemeral: true });
                }

                const trainCost = skill.level * 200; // 訓練費用
                if (!player.entropy_crystal || player.entropy_crystal < trainCost) {
                    return interaction.reply({ content: `訓練費用不足！需要 ${trainCost} 💎。`, ephemeral: true });
                }

                player.entropy_crystal -= trainCost;
                player.pet.learnedSkills.push(skillName);

                db.write(data);

                const trainEmbed = new EmbedBuilder()
                    .setTitle('🎓 技能學習成功！')
                    .setDescription(`寵物學會了 **${skillName}**！\n${skill.description}`)
                    .addFields(
                        { name: '消耗結晶', value: `${trainCost} 💎`, inline: true },
                        { name: '剩餘結晶', value: `${player.entropy_crystal} 💎`, inline: true }
                    )
                    .setColor(0x3498DB);
                interaction.reply({ embeds: [trainEmbed] });
                break;

            case 'skills':
                if (!player.pet.type) {
                    return interaction.reply({ content: '你還沒有寵物！', ephemeral: true });
                }

                const skillsEmbed = new EmbedBuilder()
                    .setTitle(`🐾 ${PETS[player.pet.type].name} 的技能`)
                    .setColor(getRarityColor(PETS[player.pet.type].rarity));

                const petSkillsList = PET_SKILLS[player.pet.type];
                const learnedSkills = player.pet.learnedSkills || [];

                petSkillsList.forEach(skill => {
                    const learned = learnedSkills.includes(skill.name);
                    const status = learned ? '✅ 已學習' : (player.pet.level >= skill.level ? '📖 可學習' : '🔒 未解鎖');
                    skillsEmbed.addFields({
                        name: `${skill.name} (Lv.${skill.level})`,
                        value: `${skill.description}\n**狀態:** ${status}`,
                        inline: false
                    });
                });

                interaction.reply({ embeds: [skillsEmbed] });
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
