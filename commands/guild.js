const GUILD_BUILDINGS = {
    workshop: {
        name: '工坊',
        description: '提升成員的合成成功率',
        levels: [
            { cost: 1000, effect: { synthesis_boost: 5 } },
            { cost: 2500, effect: { synthesis_boost: 10 } },
            { cost: 5000, effect: { synthesis_boost: 15 } },
            { cost: 10000, effect: { synthesis_boost: 20 } },
            { cost: 20000, effect: { synthesis_boost: 25 } }
        ]
    },
    training_ground: {
        name: '訓練場',
        description: '提升成員的戰鬥經驗獲取',
        levels: [
            { cost: 1500, effect: { exp_boost: 10 } },
            { cost: 3000, effect: { exp_boost: 20 } },
            { cost: 6000, effect: { exp_boost: 30 } },
            { cost: 12000, effect: { exp_boost: 40 } },
            { cost: 25000, effect: { exp_boost: 50 } }
        ]
    },
    library: {
        name: '圖書館',
        description: '提升成員的技能學習效率',
        levels: [
            { cost: 2000, effect: { skill_boost: 8 } },
            { cost: 4000, effect: { skill_boost: 15 } },
            { cost: 8000, effect: { skill_boost: 25 } },
            { cost: 16000, effect: { skill_boost: 35 } },
            { cost: 32000, effect: { skill_boost: 50 } }
        ]
    },
    vault: {
        name: '寶庫',
        description: '增加金庫容量和利息',
        levels: [
            { cost: 3000, effect: { treasury_capacity: 10000, interest: 2 } },
            { cost: 6000, effect: { treasury_capacity: 25000, interest: 3 } },
            { cost: 12000, effect: { treasury_capacity: 50000, interest: 4 } },
            { cost: 24000, effect: { treasury_capacity: 100000, interest: 5 } },
            { cost: 50000, effect: { treasury_capacity: 250000, interest: 7 } }
        ]
    }
};

const GUILD_QUESTS = {
    daily_collection: {
        name: '每日收集',
        description: '全體成員今日拾荒次數達到50次',
        reward: { exp: 100, crystals: 50 },
        progress: 0,
        target: 50,
        type: 'daily'
    },
    synthesis_master: {
        name: '合成大師',
        description: '公會本週合成物品數量達到100個',
        reward: { exp: 500, crystals: 200 },
        progress: 0,
        target: 100,
        type: 'weekly'
    },
    battle_champion: {
        name: '戰鬥冠軍',
        description: '公會成員本月戰鬥勝利次數達到200次',
        reward: { exp: 1000, crystals: 500 },
        progress: 0,
        target: 200,
        type: 'monthly'
    },
    treasury_growth: {
        name: '金庫成長',
        description: '公會金庫累積達到5000結晶',
        reward: { exp: 300, crystals: 100 },
        progress: 0,
        target: 5000,
        type: 'achievement'
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guild')
        .setDescription('公會系統')
        .addSubcommand(subcommand =>
            subcommand.setName('create')
                .setDescription('創建公會')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('公會名稱')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('join')
                .setDescription('加入公會')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('公會名稱')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('info')
                .setDescription('查看公會資訊'))
        .addSubcommand(subcommand =>
            subcommand.setName('donate')
                .setDescription('捐獻資源')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('捐獻數量')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('build')
                .setDescription('建設公會建築')
                .addStringOption(option =>
                    option.setName('building')
                        .setDescription('建築類型')
                        .setRequired(true)
                        .addChoices(
                            { name: '工坊', value: 'workshop' },
                            { name: '訓練場', value: 'training_ground' },
                            { name: '圖書館', value: 'library' },
                            { name: '寶庫', value: 'vault' })))
        .addSubcommand(subcommand =>
            subcommand.setName('quests')
                .setDescription('查看公會任務'))
        .addSubcommand(subcommand =>
            subcommand.setName('claim')
                .setDescription('領取公會任務獎勵')
                .addStringOption(option =>
                    option.setName('quest')
                        .setDescription('任務名稱')
                        .setRequired(true))),
    execute: async (interaction) => {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        let data = db.read();

        if (!data.players) data.players = {};
        if (!data.players[userId]) {
            return interaction.reply({ content: '請先開始遊戲！', ephemeral: true });
        }

        if (!data.guilds) data.guilds = {};

        switch (subcommand) {
            case 'create':
                const guildName = interaction.options.getString('name');
                if (data.players[userId].guild) {
                    return interaction.reply({ content: '你已經加入公會了！', ephemeral: true });
                }
                if (data.guilds[guildName]) {
                    return interaction.reply({ content: '公會名稱已存在！', ephemeral: true });
                }

                data.guilds[guildName] = {
                    leader: userId,
                    members: [userId],
                    level: 1,
                    exp: 0,
                    treasury: 0,
                    created: Date.now()
                };
                data.players[userId].guild = guildName;
                db.write(data);

                const createEmbed = new EmbedBuilder()
                    .setTitle('🏰 公會創建成功！')
                    .setDescription(`公會 **${guildName}** 已創建！`)
                    .setColor(0x00FF00);
                interaction.reply({ embeds: [createEmbed] });
                break;

            case 'join':
                const joinName = interaction.options.getString('name');
                if (data.players[userId].guild) {
                    return interaction.reply({ content: '你已經加入公會了！', ephemeral: true });
                }
                if (!data.guilds[joinName]) {
                    return interaction.reply({ content: '公會不存在！', ephemeral: true });
                }

                data.guilds[joinName].members.push(userId);
                data.players[userId].guild = joinName;
                db.write(data);

                const joinEmbed = new EmbedBuilder()
                    .setTitle('🤝 加入公會成功！')
                    .setDescription(`歡迎加入 **${joinName}** 公會！`)
                    .setColor(0x00FF00);
                interaction.reply({ embeds: [joinEmbed] });
                break;

            case 'info':
                const playerGuild = data.players[userId].guild;
                if (!playerGuild) {
                    return interaction.reply({ content: '你還沒有加入公會！', ephemeral: true });
                }

                const guild = data.guilds[playerGuild];
                const memberNames = guild.members.map(id => {
                    const member = interaction.guild.members.cache.get(id);
                    return member ? member.displayName : '未知成員';
                });

                const infoEmbed = new EmbedBuilder()
                    .setTitle(`🏰 ${playerGuild}`)
                    .setColor(0x3498db)
                    .addFields(
                        { name: '等級', value: guild.level.toString(), inline: true },
                        { name: '經驗值', value: guild.exp.toString(), inline: true },
                        { name: '金庫', value: `${guild.treasury} 💎`, inline: true },
                        { name: '成員數', value: guild.members.length.toString(), inline: true },
                        { name: '會長', value: interaction.guild.members.cache.get(guild.leader)?.displayName || '未知', inline: true },
                        { name: '創建時間', value: `<t:${Math.floor(guild.created / 1000)}:F>`, inline: true },
                        { name: '成員列表', value: memberNames.join(', ') || '無成員', inline: false }
                    );
                interaction.reply({ embeds: [infoEmbed] });
                break;

            case 'donate':
                const amount = interaction.options.getInteger('amount');
                const donateGuild = data.players[userId].guild;
                if (!donateGuild) {
                    return interaction.reply({ content: '你還沒有加入公會！', ephemeral: true });
                }

                const player = data.players[userId];
                if (!player.entropy_crystal || player.entropy_crystal < amount) {
                    return interaction.reply({ content: '你的熵結晶不足！', ephemeral: true });
                }

                player.entropy_crystal -= amount;
                data.guilds[donateGuild].treasury += amount;
                data.guilds[donateGuild].exp += amount * 2; // 捐獻獲得雙倍經驗

                // 檢查升級
                const expNeeded = data.guilds[donateGuild].level * 1000;
                if (data.guilds[donateGuild].exp >= expNeeded) {
                    data.guilds[donateGuild].level++;
                    data.guilds[donateGuild].exp -= expNeeded;
                }

                db.write(data);

                const donateEmbed = new EmbedBuilder()
                    .setTitle('💝 捐獻成功！')
                    .setDescription(`你捐獻了 ${amount} 💎 給公會！\n公會獲得 ${amount * 2} 經驗值！`)
                    .setColor(0xFFD700);
                interaction.reply({ embeds: [donateEmbed] });
                break;

            case 'build':
                const buildGuildData = data.guilds[buildGuild];

                if (buildGuildData.leader !== userId) {
                    return interaction.reply({ content: '只有公會會長才能建設建築！', ephemeral: true });
                }

                if (!buildGuildData.buildings) {
                    buildGuildData.buildings = { workshop: 0, training_ground: 0, library: 0, vault: 0 };
                }

                const currentLevel = buildGuildData.buildings[buildingType] || 0;
                const buildingData = GUILD_BUILDINGS[buildingType];

                if (currentLevel >= buildingData.levels.length) {
                    return interaction.reply({ content: '這個建築已經升級到最高級了！', ephemeral: true });
                }

                const upgradeCost = buildingData.levels[currentLevel].cost;
                if (buildGuildData.treasury < upgradeCost) {
                    return interaction.reply({ content: `公會金庫結晶不足！需要 ${upgradeCost} 💎，目前有 ${buildGuildData.treasury} 💎。`, ephemeral: true });
                }

                buildGuildData.treasury -= upgradeCost;
                buildGuildData.buildings[buildingType] = currentLevel + 1;

                db.write(data);

                const buildEmbed = new EmbedBuilder()
                    .setTitle('🏗️ 建築升級成功！')
                    .setDescription(`**${buildingData.name}** 升級到 **${currentLevel + 1}** 級！\n${buildingData.description}`)
                    .addFields(
                        { name: '消耗結晶', value: `${upgradeCost} 💎`, inline: true },
                        { name: '剩餘金庫', value: `${buildGuildData.treasury} 💎`, inline: true }
                    )
                    .setColor(0x8B4513);
                interaction.reply({ embeds: [buildEmbed] });
                break;

            case 'quests':
                const questGuild = data.players[userId].guild;
                if (!questGuild) {
                    return interaction.reply({ content: '你還沒有加入公會！', ephemeral: true });
                }

                const questGuildData = data.guilds[questGuild];
                if (!questGuildData.quests) {
                    questGuildData.quests = { ...GUILD_QUESTS };
                }

                const questsEmbed = new EmbedBuilder()
                    .setTitle(`📋 ${questGuild} 公會任務`)
                    .setColor(0x9B59B6);

                for (const [questKey, quest] of Object.entries(questGuildData.quests)) {
                    const progress = quest.progress || 0;
                    const completed = progress >= quest.target;
                    const status = completed ? '✅ 可領取' : `${progress}/${quest.target}`;

                    questsEmbed.addFields({
                        name: `${quest.name} (${quest.type})`,
                        value: `${quest.description}\n**進度:** ${status}\n**獎勵:** ${quest.reward.exp} 經驗, ${quest.reward.crystals} 💎`,
                        inline: false
                    });
                }

                interaction.reply({ embeds: [questsEmbed] });
                break;

            case 'claim':
                const claimGuild = data.players[userId].guild;
                if (!claimGuild) {
                    return interaction.reply({ content: '你還沒有加入公會！', ephemeral: true });
                }

                const claimQuest = interaction.options.getString('quest');
                const claimGuildData = data.guilds[claimGuild];

                if (!claimGuildData.quests || !claimGuildData.quests[claimQuest]) {
                    return interaction.reply({ content: '任務不存在！', ephemeral: true });
                }

                const questData = claimGuildData.quests[claimQuest];
                if (questData.progress < questData.target) {
                    return interaction.reply({ content: '任務還沒有完成！', ephemeral: true });
                }

                if (questData.claimed) {
                    return interaction.reply({ content: '這個任務已經領取過獎勵了！', ephemeral: true });
                }

                // 發放獎勵
                claimGuildData.exp += questData.reward.exp;
                claimGuildData.treasury += questData.reward.crystals;
                questData.claimed = true;

                // 檢查公會升級
                const claimExpNeeded = claimGuildData.level * 1000;
                if (claimGuildData.exp >= claimExpNeeded) {
                    claimGuildData.level++;
                    claimGuildData.exp -= claimExpNeeded;
                }

                db.write(data);

                const claimEmbed = new EmbedBuilder()
                    .setTitle('🎉 任務獎勵領取成功！')
                    .setDescription(`完成任務 **${questData.name}**！`)
                    .addFields(
                        { name: '公會經驗', value: `+${questData.reward.exp}`, inline: true },
                        { name: '金庫結晶', value: `+${questData.reward.crystals} 💎`, inline: true }
                    )
                    .setColor(0xFFD700);
                interaction.reply({ embeds: [claimEmbed] });
                break;
        }
    }
};
