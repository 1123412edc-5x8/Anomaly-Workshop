const db = require('../utils/db');

module.exports = {
    name: 'scavenge',
        execute: async (message) => {
                let data = db.read();
                        const userId = message.author.id;
                                
                                        // 簡單的隨機零件名
                                                const names = ['生鏽螺絲', '廢棄電路板', '扭曲的鋼樑', '不明發光液體'];
                                                        const randomName = names[Math.floor(Math.random() * names.length)];
                                                                
                                                                        const newItem = {
                                                                                    name: randomName,
                                                                                                durability: Math.floor(Math.random() * 50) + 10,
                                                                                                            entropy: Math.floor(Math.random() * 20)
                                                                                                                    };

                                                                                                                            if (!data.players[userId]) data.players[userId] = { inventory: [] };
                                                                                                                                    data.players[userId].inventory.push(newItem);
                                                                                                                                            db.write(data);

                                                                                                                                                    message.reply(`🔍 你在廢墟中翻找，撿到了 **${randomName}**！ (使用 \`!bag\` 查看)`);
                                                                                                                                                        }
                                                                                                                                                        };