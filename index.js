const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// 建立指令集
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.name, command);
}

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('~')) return;

    const commandName = message.content.slice(1); // 去掉驚嘆號
    const command = client.commands.get(commandName);

    if (command) {
        try {
            await command.execute(message);
        } catch (error) {
            console.error(error);
            message.reply('❌ 執行指令時發生錯誤！');
        }
    }
});

client.login(process.env.TOKEN);