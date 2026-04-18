const { EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
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
                .setDescription('查看裝備資訊')),
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
        }
    }
};

function addEquipmentStats(player, item, type) {
    const itemName = item.name || item;
    const rarity = getItemRarity(itemName);

    // 根據稀有度和類型給予屬性
    const baseStats = {
        common: { attack: 5, defense: 3, hp: 10 },
        rare: { attack: 10, defense: 7, hp: 20 },
        epic: { attack: 20, defense: 15, hp: 40 },
        legendary: { attack: 40, defense: 30, hp: 80 }
    }[rarity];

    if (type === 'weapon') {
        player.equipmentStats.attack += baseStats.attack;
        player.equipmentStats.crit += Math.floor(baseStats.attack / 10);
    } else if (type === 'armor') {
        player.equipmentStats.defense += baseStats.defense;
        player.equipmentStats.hp += baseStats.hp;
        player.equipmentStats.evade += Math.floor(baseStats.defense / 10);
    } else if (type === 'accessory') {
        player.equipmentStats.entropy_control += 5;
        player.equipmentStats.scavenging_efficiency += 3;
        player.equipmentStats.synthesis_success += 2;
    }
}

function removeEquipmentStats(player, item) {
    // 這裡應該實現移除屬性的邏輯，與 addEquipmentStats 相反
    // 為了簡化，這裡先省略，實際實現時需要記錄每個裝備的具體屬性
}

function getItemRarity(itemName) {
    if (itemName.includes('傳說') || itemName.includes('神話')) return 'legendary';
    if (itemName.includes('史詩') || itemName.includes('稀有')) return 'epic';
    if (itemName.includes('優質') || itemName.includes('精良')) return 'rare';
    return 'common';
}