const db = require('../utils/db');

module.exports = {
    async execute(interaction) {
            const userId = interaction.user.id;
                    const itemId = interaction.values[0].split('_')[1];
                            let data = db.read();
                                    
                                            const player = data.players[userId];
                                                    if (!player) return interaction.reply({ content: '❌ 請先拾荒！', ephemeral: true });

                                                            const shopItems = {
                                                                        '1': { name: '維修工具', cost: 50 },
                                                                                    '2': { name: '穩定劑', cost: 100 },
                                                                                                '3': { name: '背包擴展模組', cost: 150 },
                                                                                                            '4': { name: '稀有配方', cost: 200 },
                                                                                                                        '5': { name: '傳說碎片', cost: 300 },
                                                                                                                                    '6': { name: '恢復藥劑', cost: 75 },
                                                                                                                                                '7': { name: '感知增幅器', cost: 120 },
                                                                                                                                                            '8': { name: '時空加速器', cost: 250 }
                                                                                                                                                                    };

                                                                                                                                                                            const item = shopItems[itemId];
                                                                                                                                                                                    if (player.entropy_crystal < item.cost) {
                                                                                                                                                                                                return interaction.reply({ content: `❌ 結晶不足！需要 💎${item.cost}`, ephemeral: true });
                                                                                                                                                                                                        }

                                                                                                                                                                                                                player.entropy_crystal -= item.cost;
                                                                                                                                                                                                                        player.inventory.push({ name: item.name, rarity: 'shop' });
                                                                                                                                                                                                                                db.write(data);

                                                                                                                                                                                                                                        await interaction.reply({ 
                                                                                                                                                                                                                                                    content: `✅ **購買成功**\n獲得了 **${item.name}**！剩餘結晶：💎 ${player.entropy_crystal}`, 
                                                                                                                                                                                                                                                                ephemeral: true 
                                                                                                                                                                                                                                                                        });
                                                                                                                                                                                                                                                                            }
                                                                                                                                                                                                                                                                            };