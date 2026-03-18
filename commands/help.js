const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'help',
        aliases: ['h', '幫助', 'wiki', 'w'], // 支援多種縮寫
            execute: async (message) => {
                    const embed = new EmbedBuilder()
                                .setAuthor({ name: '🛠️ 異常工坊：全手冊 (Wiki)', iconURL: 'https://i.imgur.com/8N69y7v.png' })
                                            .setColor(0x00FFCC)
                                                        .setTitle('歡迎來到異常工坊 v1.2')
                                                                    .setDescription('這是一個關於回收、修復與進化的生存遊戲。你的目標是利用廢墟中的零件，合成出最強大的「異質物件」。')
                                                                                .addFields(
                                                                                                { 
                                                                                                                    name: '📜 快速入門 (Wiki 機制)', 
                                                                                                                                        value: '1️⃣ 使用 `~s` 拾荒獲得零件。\n2️⃣ 使用 `~b` 查看零件狀態與編號。\n3️⃣ 使用 `~r [編號]` 提升耐久度。\n4️⃣ 使用 `~c [編號1] [編號2]` 進行合成。' 
                                                                                                                                                        },
                                                                                                                                                                        { 
                                                                                                                                                                                            name: '⚠️ 重要：熵值 (Entropy) 系統', 
                                                                                                                                                                                                                value: '這是工坊的核心機制。每次**鍛打(Repair)**都有機率增加熵值。熵值越高，**合成(Combine)**時發生「結構崩潰」導致物品消失的機率就越高！' 
                                                                                                                                                                                                                                },
                                                                                                                                                                                                                                                { 
                                                                                                                                                                                                                                                                    name: '⌨️ 指令縮寫一覽', 
                                                                                                                                                                                                                                                                                        value: '• `~bag` → `~b` (背包)\n• `~scavenge` → `~s` (拾荒)\n• `~repair` → `~r` (維修)\n• `~combine` → `~c` (合成)\n• `~help` → `~h` / `~w` (說明)' 
                                                                                                                                                                                                                                                                                                        }
                                                                                                                                                                                                                                                                                                                    )
                                                                                                                                                                                                                                                                                                                                .setFooter({ text: '💡 提示：合成時，兩個零件的平均耐久度會決定產物強度。' })
                                                                                                                                                                                                                                                                                                                                            .setTimestamp();

                                                                                                                                                                                                                                                                                                                                                    message.reply({ embeds: [embed] });
                                                                                                                                                                                                                                                                                                                                                        }
                                                                                                                                                                                                                                                                                                                                                        };