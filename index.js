const { Client, GatewayIntentBits, Collection } = require('discord.js');
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
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.name, command);
}

// 自動保存玩家資料 (每小時一次)
setInterval(() => {
    const data = db.read();
    Object.keys(data.players || {}).forEach(userId => {
        if (data.players[userId]) {
            data.players[userId].last_updated = new Date().toISOString();
        }
    });
    db.write(data);
    console.log(`[${new Date().toLocaleString('zh-TW')}] 自動保存玩家資料`);
}, 60 * 60 * 1000); // 1小時

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('~')) return;

    const args = message.content.slice(1).split(/\s+/);
    const commandName = args[0];
    const command = client.commands.get(commandName);

    if (command) {
            // 檢查冷卻時間
            const cooldownRemaining = getCooldown(message.author.id, commandName);
            if (cooldownRemaining > 0) {
                const embed = new EmbedBuilder()
                    .setTitle('⏰ 冷卻中')
                    .setDescription(`請等待 ${cooldownRemaining} 秒後再使用此指令！`)
                    .setColor(0xFFFF00);
                return message.reply({ embeds: [embed] });
            }

            await command.execute(message, args.slice(1));
            
            // 設定冷卻時間
            setCooldown(message.author.id, commandName);
        } catch (error) {
            console.error(error);
            message.reply('❌ 執行指令時發生錯誤！');
        }
    }
});

client.login(process.env.TOKEN);