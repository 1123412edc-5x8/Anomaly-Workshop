const db = require('../utils/db');

module.exports = {
    async execute(interaction) {
            const userId = interaction.user.id;
                    const targetMap = interaction.values[0];
                            let data = db.read() || { players: {} };

                                    // 初始化玩家 (防呆)
                                            if (!data.players[userId]) {
                                                        data.players[userId] = { inventory: [], entropy_crystal: 0, currentLocation: '工廠' };
                                                                }

                                                                        // 更新位置
                                                                                data.players[userId].currentLocation = targetMap;
                                                                                        db.write(data);

                                                                                                // 使用 update 而不是 reply，可以讓原本的訊息直接更新，更清爽
                                                                                                        await interaction.update({ 
                                                                                                                    content: `🚀 **傳送完畢**\n你已抵達 **【${targetMap}】**，祝拾荒愉快！`, 
                                                                                                                                embeds: [], 
                                                                                                                                            components: [] 
                                                                                                                                                    });
                                                                                                                                                        }
                                                                                                                                                        };