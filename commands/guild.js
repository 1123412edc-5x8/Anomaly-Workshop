const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/db');

// --- 保持你原本的建築與任務設定 ---
const GUILD_BUILDINGS = {
    workshop: { name: '工坊', description: '提升成員的合成成功率', levels: [{ cost: 1000, effect: { synthesis_boost: 5 } }, { cost: 2500, effect: { synthesis_boost: 10 } }, { cost: 5000, effect: { synthesis_boost: 15 } }, { cost: 10000, effect: { synthesis_boost: 20 } }, { cost: 20000, effect: { synthesis_boost: 25 } }] },
    training_ground: { name: '訓練場', description: '提升成員的戰鬥經驗獲取', levels: [{ cost: 1500, effect: { exp_boost: 10 } }, { cost: 3000, effect: { exp_boost: 20 } }, { cost: 6000, effect: { exp_boost: 30 } }, { cost: 12000, effect: { exp_boost: 40 } }, { cost: 25000, effect: { exp_boost: 50 } }] },
    library: { name: '圖書館', description: '提升成員的技能學習效率', levels: [{ cost: 2000, effect: { skill_boost: 8 } }, { cost: 4000, effect: { skill_boost: 15 } }, { cost: 8000, effect: { skill_boost: 25 } }, { cost: 16000, effect: { skill_boost: 35 } }, { cost: 32000, effect: { skill_boost: 50 } }] },
    vault: { name: '寶庫', description: '增加金庫容量和利息', levels: [{ cost: 3000, effect: { treasury_capacity: 10000, interest: 2 } }, { cost: 6000, effect: { treasury_capacity: 25000, interest: 3 } }, { cost: 12000, effect: { treasury_capacity: 50000, interest: 4 } }, { cost: 24000, effect: { treasury_capacity: 100000, interest: 5 } }, { cost: 50000, effect: { treasury_capacity: 250000, interest: 7 } }] }
};

const GUILD_QUESTS = {
    daily_collection: { name: '每日收集', description: '全體成員今日拾荒次數達到50次', reward: { exp: 100, crystals: 50 }, progress: 0, target: 50, type: 'daily' },
    synthesis_master: { name: '合成大師', description: '公會本週合成物品數量達到100個', reward: { exp: 500, crystals: 200 }, progress: 0, target: 100, type: 'weekly' },
    battle_champion: { name: '戰鬥冠軍', description: '公會成員本月戰鬥勝利次數達到200次', reward: { exp: 1000, crystals: 500 }, progress: 0, target: 200, type: 'monthly' },
    treasury_growth: { name: '金庫成長', description: '公會金庫累積達到5000結晶', reward: { exp: 300, crystals: 100 }, progress: 0, target: 5000, type: 'achievement' }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guild')
        .setDescription('公會系統')
        .addSubcommand(sub => sub.setName('create').setDescription('創建公會').addStringOption(o => o.setName('name').setDescription('公會名稱').setRequired(true)))
        .addSubcommand(sub => sub.setName('join').setDescription('加入公會').addStringOption(o => o.setName('name').setDescription('公會名稱').setRequired(true)))
        .addSubcommand(sub => sub.setName('info').setDescription('查看公會資訊'))
        .addSubcommand(sub => sub.setName('donate').setDescription('捐獻資源').addIntegerOption(o => o.setName('amount').setDescription('捐獻數量').setRequired(true)))
        .addSubcommand(sub => sub.setName('build').setDescription('建設公會建築').addStringOption(o => o.setName('building').setDescription('建築類型').setRequired(true).addChoices({ name: '工坊', value: 'workshop' }, { name: '訓練場', value: 'training_ground' }, { name: '圖書館', value: 'library' }, { name: '寶庫', value: 'vault' })))
        .addSubcommand(sub => sub.setName('quests').setDescription('查看公會任務'))
        .addSubcommand(sub => sub.setName('claim').setDescription('領取公會任務獎勵').addStringOption(o => o.setName('quest').setDescription('任務名稱').setRequired(true))),

    execute: async (interaction) => {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        let data = db.read();

        if (!data.players) data.players = {};
        if (!data.players[userId]) return interaction.reply({ content: '請先開始遊戲！', ephemeral: true });
        if (!data.guilds) data.guilds = {};

        switch (subcommand) {
            case 'create':
                const guildName = interaction.options.getString('name');
                if (data.players[userId].guild) return interaction.reply({ content: '你已經加入公會了！', ephemeral: true });
                if (data.guilds[guildName]) return interaction.reply({ content: '公會名稱已存在！', ephemeral: true });

                data.guilds[guildName] = {
                    leader: userId,
                    members: [userId],
                    level: 1,
                    exp: 0,
                    treasury: 0,
                    created: Date.now(),
                    buildings: { workshop: 0, training_ground: 0, library: 0, vault: 0 },
                    quests: JSON.parse(JSON.stringify(GUILD_QUESTS))
                };
                data.players[userId].guild = guildName;
                db.write(data);
                return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🏰 創建成功').setDescription(`公會 **${guildName}** 已創建！`).setColor(0x00FF00)] });

            case 'join':
                const joinName = interaction.options.getString('name');
                if (data.players[userId].guild) return interaction.reply({ content: '你已經加入公會了！', ephemeral: true });
                if (!data.guilds[joinName]) return interaction.reply({ content: '公會不存在！', ephemeral: true });

                data.guilds[joinName].members.push(userId);
                data.players[userId].guild = joinName;
                db.write(data);
                return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🤝 加入成功').setDescription(`歡迎加入 **${joinName}**！`).setColor(0x00FF00)] });

            case 'info':
                const playerGuild = data.players[userId].guild;
                if (!playerGuild) return interaction.reply({ content: '你還沒有加入公會！', ephemeral: true });

                const guild = data.guilds[playerGuild];
                // 🛡️ 修復點：如果資料庫裡找不到該公會名稱，回傳錯誤而不是閃退
                if (!guild) return interaction.reply({ content: `❌ 錯誤：找不到公會「${playerGuild}」的資料。請嘗試重新加入或聯繫管理員。`, ephemeral: true });

                // 🛡️ 修復點：確保 members 是陣列
                const membersList = Array.isArray(guild.members) ? guild.members : [];
                const memberNames = await Promise.all(membersList.map(async id => {
                    const m = await interaction.guild.members.fetch(id).catch(() => null);
                    return m ? m.displayName : '未知成員';
                }));

                const infoEmbed = new EmbedBuilder()
                    .setTitle(`🏰 ${playerGuild}`)
                    .setColor(0x3498db)
                    .addFields(
                        { name: '等級', value: (guild.level || 1).toString(), inline: true },
                        { name: '經驗值', value: (guild.exp || 0).toString(), inline: true },
                        { name: '金庫', value: `${guild.treasury || 0} 💎`, inline: true },
                        { name: '成員數', value: membersList.length.toString(), inline: true },
                        { name: '會長', value: (await interaction.guild.members.fetch(guild.leader).catch(() => ({ displayName: '未知' }))).displayName, inline: true },
                        { name: '創建時間', value: `<t:${Math.floor((guild.created || Date.now()) / 1000)}:F>`, inline: true },
                        { name: '成員列表', value: memberNames.join(', ') || '無成員', inline: false }
                    );
                return interaction.reply({ embeds: [infoEmbed] });

            case 'donate':
                const amount = interaction.options.getInteger('amount');
                const dName = data.players[userId].guild;
                if (!dName || !data.guilds[dName]) return interaction.reply({ content: '公會狀態異常！', ephemeral: true });

                if (data.players[userId].entropy_crystal < amount) return interaction.reply({ content: '你的熵結晶不足！', ephemeral: true });

                data.players[userId].entropy_crystal -= amount;
                data.guilds[dName].treasury += amount;
                data.guilds[dName].exp += amount * 2;
                
                // 升級檢查
                if (data.guilds[dName].exp >= data.guilds[dName].level * 1000) {
                    data.guilds[dName].level++;
                    data.guilds[dName].exp = 0;
                }
                db.write(data);
                return interaction.reply(`💝 捐獻成功！公會金庫增加了 ${amount} 💎`);

            case 'build':
                const bName = data.players[userId].guild;
                const bData = data.guilds[bName];
                if (!bData || bData.leader !== userId) return interaction.reply({ content: '權限不足或公會異常！', ephemeral: true });

                const bType = interaction.options.getString('building');
                const curLv = bData.buildings?.[bType] || 0;
                const bConf = GUILD_BUILDINGS[bType];

                if (curLv >= 5) return interaction.reply({ content: '該建築已達最高級！', ephemeral: true });
                if (bData.treasury < bConf.levels[curLv].cost) return interaction.reply({ content: '金庫資源不足！', ephemeral: true });

                bData.treasury -= bConf.levels[curLv].cost;
                if (!bData.buildings) bData.buildings = {};
                bData.buildings[bType] = curLv + 1;
                db.write(data);
                return interaction.reply(`🏗️ **${bConf.name}** 已升級至 Lv.${curLv + 1}！`);

            case 'quests':
                const qName = data.players[userId].guild;
                const qData = data.guilds[qName];
                if (!qData) return interaction.reply({ content: '找不到公會資料。', ephemeral: true });

                const qEmbed = new EmbedBuilder().setTitle(`📋 ${qName} 任務`).setColor(0x9B59B6);
                Object.entries(qData.quests || GUILD_QUESTS).forEach(([key, q]) => {
                    qEmbed.addFields({ name: q.name, value: `進度: ${q.progress || 0}/${q.target}\n獎勵: ${q.reward.crystals} 💎` });
                });
                return interaction.reply({ embeds: [qEmbed] });

            case 'claim':
                return interaction.reply('獎勵領取功能開發中。');
        }
    }
};