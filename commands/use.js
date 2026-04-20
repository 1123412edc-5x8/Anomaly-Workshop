const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../utils/db');
const items = require('../utils/items');

const TELEPORT_REGIONS = ['工廠', '荒野', '實驗室', '圖書館'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('use')
        .setDescription('使用背包中的道具或消耗品')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('要使用的物品名稱')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('region')
                .setDescription('時空卷軸傳送目標，僅限時空卷軸')
                .setRequired(false)
                .addChoices(
                    { name: '工廠', value: '工廠' },
                    { name: '荒野', value: '荒野' },
                    { name: '實驗室', value: '實驗室' },
                    { name: '圖書館', value: '圖書館' }
                )),

    async execute(interaction) {
        const userId = interaction.user.id;
        const itemName = interaction.options.getString('item')?.trim();
        const targetRegion = interaction.options.getString('region');
        const data = db.read();

        if (!data.players) data.players = {};
        const player = data.players[userId];
        if (!player || !player.inventory?.length) {
            return interaction.reply({ content: '❌ 你的背包中沒有可使用的物品。', ephemeral: true });
        }

        const normalizedName = itemName.toLowerCase();
        const itemIndex = player.inventory.findIndex(invItem => {
            if (typeof invItem === 'string') return invItem.toLowerCase() === normalizedName;
            if (invItem?.name) return invItem.name.toLowerCase() === normalizedName;
            return false;
        });

        if (itemIndex === -1) {
            return interaction.reply({ content: `❌ 找不到名為 **${itemName}** 的物品。請確認背包內容後再試。`, ephemeral: true });
        }

        const inventoryItem = player.inventory[itemIndex];
        const itemLabel = typeof inventoryItem === 'string' ? inventoryItem : inventoryItem.name;
        const effect = (typeof inventoryItem === 'object' && inventoryItem.effect) ? inventoryItem.effect : (items.useEffects?.[itemLabel] || items.useEffects?.[itemLabel.trim()]);

        if (!effect) {
            return interaction.reply({ content: `❌ **${itemLabel}** 目前無法直接使用。`, ephemeral: true });
        }

        if (effect.teleport && !targetRegion) {
            return interaction.reply({ content: '❌ 使用時空卷軸時，請指定目標地區，例如 `/use item:時空卷軸 region:工廠`。', ephemeral: true });
        }

        if (effect.teleport && targetRegion && !TELEPORT_REGIONS.includes(targetRegion)) {
            return interaction.reply({ content: '❌ 無效的傳送地點，請選擇 工廠、荒野、實驗室 或 圖書館。', ephemeral: true });
        }

        // 消耗物品
        player.inventory.splice(itemIndex, 1);

        if (!player.maxHp) player.maxHp = 100;
        if (!player.hp) player.hp = player.maxHp;

        let description = effect.description || `使用了 ${itemLabel}。`;

        if (effect.heal) {
            player.hp = Math.min(player.maxHp, player.hp + effect.heal);
            description += `
💚 恢復 ${effect.heal} 點生命，當前 HP：${player.hp}/${player.maxHp}`;
        }

        if (effect.exp) {
            player.exp = (player.exp || 0) + effect.exp;
            description += `
📘 獲得 ${effect.exp} 經驗。`;
        }

        if (effect.crystals) {
            player.entropy_crystal = (player.entropy_crystal || 0) + effect.crystals;
            description += `
💎 獲得 ${effect.crystals} 結晶。`;
        }

        if (effect.defense) {
            if (!player.equipmentStats) {
                player.equipmentStats = { attack: 0, defense: 0, hp: 0, crit: 0, evade: 0, entropy_control: 0, scavenging_efficiency: 0, synthesis_success: 0 };
            }
            player.equipmentStats.defense = (player.equipmentStats.defense || 0) + effect.defense;
            description += `
🛡️ 防禦力永久提升 ${effect.defense} 點。`;
        }

        if (effect.scavenging_rarity) {
            player.scavengingRarityBonus = (player.scavengingRarityBonus || 0) + effect.scavenging_rarity;
            description += `
🔎 拾荒稀有度提升 ${effect.scavenging_rarity}%。`;
        }

        if (effect.synthesis_bonus) {
            player.synthesisBonus = (player.synthesisBonus || 0) + effect.synthesis_bonus;
            player.synthesisBonusDuration = (player.synthesisBonusDuration || 0) + (effect.duration || 0);
            description += `
🌀 合成成功率提升 ${effect.synthesis_bonus}%（持續 ${effect.duration || 0} 次）。`;
        }

        if (effect.cooldown_reduction) {
            player.cooldownReduction = effect.cooldown_reduction;
            player.cooldownReductionExpiry = Date.now() + (effect.duration || 0);
            description += `
⏱️ 冷卻時間減少 ${effect.cooldown_reduction}%，持續 ${Math.floor((effect.duration || 0) / 60000)} 分鐘。`;
        }

        if (effect.teleport) {
            player.currentLocation = targetRegion;
            description += `
📍 你已被傳送到 **${targetRegion}**。`;
        }

        db.write(data);

        const embed = new EmbedBuilder()
            .setTitle('✅ 使用成功')
            .setDescription(description)
            .setColor(0x1ABC9C)
            .addFields(
                { name: '消耗物品', value: itemLabel, inline: true },
                { name: '當前地點', value: player.currentLocation || '未知', inline: true }
            );

        await interaction.reply({ embeds: [embed] });
    }
};
