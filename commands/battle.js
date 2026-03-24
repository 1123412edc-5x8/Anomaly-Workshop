const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../utils/db');

module.exports = {
    name: 'battle',
    aliases: ['fight', 'battle', '戰鬥'],
    execute: async (message) => {
        const userId = message.author.id;
        let data = db.read();

        if (!data.players[userId]) {
            return message.reply('🎒 請先使用 `~s` 拾荒獲得零件！');
        }

        const player = data.players[userId];
        const inventory = player.inventory;

        if (inventory.length === 0) {
            return message.reply('你的背包是空的！無法進行戰鬥。');
        }

        // 隨機敵人
        const enemies = [
            { name: '生鏽泰坦', hp: 50, reward: 100 },
            { name: '變異蜘蛛', hp: 30, reward: 75 },
            { name: '熵怪獸', hp: 60, reward: 150 },
            { name: '異常昆蟲群', hp: 40, reward: 90 }
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
                const damage = Math.floor(weapon.durability / 10) + Math.floor(Math.random() * 10);
                enemy.hp -= damage;

                const enemyDamage = defending ? Math.floor(Math.random() * 5) : Math.floor(Math.random() * 20);
                playerHp -= enemyDamage;

                defending = false;

                const updateEmbed = new EmbedBuilder()
                    .setTitle('⚔️ 戰鬥中...')
                    .setDescription(`你用 **${weapon.name}** 攻擊！\n傷害：\`${damage}\`\n\n敵人 HP：\`${Math.max(0, enemy.hp)}/${enemy.maxHp}\`\n你的 HP：\`${Math.max(0, playerHp)}/100\``)
                    .setColor(0xFF6B6B);

                await i.update({ embeds: [updateEmbed] });

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

                await i.update({ embeds: [updateEmbed] });
            } else if (i.customId === 'flee') {
                collector.stop('flee');
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'win') {
                player.exp = (player.exp || 0) + enemy.reward;
                db.write(data);
                response.edit({ 
                    embeds: [new EmbedBuilder()
                        .setTitle('✅ 勝利！')
                        .setDescription(`你打敗了 **${enemy.name}**！\n獲得 \`${enemy.reward}\` 經驗值`)
                        .setColor(0x00FF00)],
                    components: [] 
                });
            } else if (reason === 'lose') {
                response.edit({ 
                    embeds: [new EmbedBuilder()
                        .setTitle('❌ 已擊敗')
                        .setDescription(`你被 **${enemy.name}** 擊敗了...`)
                        .setColor(0xFF0000)],
                    components: [] 
                });
            } else {
                response.edit({ 
                    embeds: [new EmbedBuilder()
                        .setTitle('💨 逃脫成功')
                        .setDescription(`你成功逃離了 **${enemy.name}**！`)
                        .setColor(0xFFFFFF)],
                    components: [] 
                });
            }
        });
    }
};
