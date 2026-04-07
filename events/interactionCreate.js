module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isStringSelectMenu()) return;

        const { customId } = interaction;

        try {
            // 根據 ID 分流處理邏輯
            if (customId === 'shop_select') {
                const shopHandler = require('../interactions/shopHandler');
                await shopHandler.execute(interaction);
            } 
            else if (customId === 'map_select') {
                const mapHandler = require('../interactions/mapHandler');
                await mapHandler.execute(interaction);
            }
        } catch (error) {
            console.error('互動處理出錯:', error);
            await interaction.reply({ content: '❌ 執行互動時發生錯誤。', ephemeral: true });
        }
    }
};