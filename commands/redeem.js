const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/db');
const fs = require('fs');
const path = require('path');

module.exports = {
    // 定義斜線指令的名稱與參數
        data: new SlashCommandBuilder()
                .setName('redeem')
                        .setDescription('兌換禮包碼獲取獎勵')
                                .addStringOption(option => 
                                            option.setName('code')
                                                            .setDescription('請輸入禮包碼')
                                                                            .setRequired(true)),

                                                                                async execute(interaction) {
                                                                                        const userId = interaction.user.id;
                                                                                                const inputCode = interaction.options.getString('code').toUpperCase();

                                                                                                        // 讀取禮包碼資料
                                                                                                                const codesPath = path.join(__dirname, '../data/codes.json');
                                                                                                                        if (!fs.existsSync(codesPath)) return interaction.reply({ content: '❌ 系統目前沒有可用的禮包碼。', ephemeral: true });
                                                                                                                                const codes = JSON.parse(fs.readFileSync(codesPath, 'utf8'));

                                                                                                                                        const gift = codes[inputCode];
                                                                                                                                                if (!gift) return interaction.reply({ content: '❌ 無效的禮包碼！', ephemeral: true });

                                                                                                                                                        let data = db.read();
                                                                                                                                                                if (!data.players[userId]) {
                                                                                                                                                                            data.players[userId] = { inventory: [], entropy_crystal: 0, redeemed_codes: [] };
                                                                                                                                                                                    }
                                                                                                                                                                                            
                                                                                                                                                                                                    const player = data.players[userId];
                                                                                                                                                                                                            if (!player.redeemed_codes) player.redeemed_codes = [];

                                                                                                                                                                                                                    if (player.redeemed_codes.includes(inputCode)) {
                                                                                                                                                                                                                                return interaction.reply({ content: '⚠️ 你已經領取過這個禮包囉！', ephemeral: true });
                                                                                                                                                                                                                                        }

                                                                                                                                                                                                                                                // 發放獎勵
                                                                                                                                                                                                                                                        player.entropy_crystal = (player.entropy_crystal || 0) + gift.reward_crystals;
                                                                                                                                                                                                                                                                if (gift.reward_items) {
                                                                                                                                                                                                                                                                            gift.reward_items.forEach(item => player.inventory.push(item));
                                                                                                                                                                                                                                                                                    }

                                                                                                                                                                                                                                                                                            player.redeemed_codes.push(inputCode);
                                                                                                                                                                                                                                                                                                    db.write(data);

                                                                                                                                                                                                                                                                                                            const embed = new EmbedBuilder()
                                                                                                                                                                                                                                                                                                                        .setTitle('🎁 禮包兌換成功')
                                                                                                                                                                                                                                                                                                                                    .setColor(0x00FF00)
                                                                                                                                                                                                                                                                                                                                                .setDescription(`恭喜領取 **${inputCode}**！`)
                                                                                                                                                                                                                                                                                                                                                            .addFields(
                                                                                                                                                                                                                                                                                                                                                                            { name: '💎 獲得結晶', value: `+${gift.reward_crystals}`, inline: true },
                                                                                                                                                                                                                                                                                                                                                                                            { name: '📦 獲得物品', value: gift.reward_items.length > 0 ? gift.reward_items.join('、') : '無', inline: true }
                                                                                                                                                                                                                                                                                                                                                                                                        );

                                                                                                                                                                                                                                                                                                                                                                                                                await interaction.reply({ embeds: [embed] });
                                                                                                                                                                                                                                                                                                                                                                                                                    }
                                                                                                                                                                                                                                                                                                                                                                                                                    };