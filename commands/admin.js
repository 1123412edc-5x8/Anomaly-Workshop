const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../utils/db');

// 管理員 ID 列表 (可根據需要修改)
const ADMINS = ['1292424394957918248'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin')
        .setDescription('管理員指令')
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('查看玩家資料')
                .addUserOption(option => option.setName('user').setDescription('目標玩家').setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('server')
                .setDescription('查看伺服器統計'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('save')
                .setDescription('手動保存資料'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('重置玩家資料')
                .addUserOption(option => option.setName('user').setDescription('目標玩家').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('cooldown')
                .setDescription('查看玩家冷卻時間')
                .addUserOption(option => option.setName('user').setDescription('目標玩家').setRequired(true))
                .addStringOption(option => option.setName('command').setDescription('指令名稱').setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clearcooldown')
                .setDescription('清除玩家冷卻時間')
                .addUserOption(option => option.setName('user').setDescription('目標玩家').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggletext')
                .setDescription('切換文字指令開關')),
    execute: async (interaction) => {
        // 檢查管理員權限
        if (!ADMINS.includes(interaction.user.id) && !interaction.member?.permissions.has('ADMINISTRATOR')) {
            const embed = new EmbedBuilder()
                .setTitle('❌ 權限不足')
                .setDescription('你沒有管理員權限！')
                .setColor(0xFF0000);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'stats') {
            // 查看玩家資料
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const data = db.read();

            if (!data.players[targetUser.id]) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ 玩家未找到')
                    .setDescription('該玩家還沒開始遊戲。')
                    .setColor(0xFF0000);
                return interaction.reply({ embeds: [embed], ephemeral: true });
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

            interaction.reply({ embeds: [embed], ephemeral: true });

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

            interaction.reply({ embeds: [embed], ephemeral: true });

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

            interaction.reply({ embeds: [embed], ephemeral: true });

        } else if (subcommand === 'reset') {
            // 重置玩家
            const targetUser = interaction.options.getUser('user');

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

            interaction.reply({ embeds: [embed], ephemeral: true });

        } else if (subcommand === 'cooldown') {
            // 查看冷卻時間
            const targetUser = interaction.options.getUser('user');
            const commandName = interaction.options.getString('command');

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

                interaction.reply({ embeds: [embed], ephemeral: true });
            } else {
                // 查看特定指令的冷卻時間
                const endTime = userCooldowns[commandName];

                if (!endTime) {
                    const embed = new EmbedBuilder()
                        .setTitle('✅ 冷卻檢查')
                        .setDescription(`${targetUser.username} 可以使用 \`${commandName}\` 指令。`)
                        .setColor(0x00FF00);
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }

                const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
                const embed = new EmbedBuilder()
                    .setTitle(`⏰ 冷卻時間`)
                    .setColor(0xFF0000)
                    .setDescription(`**${targetUser.username}** 的 \`${commandName}\` 冷卻時間剩餘：\`${remaining}\` 秒`);

                interaction.reply({ embeds: [embed], ephemeral: true });
            }

        } else if (subcommand === 'clearcooldown') {
            // 清除冷卻時間
            const targetUser = interaction.options.getUser('user');

            const data = db.read();
            if (data.cooldowns && data.cooldowns[targetUser.id]) {
                delete data.cooldowns[targetUser.id];
                db.write(data);
            }

            const embed = new EmbedBuilder()
                .setTitle('✅ 冷卻已清除')
                .setColor(0x00FF00)
                .setDescription(`已清除 **${targetUser.username}** 的所有冷卻時間。`);

            interaction.reply({ embeds: [embed], ephemeral: true });

        } else if (subcommand === 'toggletext') {
            // 切換文字指令開關
            const indexModule = require('../index');
            const newState = !indexModule.textCommandsEnabled;
            indexModule.textCommandsEnabled = newState;

            const embed = new EmbedBuilder()
                .setTitle('🔄 文字指令開關已切換')
                .setColor(newState ? 0x00FF00 : 0xFF0000)
                .setDescription(`文字指令現在${newState ? '已啟用' : '已停用'}。\n\n${newState ? '玩家可以使用 `~` 前綴指令' : '玩家只能使用斜線指令'}`);

            interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
