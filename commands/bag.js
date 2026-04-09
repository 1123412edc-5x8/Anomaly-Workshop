const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const db = require('../utils/db');

const ITEM_DB = {
    '🛠️ 工業零件': ['精密螺栓', '液壓活塞', '銅製線圈', '生鏽齒輪', '廢棄鋼板', '機油濾芯', '破損感應器', '鈦合金框架', '冷卻風扇', '廢棄電路板', '萬用螺絲起子', '壓縮氣瓶', '工業用鑽頭', '絕緣膠帶', '微型變壓器', '耐熱陶瓷管', '鑄鐵曲軸', '氣動軟管', '電壓表', '重型扳手', '液壓油箱', '鋁製鉚釘', '鋼絲刷', '焊接面具', '碳刷電機', '軸承套筒', '變頻器殼', '皮帶輪', '氣缸蓋', '機床切屑', '噴漆噴頭', '拋光輪', '砂輪片', '螺紋規', '萬向接頭', '導軌滑塊', '滾珠絲槓', '聯軸器', '密封圈', '散熱片', '配電盤', '保險絲座', '指示燈', '急停按鈕', '傳感器接頭', '排線排插', '電磁閥', '真空泵浦', '過濾棉', '工業潤滑油'],
    '🧬 荒野素材': ['變異幾何體', '發光真菌絲', '硬化甲殼', '不明結晶', '焦黑骨架', '輻射塵埃', '乾涸的粘液', '碎裂的晶核', '乾枯根鬚', '變異種子', '孢子囊腫', '硬質纖維', '風化岩碎片', '沙龍捲餘燼', '石化木塊', '酸蝕葉片', '發熱的石塊', '多孔海綿體', '靈能礦渣', '異常昆蟲翅膀', '鱗片殘渣', '獸爪斷片', '刺鼻的粉末', '螢光液體', '古怪的化石', '地衣結塊', '鹽漬土塊', '半透明膜層', '寄生菌絲', '堅韌的藤蔓', '黑色樹脂', '脆弱的蛋殼', '變異鳥羽', '蛇蛻皮', '發霉的皮革', '苦澀的漿果', '帶刺的灌木', '中空的蘆葦', '結晶化的露水', '異常土壤', '深紅粘土', '火山灰塵', '磁性沙礫', '枯萎的花瓣', '惡臭的膽汁', '靈性塵土', '虛空雜質', '腐爛的樹皮', '乾裂的殼角', '不明毛髮'],
    '🧪 精密組件': ['脈衝電容', '冷凍液管', '樣本試管', '破碎記憶體', '能量核心', '光纖束', '超導陶瓷', '雷射聚焦鏡', '離心機轉子', '顯微鏡鏡片', '真空密封罐', '化學試劑瓶', '培養皿殘渣', '移液管頭', '電泳槽', '掃描探針', '量子芯片', '生物傳感器', '低溫存儲匣', '電漿噴嘴', '納米級探針', '重力校準儀', '同位素標籤', '多光譜膠捲', '防護服布料', '無菌手套', '過濾膜', '生化檢測卡', '微流體晶片', '光刻機快門', '反射鏡', '稜鏡組', '衍射光柵', '衰減器', '信號擴大器', '電極貼片', '神經接點', '電解液盒', '石英坩堝', '貴金屬觸點', '半導體晶圓', '純淨水管', '臭氧發生器', '微型反應爐', '中子源', '電子槍', '磁拘束環', '超低溫探頭', '熱補償電路', '真空度表']
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bag')
        .setDescription('查看背包'),
    execute: async (interaction) => {
        const data = db.read();
        const userId = interaction.user.id;
        const player = data.players[userId];
        if (!player || !player.inventory?.length) {
            return interaction.reply({ content: '🎒 背包空空如也。', ephemeral: true });
        }

        const counts = {};
        player.inventory.forEach(i => { const n = typeof i === 'string' ? i : i.name; counts[n] = (counts[n] || 0) + 1; });

        const categorized = { '🛠️ 工業零件': [], '🧬 荒野素材': [], '🧪 精密組件': [], '📦 其他物資': [] };
        for (const [name, count] of Object.entries(counts)) {
            const text = `- **${name}** x${count}`;
            if (ITEM_DB['🛠️ 工業零件'].includes(name)) categorized['🛠️ 工業零件'].push(text);
            else if (ITEM_DB['🧬 荒野素材'].includes(name)) categorized['🧬 荒野素材'].push(text);
            else if (ITEM_DB['🧪 精密組件'].includes(name)) categorized['🧪 精密組件'].push(text);
            else categorized['📦 其他物資'].push(text);
        }

        const embed = new EmbedBuilder().setTitle('🎒 倖存者背包').setColor(0x3498db);
        for (const [cat, items] of Object.entries(categorized)) {
            if (items.length) embed.addFields({ name: cat, value: items.join('\n'), inline: true });
        }

        interaction.reply({ embeds: [embed] });
    }
};