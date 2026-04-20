const { EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../utils/db');

const EQUIPMENT_TYPES = {
    weapon: '武器',
    armor: '護甲',
    accessory: '飾品'
};

const EQUIPMENT_STATS = {
    weapon: ['攻擊力', '暴擊率', '命中率'],
    armor: ['防禦力', '生命值', '閃避率'],
    accessory: ['熵值控制', '拾荒效率', '合成成功率']
};

const ENCHANTMENTS = {
    '鋒利': { stat: 'attack', value: 5, cost: 100 },
    '堅固': { stat: 'defense', value: 3, cost: 80 },
    '生命': { stat: 'hp', value: 10, cost: 120 },
    '暴擊': { stat: 'crit', value: 2, cost: 150 },
    '閃避': { stat: 'evade', value: 1, cost: 130 },
    '熵控': { stat: 'entropy_control', value: 3, cost: 200 },
    '拾荒': { stat: 'scavenging_efficiency', value: 2, cost: 180 },
    '合成': { stat: 'synthesis_success', value: 1, cost: 160 }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('equipment')
        .setDescription('裝備系統')
        .addSubcommand(subcommand =>
            subcommand.setName('equip')
                .setDescription('裝備物品')
                .addStringOption(option =>
                    option.setName('item')
                        .setDescription('要裝備的物品名稱')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('unequip')
                .setDescription('卸下裝備')
                .addStringOption(option =>
                    option.setName('slot')
                        .setDescription('裝備欄位')
                        .setRequired(true)
                        .addChoices(
                            { name: '武器', value: 'weapon' },
                            { name: '護甲', value: 'armor' },
                            { name: '飾品', value: 'accessory' })))
        .addSubcommand(subcommand =>
            subcommand.setName('info')
                .setDescription('查看裝備資訊'))
        .addSubcommand(subcommand =>
            subcommand.setName('upgrade')
                .setDescription('強化裝備')
                .addStringOption(option =>
                    option.setName('slot')
                        .setDescription('要強化的裝備欄位')
                        .setRequired(true)
                        .addChoices(
                            { name: '武器', value: 'weapon' },
                            { name: '護甲', value: 'armor' },
                            { name: '飾品', value: 'accessory' })))
        .addSubcommand(subcommand =>
            subcommand.setName('enchant')
                .setDescription('附魔裝備')
                .addStringOption(option =>
                    option.setName('slot')
                        .setDescription('要附魔的裝備欄位')
                        .setRequired(true)
                        .addChoices(
                            { name: '武器', value: 'weapon' },
                            { name: '護甲', value: 'armor' },
                            { name: '飾品', value: 'accessory' }))
                .addStringOption(option =>
                    option.setName('enchantment')
                        .setDescription('附魔類型')
                        .setRequired(true)
                        .addChoices(
                            { name: '鋒利 (+5攻擊)', value: '鋒利' },
                            { name: '堅固 (+3防禦)', value: '堅固' },
                            { name: '生命 (+10HP)', value: '生命' },
                            { name: '暴擊 (+2%)', value: '暴擊' },
                            { name: '閃避 (+1%)', value: '閃避' },
                            { name: '熵控 (+3%)', value: '熵控' },
                            { name: '拾荒 (+2%)', value: '拾荒' },
                            { name: '合成 (+1%)', value: '合成' }))),
    execute: async (interaction) => {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        let data = db.read();

        if (!data.players) data.players = {};
        if (!data.players[userId]) {
            return interaction.reply({ content: '請先開始遊戲！', ephemeral: true });
        }

        const player = data.players[userId];
        if (!player.equipment) {
            player.equipment = { weapon: null, armor: null, accessory: null };
        }
        if (!player.equipmentStats) {
            player.equipmentStats = { attack: 0, defense: 0, hp: 0, crit: 0, evade: 0, entropy_control: 0, scavenging_efficiency: 0, synthesis_success: 0 };
        }
        if (!player.equipmentData) {
            player.equipmentData = { weapon: { level: 1, enchantments: [] }, armor: { level: 1, enchantments: [] }, accessory: { level: 1, enchantments: [] } };
        }

        switch (subcommand) {
            case 'equip':
                const itemName = interaction.options.getString('item');

                // 檢查物品是否存在於背包
                const itemIndex = player.inventory.findIndex(item => item.name === itemName || item === itemName);
                if (itemIndex === -1) {
                    return interaction.reply({ content: '你的背包中沒有這個物品！', ephemeral: true });
                }

                // 判斷裝備類型
                let equipType = null;
                if (itemName.includes('刀') || itemName.includes('劍') || itemName.includes('槍') || itemName.includes('炮')) {
                    equipType = 'weapon';
                } else if (itemName.includes('甲') || itemName.includes('盾') || itemName.includes('盔')) {
                    equipType = 'armor';
                } else if (itemName.includes('戒指') || itemName.includes('項鍊') || itemName.includes('護符')) {
                    equipType = 'accessory';
                }

                if (!equipType) {
                    return interaction.reply({ content: '這個物品無法裝備！', ephemeral: true });
                }

                // 卸下舊裝備
                if (player.equipment[equipType]) {
                    player.inventory.push(player.equipment[equipType]);
                    // 移除舊裝備的屬性
                    removeEquipmentStats(player, player.equipment[equipType]);
                }

                // 裝備新物品
                player.equipment[equipType] = player.inventory.splice(itemIndex, 1)[0];
                // 添加新裝備的屬性
                addEquipmentStats(player, player.equipment[equipType], equipType);

                db.write(data);

                const equipEmbed = new EmbedBuilder()
                    .setTitle('⚔️ 裝備成功！')
                    .setDescription(`你裝備了 **${itemName}**！`)
                    .setColor(0x00FF00);
                interaction.reply({ embeds: [equipEmbed] });
                break;

            case 'unequip':
                const slot = interaction.options.getString('slot');

                if (!player.equipment[slot]) {
                    return interaction.reply({ content: '這個欄位沒有裝備！', ephemeral: true });
                }

                const unequippedItem = player.equipment[slot];
                player.inventory.push(unequippedItem);
                removeEquipmentStats(player, unequippedItem);
                player.equipment[slot] = null;

                db.write(data);

                const unequipEmbed = new EmbedBuilder()
                    .setTitle('🔄 卸下裝備')
                    .setDescription(`你卸下了 **${unequippedItem.name || unequippedItem}**！`)
                    .setColor(0xFFA500);
                interaction.reply({ embeds: [unequipEmbed] });
                break;

            case 'info':
                const infoEmbed = new EmbedBuilder()
                    .setTitle('🎯 裝備資訊')
                    .setColor(0x3498db);

                for (const [slot, item] of Object.entries(player.equipment)) {
                    const slotName = EQUIPMENT_TYPES[slot];
                    const itemDisplay = item ? (item.name || item) : '未裝備';
                    infoEmbed.addFields({
                        name: slotName,
                        value: itemDisplay,
                        inline: true
                    });
                }

                infoEmbed.addFields(
                    { name: '攻擊力', value: player.equipmentStats.attack.toString(), inline: true },
                    { name: '防禦力', value: player.equipmentStats.defense.toString(), inline: true },
                    { name: '生命值', value: player.equipmentStats.hp.toString(), inline: true },
                    { name: '暴擊率', value: `${player.equipmentStats.crit}%`, inline: true },
                    { name: '閃避率', value: `${player.equipmentStats.evade}%`, inline: true },
                    { name: '熵值控制', value: `${player.equipmentStats.entropy_control}%`, inline: true }
                );

                interaction.reply({ embeds: [infoEmbed] });
                break;

            case 'upgrade':
                const upgradeSlot = interaction.options.getString('slot');

                if (!player.equipment[upgradeSlot]) {
                    return interaction.reply({ content: '這個欄位沒有裝備！', ephemeral: true });
                }

                const currentLevel = player.equipmentData[upgradeSlot].level;
                const upgradeCost = currentLevel * 50; // 強化費用隨等級增加

                if ((player.entropy_crystal || 0) < upgradeCost) {
                    return interaction.reply({ content: `強化需要 ${upgradeCost} 💎，你只有 ${player.entropy_crystal || 0} 💎！`, ephemeral: true });
                }

                // 強化成功率 (隨等級降低)
                const successRate = Math.max(10, 100 - (currentLevel - 1) * 5);
                const success = Math.random() * 100 < successRate;

                if (success) {
                    player.equipmentData[upgradeSlot].level += 1;
                    player.entropy_crystal -= upgradeCost;

                    // 重新計算裝備屬性
                    recalculateEquipmentStats(player);

                    const upgradeEmbed = new EmbedBuilder()
                        .setTitle('⚡ 強化成功！')
                        .setDescription(`**${EQUIPMENT_TYPES[upgradeSlot]}** 強化到 **+${player.equipmentData[upgradeSlot].level}**！`)
                        .addFields(
                            { name: '消耗結晶', value: `${upgradeCost} 💎`, inline: true },
                            { name: '成功率', value: `${successRate}%`, inline: true },
                            { name: '剩餘結晶', value: `${player.entropy_crystal} 💎`, inline: true }
                        )
                        .setColor(0x00FF00);
                    interaction.reply({ embeds: [upgradeEmbed] });
                } else {
                    // 強化失敗，裝備可能降級
                    if (currentLevel > 1 && Math.random() < 0.3) {
                        player.equipmentData[upgradeSlot].level -= 1;
                        recalculateEquipmentStats(player);

                        const failEmbed = new EmbedBuilder()
                            .setTitle('💥 強化失敗！')
                            .setDescription(`**${EQUIPMENT_TYPES[upgradeSlot]}** 等級下降到 **+${player.equipmentData[upgradeSlot].level}**！`)
                            .addFields(
                                { name: '消耗結晶', value: `${upgradeCost} 💎`, inline: true },
                                { name: '剩餘結晶', value: `${player.entropy_crystal} 💎`, inline: true }
                            )
                            .setColor(0xFF0000);
                        interaction.reply({ embeds: [failEmbed] });
                    } else {
                        player.entropy_crystal -= upgradeCost;

                        const failEmbed = new EmbedBuilder()
                            .setTitle('💥 強化失敗！')
                            .setDescription(`**${EQUIPMENT_TYPES[upgradeSlot]}** 保持在 **+${currentLevel}** 等級。`)
                            .addFields(
                                { name: '消耗結晶', value: `${upgradeCost} 💎`, inline: true },
                                { name: '剩餘結晶', value: `${player.entropy_crystal} 💎`, inline: true }
                            )
                            .setColor(0xFFA500);
                        interaction.reply({ embeds: [failEmbed] });
                    }
                }

                db.write(data);
                break;

            case 'enchant':
                const enchantSlot = interaction.options.getString('slot');
                const enchantment = interaction.options.getString('enchantment');

                if (!player.equipment[enchantSlot]) {
                    return interaction.reply({ content: '這個欄位沒有裝備！', ephemeral: true });
                }

                const enchantData = ENCHANTMENTS[enchantment];
                if ((player.entropy_crystal || 0) < enchantData.cost) {
                    return interaction.reply({ content: `附魔需要 ${enchantData.cost} 💎，你只有 ${player.entropy_crystal || 0} 💎！`, ephemeral: true });
                }

                // 檢查是否已經有這個附魔
                if (player.equipmentData[enchantSlot].enchantments.includes(enchantment)) {
                    return interaction.reply({ content: '這個裝備已經有這個附魔了！', ephemeral: true });
                }

                // 附魔成功率
                const enchantSuccessRate = 80;
                const enchantSuccess = Math.random() * 100 < enchantSuccessRate;

                if (enchantSuccess) {
                    player.equipmentData[enchantSlot].enchantments.push(enchantment);
                    player.entropy_crystal -= enchantData.cost;

                    // 應用附魔效果
                    applyEnchantmentEffect(player, enchantData);

                    const enchantEmbed = new EmbedBuilder()
                        .setTitle('✨ 附魔成功！')
                        .setDescription(`**${EQUIPMENT_TYPES[enchantSlot]}** 獲得 **${enchantment}** 附魔！`)
                        .addFields(
                            { name: '消耗結晶', value: `${enchantData.cost} 💎`, inline: true },
                            { name: '成功率', value: `${enchantSuccessRate}%`, inline: true },
                            { name: '剩餘結晶', value: `${player.entropy_crystal} 💎`, inline: true }
                        )
                        .setColor(0x9932CC);
                    interaction.reply({ embeds: [enchantEmbed] });
                } else {
                    player.entropy_crystal -= enchantData.cost;

                    const failEmbed = new EmbedBuilder()
                        .setTitle('💔 附魔失敗！')
                        .setDescription(`附魔材料損毀，**${EQUIPMENT_TYPES[enchantSlot]}** 沒有變化。`)
                        .addFields(
                            { name: '消耗結晶', value: `${enchantData.cost} 💎`, inline: true },
                            { name: '剩餘結晶', value: `${player.entropy_crystal} 💎`, inline: true }
                        )
                        .setColor(0xFF0000);
                    interaction.reply({ embeds: [failEmbed] });
                }

                db.write(data);
                break;
        }
    }
};

function addEquipmentStats(player, item, type) {
    const itemName = item.name || item;
    const rarity = getItemRarity(itemName);
    const level = player.equipmentData[type].level;

    // 根據稀有度、等級給予屬性
    const baseStats = {
        common: { attack: 5, defense: 3, hp: 10 },
        rare: { attack: 10, defense: 7, hp: 20 },
        epic: { attack: 20, defense: 15, hp: 40 },
        legendary: { attack: 40, defense: 30, hp: 80 }
    }[rarity];

    // 等級倍率
    const levelMultiplier = 1 + (level - 1) * 0.2;

    if (type === 'weapon') {
        player.equipmentStats.attack += Math.floor(baseStats.attack * levelMultiplier);
        player.equipmentStats.crit += Math.floor(baseStats.attack * levelMultiplier / 10);
    } else if (type === 'armor') {
        player.equipmentStats.defense += Math.floor(baseStats.defense * levelMultiplier);
        player.equipmentStats.hp += Math.floor(baseStats.hp * levelMultiplier);
        player.equipmentStats.evade += Math.floor(baseStats.defense * levelMultiplier / 10);
    } else if (type === 'accessory') {
        player.equipmentStats.entropy_control += Math.floor(5 * levelMultiplier);
        player.equipmentStats.scavenging_efficiency += Math.floor(3 * levelMultiplier);
        player.equipmentStats.synthesis_success += Math.floor(2 * levelMultiplier);
    }

    // 應用附魔效果
    player.equipmentData[type].enchantments.forEach(enchant => {
        const enchantData = ENCHANTMENTS[enchant];
        if (enchantData) {
            applyEnchantmentEffect(player, enchantData);
        }
    });
}

function removeEquipmentStats(player, item) {
    // 重置所有裝備屬性，然後重新計算
    player.equipmentStats = { attack: 0, defense: 0, hp: 0, crit: 0, evade: 0, entropy_control: 0, scavenging_efficiency: 0, synthesis_success: 0 };
    recalculateEquipmentStats(player);
}

function recalculateEquipmentStats(player) {
    // 重新計算所有裝備的屬性
    for (const [slot, item] of Object.entries(player.equipment)) {
        if (item) {
            addEquipmentStats(player, item, slot);
        }
    }
}

function applyEnchantmentEffect(player, enchantData) {
    if (player.equipmentStats[enchantData.stat] !== undefined) {
        player.equipmentStats[enchantData.stat] += enchantData.value;
    }
}

function getItemRarity(itemName) {
    if (itemName.includes('傳說') || itemName.includes('神話')) return 'legendary';
    if (itemName.includes('史詩') || itemName.includes('稀有')) return 'epic';
    if (itemName.includes('優質') || itemName.includes('精良')) return 'rare';
    return 'common';
}