const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../utils/db');

module.exports = {
    name: 'repair',
    aliases: ['r', '維修'], // 支援縮寫 ~r
    execute: async (message, args) => {
        const userId = message.author.id;
        let data = db.read();

        // 1. 基本檢查與編號選擇
        if (!data.players[userId] || data.players[userId].inventory.length === 0) {
            return message.reply('❌ 你的工坊裡沒有任何零件。請先輸入 `~s` 拾荒。');
        }

        const player = data.players[userId];
        
        // 取得玩家輸入的編號 (例如 ~r 1)，若沒輸入則預設維修第 0 個
        const itemIndex = parseInt(args[0]) || 0;
        const item = player.inventory[itemIndex];

        if (!item) {
            return message.reply(`❌ 找不到編號為 \`[${itemIndex}]\` 的零件。請使用 \`~b\` 確認背包編號。`);
        }

        // 2. 介面生成函數
        const createEmbed = (currentState) => {
            const color = currentState.durability < 30 ? 0xff5555 : 0xFFAA00;
            return new EmbedBuilder()
                .setAuthor({ name: '🔧 工坊維修台', iconURL: message.author.displayAvatarURL() })
                .setTitle(`正在修復：${currentState.name} [編號:${itemIndex}]`)
                .setDescription(`>>> 🔋 **當前耐久：** \`${currentState.durability}%\`\n🌀 **當前熵值：** \`${currentState.entropy}\``)
                .addFields({ name: '💡 維修說明', value: '點擊下方 **[🔨 執行鍛打]** 提升耐久。\n注意：敲擊可能導致**熵值上升**，越高越容易在合成時爆炸。' })
                .setColor(color)
                .setFooter({ text: '請在 60 秒內操作完畢' })
                .setTimestamp();
        };

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('strike')
                .setLabel('執行鍛打')
                .setEmoji('🔨')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('finish')
                .setLabel('完成並保存')
                .setEmoji('💾')
                .setStyle(ButtonStyle.Success)
        );

        const response = await message.reply({ 
            embeds: [createEmbed(item)], 
            components: [row] 
        });

        // 3. 建立收集器
        const collector = response.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            time: 60000 
        });

        collector.on('collect', async (interaction) => {
            if (interaction.user.id !== userId) {
                return interaction.reply({ content: '🚫 這不是你的維修台！', ephemeral: true });
            }

            if (interaction.customId === 'strike') {
                // 維修邏輯：耐久 +5，25% 機率熵值 +1~3
                item.durability = Math.min(100, item.durability + 5);
                
                let entropyIncr = 0;
                if (Math.random() < 0.25) {
                    entropyIncr = Math.floor(Math.random() * 3) + 1;
                    item.entropy += entropyIncr;
                }

                db.write(data); // 儲存至 data.json

                const updatedEmbed = createEmbed(item);
                if (entropyIncr > 0) {
                    updatedEmbed.setFooter({ text: `⚠️ 震動導致結構不穩！(熵值 +${entropyIncr})` });
                }

                await interaction.update({ embeds: [updatedEmbed] });
            } 
            else if (interaction.customId === 'finish') {
                collector.stop('manual');
            }
        });

        collector.on('end', (collected, reason) => {
            // 結束時移除按鈕，並顯示最終結果
            const finalEmbed = createEmbed(item)
                .setTitle(`✅ 維修結束：${item.name}`)
                .setDescription(`>>> **最終耐久：** \`${item.durability}%\`\n**最終熵值：** \`${item.entropy}\`\n\n*工坊作業已結束。*`)
                .setColor(0x55ff55);
            
            response.edit({ embeds: [finalEmbed], components: [] }).catch(() => null);
        });
    }
};