const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ]
});

const db = require('./utils/db');
const { getCooldown, setCooldown } = require('./utils/cooldown');

// 文字指令開關設定 - 以物件方式存儲以便跨模組修改
const textCommandsConfig = { enabled: true };

// 創建虛擬 interaction 物件，用於將文字指令轉換為斜線指令
function createMockInteraction(message, commandName) {
    return {
        user: message.author,
        guild: message.guild,
        channel: message.channel,
        member: message.member,
        commandName: commandName,
        // 模擬 interaction.reply 為 message.reply
        reply: async (options) => {
            return message.reply(options);
        },
        // 模擬 interaction.update 為 message.reply
        update: async (options) => {
            return message.reply(options);
        },
        // 模擬 interaction.followUp 為 message.reply
        followUp: async (options) => {
            return message.reply(options);
        },
        // 模擬 interaction.deferReply
        deferReply: async () => {
            // 文字指令沒有延遲，直接返回
            return { defer: true };
        },
        // 模擬 interaction.isStringSelectMenu
        isStringSelectMenu: () => false,
        // 模擬 interaction.isChatInputCommand
        isChatInputCommand: () => true,
        replied: false,
        deferred: false,
        // 模擬 interaction.options 為空，因為文字指令沒有選項
        options: {
            getString: () => null,
            getUser: () => null,
            getNumber: () => null,
            getBoolean: () => null,
            getSubcommand: () => null
        }
    };
}

client.commands = new Collection();

// 註冊函式：支援文字指令 Key 與 斜線指令 Name
function registerCommandKey(key, command) {
    const normalizedKey = String(key).trim().toLowerCase();
    if (!normalizedKey) return;
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
            
            // 註冊斜線指令 (如果有 data 屬性)
            if (command.data && command.data.name) {
                registerCommandKey(command.data.name, command);
            }
            
            // 註冊文字指令名稱 (如果有 name 屬性，支持舊格式)
            if (command.name) {
                registerCommandKey(command.name, command);
            }
            
            // 註冊別名 (如果有 aliases 屬性)
            if (command.aliases && Array.isArray(command.aliases)) {
                command.aliases.forEach(alias => registerCommandKey(alias, command));
            }
            
            console.log(`✅ 成功載入指令: ${file}`);
        } catch (e) { 
            console.error(`❌ 載入指令 ${file} 出錯:`, e.message); 
        }
    }
}

// --- 2. 自動載入 Events ---
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

// --- 3. 處理文字指令 (Prefix: ~) ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('~')) return;
    
    // 檢查文字指令是否啟用
    if (!textCommandsConfig.enabled) {
        return message.reply('❌ 文字指令目前已被停用。請使用斜線指令。').catch(() => {});
    }
    
    const args = message.content.slice(1).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();
    const command = client.commands.get(commandName);

    if (command && typeof command.execute === 'function') {
        try {
            const cooldownKey = command.data?.name || command.name || commandName;
            const cooldownRemaining = getCooldown(message.author.id, cooldownKey);

            if (cooldownRemaining > 0) {
                const unlockAt = Math.floor(Date.now() / 1000) + cooldownRemaining;
                const embed = new EmbedBuilder()
                    .setTitle('⏰ 指令冷卻中')
                    .setDescription(`請在 **<t:${unlockAt}:t>** (<t:${unlockAt}:R>) 後再試。`)
                    .setColor(0xFFFF00);
                return message.reply({ embeds: [embed] });
            }

            // 如果是斜線指令格式（有 data），創建虛擬 interaction 觀對象
            if (command.data && !command.name) {
                // 創建虛擬 interaction 物件以相容於斜線指令
                const mockInteraction = createMockInteraction(message, command.data.name);
                await command.execute(mockInteraction);
            } else if (command.name) {
                // 舊式文字指令
                await command.execute(message, args);
            }
            
            setCooldown(message.author.id, cooldownKey);
        } catch (error) {
            console.error(error);
            message.reply('❌ 執行文字指令時發生錯誤。');
        }
    }
});

client.on('ready', () => {
    console.log(`✅ ${client.user.tag} 已上線！`);
});

client.login(process.env.TOKEN);

// 導出文字指令開關設定，讓 admin 指令可以修改
module.exports.textCommandsConfig = textCommandsConfig;