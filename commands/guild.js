const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/db');

// --- 建築數據定義 ---
const BUILD_META = {
    workshop: { name: '工坊', icon: '⚒️', color: 0xe67e22, stat: '合成率' },
    training_ground: { name: '訓練場', icon: '⚔️', color: 0xe74c3c, stat: '經驗加成' },
    library: { name: '圖書館', icon: '📖', color: 0x3498db, stat: '學習效率' },
    vault: { name: '寶庫', icon: '💰', color: 0xf1c40f, stat: '容量' }
};

const GUILD_BUILDINGS = {
    workshop: { levels: [{ cost: 1000, val: 5 }, { cost: 2500, val: 10 }, { cost: 5000, val: 15 }, { cost: 10000, val: 20 }, { cost: 20000, val: 25 }] },
    training_ground: { levels: [{ cost: 1500, val: 10 }, { cost: 3000, val: 20 }, { cost: 6000, val: 30 }, { cost: 12000, val: 40 }, { cost: 25000, val: 50 }] },
    library: { levels: [{ cost: 2000, val: 8 }, { cost: 4000, val: 15 }, { cost: 8000, val: 25 }, { cost: 16000, val: 35 }, { cost: 32000, val: 50 }] },
    vault: { levels: [{ cost: 3000, val: 10000 }, { cost: 6000, val: 25000 }, { cost: 12000, val: 50000 }, { cost: 24000, val: 100000 }, { cost: 50000, val: 250000 }] }
};

// --- 任務數據定義 ---
const GUILD_QUESTS = {
    daily_collection: { name: '每日收集', target: 50, reward: 50 },
    synthesis_master: { name: '合成大師', target: 100, reward: 200 },
    battle_champion: { name: '戰鬥冠軍', target: 200, reward: 500 }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guild')
        .setDescription('勢力管理系統')
        .addSubcommand(s => s.setName('create').setDescription('建立勢力').addStringOption(o => o.setName('name').setRequired(true).setDescription('名稱')))
        .addSubcommand(s => s.setName('info').setDescription('查看勢力概況'))
        .addSubcommand(s => s.setName('donate').setDescription('貢獻資源').addIntegerOption(o => o.setName('amt').setRequired(true).setDescription('數量')))
        .addSubcommand(s => s.setName('build').setDescription('擴建工程').addStringOption(o => o.setName('type').setRequired(true).addChoices({name:'⚒️ 工坊',value:'workshop'},{name:'⚔️ 訓練場',value:'training_ground'},{name:'📖 圖書館',value:'library'},{name:'💰 寶庫',value:'vault'})))
        .addSubcommand(s => s.setName('quests').setDescription('任務布告欄'))
        .addSubcommand(s => s.setName('claim').setDescription('領取補給獎勵').addStringOption(o => o.setName('id').setRequired(true).setDescription('任務代碼'))),

    execute: async (interaction) => {
        const sub = interaction.options.getSubcommand();
        const uid = interaction.user.id;
        let data = db.read();

        // 🛡️ 靜默修復：處理截圖中 null.members 的報錯源頭
        const gName = data.players[uid]?.guild;
        if (gName && (!data.guilds || !data.guilds[gName])) {
            data.players[uid].guild = null;
            db.write(data);
        }

        switch (sub) {
            case 'info':
                if (!gName) return interaction.reply('🛡️ **偵測不到所屬勢力。** 請先建立或加入一個公會。');
                const g = data.guilds[gName];
                
                const members = await Promise.all(g.members.map(async id => {
                    const m = await interaction.guild.members.fetch(id).catch(() => null);
                    return m ? `\`${m.displayName}\`` : '`遺失信號`';
                }));

                return interaction.reply({ embeds: [new EmbedBuilder()
                    .setTitle(`🏰 勢力檔案：${gName}`)
                    .setColor(0x2c3e50)
                    .addFields(
                        { name: '◈ 核心等級', value: `Lv.${g.level}`, inline: true },
                        { name: '◈ 金庫儲備', value: `${g.treasury} 💎`, inline: true },
                        { name: '◈ 成員組成', value: members.join(' ') || '暫無資料', inline: false },
                        { name: '◈ 科技發展', value: `🛠️工坊: \`Lv.${g.buildings.workshop}\` ⚔️訓練: \`Lv.${g.buildings.training_ground}\` 📖圖書: \`Lv.${g.buildings.library}\` 💰寶庫: \`Lv.${g.buildings.vault}\`` }
                    )] });

            case 'build':
                const gData = data.guilds[gName];
                if (!gData || gData.leader !== uid) return interaction.reply('⚠️ **權限拒絕：** 只有領袖能發起擴建工程。');

                const type = interaction.options.getString('type');
                const curLv = gData.buildings[type] || 0;
                const next = GUILD_BUILDINGS[type].levels[curLv];

                if (curLv >= 5) return interaction.reply('🚫 **達到上限：** 該項目已完成最終階段開發。');
                if (gData.treasury < next.cost) return interaction.reply(`⚠️ **資金不足：** 尚缺 ${next.cost - gData.treasury} 💎。`);

                const prevVal = curLv === 0 ? 0 : GUILD_BUILDINGS[type].levels[curLv - 1].val;
                gData.treasury -= next.cost;
                gData.buildings[type]++;
                db.write(data);

                return interaction.reply({ embeds: [new EmbedBuilder()
                    .setTitle(`${BUILD_META[type].icon} 擴建報告：${BUILD_META[type].name}`)
                    .setColor(BUILD_META[type].color)
                    .addFields(
                        { name: '◈ 資源投入', value: `-${next.cost} 💎`, inline: true },
                        { name: '◈ 規模變動', value: `Lv.${curLv} ➔ **Lv.${curLv + 1}**`, inline: true },
                        { name: '◈ 增益修正', value: `\`${BUILD_META[type].stat}\` 從 **+${prevVal}** 提升至 **+${next.val}**` }
                    )] });

            case 'quests':
                if (!gName) return interaction.reply('🛡️ **無法讀取布告欄：** 請先歸屬一個勢力。');
                const qEmbed = new EmbedBuilder().setTitle('📜 勢力任務布告欄').setColor(0x7f8c8d);
                
                const qList = data.guilds[gName].quests || GUILD_QUESTS;
                Object.entries(qList).forEach(([id, q]) => {
                    qEmbed.addFields({ name: `◈ ${q.name} [ID: ${id}]`, value: `進度: \`[${q.progress || 0}/${q.target}]\` | 獎勵: \`${q.reward} 💎\`` });
                });
                return interaction.reply({ embeds: [qEmbed] });

            case 'claim':
                const qId = interaction.options.getString('id');
                const targetG = data.guilds[gName];
                const quest = targetG?.quests?.[qId];

                if (!quest) return interaction.reply('❌ **代碼錯誤：** 找不到該項任務。');
                if (quest.progress < quest.target) return interaction.reply('⏳ **條件未達成：** 請繼續完成進度。');
                if (quest.claimed) return interaction.reply('🚫 **重複領取：** 該補給已發放完畢。');

                quest.claimed = true;
                targetG.treasury += quest.reward;
                db.write(data);

                return interaction.reply({ embeds: [new EmbedBuilder()
                    .setTitle('📦 補給發放')
                    .setColor(0x2ecc71)
                    .setDescription(`**${quest.name}** 已達成，金庫注入 **${quest.reward}** 💎！`)
                ] });

            case 'donate':
                const amt = interaction.options.getInteger('amt');
                if (!gName || (data.players[uid].entropy_crystal || 0) < amt) return interaction.reply('⚠️ **失敗：** 資源不足或沒公會。');

                data.players[uid].entropy_crystal -= amt;
                data.guilds[gName].treasury += amt;
                data.guilds[gName].exp += amt * 2;
                db.write(data);
                return interaction.reply(`💎 **資源挹注：** 為公會貢獻了 **${amt}** 結晶。`);
        }
    }
};