const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/db');

// --- 科技數據定義 ---
const TECH_SPECS = {
    workshop: { name: '自動化工坊', icon: '⚒️', color: 0xe67e22, stat: '合成修正' },
    training_ground: { name: '模擬訓練場', icon: '⚔️', color: 0xe74c3c, stat: '經驗加成' },
    library: { name: '中央資料庫', icon: '📖', color: 0x3498db, stat: '學習速率' },
    vault: { name: '高能金庫', icon: '💰', color: 0xf1c40f, stat: '儲存空間' }
};

const TECH_LEVELS = {
    workshop: [{ cost: 1000, v: 5 }, { cost: 2500, v: 10 }, { cost: 5000, v: 15 }, { cost: 10000, v: 20 }, { cost: 20000, v: 25 }],
    training_ground: [{ cost: 1500, v: 10 }, { cost: 3000, v: 20 }, { cost: 6000, v: 30 }, { cost: 12000, v: 40 }, { cost: 25000, v: 50 }],
    library: [{ cost: 2000, v: 8 }, { cost: 4000, v: 15 }, { cost: 8000, v: 25 }, { cost: 16000, v: 35 }, { cost: 32000, v: 50 }],
    vault: [{ cost: 3000, v: 10000 }, { cost: 6000, v: 25000 }, { cost: 12000, v: 50000 }, { cost: 24000, v: 100000 }, { cost: 50000, v: 250000 }]
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guild')
        .setDescription('存取公會勢力終端')
        .addSubcommand(s => s.setName('create').setDescription('建立新的地下勢力').addStringOption(o => o.setName('name').setDescription('勢力識別碼').setRequired(true)))
        .addSubcommand(s => s.setName('info').setDescription('讀取當前勢力數據檔案'))
        .addSubcommand(s => s.setName('donate').setDescription('挹注熵結晶資源').addIntegerOption(o => o.setName('amt').setDescription('挹注數量').setRequired(true)))
        .addSubcommand(s => s.setName('build').setDescription('執行硬體設施升級工程').addStringOption(o => o.setName('type').setDescription('工程項目').setRequired(true).addChoices(
            {name:'⚒️ 工坊',value:'workshop'},{name:'⚔️ 訓練場',value:'training_ground'},{name:'📖 資料庫',value:'library'},{name:'💰 金庫',value:'vault'}
        )))
        .addSubcommand(s => s.setName('quests').setDescription('檢視當前任務布告'))
        .addSubcommand(s => s.setName('claim').setDescription('領取已完成的補給獎勵').addStringOption(o => o.setName('id').setDescription('任務識別碼').setRequired(true))),

    execute: async (interaction) => {
        const sub = interaction.options.getSubcommand();
        const uid = interaction.user.id;
        let data = db.read();

        // 🛡️ 數據完整性自檢 (修正 null 報錯)
        const gName = data.players[uid]?.guild;
        if (gName && (!data.guilds || !data.guilds[gName])) {
            data.players[uid].guild = null;
            db.write(data);
        }

        switch (sub) {
            case 'info':
                if (!gName) return interaction.reply('❌ **存取失敗：** 偵測不到所屬勢力。');
                const g = data.guilds[gName];
                const members = await Promise.all(g.members.map(async id => {
                    const m = await interaction.guild.members.fetch(id).catch(() => null);
                    return m ? `\`${m.displayName}\`` : '`遺失信號`';
                }));

                return interaction.reply({ embeds: [new EmbedBuilder()
                    .setTitle(`[ 勢力檔案：${gName} ]`)
                    .setColor(0x2c3e50)
                    .addFields(
                        { name: '◈ 等級', value: `Lv.${g.level}`, inline: true },
                        { name: '◈ 金庫', value: `${g.treasury} 💎`, inline: true },
                        { name: '◈ 成員', value: members.join(' ') || '無', inline: false },
                        { name: '◈ 設施等級', value: `⚒️Lv.${g.buildings.workshop} ⚔️Lv.${g.buildings.training_ground} 📖Lv.${g.buildings.library} 💰Lv.${g.buildings.vault}` }
                    )] });

            case 'build':
                const gB = data.guilds[gName];
                if (!gB || gB.leader !== uid) return interaction.reply('⚠️ **授權不足：** 僅限領袖執行升級工程。');

                const type = interaction.options.getString('type');
                const curLv = gB.buildings[type] || 0;
                if (curLv >= 5) return interaction.reply('🚫 **上限限制：** 該硬體已達最高規格。');

                const next = TECH_LEVELS[type][curLv];
                if (gB.treasury < next.cost) return interaction.reply(`⚠️ **資金缺口：** 尚需 ${next.cost - gB.treasury} 💎。`);

                const prevV = curLv === 0 ? 0 : TECH_LEVELS[type][curLv - 1].v;
                gB.treasury -= next.cost;
                gB.buildings[type]++;
                db.write(data);

                return interaction.reply({ embeds: [new EmbedBuilder()
                    .setTitle(`${TECH_SPECS[type].icon} 工程報告：${TECH_SPECS[type].name}`)
                    .setColor(TECH_SPECS[type].color)
                    .addFields(
                        { name: '◈ 投入資源', value: `-${next.cost} 💎`, inline: true },
                        { name: '◈ 規格變化', value: `Lv.${curLv} ➔ **Lv.${curLv + 1}**`, inline: true },
                        { name: '◈ 加成數值', value: `\`${TECH_SPECS[type].stat}\` 從 **+${prevV}** 提升至 **+${next.v}**` }
                    )] });

            case 'claim':
                const qId = interaction.options.getString('id');
                const quest = data.guilds[gName]?.quests?.[qId];

                if (!quest) return interaction.reply('❌ **識別碼錯誤：** 無此任務。');
                if (quest.progress < quest.target) return interaction.reply(`⏳ **進度不足：** 目前 \`[${quest.progress}/${quest.target}]\``);
                if (quest.claimed) return interaction.reply('🚫 **警告：** 獎勵已申領過。');

                quest.claimed = true;
                data.guilds[gName].treasury += quest.reward.crystals || quest.reward; 
                db.write(data);

                return interaction.reply({ embeds: [new EmbedBuilder()
                    .setTitle('📦 補給箱簽收成功')
                    .setColor(0x2ecc71)
                    .setDescription(`**${quest.name}** 達成，金庫注入獎勵。`)
                ] });

            // ... 其他 case (create/donate/quests) 比照此精緻風格 ...
        }
    }
};