import dotenv from 'dotenv';
dotenv.config();

import { Client, GatewayIntentBits } from 'discord.js';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

export const login = () => {
    client.login(process.env.DISCORD_BOT_TOKEN);
    client.once('ready', () => {
        console.log(`Logged in as ${client.user.tag}!`);
    });
}

export const sendMessage = (channelId, message) => {
    const channel = client.channels.cache.get(channelId);
    if (channel) {
        channel.send(message);
    } else {
        console.error(`Channel with ID ${channelId} not found.`);
    }
}