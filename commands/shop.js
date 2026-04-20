const { EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ComponentType } = require('discord.js');
const db = require('../utils/db');

const SHOP_ITEMS = [
    {
        id: 'repair_kit',
        name: '高級維修工具組',
        cost: 50,
        category: '工具',
        desc: '增加維修效率 20%，減少維修失敗率',
        effect: { repair_bonus: 20, failure_reduction: 10 }
    },
    {
        id: 'stability_agent',
        name: '熵值穩定劑',
        cost: 100,
        category: '消耗品',
        desc: '降低合成失敗率 15%，持續 5 次合成',
        effect: { synthesis_bonus: 15, duration: 5 }
    },
    {
        id: 'bag_expansion',
        name: '背包擴展模組',
        cost: 150,
        category: '升級',
        desc: '永久增加背包容量 +10',
        effect: { bag_capacity: 10 }
    },
    {
        id: 'rare_recipe',
        name: '稀有合成配方',
        cost: 200,
        category: '知識',
        desc: '解鎖 3 個隱藏合成配方',
        effect: { unlock_recipes: 3 }
    },
    {
        id: 'legendary_fragment',
        name: '傳說級零件碎片',
        cost: 300,
        category: '材料',
        desc: '用於合成傳說級裝備的關鍵材料',
        effect: { legendary_crafting: true }
    },
    {
        id: 'health_potion',
        name: '快速恢復藥劑',
        cost: 75,
        category: '消耗品',
        desc: '立即回復 50 HP，戰鬥中使用',
        effect: { heal: 50 }
    },
    {
        id: 'perception_amp',
        name: '感知增幅器',
        cost: 120,
        category: '工具',
        desc: '提升拾荒稀有物品發現率 25%',
        effect: { scavenging_rarity: 25 }
    },
    {
        id: 'time_accelerator',
        name: '時空加速器',
        cost: 250,
        category: '消耗品',
        desc: '所有指令冷卻時間減少 50%，持續 1 小時',
        effect: { cooldown_reduction: 50, duration: 3600000 }
    },
    {
        id: 'skill_book',
        name: '技能秘籍',
        cost: 180,
        category: '知識',
        desc: '隨機提升一個技能 2 級',
        effect: { skill_boost: 2 }
    },
    {
        id: 'pet_food',
        name: '寵物營養劑',
        cost: 90,
        category: '寵物',
        desc: '提升寵物經驗值 100 點，增加親密度',
        effect: { pet_exp: 100, bond_increase: 10 }
    }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('異常工坊黑市商店')
        .addSubcommand(subcommand =>
            subcommand.setName('browse')
                .setDescription('瀏覽商店物品')
                .addStringOption(option =>
                    option.setName('category')
                        .setDescription('物品分類')
                        .setRequired(false)
                        .addChoices(
                            { name: '全部', value: 'all' },
                            { name: '工具', value: '工具' },
                            { name: '消耗品', value: '消耗品' },
                            { name: '升級', value: '升級' },
                            { name: '知識', value: '知識' },
                            { name: '材料', value: '材料' },
                            { name: '寵物', value: '寵物' }
                        )))
        .addSubcommand(subcommand =>
            subcommand.setName('buy')
                .setDescription('購買物品')
                .addStringOption(option =>
                    option.setName('item')
                        .setDescription('物品ID')
                        .setRequired(true)
                        .addChoices(
                            ...SHOP_ITEMS.map(item => ({
                                name: `${item.name} (${item.cost}💎)`,
                                value: item.id
                            }))
                        ))
                .addIntegerOption(option =>
                    option.setName('quantity')
                        .setDescription('數量')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(10))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        let data = db.read();

        if (!data.players) data.players = {};
        if (!data.players[userId]) {
            return interaction.reply({ content: '請先開始遊戲！', ephemeral: true });
        }

        const player = data.players[userId];

        if (subcommand === 'browse') {
            const category = interaction.options.getString('category') || 'all';
            await showShopBrowse(interaction, player, category);
        } else if (subcommand === 'buy') {
            const itemId = interaction.options.getString('item');
            const quantity = interaction.options.getInteger('quantity') || 1;
            await handleShopPurchase(interaction, player, itemId, quantity, data);
        }
    }
};

async function showShopBrowse(interaction, player, category) {
    const filteredItems = category === 'all' ?
        SHOP_ITEMS :
        SHOP_ITEMS.filter(item => item.category === category);

    const embed = new EmbedBuilder()
        .setTitle('🏪 異常工坊黑市')
        .setDescription(`你的結晶：\`${player.crystals || 0}\` 💎\n\n選擇分類查看物品，或使用 \`/shop buy\` 直接購買。`)
        .setColor(0x8B008B);

    // 按分類分組顯示
    const categories = {};
    filteredItems.forEach(item => {
        if (!categories[item.category]) categories[item.category] = [];
        categories[item.category].push(item);
    });

    Object.keys(categories).forEach(cat => {
        const items = categories[cat];
        const itemList = items.map(item =>
            `**${item.name}** - ${item.cost}💎\n${item.desc}`
        ).join('\n\n');

        embed.addFields({
            name: `📦 ${cat}`,
            value: itemList,
            inline: false
        });
    });

    // 創建分類選擇選單
    const select = new StringSelectMenuBuilder()
        .setCustomId('shop_category')
        .setPlaceholder('選擇分類查看...')
        .addOptions([
            { label: '全部物品', value: 'all', emoji: '📚' },
            { label: '工具', value: '工具', emoji: '🔧' },
            { label: '消耗品', value: '消耗品', emoji: '🧪' },
            { label: '升級', value: '升級', emoji: '⬆️' },
            { label: '知識', value: '知識', emoji: '📖' },
            { label: '材料', value: '材料', emoji: '⚙️' },
            { label: '寵物', value: '寵物', emoji: '🐾' }
        ]);

    const row = new ActionRowBuilder().addComponents(select);

    const response = await interaction.reply({ embeds: [embed], components: [row] });

    // 處理分類選擇
    const collector = response.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 300000
    });

    collector.on('collect', async (i) => {
        if (i.user.id !== interaction.user.id) return;
        await showShopBrowse(i, player, i.values[0]);
    });
}

async function handleShopPurchase(interaction, player, itemId, quantity, data) {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) {
        return interaction.reply({ content: '找不到該物品！', ephemeral: true });
    }

    const totalCost = item.cost * quantity;
    if ((player.crystals || 0) < totalCost) {
        return interaction.reply({
            content: `💎 結晶不足！你需要 ${totalCost} 結晶，但你只有 ${player.crystals || 0} 結晶。`,
            ephemeral: true
        });
    }

    // 扣除結晶
    player.crystals -= totalCost;

    // 應用物品效果
    applyItemEffect(player, item, quantity);

    // 記錄購買歷史
    if (!player.purchaseHistory) player.purchaseHistory = [];
    player.purchaseHistory.push({
        item: item.name,
        quantity: quantity,
        cost: totalCost,
        timestamp: Date.now()
    });

    db.write(data);

    const embed = new EmbedBuilder()
        .setTitle('✅ 購買成功！')
        .setDescription(`你購買了 **${quantity}x ${item.name}**！`)
        .addFields(
            { name: '💎 花費', value: `${totalCost} 結晶`, inline: true },
            { name: '📦 效果', value: item.desc, inline: true },
            { name: '💰 餘額', value: `${player.crystals} 結晶`, inline: true }
        )
        .setColor(0x00FF00);

    await interaction.reply({ embeds: [embed] });
}

function applyItemEffect(player, item, quantity) {
    const effect = item.effect;

    if (effect.repair_bonus) {
        player.repairBonus = (player.repairBonus || 0) + effect.repair_bonus;
    }

    if (effect.synthesis_bonus) {
        player.synthesisBonus = (player.synthesisBonus || 0) + effect.synthesis_bonus;
        player.synthesisBonusDuration = (player.synthesisBonusDuration || 0) + effect.duration;
    }

    if (effect.bag_capacity) {
        player.bagCapacity = (player.bagCapacity || 50) + effect.bag_capacity;
    }

    if (effect.unlock_recipes) {
        if (!player.unlockedRecipes) player.unlockedRecipes = [];
        // 這裡可以添加解鎖配方的邏輯
    }

    if (effect.legendary_crafting) {
        player.canCraftLegendary = true;
    }

    if (effect.heal) {
        // 治療藥劑會在戰鬥中使用
        if (!player.inventory) player.inventory = [];
        for (let i = 0; i < quantity; i++) {
            player.inventory.push({
                name: item.name,
                type: 'consumable',
                effect: { heal: effect.heal },
                rarity: 'rare'
            });
        }
    }

    if (effect.scavenging_rarity) {
        player.scavengingRarityBonus = (player.scavengingRarityBonus || 0) + effect.scavenging_rarity;
    }

    if (effect.cooldown_reduction) {
        player.cooldownReduction = effect.cooldown_reduction;
        player.cooldownReductionExpiry = Date.now() + effect.duration;
    }

    if (effect.skill_boost) {
        // 隨機提升一個技能
        const skills = ['combat', 'scavenging', 'synthesis', 'entropy'];
        const randomSkill = skills[Math.floor(Math.random() * skills.length)];
        if (!player.skills) player.skills = {};
        player.skills[randomSkill] = (player.skills[randomSkill] || 0) + effect.skill_boost;
    }

    if (effect.pet_exp) {
        if (player.pet) {
            player.pet.exp = (player.pet.exp || 0) + effect.pet_exp * quantity;
            player.pet.bond = (player.pet.bond || 0) + effect.bond_increase * quantity;
        }
    }
}