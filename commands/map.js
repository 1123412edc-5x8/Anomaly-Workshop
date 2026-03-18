const db = require('../utils/db');
const itemWiki = require('../utils/items');

module.exports = {
    name: 'map',
        aliases: ['m', '地圖'],
            execute: async (message, args) => {
                    const userId = message.author.id;
                            const targetMap = args[0];
                                    let data = db.read();

                                            // 取得所有可用的地圖清單
                                                    const availableMaps = Object.keys(itemWiki);

                                                            if (!targetMap || !itemWiki[targetMap]) {
                                                                        return message.reply(`📍 **請選擇正確的區域：** \`${availableMaps.join('、')}\`\n用法範例：\`~map 荒野\``);
                                                                                }

                                                                                        // 初始化玩家資料（如果不存在）
                                                                                                if (!data.players[userId]) {
                                                                                                            data.players[userId] = { inventory: [], currentLocation: '工廠' };
                                                                                                                    }

                                                                                                                            // 執行切換
                                                                                                                                    data.players[userId].currentLocation = targetMap;
                                                                                                                                            db.write(data);

                                                                                                                                                    message.reply(`✅ **成功移動！** 你現在已抵達 **【${targetMap}】**。\n💡 輸入 \`~s\` 即可開始在此地拾荒。`);
                                                                                                                                                        }
                                                                                                                                                        };