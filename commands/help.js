const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const itemWiki = require('../utils/items');

module.exports = {
    name: 'help',
    aliases: ['h', '幫助', 'wiki'],
    execute: async (message, args = []) => {
        const page = args[0] || 'main';

        if (page === 'main') {
            // 主頁面 - 指令總覽
            const embed = new EmbedBuilder()
                .setTitle('🛠️ 異常工坊：指令指南')
                .setColor(0x00FFCC)
                .setDescription('歡迎來到異常工坊！使用 `~help [頁面]` 查看詳細說明')
                .addFields(
                    { name: '🎮 基本指令', value: '`~bag` - 查看背包\n`~map [地區]` - 移動地區\n`~s` - 拾荒零件\n`~r [編號]` - 維修物品\n`~c [編號1] [編號2]` - 合成物品\n`~d [編號]` - 分解物品', inline: true },
                    { name: '⚔️ 進階系統', value: '`~battle` - 戰鬥系統\n`~quest` - 任務列表\n`~shop` - 黑市商店\n`~trade` - 玩家交易\n`~progress` - 進度追蹤', inline: true },
                    { name: '📊 社群功能', value: '`~rank` - 排行榜\n`~achievement` - 成就系統\n`~daily` - 每日任務\n`~codex` - 物品圖鑑\n`~event` - 當前事件', inline: true }
                )
                .setFooter({ text: '使用 ~help [指令名] 查看詳細用法 | 例如: ~help bag' });

            const select = new StringSelectMenuBuilder()
                .setCustomId('help_select')
                .setPlaceholder('選擇要查看的指令類別...')
                .addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('基本指令')
                        .setDescription('背包、地圖、拾荒、維修、合成等')
                        .setValue('basic')
                        .setEmoji('🎮'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('進階系統')
                        .setDescription('戰鬥、任務、商店、交易等')
                        .setValue('advanced')
                        .setEmoji('⚔️'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('社群功能')
                        .setDescription('排行榜、成就、幫助系統等')
                        .setValue('social')
                        .setEmoji('📊'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('其他指令')
                        .setDescription('每日任務、圖鑑、事件等')
                        .setValue('other')
                        .setEmoji('🔧')
                );

            const row = new ActionRowBuilder().addComponents(select);

            const response = await message.reply({ embeds: [embed], components: [row] });

            const collector = response.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                time: 60000
            });

            collector.on('collect', async (i) => {
                if (i.user.id !== message.author.id) return i.reply({ content: '這不是你的幫助菜單', ephemeral: true });

                const selectedValue = i.values[0];
                let helpEmbed;
                if (selectedValue === 'basic') {
                    helpEmbed = createBasicHelpEmbed();
                } else if (selectedValue === 'advanced') {
                    helpEmbed = createAdvancedHelpEmbed();
                } else if (selectedValue === 'social') {
                    helpEmbed = createSocialHelpEmbed();
                } else if (selectedValue === 'other') {
                    helpEmbed = createOtherHelpEmbed();
                }

                await i.update({ embeds: [helpEmbed], components: [row] });
            });

        } else {
            // 詳細頁面
            const detailEmbed = getDetailHelp(page);
            message.reply({ embeds: [detailEmbed] });
        }
    }
};

function createBasicHelpEmbed() {
    return new EmbedBuilder()
        .setTitle('🎮 基本指令詳解')
        .setColor(0x3498db)
        .addFields(
            {
                name: '🎒 ~bag (~b)',
                value: '**查看背包**\n顯示所有物品的耐久度和熵值狀態\n**用法：** `~bag`\n**別名：** `~b`, `~背包`'
            },
            {
                name: '📍 ~map [地區]',
                value: '**移動地區**\n前往不同區域尋找不同物品\n**可用地區：** 工廠、荒野、實驗室\n**用法：** `~map 荒野`\n**別名：** `~m`, `~地圖`'
            },
            {
                name: '🔍 ~scavenge (~s)',
                value: '**拾荒零件**\n在當前地區尋找隨機零件\n**用法：** `~s`\n**別名：** `~s`, `~拾荒`'
            },
            {
                name: '🔧 ~repair [編號] (~r)',
                value: '**維修物品**\n提升物品耐久度，每次 +5%\n**用法：** `~r 0` (維修第0個物品)\n**別名：** `~r`, `~維修`'
            },
            {
                name: '🌀 ~combine [編號1] [編號2] (~c)',
                value: '**合成物品**\n融合兩個零件，熵值越高失敗率越大\n**用法：** `~c 0 1` (合成第0和第1個物品)\n**別名：** `~c`, `~合成`'
            },
            {
                name: '🔨 ~decompose [編號] (~d)',
                value: '**分解物品**\n將物品分解成三個隨機零件\n**用法：** `~d 0` (分解第0個物品)\n**別名：** `~d`, `~分解`'
            }
        );
}

function createAdvancedHelpEmbed() {
    return new EmbedBuilder()
        .setTitle('⚔️ 進階系統詳解')
        .setColor(0xe74c3c)
        .addFields(
            {
                name: '⚔️ ~battle',
                value: '**戰鬥系統**\n遭遇隨機敵人，攻擊、防禦或逃跑\n**用法：** `~battle`\n**獲得：** 經驗值和熵結晶'
            },
            {
                name: '📋 ~quest (~q)',
                value: '**任務系統**\n查看可完成的任務和進度\n**用法：** `~quest`\n**別名：** `~q`, `~任務`'
            },
            {
                name: '🏪 ~shop',
                value: '**黑市商店**\n購買增強道具和稀有物品\n**用法：** `~shop`\n**貨幣：** 熵結晶'
            },
            {
                name: '💱 ~trade [子命令]',
                value: '**玩家交易**\n與其他玩家交換物品\n**子命令：**\n`~trade list` - 列出物品\n`~trade request @玩家 編號1 @玩家 編號2` - 發起交易\n`~trade pending` - 查看請求\n`~trade accept ID` - 接受交易\n`~trade reject ID` - 拒絕交易\n`~trade history` - 交易歷史'
            },
            {
                name: '📈 ~progress',
                value: '**進度追蹤**\n查看等級、經驗和統計數據\n**用法：** `~progress`\n**別名：** `~進度`'
            }
        );
}

function createSocialHelpEmbed() {
    return new EmbedBuilder()
        .setTitle('📊 社群功能詳解')
        .setColor(0x2ecc71)
        .addFields(
            {
                name: '🏆 ~rank',
                value: '**排行榜**\n查看各項全球排行\n**用法：** `~rank`\n**排行：** 等級、經驗、藏品、熵值控制'
            },
            {
                name: '🏅 ~achievement (~ach)',
                value: '**成就系統**\n查看已解鎖的成就\n**用法：** `~achievement`\n**別名：** `~ach`, `~成就`'
            },
            {
                name: '🛠️ ~help [頁面]',
                value: '**幫助系統**\n查看指令詳細說明\n**用法：**\n`~help` - 主頁面\n`~help bag` - bag指令詳解\n`~help battle` - battle指令詳解\n**別名：** `~h`, `~幫助`'
            }
        );
}

function createOtherHelpEmbed() {
    return new EmbedBuilder()
        .setTitle('🔧 其他指令詳解')
        .setColor(0xe67e22)
        .addFields(
            {
                name: '📅 ~daily',
                value: '**每日任務**\n查看和完成每日挑戰\n**用法：** `~daily`\n**獎勵：** 經驗值和熵結晶'
            },
            {
                name: '📖 ~codex',
                value: '**物品圖鑑**\n查看所有可收集物品\n**用法：** `~codex`\n**顯示：** 稀有度、地區、收集狀態'
            },
            {
                name: '🎉 ~event',
                value: '**當前事件**\n查看活躍的遊戲事件\n**用法：** `~event`\n**效果：** 增幅拾荒和戰鬥'
            },
            {
                name: '🎁 ~redeem [代碼]',
                value: '**兌換代碼**\n使用兌換碼獲取獎勵\n**用法：** `~redeem ABC123`\n**來源：** 官方活動或獎勵'
            },
            {
                name: '⚙️ ~admin [子命令]',
                value: '**管理員指令**\n管理員專用功能\n**用法：** `~admin`\n**權限：** 僅限管理員'
            }
        );
}

function getDetailHelp(command) {
    const details = {
        'bag': {
            title: '🎒 Bag 指令詳解',
            description: '**查看背包內容**\n\n**基本用法：**\n`~bag` 或 `~b`\n\n**顯示內容：**\n• 物品名稱和編號\n• 耐久度條 (█░░░░░░░░░)\n• 熵值狀態 (穩定/變異)\n• 總物品數量\n\n**物品狀態說明：**\n🟢 **穩定** - 熵值 ≤ 50\n⚠️ **嚴重變異** - 熵值 > 50\n\n**提示：**\n• 編號從 0 開始\n• 用於維修和合成時需要編號'
        },
        'map': {
            title: '📍 Map 指令詳解',
            description: '**地區移動系統**\n\n**基本用法：**\n`~map [地區名稱]`\n\n**可用地區：**\n• **工廠** - 機械零件，耐久度高\n• **荒野** - 生物材料，熵值變化大\n• **實驗室** - 科技物品，品質不穩定\n• **圖書館** - 古老知識，神秘物品\n\n**範例：**\n`~map 荒野` - 移動到荒野\n`~map` - 查看當前位置\n\n**地區特色：**\n每個地區有 50 種獨特物品，影響拾荒結果。'
        },
        'scavenge': {
            title: '🔍 Scavenge 指令詳解',
            description: '**拾荒系統**\n\n**基本用法：**\n`~s` 或 `~scavenge`\n\n**獲得物品：**\n• 隨機零件 (根據當前地區)\n• 耐久度：20-60%\n• 熵值：0-10\n\n**地區差異：**\n• **工廠**：機械零件，穩定品質\n• **荒野**：生物材料，高熵值風險\n• **實驗室**：科技物品，品質波動大\n\n**冷卻時間：** 無 (可連續使用)'
        },
        'repair': {
            title: '🔧 Repair 指令詳解',
            description: '**維修系統**\n\n**基本用法：**\n`~r [物品編號]` 或 `~repair [物品編號]`\n\n**維修效果：**\n• 耐久度 +5% (最高 100%)\n• 25% 機率熵值 +1\n\n**操作方式：**\n1. 使用 `~bag` 查看物品編號\n2. 輸入 `~r 0` 維修第0個物品\n3. 點擊按鈕進行鍛打\n4. 選擇"保存離開"完成維修\n\n**風險：**\n過度維修可能增加熵值，影響物品穩定性。'
        },
        'combine': {
            title: '🌀 Combine 指令詳解',
            description: '**合成系統**\n\n**基本用法：**\n`~c [編號1] [編號2]` 或 `~combine [編號1] [編號2]`\n\n**合成規則：**\n• 融合兩個零件\n• 平均耐久度 +10%\n• 熵值 = (熵值1 + 熵值2) × 0.8\n\n**失敗判定：**\n熵值總和 > 150 時有爆炸風險\n\n**成功結果：**\n• **低熵值**：純淨·複合零件\n• **高熵值**：穩定態·異質零件\n\n**注意：** 失敗會摧毀兩個原始零件！'
        },
        'decompose': {
            title: '🔨 Decompose 指令詳解',
            description: '**分解系統**\n\n**基本用法：**\n`~d [物品編號]` 或 `~decompose [物品編號]`\n\n**分解效果：**\n• 將一個物品分解成三個隨機零件\n• 獲得 10 點積分\n• 隨機零件來自所有地區的物品\n\n**操作方式：**\n1. 使用 `~bag` 查看物品編號\n2. 輸入 `~d 0` 分解第0個物品\n3. 獲得三個新零件\n\n**用途：**\n• 獲取更多零件進行合成\n• 清理不需要的物品\n• 獲得額外積分\n\n**注意：** 分解會永久移除原始物品！'
        },
        'battle': {
            title: '⚔️ Battle 指令詳解',
            description: '**戰鬥系統**\n\n**基本用法：**\n`~battle` 或 `~fight`\n\n**戰鬥流程：**\n1. 隨機遭遇敵人\n2. 選擇：攻擊、防禦、逃跑\n3. 根據物品屬性計算傷害\n\n**傷害計算：**\n• **攻擊**：耐久度 × 0.1 + 隨機數\n• **防禦**：傷害減半\n• **逃跑**：100% 成功率\n\n**獎勵：**\n• 勝利：經驗值 + 熵結晶\n• 失敗：損失 HP (可通過物品恢復)\n\n**敵人種類：**\n生鏽泰坦、變異蜘蛛、熵怪獸等'
        },
        'quest': {
            title: '📋 Quest 指令詳解',
            description: '**任務系統**\n\n**基本用法：**\n`~quest` 或 `~q`\n\n**任務類型：**\n• **初心者考驗**：拾荒 5 次\n• **維修大師**：維修 10 次\n• **完美合成**：合成 3 次不失敗\n• **全地圖探險**：訪問所有地區\n• **怪物獵人**：贏得 5 場戰鬥\n\n**進度顯示：**\n████████░░ (8/10)\n\n**獎勵：**\n完成任務獲得經驗值，解鎖新內容。'
        },
        'shop': {
            title: '🏪 Shop 指令詳解',
            description: '**黑市商店**\n\n**基本用法：**\n`~shop`\n\n**貨幣系統：**\n• **熵結晶**：戰鬥和拾荒獲得\n• **用途**：購買道具和升級\n\n**商品列表：**\n• 高級維修工具 (50 結晶)\n• 熵值穩定劑 (100 結晶)\n• 背包擴展模組 (150 結晶)\n• 稀有合成配方 (200 結晶)\n• 傳說級零件碎片 (300 結晶)\n\n**購買方式：**\n目前商店瀏覽功能，購買系統開發中。'
        },
        'trade': {
            title: '💱 Trade 指令詳解',
            description: '**玩家交易系統**\n\n**基本用法：**\n`~trade [子命令]`\n\n**子命令列表：**\n\n**`~trade`** - 顯示交易菜單\n**`~trade list`** - 列出你的物品\n**`~trade request @玩家 編號1 @玩家 編號2`** - 發起交易\n**`~trade pending`** - 查看待處理請求\n**`~trade accept ID`** - 接受交易\n**`~trade reject ID`** - 拒絕交易\n**`~trade history`** - 查看交易歷史\n\n**交易流程：**\n1. 雙方確認物品編號\n2. 發起交易請求\n3. 對方收到通知\n4. 接受或拒絕\n5. 自動交換物品'
        },
        'rank': {
            title: '🏆 Rank 指令詳解',
            description: '**排行榜系統**\n\n**基本用法：**\n`~rank`\n\n**排行類別：**\n• **⭐ 最高等級** - 玩家等級排名\n• **📈 經驗排名** - 總經驗值\n• **🎒 藏品最多** - 物品數量\n• **🌀 熵值高手** - 平均熵值控制\n\n**更新頻率：**\n每小時自動更新\n\n**排名顯示：**\n1. 玩家#1234 - Lv. 15\n2. 玩家#5678 - 1250 EXP\n3. 玩家#9012 - 45 件'
        },
        'progress': {
            title: '📈 Progress 指令詳解',
            description: '**進度追蹤**\n\n**基本用法：**\n`~progress`\n\n**顯示內容：**\n• **等級進度條**\n• **背包統計**\n• **熵值分析**\n• **地區探索**\n• **資源統計**\n\n**統計項目：**\n- 物品總數 / 背包容量\n- 平均耐久度\n- 平均熵值\n- 最高熵值\n- 維修次數\n- 合成次數\n- 熵結晶數量'
        },
        'achievement': {
            title: '🏅 Achievement 指令詳解',
            description: '**成就系統**\n\n**基本用法：**\n`~achievement` 或 `~ach`\n\n**成就列表：**\n• 🌱 **初出茅廬** - 完成第一次拾荒\n• 📦 **品味收藏** - 收集 10 個物品\n• 🔧 **完美維護** - 物品耐久至 100%\n• ✨ **合成大師** - 成功合成 5 次\n• 🗺️ **全域遊歷** - 訪問所有地區\n• ⚔️ **戰鬥勇者** - 贏得 10 場戰鬥\n• 🌀 **熵值控制者** - 熵值控制在 5 以下\n• 💎 **富豪** - 擁有 500 熵結晶\n• 👑 **傳說獵手** - 獲得傳說物品\n• 🏆 **無所不能** - 完成所有成就\n\n**解鎖條件：**\n自動檢測遊戲行為，達成後解鎖。'
        },
        'daily': {
            title: '📅 Daily 指令詳解',
            description: '**每日任務系統**\n\n**基本用法：**\n`~daily`\n\n**任務類型：**\n• **拾荒探險家** - 拾荒 3 次\n• **合成工程師** - 升級 2 次\n• **異常獵人** - 戰鬥勝利 1 次\n• **全域漫遊者** - 訪問所有地區\n• **稀有發現者** - 獲得稀有物品\n\n**每日重置：**\n每天 00:00 重置任務\n\n**獎勵：**\n完成任務獲得經驗值和熵結晶\n\n**進度顯示：**\n████████░░ (8/10)'
        },
        'codex': {
            title: '📖 Codex 指令詳解',
            description: '**物品圖鑑系統**\n\n**基本用法：**\n`~codex`\n\n**顯示內容：**\n• **地區分類** - 工廠、荒野、實驗室\n• **稀有度標記** - 普通、稀有、史詩、傳說\n• **收集狀態** - 已收集 / 未收集\n• **總收集率**\n\n**收集統計：**\n- 總物品種類：150 種\n- 你的收集數量\n- 地區完成度\n\n**稀有度顏色：**\n⚪ **普通** (50%)\n💜 **稀有** (30%)\n🔴 **史詩** (15%)\n👑 **傳說** (5%)'
        },
        'event': {
            title: '🎉 Event 指令詳解',
            description: '**事件系統**\n\n**基本用法：**\n`~event`\n\n**事件類型：**\n• **拾荒增幅** - 增加拾荒獲得率\n• **戰鬥加成** - 提升戰鬥經驗\n• **合成優惠** - 降低合成失敗率\n• **全域事件** - 影響所有玩家\n\n**事件效果：**\n- **稀有度倍率**：提升物品稀有度\n- **掉落倍率**：增加拾荒數量\n- **經驗倍率**：提升獲得經驗\n\n**持續時間：**\n通常持續 24-72 小時\n\n**查看方式：**\n`~event` 顯示當前活躍事件'
        },
        'redeem': {
            title: '🎁 Redeem 指令詳解',
            description: '**兌換碼系統**\n\n**基本用法：**\n`~redeem [代碼]`\n\n**代碼格式：**\n字母和數字組合，如 `ANOMALY2024`\n\n**獎勵類型：**\n• **熵結晶** - 遊戲貨幣\n• **稀有物品** - 特殊零件\n• **經驗值** - 等級提升\n• **成就解鎖** - 特殊成就\n\n**使用限制：**\n• 每個代碼只能使用一次\n• 代碼有到期時間\n• 需正確輸入大小寫\n\n**獲取方式：**\n官方活動、社群活動、特別獎勵'
        }
    };

    const detail = details[command];
    if (!detail) {
        return new EmbedBuilder()
            .setTitle('❌ 找不到指令')
            .setColor(0xFF0000)
            .setDescription(`找不到 "${command}" 的詳細說明。\n\n使用 \`~help\` 查看所有可用指令。`);
    }

    return new EmbedBuilder()
        .setTitle(detail.title)
        .setColor(0x00FFCC)
        .setDescription(detail.description);
}