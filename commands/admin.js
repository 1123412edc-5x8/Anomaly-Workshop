const { EmbedBuilder } = require('discord.js');
const db = require('../utils/db');

// 管理員 ID 列表 (可根據需要修改)
const ADMINS = ['1292424394957918248'];

module.exports = {
    name: 'admin',
    aliases: ['admin', '管理員'],
    execute: async (message, args = []) => {
        // 檢查管理員權限
        if (!ADMINS.includes(message.author.id) && !message.member?.permissions.has('ADMINISTRATOR')) {
            const embed = new EmbedBuilder()
                .setTitle('❌ 權限不足')
                .setDescription('你沒有管理員權限！')
                .setColor(0xFF0000);
            return message.reply({ embeds: [embed] });
        }

        const subcommand = args[0];

        if (!subcommand) {
            // 顯示管理員菜單
            const embed = new EmbedBuilder()
                .setTitle('⚙️ 管理員控制面板')
                .setColor(0xFF0000)
                .addFields(
                    { name: '👥 查看玩家資料', value: '`~admin stats [@玩家]` - 查看特定玩家的詳細信息' },
                    { name: '📊 全服統計', value: '`~admin server` - 查看伺服器總玩家數和統計' },
                    { name: '💾 手動保存', value: '`~admin save` - 強制保存所有玩家資料' },
                    { name: '🔄 重置玩家', value: '`~admin reset [@玩家]` - 重置玩家所有資料 (慎用)' },
                    { name: '⏰ 查看冷卻時間', value: '`~admin cooldown [@玩家] [指令]` - 查看玩家的冷卻時間' },
                    { name: '🧹 清理冷卻時間', value: '`~admin clearcooldown [@玩家]` - 清除玩家所有冷卻時間' }
                )
                .setFooter({ text: '僅限管理員使用' });

            return message.reply({ embeds: [embed] });
        }

        if (subcommand === 'stats') {
            // 查看玩家資料
            const targetUser = message.mentions.users.first() || message.author;
            const data = db.read();

            if (!data.players[targetUser.id]) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ 玩家未找到')
                    .setDescription('該玩家還沒開始遊戲。')
                    .setColor(0xFF0000);
                return message.reply({ embeds: [embed] });
            }

            const player = data.players[targetUser.id];
            const embed = new EmbedBuilder()
                .setTitle(`📊 ${targetUser.username} 的詳細資料`)
                .setColor(0x00FF00)
                .setThumbnail(targetUser.displayAvatarURL())
                .addFields(
                    { name: '🎯 等級', value: `\`${player.level || 1}\``, inline: true },
                    { name: '📈 經驗值', value: `\`${player.exp || 0}\``, inline: true },
                    { name: '💎 熵結晶', value: `\`${player.entropy_crystal || 0}\``, inline: true },
                    { name: '🗺️ 當前位置', value: `\`${player.currentLocation || '工廠'}\``, inline: true },
                    { name: '🎒 背包物品數', value: `\`${player.inventory?.length || 0}\``, inline: true },
                    { name: '🔧 維修次數', value: `\`${player.repair_count || 0}\``, inline: true },
                    { name: '✨ 合成次數', value: `\`${player.combine_count || 0}\``, inline: true },
                    { name: '⚔️ 戰鬥次數', value: `\`${player.battle_count || 0}\``, inline: true },
                    { name: '🏆 成就數量', value: `\`${player.achievements?.length || 0}\``, inline: true },
                    { name: '最後更新', value: `\`${new Date(player.last_updated || Date.now()).toLocaleString('zh-TW')}\`` }
                )
                .setFooter({ text: '完整玩家資料' });

            message.reply({ embeds: [embed] });

        } else if (subcommand === 'server') {
            // 全服統計
            const data = db.read();
            const players = data.players || {};
            const playerCount = Object.keys(players).length;
            const totalExp = Object.values(players).reduce((sum, p) => sum + (p.exp || 0), 0);
            const totalItems = Object.values(players).reduce((sum, p) => sum + (p.inventory?.length || 0), 0);
            const avgLevel = Object.values(players).length > 0
                ? Math.floor(Object.values(players).reduce((sum, p) => sum + (p.level || 1), 0) / playerCount)
                : 0;

            const embed = new EmbedBuilder()
                .setTitle('📊 伺服器統計')
                .setColor(0x0099FF)
                .addFields(
                    { name: '👥 總玩家數', value: `\`${playerCount}\``, inline: true },
                    { name: '📈 總經驗值', value: `\`${totalExp}\``, inline: true },
                    { name: '🎒 總物品數', value: `\`${totalItems}\``, inline: true },
                    { name: '📊 平均等級', value: `\`${avgLevel}\``, inline: true },
                    { name: '📅 最後保存時間', value: `\`${new Date().toLocaleString('zh-TW')}\`` }
                );

            message.reply({ embeds: [embed] });

        } else if (subcommand === 'save') {
            // 手動保存
            const data = db.read();
            // 更新最後保存時間
            Object.keys(data.players || {}).forEach(userId => {
                if (data.players[userId]) {
                    data.players[userId].last_updated = new Date().toISOString();
                }
            });
            db.write(data);

            const embed = new EmbedBuilder()
                .setTitle('✅ 資料已保存')
                .setColor(0x00FF00)
                .setDescription(`成功保存 ${Object.keys(data.players || {}).length} 個玩家的資料。`);

            message.reply({ embeds: [embed] });

        } else if (subcommand === 'reset') {
            // 重置玩家
            const targetUser = message.mentions.users.first();

            if (!targetUser) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ 請指定玩家')
                    .setDescription('請指定要重置的玩家！使用 `~admin reset [@玩家]`')
                    .setColor(0xFF0000);
                return message.reply({ embeds: [embed] });
            }

            const data = db.read();
            data.players[targetUser.id] = {
                inventory: [],
                currentLocation: '工廠',
                level: 1,
                exp: 0,
                entropy_crystal: 0,
                quests: [],
                achievements: [],
                last_updated: new Date().toISOString()
            };
            db.write(data);

            const embed = new EmbedBuilder()
                .setTitle('🔄 玩家已重置')
                .setColor(0xFF8800)
                .setDescription(`已重置 **${targetUser.username}** 的所有資料。`);

            message.reply({ embeds: [embed] });

        } else if (subcommand === 'cooldown') {
            // 查看冷卻時間
            const targetUser = message.mentions.users.first();
            const commandName = args[2];

            if (!targetUser) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ 請指定玩家')
                    .setDescription('請指定玩家！使用 `~admin cooldown [@玩家] [指令]`')
                    .setColor(0xFF0000);
                return message.reply({ embeds: [embed] });
            }

            const data = db.read();
            const cooldowns = data.cooldowns || {};
            const userCooldowns = cooldowns[targetUser.id] || {};

            if (!commandName) {
                // 顯示該玩家的所有冷卻時間
                const embed = new EmbedBuilder()
                    .setTitle(`⏰ ${targetUser.username} 的冷卻時間`)
                    .setColor(0xFF8800);

                if (Object.keys(userCooldowns).length === 0) {
                    embed.setDescription('此玩家目前沒有任何冷卻時間。');
                } else {
                    Object.entries(userCooldowns).forEach(([cmd, endTime]) => {
                        const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
                        embed.addFields({
                            name: cmd,
                            value: `${remaining}秒後可用`,
                            inline: true
                        });
                    });
                }

                message.reply({ embeds: [embed] });
            } else {
                // 查看特定指令的冷卻時間
                const endTime = userCooldowns[commandName];

                if (!endTime) {
                    const embed = new EmbedBuilder()
                        .setTitle('✅ 冷卻檢查')
                        .setDescription(`${targetUser.username} 可以使用 \`${commandName}\` 指令。`)
                        .setColor(0x00FF00);
                    return message.reply({ embeds: [embed] });
                }

                const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
                const embed = new EmbedBuilder()
                    .setTitle(`⏰ 冷卻時間`)
                    .setColor(0xFF0000)
                    .setDescription(`**${targetUser.username}** 的 \`${commandName}\` 冷卻時間剩餘：\`${remaining}\` 秒`);

                message.reply({ embeds: [embed] });
            }

        } else if (subcommand === 'clearcooldown') {
            // 清除冷卻時間
            const targetUser = message.mentions.users.first();

            if (!targetUser) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ 請指定玩家')
                    .setDescription('請指定玩家！使用 `~admin clearcooldown [@玩家]`')
                    .setColor(0xFF0000);
                return message.reply({ embeds: [embed] });
            }

            const data = db.read();
            if (data.cooldowns && data.cooldowns[targetUser.id]) {
                delete data.cooldowns[targetUser.id];
                db.write(data);
            }

            const embed = new EmbedBuilder()
                .setTitle('✅ 冷卻已清除')
                .setColor(0x00FF00)
                .setDescription(`已清除 **${targetUser.username}** 的所有冷卻時間。`);

            message.reply({ embeds: [embed] });
        } else {
            const embed = new EmbedBuilder()
                .setTitle('❌ 無效的子命令')
                .setDescription('無效的子命令。使用 `~admin` 查看幫助。')
                .setColor(0xFF0000);
            message.reply({ embeds: [embed] });
        }
    }
};
