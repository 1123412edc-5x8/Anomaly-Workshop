const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const db = require('./utils/db');
const { getCooldown, setCooldown } = require('./utils/cooldown');

client.commands = new Collection();

// 註冊函式：確保在循環之前定義
function registerCommandKey(key, command, fileName) {
    const normalizedKey = String(key).trim().toLowerCase();
    if (!normalizedKey) return;
    
    const existing = client.commands.get(normalizedKey);
    if (existing && existing !== command) {
        console.warn(`⚠️ [警告] 鍵衝突: "${normalizedKey}" 已被 ${existing.name} 佔用，跳過來自 ${fileName} 的註冊。`);
        return;
    }
    client.commands.set(normalizedKey, command);
}

const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        
        // 強制清除 Node.js 的載入快取，確保讀到最新檔案
        delete require.cache[require.resolve(filePath)];
        
        try {
            const command = require(filePath);
            
            if (!command || typeof command.execute !== 'function') {
                console.error(`❌ ${file} 格式錯誤: 缺少 execute 函式`);
                continue;
            }

            // 註冊主名稱
            if (command.name) {
                registerCommandKey(command.name, command, file);
            }

            // 註冊別名
            if (Array.isArray(command.aliases)) {
                command.aliases.forEach(alias => registerCommandKey(alias, command, file));
            }
            
            console.log(`✅ 成功載入指令: ${file}`);
        } catch (error) {
            console.error(`❌ 載入指令 ${file} 時發生嚴重錯誤:`, error.message);
        }
    }
} else {
    console.error('❌ 找不到 commands 資料夾！');
}

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('~')) return;

    const args = message.content.slice(1).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();
    const command = client.commands.get(commandName);

    if (command) {
        try {
            const cooldownKey = command.name || commandName;
            const cooldownRemaining = getCooldown(message.author.id, cooldownKey);
            if (cooldownRemaining > 0) {
                const embed = new EmbedBuilder()
                    .setTitle('⏰ 冷卻中')
                    .setDescription(`請等待 ${cooldownRemaining} 秒後再試。`)
                    .setColor(0xFFFF00);
                return message.reply({ embeds: [embed] }).catch(() => {});
            }

            await command.execute(message, args);
            setCooldown(message.author.id, cooldownKey);
        } catch (error) {
            console.error(`指令 [${commandName}] 執行出錯:`, error);
            message.reply('❌ 執行指令時發生內部錯誤。').catch(() => {});
        }
    }
});

client.on('ready', () => {
    console.log(`✅ ${client.user.tag} 已上線！`);
    console.log(`📊 總計載入 ${client.commands.size} 個指令觸發關鍵字。`);
});

client.login(process.env.TOKEN).catch(err => {
    console.error('❌ 登入失敗:', err.message);
    process.exit(1);
});
