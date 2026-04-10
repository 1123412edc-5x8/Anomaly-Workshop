// 處理幫助菜單選擇
async function handleHelpSelect(interaction) {
    const selectedValue = interaction.values[0];
    const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ComponentType } = require('discord.js');

    // 這裡可以添加更詳細的幫助內容邏輯
    // 或者直接更新現有選擇菜單以支持頁面導航

    const createBasicHelpEmbed = () => {
        return new EmbedBuilder()
            .setTitle('🎮 基本指令詳解')
            .setColor(0x3498db)
            .addFields(
                { name: '🎒 /bag', value: '查看背包\n**用法：** `/bag`' },
                { name: '📍 /map [地區]', value: '移動地區\n**用法：** `/map 荒野`' },
                { name: '🔍 /scavenge', value: '拾荒零件\n**用法：** `/scavenge`' },
                { name: '🌀 /combine', value: '合成物品\n**用法：** `/combine`' },
                { name: '🔨 /decompose', value: '分解物品\n**用法：** `/decompose`' },
                { name: '📋 /recipes', value: '查看合成表\n**用法：** `/recipes`' }
            );
    };

    const createAdvancedHelpEmbed = () => {
        return new EmbedBuilder()
            .setTitle('⚔️ 進階系統詳解')
            .setColor(0xe74c3c)
            .addFields(
                { name: '⚔️ /battle', value: '戰鬥系統\n**用法：** `/battle`' },
                { name: '📋 /quest', value: '任務系統\n**用法：** `/quest`' },
                { name: '🏪 /shop', value: '黑市商店\n**用法：** `/shop`' },
                { name: '💱 /trade', value: '玩家交易\n**用法：** `/trade`' },
                { name: '📈 /progress', value: '進度追蹤\n**用法：** `/progress`' }
            );
    };

    const createSocialHelpEmbed = () => {
        return new EmbedBuilder()
            .setTitle('📊 社群功能詳解')
            .setColor(0x2ecc71)
            .addFields(
                { name: '🏆 /rank', value: '排行榜\n**用法：** `/rank`' },
                { name: '🏅 /achievement', value: '成就系統\n**用法：** `/achievement`' },
                { name: '🛠️ /help', value: '幫助系統\n**用法：** `/help`' }
            );
    };

    const createOtherHelpEmbed = () => {
        return new EmbedBuilder()
            .setTitle('🔧 其他指令詳解')
            .setColor(0xe67e22)
            .addFields(
                { name: '📅 /daily', value: '每日任務\n**用法：** `/daily`' },
                { name: '📖 /codex', value: '物品圖鑑\n**用法：** `/codex`' },
                { name: '🎉 /event', value: '當前事件\n**用法：** `/event`' },
                { name: '🎁 /redeem [代碼]', value: '兌換代碼\n**用法：** `/redeem ABC123`' },
                { name: '⚙️ /admin', value: '管理員指令\n**用法：** `/admin`' }
            );
    };

    let helpEmbed;
    switch (selectedValue) {
        case 'basic':
            helpEmbed = createBasicHelpEmbed();
            break;
        case 'advanced':
            helpEmbed = createAdvancedHelpEmbed();
            break;
        case 'social':
            helpEmbed = createSocialHelpEmbed();
            break;
        case 'other':
            helpEmbed = createOtherHelpEmbed();
            break;
        default:
            return;
    }

    // 重新創建選擇菜單
    const select = new StringSelectMenuBuilder()
        .setCustomId('help_select')
        .setPlaceholder('選擇要查看的指令類別...')
        .addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel('基本指令')
                .setDescription('背包、地圖、拾荒、合成等')
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
    await interaction.update({ embeds: [helpEmbed], components: [row] });
}

module.exports = {
    execute: handleHelpSelect
};