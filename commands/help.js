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
                    { name: '進階系統', value: 'advanced' },
                    { name: '社群功能', value: 'social' },
                    { name: '其他指令', value: 'other' }
                )),
    async execute(interaction) {
        const page = interaction.options.getString('page') || 'main';

        if (page === 'main') {
            // 主頁面 - 指令總覽
            const embed = new EmbedBuilder()
                .setTitle('🛠️ 異常工坊：指令指南')
                .setColor(0x00FFCC)
                .setDescription('歡迎來到異常工坊！使用 `/help [頁面]` 查看詳細說明')
                .addFields(
                    { name: '🎮 基本指令', value: '`/bag` - 查看背包\n`/map [地區]` - 移動地區\n`/scavenge` - 拾荒零件\n`/decompose` - 分解物品\n`/combine` - 合成物品\n`/recipes` - 查看合成表', inline: true },
                    { name: '⚔️ 進階系統', value: '`/battle` - 戰鬥系統\n`/quest` - 任務列表\n`/shop` - 黑市商店\n`/trade` - 玩家交易\n`/progress` - 進度追蹤', inline: true },
                    { name: '📊 社群功能', value: '`/rank` - 排行榜\n`/achievement` - 成就系統\n`/help` - 幫助系統\n`/daily` - 每日任務\n`/codex` - 物品圖鑑\n`/event` - 當前事件\n`/redeem [代碼]` - 兌換代碼', inline: true }
                )
                .setFooter({ text: '使用 /help [頁面] 查看詳細用法 | 例如: /help page:basic' });

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
                        .setLabel('進階系統')
                        .setDescription('戰鬥、任務、商店、交易等')
                        .setValue('advanced')
                        .setEmoji('⚔️'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('社群功能')
                        .setDescription('排行榜、成就、幫助系統等')
                        .setValue('social')
                        .setEmoji('📊'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('其他指令')
                        .setDescription('每日任務、圖鑑、事件等')
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
                } else if (selectedValue === 'advanced') {
                    helpEmbed = createAdvancedHelpEmbed();
                } else if (selectedValue === 'social') {
                    helpEmbed = createSocialHelpEmbed();
                } else if (selectedValue === 'other') {
                    helpEmbed = createOtherHelpEmbed();
                }

                await i.update({ embeds: [helpEmbed], components: [row] });
            });

        } else {
            // 詳細頁面
            let detailEmbed;
            if (page === 'basic') {
                detailEmbed = createBasicHelpEmbed();
            } else if (page === 'advanced') {
                detailEmbed = createAdvancedHelpEmbed();
            } else if (page === 'social') {
                detailEmbed = createSocialHelpEmbed();
            } else if (page === 'other') {
                detailEmbed = createOtherHelpEmbed();
            } else {
                detailEmbed = new EmbedBuilder()
                    .setTitle('❌ 無效頁面')
                    .setColor(0xFF0000)
                    .setDescription('請選擇有效的頁面：basic, advanced, social, other');
            }
            await interaction.reply({ embeds: [detailEmbed] });
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

function createAdvancedHelpEmbed() {
    return new EmbedBuilder()
        .setTitle('⚔️ 進階系統詳解')
        .setColor(0xe74c3c)
        .addFields(
            {
                name: '⚔️ /battle',
                value: '**戰鬥系統**\n遭遇隨機敵人，攻擊、防禦或逃跑\n**用法：** `/battle`\n**獲得：** 經驗值和熵結晶'
            },
            {
                name: '📋 /quest',
                value: '**任務系統**\n查看可完成的任務和進度\n**用法：** `/quest`\n**別名：** `/q`, `/任務`'
            },
            {
                name: '🏪 /shop',
                value: '**黑市商店**\n購買增強道具和稀有物品\n**用法：** `/shop`\n**貨幣：** 熵結晶'
            },
            {
                name: '💱 /trade [子命令]',
                value: '**玩家交易**\n與其他玩家交換物品\n**子命令：**\n`/trade list` - 列出物品\n`/trade request @玩家 編號1 @玩家 編號2` - 發起交易\n`/trade pending` - 查看請求\n`/trade accept ID` - 接受交易\n`/trade reject ID` - 拒絕交易\n`/trade history` - 交易歷史'
            },
            {
                name: '📈 /progress',
                value: '**進度追蹤**\n查看等級、經驗和統計數據\n**用法：** `/progress`\n**別名：** `/進度`'
            }
        );
}

function createSocialHelpEmbed() {
    return new EmbedBuilder()
        .setTitle('📊 社群功能詳解')
        .setColor(0x2ecc71)
        .addFields(
            {
                name: '🏆 /rank',
                value: '**排行榜**\n查看各項全球排行\n**用法：** `/rank`\n**排行：** 等級、經驗、藏品、熵值控制'
            },
            {
                name: '🏅 /achievement',
                value: '**成就系統**\n查看已解鎖的成就\n**用法：** `/achievement`\n**別名：** `/ach`, `/成就`'
            },
            {
                name: '🛠️ /help [頁面]',
                value: '**幫助系統**\n查看指令詳細說明\n**用法：**\n`/help` - 主頁面\n`/help basic` - 基本指令詳解\n`/help advanced` - 進階系統詳解\n**別名：** `/h`, `/幫助`'
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
                value: '**每日任務**\n查看和完成每日挑戰\n**用法：** `/daily`\n**獎勵：** 經驗值和熵結晶'
            },
            {
                name: '📖 /codex',
                value: '**物品圖鑑**\n查看所有可收集物品\n**用法：** `/codex`\n**顯示：** 稀有度、地區、收集狀態'
            },
            {
                name: '🎉 /event',
                value: '**當前事件**\n查看活躍的遊戲事件\n**用法：** `/event`\n**效果：** 增幅拾荒和戰鬥'
            },
            {
                name: '🎁 /redeem [代碼]',
                value: '**兌換代碼**\n使用兌換碼獲取獎勵\n**用法：** `/redeem ABC123`\n**來源：** 官方活動或獎勵'
            },
            {
                name: '⚙️ /admin [子命令]',
                value: '**管理員指令**\n管理員專用功能\n**用法：** `/admin`\n**權限：** 僅限管理員'
            }
        );
}