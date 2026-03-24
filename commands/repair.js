const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../utils/db');

module.exports = {
    name: 'repair',
    aliases: ['r', '維修'],
    execute: async (message, args = []) => {
        const userId = message.author.id;
        let data = db.read();

        // --- 強制初始化邏輯 ---
        if (!data.players) data.players = {}; // 確保 players 物件存在
        if (!data.players[userId]) {
            data.players[userId] = { inventory: [], currentLocation: '工廠' };
        }
        
        // 額外檢查：確保 inventory 是一個陣列 (防止舊資料干擾)
        if (!Array.isArray(data.players[userId].inventory)) {
            data.players[userId].inventory = [];
        }

        // 檢查背包是否有東西
        if (player.inventory.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle('❌ 無法維修')
                .setDescription('🎒 **你的背包是空的！** 請先使用 `~s` 拾荒獲得零件。')
                .setColor(0xFF0000);
            return message.reply({ embeds: [embed] });
        }

        // 檢查編號是否存在於陣列中
        if (itemIndex < 0 || itemIndex >= player.inventory.length) {
            const embed = new EmbedBuilder()
                .setTitle('❌ 無效的零件編號')
                .setDescription(`找不到編號為 [${itemIndex}] 的零件。目前有效範圍：\`0\` ~ \`${player.inventory.length - 1}\``)
                .setColor(0xFF0000);
            return message.reply({ embeds: [embed] });
        }

        const item = player.inventory[itemIndex];

        // --- 以下為原本的維修邏輯 ---
        const createEmbed = (currentState) => {
            return new EmbedBuilder()
                .setAuthor({ name: '🔧 工坊維修台', iconURL: message.author.displayAvatarURL() })
                .setTitle(`正在修復：${currentState.name}`)
                .setDescription(`>>> 🔋 **耐久：** \`${currentState.durability}%\`\n🌀 **熵值：** \`${currentState.entropy}\``)
                .setColor(currentState.durability < 30 ? 0xff5555 : 0xFFAA00)
                .setFooter({ text: '點擊按鈕進行維修' });
        };

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('strike').setLabel('執行鍛打').setEmoji('🔨').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('finish').setLabel('保存離開').setEmoji('💾').setStyle(ButtonStyle.Success)
        );

        const response = await message.reply({ embeds: [createEmbed(item)], components: [row] });

        const collector = response.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            time: 60000 
        });

        collector.on('collect', async (i) => {
            if (i.user.id !== userId) return i.reply({ content: '這不是你的維修台', ephemeral: true });

            if (i.customId === 'strike') {
                item.durability = Math.min(100, item.durability + 5);
                if (Math.random() < 0.25) item.entropy += 1;
                
                db.write(data); // 即時存檔
                await i.update({ embeds: [createEmbed(item)] });
            } else {
                collector.stop();
            }
        });

        collector.on('end', () => {
            response.edit({ components: [] }).catch(() => null);
        });
    }
};