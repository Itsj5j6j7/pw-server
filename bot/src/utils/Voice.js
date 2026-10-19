const { ChannelType, PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const { notice } = require('./Notice');

const KEY = 'voice-channels'; // { channelId: ownerId } of the temporary voice channels.
const timers = new Map();

const tracked = (client) => client.database.get(KEY) || {};

const track = (client, channelId, ownerId) => client.database.set(KEY, { ...tracked(client), [channelId]: ownerId });

const forget = (client, channelId) => {
    clearTimeout(timers.get(channelId));
    timers.delete(channelId);
    const { [channelId]: _, ...rest } = tracked(client);
    client.database.set(KEY, rest);
};

// "Voice N" with the lowest N not used by an existing temporary channel.
const nextName = (client) => {
    const used = new Set(Object.keys(tracked(client)).map((id) => client.channels.cache.get(id)?.name.match(/Voice (\d+)$/)?.[1]));
    let n = 1;
    while (used.has(String(n))) n++;
    return `🎤┃Voice ${n}`;
};

// Starts the delete countdown if the channel is empty, cancels it if someone is in.
const check = (client, channel) => {
    clearTimeout(timers.get(channel.id));
    timers.delete(channel.id);
    if (channel.members.size) return;

    timers.set(channel.id, setTimeout(() => {
        forget(client, channel.id);
        channel.delete('Temporary voice channel empty').catch(() => { });
    }, config.voice.deleteAfterMinutes * 60000));
};

// Creates the member's temporary voice channel and replies to the interaction (/vc and the vc_create button).
const open = async (client, interaction, limit = 0) => {
    const owned = Object.entries(tracked(client)).find(([, ownerId]) => ownerId === interaction.user.id);
    if (owned) {
        if (interaction.guild.channels.cache.has(owned[0])) {
            return interaction.reply(notice(config.emojis.no, `You already have a voice channel: <#${owned[0]}>.`));
        }
        forget(client, owned[0]);
    }

    const channel = await interaction.guild.channels.create({
        name: nextName(client),
        type: ChannelType.GuildVoice,
        parent: config.voice.category,
        permissionOverwrites: [{
            id: interaction.guild.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]
        }],
        userLimit: limit,
        reason: `Temporary voice channel by ${interaction.user.tag}`
    });

    track(client, channel.id, interaction.user.id);
    check(client, channel);
    await interaction.member.voice.setChannel(channel).catch(() => { });

    await interaction.reply(notice(config.emojis.yes, `Your voice channel is ready: <#${channel.id}>. It will be deleted after ${config.voice.deleteAfterMinutes} minutes empty.`));
};

// On startup: drops the channels deleted meanwhile and restarts the countdown of the empty ones.
const sweep = (client) => {
    for (const id of Object.keys(tracked(client))) {
        const channel = client.channels.cache.get(id);
        if (channel) check(client, channel);
        else forget(client, id);
    }
};

module.exports = { tracked, track, forget, nextName, check, open, sweep };
