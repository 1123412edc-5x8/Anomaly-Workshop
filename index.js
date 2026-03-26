const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const db = require('./utils/db');
const { getCooldown, setCooldown } = require('./utils/cooldown');

// 建立指令集
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js')).sort();

const registerCommandKey = (key, command, sourceFile) => {
    const normalizedKey = String(key || '').trim();
    if (!normalizedKey) return;

    const existing = client.commands.get(normalizedKey);
    if (existing && existing !== command) {
        const existingName = String(existing.name || '(unknown)');
        const incomingName = String(command.name || '(unknown)');
        console.warn(`⚠️ 指令鍵衝突: "${normalizedKey}" 已綁定到 ${existingName}，忽略來自 ${incomingName} (${sourceFile}) 的重複註冊。`);
        return;
    }

    client.commands.set(normalizedKey, command);
};

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.name, command);
}

// 自動保存玩家資料 (每小時一次)
setInterval(() => {
    try {
        const data = db.read();
        if (data && data.players) {
            Object.keys(data.players).forEach(userId => {
                if (data.players[userId]) {
                    data.players[userId].last_updated = new Date().toISOString();
                }
            });
            db.write(data);
            console.log(`[${new Date().toLocaleString('zh-TW')}] 自動保存玩家資料`);
        }
    } catch (error) {
        console.error(`[${new Date().toLocaleString('zh-TW')}] 自動保存失敗:`, error);
    }
}, 60 * 60 * 1000); // 1小時

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('~')) return;

    const args = message.content.slice(1).split(/\s+/);
    const commandName = (args[0] || '').toLowerCase();
    const command = client.commands.get(commandName);

    if (command) {
        try {
            // 檢查冷卻時間 (檢查主要名稱和別名)
            const cooldownKey = command.name; // 使用主要名稱作為冷卻鍵
            const cooldownRemaining = getCooldown(message.author.id, cooldownKey);
            if (cooldownRemaining > 0) {
                const embed = new EmbedBuilder()
                    .setTitle('⏰ 冷卻中')
                    .setDescription(`請等待 ${cooldownRemaining} 秒後再使用此指令！`)
                    .setColor(0xFFFF00);
                return message.reply({ embeds: [embed] }).catch(err => console.error('回覆冷卻訊息失敗:', err));
            }

            await command.execute(message, args.slice(1));
            
            // 設定冷卻時間
            setCooldown(message.author.id, cooldownKey);
        } catch (error) {
            console.error(`指令執行錯誤 [${commandName}]:`, error);
            message.reply('❌ 執行指令時發生錯誤！').catch(err => console.error('回覆錯誤訊息失敗:', err));
        }
    }
});

client.on('ready', () => {
    console.log(`[${new Date().toLocaleString('zh-TW')}] ${client.user.tag} 已上線！`);
    console.log(`[${new Date().toLocaleString('zh-TW')}] 已載入 ${client.commands.size} 個指令`);
});

client.on('error', (error) => {
    console.error(`[${new Date().toLocaleString('zh-TW')}] Discord客戶端錯誤:`, error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(`[${new Date().toLocaleString('zh-TW')}] 未處理的Promise拒絕:`, reason);
});

process.on('uncaughtException', (error) => {
    console.error(`[${new Date().toLocaleString('zh-TW')}] 未捕獲的異常:`, error);
    process.exit(1);
});

// 檢查環境變數
if (!process.env.TOKEN) {
    console.error('❌ 未找到 TOKEN 環境變數！請檢查 .env 文件。');
    process.exit(1);
}

client.login(process.env.TOKEN);
