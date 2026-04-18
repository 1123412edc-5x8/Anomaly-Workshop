const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ComponentType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('顯示異常工坊指令指南')
        .addStringOption(option =>
            option.setName('page')
                .setDescription('要查看的頁面')
                .setRequired(false)
                .addChoices(
                    { name: '基本指令', value: 'basic' },
                    { name: 'RPG系統', value: 'rpg' },
                    { name: '競技娛樂', value: 'arena' },
                    { name: '社群經濟', value: 'social' },
                    { name: '其他指令', value: 'other' }
                )),
    async execute(interaction) {
        const page = interaction.options.getString('page') || 'main';

        if (page === 'main') {
            // 主頁面 - 指令總覽
            const embed = new EmbedBuilder()
                .setTitle('🛠️ 異常工坊：指令指南')
                .setColor(0x00FFCC)
                .setDescription('歡迎來到異常工坊！使用 `/help [頁面]` 查看詳細說明\n\n**🎮 全新RPG體驗！** 現在支援裝備、技能、寵物、公會等系統！')
                .addFields(
                    { name: '🎮 基本指令', value: '`/bag` - 查看背包\n`/map [地區]` - 移動地區\n`/scavenge` - 拾荒零件\n`/decompose` - 分解物品\n`/combine` - 合成物品\n`/recipes` - 查看合成表', inline: true },
                    { name: '⚔️ RPG系統', value: '`/equipment` - 裝備系統\n`/skill` - 技能升級\n`/pet` - 寵物系統\n`/guild` - 公會系統\n`/battle` - 戰鬥系統\n`/quest` - 任務列表', inline: true },
                    { name: '🏟️ 競技娛樂', value: '`/arena` - 競技場\n`/dungeon` - 地下城探險\n`/season` - 季節活動\n`/event` - 當前事件\n`/shop` - 黑市商店\n`/market` - 動態市場', inline: true },
                    { name: '📊 社群經濟', value: '`/trade` - 玩家交易\n`/rank` - 排行榜\n`/social` - 社交系統\n`/achievement` - 成就系統\n`/progress` - 進度追蹤\n`/codex` - 物品圖鑑', inline: true }
                )
                .setFooter({ text: '使用 /help [頁面] 查看詳細用法 | 例如: /help page:rpg' });

            const select = new StringSelectMenuBuilder()
                .setCustomId('help_select')
                .setPlaceholder('選擇要查看的指令類別...')
                .addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('基本指令')
                        .setDescription('背包、地圖、拾荒、維修、合成等')
                        .setValue('basic')
                        .setEmoji('🎮'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('RPG系統')
                        .setDescription('裝備、技能、寵物、公會、戰鬥等')
                        .setValue('rpg')
                        .setEmoji('⚔️'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('競技娛樂')
                        .setDescription('競技場、地下城、季節活動等')
                        .setValue('arena')
                        .setEmoji('🏟️'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('社群經濟')
                        .setDescription('交易、排行榜、社交、成就等')
                        .setValue('social')
                        .setEmoji('📊'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('其他指令')
                        .setDescription('每日任務、圖鑑、事件、管理等')
                        .setValue('other')
                        .setEmoji('🔧')
                );

            const row = new ActionRowBuilder().addComponents(select);

            const response = await interaction.reply({ embeds: [embed], components: [row] });

            const collector = response.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                time: 60000
            });

            collector.on('collect', async (i) => {
                if (i.user.id !== interaction.user.id) return i.reply({ content: '這不是你的幫助菜單', ephemeral: true });

                const selectedValue = i.values[0];
                let helpEmbed;
                if (selectedValue === 'basic') {
                    helpEmbed = createBasicHelpEmbed();
                } else if (selectedValue === 'rpg') {
                    helpEmbed = createRPGHelpEmbed();
                } else if (selectedValue === 'arena') {
                    helpEmbed = createArenaHelpEmbed();
                } else if (selectedValue === 'social') {
                    helpEmbed = createSocialHelpEmbed();
                } else if (selectedValue === 'other') {
                    helpEmbed = createOtherHelpEmbed();
                }

                await i.update({ embeds: [helpEmbed], components: [row] });
            });

            // 詳細頁面
            let detailEmbed;
            if (page === 'basic') {
                detailEmbed = createBasicHelpEmbed();
            } else if (page === 'rpg') {
                detailEmbed = createRPGHelpEmbed();
            } else if (page === 'arena') {
                detailEmbed = createArenaHelpEmbed();
            } else if (page === 'social') {
                detailEmbed = createSocialHelpEmbed();
            } else if (page === 'other') {
                detailEmbed = createOtherHelpEmbed();
            } else {
                detailEmbed = new EmbedBuilder()
                    .setTitle('❌ 無效頁面')
                    .setColor(0xFF0000)
                    .setDescription('請選擇有效的頁面：basic, rpg, arena, social, other');
            }
            
            return interaction.reply({ embeds: [detailEmbed], components: [row] });
        }
    }
};

function createBasicHelpEmbed() {
    return new EmbedBuilder()
        .setTitle('🎮 基本指令詳解')
        .setColor(0x3498db)
        .addFields(
            {
                name: '🎒 /bag',
                value: '**查看背包**\n顯示所有物品的耐久度和熵值狀態\n**用法：** `/bag`'
            },
            {
                name: '📍 /map [地區]',
                value: '**移動地區**\n前往不同區域尋找不同物品\n**可用地區：** 工廠、荒野、實驗室\n**用法：** `/map 荒野`'
            },
            {
                name: '🔍 /scavenge',
                value: '**拾荒零件**\n在當前地區尋找隨機零件\n**用法：** `/scavenge`'
            },
            {
                name: '🌀 /combine',
                value: '**合成物品**\n顯示可用的合成配方供選擇\n可選擇合成次數\n**用法：** `/combine`'
            },
            {
                name: '🔨 /decompose',
                value: '**分解物品**\n顯示背包物品列表供選擇\n可單個或批量分解\n**用法：** `/decompose`'
            },
            {
                name: '📋 /recipes',
                value: '**查看合成表**\n顯示所有可用的合成配方\n**用法：** `/recipes`'
            }
        );
}

function createRPGHelpEmbed() {
    return new EmbedBuilder()
        .setTitle('⚔️ RPG系統詳解')
        .setColor(0xe74c3c)
        .addFields(
            {
                name: '🎯 /equipment [動作]',
                value: '**裝備系統**\n管理武器、防具、飾品\n**子命令：**\n`/equipment equip [物品]` - 裝備物品\n`/equipment unequip [欄位]` - 卸下裝備\n`/equipment info` - 查看裝備資訊\n**效果：** 提升攻擊、防禦、生命值等屬性'
            },
            {
                name: '🧠 /skill [動作]',
                value: '**技能系統**\n升級角色技能獲得被動加成\n**子命令：**\n`/skill info` - 查看技能狀態\n`/skill upgrade [技能]` - 升級技能\n**技能：** 戰鬥精通、拾荒大師、合成專家、熵值控制'
            },
            {
                name: '🐾 /pet [動作]',
                value: '**寵物系統**\n領養和培養寵物夥伴\n**子命令：**\n`/pet adopt [寵物]` - 領養寵物\n`/pet info` - 查看寵物狀態\n`/pet feed [數量]` - 餵食寵物\n`/pet evolve` - 寵物進化\n**寵物：** 廢鐵收集者、異常探測器、戰鬥無人機、合成助手'
            },
            {
                name: '🏰 /guild [動作]',
                value: '**公會系統**\n加入或創建公會與其他玩家合作\n**子命令：**\n`/guild create [名稱]` - 創建公會\n`/guild join [名稱]` - 加入公會\n`/guild info` - 查看公會資訊\n`/guild donate [數量]` - 捐獻資源\n**效果：** 公會經驗和等級加成'
            },
            {
                name: '⚔️ /battle',
                value: '**戰鬥系統**\n遭遇隨機敵人進行戰鬥\n**用法：** `/battle`\n**獲得：** 經驗值、熵結晶、稀有物品\n**戰鬥：** 攻擊、防禦、逃跑'
            },
            {
                name: '📋 /quest',
                value: '**任務系統**\n查看和完成各類任務\n**用法：** `/quest`\n**任務類型：** 初心者考驗、維修大師、完美合成等\n**獎勵：** 經驗值和特殊物品'
            }
        );
}

function createArenaHelpEmbed() {
    return new EmbedBuilder()
        .setTitle('🏟️ 競技娛樂詳解')
        .setColor(0xf39c12)
        .addFields(
            {
                name: '🏆 /arena [動作]',
                value: '**競技場系統**\n與其他玩家進行 PvP 戰鬥\n**子命令：**\n`/arena enter` - 進入競技場\n`/arena rankings` - 查看排行榜\n`/arena challenge [@玩家]` - 挑戰玩家\n**評分系統：** ELO 評分制'
            },
            {
                name: '🏰 /dungeon [動作]',
                value: '**地下城探險**\n挑戰多層次地下城副本\n**子命令：**\n`/dungeon list` - 查看可用地下城\n`/dungeon enter [地下城]` - 進入地下城\n`/dungeon status` - 查看探險進度\n**難度：** 簡單、中等、困難'
            },
            {
                name: '🌸 /season [動作]',
                value: '**季節活動**\n參與季節限定活動獲取獎勵\n**子命令：**\n`/season info` - 查看季節資訊\n`/season events` - 查看季節活動\n`/season claim` - 領取季節獎勵\n**季節：** 春、夏、秋、冬'
            },
            {
                name: '🎉 /event',
                value: '**當前事件**\n查看全伺服器運行中的特殊事件\n**用法：** `/event`\n**內容：** 事件加成、特殊獎勵、限時挑戰\n**更新：** 動態變化'
            },
            {
                name: '🏪 /shop',
                value: '**黑市商店**\n購買稀有物品和升級道具\n**用法：** `/shop`\n**物品：** 特殊工具、穩定劑、擴展模組等\n**貨幣：** 熵結晶'
            },
            {
                name: '📊 /market [動作]',
                value: '**動態市場**\n玩家驅動的經濟系統\n**子命令：**\n`/market prices` - 查看市場價格\n`/market sell [物品] [數量]` - 出售物品\n`/market buy [物品] [數量]` - 購買物品\n**特點：** 供需影響價格'
            }
        );
}

function createSocialHelpEmbed() {
    return new EmbedBuilder()
        .setTitle('📊 社群經濟詳解')
        .setColor(0x2ecc71)
        .addFields(
            {
                name: '💱 /trade [子命令]',
                value: '**玩家交易**\n與其他玩家交換物品\n**子命令：**\n`/trade list` - 列出你的物品\n`/trade request @玩家 編號1 @玩家 編號2` - 發起交易\n`/trade pending` - 查看待處理請求\n`/trade history` - 交易歷史記錄\n**特點：** 安全的物品交換系統'
            },
            {
                name: '🏆 /rank',
                value: '**排行榜**\n查看各項全球排行榜\n**用法：** `/rank`\n**排行類型：** 等級、經驗、藏品數量、熵值控制等\n**更新：** 即時更新排名'
            },
            {
                name: '👥 /social [動作]',
                value: '**社交系統**\n好友和玩家互動功能\n**子命令：**\n`/social friends [動作]` - 好友管理\n`/social profile [@玩家]` - 查看玩家資料\n**功能：** 好友邀請、玩家資料、互動統計'
            },
            {
                name: '🏅 /achievement',
                value: '**成就系統**\n查看已解鎖的成就\n**用法：** `/achievement`\n**成就類型：** 初心者、收藏家、戰士、工匠等\n**獎勵：** 特殊稱號和稀有物品'
            },
            {
                name: '📈 /progress',
                value: '**進度追蹤**\n查看個人遊戲統計\n**用法：** `/progress`\n**統計：** 等級、經驗、拾荒次數、戰鬥勝利等\n**別名：** `/進度`'
            },
            {
                name: '📖 /codex',
                value: '**物品圖鑑**\n查看所有可收集物品\n**用法：** `/codex`\n**資訊：** 稀有度、地區分布、收集狀態\n**功能：** 物品詳細資訊和收集進度'
            }
        );
}

function createOtherHelpEmbed() {
    return new EmbedBuilder()
        .setTitle('🔧 其他指令詳解')
        .setColor(0xe67e22)
        .addFields(
            {
                name: '📅 /daily',
                value: '**每日任務**\n查看和完成每日挑戰\n**用法：** `/daily`\n**獎勵：** 經驗值和熵結晶\n**重置：** 每天 UTC 00:00'
            },
            {
                name: '🛠️ /help [頁面]',
                value: '**幫助系統**\n查看指令詳細說明\n**用法：**\n`/help` - 主頁面\n`/help basic` - 基本指令詳解\n`/help rpg` - RPG系統詳解\n`/help arena` - 競技娛樂詳解\n`/help social` - 社群經濟詳解\n**別名：** `/h`, `/幫助`'
            },
            {
                name: '🎁 /redeem [代碼]',
                value: '**兌換代碼**\n使用兌換碼獲取獎勵\n**用法：** `/redeem ABC123`\n**來源：** 官方活動、獎勵、特別活動\n**獎勵：** 稀有物品、熵結晶、特殊道具'
            },
            {
                name: '⚙️ /admin [子命令]',
                value: '**管理員指令**\n管理員專用功能\n**用法：** `/admin`\n**權限：** 僅限管理員\n**功能：** 系統管理、玩家數據調整等'
            },
            {
                name: '📝 文字指令支援',
                value: '**雙模式支援**\n所有指令都支援斜線和文字模式\n**文字前綴：** `~`\n**範例：**\n`~bag` 等同於 `/bag`\n`~scavenge` 等同於 `/scavenge`\n**參數：** 自動解析文字參數為選項'
            },
            {
                name: '🎮 遊戲特色',
                value: '**異常工坊特色**\n• 熵值系統：物品會隨時間劣化\n• 地區差異：不同地區有不同物品\n• 合成系統：組合物品創造新道具\n• 事件系統：隨機事件影響遊戲\n• 經濟系統：動態價格和玩家交易\n• RPG進化：裝備、技能、寵物、公會系統'
            }
        );
}