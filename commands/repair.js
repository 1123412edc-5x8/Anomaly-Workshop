const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../utils/db');

module.exports = {
    name: 'repair',
    aliases: ['r', '維修'], // 支援 ~r 縮寫
    execute: async (message, args) => {
        const userId = message.author.id;
        let data = db.read();

        // 1. 初始化檢查：確保玩家資料存在
        if (!data.players[userId]) {
            data.players[userId] = { inventory: [], currentLocation: '工廠' };
            db.write(data);
        }

        const player = data.players[userId];

        // 2. 背包空置檢查
        if (!player.inventory || player.inventory.length === 0) {
            return message.reply('🎒 **你的背包是空的！** 請先使用 `~s` 拾荒獲得零件後再進行維修。');
        }

        // 3. 解析維修編號 (例如 ~r 1)
        const itemIndex = parseInt(args[0]) || 0; // 若沒輸入編號，預設維修第 0 個

        // 4. 編號有效性檢查 (防止讀取 undefined)
        if (itemIndex < 0 || itemIndex >= player.inventory.length) {
            return message.reply(`❌ **找不到該零件！** 目前你的背包編號範圍是：\`0\` ~ \`${player.inventory.length - 1}\`。\n💡 提示：輸入 \`~b\` 查看所有物品編號。`);
        }

        const item = player.inventory[itemIndex];

        // 5. 介面生成函數
        const createEmbed = (currentState) => {
            const color = currentState.durability < 30 ? 0xff5555 : 0xFFAA00;
            return new EmbedBuilder()
                .setAuthor({ name: '🔧 工坊維修台', iconURL: message.author.displayAvatarURL() })
                .setTitle(`正在修復：${currentState.name} [編號:${itemIndex}]`)
                .setDescription(`>>> 🔋 **當前耐久：** \`${currentState.durability}%\`\n🌀 **當前熵值：** \`${currentState.entropy}\``)
                .addFields({ name: '💡 維修說明', value: '點擊 **[🔨 執行鍛打]** 提升耐久。\n注意：敲擊可能導致**熵值上升**，越高越容易在合成時爆炸。' })
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

        // 6. 建立按鈕收集器 (Collector)
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

                db.write(data); // 每次點擊即時保存

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
                .setDescription(`>>> **最終狀態**\n🔋 耐久：\`${item.durability}%\`\n🌀 熵值：\`${item.entropy}\`\n\n*工坊冷卻中，資料已封存。*`)
                .setColor(0x55ff55);
            
            response.edit({ embeds: [finalEmbed], components: [] }).catch(() => null);
        });
    }
};