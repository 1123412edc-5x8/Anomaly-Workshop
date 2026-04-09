const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, SlashCommandBuilder } = require('discord.js');
const db = require('../utils/db');
const { getActiveEvents } = require('./event');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('battle')
        .setDescription('開始戰鬥'),
    execute: async (interaction) => {
        const userId = interaction.user.id;
        let data = db.read();

        // 初始化玩家數據
        if (!data.players) data.players = {};
        if (!data.players[userId]) {
            const embed = new EmbedBuilder()
                .setTitle('❌ 無法開始戰鬥')
                .setDescription('🎒 請先使用 `/scavenge` 拾荒獲得零件！')
                .setColor(0xFF0000);
            return interaction.reply({ embeds: [embed] });
        }

        const player = data.players[userId];
        const inventory = player.inventory;

        if (inventory.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle('❌ 無法開始戰鬥')
                .setDescription('你的背包是空的！無法進行戰鬥。')
                .setColor(0xFF0000);
            return message.reply({ embeds: [embed] });
        }

        // 隨機敵人
        const enemies = [
            { name: '生鏽泰坦', hp: 50 },
            { name: '變異蜘蛛', hp: 30 },
            { name: '熵怪獸', hp: 60 },
            { name: '異常昆蟲群', hp: 40 }
        ];
        const enemy = enemies[Math.floor(Math.random() * enemies.length)];
        enemy.maxHp = enemy.hp;

        const embed = new EmbedBuilder()
            .setTitle('⚔️ 遭遇異常生物！')
            .setDescription(`你遇到了 **${enemy.name}**！\n\n敵人 HP：\`${enemy.hp}/${enemy.maxHp}\``)
            .setColor(0xFF6B6B);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('attack').setLabel('攻擊').setEmoji('⚔️').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('defend').setLabel('防禦').setEmoji('🛡️').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('flee').setLabel('逃跑').setEmoji('💨').setStyle(ButtonStyle.Secondary)
        );

        const response = await message.reply({ embeds: [embed], components: [row] });

        const collector = response.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            time: 60000 
        });

        let playerHp = 100;
        let defending = false;

        collector.on('collect', async (i) => {
            if (i.user.id !== userId) return i.reply({ content: '這不是你的戰鬥', ephemeral: true });

            if (i.customId === 'attack') {
                const weapon = inventory[Math.floor(Math.random() * inventory.length)];
                const damage = Math.floor(Math.random() * 20) + 10;
                enemy.hp -= damage;

                const enemyDamage = defending ? Math.floor(Math.random() * 5) : Math.floor(Math.random() * 20);
                playerHp -= enemyDamage;

                defending = false;

                const updateEmbed = new EmbedBuilder()
                    .setTitle('⚔️ 戰鬥中...')
                    .setDescription(`你用 **${weapon.name}** 攻擊！\n傷害：\`${damage}\`\n\n敵人 HP：\`${Math.max(0, enemy.hp)}/${enemy.maxHp}\`\n你的 HP：\`${Math.max(0, playerHp)}/100\``)
                    .setColor(0xFF6B6B);

                await i.update({ embeds: [updateEmbed], components: [row] });

                if (enemy.hp <= 0) {
                    collector.stop('win');
                } else if (playerHp <= 0) {
                    collector.stop('lose');
                }
            } else if (i.customId === 'defend') {
                defending = true;
                const updateEmbed = new EmbedBuilder()
                    .setTitle('⚔️ 戰鬥中...')
                    .setDescription(`你進入防禦姿態！傷害減少 50%。\n\n敵人 HP：\`${enemy.hp}/${enemy.maxHp}\`\n你的 HP：\`${playerHp}/100\``)
                    .setColor(0xFF6B6B);

                await i.update({ embeds: [updateEmbed], components: [row] });
            } else if (i.customId === 'flee') {
                collector.stop('flee');
            }
        });

        collector.on('end', (collected, reason) => {
            // 檢查事件加成
            const events = getActiveEvents();
            let pointsMultiplier = 1;
            events.forEach(event => {
                if (event.points_multiplier) pointsMultiplier = event.points_multiplier;
            });

            if (reason === 'win') {
                const basePoints = 100;
                const points = Math.floor(basePoints * pointsMultiplier);
                player.weekly_points = (player.weekly_points || 0) + points;

                // 更新日任務進度
                if (!data.dailyTasks) data.dailyTasks = {};
                if (data.dailyTasks[userId]) {
                    data.dailyTasks[userId].tasks.forEach(task => {
                        if (task.action === 'battle_win') task.progress++;
                    });
                }

                db.write(data);
                const winEmbed = new EmbedBuilder()
                    .setTitle('🎉 戰鬥勝利！')
                    .setDescription(`你擊敗了 **${enemy.name}**！`)
                    .addFields(
                        { name: '💝 獎勵', value: `+${points} 積分`, inline: true }
                    )
                    .setColor(0x00FF00);
                response.edit({ embeds: [winEmbed], components: [] });
            } else if (reason === 'lose') {
                db.write(data);
                const loseEmbed = new EmbedBuilder()
                    .setTitle('💀 戰鬥失敗')
                    .setDescription(`你被 **${enemy.name}** 擊敗了...`)
                    .setColor(0xFF0000);
                response.edit({ embeds: [loseEmbed], components: [] });
            } else if (reason === 'flee') {
                const fleeEmbed = new EmbedBuilder()
                    .setTitle('💨 成功逃脫')
                    .setDescription('你逃離了戰鬥。')
                    .setColor(0xFFFF00);
                response.edit({ embeds: [fleeEmbed], components: [] });
            } else {
                const timeoutEmbed = new EmbedBuilder()
                    .setTitle('⏰ 戰鬥超時')
                    .setDescription('你沒有及時回應，戰鬥結束。')
                    .setColor(0xFF0000);
                response.edit({ embeds: [timeoutEmbed], components: [] });
            }
        });
    }
};
