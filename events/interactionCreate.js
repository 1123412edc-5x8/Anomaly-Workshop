module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        // 處理自動完成
        if (interaction.isAutocomplete()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (command && command.autocomplete) {
                try {
                    await command.autocomplete(interaction);
                } catch (error) {
                    console.error(error);
                }
            }
            return;
        }
// 在你的 interactionCreate.js 裡面
if (interaction.isAutocomplete()) {
    const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;

            try {
                    await command.autocomplete(interaction);
                        } catch (error) {
                                console.error('選單補齊發生錯誤:', error);
                                    }
                                        return; // 處理完選單後一定要 return，不要往下跑 execute
                                        }
        // 處理斜線指令
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                }
            }
            return;
        }

        // 處理選擇菜單
        if (!interaction.isStringSelectMenu()) return;

        const { customId } = interaction;

        try {
            // 根據 ID 分流處理邏輯
            if (customId === 'help_select') {
                const helpHandler = require('../interactions/helpHandler');
                await helpHandler.execute(interaction);
            }
            else if (customId === 'shop_select') {
                const shopHandler = require('../interactions/shopHandler');
                await shopHandler.execute(interaction);
            } 
            else if (customId === 'map_select') {
                const mapHandler = require('../interactions/mapHandler');
                await mapHandler.execute(interaction);
            }
            else if (customId === 'decompose_select') {
                const decomposeHandler = require('../interactions/decomposeHandler');
                await decomposeHandler.execute(interaction);
            }
            else if (customId === 'decompose_amount_select') {
                const decomposeHandler = require('../interactions/decomposeHandler');
                await decomposeHandler.executeAmountSelect(interaction);
            }
            else if (customId === 'combine_select') {
                const combineHandler = require('../interactions/combineHandler');
                await combineHandler.executeCombineSelect(interaction);
            }
            else if (customId === 'combine_quantity_select') {
                const combineHandler = require('../interactions/combineHandler');
                await combineHandler.executeCombineQuantitySelect(interaction);
            }
        } catch (error) {
            console.error('互動處理出錯:', error);
            await interaction.reply({ content: '❌ 執行互動時發生錯誤。', ephemeral: true });
        }
    }
};