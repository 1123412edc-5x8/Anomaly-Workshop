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

// 註冊函式
function registerCommandKey(key, command, fileName) {
    const normalizedKey = String(key).trim().toLowerCase();
    if (!normalizedKey) return;
    const existing = client.commands.get(normalizedKey);
    if (existing && existing !== command) {
        console.warn(`⚠️ [警告] 鍵衝突: "${normalizedKey}" 已被 ${existing.name} 佔用。`);
        return;
    }
    client.commands.set(normalizedKey, command);
}

// --- 1. 自動載入 Commands ---
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        delete require.cache[require.resolve(filePath)];
        try {
            const command = require(filePath);
            if (command.name) registerCommandKey(command.name, command, file);
            if (Array.isArray(command.aliases)) {
                command.aliases.forEach(alias => registerCommandKey(alias, command, file));
            }
            console.log(`✅ 成功載入指令: ${file}`);
        } catch (e) { console.error(`❌ 載入指令 ${file} 出錯:`, e.message); }
    }
}

// --- 2. 自動載入 Events (包含按鈕監聽) ---
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
        const event = require(path.join(eventsPath, file));
        if (event.once) client.once(event.name, (...args) => event.execute(...args));
        else client.on(event.name, (...args) => event.execute(...args));
        console.log(`✅ 成功載入事件: ${file}`);
    }
}

// --- 3. 處理文字指令與動態冷卻 ---
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
                // 計算 Discord Timestamp 秒數
                const unlockAt = Math.floor(Date.now() / 1000) + cooldownRemaining;
                const embed = new EmbedBuilder()
                    .setTitle('⏰ 指令冷優中')
                    .setDescription(`請在 **<t:${unlockAt}:t>** (<t:${unlockAt}:R>) 後再試。`)
                    .setColor(0xFFFF00);
                return message.reply({ embeds: [embed] });
            }

            await command.execute(message, args);
            setCooldown(message.author.id, cooldownKey);
        } catch (error) {
            console.error(error);
            message.reply('❌ 執行指令時發生錯誤。');
        }
    }
});

client.on('ready', () => console.log(`✅ ${client.user.tag} 已上線！`));
client.login(process.env.TOKEN);