const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/db');

// --- 建築定義 (保留你原始的所有數值) ---
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

// --- 任務定義 (保留你原始設定) ---
const GUILD_QUESTS = {
    daily_collection: { name: '每日收集', description: '全體成員今日拾荒次數達到50次', reward: { exp: 100, crystals: 50 }, progress: 0, target: 50, type: 'daily' },
    synthesis_master: { name: '合成大師', description: '公會本週合成物品數量達到100個', reward: { exp: 500, crystals: 200 }, progress: 0, target: 100, type: 'weekly' },
    battle_champion: { name: '戰鬥冠軍', description: '公會成員本月戰鬥勝利次數達到200次', reward: { exp: 1000, crystals: 500 }, progress: 0, target: 200, type: 'monthly' }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guild')
        .setDescription('公會系統')
        .addSubcommand(sub => sub.setName('create').setDescription('創建公會').addStringOption(o => o.setName('name').setDescription('公會名稱').setRequired(true)))
        .addSubcommand(sub => sub.setName('join').setDescription('加入公會').addStringOption(o => o.setName('name').setDescription('公會名稱').setRequired(true)))
        .addSubcommand(sub => sub.setName('info').setDescription('查看公會資訊'))
        .addSubcommand(sub => sub.setName('donate').setDescription('捐獻資源').addIntegerOption(o => o.setName('amount').setDescription('數量').setRequired(true)))
        .addSubcommand(sub => sub.setName('build').setDescription('建設建築').addStringOption(o => o.setName('building').setRequired(true).setDescription('建築').addChoices({name:'工坊',value:'workshop'},{name:'訓練場',value:'training_ground'},{name:'圖書館',value:'library'},{name:'寶庫',value:'vault'})))
        .addSubcommand(sub => sub.setName('quests').setDescription('查看任務'))
        .addSubcommand(sub => sub.setName('claim').setDescription('領取獎勵').addStringOption(o => o.setName('quest').setRequired(true).setDescription('任務名'))),

    execute: async (interaction) => {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        let data = db.read();

        if (!data.players) data.players = {};
        if (!data.guilds) data.guilds = {};
        if (!data.players[userId]) return interaction.reply('請先開始遊戲！');

        const playerGuild = data.players[userId].guild;

        switch (subcommand) {
            case 'create':
                const gName = interaction.options.getString('name');
                if (playerGuild) return interaction.reply('你已加入公會！');
                if (data.guilds[gName]) return interaction.reply('名稱已被使用！');

                data.guilds[gName] = {
                    leader: userId,
                    members: [userId],
                    level: 1,
                    exp: 0,
                    treasury: 0,
                    created: Date.now(),
                    buildings: { workshop: 0, training_ground: 0, library: 0, vault: 0 },
                    quests: JSON.parse(JSON.stringify(GUILD_QUESTS))
                };
                data.players[userId].guild = gName;
                db.write(data);
                return interaction.reply(`🏰 公會 **${gName}** 創建成功！`);

            case 'join':
                const jName = interaction.options.getString('name');
                if (playerGuild) return interaction.reply('你已在公會中！');
                if (!data.guilds[jName]) return interaction.reply('找不到公會！');

                data.guilds[jName].members.push(userId);
                data.players[userId].guild = jName;
                db.write(data);
                return interaction.reply(`🤝 已加入 **${jName}**！`);

            case 'info':
                if (!playerGuild) return interaction.reply('你沒有公會！');
                const guild = data.guilds[playerGuild];

                // 🛡️ 修復點：防崩潰檢查
                if (!guild) {
                    data.players[userId].guild = null;
                    db.write(data);
                    return interaction.reply('⚠️ 公會資料異常，已重置你的公會狀態。');
                }

                const memberNames = await Promise.all(guild.members.map(async id => {
                    const m = await interaction.guild.members.fetch(id).catch(() => null);
                    return m ? m.displayName : '未知成員';
                }));

                const infoEmbed = new EmbedBuilder()
                    .setTitle(`🏰 ${playerGuild}`)
                    .addFields(
                        { name: '等級', value: `${guild.level || 1}`, inline: true },
                        { name: '金庫', value: `${guild.treasury || 0} 💎`, inline: true },
                        { name: '成員', value: memberNames.join(', ') || '無' }
                    ).setColor(0x3498db);
                return interaction.reply({ embeds: [infoEmbed] });

            case 'donate':
                const amt = interaction.options.getInteger('amount');
                if (!playerGuild || (data.players[userId].entropy_crystal || 0) < amt) return interaction.reply('結晶不足或沒公會！');
                
                data.players[userId].entropy_crystal -= amt;
                data.guilds[playerGuild].treasury += amt;
                data.guilds[playerGuild].exp += amt * 2;
                db.write(data);
                return interaction.reply(`💎 捐獻了 ${amt} 結晶！`);

            case 'build':
                if (!playerGuild || data.guilds[playerGuild].leader !== userId) return interaction.reply('只有會長可建設！');
                const bType = interaction.options.getString('building');
                const gBuild = data.guilds[playerGuild];
                const lv = gBuild.buildings[bType];
                if (lv >= 5) return interaction.reply('已達最高級！');
                
                const cost = GUILD_BUILDINGS[bType].levels[lv].cost;
                if (gBuild.treasury < cost) return interaction.reply(`金庫不足！需要 ${cost} 💎`);

                gBuild.treasury -= cost;
                gBuild.buildings[bType]++;
                db.write(data);
                return interaction.reply(`🏗️ **${GUILD_BUILDINGS[bType].name}** 升級至 Lv.${lv + 1}！`);

            case 'quests':
                if (!playerGuild) return interaction.reply('沒公會！');
                const qEmbed = new EmbedBuilder().setTitle('📋 公會任務').setColor(0x9B59B6);
                Object.values(data.guilds[playerGuild].quests || GUILD_QUESTS).forEach(q => {
                    qEmbed.addFields({ name: q.name, value: `進度: ${q.progress || 0}/${q.target}` });
                });
                return interaction.reply({ embeds: [qEmbed] });

            default:
                return interaction.reply('功能處理中...');
        }
    }
};