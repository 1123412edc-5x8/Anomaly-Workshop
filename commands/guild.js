const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/db');

// --- 建築設定 ---
const GUILD_BUILDINGS = {
    workshop: { name: '工坊', emoji: '⚒️', levels: [{ cost: 1000, boost: 5 }, { cost: 2500, boost: 10 }, { cost: 5000, boost: 15 }, { cost: 10000, boost: 20 }, { cost: 20000, boost: 25 }] },
    training_ground: { name: '訓練場', emoji: '⚔️', levels: [{ cost: 1500, boost: 10 }, { cost: 3000, boost: 20 }, { cost: 6000, boost: 30 }, { cost: 12000, boost: 40 }, { cost: 25000, boost: 50 }] },
    library: { name: '圖書館', emoji: '📖', levels: [{ cost: 2000, boost: 8 }, { cost: 4000, boost: 15 }, { cost: 8000, boost: 25 }, { cost: 16000, boost: 35 }, { cost: 32000, boost: 50 }] },
    vault: { name: '寶庫', emoji: '💰', levels: [{ cost: 3000, boost: 10000 }, { cost: 6000, boost: 25000 }, { cost: 12000, boost: 50000 }, { cost: 24000, boost: 100000 }, { cost: 50000, boost: 250000 }] }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guild')
        .setDescription('公會系統')
        .addSubcommand(sub => sub.setName('create').setDescription('創建公會').addStringOption(o => o.setName('name').setRequired(true).setDescription('公會名稱')))
        .addSubcommand(sub => sub.setName('join').setDescription('加入公會').addStringOption(o => o.setName('name').setRequired(true).setDescription('公會名稱')))
        .addSubcommand(sub => sub.setName('info').setDescription('查看公會資訊'))
        .addSubcommand(sub => sub.setName('donate').setDescription('捐獻資源').addIntegerOption(o => o.setRequired(true).setName('amount').setDescription('捐獻結晶數量')))
        .addSubcommand(sub => sub.setName('build').setDescription('建設公會建築').addStringOption(o => o.setRequired(true).setName('building').setDescription('建築類型').addChoices({name:'工坊',value:'workshop'},{name:'訓練場',value:'training_ground'},{name:'圖書館',value:'library'},{name:'寶庫',value:'vault'})))
        .addSubcommand(sub => sub.setName('quests').setDescription('查看任務')),

    execute: async (interaction) => {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        let data = db.read();

        // 基礎安全性檢查
        if (!data.players[userId]) return interaction.reply('請先開始遊戲！');
        const pGuildName = data.players[userId].guild;

        switch (subcommand) {
            case 'create':
                const newName = interaction.options.getString('name');
                if (pGuildName) return interaction.reply('你已在公會中！');
                
                data.guilds[newName] = { leader: userId, members: [userId], level: 1, exp: 0, treasury: 0, created: Date.now(), buildings: { workshop: 0, training_ground: 0, library: 0, vault: 0 } };
                data.players[userId].guild = newName;
                db.write(data);

                const createEmbed = new EmbedBuilder()
                    .setTitle('🏰 公會立旗成功')
                    .setDescription(`傳奇公會 **${newName}** 宣告成立！`)
                    .setColor(0x00FF00)
                    .addFields({ name: '創始會長', value: interaction.user.username });
                return interaction.reply({ embeds: [createEmbed] });

            case 'info':
                if (!pGuildName) return interaction.reply('你還沒有公會。');
                const guild = data.guilds[pGuildName];
                if (!guild) {
                    data.players[userId].guild = null; db.write(data);
                    return interaction.reply('數據異常，已重置公會狀態。');
                }

                const mList = await Promise.all(guild.members.map(async id => {
                    const m = await interaction.guild.members.fetch(id).catch(() => null);
                    return m ? m.displayName : '未知成員';
                }));

                const infoEmbed = new EmbedBuilder()
                    .setTitle(`🏰 公會資訊 - ${pGuildName}`)
                    .setThumbnail(interaction.guild.iconURL())
                    .setColor(0x3498db)
                    .addFields(
                        { name: '📈 等級', value: `Lv.${guild.level || 1}`, inline: true },
                        { name: '💎 金庫', value: `${guild.treasury || 0}`, inline: true },
                        { name: '👥 成員數', value: `${guild.members.length} 人`, inline: true },
                        { name: '🏗️ 建築等級', value: `工坊: Lv.${guild.buildings.workshop} | 訓練場: Lv.${guild.buildings.training_ground}\n圖書館: Lv.${guild.buildings.library} | 寶庫: Lv.${guild.buildings.vault}` },
                        { name: '📜 成員名單', value: mList.join(', ') }
                    ).setTimestamp();
                return interaction.reply({ embeds: [infoEmbed] });

            case 'build':
                const gBuild = data.guilds[pGuildName];
                if (!gBuild || gBuild.leader !== userId) return interaction.reply('只有會長能發起建設。');
                
                const bType = interaction.options.getString('building');
                const curLv = gBuild.buildings[bType] || 0;
                const bConf = GUILD_BUILDINGS[bType];

                if (curLv >= 5) return interaction.reply('該建築已達到最高等級！');

                const levelData = bConf.levels[curLv];
                if (gBuild.treasury < levelData.cost) {
                    return interaction.reply(`❌ 金庫結晶不足！升級需要 **${levelData.cost}**，目前僅有 **${gBuild.treasury}**。`);
                }

                // 執行扣費與升級
                gBuild.treasury -= levelData.cost;
                gBuild.buildings[bType] += 1;
                db.write(data);

                const buildEmbed = new EmbedBuilder()
                    .setTitle(`${bConf.emoji} 建築升級完成！`)
                    .setColor(0xF1C40F)
                    .setDescription(`公會投入了大量資源，**${bConf.name}** 已順利擴建！`)
                    .addFields(
                        { name: '🏗️ 項目', value: bConf.name, inline: true },
                        { name: '💎 消耗結晶', value: `-${levelData.cost}`, inline: true },
                        { name: '📊 等級變化', value: `Lv.${curLv} ➔ **Lv.${curLv + 1}**`, inline: true },
                        { name: '✨ 獲得加成', value: `加成數值提升至 **+${levelData.boost}${bType === 'vault' ? ' 容量' : '%'}**` }
                    )
                    .setFooter({ text: '公會實力再次提升！' });
                return interaction.reply({ embeds: [buildEmbed] });

            case 'donate':
                const amt = interaction.options.getInteger('amount');
                if (!pGuildName || (data.players[userId].entropy_crystal || 0) < amt) return interaction.reply('結晶不足或沒公會！');

                data.players[userId].entropy_crystal -= amt;
                data.guilds[pGuildName].treasury += amt;
                data.guilds[pGuildName].exp += amt * 2;
                db.write(data);

                const donateEmbed = new EmbedBuilder()
                    .setTitle('💝 感謝捐獻')
                    .setColor(0x1ABC9C)
                    .setDescription(`你捐獻了 **${amt}** 結晶到公會金庫。`)
                    .addFields({ name: '獲得貢獻', value: `公會經驗值 +${amt * 2}` });
                return interaction.reply({ embeds: [donateEmbed] });

            case 'quests':
                const qEmbed = new EmbedBuilder().setTitle('📜 公會當前任務').setColor(0x9B59B6);
                // 這裡簡化顯示，你可以根據需要展開任務細節
                qEmbed.setDescription('目前任務系統正在同步各成員進度中...');
                return interaction.reply({ embeds: [qEmbed] });
        }
    }
};